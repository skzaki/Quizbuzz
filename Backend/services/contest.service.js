import mongoose from "mongoose";
import redisClient from "../config/redis.js";
import { evaluationQueue } from "../queues/evaluation.queue.js";
import { NotFoundError, ConflictError, UnauthorizedError } from "../utils/errors.js";

import * as contestRepo from "../repositories/contest.repository.js";
import * as registrationRepo from "../repositories/registration.repository.js";
import * as submissionRepo from "../repositories/submission.repository.js";
import * as questionRepo from "../repositories/question.repository.js";
import {
  calculateDifficultyQuestionCounts,
  calculateQuestionCountsFromDistribution,
  normalizeDomainDistribution
} from "../utils/domainDistribution.js";

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
    contests,
    total,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1
    }
  };

  try {
    await redisClient.setEx(cacheKey, 180, JSON.stringify(response));
  } catch (err) {
    console.warn(`Redis write error for ${cacheKey}:`, err.message);
  }

  return response;
}

export async function getAllContests(params = {}) {
  return listContests(params);
}

export async function getById(contestId) {
  const contest = await contestRepo.findById(contestId);

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  return contest;
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

  try {
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(contest));
  } catch (err) {
    console.warn(`Redis write error for ${cacheKey}:`, err.message);
  }

  return contest;
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

export async function createContestRecord(adminId, dto) {
  return createContest(adminId, dto);
}

export async function softDelete(contestId) {
  const existing = await contestRepo.findById(contestId);

  if (!existing) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const deleted = await contestRepo.softDelete(contestId);

  if (existing.slug) {
    try {
      await redisClient.del(`contest:slug:${existing.slug}`);
    } catch (err) {
      console.warn(`Redis delete error for contest:slug:${existing.slug}:`, err.message);
    }
  }

  await invalidateContestsListCache();

  return deleted;
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

export async function addQuestions(contestId, questionIds = []) {
  return addQuestionsToContest(contestId, questionIds);
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
    registrationRepo.countByContestId(contestId)
  ]);

  const response = {
    contestId,
    registrationCount: registrationCount || 0,
    submissionCount: submissionStats.totalSubmissions || 0,
    evaluatedCount: submissionStats.evaluatedCount || 0,
    averageScore: submissionStats.averageScore || 0,
    highestScore: submissionStats.highestScore || 0,
    lowestScore: submissionStats.lowestScore || 0
  };

  try {
    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
  } catch (err) {
    console.warn(`Redis write error for ${cacheKey}:`, err.message);
  }

  return response;
}

/**
 * 9. getActiveContest()
 */
export async function getActiveContest() {
  const contest = await contestRepo.findActiveContest();

  if (!contest) {
    throw new NotFoundError("No active contest found");
  }

  return {
    ...contest,
    totalQuestions: contest.questionBank?.length || contest.QuestionBank?.length || 0
  };
}

/**
 * 10. getContestQuestions(contestSlug)
 * - reproduce the existing sampling logic via repositories
 */
