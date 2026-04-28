import compression from 'compression';
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { adminMiddleware } from './middleware/admin.js';
import { authMiddleware as roleAuthMiddleware } from './middleware/auth.js';
import redisClient from './redis.js';
import adminContestRoutes from "./routes/admin/contest.routes.js";
import adminQuestionRoutes from "./routes/admin/question.routes.js";
import messageRoutes from "./routes/admin/message.routes.js";
import adminPaymentRoutes from './routes/admin/payment.routes.js';
import authRoutes from "./routes/auth.routes.js";
import contestRoutes from "./routes/contest.routes.js";
import domainRoutes from './routes/admin/domainRoutes.js';
import settingsRoutes from "./routes/admin/settingsRoutes.js";
import paymentRoutes from './routes/payment.routes.js';

dotenv.config();

await import('./config/razorpay.js');

const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
// CORS configuration
const coresOptions = {
    origin: ["https://quiz.ysminfosolution.com", "http://localhost:3000", "http://localhost:5178"]
}
app.use(cors(coresOptions));


// Request parsing middleware
// The webhook route inside paymentRoutes uses express.raw() middleware, not express.json().
// Do NOT move the webhook route to a path covered by a global express.json() call.
// Global express.json() must be applied AFTER payment routes are mounted, or scope it
// to exclude /api/payments/webhook.
const jsonParser = express.json({ 
    limit: '10mb',
    type: ['application/json', 'text/plain'],
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
});

app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/payments/webhook')) {
        return next();
    }

    return jsonParser(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}


// Global rate limiting (more lenient than specific endpoints)
const globalRateLimit = rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalRateLimit);


// Health check endpoint (before other middleware)
app.get('/health', async (req, res) => {
    try {
        // Check Redis connection
        const redisStatus = await redisClient.ping();
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                redis: redisStatus === 'PONG' ? 'connected' : 'disconnected',
                // Add other service checks as needed
            },
            version: process.env.API_VERSION || '1.0.0'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Service unavailable'
        });
    }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/contests", roleAuthMiddleware, adminMiddleware, adminContestRoutes);
app.use("/api/contests", contestRoutes);
app.use('/api/admin/domains', domainRoutes);
app.use("/api/admin/questions", roleAuthMiddleware, adminMiddleware, adminQuestionRoutes);
app.use("/api/admin/messages", adminMiddleware, messageRoutes);
app.use("/api/admin/settings", settingsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/payments", roleAuthMiddleware, adminMiddleware, adminPaymentRoutes);

// F-08: Protected logs endpoint with authMiddleware
app.post("/api/logs", roleAuthMiddleware, (req, res) => {
  const { level, message } = req.body;
  if (["log", "warn", "error"].includes(level)) {
    console[level](`CLIENT ${level.toUpperCase()}:`, message);
  } else {
    console.log("CLIENT LOG:", message);
  }
  res.sendStatus(200);
});

// F-35: 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: "NOT_FOUND",
            message: `Route ${req.originalUrl} not found`
        }
    });
});

// F-35: Global Error Handler
app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message });
});


export default app;
