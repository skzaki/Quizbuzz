import redisClient from "../redis.js";
import * as contestRepo from "../repositories/contest.repository.js";
import * as questionRepo from "../repositories/question.repository.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";
import { createQuestionSchema, updateQuestionSchema, validateBulkImportRows } from "../validators/question.validator.js";

const QUESTION_CACHE_TTL_SECONDS = 3600;
const CORRECT_ANSWERS_TTL_SECONDS = 10800;

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
};

const normalizeDifficulty = (value) => {
  if (!value) {
    return "MEDIUM";
  }

  return String(value).trim().toUpperCase();
};

const shuffleSeed = (seedText) => {
  let h1 = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i += 1) {
    h1 = Math.imul(h1 ^ seedText.charCodeAt(i), 3432918353);
    h1 = (h1 << 13) | (h1 >>> 19);
  }

  return () => {
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 = Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((h1 ^= h1 >>> 16) >>> 0) / 4294967296;
  };
};

const seededShuffle = (items, seedText) => {
  const random = shuffleSeed(seedText);
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
};

const normalizeValidatedQuestion = (data) => ({
  questionText: data.questionText,
  options: Array.isArray(data.options)
    ? data.options.map((option, index) => ({
        text: option.text,
        index: option.index ?? index
      }))
    : undefined,
  correctOptionIndex: data.correctOptionIndex,
  correctOptionText: Array.isArray(data.options)
    ? data.options[data.correctOptionIndex]?.text
    : undefined,
  difficulty: data.difficulty ? normalizeDifficulty(data.difficulty) : undefined,
  tags: data.tags ? normalizeTags(data.tags) : undefined,
  hint: data.hint,
  explanation: data.explanation
});

const validateQuestion = (dto, schema = createQuestionSchema) => {
  const parsed = schema.safeParse(dto);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`)
      .join("; ");
    throw new BadRequestError(message);
  }

  return normalizeValidatedQuestion(parsed.data);
};

const buildUpdatePayload = (existing, dto) => {
  const validated = validateQuestion(dto, updateQuestionSchema);
  const payload = {};

  if (validated.questionText !== undefined) {
    payload.questionText = validated.questionText;
  }

  if (validated.difficulty !== undefined) {
    payload.difficulty = validated.difficulty;
  }

  if (validated.tags !== undefined) {
    payload.tags = validated.tags;
  }

  if (validated.hint !== undefined) {
    payload.hint = validated.hint;
  }

  if (validated.explanation !== undefined) {
    payload.explanation = validated.explanation;
  }

  const nextOptions = validated.options ?? existing.options;
  const nextCorrectOptionIndex = validated.correctOptionIndex ?? existing.correctOptionIndex;

  if (validated.options !== undefined || validated.correctOptionIndex !== undefined) {
    payload.options = nextOptions;
    payload.correctOptionIndex = nextCorrectOptionIndex;
    payload.correctOptionText = nextOptions?.[nextCorrectOptionIndex]?.text || "";
  }

  return payload;
};

const getPublicContestQuestionsCacheKey = (contestSlug) => `contest:${contestSlug}:questions:public`;

const invalidateContestQuestionCache = async (contestId) => {
  if (!contestId) {
    return;
  }

  await redisClient.del(`contest:${contestId}:questions:public`).catch(() => {});
};

export async function create(adminId, dto) {
  const created = await questionRepo.create({
    ...validateQuestion(dto, createQuestionSchema),
    createdBy: adminId
  });

  await invalidateContestQuestionCache(created.contestId);

  return created;
}

export async function update(questionId, dto) {
  const existing = await questionRepo.findById(questionId);

  if (!existing) {
    throw new NotFoundError(`Question not found: ${questionId}`);
  }

  const updated = await questionRepo.update(questionId, buildUpdatePayload(existing, dto));

  await Promise.all([
    invalidateContestQuestionCache(existing.contestId),
    invalidateContestQuestionCache(dto.contestId)
  ]);

  return updated;
}

export async function softDelete(questionId) {
  const existing = await questionRepo.findById(questionId);

  if (!existing) {
    throw new NotFoundError(`Question not found: ${questionId}`);
  }

  const deleted = await questionRepo.softDelete(questionId);

  await invalidateContestQuestionCache(existing.contestId);

  return deleted;
}

export async function bulkImport(adminId, questionsArray = []) {
  if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
    throw new BadRequestError("questionsArray must be a non-empty array");
  }

  const { validRows, failedRows } = validateBulkImportRows(questionsArray);

  if (failedRows.length > 0) {
    const error = new BadRequestError(
      `Invalid question rows: ${failedRows.map((item) => `row ${item.rowNumber}`).join(", ")}`
    );
    error.details = failedRows;
    throw error;
  }

  const inserted = await questionRepo.insertMany(validRows.map((row) => ({
    ...normalizeValidatedQuestion(row),
    createdBy: adminId
  })));

  return {
    inserted: inserted.length,
    failed: failedRows
  };
}

export async function getQuestionsForAdmin(params = {}) {
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const limit = Number(params.limit) > 0 ? Number(params.limit) : 10;
  const skip = (page - 1) * limit;
  const sort = {
    [params.sortBy || "createdAt"]: params.sortOrder === "asc" ? 1 : -1
  };

  const filter = {
    difficulty: params.difficulty,
    tags: normalizeTags(params.tags),
    contestId: params.contestId,
    search: params.search
  };

  const { questions, total } = await questionRepo.findPaginated(filter, skip, limit, sort);

  return {
    questions,
    total,
    page,
    limit
  };
}

/**
 * Anti-cheat critical path: this is the only supported way to serve contest questions to participants.
 * It must never expose correctOptionIndex or correctOptionText, and the cached payload must remain safe.
 */
export async function getQuestionsForContest(contestSlug, userId) {
  const cacheKey = getPublicContestQuestionsCacheKey(contestSlug);

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    return seededShuffle(parsed, `${userId}:${contestSlug}`);
  }

  const contest = await contestRepo.findBySlug(contestSlug);
  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestSlug}`);
  }

  const questionIds = Array.isArray(contest.questionBank)
    ? contest.questionBank
    : Array.isArray(contest.QuestionBank)
      ? contest.QuestionBank
      : [];

  const safeQuestions = await questionRepo.findByIdsPublic(questionIds);
  const safePayload = safeQuestions.map((question) => ({
    ...question,
    id: question._id,
    _id: question._id
  }));

  await redisClient.setEx(cacheKey, QUESTION_CACHE_TTL_SECONDS, JSON.stringify(safePayload));

  return seededShuffle(safePayload, `${userId}:${contestSlug}`);
}

/**
 * Anti-cheat critical path: this stores the answer key used only by the evaluation worker.
 * It must never be returned by an API response or reused as participant-facing question data.
 */
export async function storeCorrectAnswersInRedis(contestId) {
  const contest = await contestRepo.findById(contestId);

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const questionIds = Array.isArray(contest.questionBank)
    ? contest.questionBank
    : Array.isArray(contest.QuestionBank)
      ? contest.QuestionBank
      : [];

  const questions = await questionRepo.findByIds(questionIds);
  const correctAnswersMap = questions.reduce((accumulator, question) => {
    accumulator[question._id.toString()] = question.correctOptionIndex;
    return accumulator;
  }, {});

  await redisClient.setEx(
    `contest:${contestId}:correct_answers`,
    CORRECT_ANSWERS_TTL_SECONDS,
    JSON.stringify(correctAnswersMap)
  );

  return correctAnswersMap;
}

export async function getByDifficulty(contestId) {
  return questionRepo.countByDifficulty(contestId);
}
