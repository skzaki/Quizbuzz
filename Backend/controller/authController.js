import jwt from 'jsonwebtoken';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Session, User } from '../Models/DB.js';
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
    
    //  Check if user exists
    const user = await User.findOne({ email, phone });
    if (!user) {
      return res
        .status(401)
        .json({ message: "No User Found." });
    }

    if (email !== user.email) {
      return res.json({
        message:
          "The Email-ID does not match the Phone no,",
      });
    }

    // if(!user.isAdmin || user.isAdmin === false) {
    //     return res.json({
    //         message: "You are not authroize User"
    //     });
    // }

     // 3 Invalidate existing active session in DB
        await Session.updateMany(
          { userId: user._id, isActive: true },
          { $set: { isActive: false, endedAt: new Date() } }
        );
    
        // 4 Create new session ID
        const sessionId = crypto.randomUUID();
    
        // 5 Save to MongoDB
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
    
        // 6 Save to Redis (24 hours TTL)
        await saveSession(sessionId, {
          userId: user._id.toString(),
          ipAddress,
          userAgent,
          isActive: true,
          lastActivity: new Date().toISOString(),
        }, 60 * 60 * 24);


    const token = jwt.sign(
      { userId: user._id, sessionId, role: user.isAdmin ? "admin" : "user" ,  email: user.email, userName: `${user.firstName} ${user.lastName}` },
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
  const { phone } = req.body;
  console.table(req.user);
  const userName = req.user.userName;
  try {
    // 1. validate
    const phoneNumber = parsePhoneNumberFromString(phone, "IN");
    if (!phoneNumber.isValid()) {
        return res.status(401).json({ message: "Enter a vaild Phone no (without '+91')"});
    }
    // 2. Generate
    const OTP = generateOtp();

    // 3. Save in Redis
    const saved = await saveOtp(phoneNumber.number, OTP);

    if(!saved) return res.status(401).json({ message: `Some error occur try again` });
    // 4. Send to user
        // 4.1 Via WhatsApp
        const sendWhatapp = await sendOtpWhatsApp(phoneNumber.number, userName, OTP);

        if(!sendWhatapp) return res.status.json({ message: `error send OTP on WhatsApp`});

        // 4.2 Via SMS
        const sendSms = await sendOtpSms(phoneNumber.number, OTP);

        if(!sendSms) return res.status.json({ message: `error send OTP on WhatsApp`});
     
    return res.json({
        message: `OTP send successfully`
    })

  } catch(error) {
    console.error(`ERROR: ${error.message}`);
    return res.status(500).json({
        message: "Error sending OTP, INTERNAL SERVER ERROR"
    })
  }

};

export const resendOtp = async (req, res) => {
  const { phone } = req.body;
  // TODO: Resend OTP with rate limit
  return res.json({ message: "OTP resent successfully" });
};

export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  // TODO: Check OTP validity
  try {
    // 1. validate
    const phoneNumber = parsePhoneNumberFromString(phone, "IN");
    if (!phoneNumber.isValid()) {
        return res.status(401).json({ message: "Enter a vaild Phone no (without '+91')"});
    }
    if (otp.length !== 4 || !/^\d{4}$/.test(otp)) {
        return res.status(401).json( { message: "Invaild OTP Fromat" });
    }

    const isVerifred = await verifyAndDeleteOtp(phoneNumber.number, otp);

    if(!isVerifred.success) return res.status(401).json({ message: "OTP  verified Failed"});

    return res.json({ message: isVerifred.message});


  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return res.status(500).json( {
        message: "INTERAL SERVER ERROR"
    });
  }
};
