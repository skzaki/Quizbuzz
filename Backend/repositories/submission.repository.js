import { Submission } from "../Models/DB.js";

export async function findByUserAndContest(userId, contestId) {
  return Submission.findOne({ userId, contestId }).lean();
}

export async function create(data) {
  const created = await Submission.create(data);
  return created.toObject();
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
