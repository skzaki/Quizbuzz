// service/contestStateService.js
import { createClient } from "redis";

const redis = createClient({ url: "redis://localhost:6379" });

redis.on("error", (err) => console.error("❌ Redis Client Error", err));
await redis.connect();

function getKey(contestId, userId) {
    return `contest:${contestId}:user:${userId}`;
}

export async function saveUserState(contestId, userId, stateData) {
    const key = getKey(contestId, userId);

    const existing = await getUserState(contestId, userId) || {};
    const updated = { ...existing, ...stateData, updatedAt: Date.now() };

    await redis.set(key, JSON.stringify(updated), {
        EX: 60 * 60 * 3 // expires in 3 hours
    });

    console.log(`💾 Saved state for ${userId} in ${contestId}`);
}

export async function getUserState(contestId, userId) {
    const key = getKey(contestId, userId);
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
}

export async function markUserDisconnected(contestId, userId) {
    await saveUserState(contestId, userId, { disconnected: true });
}

export async function markUserReconnected(contestId, userId) {
    await saveUserState(contestId, userId, { disconnected: false });
}

export async function deleteUserState(contestId, userId) {
    await redis.del(getKey(contestId, userId));
}
