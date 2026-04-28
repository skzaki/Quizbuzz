import { Queue } from "bullmq";

export const quizStartQueue = new Queue("quiz-start", {
  connection: { url: process.env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: 100
  }
});