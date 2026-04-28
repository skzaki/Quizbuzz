import evaluationWorker from "./evaluation.worker.js";
import messageWorker from "./message.worker.js";
import quizStartWorker from "./quiz-start.worker.js";
import quizReminderWorker from "./quiz-reminder.worker.js";
import { redisClient, pubClient, subClient } from "../config/redis.js";

const workers = [evaluationWorker, messageWorker, quizStartWorker, quizReminderWorker].filter(Boolean);

async function shutdown() {
  await Promise.allSettled(workers.map((worker) => worker.close()));
  await Promise.allSettled([
    redisClient.quit(),
    pubClient.quit(),
    subClient.quit()
  ]);
  console.log("Workers shut down gracefully");
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown();
});

process.on("SIGINT", () => {
  void shutdown();
});

console.log("Workers started");