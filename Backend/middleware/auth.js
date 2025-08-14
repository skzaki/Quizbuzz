// middleware/auth.js

import jwt from "jsonwebtoken";
import { getSession } from "../service/sessionService.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "Access denied" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const session = await getSession(decoded.sessionId);

        if (!session || !session.isActive || session.userId !== decoded.userId) {
            return res.status(401).json({ message: "Session expired or invalid" });
        }

        // Optional: Match IP/device
        if (req.ip !== session.ipAddress || req.headers["user-agent"] !== session.userAgent) {
            return res.status(401).json({ message: "Device/IP mismatch" });
        }

        // Update last activity in Redis
        session.lastActivity = new Date().toISOString();
        await saveSession(decoded.sessionId, session);

        req.user = decoded;
        req.sessionId = decoded.sessionId;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        res.status(401).json({ message: "Invalid token" });
    }
};
