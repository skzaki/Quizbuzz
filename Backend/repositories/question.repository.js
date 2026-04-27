import mongoose from "mongoose";
import { Question } from "../Models/DB.js";

export async function findByIds(questionIds = []) {
  return Question.find({
    _id: { $in: questionIds },
    isDeleted: false
  }).lean();
}

export async function sampleQuestions(match, requestedCount, excludedIds = []) {
  const aggregateMatch = { ...match };

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
