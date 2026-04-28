import jwt from "jsonwebtoken";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, redisClient, subClient } from "../config/redis.js";
import * as liveService from "../services/live.service.js";
import { registerQuizHandlers } from "./handlers/quiz.handler.js";
import { registerProctoringHandlers } from "./handlers/proctoring.handler.js";

let _io;

export const getIO = () => _io;

export default function initSocket(io) {
  _io = io;
  liveService.bindLiveSocket(io);
  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("No token"));
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const session = await redisClient.get(`session:${payload.sessionId}`);

      if (!session) {
        return next(new Error("Session expired"));
      }

      socket.userId = payload.userId;
      socket.sessionId = payload.sessionId;
      socket.authPayload = payload;
      return next();
    } catch (error) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user-${socket.userId}`);
    registerQuizHandlers(io, socket);
    registerProctoringHandlers(io, socket);
  });
}