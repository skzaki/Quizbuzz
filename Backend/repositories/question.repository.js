import { Question } from "../Models/DB.js";

export async function findByIds(questionIds = []) {
  return Question.find({
    _id: { $in: questionIds },
    isDeleted: false
  }).lean();
}
