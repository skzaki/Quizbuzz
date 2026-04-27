import mongoose from "mongoose";
import { Question } from "../Models/DB.js";

export async function findByIds(questionIds = []) {
  return Question.find({
    _id: { $in: questionIds },
    isDeleted: false
  }).lean();
}

export async function findById(id) {
  return Question.findOne({ _id: id, isDeleted: false }).lean();
}

export async function findByIdsPublic(questionIds = []) {
  return Question.find({
    _id: { $in: questionIds },
    isDeleted: false
  })
    .select("-correctOptionIndex -correctOptionText")
    .lean();
}

export async function create(data) {
  const created = await Question.create(data);
  return created.toObject();
}

export async function insertMany(data = []) {
  const inserted = await Question.insertMany(data, { ordered: false });
  return inserted.map((item) => item.toObject());
}

export async function update(id, data) {
  return Question.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
}

export async function softDelete(id) {
  return Question.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true }).lean();
}

export async function findPaginated(filter = {}, skip = 0, limit = 10, sort = { createdAt: -1 }) {
  const query = { isDeleted: false };

  if (filter.difficulty) {
    const normalizedDifficulty = String(filter.difficulty).toUpperCase();
    query.difficulty = { $in: [normalizedDifficulty, normalizedDifficulty.toLowerCase()] };
  }

  if (filter.tags?.length) {
    query.tags = { $in: filter.tags };
  }

  if (filter.contestId !== undefined) {
    query.contestId = filter.contestId;
  }

  if (filter.search) {
    query.$or = [
      { questionText: { $regex: filter.search, $options: "i" } },
      { hint: { $regex: filter.search, $options: "i" } },
      { explanation: { $regex: filter.search, $options: "i" } }
    ];
  }

  const [questions, total] = await Promise.all([
    Question.find(query).sort(sort).skip(Number(skip) || 0).limit(Number(limit) || 10).lean(),
    Question.countDocuments(query)
  ]);

  return { questions, total };
}

export async function countByDifficulty(contestId) {
  const match = { isDeleted: false };

  if (contestId !== undefined && contestId !== null) {
    match.contestId = contestId;
  }

  const grouped = await Question.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $toUpper: "$difficulty" },
        count: { $sum: 1 }
      }
    }
  ]);

  return grouped.reduce((accumulator, item) => {
    accumulator[item._id] = item.count;
    return accumulator;
  }, { EASY: 0, MEDIUM: 0, HARD: 0 });
}

export async function sampleQuestions(match, requestedCount, excludedIds = []) {
  const aggregateMatch = { ...match };

  if (aggregateMatch.difficulty) {
    const normalizedDifficulty = String(aggregateMatch.difficulty).toUpperCase();
    aggregateMatch.difficulty = { $in: [normalizedDifficulty, normalizedDifficulty.toLowerCase()] };
  }

  if (Array.isArray(excludedIds) && excludedIds.length > 0) {
    aggregateMatch._id = {
      $nin: excludedIds.map((id) => (
        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
      ))
    };
  }

  return Question.aggregate([
    { $match: aggregateMatch },
    { $sample: { size: requestedCount } },
    {
      $project: {
        questionText: 1,
        options: 1,
        _id: 1,
        domain: 1,
        difficulty: 1,
        type: 1,
        points: 1,
        explanation: 1,
        topic: 1,
        correctAnswer: 1
      }
    }
  ]);
}
