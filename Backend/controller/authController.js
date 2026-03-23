import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Contest, Session, Submission, User } from '../Models/DB.js';
import sendOtpSms from '../service/optSms.js';
import sendOtpWhatsApp from '../service/otpWhatsapp.js';
import { saveOtp, verifyAndDeleteOtp } from '../store/otpStore.js';
import { saveSession } from "../store/sessionService.js";
import { extractDeviceInfo } from '../utils/sessionHelper.js';
import { generateOtp } from './../service/generateOtp.js';

export const login = async (req, res) => {
  try {
    const { email, phone } = req.body;

    const { device, userAgent } = extractDeviceInfo(req);
    const ipAddress = req.ip;

    const cleanEmail = email.trim();
    const cleanPhone = phone.toString().trim();

    const user = await User.findOne({ email: cleanEmail });

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
        _id: user._id
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const sendOtp = async (req, res) => {
  return res.json({ message: "OTP skipped (dev mode)", success: true });
};

export const resendOtp = async (req, res) => {
  return res.json({ message: "OTP resent successfully" });
};

export const verifyOtp = async (req, res) => {
  return res.json({ message: "OTP verified (dev mode)", success: true });
};
