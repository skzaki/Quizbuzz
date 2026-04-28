import { Message } from "../Models/DB.js";

export async function create(data) {
  const created = await Message.create(data);
  return created.toObject();
}

export async function findByUser(userId, limit = 50) {
  return Message.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 50)
    .lean();
}

export async function findById(id) {
  return Message.findById(id).lean();
}

export async function update(id, data) {
  return Message.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
}

export async function markSent(id) {
  return Message.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "SENT",
        sentAt: new Date(),
        failReason: ""
      }
    },
    { new: true }
  ).lean();
}

export async function markFailed(id, reason) {
  return Message.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "FAILED",
        failReason: reason || "Unknown failure"
      },
      $inc: { attemptCount: 1 }
    },
    { new: true }
  ).lean();
}

export async function markSkipped(id, reason) {
  return Message.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "SKIPPED",
        failReason: reason || "Skipped"
      }
    },
    { new: true }
  ).lean();
}

export async function findFailedByTemplate(template, since) {
  const query = {
    template,
    status: "FAILED"
  };

  if (since) {
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) {
      query.createdAt = { $gte: sinceDate };
    }
  }

  return Message.find(query).sort({ createdAt: -1 }).lean();
}

export async function countByStatus(contestId) {
  const matchStage = contestId ? { contestId } : {};
  const [summary] = await Message.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        SENT: {
          $sum: { $cond: [{ $eq: ["$status", "SENT"] }, 1, 0] }
        },
        FAILED: {
          $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] }
        },
        QUEUED: {
          $sum: { $cond: [{ $eq: ["$status", "QUEUED"] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        SENT: 1,
        FAILED: 1,
        QUEUED: 1
      }
    }
  ]);

  return (
    summary || {
      SENT: 0,
      FAILED: 0,
      QUEUED: 0
    }
  );
}