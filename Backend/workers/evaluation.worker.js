import { Worker } from "bullmq";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { getIO } from "../socket/socket.init.js";
import { pubClient, redisClient, subClient } from "../config/redis.js";
import * as submissionRepo from "../repositories/submission.repository.js";
import { certificateQueue } from "../queues/certificate.queue.js";
import { messageQueue } from "../queues/message.queue.js";

const sharedIO = getIO();
const io = sharedIO || new Server();

if (!sharedIO) {
  io.adapter(createAdapter(pubClient, subClient));
}

export const evaluationWorker = new Worker(
  "evaluation",
  async (job) => {
    const { submissionId, contestId, userId } = job.data;

    const raw = await redisClient.get(`contest:${contestId}:correct_answers`);
    if (!raw) {
      throw new Error("Correct answers not in Redis");
    }

    const correctAnswers = JSON.parse(raw);
    const submission = await submissionRepo.findById(submissionId);

    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    let score = 0;
    const evaluated = submission.answers.map((answer) => {
      const correct = correctAnswers[answer.questionId.toString()];
      const isCorrect = Number(answer.answerIndex) === Number(correct);

      if (isCorrect) {
        score += 1;
      }

      return {
        ...answer,
        isCorrect,
        correctOptionIndex: correct
      };
    });

    await submissionRepo.update(submissionId, {
      score,
      totalQuestions: evaluated.length,
      answers: evaluated,
      evaluatedAnswers: evaluated,
      status: "EVALUATED",
      evaluatedAt: new Date()
    });

    io?.to(`user-${userId}`).emit("result-ready", {
      score,
      total: evaluated.length,
      submissionId
    });

    await certificateQueue.add("generate", {
      userId,
      contestId,
      submissionId,
      score
    });

    await messageQueue.add("send-message", {
      userId,
      type: "RESULT_ANNOUNCEMENT",
      variables: { score, total: evaluated.length }
    });

    return { submissionId, score };
  },
  { connection: { url: process.env.REDIS_URL }, concurrency: 50 }
);

evaluationWorker.on("failed", (job, error) => {
  console.error(`❌ evaluation job ${job?.id} failed:`, error?.message);
});

export default evaluationWorker;import { Worker } from "bullmq";
import { createClient } from "ioredis";
import * as submissionRepo from "../repositories/submission.repository.js";
import { certificateQueue } from "../queues/certificate.queue.js";
import { messageQueue } from "../queues/message.queue.js";

let liveIo = null;

export const bindEvaluationWorkerSocket = (io) => {
  liveIo = io;
};

const redisConnection = new createClient({ url: process.env.REDIS_URL });

export const createEvaluationWorker = () => new Worker(
  "evaluation",
  async (job) => {
    const { submissionId, contestId, userId } = job.data;

    const raw = await redisConnection.get(`contest:${contestId}:correct_answers`);
    if (!raw) {
      throw new Error("Correct answers not in Redis");
    }

    const correctAnswers = JSON.parse(raw);
    const submission = await submissionRepo.findById(submissionId);

    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    let score = 0;
    const evaluated = submission.answers.map((answer) => {
      const correct = correctAnswers[answer.questionId.toString()];
      const isCorrect = Number(answer.answerIndex) === Number(correct);

      if (isCorrect) {
        score += 1;
      }

      return {
        ...answer,
        isCorrect,
        correctOptionIndex: correct
      };
    });

    await submissionRepo.update(submissionId, {
      score,
      evaluatedAnswers: evaluated,
      status: "EVALUATED",
      evaluatedAt: new Date()
    });

    if (liveIo) {
      liveIo.to(`user-${userId}`).emit("result-ready", {
        score,
        total: evaluated.length,
        submissionId
      });
    }

    await certificateQueue.add("generate", {
      userId,
      contestId,
      submissionId,
      score
    });

    await messageQueue.add("send-message", {
      userId,
      type: "RESULT_ANNOUNCEMENT",
      variables: { score, total: evaluated.length }
    });

    return { submissionId, score };
  },
  { connection: redisConnection, concurrency: 50 }
);