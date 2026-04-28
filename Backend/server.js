import dotenv from "dotenv";

dotenv.config();

const [{ default: http }, { Server }, { default: mongoose }, { default: app }, { default: initSocket }, redisModule] = await Promise.all([
  import("http"),
  import("socket.io"),
  import("mongoose"),
  import("./app.js"),
  import("./socket/socket.init.js"),
  import("./config/redis.js")
]);

const { default: redisClient, pubClient, subClient } = redisModule;

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000
});

initSocket(io);

let evaluationWorker;
let messageWorker;
let quizStartWorker;
let quizReminderWorker;

async function connectInfrastructure() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");

  await Promise.all([
    redisClient.ping(),
    pubClient.ping(),
    subClient.ping()
  ]);

  console.log("Redis clients connected");
}

async function loadWorkers() {
  const [evaluationModule, messageModule, quizStartModule, quizReminderModule] = await Promise.all([
    import("./workers/evaluation.worker.js"),
    import("./workers/message.worker.js"),
    import("./workers/quiz-start.worker.js"),
    import("./workers/quiz-reminder.worker.js")
  ]);

  evaluationWorker = evaluationModule.default;
  messageWorker = messageModule.default;
  quizStartWorker = quizStartModule.default;
  quizReminderWorker = quizReminderModule.default;
}

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);

  try {
    await Promise.allSettled([
      evaluationWorker?.close?.(),
      messageWorker?.close?.(),
      quizStartWorker?.close?.(),
      quizReminderWorker?.close?.()
    ]);

    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await Promise.allSettled([
      redisClient.quit(),
      pubClient.quit(),
      subClient.quit()
    ]);

    console.log("Server shut down gracefully");
    process.exit(0);
  } catch (error) {
    console.error("Graceful shutdown failed", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function start() {
  try {
    await connectInfrastructure();
    await loadWorkers();

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (error) {
    console.error("Startup failed", error);
    process.exit(1);
  }
}

await start();