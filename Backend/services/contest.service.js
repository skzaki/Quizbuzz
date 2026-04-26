import redisClient from "../config/redis.js";
import { evaluationQueue } from "../queues/evaluation.queue.js";
import { NotFoundError, ConflictError } from "../utils/errors.js";

import * as contestRepo from "../repositories/contest.repository.js";
import * as registrationRepo from "../repositories/registration.repository.js";
import * as submissionRepo from "../repositories/submission.repository.js";
import * as questionRepo from "../repositories/question.repository.js";

// Status transition validation
const VALID_STATUS_TRANSITIONS = {
  DRAFT: ["PUBLISHED"],
  PUBLISHED: ["UPCOMING"],
  UPCOMING: ["LIVE"],
  LIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

/**
 * 1. createContest(adminId, dto)
 * - call contestRepo.create()
 * - invalidate Redis cache pattern 'contests:*'
 * - return created contest
 */
export async function createContest(adminId, dto) {
  const contestData = {
    ...dto,
    createdBy: adminId,
    status: "DRAFT"
  };

  const created = await contestRepo.create(contestData);

  // Invalidate contests list cache
  await invalidateContestsListCache();

  return created;
}

/**
 * 2. listContests(params) — admin paginated list
 * - cache key: contests:list:{JSON.stringify(params)}
 * - Redis GET → if hit return parsed
 * - else contestRepo.findPaginated(params)
 * - Redis SETEX 180 seconds
 * - return paginated response
 */
export async function listContests(params = {}) {
  const cacheKey = `contests:list:${JSON.stringify(params)}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn(`Redis read error for ${cacheKey}:`, err.message);
  }

  const { contests, total } = await contestRepo.findPaginated(params);

  const pageNum = Number(params.page) || 1;
  const limitNum = Number(params.limit) || 10;
  const totalPages = Math.ceil(total / limitNum);

  const response = {
    data: {
      contests,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      }
    },
    success: true,
    message: "Contests retrieved successfully"
  };

  try {
    await redisClient.setEx(cacheKey, 180, JSON.stringify(response));
  } catch (err) {
    console.warn(`Redis write error for ${cacheKey}:`, err.message);
  }

  return response;
}

/**
 * 3. getBySlug(slug) — public contest page
 * - cache key: contest:slug:{slug}
 * - Redis GET → if hit return parsed
 * - else contestRepo.findBySlug()
 * - Redis SETEX 3600 seconds
 * - throw NotFoundError if not found
 */
export async function getBySlug(slug) {
  const cacheKey = `contest:slug:${slug}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn(`Redis read error for ${cacheKey}:`, err.message);
  }

  const contest = await contestRepo.findBySlug(slug);

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${slug}`);
  }

  const response = {
    success: true,
    data: contest,
    message: "Contest retrieved successfully"
  };

  try {
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));
  } catch (err) {
    console.warn(`Redis write error for ${cacheKey}:`, err.message);
  }

  return response;
}

/**
 * 4. updateContest(contestId, dto)
 * - contestRepo.update()
 * - delete Redis keys: contest:slug:{slug}, contests:list:*
 */
export async function updateContest(contestId, dto) {
  const existing = await contestRepo.findById(contestId);

  if (!existing) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const updated = await contestRepo.update(contestId, dto);

  // Bust cache
  if (existing.slug) {
    try {
      await redisClient.del(`contest:slug:${existing.slug}`);
    } catch (err) {
      console.warn(`Redis delete error for contest:slug:${existing.slug}:`, err.message);
    }
  }
  await invalidateContestsListCache();

  return updated;
}

/**
 * 5. updateStatus(contestId, status)
 * - validate status transition is legal
 * - contestRepo.updateStatus()
 * - bust cache
 */
export async function updateStatus(contestId, status) {
  const existing = await contestRepo.findById(contestId);

  if (!existing) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const currentStatus = existing.status || "DRAFT";
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(status)) {
    throw new ConflictError(
      `Invalid status transition from ${currentStatus} to ${status}. Allowed: ${allowedTransitions.join(", ")}`
    );
  }

  const updated = await contestRepo.updateStatus(contestId, status);

  // Bust cache
  if (existing.slug) {
    try {
      await redisClient.del(`contest:slug:${existing.slug}`);
    } catch (err) {
      console.warn(`Redis delete error for contest:slug:${existing.slug}:`, err.message);
    }
  }
  await invalidateContestsListCache();

  return updated;
}

/**
 * 6. addQuestionsToContest(contestId, questionIds)
 * - verify contest exists
 * - verify all questionIds exist via questionRepo.findByIds()
 * - contestRepo.pushQuestions()
 * - bust question cache for this contest
 */
export async function addQuestionsToContest(contestId, questionIds = []) {
  const contest = await contestRepo.findById(contestId);

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw new Error("questionIds must be a non-empty array");
  }

  const foundQuestions = await questionRepo.findByIds(questionIds);

  if (foundQuestions.length !== questionIds.length) {
    throw new NotFoundError(`Not all question IDs found. Expected ${questionIds.length}, found ${foundQuestions.length}`);
  }

  const updated = await contestRepo.pushQuestions(contestId, questionIds);

  // Bust cache
  if (contest.slug) {
    try {
      await redisClient.del(`contest:slug:${contest.slug}`);
    } catch (err) {
      console.warn(`Redis delete error for contest:slug:${contest.slug}:`, err.message);
    }
  }
  await invalidateContestsListCache();

  return updated;
}

/**
 * 7. submitContest(slug, userId, answers)
 * - verify contest exists and status is LIVE
 * - check no existing submission via submissionRepo
 * - create submission with status SUBMITTED
 * - enqueue to evaluationQueue (BullMQ) with attempts:3, exponential backoff
 * - delete Redis key: contest:{contestId}:user:{userId}
 * - return { submissionId, status: 'SUBMITTED' }
 */
export async function submitContest(slug, userId, answers) {
  const contest = await contestRepo.findBySlug(slug);

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${slug}`);
  }

  if (contest.status !== "LIVE") {
    throw new ConflictError(`Contest is not in LIVE status. Current status: ${contest.status}`);
  }

  // Check for existing submission
  const existing = await submissionRepo.findByUserAndContest(userId, contest._id);

  if (existing) {
    throw new ConflictError(`User has already submitted for this contest`);
  }

  // Create submission
  const submissionData = {
    userId,
    contestId: contest._id,
    answers: answers.map((ans) => ({
      questionId: ans.questionId,
      answer: ans.answer || "",
      answerIndex: ans.answerIndex,
      isCorrect: false,
      submittedAt: new Date()
    })),
    score: 0,
    totalQuestions: answers.length,
    status: "SUBMITTED"
  };

  const submission = await submissionRepo.create(submissionData);

  // Enqueue evaluation job
  await evaluationQueue.add(
    "evaluate-submission",
    {
      submissionId: submission._id.toString(),
      contestSlug: slug,
      userId: userId.toString(),
      contestId: contest._id.toString()
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000
      }
    }
  );

  // Delete user state cache
  try {
    await redisClient.del(`contest:${contest._id}:user:${userId}`);
  } catch (err) {
    console.warn(`Redis delete error for contest user state:`, err.message);
  }

  return {
    submissionId: submission._id,
    status: "SUBMITTED",
    message: "Contest submitted successfully"
  };
}

