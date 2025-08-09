export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  // TODO: Generate OTP, send via SMS
  return res.json({ message: "OTP sent successfully" });
};

export const resendOtp = async (req, res) => {
  const { phone } = req.body;
  // TODO: Resend OTP with rate limit
  return res.json({ message: "OTP resent successfully" });
};

export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  // TODO: Check OTP validity
  return res.json({ message: "OTP verified" });
};
