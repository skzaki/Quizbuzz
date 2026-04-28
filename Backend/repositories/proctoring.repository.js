import { ProctoringEvent } from "../Models/DB.js";

export async function create(data) {
  const created = await ProctoringEvent.create(data);
  return created.toObject();
}

export async function findByUserAndContest(userId, contestId) {
  return ProctoringEvent.findOne({ userId, contestId }).sort({ occurredAt: -1 }).lean();
}

export async function findByContest(contestId, filter = {}, skip = 0, limit = 20) {
  const query = { contestId };

  if (filter.eventType) {
    query.eventType = filter.eventType;
  }

  if (filter.reviewed !== undefined) {
    query.reviewed = filter.reviewed;
  }

  const [items, total] = await Promise.all([
    ProctoringEvent.find(query)
      .sort({ occurredAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Number(limit) || 20)
      .lean(),
    ProctoringEvent.countDocuments(query)
  ]);

  return { items, total };
}

export async function countRecentEvents(userId, contestId, eventType, sinceMs) {
  const since = new Date(Date.now() - sinceMs);
  return ProctoringEvent.countDocuments({
    userId,
    contestId,
    eventType,
    occurredAt: { $gte: since }
  });
}

export async function markReviewed(id, adminId, note) {
  return ProctoringEvent.findByIdAndUpdate(
    id,
    {
      $set: {
        reviewed: true,
        reviewedBy: adminId,
        reviewNote: note || ""
      }
    },
    { new: true }
  ).lean();
}

export async function countFlaggedUsers(contestId) {
  const grouped = await ProctoringEvent.aggregate([
    { $match: { contestId } },
    { $group: { _id: "$userId" } },
    { $count: "total" }
  ]);

  return grouped[0]?.total || 0;
}