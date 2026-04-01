import compression from 'compression';
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './utils/logger.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import redisClient from './redis.js';
import adminContestRoutes from "./routes/admin/contestRoutes.js";
import paymentRoutes from './routes/admin/paymentRoutes.js';
import authRoutes from "./routes/authRoutes.js";
import contestRoutes from "./routes/contestRoutes.js";
import questionRoutes from "./routes/admin/questionRoutes.js";
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

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
app.use(express.json({ 
    limit: '10mb',
    type: ['application/json', 'text/plain'],
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
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
app.use("/api/admin/contests", adminContestRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/admin/questions", questionRoutes);
app.use("/api/payments", paymentRoutes);

// F-08: Protected logs endpoint with authMiddleware
app.post("/api/logs", authMiddleware, (req, res) => {
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
    // Log the error using Winston
    logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, { stack: err.stack });

    const status = err.status || 500;
    const message = err.message || 'An unexpected error occurred';

    res.status(status).json({
        success: false,
        error: {
            code: err.code || "INTERNAL_SERVER_ERROR",
            message: process.env.NODE_ENV === 'production' ? message : err.stack,
            details: err.details || null,
            timestamp: new Date().toISOString()
        }
    });
});


export default app;
