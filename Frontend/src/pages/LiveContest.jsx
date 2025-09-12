import CryptoJS from "crypto-js";
import { ArrowRight, CameraOff, Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from "react-hot-toast";
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import ThankYouScreen from "../components/LiveContest/ThankYouScreen.jsx";
import { startFaceMonitor, stopFaceMonitor } from '../services/faceMonitor.js';
import { useExamProtection } from './../hooks/useExamProtection';


const calculateTimeLeft = (contestInfo) => {
  const now = new Date();
  const contestStartTime = new Date(contestInfo.startTime);
  const durationInMinutes = parseInt(contestInfo.duration);
  const contestEndTime = new Date(contestStartTime.getTime() + (durationInMinutes * 60 * 1000));
  
  // Case 1: Contest hasn't started yet
  if (now < contestStartTime) {
    
    return durationInMinutes * 60; // Full duration in seconds
  }
  
  // Case 2: Contest has ended
  if (now >= contestEndTime) {
    console.log("Contest has ended");
    return 0; // Contest over
  }
  
  // Case 3: Contest is ongoing (user joining late or mid-contest)
  const timeElapsed = now - contestStartTime; // milliseconds
  const timeElapsedSeconds = Math.floor(timeElapsed / 1000);
  const totalDurationSeconds = durationInMinutes * 60;
  const remainingSeconds = totalDurationSeconds - timeElapsedSeconds;
  
  console.log(`Contest is ongoing. Elapsed: ${timeElapsedSeconds}s, Remaining: ${remainingSeconds}s`);
  
  return Math.max(0, remainingSeconds); // Ensure non-negative
};

const LiveContest = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0); // 40 mins in seconds
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proctoringWarning, setProctoringWarning] = useState('');
  const [warningCount, setWarningCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState();
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [submissionAttempt, setSubmissionAttempt] = useState(1);
  const [submissionId, setSubmissionId] = useState();
  const [jobId, setJobId] = useState();
  const [playFallback, setPlayFallback] = useState(false);
  
  // Camera and proctoring states
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [faceMonitorStatus, setFaceMonitorStatus] = useState('loading'); // 'loading', 'active', 'warning', 'error'
  const videoRef = useRef(null);
  const socketRef = useRef(null);

  // Get contest info from navigation state
  const userInfo = useRef({});
  const contestInfo = useRef({});


const getQuestions = async () => {
  try {
    setIsLoadingQuestions(true);

    // 1: Check localStorage
    const encrypted = localStorage.getItem(`questions_${contestInfo.current.slug}`);
    if (encrypted) {
      try {
        const bytes = CryptoJS.AES.decrypt(encrypted, import.meta.env.VITE_SECRET_KEY);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        if (Array.isArray(decryptedData) && decryptedData.length > 0) {
          console.log("📂 Loaded questions from localStorage");
          setQuestions(decryptedData);
          setAnswers(new Array(decryptedData.length).fill(null));
          setIsLoadingQuestions(false);
          return; // ✅ Stop here, no API call
        }
      } catch (error) {
        console.warn("⚠️ Failed to decrypt local questions, refetching...");
        console.warn(`ERROR: ${error.message}`);
      }
    }

    // 2: Fetch from API (only if not in localStorage)
    const response = await fetch(
      `${import.meta.env.VITE_URL}/contests/${contestInfo.current.slug}/questions`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.log(`Error fetching the questions:`, error);
      setErrorMessage(error);
      setIsLoadingQuestions(false);
      return;
    }

    const data = await response.json();
    let questionsArray = [];

    if (data.questions && Array.isArray(data.questions)) {
      questionsArray = data.questions;
    } else if (Array.isArray(data)) {
      questionsArray = data;
    } else {
      console.error("Unexpected questions format:", data);
    }

    // 3: Save in state & localStorage (encrypted)
    setQuestions(questionsArray);
    setAnswers(new Array(questionsArray.length).fill(null));

    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(questionsArray),
      import.meta.env.VITE_SECRET_KEY
    ).toString();

    localStorage.setItem(`questions_${contestInfo.current.slug}`, encryptedData);
    console.log("🔒 Questions stored in encrypted localStorage");

    setIsLoadingQuestions(false);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    setErrorMessage(error.message);
    setIsLoadingQuestions(false);
  }
};

  useExamProtection(
       (msg) => {
          toast.error(msg); 
       },
       () => {
          toast.error("Too many violations! Submitting quiz...")
          handleSubmitContest(); 
       }
   );

  
 // WebSocket
  useEffect(() => {

    userInfo.current = JSON.parse(localStorage.getItem('userInfo'));
    contestInfo.current = JSON.parse(localStorage.getItem('contestInfo'));


    // Calculate and set the correct timeLeft after contestInfo is loaded
    if (contestInfo.current && contestInfo.current.startTime && contestInfo.current.duration) {
      const calculatedTimeLeft = calculateTimeLeft(contestInfo.current);
      setTimeLeft(calculatedTimeLeft);
      
      // If contest has ended, redirect or show message
      if (calculatedTimeLeft === 0) {
        toast.error("Contest has ended. You cannot participate anymore")
        navigate('/contest/join');
        return;
      }
    }

    getQuestions(); // get the questions

    socketRef.current = io(import.meta.env.VITE_WEBSOCKET_URL , {
        path: "/ws/",
        transports: ["websocket"],
        auth: { token: localStorage.getItem("authToken") }
    });

    socketRef.current.on("connect", () => {
        console.log("✅ Live contest socket connected", socketRef.current.id);
        socketRef.current.emit("join-waiting-room", {
            contestId: contestInfo.current.slug,
            userId: userInfo.current.registrationId,
            startTime: contestInfo.current.startTime // Date.now() // Change
        });
    });

    socketRef.current.on("resume-quiz", (savedState) => {
        if (savedState.answers && Array.isArray(savedState.answers)) {
            // initialize blank answers array
            const restoredAnswers = new Array(questions.length).fill(null);

            savedState.answers.forEach(ans => {
            const qIndex = questions.findIndex(q => q._id === ans.questionId);
            if (qIndex !== -1 && ans.answerIndex !== null && ans.answerIndex !== "") {
                restoredAnswers[qIndex] = ans.answerIndex; //  direct restore
            }
            });

            setAnswers(restoredAnswers);
            console.log("✅ Restored answers from Redis:", restoredAnswers);
        }

        setCurrentQuestion(savedState.currentQuestion || 0);
        console.log("🔄 Resuming quiz at Q", (savedState.currentQuestion || 0) + 1);
    });


    socketRef.current.on("proctoring-alert", (data) => {
        console.warn("⚠️ Proctoring alert:", data);
    });

    socketRef.current.on("contest-update", (data) => {
        console.log("📢 Contest update:", data);
    });

    return () => {
        socketRef.current.disconnect();
    };
}, []);

 

  const totalQuestions = questions.length;

  // Initialize camera and WebSocket connection
   useEffect(() => {
        if (!mediaStream) {
            initializeProctoring();
        }
        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach((track) => track.stop());
            }
            stopFaceMonitor();
        };
    }, [mediaStream]);


  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitContest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

