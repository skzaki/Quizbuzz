import * as messageService from "../services/message.service.js";
import * as messageRepo from "../repositories/message.repository.js";
import { BadRequestError } from "../utils/errors.js";

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export const sendTest = asyncHandler(async (req, res) => {
  const { type, template, recipient, variables } = req.body;

  await messageService.enqueueJob(
    type,
    template,
    req.user?.userId || req.user?._id,
    recipient,
    variables || {},
    null,
    { priority: 1 }
  );

  res.json({ success: true, message: "Test message queued" });
});

export const getHistory = asyncHandler(async (req, res) => {
  const messages = await messageRepo.findByUser(req.params.userId, 50);

  res.json({ success: true, data: messages });
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await messageRepo.countByStatus(req.query.contestId);

  res.json({ success: true, data: stats });
});

export const getFailedMessages = asyncHandler(async (req, res) => {
  const failed = await messageRepo.findFailedByTemplate(req.query.template, req.query.since);

  res.json({ success: true, data: failed });
});

export const retryFailed = asyncHandler(async (req, res) => {
  const message = await messageRepo.findById(req.params.id);

  if (!message) {
    throw new BadRequestError("Message not found");
  }

  if (message.status !== "FAILED") {
    throw new BadRequestError("Message is not failed");
  }

  await messageService.enqueueJob(
    message.type,
    message.template,
    message.userId,
    message.recipient,
    message.variables,
    message.contestId,
    { priority: 1 }
  );

  await messageRepo.update(req.params.id, { status: "QUEUED", failReason: "" });

  res.json({ success: true, message: "Retry queued" });
});