/**
 * 8. getStatistics(contestId) — admin stats
 * - aggregate from submissions + registrations
 * - cache 60 seconds
 */
export async function getStatistics(contestId) {
  const cacheKey = `contest:stats:${contestId}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn(`Redis read error for ${cacheKey}:`, err.message);
  }

  const contest = await contestRepo.findById(contestId);

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const [submissionStats, registrationCount] = await Promise.all([
    submissionRepo.aggregateStatsByContest(contestId),
    registrationRepo.countByContestId
      ? registrationRepo.countByContestId(contestId)
      : 0
  ]);

  const response = {
    success: true,
    data: {
      contestId,
      registrationCount: registrationCount || 0,
      submissionCount: submissionStats.totalSubmissions || 0,
      evaluatedCount: submissionStats.evaluatedCount || 0,
      averageScore: submissionStats.averageScore || 0,
      highestScore: submissionStats.highestScore || 0,
      lowestScore: submissionStats.lowestScore || 0
    },
    message: "Contest statistics retrieved successfully"
  };

  try {
    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
  } catch (err) {
    console.warn(`Redis write error for ${cacheKey}:`, err.message);
  }

  return response;
}

// Helper: invalidate all contests list caches
async function invalidateContestsListCache() {
  try {
    for await (const key of redisClient.scanIterator({ MATCH: "contests:list:*" })) {
      await redisClient.del(key);
    }
  } catch (err) {
    console.warn("Error invalidating contests list cache:", err.message);
  }
}
