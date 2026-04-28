import crypto from "crypto";
import { razorpay } from "../config/razorpay.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import redisClient from "../config/redis.js";
import * as contestRepo from "../repositories/contest.repository.js";
import * as registrationRepo from "../repositories/registration.repository.js";
import * as paymentRepo from "../repositories/payment.repository.js";
import * as messageService from "../services/message.service.js";

function buildReceipt(contestId) {
  const receipt = `qb-${String(contestId).slice(-8)}-${Date.now().toString().slice(-10)}`;

  if (receipt.length > 40) {
    throw new BadRequestError("Receipt exceeds Razorpay limit");
  }

  return receipt;
}

function isTimingSafeMatch(actualSignature, expectedSignature) {
  const sigBuffer = Buffer.from(String(actualSignature ?? ""));
  const expBuffer = Buffer.from(String(expectedSignature ?? ""));

  if (sigBuffer.length !== expBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}

function quoteCsv(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export async function createOrder(userId, contestId) {
  const contest = await contestRepo.findById(contestId);
  if (!contest) {
    throw new NotFoundError("Contest not found");
  }

  if (Number(contest.registerFee) === 0) {
    throw new BadRequestError("This contest is free - use free registration endpoint instead");
  }

  const registration = await registrationRepo.findByUserAndContest(userId, contestId);
  if (!registration) {
    throw new ForbiddenError("You must register for this contest before paying");
  }

  if (registration.status === "CONFIRMED") {
    throw new ConflictError("Payment already completed");
  }

  const existing = await paymentRepo.findPendingOrder(userId, contestId);
  if (existing) {
    return {
      orderId: existing.razorpayOrderId,
      amount: existing.amount,
      currency: existing.currency || "INR",
      isExisting: true
    };
  }

  const amount = Number(contest.registerFee);
  const receipt = buildReceipt(contestId);

  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt
  });

  await paymentRepo.create({
    userId,
    contestId,
    razorpayOrderId: order.id,
    amount,
    currency: "INR",
    receipt,
    status: "PENDING"
  });

  return {
    orderId: order.id,
    amount,
    currency: "INR",
    isExisting: false
  };
}

export async function listPayments(params = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {};

  if (params.status && params.status !== "all") {
    filter.status = String(params.status).toUpperCase();
  }

  if (params.contestId && params.contestId !== "all") {
    filter.contestId = params.contestId;
  }

  const sortField = ["createdAt", "updatedAt", "amount", "status"].includes(params.sortBy)
    ? params.sortBy
    : "createdAt";
  const sortOrder = String(params.sortOrder).toLowerCase() === "asc" ? 1 : -1;
  const sort = { [sortField]: sortOrder };

  const [items, total] = await Promise.all([
    paymentRepo.findPaginated(filter, skip, limit, sort),
    paymentRepo.count(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

export async function getPaymentById(id) {
  const payment = await paymentRepo.findById(id);

  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  return payment;
}

export async function verifyAndCapture(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (!isTimingSafeMatch(razorpaySignature, expected)) {
    throw new UnauthorizedError("Invalid payment signature");
  }

  const payment = await paymentRepo.findByOrderId(razorpayOrderId);
  if (!payment) {
    throw new NotFoundError("Payment not found");
  }

  if (payment.status === "CAPTURED") {
    return { alreadyCaptured: true, paymentId: payment._id };
  }

  if (String(payment.userId?._id || payment.userId) !== String(userId)) {
    throw new ForbiddenError("Payment does not belong to you");
  }

  const updated = await paymentRepo.updateStatus(payment._id, "CAPTURED", {
    razorpayPaymentId,
    razorpaySignature
  });

  await registrationRepo.confirmPayment(userId, payment.contestId);

  messageService.sendPaymentReceipt(userId, payment._id)
    .catch((error) => logger.error("Failed to queue payment receipt", error));

  return {
    status: "CAPTURED",
    paymentId: updated?._id || payment._id
  };
}

export async function processWebhook(rawBody, signature) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (!isTimingSafeMatch(signature, expected)) {
    throw new UnauthorizedError("Invalid webhook signature");
  }

  const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody ?? "");
  const event = JSON.parse(bodyText);
  const entity = event?.payload?.payment?.entity;

  if (!entity) {
    return { unhandled: event?.event || "unknown" };
  }

  const idempotencyKey = `webhook:${entity.order_id}:${event.event}`;
  const isNew = await redisClient.set(idempotencyKey, "1", { EX: 86400, NX: true });
  if (!isNew) {
    return { skipped: true };
  }

  const payment = await paymentRepo.findByOrderId(entity.order_id);
  if (!payment) {
    return { processed: true, event: event.event };
  }

  switch (event.event) {
    case "payment.captured": {
      if (payment.status !== "CAPTURED") {
        await paymentRepo.updateStatus(payment._id, "CAPTURED", {
          razorpayPaymentId: entity.id,
          razorpaySignature: signature,
          webhookProcessedAt: new Date()
        });

        await registrationRepo.confirmPayment(payment.userId, payment.contestId);

        messageService.sendPaymentReceipt(payment.userId, payment._id)
          .catch((error) => logger.error("Failed to queue payment receipt", error));
      } else {
        await paymentRepo.updateStatus(payment._id, "CAPTURED", {
          webhookProcessedAt: new Date()
        });
      }
      break;
    }

    case "payment.failed": {
      await paymentRepo.updateStatus(payment._id, "FAILED", {
        failReason: entity.error_description || "Payment failed",
        webhookProcessedAt: new Date()
      });

      await registrationRepo.updateStatus(payment.userId, payment.contestId, "PAYMENT_PENDING");

      messageService.sendPaymentFailed(payment.userId, payment.contestId, entity.error_description || "Payment failed")
        .catch((error) => logger.error("Failed to queue payment failure notice", error));
      break;
    }

    default:
      return { unhandled: event.event };
  }

  return { processed: true, event: event.event };
}

export async function exportPaymentsCsv(contestId) {
  const payments = await paymentRepo.findForExport(contestId);
  const headers = ["Registration ID", "Name", "Email", "Phone", "Amount (₹)", "Status", "Payment ID", "Date"];

  const rows = payments.map((payment) => [
    quoteCsv(payment.userId?.registrationId || ""),
    quoteCsv(`${payment.userId?.firstName || ""} ${payment.userId?.lastName || ""}`.trim()),
    quoteCsv(payment.userId?.email || ""),
    quoteCsv(payment.userId?.phone || ""),
    quoteCsv((Number(payment.amount) / 100).toFixed(2)),
    quoteCsv(payment.status || ""),
    quoteCsv(payment.razorpayPaymentId || payment.razorpayOrderId || ""),
    quoteCsv(formatDateTime(payment.createdAt))
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
}

export async function getPaymentStats(contestId) {
  const stats = await paymentRepo.getStats(contestId);

  return {
    ...stats,
    totalRevenueRupees: Number(stats.totalCollected || 0) / 100
  };
}