import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from './Models/DB.js';
import initSocket from "./socket.js";

const PORT = process.env.PORT || 5000;

const methodsToOverride = ['log', 'error', 'warn', 'table'];

methodsToOverride.forEach(methodName => {
  const originalMethod = console[methodName];
  console[methodName] = (...args) => {
    // Get IST parts
    const now = new Date();
    const options = { timeZone: "Asia/Kolkata", hour12: true };
    const formatter = new Intl.DateTimeFormat("en-GB", {
      ...options,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    // Example: "13/09/2025, 10:25:42 am"
    const parts = formatter.formatToParts(now);

    const day = parts.find(p => p.type === "day").value;
    const month = parts.find(p => p.type === "month").value;
    const year = parts.find(p => p.type === "year").value;
    let hour = parts.find(p => p.type === "hour").value;
    const minute = parts.find(p => p.type === "minute").value;
    const second = parts.find(p => p.type === "second").value;
    const dayPeriod = parts.find(p => p.type === "dayPeriod").value.toUpperCase();

    const timestamp = `[${day}-${month}-${year} ${hour}:${minute}:${second} ${dayPeriod} IST]`;

    originalMethod.apply(console, [timestamp, ...args]);
  };
});



connectDB();
// Create HTTP server from Express app
const server = http.createServer(app);

// Attach WebSocket server
const io = new Server(server, {
  path: "/ws/",
  cors: {
    origin: ["https://quiz.ysminfosolution.com/", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Init Socket.io events
initSocket(io);

// Start server
server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT} ...`);
});
