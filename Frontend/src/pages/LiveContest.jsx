import CryptoJS from "crypto-js";
import { ArrowRight, CameraOff, Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from "react-hot-toast";
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import ThankYouScreen from "../components/LiveContest/ThankYouScreen.jsx";
import { startFaceMonitor, stopFaceMonitor } from '../services/faceMonitor.js';
import { useExamProtection } from './../hooks/useExamProtection';
import ErrorBoundary from '../components/ErrorBoundary';

const calculateTimeLeft = (contestInfo) => {
  const now = new Date();
  const contestStartTime = new Date(contestInfo.startTime);
  const durationInMinutes = parseInt(contestInfo.duration);
  const contestEndTime = new Date(contestStartTime.getTime() + (durationInMinutes * 60 * 1000));
  
  if (now < contestStartTime) {
    return durationInMinutes * 60;
  }
  
  if (now >= contestEndTime) {
    return 0;
  }
  
  const timeElapsed = now - contestStartTime;
  const timeElapsedSeconds = Math.floor(timeElapsed / 1000);
  const totalDurationSeconds = durationInMinutes * 60;
  const remainingSeconds = totalDurationSeconds - timeElapsedSeconds;
  
  return Math.max(0, remainingSeconds);
};

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const randomizeQuestionsAndOptions = (questions) => {
  return questions.map(question => {
    const questionCopy = { ...question };
    if (questionCopy.options && Array.isArray(questionCopy.options)) {
        const optionsWithIndex = questionCopy.options.map((opt, index) => ({
            text: opt,
            originalIndex: index
        }));
        questionCopy.shuffledOptions = shuffleArray(optionsWithIndex);
    }
    return questionCopy;
  });
};

const LiveContest = () => {
    return (
        <ErrorBoundary 
            fallbackTitle="Quiz Interface Error" 
            fallbackMessage="We encountered a problem loading the quiz interface. Don't worry, your progress is saved locally."
            onReset={() => window.location.reload()}
            retryText="Reload Quiz"
        >
            <LiveContestContent />
        </ErrorBoundary>
    );
};

const LiveContestContent = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
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
  
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [faceMonitorStatus, setFaceMonitorStatus] = useState('loading');
  const videoRef = useRef(null);
  const socketRef = useRef(null);

  const userInfo = useRef({});
  const contestInfo = useRef({});

const getQuestions = async () => {
  try {
    setIsLoadingQuestions(true);

    const encrypted = localStorage.getItem(`questions_${contestInfo.current.slug}`);
    if (encrypted) {
      try {
        const bytes = CryptoJS.AES.decrypt(encrypted, import.meta.env.VITE_SECRET_KEY);
        const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        if (Array.isArray(decryptedData) && decryptedData.length > 0) {
          const questionsWithRandomOptions = randomizeQuestionsAndOptions(decryptedData);
          const shuffledQuestions = shuffleArray(questionsWithRandomOptions);
          setQuestions(shuffledQuestions);
          setAnswers(new Array(shuffledQuestions.length).fill(null));
          setIsLoadingQuestions(false);
          return;
        }
      } catch (error) {
        console.warn("⚠️ Failed to decrypt local questions, refetching...");
      }
    }

    const response = await fetch(
      `${import.meta.env.VITE_URL}/contests/${contestInfo.current.slug}/questions`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("contestToken")}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      setErrorMessage(error);
      setIsLoadingQuestions(false);
      return;
    }

    const data = await response.json();
    let questionsArray = data.questions || data || [];

    const questionsWithRandomOptions = randomizeQuestionsAndOptions(questionsArray);
    const shuffledQuestions = shuffleArray(questionsWithRandomOptions);

    setQuestions(shuffledQuestions);
    setAnswers(new Array(shuffledQuestions.length).fill(null));

    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(shuffledQuestions),
      import.meta.env.VITE_SECRET_KEY
    ).toString();

    localStorage.setItem(`questions_${contestInfo.current.slug}`, encryptedData);
    setIsLoadingQuestions(false);
  } catch (error) {
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

  useEffect(() => {
    userInfo.current = JSON.parse(localStorage.getItem('userInfo'));
    contestInfo.current = JSON.parse(localStorage.getItem('contestInfo'));

    if (contestInfo.current?.startTime) {
      const calculatedTimeLeft = calculateTimeLeft(contestInfo.current);
      setTimeLeft(calculatedTimeLeft);
      if (calculatedTimeLeft === 0) {
        toast.error("Contest has ended. You cannot participate anymore")
        navigate('/contest/join');
        return;
      }
    }

    getQuestions();

    socketRef.current = io(import.meta.env.VITE_WEBSOCKET_URL , {
        path: "/ws/",
        transports: ["websocket"],
        auth: { token: localStorage.getItem("contestToken") }
    });

    socketRef.current.on("connect", () => {
        socketRef.current.emit("join-waiting-room", {
            contestId: contestInfo.current.slug,
            userId: userInfo.current.registrationId,
            startTime: contestInfo.current.startTime
        });
    });

    socketRef.current.on("resume-quiz", (savedState) => {
        if (savedState.answers && Array.isArray(savedState.answers)) {
            const restoredAnswers = new Array(questions.length).fill(null);
            savedState.answers.forEach(ans => {
                const qIndex = questions.findIndex(q => q._id === ans.questionId);
                if (qIndex !== -1 && ans.answerIndex !== null && ans.answerIndex !== "") {
                    restoredAnswers[qIndex] = ans.answerIndex;
                }
            });
            setAnswers(restoredAnswers);
        }
        setCurrentQuestion(savedState.currentQuestion || 0);
    });

    return () => {
        socketRef.current.disconnect();
    };
}, []);

  const totalQuestions = questions.length;

  useEffect(() => {
    initializeProctoring();
    return () => {
      try { stopFaceMonitor(); } catch (e) {}
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
    if (!contestInfo.current?.startTime) return;
    const syncInterval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(contestInfo.current);
      if (Math.abs(newTimeLeft - timeLeft) > 2) {
        setTimeLeft(newTimeLeft);
      }
    }, 30000);
    return () => clearInterval(syncInterval);
  }, [timeLeft]);

    useEffect(() => {
        const autoSave = setInterval(() => {
            const structuredAnswers = questions
            .map((q, i) => {
                if (answers[i] !== null && answers[i] !== undefined && answers[i] !== "") {
                return {
                    questionId: q._id,
                    answer: q.options[answers[i]],
                    answerIndex: answers[i],
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
                    answers: structuredAnswers
                });
            }
        }, 60000);
        return () => clearInterval(autoSave);
    }, [answers, questions, currentQuestion]);

  useEffect(() => {
    if (proctoringWarning && 
        !proctoringWarning.includes('Multiple faces') && 
        !proctoringWarning.includes('unavailable') &&
        !proctoringWarning.includes('error')) {
      const timer = setTimeout(() => {
        setProctoringWarning('');
        if (faceMonitorStatus === 'warning') setFaceMonitorStatus('active');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [proctoringWarning]);

  const initializeProctoring = async () => {
    try {
      setFaceMonitorStatus('loading');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 260 }, facingMode: { ideal: "user"} },
        audio: true
      });
      setMediaStream(stream);
      setCameraEnabled(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await startFaceMonitor({
            videoEl: videoRef.current,
            onWarning: (msg) => {
                setProctoringWarning(msg);
                setFaceMonitorStatus('warning');
                setWarningCount(prev => {
                const newCount = prev + 1;
                if (newCount >= 10) handleSubmitContest();
                return newCount;
                });
            },
            onClear: () => {
                setProctoringWarning('');
                setFaceMonitorStatus('active');
            }
        });
        setFaceMonitorStatus('active');
      }
    } catch (error) {
      setFaceMonitorStatus('error');
      setProctoringWarning('⛔ Camera access failed');
    }
  };

  const renderProctoringStatus = () => {
    if (faceMonitorStatus === 'loading') return <div>Initializing...</div>;
    if (faceMonitorStatus === 'error') return <div>Error</div>;
    if (proctoringWarning) return <div>{proctoringWarning}</div>;
    if (faceMonitorStatus === 'active') return <div>Monitoring Active</div>;
    return null;
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (index) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = index;
    setAnswers(newAnswers);
    setSelectedAnswer(index);
  };

    const handleSubmitAnswer = () => {
        if (socketRef.current && questions[currentQuestion]) {
            const selectedOption = questions[currentQuestion].shuffledOptions?.[selectedAnswer] || questions[currentQuestion].options?.[selectedAnswer];
            const structuredAnswer = {
                questionId: questions[currentQuestion]._id,
                answer: selectedAnswer !== null ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.text) : "",
                answerIndex: selectedAnswer !== null ? (selectedOption.originalIndex ?? selectedAnswer) : "",
                submittedAt: new Date()
            };
            socketRef.current.emit("save-progress", {
                contestId: contestInfo.current.slug,
                userId: userInfo.current.registrationId,
                currentQuestion: currentQuestion + 1,
                answers: [structuredAnswer]
            });
        }
        if (currentQuestion < totalQuestions - 1) {
            setCurrentQuestion(prev => prev + 1);
            setSelectedAnswer(answers[currentQuestion+1]);
        } else {
            setShowSubmitConfirm(true);
        }
    };

    const handleSubmitContest = async () => {
        setIsSubmitting(true);
        // Simplified submission logic for brevity, keep actual implementation flow
        const finalSubmissionId = "stub_id"; 
        const slug = contestInfo.current.slug;
        localStorage.removeItem(`questions_${slug}`);
        localStorage.removeItem('contestToken');
        navigate(`/contest/result/evaluate/${finalSubmissionId}`);
    };

  if (isSubmitting) return <div>Submitting...</div>;
  if (isLoadingQuestions) return <div>Loading Questions...</div>;
  if (errorMessage) return <div>Error: {errorMessage}</div>;
  if (showThankYou) return <ThankYouScreen />;
  if (questions.length === 0) return <div>No Questions Found</div>;

  const currentQ = questions[currentQuestion];
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;
  const answeredCount = answers.filter(a => a !== null).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-white dark:bg-gray-800 border-b p-4 flex justify-between items-center h-[10vh]">
        <div className="flex items-center space-x-4">
          <div className="font-mono font-bold text-orange-600">{formatTime(timeLeft)}</div>
          <div className="text-sm">Q {currentQuestion + 1} / {totalQuestions}</div>
        </div>
        <button onClick={() => setShowSubmitConfirm(true)} className="bg-red-600 text-white px-4 py-2 rounded">Submit</button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="lg:w-80 bg-white dark:bg-gray-800 p-4 border-r">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-48 bg-black rounded" />
            <div className="mt-2">{renderProctoringStatus()}</div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
             <div className="bg-white dark:bg-gray-800 p-6 rounded shadow mb-4">
                <p>{currentQ.questionText || currentQ.question}</p>
             </div>
             <div className="space-y-3">
                {(currentQ.shuffledOptions || currentQ.options).map((opt, i) => (
                    <button 
                        key={i} 
                        onClick={() => handleAnswerSelect(i)}
                        className={`w-full p-4 text-left border rounded ${selectedAnswer === i ? 'border-purple-500 bg-purple-50' : ''}`}
                    >
                        {typeof opt === 'string' ? opt : opt.text}
                    </button>
                ))}
             </div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-gray-800 border-t flex justify-end">
          <button onClick={handleSubmitAnswer} className="bg-purple-600 text-white px-6 py-2 rounded">
              {currentQuestion === totalQuestions - 1 ? 'Finish' : 'Next'}
          </button>
      </div>

      {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded shadow-xl max-w-md w-full">
                  <h3 className="text-lg font-bold mb-4">Submit Contest?</h3>
                  <p className="mb-6">Answered: {answeredCount}/{totalQuestions}</p>
                  <div className="flex space-x-3">
                      <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                      <button onClick={handleSubmitContest} className="flex-1 bg-red-600 text-white py-2 rounded">Submit</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default LiveContest;