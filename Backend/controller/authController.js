import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Contest, Session, Submission, User } from '../Models/DB.js';
import sendOtpSms from '../service/otpSms.js';
import sendOtpWhatsApp from '../service/otpWhatsapp.js';
import { saveOtp, verifyAndDeleteOtp } from '../store/otpStore.js';
import { saveSession } from "../store/sessionService.js";
import { extractDeviceInfo } from '../utils/sessionHelper.js';
import { generateOtp } from './../service/generateOtp.js';

// F-44: Added refreshToken function
export const refreshToken = async (req, res) => {
  try {
    const { userId, sessionId, role, email, userName } = req.user;
    
    // Check if session is still active in DB
    const session = await Session.findOne({ sessionId, isActive: true });
    if (!session) {
      return res.status(401).json({ message: "Session expired or inactive" });
    }

    // Generate new token
    const newToken = jwt.sign(
      { userId, sessionId, role, email, userName },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('RefreshToken error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// F-02: Added isDeleted: false to prevent deleted users from logging in
export const login = async (req, res) => {
  try {
    const { email, phone } = req.body;

    const { device, userAgent } = extractDeviceInfo(req);
    const ipAddress = req.ip;

    const cleanEmail = email.trim();
    const cleanPhone = phone.toString().trim();

    // F-02: Check isDeleted to prevent soft-deleted users from logging in
    const user = await User.findOne({ email: cleanEmail, isDeleted: false });

    if (!user || user.phone.toString().trim() !== cleanPhone) {
      return res.status(401).json({ message: "No User Found." });
    }

    await Session.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false, endedAt: new Date() } }
    );

    const sessionId = crypto.randomUUID();

    const newSession = new Session({
      userId: user._id,
      sessionId,
      device,
      ipAddress,
      userAgent,
      isActive: true,
      lastActivity: new Date(),
    });
    await newSession.save();

    await saveSession(sessionId, {
      userId: user._id.toString(),
      ipAddress,
      userAgent,
      isActive: true,
      lastActivity: new Date().toISOString(),
    }, 60 * 60 * 24);

    const token = jwt.sign(
      { userId: user._id, sessionId, role: user.isAdmin ? "admin" : "user", email: user.email, userName: `${user.firstName} ${user.lastName}` },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      userInfo: {
        registrationId: user.registrationId,
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.isAdmin ? "admin" : "user",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// F-01: Restored real OTP send (was returning hardcoded dev-mode success)
export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  const userName = req.user.userName;
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, "IN");
    if (!phoneNumber?.isValid())
      return res.status(400).json({ message: "Enter a valid phone number (without '+91')" });
    const OTP = generateOtp();
    const saved = await saveOtp(phoneNumber.number, OTP);
    if (!saved) return res.status(500).json({ message: "Could not save OTP, please try again" });
    await sendOtpWhatsApp(phoneNumber.number, userName, OTP);
    await sendOtpSms(phoneNumber.number, OTP);
    return res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(`sendOtp error: ${error.message}`);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// F-01: Restored real OTP resend (was returning hardcoded success)
export const resendOtp = async (req, res) => {
  return sendOtp(req, res);
};

// F-01: Restored real OTP verify (was returning hardcoded dev-mode success)
export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  const slug = req.body.slug;
  try {
    const phoneNumber = parsePhoneNumberFromString(phone, "IN");
    if (!phoneNumber?.isValid())
      return res.status(400).json({ message: "Enter a valid phone number" });
    if (!/^\d{4}$/.test(otp))
      return res.status(400).json({ message: "Invalid OTP format" });
    const result = await verifyAndDeleteOtp(phoneNumber.number, otp);
    if (!result.success)
      return res.status(401).json({ message: result.message });

    // Check if a slug was supplied to look up the contest
    if (slug) {
      const contest = await Contest.findOne({ slug, isDeleted: false });
      if (!contest)
        return res.status(404).json({ message: "Contest not found" });

      const userId = req.user.userId;
      const existingSubmission = await Submission.findOne({ userId, contestId: contest._id });
      if (existingSubmission)
        return res.json({ submissionId: existingSubmission._id, message: result.message });

      const now = new Date();
      const contestEndTime = new Date(contest.startTime.getTime() + parseInt(contest.duration) * 60000);
      if (now > contestEndTime)
        return res.status(400).json({ message: "Contest has ended. You can no longer join." });
    }

    return res.json({ message: result.message, success: true });
  } catch (error) {
    console.error(`verifyOtp error: ${error.message}`);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
