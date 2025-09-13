// Main ContestJoin Component

import {
    AlertCircle,
    ArrowRight,
    Clock,
    Key,
    Loader,
    Mail,
    MapPin,
    Smartphone
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Add this import for navigation
import OTPModal from '../components/OTPModal';
import TermsAndConditions from '../components/TermsAndConditions';

const ContestJoin = () => {
  const navigate = useNavigate(); // Initialize navigation hook
  const [searchParams] = useSearchParams();
  const [registrationId, setRegistrationId] = useState(searchParams.get("code") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [contestInfo, setContestInfo] = useState(null);
  
  // New states for the flow
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // New state for multiple device login error
  const [multipleDeviceError, setMultipleDeviceError] = useState(null);

  const validateCredentials = async (fullRegId = null) => {
    
    const regId = fullRegId || `QUIZ-${registrationId}`;
  
    if (!regId.trim() || !phone.trim()) {
        setValidationError('Please enter both Registration ID and phone number');
        return;
    }

    setIsValidating(true);
    setValidationError('');
    setMultipleDeviceError(null); // Clear any previous multiple device errors

    try {
      // Actual API call for credential validation
      const response = await fetch(`${import.meta.env.VITE_URL}/contests/validate-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          registrationId: regId.trim(),
          phone: phone.trim(),
          slug: 'quizbuzz-3'
        })
      });

      
      if (!response.ok) {
          const error = await response.json();
          
          // Handle multiple device login error specifically
          if (response.status === 409 && error.error === 'MULTIPLE_DEVICE_LOGIN_BLOCKED') {
            setMultipleDeviceError(error);
            setIsValidating(false);
            return;
          }
          
          setValidationError(error.message || 'Validation failed');
          setIsValidating(false);
          return;
        }

        
        const data = await response.json();
        setContestInfo(data);

        if(data.submissionId) {
            navigate(`/contest/result/${data.submissionId}`);
        }

        localStorage.setItem("authToken", data.token);

        // If this is a resumed session (welcome back message), skip OTP
        if (data.message.includes("Welcome back")) {
          setIsValidating(false);
          setOtpVerified(true);
          
          // Set localStorage items
          localStorage.setItem("contestInfo", JSON.stringify(data.contestInfo));
          localStorage.setItem("userInfo", JSON.stringify(data.userInfo));
          
          // Navigate directly to waiting room for resumed sessions
          navigate('/contest/waiting-room');
          return;
        }
        
        // Send OTP for new sessions
        await sendOTP();
        
    } catch (error) {
      console.error('Validation error:', error);
      setValidationError('Network error. Please check your connection and try again.');
      setIsValidating(false);
    }
  };

  const sendOTP = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          phone: phone.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        setValidationError(error.message || 'Failed to send OTP');
        setIsValidating(false);
        return;
      }

      // Show OTP modal after successful OTP send
      setIsValidating(false);
      setShowOTPModal(true);
      toast.success("OTP send successfully");
      
    } catch (error) {
      console.error('Error sending OTP:', error);
      setValidationError('Failed to send OTP. Please try again.');
      setIsValidating(false);
    }
  };

  const handleOTPVerified = (submissionId = null ) => {
    
    setShowOTPModal(false);
    setOtpVerified(true);
    
    // Set localStorage items after OTP verification
    if (contestInfo) {
      localStorage.setItem("contestInfo", JSON.stringify(contestInfo.contestInfo));
      localStorage.setItem("userInfo", JSON.stringify(contestInfo.userInfo));
    }
    if(submissionId) {
        navigate(`/contest/result/${submissionId}`);
    } else {
        setShowTerms(true);
    }
    
  };

  const handleTermsAccepted = () => {
    setShowTerms(false);
    setTermsAccepted(true);
    
    // Navigate to waiting room with contest info
    // Pass contest data through navigation state
    navigate('/contest/waiting-room');

    // TODO: API call to officially join the contest waiting room
    // fetch('/api/contests/join-waiting-room', {
    //   method: 'POST',
    //   headers: { 
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    //   },
    //   body: JSON.stringify({
    //     contestId: contestInfo.id,
    //     registrationId,
    //     phone,
    //     userAgent: navigator.userAgent,
    //     timestamp: new Date().toISOString()
    //   })
    // });
  };

  const handleTermsDeclined = () => {
    setShowTerms(false);
    setOtpVerified(false);
    setContestInfo(null);
    
    // TODO: API call to log terms decline (for analytics)
    // fetch('/api/contests/terms-declined', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     contestId: contestInfo?.id,
    //     registrationId,
    //     timestamp: new Date().toISOString()
    //   })
    // });
  };

  const handleResendOTP = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          phone: phone.trim()
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend OTP');
      }
      
      console.log('OTP resent successfully');
    } catch (error) {
      console.error('Error resending OTP:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleDismissMultipleDeviceError = () => {
    setMultipleDeviceError(null);
  };

  // Function to determine what to render based on current state
  const renderContent = () => {
    // Show multiple device error modal
    if (multipleDeviceError) {
      return (
        <div className="space-y-6">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">
                  Multiple Device Login Detected
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                  {multipleDeviceError.message}
                </p>
                
                {multipleDeviceError.existingSession && (
                  <div className="bg-orange-100 dark:bg-orange-800/30 rounded-md p-3 mb-4">
                    <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                      Current Active Session:
                    </h4>
                    <div className="space-y-2 text-xs text-orange-700 dark:text-orange-300">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="h-4 w-4" />
                        <span>Device: {multipleDeviceError.existingSession.device}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>Last Activity: {new Date(multipleDeviceError.existingSession.lastActivity).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>IP: {multipleDeviceError.existingSession.ipAddress}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    <strong>What you can do:</strong>
                  </p>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 ml-4">
                    <li>• Continue using your other device to access the contest</li>
                    <li>• Logout from the other device first, then try again here</li>
                    <li>• Contact support if you believe this is an error</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleDismissMultipleDeviceError}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    if (showTerms && contestInfo && otpVerified) {
      return (
        <TermsAndConditions
          onAccept={handleTermsAccepted}
          onDecline={handleTermsDeclined}
        />
      );
    }
    
    if (contestInfo && otpVerified && !showTerms) {
      // This is the state after terms are accepted but before navigation
      // Show a loading state or success message
      return (
        <div className="text-center space-y-4">
          <div className="text-green-600 dark:text-green-400">
            <h3 className="text-lg font-semibold">Registration Complete!</h3>
            <p className="text-sm mt-2">Redirecting to waiting room...</p>
          </div>
        </div>
      );
    }
    
    // Default: Show the join form
    return (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Registration ID
      </label>
      <div className="relative">
        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <div className="relative">
          <span className="absolute left-10 top-1/2 transform -translate-y-1/2 text-sm text-black dark:text-white font-mono">
            QUIZ-
          </span>
          <input
            type="text"
            value={registrationId}
            onChange={(e) => {
              const value = e.target.value.toUpperCase();
              // Only allow alphanumeric characters and limit to 6 characters
              const cleanValue = value.replace(/[^A-Z0-9]/g, '').slice(0, 6);
              setRegistrationId(cleanValue);
            }}
            placeholder="123456"
            className="w-full pl-20 text-sm pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-mono"
            maxLength={6}
          />
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Enter 6 characters (letters and numbers only). Full ID will be: QUIZ-{registrationId || 'XXXXXX'}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Registered Phone Number
      </label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter your registered phone number"
          className="w-full pl-10 text-sm pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
        />
      </div>
    </div>

    {validationError && (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-800 dark:text-red-300">{validationError}</span>
        </div>
      </div>
    )}

    <button
      onClick={() => {
        // When validating, use the full registration ID with prefix
        const fullRegistrationId = `QUIZ-${registrationId}`;
        validateCredentials(fullRegistrationId);
      }}
      disabled={isValidating || registrationId.length !== 6}
      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
    >
      {isValidating ? (
        <>
          <Loader className="h-5 w-5 animate-spin" />
          <span>Validating...</span>
        </>
      ) : (
        <>
          <span>Validate & Send OTP</span>
          <ArrowRight className="h-5 w-5" />
        </>
      )}
    </button>

    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="text-sm text-blue-800 dark:text-blue-300">
        <strong>Need help?</strong> Your Registration ID was sent to you after registration. 
        Enter only the 6 characters after "QUIZ-" (e.g., if your full ID is QUIZ-ABC123, enter ABC123).
      </div>
    </div>
  </div>
);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className={`w-full max-w-md transition-all duration-300 ${showOTPModal ? 'blur-sm' : ''} `}>
        {/* Header */}
        <div className="text-center mb-8 mt-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Join Contest</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your contest credentials to join the live quiz
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          {renderContent()}
        </div>
      </div>

      {/* OTP Modal */}
      <OTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        phone={phone}
        onVerifySuccess={handleOTPVerified}
        onResendOTP={handleResendOTP}
      />
    </div>
  );
};

export default ContestJoin;