// src/pages/Login.jsx
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OTPModal from "../components/OTPModal";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const { login, user } = useAuth();


  useEffect(() => {
    if(user) {
        if(user.isAdmin) navigate('/admin');
        else navigate("/contest/join");
    }
  },[user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Step 1: Login API
      const loginRes = await fetch(`${import.meta.env.VITE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });

      if (!loginRes.ok) {
        const err = await loginRes.json();
        throw new Error(err.message || "Login failed");
      }

      const loginData = await loginRes.json();
      if (loginData.token) {
        localStorage.setItem("authToken", loginData.token);
      }

      // Step 2: Send OTP
      const otpRes = await fetch(`${import.meta.env.VITE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ phone }),
      });

      if (!otpRes.ok) {
        const err = await otpRes.json();
        throw new Error(err.message || "Failed to send OTP");
      }

      // Step 3: Show OTP Modal
      setIsOtpOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    const token = localStorage.getItem("authToken");
    if(token) {
        login(token);
        const parsedUser = jwtDecode(token);
        if(parsedUser.role === 'admin') {
            navigate("/admin");
        } else {
            navigate('/contest/join');
        }
    }
    setIsOtpOpen(false);
  };

  const handleResendOtp = async () => {
    try {
      await fetch(`${import.meta.env.VITE_URL}/api/auth/sendOtp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({ phone }),
      });
    } catch (err) {
      console.error("Resend OTP error:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Admin Login
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      <OTPModal
        isOpen={isOtpOpen}
        phone={phone}
        onClose={() => setIsOtpOpen(false)}
        onVerifySuccess={handleOtpSuccess}
        onResendOTP={handleResendOtp}
      />
    </div>
  );
};

export default Login;
