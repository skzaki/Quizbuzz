import {
    AlertCircle,
    ArrowRight,
    Loader,
    Shield,
    X
} from 'lucide-react';
import { useState } from 'react';


// OTP Modal Component
const OTPModal = ({ isOpen, onClose, phone, onVerifySuccess, onResendOTP }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const verifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setVerificationError('Please enter complete OTP');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');

    // Simulate OTP verification
    // TODO: Replace with actual API call
    // const response = await fetch('/api/verify-otp', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phone, otp: otpString })
    // });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock validation - accept '123456' as valid OTP
    if (otpString === '123456') {
      setIsVerifying(false);
      onVerifySuccess();
    } else {
      setVerificationError('Invalid OTP. Please try again.');
      setIsVerifying(false);
    }
  };

  const resendOTP = async () => {
    setResendCooldown(30);
    
    // TODO: Replace with actual API call
    // await fetch('/api/resend-otp', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phone })
    // });

    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    onResendOTP();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Verify OTP</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full w-16 h-16 mx-auto mb-4">
            <Shield className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            We've sent a 6-digit OTP to
          </p>
          <p className="font-medium text-gray-900 dark:text-white">
            +91 {phone}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            {/* <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter OTP
            </label> */}
            <div className="flex space-x-2 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              ))}
            </div>
          </div>

          {verificationError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-300">{verificationError}</span>
              </div>
            </div>
          )}

          <button
            onClick={verifyOTP}
            disabled={isVerifying}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
          >
            {isVerifying ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify OTP</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Didn't receive the code?{' '}
            </span>
            {resendCooldown > 0 ? (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                onClick={resendOTP}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium"
              >
                Resend OTP
              </button>
            )}
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Demo:</strong> Use OTP <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">123456</code> to proceed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPModal;