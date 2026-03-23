import jwt from "jsonwebtoken";
import { Session } from "../Models/DB.js";
import { getSession, saveSession } from "../store/sessionService.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: { code: "UNAUTHORIZED", message: "Access denied. No token provided." }
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Try Redis first
        let session = await getSession(decoded.sessionId).catch(() => null);

        // Fallback to MongoDB if Redis session missing
        if (!session) {
            const dbSession = await Session.findOne({ 
                sessionId: decoded.sessionId, 
                isActive: true 
            });
            
            if (!dbSession) {
                return res.status(401).json({ message: "Session expired or invalid" });
            }

            // Restore session to Redis
            session = {
                userId: dbSession.userId.toString(),
                ipAddress: dbSession.ipAddress,
                userAgent: dbSession.userAgent,
                isActive: true,
                lastActivity: new Date().toISOString(),
            };
            await saveSession(decoded.sessionId, session, 60 * 60 * 24).catch(() => {});
        }

        if (!session.isActive || session.userId !== decoded.userId.toString()) {
            return res.status(401).json({ message: "Session expired or invalid" });
        }

        // Update last activity
        session.lastActivity = new Date().toISOString();
        await saveSession(decoded.sessionId, session).catch(() => {});

        req.user = decoded;
        req.sessionId = decoded.sessionId;
        req.token = token;
        console.log(`userId:${req.user.userId}`);
        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token." } });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Token has expired." } });
        }
        return res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Authentication error." } });
    }
};
