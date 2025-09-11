// middleware/auth.js

import jwt from "jsonwebtoken";
import { getSession, saveSession } from "../store/sessionService.js";

export const authMiddleware = async (req, res, next) => {
    try {
        
        const authHeader = req.header("Authorization");
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Access denied. No token provided or invalid format."
                }
            });
        }

        const token = authHeader.substring(7);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Access denied. Token is missing."
                }
            });
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
        req.token = token;
        
        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message); 
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Invalid token."
                }
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Token has expired."
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Authentication error."
            }
        });
    }
};