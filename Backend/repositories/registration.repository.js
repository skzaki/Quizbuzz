import { ContestRegistration } from "../Models/DB.js";

export async function findByUserAndContest(userId, contestId) {
  return ContestRegistration.findOne({ userId, contestId }).lean();
}

export async function create(data) {
  const created = await ContestRegistration.create(data);
  return created.toObject();
}

export async function findConfirmedByContest(contestId) {
  return ContestRegistration.find({ contestId, status: "CONFIRMED" })
    .populate("userId", "firstName lastName email phone registrationId")
    .lean();
}

export async function confirmPayment(userId, contestId) {
  return ContestRegistration.findOneAndUpdate(
    { userId, contestId },
    { $set: { status: "CONFIRMED" } },
    { new: true }
  ).lean();
}

export async function findPaginated(contestId, skip = 0, limit = 20) {
  const skipNum = Number(skip) >= 0 ? Number(skip) : 0;
  const limitNum = Number(limit) > 0 ? Number(limit) : 20;

  const [registrations, total] = await Promise.all([
    ContestRegistration.find({ contestId })
      .sort({ registeredAt: -1 })
      .skip(skipNum)
      .limit(limitNum)
      .lean(),
    ContestRegistration.countDocuments({ contestId })
  ]);

  return { registrations, total };
}

export async function countByContestId(contestId) {
  return ContestRegistration.countDocuments({ contestId });
}
