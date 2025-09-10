import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB } from './Models/DB.js';
import initSocket from "./socket.js";

const PORT = process.env.PORT || 5000;

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
