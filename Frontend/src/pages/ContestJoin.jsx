// Main ContestJoin Component

import {
    AlertCircle,
    ArrowRight,
    Key,
    Loader,
    Mail
} from 'lucide-react';
import { useState } from 'react';
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

  const validateCredentials = async () => {
    if (!registrationId.trim() || !phone.trim()) {
      setValidationError('Please enter both Registration ID and phone number');
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      // Actual API call for credential validation
      const response = await fetch(`${import.meta.env.VITE_URL}/api/contests/validate-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          registrationId: registrationId.trim(),
          phone: phone.trim(),
          slug: 'quizbuzz-3'
        })
      });

      
      if (!response.ok) {
          const error = await response.json();
          setValidationError(error.message || 'Validation failed');
          setIsValidating(false);
          return;
        }
        
        const data = await response.json();
        console.table(data.contest);
        setContestInfo(data.contest);
        setIsValidating(false);
        
        localStorage.setItem("contestInfo",JSON.stringify(data.contest));
        localStorage.setItem("userInfo",JSON.stringify(data.userInfo));
      // Show OTP modal after successful validation
      setShowOTPModal(true);
      
      // TODO: API call to send OTP to user's phone
      // await fetch('/api/auth/send-otp', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json' 
      //   },
      //   body: JSON.stringify({ 
      //     phone: phone.trim(),
      //     contestId: data.contest.slug,
      //     purpose: 'contest_verification' 
      //   })
      // });
      
    } catch (error) {
      console.error('Validation error:', error);
      setValidationError('Network error. Please check your connection and try again.');
      setIsValidating(false);
    }
  };

  const handleOTPVerified = () => {
    setShowOTPModal(false);
    setOtpVerified(true);
    setShowTerms(true);
  };

  const handleTermsAccepted = () => {
    setShowTerms(false);
    setTermsAccepted(true);
    
    // Navigate to waiting room with contest info
    // Pass contest data through navigation state
    navigate('/contest/waiting-room', { 
      state: { 
        contestInfo,
        userInfo: {
          registrationId,
          phone
        }
      }
    });

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
    // TODO: API call to resend OTP with rate limiting
    // try {
    //   const response = await fetch('/api/auth/resend-otp', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ 
    //       phone: phone.trim(),
    //       contestId: contestInfo.id 
    //     })
    //   });
    //   
    //   if (!response.ok) {
    //     throw new Error('Failed to resend OTP');
    //   }
    //   
    //   console.log('OTP resent successfully');
    // } catch (error) {
    //   console.error('Error resending OTP:', error);
    // }
    
    console.log('Resending OTP to:', phone);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 mt-3">
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Join Contest</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your contest credentials to join the live quiz
          </p>
        </div>

        {/* Join Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          {!contestInfo ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Registration ID
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={registrationId}
                    onChange={(e) => setRegistrationId(e.target.value.toUpperCase())}
                    placeholder="Enter Registration ID"
                    className="w-full pl-10 text-sm pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-mono"
                  />
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
                onClick={validateCredentials}
                disabled={isValidating}
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
                  Check your Email for the contest invitation.
                </div>
              </div>
            </div>
          ) : showTerms ? (
            <TermsAndConditions
              onAccept={handleTermsAccepted}
              onDecline={handleTermsDeclined}
            />
          ) : null}
        </div>

        {/* Demo Note - Updated to reflect changes */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Demo OTP: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">123456</code>
          </p>
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