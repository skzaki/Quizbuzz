// service/sessionService.js

import redisClient from "../redis.js";


function getSessionKey(sessionId) {
  return `session:${sessionId}`;
}

export async function saveSession(sessionId, sessionData, ttlSeconds = 86400) {
  await redisClient.set(getSessionKey(sessionId), JSON.stringify(sessionData), {
    EX: ttlSeconds,
  });
}

export async function getSession(sessionId) {
  const data = await redisClient.get(getSessionKey(sessionId));
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId) {
  await redisClient.del(getSessionKey(sessionId));
}
