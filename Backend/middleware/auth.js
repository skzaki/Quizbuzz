// middleware/auth.js
import jwt from "jsonwebtoken";
import { Session } from '../Models/DB.js';

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Access denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if session is still active
        const activeSession = await Session.findOne({
            sessionId: decoded.sessionId,
            userId: decoded.userId,
            isActive: true
        });

        if (!activeSession) {
            return res.status(401).json({ message: 'Session expired or invalid' });
        }

        // Update last activity
        await Session.findByIdAndUpdate(activeSession._id, {
            lastActivity: new Date()
        });

        req.user = decoded;
        req.sessionId = decoded.sessionId;
        
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};