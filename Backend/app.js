import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

const app = express();
const isTestEnvironment = process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));

// The webhook route inside paymentRoutes uses express.raw() middleware, not express.json().
// Do NOT move the webhook route to a path covered by a global express.json() call.
// Global express.json() must be applied with a webhook skip guard, otherwise HMAC verification breaks.
const jsonParser = express.json({ limit: "10mb" });
app.use((req, res, next) => {
  if (req.path === "/health" || req.path.startsWith("/api/payments/webhook")) {
    return next();
  }

  return jsonParser(req, res, next);
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health" || req.path.startsWith("/api/auth") || req.path.startsWith("/api/payments/webhook")
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/send-otp"
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);
app.use(process.env.NODE_ENV === "production" ? morgan("combined") : morgan("dev"));

if (!isTestEnvironment) {
  const [
    { default: authRoutes },
    { default: contestRoutes },
    { default: paymentRoutes },
    { default: adminContestRoutes },
    { default: adminQuestionRoutes },
    { default: adminPaymentRoutes },
    { default: adminMessageRoutes },
    { authMiddleware },
    { adminMiddleware }
  ] = await Promise.all([
    import("./routes/auth.routes.js"),
    import("./routes/contest.routes.js"),
    import("./routes/payment.routes.js"),
    import("./routes/admin/contest.routes.js"),
    import("./routes/admin/question.routes.js"),
    import("./routes/admin/payment.routes.js"),
    import("./routes/admin/message.routes.js"),
    import("./middleware/auth.js"),
    import("./middleware/admin.js")
  ]);

  app.use("/api/auth/send-otp", otpLimiter);
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/contests", contestRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/admin/contests", authMiddleware, adminMiddleware, adminContestRoutes);
  app.use("/api/admin/questions", authMiddleware, adminMiddleware, adminQuestionRoutes);
  app.use("/api/admin/payments", authMiddleware, adminMiddleware, adminPaymentRoutes);
  app.use("/api/admin/messages", authMiddleware, adminMiddleware, adminMessageRoutes);
}

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use((err, req, res, _next) => {
  const status = err.statusCode || 500;
  const message = err.statusCode ? err.message : "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack || err);
  }

  res.status(status).json({ success: false, message });
});

export default app;