useEffect(() => {
    if (!contestInfo.current || !contestInfo.current.startTime) return;
    
    const syncInterval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(contestInfo.current);
      
      // Only update if there's a significant difference (more than 2 seconds)
      // This prevents unnecessary re-renders while allowing for corrections
      if (Math.abs(newTimeLeft - timeLeft) > 2) {
        console.log("Syncing time. Old:", timeLeft, "New:", newTimeLeft);
        setTimeLeft(newTimeLeft);
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(syncInterval);
  }, [timeLeft]);
  

  // Auto-save and proctoring monitoring
    useEffect(() => {
        const autoSave = setInterval(() => {
            const structuredAnswers = questions
            .map((q, i) => {
                if (answers[i] !== null && answers[i] !== undefined && answers[i] !== "") {
                return {
                    questionId: q._id,
                    answer: q.options[answers[i]], //  text
                    answerIndex: answers[i],       //  index
                    submittedAt: new Date()
                };
                }
                return null;
            })
            .filter(Boolean);

            if (structuredAnswers.length > 0 && socketRef.current) {
            socketRef.current.emit("save-progress", {
                contestId: contestInfo.current.slug,
                userId: userInfo.current.registrationId,
                currentQuestion,
                answers: structuredAnswers // only answered questions
            });

            console.log("📦 Full snapshot auto-saved with answered questions only");
            }
        }, 5*60000); // every 5 min

        return () => clearInterval(autoSave);
    }, [answers, questions, currentQuestion]);

  // Auto-clear certain warnings
  useEffect(() => {
    if (proctoringWarning && 
        !proctoringWarning.includes('Multiple faces') && 
        !proctoringWarning.includes('unavailable') &&
        !proctoringWarning.includes('error')) {
      const timer = setTimeout(() => {
        setProctoringWarning('');
        if (faceMonitorStatus === 'warning' && !proctoringWarning.includes('Multiple faces')) {
          setFaceMonitorStatus('active');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [proctoringWarning, faceMonitorStatus]);

// FIXED LiveContest.jsx - initializeProctoring function
const initializeProctoring = async () => {
  try {
    setFaceMonitorStatus("loading");

    // Enhanced iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    
    console.log(`📱 Device detection - iOS: ${isIOS}, Safari: ${isSafari}, Chrome: ${isChrome}`);

    // CRITICAL: Prepare video element BEFORE getting stream
    if (!videoRef.current) {
      throw new Error('Video element not available');
    }

    const video = videoRef.current;
    
    // Clean up any existing stream
    if (video.srcObject) {
      const oldStream = video.srcObject;
      oldStream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    
    // CRITICAL: Set iOS attributes BEFORE getUserMedia
    console.log('🔧 Configuring video element for iOS...');
    
    // Attribute method (for compatibility)
    video.setAttribute("playsinline", "true");
    video.setAttribute("muted", "true"); 
    video.setAttribute("autoplay", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("controls", "false");
    video.setAttribute("preload", "metadata");
    
    // Property method (iOS requires both)
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.controls = false;
    video.defaultMuted = true; // Important for iOS
    
    // iOS-critical styling
    video.style.display = 'block';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.backgroundColor = '#000'; // Prevents white flash
    video.style.webkitTransform = 'translateZ(0) scaleX(-1)';
    video.style.transform = 'translateZ(0) scaleX(-1)';
    
    console.log('✅ Video element configured for iOS');

    // iOS-optimized camera constraints
    const baseConstraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 }
      },
      audio: false // NEVER request audio
    };

    const fallbackConstraints = {
      video: { facingMode: 'user' },
      audio: false
    };

    console.log('📹 Requesting camera stream...');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(baseConstraints);
      console.log('✅ Camera stream obtained with base constraints');
    } catch (error) {
      console.warn('⚠️ Base constraints failed, trying fallback:', error.message);
      
      if (error.name === 'OverconstrainedError' || error.name === 'NotReadableError') {
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        console.log('✅ Camera stream obtained with fallback constraints');
      } else {
        throw error;
      }
    }

    // Verify stream
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error('No video track available');
    }

    console.log(`✅ Stream ready with ${videoTracks.length} video track(s)`);
    
    // Update states
    setMediaStream(stream);
    setCameraEnabled(true);

    // CRITICAL: Set srcObject and handle iOS playback
    video.srcObject = stream;
    
    console.log('🔗 Stream attached to video element');

    // iOS-specific playback handling
    const startPlayback = () => {
      return new Promise((resolve) => {
        let playbackResolved = false;
        
        const resolveOnce = (success) => {
          if (!playbackResolved) {
            playbackResolved = true;
            resolve(success);
          }
        };

        // Multiple strategies for iOS playback
        const attemptPlay = async () => {
          try {
            console.log('🎬 Attempting video playback...');
            console.log('📊 Video state - readyState:', video.readyState, 'paused:', video.paused);
            
            // Wait for minimum readyState
            if (video.readyState < 2) {
              console.log('⏳ Waiting for video metadata...');
              return false;
            }

            // Ensure video is still muted and has playsInline
            video.muted = true;
            video.playsInline = true;

            const playPromise = video.play();
            
            if (playPromise && typeof playPromise.then === 'function') {
              await playPromise;
              console.log('✅ Video playing via Promise');
              setPlayFallback(false);
              resolveOnce(true);
              return true;
            } else {
              // Legacy browsers
              console.log('✅ Video started (legacy browser)');
              setPlayFallback(false);
              resolveOnce(true);
              return true;
            }
            
          } catch (playError) {
            console.warn('⚠️ Play attempt failed:', playError.name, playError.message);
            
            if (playError.name === 'NotAllowedError') {
              console.log('📱 iOS requires user interaction for autoplay');
              setPlayFallback(true);
              resolveOnce(true); // Don't fail, show button
              return true;
            } else if (playError.name === 'AbortError') {
              console.log('🔄 Play was aborted, will retry...');
              return false; // Retry
            } else {
              throw playError;
            }
          }
        };

        // Event handlers for iOS compatibility
        const onLoadedMetadata = async () => {
          console.log('📊 Video metadata loaded');
          const success = await attemptPlay();
          if (!success) {
            // Retry after short delay
            setTimeout(attemptPlay, 200);
          }
        };

        const onCanPlay = async () => {
          console.log('📊 Video can play');
          if (video.readyState >= 3) {
            const success = await attemptPlay();
            if (!success) {
              setTimeout(attemptPlay, 200);
            }
          }
        };

        const onPlaying = () => {
          console.log('✅ Video is playing');
          setPlayFallback(false);
          resolveOnce(true);
        };

        const onError = (event) => {
          console.error('❌ Video error:', event);
          setFaceMonitorStatus("error");
          setProctoringWarning("Video playback error");
          resolveOnce(false);
        };

        // Set up event listeners
        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('canplay', onCanPlay, { once: true });
        video.addEventListener('playing', onPlaying, { once: true });
        video.addEventListener('error', onError, { once: true });

        // Immediate attempt if ready
        if (video.readyState >= 1) {
          console.log('📊 Video metadata already loaded, attempting play');
          setTimeout(onLoadedMetadata, 0);
        }

        // Fallback timeout
        setTimeout(() => {
          if (!playbackResolved) {
            console.log('⏰ Playback timeout, showing manual button');
            setPlayFallback(true);
            resolveOnce(true);
          }
        }, 5000);
      });
    };

    // Start playback
    const playbackSuccess = await startPlayback();
    
    if (playbackSuccess) {
      console.log('✅ Video playback initialized');
      
      // Start face monitoring only after successful video setup
      try {
        await startFaceMonitor({
          videoEl: video,
          onWarning: (msg) => {
            console.warn('👁️ Face monitor warning:', msg);
            setProctoringWarning(msg);
            setFaceMonitorStatus("warning");

            setWarningCount((prev) => {
              const newCount = prev + 1;
              if (newCount >= 15) {
                console.log('❌ Too many warnings, auto-submitting');
                handleSubmitContest();
              } else if ([5, 4, 3, 2, 1].includes(15 - newCount)) {
                toast.error(`Warning: ${15 - newCount} violation(s) remaining before auto-submit`);
              }
              return newCount;
            });
          },
          onClear: () => {
            console.log('✅ Face monitor cleared');
            setProctoringWarning("");
            setFaceMonitorStatus("active");
          },
        });

        setFaceMonitorStatus("active");
        console.log('✅ Face monitoring started successfully');

      } catch (faceMonitorError) {
        console.error('❌ Face monitoring setup failed:', faceMonitorError);
        setFaceMonitorStatus("error");
        setProctoringWarning("⚠️ Face monitoring unavailable - continuing without monitoring");
      }
    }

  } catch (error) {
    console.error('❌ Camera initialization failed:', error);
    setFaceMonitorStatus("error");

    let errorMessage = "❌ Camera initialization failed. ";
    
    if (error.name === 'NotAllowedError') {
      errorMessage += "Please enable camera access: Settings > Safari > Camera > Allow for this site";
    } else if (error.name === 'NotFoundError') {
      errorMessage += "No camera detected. Please connect a camera and refresh.";
    } else if (error.name === 'NotReadableError') {
      errorMessage += "Camera in use by another app. Please close other camera apps and refresh.";
    } else if (error.name === 'OverconstrainedError') {
      errorMessage += "Camera settings not supported. Please refresh and try again.";
    } else if (error.name === 'SecurityError') {
      errorMessage += "Camera access blocked. Please ensure you're using HTTPS and refresh.";
    } else {
      errorMessage += `Error: ${error.message}. Please refresh the page.`;
    }

    setProctoringWarning(errorMessage);
  }
};

// FIXED LiveContest.jsx - handleVideoPlayFallback function
const handleVideoPlayFallback = async () => {
  if (!videoRef.current) {
    console.error('❌ No video element for manual play');
    return;
  }

  const video = videoRef.current;
  console.log('🎬 Manual play requested by user');
  
  try {
    // Ensure iOS-friendly properties
    video.muted = true;
    video.playsInline = true;
    video.defaultMuted = true;
    
    console.log('📊 Video state before manual play:', {
      readyState: video.readyState,
      paused: video.paused,
      muted: video.muted,
      playsInline: video.playsInline
    });

    // Try direct play first
    const playPromise = video.play();
    
    if (playPromise && typeof playPromise.then === 'function') {
      await playPromise;
      console.log('✅ Manual play successful via Promise');
      setPlayFallback(false);
    } else {
      console.log('✅ Manual play successful (legacy)');
      setPlayFallback(false);
    }
    
  } catch (error) {
    console.error('❌ Manual play failed:', error);
    
    // Last resort: try refreshing the stream
    if (mediaStream && video.srcObject !== mediaStream) {
      console.log('🔄 Attempting to refresh video stream...');
      
      try {
        video.srcObject = mediaStream;
        
        // Wait a moment and try again
        setTimeout(async () => {
          try {
            video.muted = true;
            video.playsInline = true;
            await video.play();
            console.log('✅ Stream refresh play successful');
            setPlayFallback(false);
          } catch (retryError) {
            console.error('❌ Stream refresh play failed:', retryError);
            // Keep the button visible for user to try again
          }
        }, 100);
        
      } catch (streamError) {
        console.error('❌ Stream refresh failed:', streamError);
      }
    }
  }
};

  // Enhanced proctoring status renderer
  const renderProctoringStatus = () => {
    if (faceMonitorStatus === 'loading') {
      return (
        <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs md:text-sm font-medium">
              Initializing Face Monitor...
            </span>
          </div>
          <p className="text-xs mt-1">
            Loading face detection model
          </p>
        </div>
      );
    }
    
    if (faceMonitorStatus === 'error') {
      return (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500/20 rounded-full"></div>
            <span className="text-xs md:text-sm font-medium">
              Monitoring Error
            </span>
          </div>
          <p className="text-xs mt-1">
            Face monitoring system unavailable
          </p>
        </div>
      );
    }
    
    if (proctoringWarning) {
      return (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500/20 rounded-full animate-pulse"></div>
            <span className="text-xs md:text-sm font-medium">
              Proctoring Alert
            </span>
          </div>
          <p className="text-xs mt-1">
            {proctoringWarning}
          </p>
        </div>
      );
    }
    
    if (faceMonitorStatus === 'active') {
      return (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500/10 rounded-full animate-pulse"></div>
            <span className="text-xs md:text-sm text-green-700 dark:text-green-400 font-medium">
              Monitoring Active
            </span>
          </div>

        </div>
      );
    }
    
    return null;
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex);
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

    const handleSubmitAnswer = () => {
        if (selectedAnswer !== null) {
            const newAnswers = [...answers];
            newAnswers[currentQuestion] = selectedAnswer;
            setAnswers(newAnswers);
        }

        if (socketRef.current) {
            // Delta: only the current question
            const structuredAnswer = {
                questionId: questions[currentQuestion]._id,
                answer: selectedAnswer !== null ? questions[currentQuestion].options[selectedAnswer] : "",
                answerIndex: selectedAnswer ?? "",
                submittedAt: new Date()
            };

            socketRef.current.emit("save-progress", {
                contestId: contestInfo.current.slug,
                userId: userInfo.current.registrationId,
                currentQuestion: currentQuestion + 1, // resume → next question
                answers: [structuredAnswer] // only this question
            });

            console.log(`💾 Delta progress emitted for Q${currentQuestion + 1}`);
        }

        if (currentQuestion === totalQuestions - 1) {
            handleSubmitContest(); // auto-submit on last
        } else {
            goToQuestion(currentQuestion + 1);
        }
    };


   const handleSkip = () => {
        if (socketRef.current) {
            const structuredAnswer = {
                questionId: questions[currentQuestion]._id,
                answer: "", // skipped
                answerIndex: "",
                submittedAt: new Date()
            };

            socketRef.current.emit("save-progress", {
                contestId: contestInfo.current.slug,
                userId: userInfo.current.registrationId,
                currentQuestion: currentQuestion + 1,
                answers: [structuredAnswer]
            });

            console.log(`💾 Delta progress emitted for skipped Q${currentQuestion + 1}`);
        }

        if (currentQuestion < totalQuestions - 1) {
            goToQuestion(currentQuestion + 1);
        }
    };



  const goToQuestion = (questionIndex) => {
    setCurrentQuestion(questionIndex);
    setSelectedAnswer(answers[questionIndex]);
  };


 const handleSubmitContest = async () => {
    setIsSubmitting(true);
    setShowSubmitConfirm(false);

    await new Promise(resolve => setTimeout(resolve, 0));

    let finalSubmissionId = null;

    const maxAttempts = 6;
    let attempt = 1;
    let submissionSuccessful = false;

    while (attempt <= maxAttempts && !submissionSuccessful) {
        try {
            console.log(`Submission attempt ${attempt}/${maxAttempts}`);
            setSubmissionAttempt(attempt); // Update state for UI
            
            const response = await fetch(`${import.meta.env.VITE_URL}/contests/${contestInfo.current.slug}/submit`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify({
                    contestSlug: contestInfo.current.slug,
                    userRegistrationId: userInfo.current.registrationId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Check if we received a valid submissionId
            if (result.submissionId) {
                console.log("Contest submitted successfully:", result);
                finalSubmissionId = result.submissionId;
                setSubmissionId(result.submissionId);
                setJobId(result.jobId);
                submissionSuccessful = true;
            } else {
                throw new Error("No submissionId received from server");
            }

        } catch (error) {
            console.error(`Submission attempt ${attempt} failed:`, error);
            
            if (attempt < maxAttempts) {
                // Wait before retrying (exponential backoff)
                const delay = 1500;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            attempt++;
        }
    }

    setIsSubmitting(false);

    if (submissionSuccessful) {
        // Clean up monitoring resources
        try {
            stopFaceMonitor();
        } catch (error) {
            console.warn("Error stopping face monitor:", error);
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }

         navigate(`/contest/result/evaluate/${finalSubmissionId}`);
    } else {
        // All attempts failed
        toast.error("Failed to submit contest after multiple attempts. Please contact support.");
        console.error("Contest submission failed after all attempts");
    }
};

  // Submission Loading Screen
  if (isSubmitting) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center w-full max-w-md">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Attempting to Submit Attempt {submissionAttempt}/6
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Please wait while we process your contest submission...
                </p>
            </div>
        </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const answeredCount = answers.filter(a => a !== null).length;
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;


  // Loading screen for questions
  if (isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 md:p-12 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-2 border-purple-600 mx-auto mb-4 md:mb-6"></div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">Loading Questions</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm md:text-base">Please wait while we fetch the contest questions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 md:p-12 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-red-500 mb-4">
              <Clock className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">Error Loading Contest</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm md:text-base">
              {typeof errorMessage === 'string' ? errorMessage : 'Failed to load contest questions'}
            </p>
            <button
              onClick={() => {
                setErrorMessage(null);
                setIsLoadingQuestions(true);
                getQuestions();
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium text-sm md:text-base"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No questions found
  if (!isLoadingQuestions && questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 md:p-12 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-gray-500 mb-4">
              <Clock className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">No Questions Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm md:text-base">
              This contest doesn't have any questions available yet.
            </p>
            <button
              onClick={() => navigate('/contests')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium text-sm md:text-base"
            >
              Back to Contests
            </button>
          </div>
        </div>
      </div>
    );
  }

 // Thank You Screen with Result Evaluation Loading
if (showThankYou) {
  return (
    <ThankYouScreen/>
)
}
// FIXED LiveContest.jsx - Video Element JSX with enhanced iOS support
const renderVideoElement = () => (
  <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden h-full lg:h-48 max-w-xs mx-auto lg:max-w-none lg:mx-0">
    <video 
      ref={videoRef}
      // iOS CRITICAL attributes
      autoPlay={true}
      muted={true}
      playsInline={true}
      webkit-playsinline="true"
      controls={false}
      preload="metadata"
      // Additional iOS compatibility
      defaultMuted={true}
      disablePictureInPicture={true}
      // Styling
      className="w-full h-full object-cover"
      style={{ 
        transform: 'scaleX(-1)',
        backgroundColor: '#000',
        // iOS hardware acceleration
        WebkitTransform: 'translateZ(0) scaleX(-1)',
        WebkitBackfaceVisibility: 'hidden',
      }}
      // Enhanced event handlers for debugging
      onLoadStart={() => console.log('📹 Video: Load started')}
      onLoadedMetadata={() => console.log('📹 Video: Metadata loaded')}
      onCanPlay={() => console.log('📹 Video: Can play')}
      onPlaying={() => {
        console.log('📹 Video: Playing');
        setPlayFallback(false);
      }}
      onPause={() => console.log('📹 Video: Paused')}
      onError={(e) => {
        console.error('📹 Video error:', e.target.error);
        setFaceMonitorStatus('error');
      }}
      onWaiting={() => console.log('📹 Video: Waiting for data')}
    />
    
    {/* Enhanced iOS fallback button */}
    {playFallback && (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
        <div className="text-center p-4">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm mb-4">Tap to start camera</p>
          <button
            onClick={handleVideoPlayFallback}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md font-medium transition-colors"
          >
            🎥 Start Camera
          </button>
        </div>
      </div>
    )}
    
    {/* Camera status indicators */}
    {!cameraEnabled && (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/75">
        <CameraOff className="h-8 w-8 text-gray-400" />
      </div>
    )}
    
    {cameraEnabled && !playFallback && (
      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium animate-pulse">
        REC
      </div>
    )}
    
    {/* Proctoring status overlay */}
    <div className="absolute bottom-0 left-0 right-0 p-2">
      {renderProctoringStatus()}
    </div>
  </div>
);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header - 10% on mobile, normal on desktop */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 md:px-6 md:py-4 h-[10vh] lg:h-auto flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
              <span className="font-mono text-sm md:text-lg font-bold text-orange-600 dark:text-orange-400">
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Question {currentQuestion + 1} of {totalQuestions}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors font-medium text-xs md:text-sm"
            >
              Submit
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2 md:mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 md:h-2">
            <div 
              className="bg-purple-600 h-1.5 md:h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Camera Feed Section - 30% on mobile, normal width on desktop */}
        <div className="h-[30vh] lg:h-auto lg:w-80 bg-white dark:bg-gray-800 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center">
          <div className="w-full h-full lg:space-y-4">
            {/* Camera Feed */}
            <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden h-full lg:h-48 max-w-xs mx-auto lg:max-w-none lg:mx-0">
              <div className="w-full h-full lg:space-y-4">
                {/* 🎯 This is where you place the call */}
                    {renderVideoElement()}
                </div>
            </div>
          </div>
        </div>

        {/* Question Content - 50% on mobile, flex-1 on desktop */}
        <div className="h-[50vh] lg:h-auto lg:flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Question Text */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-8 shadow-sm border mb-4 md:mb-6 flex-shrink-0">
              <p className="text-base md:text-lg text-gray-900 dark:text-white leading-relaxed">
                {currentQ ? `${currentQuestion + 1}. ${currentQ.questionText || currentQ.question || 'Question text not available'}` : 'Loading question...'}
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 md:space-y-4 flex-1 overflow-y-auto">
              {currentQ?.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 md:p-6 text-left border-2 rounded-xl transition-all touch-manipulation ${
                    selectedAnswer === index
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 text-gray-900 dark:text-white active:scale-95'
                  }`}
                >
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm md:text-base flex-shrink-0 ${
                      selectedAnswer === index
                        ? 'border-purple-500 bg-purple-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="text-sm md:text-lg">{option}</span>
                  </div>
                </button>
              )) || (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {currentQ ? 'No options available for this question' : 'Loading answer options...'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons - 10% on mobile, normal on desktop */}
      <div className="h-[10vh] lg:h-auto bg-white dark:bg-gray-800 border-t lg:border-t-0 border-gray-200 dark:border-gray-700 px-4 py-3 md:px-8 md:py-4 flex items-center justify-center lg:justify-end">
        <div className="flex w-full lg:w-auto space-x-3 max-w-md lg:max-w-none">
          <button
            onClick={handleSkip}
            className="flex-1 lg:flex-none px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium text-sm md:text-base"
          >
            Skip
          </button>
          <button
            onClick={handleSubmitAnswer}
            className="flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm md:text-base"
          >
            <span>{currentQuestion === totalQuestions - 1 ? 'Submit' : 'Next'}</span>
            {currentQuestion < totalQuestions - 1 && <ArrowRight className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submit Contest?</h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                Are you sure you want to submit your contest? This action cannot be undone.
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between text-gray-800 dark:text-white">
                    <span>Answered:</span>
                    <span className="font-medium">{answeredCount}/{totalQuestions}</span>
                  </div>
                  <div className="flex justify-between text-gray-800 dark:text-white">
                    <span>Time Remaining:</span>
                    <span className="font-medium">{formatTime(timeLeft)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-lg transition-colors text-sm md:text-base"
              >
                Continue Contest
              </button>
              <button
                onClick={handleSubmitContest}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors text-sm md:text-base"
              >
                Submit Contest
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );

};

export default LiveContest;
