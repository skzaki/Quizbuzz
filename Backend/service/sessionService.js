// service/sessionService.js
import { createClient } from "redis";

const redis = createClient({ url: "redis://localhost:6379" });
redis.on("error", (err) => console.error("❌ Redis Client Error", err));
await redis.connect();

function getSessionKey(sessionId) {
  return `session:${sessionId}`;
}

export async function saveSession(sessionId, sessionData, ttlSeconds = 86400) {
  await redis.set(getSessionKey(sessionId), JSON.stringify(sessionData), {
    EX: ttlSeconds,
  });
}

export async function getSession(sessionId) {
  const data = await redis.get(getSessionKey(sessionId));
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId) {
  await redis.del(getSessionKey(sessionId));
}
