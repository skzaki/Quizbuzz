// service/contestStateService.js
import redisClient from "../redis.js";



function getKey(contestId, userId) {
    return `contest:${contestId}:user:${userId}`;
}

export async function saveUserState(contestId, userId, stateData) {
    const key = getKey(contestId, userId);

    const existing = await getUserState(contestId, userId) || {};
    const updated = { ...existing, ...stateData, updatedAt: Date.now() };

    await redisClient.set(key, JSON.stringify(updated), {
        EX: 60 * 60 * 3 // expires in 3 hours
    });

    console.log(`💾 Saved state for ${userId} in ${contestId}`);
}

export async function getUserState(contestId, userId) {
    const key = getKey(contestId, userId);
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
}

export async function markUserDisconnected(contestId, userId) {
    await saveUserState(contestId, userId, { disconnected: true });
}

export async function markUserReconnected(contestId, userId) {
    await saveUserState(contestId, userId, { disconnected: false });
}

export async function deleteUserState(contestId, userId) {
    await redisClient.del(getKey(contestId, userId));
}


// Helper function to get correct answers (call this when contest is created)
export const storeCorrectAnswers = async (contestSlug, questions) => {
  const correctAnswers = questions.map(q => ({
    questionId: q._id.toString(),
    correctAnswer: q.correctOptionText,   // text
    correctAnswerIndex: q.correctOptionIndex // index
  }));

  const correctAnswersKey = `contest:${contestSlug}:correct_answers`;

  await redisClient.setEx(
    correctAnswersKey,
    24 * 60 * 60, // 24 hours
    JSON.stringify(correctAnswers)
  );

  console.log(`💾 Stored correct answers for contest: ${contestSlug}`);
};
