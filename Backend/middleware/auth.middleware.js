import jwt from "jsonwebtoken";
import redisClient from "../config/redis.js";
import { findActiveSessionBySessionId } from "../repositories/session.repository.js";
import { UnauthorizedError } from "../utils/errors.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24;

function getSessionKey(sessionId) {
  return `session:${sessionId}`;
}

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access denied. No token provided.");
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new UnauthorizedError("Invalid or expired token.");
    }

    const { userId, sessionId } = decoded;

    if (!userId || !sessionId) {
      throw new UnauthorizedError("Invalid token payload.");
    }

    const cached = await redisClient.get(getSessionKey(sessionId));
    let session = cached ? JSON.parse(cached) : null;

    if (!session) {
      const dbSession = await findActiveSessionBySessionId(sessionId);

      if (!dbSession) {
        throw new UnauthorizedError("Session not found or expired.");
      }

      session = {
        userId: String(dbSession.userId),
        isActive: dbSession.isActive,
        lastActivity: new Date().toISOString(),
      };

      await redisClient.set(getSessionKey(sessionId), JSON.stringify(session), {
        EX: SESSION_TTL_SECONDS,
      });
    }

    if (!session.isActive || String(session.userId) !== String(userId)) {
      throw new UnauthorizedError("Session not found or expired.");
    }

    session.lastActivity = new Date().toISOString();
    await redisClient.set(getSessionKey(sessionId), JSON.stringify(session), {
      EX: SESSION_TTL_SECONDS,
    });

    req.user = { userId: String(userId), sessionId };
    req.sessionId = sessionId;
    req.token = token;

    next();
  } catch (error) {
    next(error);
  }
};
