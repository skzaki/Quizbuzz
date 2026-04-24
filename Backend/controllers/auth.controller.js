import {
  destroySession,
  loginAdmin,
  register as registerUser,
  sendOtp as sendOtpCode,
  validateAndCreateSession,
  verifyOtp as verifyOtpCode,
} from "../service/auth.service.js";
import { UnauthorizedError } from "../utils/errors.js";
import { extractDeviceInfo } from "../utils/sessionHelper.js";

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function buildRequestMeta(req) {
  const { device, userAgent } = extractDeviceInfo(req);

  return {
    device,
    userAgent,
    ipAddress: req.ip,
  };
}

function toUserInfo(user) {
  return {
    registrationId: user.registrationId,
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.isAdmin ? "admin" : "user",
  };
}

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);

  res.status(201).json({
    success: true,
    message: "Registration successful",
    userInfo: toUserInfo(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  const { token, sessionId, user } = await loginAdmin(email, phone, buildRequestMeta(req));

  res.json({
    success: true,
    message: "Login successful",
    token,
    sessionId,
    userInfo: toUserInfo(user),
  });
});

export const validateCredentials = asyncHandler(async (req, res) => {
  const { registrationId, phone, slug } = req.body;

  const { token, sessionId, user } = await validateAndCreateSession(
    registrationId,
    phone,
    slug,
    buildRequestMeta(req)
  );

  res.json({
    success: true,
    message: "Credentials validated",
    token,
    sessionId,
    userInfo: toUserInfo(user),
  });
});

export const logout = asyncHandler(async (req, res) => {
  if (!req.user?.sessionId) {
    throw new UnauthorizedError("Authentication required");
  }

  await destroySession(req.user.sessionId);

  res.json({
    success: true,
    message: "Logout successful",
  });
});

export const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await sendOtpCode(phone);

  res.json({
    success: true,
    ...result,
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await verifyOtpCode(phone, otp);

  res.json({
    success: true,
    ...result,
  });
});
