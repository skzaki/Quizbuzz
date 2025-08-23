// middleware/auth.js

import jwt from "jsonwebtoken";
import { getSession, saveSession } from "../store/sessionService.js";

export const authMiddleware = async (req, res, next) => {
    try {
        // Fix: Properly extract token from Authorization header
        const authHeader = req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Access denied" });
        }
        
        const token = authHeader.slice(7); // Remove "Bearer " (7 characters)
        
        if (!token) {
            return res.status(401).json({ message: "Access denied" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const session = await getSession(decoded.sessionId);

        if (!session || !session.isActive || session.userId !== decoded.userId) {
            return res.status(401).json({ message: "Session expired or invalid" });
        }

        // Optional: Match IP/device (you might want to make this less strict)
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
        console.error("Auth middleware error:", error.message); // Add logging for debugging
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        res.status(401).json({ message: "Invalid token" });
    }
};