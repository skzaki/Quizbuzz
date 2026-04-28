import dotenv from "dotenv";

dotenv.config();

const [{ default: express }, { default: cors }, { default: helmet }, { default: morgan }, rateLimitModule] = await Promise.all([
  import("express"),
  import("cors"),
  import("helmet"),
  import("morgan"),
  import("express-rate-limit")
]);

const rateLimit = rateLimitModule.default;

const [{ default: authRoutes }, { default: contestRoutes }, { default: paymentRoutes }, { default: adminContestRoutes }, { default: adminQuestionRoutes }, { default: adminPaymentRoutes }, { default: adminMessageRoutes }, { authMiddleware }, { adminMiddleware }, { default: redisClient }] = await Promise.all([
  import("./routes/auth.routes.js"),
  import("./routes/contest.routes.js"),
  import("./routes/payment.routes.js"),
  import("./routes/admin/contest.routes.js"),
  import("./routes/admin/question.routes.js"),
  import("./routes/admin/payment.routes.js"),
  import("./routes/admin/message.routes.js"),
  import("./middleware/auth.js"),
  import("./middleware/admin.js"),
  import("./config/redis.js")
]);

await import("./config/razorpay.js");

const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");

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

app.use("/api/auth/send-otp", otpLimiter);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/contests", authMiddleware, adminMiddleware, adminContestRoutes);
app.use("/api/admin/questions", authMiddleware, adminMiddleware, adminQuestionRoutes);
app.use("/api/admin/payments", authMiddleware, adminMiddleware, adminPaymentRoutes);
app.use("/api/admin/messages", authMiddleware, adminMiddleware, adminMessageRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
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

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.statusCode ? err.message : "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack || err);
  }

  res.status(status).json({ success: false, message });
});

export default app;