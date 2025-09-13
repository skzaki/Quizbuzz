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
    // Get IST time
    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata"
    });
    const dateObj = new Date(now);

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = String(hours % 12 || 12).padStart(2, '0'); // Convert to 12-hour format

    const timestamp = `[${day}-${month}-${year} ${formattedHours}:${minutes}:${seconds} ${ampm} IST]`;

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