export async function getContestQuestions(contestSlug) {
  const contest = await contestRepo.findBySlug(contestSlug);

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestSlug}`);
  }

  const selectedDomains = Array.isArray(contest.topics) ? contest.topics : [];
  if (selectedDomains.length === 0) {
    throw new ConflictError("No domains configured for this contest");
  }

  const totalQuestions = contest.questionBank?.length || contest.QuestionBank?.length || 20;
  const normalizedDistribution = normalizeDomainDistribution(
    selectedDomains,
    contest.domainDistribution || []
  );
  const domainQuestionCounts = calculateQuestionCountsFromDistribution(
    totalQuestions,
    normalizedDistribution
  );

  const pickedQuestions = [];
  const pickedIds = new Set();
  const fetchedCountByDomain = {};
  const fetchedCountByDomainDifficulty = {};

  const initializeDomainCounters = (domain) => {
    if (!fetchedCountByDomain[domain]) {
      fetchedCountByDomain[domain] = 0;
    }

    if (!fetchedCountByDomainDifficulty[domain]) {
      fetchedCountByDomainDifficulty[domain] = {
        easy: 0,
        medium: 0,
        hard: 0
      };
    }
  };

  const appendQuestion = (question) => {
    const questionId = question?._id?.toString();
    if (!questionId || pickedIds.has(questionId)) return;

    pickedIds.add(questionId);
    pickedQuestions.push(question);

    const domain = question.domain;
    const difficulty = question.difficulty;

    initializeDomainCounters(domain);
    fetchedCountByDomain[domain] += 1;

    if (["easy", "medium", "hard"].includes(difficulty)) {
      fetchedCountByDomainDifficulty[domain][difficulty] += 1;
    }
  };

  for (const domainConfig of domainQuestionCounts) {
    const domain = domainConfig.name;
    initializeDomainCounters(domain);

    const difficultyPlan = calculateDifficultyQuestionCounts(
      domainConfig.questionCount,
      domainConfig.difficulty
    );

    for (const difficultyConfig of difficultyPlan) {
      const requestedCount = difficultyConfig.questionCount;

      if (requestedCount <= 0) {
        continue;
      }

      const match = {
        domain,
        difficulty: difficultyConfig.difficulty,
        isDeleted: false
      };

      const difficultyQuestions = await questionRepo.sampleQuestions(
        match,
        requestedCount,
        [...pickedIds]
      );

      difficultyQuestions.forEach(appendQuestion);
    }

    const domainShortfall = domainConfig.questionCount - (fetchedCountByDomain[domain] || 0);

    if (domainShortfall > 0) {
      const domainFallbackMatch = {
        domain,
        isDeleted: false
      };

      const domainFallbackQuestions = await questionRepo.sampleQuestions(
        domainFallbackMatch,
        domainShortfall,
        [...pickedIds]
      );

      domainFallbackQuestions.forEach(appendQuestion);
    }
  }

  const overallShortfall = totalQuestions - pickedQuestions.length;

  if (overallShortfall > 0) {
    const fallbackQuestions = await questionRepo.sampleQuestions(
      { isDeleted: false },
      overallShortfall,
      [...pickedIds]
    );

    fallbackQuestions.forEach(appendQuestion);
  }

  return {
    questions: pickedQuestions,
    quesCount: pickedQuestions.length,
    requestedQuestionCount: totalQuestions,
    domainDistribution: normalizedDistribution,
    domainQuestionCounts
  };
}

/**
 * 11. getSubmissionStatus(submissionId)
 */
export async function getSubmissionStatus(submissionId) {
  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw new ConflictError("Invalid submission ID");
  }

  const cached = await redisClient.get(`submission:${submissionId}:status`);
  if (cached) {
    return JSON.parse(cached);
  }

  const submission = await submissionRepo.findById(submissionId);

  if (!submission) {
    throw new NotFoundError("Submission not found");
  }

  const normalizedStatus = String(submission.status || "").toLowerCase();
  const response = {
    submissionId,
    status: submission.status,
    ...(normalizedStatus === "evaluated" && {
      score: submission.score,
      totalQuestions: submission.totalQuestions,
      percentage: submission.totalQuestions
        ? Math.round((submission.score / submission.totalQuestions) * 100)
        : 0
    }),
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt
  };

  const cacheTime = normalizedStatus === "evaluated" ? 3600 : 30;
  await redisClient.setEx(`submission:${submissionId}:status`, cacheTime, JSON.stringify(response));

  return response;
}

/**
 * 12. getSubmissionResult(submissionId, userId)
 */
export async function getSubmissionResult(submissionId, userId) {
  if (!mongoose.Types.ObjectId.isValid(submissionId)) {
    throw new ConflictError("Invalid submission ID");
  }

  const cached = await redisClient.get(`submission:${submissionId}:results`);
  if (cached) {
    return JSON.parse(cached);
  }

  const submission = await submissionRepo.findByIdDetailed(submissionId);

  if (!submission) {
    throw new NotFoundError("Submission not found");
  }

  if (submission.userId?._id?.toString() !== userId.toString()) {
    throw new UnauthorizedError("Unauthorized to view this submission");
  }

  const normalizedStatus = String(submission.status || "").toLowerCase();

  if (normalizedStatus === "submitted") {
    const statusResponse = {
      contestId: submission.contestId?._id,
      userId: submission.userId?._id,
      submissionId,
      status: submission.status,
      message: "Your submission is being evaluated. Please wait...",
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt
    };

    await redisClient.setEx(`submission:${submissionId}:results`, 30, JSON.stringify(statusResponse));
    return statusResponse;
  }

  const questionResults = submission.answers.map((answer, index) => {
    const question = answer.questionId;

    return {
      questionNo: index + 1,
      questionId: question?._id,
      questionText: question?.questionText || `Question ${index + 1}`,
      questionType: question?.type || "multiple_choice",
      userAnswer: answer.answer,
      userAnswerIndex: answer.answerIndex,
      correctAnswer: answer?.correctAnswer,
      isCorrect: answer.isCorrect,
      points: answer.isCorrect ? (question?.points || 1) : 0,
      maxPoints: question?.points || 1,
      explanation: question?.explanation || null,
      options: question?.options || null,
      difficulty: question?.difficulty || "medium",
      topic: question?.topic || null,
      submittedAt: answer.submittedAt
    };
  });

  const totalQuestions = submission.totalQuestions || submission.answers.length;
  const correctAnswers = submission.answers.filter((ans) => ans.isCorrect).length;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const topicStats = {};
  questionResults.forEach((result) => {
    if (result.topic) {
      if (!topicStats[result.topic]) {
        topicStats[result.topic] = { correct: 0, total: 0 };
      }
      topicStats[result.topic].total += 1;
      if (result.isCorrect) {
        topicStats[result.topic].correct += 1;
      }
    }
  });

  const difficultyStats = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 }
  };

  questionResults.forEach((result) => {
    const difficulty = result.difficulty;
    if (!difficultyStats[difficulty]) {
      difficultyStats[difficulty] = { correct: 0, total: 0 };
    }
    difficultyStats[difficulty].total += 1;
    if (result.isCorrect) {
      difficultyStats[difficulty].correct += 1;
    }
  });

  const response = {
    submissionId,
    contestId: submission.contestId?._id,
    contestStartTime: submission.contestId?.startTime,
    status: submission.status,
    userName: `${submission.userId?.firstName || ""} ${submission.userId?.lastName || ""}`.trim(),
    userEmail: submission.userId?.email,
    contestTitle: submission.contestId?.title,
    score: submission.score,
    totalPoints: submission.totalPoints || submission.score,
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    percentage,
    topicStats,
    difficultyStats,
    questionResults,
    submittedAt: submission.createdAt,
    evaluatedAt: submission.updatedAt
  };

  await redisClient.setEx(`submission:${submissionId}:results`, 3600, JSON.stringify(response));

  return response;
}

/**
 * 13. getContestLeaderboard(contestId)
 */
export async function getContestLeaderboard(contestId) {
  const contest = await contestRepo.findById(contestId);

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestId}`);
  }

  const scoreThreshold = contest.cutOff ?? 0;
  const submissions = await submissionRepo.findLeaderboardByContest(contestId, scoreThreshold);

  if (!submissions || submissions.length === 0) {
    return {
      success: true,
      submissions: [],
      message: "No submissions found for this contest"
    };
  }

  const sortedData = submissions.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  return {
    success: true,
    submissions: sortedData.slice(0, 25)
  };
}

/**
 * 14. getContestCertificate(contestSlug, userId)
 */
export async function getContestCertificate(contestSlug, userId) {
  const contest = await contestRepo.findBySlug(contestSlug);

  if (!contest) {
    throw new NotFoundError(`Contest not found: ${contestSlug}`);
  }

  const submission = await submissionRepo.findByContestAndUserDetailed(contest._id, userId);

  if (!submission) {
    throw new NotFoundError("No submission found");
  }

  return {
    contestSlug,
    contestTitle: submission.contestId?.title,
    participantName: `${submission.userId?.firstName || ""} ${submission.userId?.lastName || ""}`.trim(),
    score: submission.score,
    submission
  };
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
