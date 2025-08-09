import dotenv from "dotenv";
import express from "express";

import adminContestRoutes from "./routes/admin/contestRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import contestRoutes from "./routes/contestRoutes.js";
dotenv.config();

const app = express();

// Middleware
// app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/contests", adminContestRoutes);
app.use("/api/contests", contestRoutes);

export default app;
