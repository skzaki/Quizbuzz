import { Queue } from "bullmq";

export const messageQueue = new Queue("message", {
  connection: { url: process.env.REDIS_URL },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100
  }
});