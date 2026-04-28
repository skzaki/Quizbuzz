import { Worker } from "bullmq";
import { sendQuizReminder } from "../services/message.service.js";

const redisConnection = { url: process.env.REDIS_URL };

export const quizReminderWorker = new Worker(
  "quiz-reminders",
  async (job) => {
    const { contestId } = job.data;
    await sendQuizReminder(contestId);
  },
  {
    connection: redisConnection
  }
);

export default quizReminderWorker;