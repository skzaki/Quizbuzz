import { Submission } from "../Models/DB.js";

export async function findByUserAndContest(userId, contestId) {
  return Submission.findOne({ userId, contestId }).lean();
}

export async function create(data) {
  const created = await Submission.create(data);
  return created.toObject();
}

export async function update(submissionId, data) {
  return Submission.findByIdAndUpdate(submissionId, { $set: data }, { new: true }).lean();
}

export async function findById(submissionId) {
  return Submission.findById(submissionId).lean();
}

export async function countByContest(contestId) {
  return Submission.countDocuments({ contestId });
}

export async function findByIdDetailed(submissionId) {
  return Submission.findById(submissionId)
    .populate("userId", "firstName lastName email registrationId")
    .populate("contestId", "title startTime status cutOff slug")
    .populate("answers.questionId")
    .lean();
}

export async function findByContestAndUserDetailed(contestId, userId) {
  return Submission.findOne({ contestId, userId })
    .populate("contestId", "title")
    .populate("userId", "firstName lastName")
    .lean();
}

export async function findLeaderboardByContest(contestId, scoreThreshold = 0) {
  return Submission.find({
    contestId,
    score: { $gte: scoreThreshold }
  })
    .select("_id userId score totalQuestions createdAt updatedAt contestId")
    .populate("userId", "firstName registrationId")
    .populate("contestId", "startTime")
    .lean();
}

export async function findLeaderboard(contestId, limit = 25) {
  return Submission.find({ contestId })
    .sort({ score: -1, evaluatedAt: 1 })
    .limit(Number(limit) || 25)
    .select("userId contestId score status evaluatedAt submittedAt")
    .populate("userId", "firstName registrationId")
    .lean();
}

export async function aggregateStatsByContest(contestId) {
  const [summary] = await Submission.aggregate([
    { $match: { contestId } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        evaluatedCount: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ["$status", "evaluated"] }, { $eq: ["$status", "EVALUATED"] }] },
              1,
              0
            ]
          }
        },
        averageScore: { $avg: "$score" },
        highestScore: { $max: "$score" },
        lowestScore: { $min: "$score" }
      }
    }
  ]);

  return (
    summary || {
      totalSubmissions: 0,
      evaluatedCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0
    }
  );
}
