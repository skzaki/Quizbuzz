import { randomBytes, randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import redisClient from "../config/redis.js";
import * as messageService from "../services/message.service.js";
import {
  createUser,
  findActiveUserByEmail,
  findUserByFilter,
} from "../repositories/user.repository.js";
import {
  createSession,
  deactivateActiveSessionsByUserId,
  findSessionBySessionId,
  updateSessionBySessionId,
} from "../repositories/session.repository.js";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24;
const OTP_TTL_SECONDS = 60 * 10;

const SESSION_KEY_PREFIX = "session";
const OTP_KEY_PREFIX = "otp";

function getSessionKey(sessionId) {
  return `${SESSION_KEY_PREFIX}:${sessionId}`;
}

function getOtpKey(phone) {
  return `${OTP_KEY_PREFIX}:${phone}`;
}

function normalizePhone(phone) {
  return String(phone ?? "").trim();
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function generateNumericOtp(length = 4) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function nanoid(size = 10) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = randomBytes(size);
  let id = "";

  for (let i = 0; i < size; i += 1) {
    id += alphabet[bytes[i] % alphabet.length];
  }

  return id;
}

function buildJwtPayload(user, sessionId, slug) {
  const firstName = user.firstName ?? "";
  const lastName = user.lastName ?? "";

  return {
    userId: user._id,
    sessionId,
    role: user.isAdmin ? "admin" : "user",
    email: user.email,
    userName: `${firstName} ${lastName}`.trim(),
    ...(slug ? { slug } : {}),
  };
}

async function createAuthenticatedSession(user, slug, meta = {}) {
  const now = new Date();
  await deactivateActiveSessionsByUserId(user._id, now);

  const sessionId = randomUUID();
  const session = await createSession({
    userId: user._id,
    sessionId,
    device: meta.device,
    ipAddress: meta.ipAddress || meta.ip,
    userAgent: meta.userAgent,
    isActive: true,
    lastActivity: now,
  });

  const cachedSession = {
    userId: String(user._id),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    isActive: true,
    lastActivity: now.toISOString(),
  };

  await redisClient.set(getSessionKey(sessionId), JSON.stringify(cachedSession), {
    EX: SESSION_TTL_SECONDS,
  });

  const token = jwt.sign(
    buildJwtPayload(user, sessionId, slug),
    process.env.JWT_SECRET,
    { expiresIn: "4h" }
  );

  return {
    token,
    sessionId,
    user,
  };
}

export async function register(payload) {
  const email = normalizeEmail(payload?.email);

  const existingUser = await findActiveUserByEmail(email);
  if (existingUser) {
    throw new ConflictError("Email already exists");
  }

  const prefix = process.env.REGISTRATION_ID_PREFIX || "QB";
  const registrationId = `${prefix}${nanoid(8)}`;

  const createdUser = await createUser({
    ...payload,
    email,
    registrationId,
  });

  return createdUser;
}

export async function loginAdmin(email, phone, meta = {}) {
  const normalizedEmail = normalizeEmail(email);
  const user = await findActiveUserByEmail(normalizedEmail);

  if (!user || !user.isAdmin) {
    throw new UnauthorizedError("Invalid admin credentials");
  }

  const normalizedInputPhone = normalizePhone(phone);
  const normalizedUserPhone = normalizePhone(user.phone);

  if (!normalizedUserPhone || normalizedUserPhone !== normalizedInputPhone) {
    throw new UnauthorizedError("Invalid admin credentials");
  }

  return createAuthenticatedSession(user, null, meta);
}

export async function validateAndCreateSession(registrationId, phone, slug, meta = {}) {
  const user = await findUserByFilter({ registrationId, isDeleted: false });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const normalizedInputPhone = normalizePhone(phone);
  const normalizedUserPhone = normalizePhone(user.phone);

  if (!normalizedUserPhone || normalizedUserPhone !== normalizedInputPhone) {
    throw new UnauthorizedError("Phone number does not match");
  }

  return createAuthenticatedSession(user, slug, meta);
}

export async function destroySession(sessionId) {
  const session = await findSessionBySessionId(sessionId);
  if (!session) {
    throw new NotFoundError("Session not found");
  }

  await updateSessionBySessionId(sessionId, {
    $set: {
      isActive: false,
      endedAt: new Date(),
      lastActivity: new Date(),
    },
  });

  await redisClient.del(getSessionKey(sessionId));

  return { success: true };
}

export async function sendOtp(phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new UnauthorizedError("Phone number is required");
  }

  const otp = generateNumericOtp(4);

  await messageService.sendOtp(normalizedPhone, otp);

  return {
    success: true,
    expiresIn: OTP_TTL_SECONDS,
  };
}

export async function verifyOtp(phone, otp) {
  await messageService.verifyOtp(phone, otp);

  return {
    success: true,
    message: "OTP verified successfully",
  };
}
