import { Queue } from "bullmq";

export const quizReminderQueue = new Queue("quiz-reminders", {
  connection: { url: process.env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000
    },
    removeOnComplete: true,
    removeOnFail: 100
  }
});