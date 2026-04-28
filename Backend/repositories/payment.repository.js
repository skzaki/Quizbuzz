import { Payment } from "../Models/DB.js";

export async function create(data) {
  const created = await Payment.create(data);
  return created;
}

export async function findByOrderId(razorpayOrderId) {
  return Payment.findOne({ razorpayOrderId }).lean();
}

export async function findPendingOrder(userId, contestId) {
  return Payment.findOne({ userId, contestId, status: "PENDING" }).lean();
}

export async function findById(id) {
  return Payment.findById(id)
    .populate("userId", "firstName lastName email phone registrationId")
    .populate("contestId", "title slug startTime")
    .lean();
}

export async function count(filter = {}) {
  return Payment.countDocuments(filter);
}

export async function updateStatus(id, status, extra = {}) {
  return Payment.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        ...extra
      }
    },
    { new: true }
  ).lean();
}

export async function findPaginated(filter = {}, skip = 0, limit = 50, sort = { createdAt: -1 }) {
  const query = { ...filter };

  return Payment.find(query)
    .populate("userId", "firstName lastName email")
    .populate("contestId", "title slug")
    .sort(sort)
    .skip(Number(skip) || 0)
    .limit(Number(limit) || 50)
    .lean();
}

export async function getStats(contestId) {
  const matchStage = contestId ? { contestId } : {};

  const [summary] = await Payment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCollected: {
          $sum: { $cond: [{ $eq: ["$status", "CAPTURED"] }, "$amount", 0] }
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] }
        },
        capturedCount: {
          $sum: { $cond: [{ $eq: ["$status", "CAPTURED"] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] }
        },
        averagePaymentAmount: { $avg: "$amount" }
      }
    }
  ]);

  const paymentsOverTime = await Payment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalCollected: {
          $sum: { $cond: [{ $eq: ["$status", "CAPTURED"] }, "$amount", 0] }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: "$_id",
        totalCollected: 1,
        count: 1,
        _id: 0
      }
    }
  ]);

  return {
    totalCollected: summary?.totalCollected || 0,
    pendingCount: summary?.pendingCount || 0,
    capturedCount: summary?.capturedCount || 0,
    failedCount: summary?.failedCount || 0,
    averagePaymentAmount: summary?.averagePaymentAmount || 0,
    paymentsOverTime
  };
}

export async function findForExport(contestId) {
  const filter = {
    ...(contestId ? { contestId } : {}),
    status: "CAPTURED"
  };

  return Payment.find(filter)
    .populate("userId", "firstName lastName email phone")
    .populate("contestId", "title")
    .sort({ createdAt: 1 })
    .lean();
}