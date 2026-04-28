import redisClient from "../config/redis.js";
import { formatCurrency, formatIST } from "../utils/format.js";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils/errors.js";
import { messageQueue } from "../queues/message.queue.js";
import * as messageRepo from "../repositories/message.repository.js";
import * as userRepo from "../repositories/user.repository.js";
import * as contestRepo from "../repositories/contest.repository.js";
import * as registrationRepo from "../repositories/registration.repository.js";
import * as paymentRepo from "../repositories/payment.repository.js";

const OTP_TTL_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS || 600) || 600;

function getOtpKey(phone) {
  return `otp:${String(phone ?? "").trim()}`;
}

function buildUserName(user) {
  return `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Participant";
}

function getRecipientPhone(user) {
  return String(user?.phone ?? "").trim();
}

function getRecipientEmail(user) {
  return String(user?.email ?? "").trim().toLowerCase();
}

async function createSkippedMessage({ userId, contestId, type, template, recipient, variables, reason }) {
  await messageRepo.create({
    userId,
    contestId: contestId || null,
    type,
    template,
    status: "SKIPPED",
    recipient: recipient || "",
    variables,
    failReason: reason || "Recipient unavailable"
  });
}

async function enqueueJob(type, template, userId, recipient, variables, contestId, extra) {
  const message = await messageRepo.create({
    userId,
    contestId: contestId || null,
    type,
    template,
    status: "QUEUED",
    recipient,
    variables
  });

  await messageQueue.add(
    "send-message",
    {
      messageId: message._id.toString(),
      type,
      template,
      recipient,
      variables
    },
    extra || {}
  );
}

async function enqueueReminderJobs(jobs) {
  if (jobs.length === 0) {
    return;
  }

  const messages = await Promise.all(
    jobs.map((job) =>
      messageRepo.create({
        userId: job.userId,
        contestId: job.contestId,
        type: job.type,
        template: job.template,
        status: "QUEUED",
        recipient: job.recipient,
        variables: job.variables
      })
    )
  );

  await messageQueue.addBulk(
    messages.map((message, index) => ({
      name: "send-message",
      data: {
        messageId: message._id.toString(),
        type: jobs[index].type,
        template: jobs[index].template,
        recipient: jobs[index].recipient,
        variables: jobs[index].variables
      }
    }))
  );
}

export async function sendRegistrationConfirmation(userId, contestId) {
  const [user, contest] = await Promise.all([
    userRepo.findById(userId),
    contestRepo.findById(contestId)
  ]);

  if (!user) {
    throw new NotFoundError(`User not found: ${userId}`);
  }

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const name = buildUserName(user);
  const contestName = contest.title || contest.name || "Contest";
  const baseVariables = {
    name,
    contestName,
    startTime: formatIST(contest.startTime),
    registrationId: user.registrationId || ""
  };

  const phone = getRecipientPhone(user);
  if (!phone) {
    await createSkippedMessage({
      userId,
      contestId,
      type: "WHATSAPP",
      template: "REGISTRATION_CONFIRMATION",
      recipient: "",
      variables: baseVariables,
      reason: "User has no phone number"
    });
  } else {
    await enqueueJob("WHATSAPP", "REGISTRATION_CONFIRMATION", userId, phone, baseVariables, contestId);
  }

  const email = getRecipientEmail(user);
  if (!email) {
    await createSkippedMessage({
      userId,
      contestId,
      type: "EMAIL",
      template: "REGISTRATION_CONFIRMATION",
      recipient: "",
      variables: baseVariables,
      reason: "User has no email address"
    });
  } else {
    await enqueueJob("EMAIL", "REGISTRATION_CONFIRMATION", userId, email, baseVariables, contestId);
  }
}

export async function sendPaymentReceipt(userId, paymentId) {
  const [user, payment] = await Promise.all([
    userRepo.findById(userId),
    paymentRepo.findById(paymentId)
  ]);

  if (!user) {
    throw new NotFoundError(`User not found: ${userId}`);
  }

  if (!payment) {
    throw new NotFoundError(`Payment not found: ${paymentId}`);
  }

  const contestName = payment.contestRef?.title || payment.contestName || "Contest";
  const variables = {
    name: buildUserName(user),
    contestName,
    amount: formatCurrency(payment.amount),
    transactionId: payment.paymentId || payment.orderId || paymentId,
    receiptDate: formatIST(payment.createdAt)
  };
  const contestId = payment.contestRef?._id || payment.contestRef || null;

  const phone = getRecipientPhone(user);
  if (!phone) {
    await createSkippedMessage({
      userId,
      contestId,
      type: "WHATSAPP",
      template: "PAYMENT_RECEIPT",
      recipient: "",
      variables,
      reason: "User has no phone number"
    });
  } else {
    await enqueueJob("WHATSAPP", "PAYMENT_RECEIPT", userId, phone, variables, contestId);
  }

  const email = getRecipientEmail(user);
  if (!email) {
    await createSkippedMessage({
      userId,
      contestId,
      type: "EMAIL",
      template: "PAYMENT_RECEIPT",
      recipient: "",
      variables,
      reason: "User has no email address"
    });
  } else {
    await enqueueJob("EMAIL", "PAYMENT_RECEIPT", userId, email, variables, contestId);
  }
}

export async function sendQuizReminder(contestId) {
  const contest = await contestRepo.findById(contestId);
  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const registrations = await registrationRepo.findConfirmedByContest(contestId);
  const contestName = contest.title || contest.name || "Contest";
  const joinUrl = `${String(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/contest/${contest.slug}`;

  const bulkJobs = [];

  for (const registration of registrations) {
    const user = registration.userId;
    const variables = {
      name: buildUserName(user),
      contestName,
      startTime: formatIST(contest.startTime),
      joinUrl
    };

    const phone = getRecipientPhone(user);
    if (phone) {
      bulkJobs.push({
        userId: user._id,
        contestId,
        type: "WHATSAPP",
        template: "QUIZ_REMINDER",
        recipient: phone,
        variables
      });
    } else {
      await createSkippedMessage({
        userId: user._id,
        contestId,
        type: "WHATSAPP",
        template: "QUIZ_REMINDER",
        recipient: "",
        variables,
        reason: "User has no phone number"
      });
    }

    const email = getRecipientEmail(user);
    if (email) {
      bulkJobs.push({
        userId: user._id,
        contestId,
        type: "EMAIL",
        template: "QUIZ_REMINDER",
        recipient: email,
        variables
      });
    } else {
      await createSkippedMessage({
        userId: user._id,
        contestId,
        type: "EMAIL",
        template: "QUIZ_REMINDER",
        recipient: "",
        variables,
        reason: "User has no email address"
      });
    }
  }

  await enqueueReminderJobs(bulkJobs);
}

export async function sendResultAnnouncement(userId, contestId, score, total, rank) {
  const [user, contest] = await Promise.all([
    userRepo.findById(userId),
    contestRepo.findById(contestId)
  ]);

  if (!user) {
    throw new NotFoundError(`User not found: ${userId}`);
  }

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const contestName = contest.title || contest.name || "Contest";
  const variables = {
    name: buildUserName(user),
    contestName,
    score,
    total,
    rank,
    leaderboardUrl: `${String(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/leaderboard/${contest.slug}`
  };

  const phone = getRecipientPhone(user);
  if (phone) {
    await enqueueJob("WHATSAPP", "RESULT_ANNOUNCEMENT", userId, phone, variables, contestId);
  } else {
    await createSkippedMessage({
      userId,
      contestId,
      type: "WHATSAPP",
      template: "RESULT_ANNOUNCEMENT",
      recipient: "",
      variables,
      reason: "User has no phone number"
    });
  }

  const email = getRecipientEmail(user);
  if (email) {
    await enqueueJob("EMAIL", "RESULT_ANNOUNCEMENT", userId, email, variables, contestId);
  } else {
    await createSkippedMessage({
      userId,
      contestId,
      type: "EMAIL",
      template: "RESULT_ANNOUNCEMENT",
      recipient: "",
      variables,
      reason: "User has no email address"
    });
  }
}

export async function sendCertificateReady(userId, contestId, certificateUrl) {
  const [user, contest] = await Promise.all([
    userRepo.findById(userId),
    contestRepo.findById(contestId)
  ]);

  if (!user) {
    throw new NotFoundError(`User not found: ${userId}`);
  }

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const contestName = contest.title || contest.name || "Contest";
  const variables = {
    name: buildUserName(user),
    contestName,
    certificateUrl
  };

  const email = getRecipientEmail(user);
  if (!email) {
    await createSkippedMessage({
      userId,
      contestId,
      type: "EMAIL",
      template: "CERTIFICATE_READY",
      recipient: "",
      variables,
      reason: "User has no email address"
    });
    return;
  }

  await enqueueJob("EMAIL", "CERTIFICATE_READY", userId, email, variables, contestId);
}

export async function sendPaymentFailed(userId, contestId, failReason = "Payment failed") {
  const [user, contest] = await Promise.all([
    userRepo.findById(userId),
    contestRepo.findById(contestId)
  ]);

  if (!user) {
    throw new NotFoundError(`User not found: ${userId}`);
  }

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const email = getRecipientEmail(user);
  const variables = {
    name: buildUserName(user),
    contestName: contest.title || contest.name || "Contest",
    failReason
  };

  if (!email) {
    await createSkippedMessage({
      userId,
      contestId,
      type: "EMAIL",
      template: "PAYMENT_FAILED",
      recipient: "",
      variables,
      reason: "User has no email address"
    });
    return;
  }

  await enqueueJob("EMAIL", "PAYMENT_FAILED", userId, email, variables, contestId);
}

export async function sendOtp(phone, otp) {
  const normalizedPhone = String(phone ?? "").trim();
  const normalizedOtp = String(otp ?? "").trim();

  if (!normalizedPhone) {
    throw new BadRequestError("Phone number is required");
  }

  if (!normalizedOtp) {
    throw new BadRequestError("OTP is required");
  }

  const user = await userRepo.findUserByFilter({ phone: normalizedPhone, isDeleted: false });
  if (!user) {
    throw new NotFoundError("User not found for OTP delivery");
  }

  await redisClient.setEx(getOtpKey(normalizedPhone), OTP_TTL_SECONDS, normalizedOtp);

  await enqueueJob(
    "WHATSAPP",
    "OTP",
    user._id,
    normalizedPhone,
    { otp: normalizedOtp, expiresInMinutes: Math.ceil(OTP_TTL_SECONDS / 60) },
    null,
    { priority: 1 }
  );
}

export { enqueueJob };

export async function verifyOtp(phone, inputOtp) {
  const normalizedPhone = String(phone ?? "").trim();
  const normalizedOtp = String(inputOtp ?? "").trim();

  const storedOtp = await redisClient.get(getOtpKey(normalizedPhone));
  if (!storedOtp) {
    throw new BadRequestError("OTP expired");
  }

  if (storedOtp !== normalizedOtp) {
    throw new UnauthorizedError("Invalid OTP");
  }

  await redisClient.del(getOtpKey(normalizedPhone));
  return true;
}