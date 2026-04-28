import * as paymentService from "../services/payment.service.js";

export async function createOrder(req, res, next) {
  try {
    const { contestId } = req.body;
    const { userId } = req.user;
    const result = await paymentService.createOrder(userId, contestId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function verify(req, res, next) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const { userId } = req.user;
    const result = await paymentService.verifyAndCapture(
      userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function webhook(req, res, next) {
  try {
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return res.sendStatus(400);
    }

    await paymentService.processWebhook(req.body, signature);
    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
}

export async function getAll(req, res, next) {
  try {
    const { page, limit, status, contestId, sortBy, sortOrder } = req.query;
    const result = await paymentService.listPayments({
      page,
      limit,
      status,
      contestId,
      sortBy,
      sortOrder
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const result = await paymentService.getPaymentById(req.params.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function getStats(req, res, next) {
  try {
    const result = await paymentService.getPaymentStats(req.query.contestId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const csvString = await paymentService.exportPaymentsCsv(req.query.contestId);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payments-${req.query.contestId || "all"}.csv"`
    );
    return res.send(csvString);
  } catch (error) {
    return next(error);
  }
}