import {
    Calendar,
    CheckCircle,
    Clock,
    Trophy
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { useExamProtection } from '../hooks/useExamProtection';

// Custom Toast Component for Camera Permission
const showCameraPermissionToast = (requestCameraPermission, cameraPermission) => {
  toast.custom((t) => (
    <div className={`
      bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
      transition-all duration-300 transform
      ${t.visible ? 'animate-enter' : 'animate-leave'}
    `} style={{ maxWidth: '90vw' }}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Camera Permission Required
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enable camera access to participate in the contest. This is required for exam monitoring.
          </p>
          
          <div className="mt-3 flex items-center space-x-2">
            <button
              onClick={() => {
                requestCameraPermission();
                toast.dismiss(t.id);
              }}
              disabled={cameraPermission === 'requesting'}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md transition-colors"
            >
              {cameraPermission === 'requesting' ? 'Requesting...' : 'Enable Camera'}
            </button>
            
            
          </div>
        </div>
        
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  ), {
    duration: Infinity, // Keep it open until user takes action
    position: 'top-center',
  });
};

// System Check Toast Component
const showSystemCheckToast = (cameraPermission, requestCameraPermission) => {
  toast.custom((t) => (
    <div className={`
      bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
      transition-all duration-300 transform max-w-sm
      ${t.visible ? 'animate-enter' : 'animate-leave'}
    `}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">System Status</h4>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Connection</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
          </div>
        </div>
        
        {/* Camera Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Camera</span>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                cameraPermission === 'granted' ? 'bg-green-500' : 
                cameraPermission === 'denied' ? 'bg-red-500' : 
                cameraPermission === 'requesting' ? 'bg-blue-500 animate-pulse' :
                'bg-yellow-500'
              }`}></div>
              <span className={`text-xs ${
                cameraPermission === 'granted' ? 'text-green-600 dark:text-green-400' : 
                cameraPermission === 'denied' ? 'text-red-600 dark:text-red-400' : 
                'text-yellow-600 dark:text-yellow-400'
              }`}>
                {cameraPermission === 'granted' ? 'Ready' : 
                 cameraPermission === 'denied' ? 'Blocked' : 
                 cameraPermission === 'requesting' ? 'Requesting...' : 'Required'}
              </span>
            </div>
            
            {(cameraPermission === 'prompt' || cameraPermission === 'denied') && (
              <button
                onClick={() => {
                  requestCameraPermission();
                }}
                disabled={cameraPermission === 'requesting'}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs rounded transition-colors"
              >
                {cameraPermission === 'requesting' ? 'Wait...' : 'Fix'}
              </button>
            )}
          </div>
        </div>
        
        {/* Status Message */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
          {cameraPermission === 'granted' ? (
            <div className="flex justify-between items-center">
              <span className="text-xs text-green-600 dark:text-green-400">✓ Ready for contest</span>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Camera access required for contest participation
            </div>
          )}
        </div>
      </div>
    </div>
  ), {
    duration: cameraPermission === 'granted' ? 4000 : Infinity,
    position: 'top-center',
  });
};

// Waiting Room Component
const WaitingRoom = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get contest info from navigation state
  const userInfo = useRef();
  const [contestInfo, setContestInfo] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(null);
  const [participants, setParticipants] = useState(0);
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'granted', 'denied', 'prompt', 'requesting'
  const [cameraError, setCameraError] = useState('');


 useExamProtection((msg) => {
     toast.error(msg);
 });

 useEffect(() => {
    showCameraPermissionToast(requestCameraPermission, cameraPermission);
 },[]);

  // Enhanced camera permission check for mobile compatibility
  const checkCameraPermission = useCallback(async () => {
    try {
      // First check if we're on HTTPS (required for mobile)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setCameraPermission('denied');
        setCameraError('Camera access requires HTTPS connection');
        return;
      }

      // Detect mobile devices
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (navigator.permissions && !isMobile) {
        // Use Permission API for desktop (unreliable on mobile)
        const permission = await navigator.permissions.query({ name: 'camera' });
        setCameraPermission(permission.state);
        
        permission.onchange = () => {
          setCameraPermission(permission.state);
        };
      } else {
        // For mobile, we'll check by trying to access the camera when requested
        setCameraPermission('prompt');
      }
    } catch (error) {
      console.log('Permission API not supported, will check on camera request');
      setCameraPermission('prompt');
      console.log(`ERROR: ${error}`);
    }
  }, [location.protocol, location.hostname]);

  // Initialize user and contest info
  useEffect(() => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      const storedContestInfo = localStorage.getItem('contestInfo');
      
      if (storedUserInfo) {
        userInfo.current = JSON.parse(storedUserInfo);
      }
      if (storedContestInfo) {
        const parsedContestInfo = JSON.parse(storedContestInfo);
        setContestInfo(parsedContestInfo);
        setParticipants(parsedContestInfo?.participants || 0);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error parsing stored data:', error);
      setIsInitialized(true);
    }
  }, []);

  // Socket connection effect
  useEffect(() => {
    if (!isInitialized || !contestInfo || !userInfo.current) return;

    const socket = io(import.meta.env.VITE_WEBSOCKET_URL , {
      path: "/ws/",
      transports: ["websocket"],
      auth: { token: localStorage.getItem("authToken") }
    });

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
      socket.emit("join-waiting-room", {
        contestId: contestInfo.slug,
        userId: userInfo.current.registrationId,
        startTime: contestInfo.startTime
      });
    });

    socket.on("participant-joined", ({ userId }) => {
      console.log(`📢 ${userId} joined`);
      setParticipants(prev => prev + 1);
    });

    socket.on("participant-left", ({ userId }) => {
      console.log(`🚪 ${userId} left`);
      setParticipants(prev => Math.max(prev - 1, 0));
    });

    socket.on("quiz-started", ({ contestId }) => {
      console.log(`🚀 Quiz started for ${contestId}`);
      navigate(`/contest/live/${contestId}`, {
        state: { contestInfo, userInfo: userInfo.current }
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected");
    });

    return () => {
      socket.emit("leave-waiting-room", {
        contestId: contestInfo.slug,
        userId: userInfo.current.registrationId
      });
      socket.disconnect();
    };
  }, [isInitialized, contestInfo, navigate]);

  // Timer and camera check effect
  useEffect(() => {
    if (!isInitialized || !contestInfo) return;

    // Check camera permission status
    checkCameraPermission();

    // Timer calculation
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const contestStart = new Date(contestInfo.startTime).getTime();
      const difference = contestStart - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds, total: difference };
      }
      return null;
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update timer every second
    const timer = setInterval(() => {
      const time = calculateTimeLeft();
      setTimeLeft(time);

      // Auto-navigate when contest starts
      if (!time) {
        clearInterval(timer);
        handleContestStart();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isInitialized, contestInfo, checkCameraPermission]);

  const handleContestStart = useCallback(() => {
    if (!contestInfo) return;
    // Navigate to live contest page with contest data
    navigate(`/contest/live/${contestInfo.slug}`, {
      state: { 
        contestInfo,
        userInfo: userInfo.current,
      }
    });
  }, [contestInfo, navigate]);

  const handleBackToJoin = useCallback(() => {
    // TODO: API call to leave waiting room
    navigate('/contest/join');
  }, [navigate]);

  const requestCameraPermission = async () => {
  try {
    setCameraError('');
    setCameraPermission('requesting');

    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Success - permission granted
    setCameraPermission('granted');

    // Stop the stream immediately (we only needed to unlock permission)
    stream.getTracks().forEach(track => track.stop());

    // 👉 Force fullscreen here
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      console.log("✅ Fullscreen enabled after camera permission");
    }

  } catch (error) {
    console.error('Camera permission error:', error);
    setCameraPermission('denied');

    if (error.name === 'NotAllowedError') {
      setCameraError('Camera access was denied. Please allow camera access when prompted, or check your browser settings.');
    } else if (error.name === 'NotFoundError') {
      setCameraError('No camera found on this device.');
    } else if (error.name === 'NotSupportedError') {
      setCameraError('Camera is not supported on this browser.');
    } else if (error.name === 'NotReadableError') {
      setCameraError('Camera is already in use by another application.');
    } else {
      setCameraError('Unable to access camera. Please check your browser settings and ensure you\'re using HTTPS.');
    }
  }
};


  const formatTimeUnit = (value) => {
    return value.toString().padStart(2, '0');
  };

  const getCameraStatusColor = () => {
    switch (cameraPermission) {
      case 'granted': return 'text-green-600 dark:text-green-400';
      case 'denied': return 'text-red-600 dark:text-red-400';
      case 'requesting': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getCameraStatusText = () => {
    switch (cameraPermission) {
      case 'granted': return 'Camera Ready';
      case 'denied': return 'Camera Denied';
      case 'requesting': return 'Requesting...';
      default: return 'Camera Permission Required';
    }
  };

  // Don't render if not initialized or no contest info
  if (!isInitialized || !contestInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 sm:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Waiting Room</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {userInfo.current?.registeredId || userInfo.current?.registrationId}
            </p>
          </div>
          
          <div className="w-20"></div> {/* Spacer for center alignment */}
        </div>

        <div className="space-y-4">
          {/* Success Status */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-800 dark:text-green-300">You're in the Waiting Room!</span>
            </div>
            <div className="text-sm text-green-700 dark:text-green-400">
              Contest will start automatically when the timer reaches zero.
            </div>
          </div>

        {/* Countdown Timer */}
          {timeLeft && (
            <div className="bg-gradient-to-r from-purple-500 to-blue-600 dark:from-purple-600 dark:to-blue-700 rounded-lg p-3 text-white text-center shadow-lg">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <Clock className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Contest Starts In</h3>
              </div>
              
              <div className="grid grid-cols-4 gap-1 mb-2 max-w-xs mx-auto">
                <div className="bg-white/20 dark:bg-black/20 rounded p-1.5 backdrop-blur-sm">
                  <div className="text-sm font-bold">{formatTimeUnit(timeLeft.days)}</div>
                  <div className="text-xs opacity-90">Days</div>
                </div>
                <div className="bg-white/20 dark:bg-black/20 rounded p-1.5 backdrop-blur-sm">
                  <div className="text-sm font-bold">{formatTimeUnit(timeLeft.hours)}</div>
                  <div className="text-xs opacity-90">Hours</div>
                </div>
                <div className="bg-white/20 dark:bg-black/20 rounded p-1.5 backdrop-blur-sm">
                  <div className="text-sm font-bold">{formatTimeUnit(timeLeft.minutes)}</div>
                  <div className="text-xs opacity-90">Min</div>
                </div>
                <div className="bg-white/20 dark:bg-black/20 rounded p-1.5 backdrop-blur-sm">
                  <div className="text-sm font-bold">{formatTimeUnit(timeLeft.seconds)}</div>
                  <div className="text-xs opacity-90">Sec</div>
                </div>
              </div>
              
              <div className="text-xs opacity-90">
                Auto-start when timer reaches zero
              </div>
            </div>
          )}

          {/* Contest Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span>Contest Details</span>
            </h3>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>Contest</span>
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{contestInfo.title}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Start Time</span>
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(contestInfo.startTime).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Duration</span>
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{contestInfo.duration} minutes</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Status</span>
                <span className="font-medium text-orange-600 dark:text-orange-400 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span>Waiting to Start</span>
                </span>
              </div>
            </div>
          </div>

           {/* Technical Check */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">System Check</h4>
            <div className="text-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Connection Status</span>
                <span className="text-green-600 dark:text-green-400 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs">Connected</span>
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Network Strength</span>
                <span className="text-green-600 dark:text-green-400 flex items-center space-x-1">
                  <div className="flex space-x-0.5">
                    <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
                    <div className="w-1 h-3 bg-green-500 rounded-sm"></div>
                    <div className="w-1 h-4 bg-green-500 rounded-sm"></div>
                    <div className="w-1 h-5 bg-green-500 rounded-sm"></div>
                  </div>
                  <span className="text-xs">Excellent</span>
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Camera Status</span>
                <div className="flex items-center space-x-2">
                  <span className={`flex items-center space-x-1 ${getCameraStatusColor()}`}>
                    <div className={`w-2 h-2 rounded-full ${
                      cameraPermission === 'granted' ? 'bg-green-500' : 
                      cameraPermission === 'denied' ? 'bg-red-500' : 
                      cameraPermission === 'requesting' ? 'bg-blue-500 animate-pulse' :
                      'bg-yellow-500'
                    }`}></div>
                    <span className="text-xs">{getCameraStatusText()}</span>
                  </span>
                  {(cameraPermission === 'prompt' || cameraPermission === 'denied') && (
                    <button
                      onClick={() => showCameraPermissionToast(requestCameraPermission, cameraPermission)}
                      disabled={cameraPermission === 'requesting'}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs rounded transition-colors min-w-[60px]"
                    >
                      {cameraPermission === 'requesting' ? 'Wait...' : 'Enable'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                {cameraPermission === 'granted' 
                  ? 'All systems ready for contest start'
                  : 'Please enable camera permission to proceed'
                }
              </div>
            </div>
          </div>

          {/* Camera Error Display */}
          {cameraError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="text-sm text-red-800 dark:text-red-300">
                <strong>Camera Issue:</strong> {cameraError}
              </div>
            </div>
          )}
        
        {/* Important Instructions */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Important Instructions:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Keep this page open - the contest will start automatically</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Enable camera permission for contest monitoring</li>
                <li>Do not refresh or close this page</li>
                <li>Have a pen and paper ready if needed</li>
              </ul>
            </div>
          </div>

          {/* Mobile-specific instructions */}
          {isMobile && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Mobile Users:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                  <li>Tap "Enable" button above to request camera permission</li>
                  <li>Allow camera access when prompted by your browser</li>
                  <li>If permission is denied, go to browser settings → Site permissions → Camera</li>
                  <li>Ensure you're not browsing in private/incognito mode</li>
                  <li>Try refreshing the page if camera still doesn't work</li>
                  <li>Make sure the site is using HTTPS (secure connection)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;