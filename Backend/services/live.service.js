import redisClient from "../config/redis.js";
import { quizStartQueue } from "../queues/quiz-start.queue.js";
import * as contestRepo from "../repositories/contest.repository.js";
import * as questionService from "./question.service.js";

const LIVE_STATE_TTL_SECONDS = 60 * 60 * 3;
const SCHEDULED_KEY_PREFIX = "quiz-start-scheduled";
const USER_STATE_KEY_PREFIX = "contest";
const CONNECTED_COUNT_PREFIX = "contest";

let liveIo = null;

export const bindLiveSocket = (io) => {
  liveIo = io;
};

export const getConnectedCount = async (contestId) => {
  const raw = await redisClient.get(`${CONNECTED_COUNT_PREFIX}:${contestId}:connected_count`);
  return Number(raw || 0);
};

export const incrementConnectedCount = async (contestId) => {
  const nextCount = await redisClient.incr(`${CONNECTED_COUNT_PREFIX}:${contestId}:connected_count`);
  await redisClient.expire(`${CONNECTED_COUNT_PREFIX}:${contestId}:connected_count`, LIVE_STATE_TTL_SECONDS);
  return nextCount;
};

export const decrementConnectedCount = async (contestId) => {
  const nextCount = await redisClient.decr(`${CONNECTED_COUNT_PREFIX}:${contestId}:connected_count`);
  if (nextCount < 0) {
    await redisClient.set(`${CONNECTED_COUNT_PREFIX}:${contestId}:connected_count`, "0", "EX", LIVE_STATE_TTL_SECONDS);
    return 0;
  }

  return nextCount;
};

const getScheduledKey = (contestId) => `${SCHEDULED_KEY_PREFIX}:${contestId}`;
const getUserStateKey = (contestId, userId) => `${USER_STATE_KEY_PREFIX}:${contestId}:user:${userId}`;

const readState = async (contestId, userId) => {
  const raw = await redisClient.get(getUserStateKey(contestId, userId));
  return raw ? JSON.parse(raw) : null;
};

const writeState = async (contestId, userId, state) => {
  await redisClient.set(getUserStateKey(contestId, userId), JSON.stringify(state), "EX", LIVE_STATE_TTL_SECONDS);
};

export async function scheduleQuizStart(io, contestId, startTime) {
  const scheduledKey = getScheduledKey(contestId);
  const alreadyScheduled = await redisClient.get(scheduledKey);

  if (alreadyScheduled) {
    return { alreadyScheduled: true };
  }

  await redisClient.set(scheduledKey, "1", "EX", 86400);
  await questionService.storeCorrectAnswersInRedis(contestId);

  const delay = Math.max(new Date(startTime).getTime() - Date.now(), 0);

  await quizStartQueue.add(
    "start-quiz",
    { contestId, startTime },
    {
      delay,
      jobId: `quiz-start:${contestId}`,
      removeOnComplete: true,
      removeOnFail: true
    }
  );

  return { alreadyScheduled: false };
}

export async function getUserState(contestId, userId) {
  return readState(contestId, userId);
}

export async function saveProgress(contestId, userId, currentQuestion, answers = []) {
  const existing = (await readState(contestId, userId)) || {};
  const answerMap = new Map((existing.answers || []).map((answer) => [answer.questionId, answer]));

  for (const answer of answers) {
    if (answer?.answer !== null && answer?.answer !== undefined && String(answer.answer).trim() !== "") {
      answerMap.set(answer.questionId, answer);
    } else if (!answerMap.has(answer.questionId)) {
      answerMap.set(answer.questionId, answer);
    }
  }

  const updated = {
    ...existing,
    currentQuestion,
    answers: Array.from(answerMap.values()),
    updatedAt: Date.now()
  };

  await writeState(contestId, userId, updated);
  return updated;
}

export async function markDisconnected(contestId, userId) {
  const existing = (await readState(contestId, userId)) || {};
  const updated = {
    ...existing,
    isConnected: false,
    updatedAt: Date.now()
  };

  await writeState(contestId, userId, updated);
  await decrementConnectedCount(contestId);
  return updated;
}

export async function markReconnected(contestId, userId) {
  const existing = (await readState(contestId, userId)) || {};
  const updated = {
    ...existing,
    isConnected: true,
    reconnectCount: (existing.reconnectCount || 0) + 1,
    updatedAt: Date.now()
  };

  await writeState(contestId, userId, updated);
  return updated;
}

export async function updateHeartbeat(contestId, userId, questionIndex) {
  const existing = (await readState(contestId, userId)) || {};
  const now = Date.now();
  const lastHeartbeat = existing.lastHeartbeat || now;
  const updated = {
    ...existing,
    lastHeartbeat: now,
    currentQuestion: questionIndex,
    updatedAt: now
  };

  await writeState(contestId, userId, updated);

  if (liveIo && now - lastHeartbeat > 60000) {
    liveIo.to(`admin-${contestId}`).emit("heartbeat-warning", {
      contestId,
      userId,
      gapMs: now - lastHeartbeat
    });
  }

  return updated;
}

export async function endContest(contestId) {
  if (liveIo) {
    liveIo.to(`quiz-${contestId}`).emit("quiz-ended", { contestId });
  }

  await contestRepo.updateStatus(contestId, "COMPLETED");
  await redisClient.del(getScheduledKey(contestId));
}

export async function getParticipantCount(contestId) {
  if (!liveIo) {
    return 0;
  }

  const sockets = await liveIo.in(`waiting-${contestId}`).fetchSockets();
  return sockets.length;
}

export const liveStateKeys = {
  getScheduledKey,
  getUserStateKey
};