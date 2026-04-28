import { Worker } from "bullmq";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { getIO } from "../socket/socket.init.js";
import { pubClient, subClient } from "../config/redis.js";
import * as contestRepo from "../repositories/contest.repository.js";

const sharedIO = getIO();
const io = sharedIO || new Server();

if (!sharedIO) {
  io.adapter(createAdapter(pubClient, subClient));
}

export const quizStartWorker = new Worker(
  "quiz-start",
  async (job) => {
    const { contestId } = job.data;

    io?.to(`waiting-${contestId}`).emit("quiz-started", {
      contestId,
      startedAt: new Date().toISOString()
    });

    if (io) {
      const waitingSockets = await io.in(`waiting-${contestId}`).fetchSockets();
      for (const socket of waitingSockets) {
        await socket.leave(`waiting-${contestId}`);
        await socket.join(`quiz-${contestId}`);
      }
    }

    await contestRepo.updateStatus(contestId, "LIVE");
    return { contestId };
  },
  { connection: { url: process.env.REDIS_URL } }
);

quizStartWorker.on("failed", (job, error) => {
  console.error(`❌ quiz-start job ${job?.id} failed:`, error?.message);
});

export default quizStartWorker;