import { Queue } from "bullmq";

export const certificateQueue = new Queue("certificate", {
  connection: { url: process.env.REDIS_URL },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100
  }
});