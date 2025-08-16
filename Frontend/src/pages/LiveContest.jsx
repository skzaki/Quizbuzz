import { ArrowRight, CameraOff, Clock, Star, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { startFaceMonitor, stopFaceMonitor } from '../services/faceMonitor.js';

const LiveContest = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(7200); // 2 hours in seconds
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proctoringWarning, setProctoringWarning] = useState('');
  const [warningCount, setWarningCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState();
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  
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
    const response = await fetch(`${import.meta.env.VITE_URL}/api/contests/${contestInfo.current.slug}/questions`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

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
    console.error('Unexpected questions format:', data);
    }

    setQuestions(questionsArray);
    setAnswers(new Array(questionsArray.length).fill(null));
    setIsLoadingQuestions(false);


  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    setErrorMessage(error.message);
    setIsLoadingQuestions(false);
  }
};

  
 // WebSocket
  useEffect(() => {

    userInfo.current = JSON.parse(localStorage.getItem('userInfo'));
    contestInfo.current = JSON.parse(localStorage.getItem('contestInfo'));
    getQuestions(); // get the questions

    socketRef.current = io(import.meta.env.VITE_WEBSOCKET_URL || "http://localhost:8080", {
        transports: ["websocket"],
        auth: { token: localStorage.getItem("authToken") }
    });

    socketRef.current.on("connect", () => {
        console.log("✅ Live contest socket connected", socketRef.current.id);
        socketRef.current.emit("join-waiting-room", {
            contestId: contestInfo.current.slug,
            userId: userInfo.current.registrationId,
            startTime: Date.now()
        });
    });

    socketRef.current.on("resume-quiz", (savedState) => {
        setCurrentQuestion(savedState.currentQuestion);
        console.log("🔄 Resuming quiz:", savedState);
    });

    socketRef.current.on("proctoring-alert", (data) => {
        console.warn("⚠️ Proctoring alert:", data);
    });

    socketRef.current.on("contest-update", (data) => {
        console.log("📢 Contest update:", data);
    });

    // const heartbeat = setInterval(() => {
    //     socketRef.current.emit("heartbeat", {
    //         contestId: contestInfo.current.slug,
    //         userId: userInfo.current.registrationId,
    //         questionIndex: currentQuestion // Replace with your current question state
    //     });
    // }, 30000);

    return () => {
        /// clearInterval(heartbeat);
        socketRef.current.disconnect();
    };
}, []);

 

  const totalQuestions = questions.length;

  // Initialize camera and WebSocket connection
  useEffect(() => {
    initializeProctoring();
    
    return () => {
      console.log('Cleaning up proctoring resources...');
      
      // Stop face monitoring first
      try {
        stopFaceMonitor();
      } catch (error) {
        console.warn('Error stopping face monitor:', error);
      }
      
      // Stop media tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.warn('Error stopping media track:', error);
          }
        });
      }
    };
  }, []);

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

  // Auto-save and proctoring monitoring
  useEffect(() => {
    // Auto-save answers every 30 seconds
    const autoSave = setInterval(() => {
      saveAnswersToAPI();
    }, 60000);


    return () => {
      clearInterval(autoSave);
    };
  }, [answers]);

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
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [proctoringWarning, faceMonitorStatus]);

  

  // API CALLS - Contest Management
  const saveAnswersToAPI = async () => {
    try {
      // API call to save current progress
      /*
      const response = await fetch(`/api/contests/${id}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          contestId: id,
          answers: answers,
          currentQuestion: currentQuestion,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save progress');
      }
      */
      console.log('Auto-saving answers:', answers);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };



  // Enhanced camera initialization for proctoring
  const initializeProctoring = async () => {
    try {
      setFaceMonitorStatus('loading');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true
      });

      setMediaStream(stream);
      setCameraEnabled(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be fully ready
        const initializeFaceMonitor = () => {
          return new Promise((resolve, reject) => {
            const video = videoRef.current;
            
            if (video.readyState >= 2) {
              // Video is already ready
              resolve();
            } else {
              // Wait for video to load
              const onLoadedData = () => {
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('error', onError);
                resolve();
              };
              
              const onError = () => {
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('error', onError);
                reject(new Error('Video failed to load'));
              };
              
              video.addEventListener('loadeddata', onLoadedData);
              video.addEventListener('error', onError);
              
              // Timeout after 10 seconds
              setTimeout(() => {
                video.removeEventListener('loadeddata', onLoadedData);
                video.removeEventListener('error', onError);
                reject(new Error('Video loading timeout'));
              }, 10000);
            }
          });
        };

        try {
          await initializeFaceMonitor();
          
            await startFaceMonitor({
            videoEl: videoRef.current,
            onWarning: (msg) => {
                setProctoringWarning(msg);
                setFaceMonitorStatus('warning');

                setWarningCount(prev => {
                const newCount = prev + 1;
                if (newCount >= 7) {
                    handleSubmitContest();
                } else if ([3, 2, 1].includes(7 - newCount)) {
                    alert(`You have last ${7 - newCount} warning(s) left & after that quiz will be auto submit`);
                }
                return newCount;
                });
            },
            onClear: () => {
                setProctoringWarning('');
                setFaceMonitorStatus('active');
            }
            });
          
          setFaceMonitorStatus('active');
          console.log('Face monitoring started successfully');
          
        } catch (faceMonitorError) {
          console.error('Face monitoring failed:', faceMonitorError);
          setFaceMonitorStatus('error');
          setProctoringWarning('⚠️ Face monitoring unavailable - please refresh the page');
        }
      }

    
      
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      setFaceMonitorStatus('error');
      
      // More specific error messages
      if (error.name === 'NotAllowedError') {
        setProctoringWarning('⛔ Camera access denied. Please allow camera permissions and refresh.');
      } else if (error.name === 'NotFoundError') {
        setProctoringWarning('⛔ No camera found. Please connect a camera and refresh.');
      } else if (error.name === 'NotReadableError') {
        setProctoringWarning('⛔ Camera is being used by another application. Please close other apps and refresh.');
      } else {
        setProctoringWarning('⛔ Failed to access camera. Please check your device and refresh.');
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
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
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
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
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
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs md:text-sm text-green-700 dark:text-green-400 font-medium">
              Monitoring Active
            </span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            Your session is being monitored for security
          </p>
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

    // Emit save-progress to backend
    if (socketRef.current) {
       // Create structured answers array
        const structuredAnswers = answers.map((answer, index) => ({
            questionId: questions[index]._id, // ObjectId of the question
            answer: answer, // The answer as string (could be option text, index as string, etc.)
            submittedAt: new Date()
        })).filter(answer => answer.answer !== null && answer.answer !== undefined && answer.answer !== "");

        socketRef.current.emit("save-progress", {
            contestId: contestInfo.current.slug, // ObjectId instead of slug
            userId: userInfo.current.registrationId,       // ObjectId instead of registrationId
            currentQuestion,
            answers: structuredAnswers
        });
      console.log(`💾 Progress emitted for Q${currentQuestion}`);
    }
  }

  if (currentQuestion < totalQuestions - 1) {
    goToQuestion(currentQuestion + 1);
  }
};

  const handleSkip = () => {
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
    
    try {
    // TODO:
      /*
      // Final API call to submit contest
      const response = await fetch(`/api/contests/${userInfo.current.registrationId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          contestId: contestInfo.current.slug,
          answers: answers,
          submissionTime: new Date().toISOString(),
          timeSpent: 7200 - timeLeft,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit contest');
      }

      const result = await response.json();
      console.log('Contest submitted successfully:', result);
      */
      
      // Simulate submission processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('Error submitting contest:', error);
    } finally {
      setIsSubmitting(false);
      setShowThankYou(true);
      
      // Cleanup resources
      try {
        stopFaceMonitor();
      } catch (error) {
        console.warn('Error stopping face monitor:', error);
      }
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      // Auto redirect after 30 seconds
      setTimeout(() => {
        navigate('/contest/result/');
      }, 30000);
    }
  };
  const currentQ = questions[currentQuestion];
  const answeredCount = answers.filter(a => a !== null).length;
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;
  
  
// Add this right before your question display JSX

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

  // Thank You Screen
  if (showThankYou) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-12 shadow-xl border border-gray-200 dark:border-gray-700">
            {/* Success Animation */}
            <div className="mb-6 md:mb-8 text-center">
              <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-4 md:p-6 w-16 h-16 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 animate-bounce">
                <Trophy className="h-8 w-8 md:h-12 md:w-12 text-green-600 dark:text-green-400 mx-auto" />
              </div>
              <div className="flex justify-center space-x-2 mb-4">
                <Star className="h-5 w-5 md:h-6 md:w-6 text-yellow-500 animate-pulse" />
                <Star className="h-5 w-5 md:h-6 md:w-6 text-yellow-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <Star className="h-5 w-5 md:h-6 md:w-6 text-yellow-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
                Thank You!
              </h1>
              <h2 className="text-lg md:text-2xl font-semibold text-purple-600 dark:text-purple-400 mb-4 md:mb-6">
                Contest Submitted Successfully
              </h2>
              
              <div className="space-y-3 md:space-y-4">
                <p className="text-base md:text-lg text-gray-700 dark:text-gray-300">
                  Your answers have been recorded and your submission is complete.
                </p>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                  We're processing your results and will notify you once they're ready.
                </p>
              </div>
            </div>

            {/* Contest Summary */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4 text-center">Contest Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">{answeredCount}</div>
                  <div className="text-gray-600 dark:text-gray-400">Questions Answered</div>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{totalQuestions}</div>
                  <div className="text-gray-600 dark:text-gray-400">Total Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatTime(7200 - timeLeft)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Time Taken</div>
                </div>
              </div>
            </div>

            {/* Results Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm md:text-base">Results Declaration</h4>
              </div>
              <p className="text-blue-800 dark:text-blue-300 text-xs md:text-sm">
                Contest results will be declared within <strong>24 hours</strong>. You'll receive an email notification 
                and can check your results in the dashboard. Rankings and certificates will be available once all 
                participants have completed the contest.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 md:gap-4">
              <button
                onClick={() => navigate('/contest/result')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium text-sm md:text-base"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate('/contest/result')}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 px-6 py-3 rounded-lg transition-colors font-medium text-sm md:text-base"
              >
                View Other Contests
              </button>
            </div>

            {/* Auto Redirect Notice */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 md:mt-6 text-center">
              You'll be automatically redirected to the dashboard in a few seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Submission Loading Screen
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 md:p-12 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-2 border-purple-600 mx-auto mb-4 md:mb-6"></div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">Submitting Your Contest</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm md:text-base">Please wait while we process your answers...</p>
            <p className="text-xs md:text-sm text-purple-600 dark:text-purple-400">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 md:px-6 md:py-4">
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
            <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              {answeredCount}/{totalQuestions}
            </div>
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors font-medium text-xs md:text-sm"
            >
              Submit
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 md:mt-4">
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
        {/* Camera Feed Section */}
        <div className="lg:w-80 bg-white dark:bg-gray-800 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-4">
            {/* Camera Feed */}
            <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline
                    className="w-full h-32 md:h-48 object-cover"
                    style={{ transform: 'scaleX(-1)' }} />
                {!cameraEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                    <CameraOff className="h-8 w-8 text-gray-400" />
                    </div>
                )}
                {cameraEnabled && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">REC</div>
                )}
                {/* Overlay proctoring status */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                    {renderProctoringStatus()}
                </div>
            </div>
           
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
                    
            {/* Question Text */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-8 shadow-sm border mb-6">
              <p className="text-base md:text-lg text-gray-900 dark:text-white leading-relaxed">
                {currentQ ? `${currentQuestion + 1}. ${currentQ.questionText || currentQ.question || 'Question text not available'}` : 'Loading question...'}
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
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
                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm md:text-base ${
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

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
              <div className="flex w-full sm:w-auto space-x-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 sm:flex-none px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium text-sm md:text-base"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmitAnswer}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm md:text-base"
                >
                  <span>{currentQuestion === totalQuestions - 1 ? 'Submit' : 'Next'}</span>
                  {currentQuestion < totalQuestions - 1 && <ArrowRight className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submit Contest?</h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                Are you sure you want to submit your contest? This action cannot be undone.
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Answered:</span>
                    <span className="font-medium">{answeredCount}/{totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
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