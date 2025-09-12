import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    Trophy,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { useExamProtection } from "../hooks/useExamProtection";

const WaitingRoom = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userInfo = useRef();
  const [contestInfo, setContestInfo] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [timeLeft, setTimeLeft] = useState(null);
  const [participants, setParticipants] = useState(0);
  const [cameraPermission, setCameraPermission] = useState("prompt"); // prompt | granted | denied | requesting
  const [cameraError, setCameraError] = useState("");

  useExamProtection((msg) => toast.error(msg));

  const videoRef = useRef(null);

  // Request camera permission (no preview, just check access)
  const requestCameraPermission = async () => {
    try {

        const video = videoRef.current;
        
       if (!video) return;
       
       setCameraError("");
      setCameraPermission("requesting");

      // iOS Safari fix
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

     const constraints = { audio: false, video: { facingMode: "user" } };

        navigator.mediaDevices
        .getUserMedia(constraints)
        .then((localMediaStream) => {
            if ("srcObject" in video) {
            video.srcObject = localMediaStream;
            } else {
            video.src = window.URL.createObjectURL(localMediaStream);
            }
            video.play();
        })
        .catch((err) => {
            console.error("❌ Camera error:", err);
            toast.error("Unable to access camera. Please allow camera permission.");
        });

      setCameraPermission("granted");
      console.log("✅ Camera permission granted");
    } catch (err) {
      console.error("❌ Camera permission error:", err);
      setCameraPermission("denied");
      setCameraError(err.message);
    }
  };

  // Initialize user + contest info
  useEffect(() => {
    try {
      const storedUserInfo = localStorage.getItem("userInfo");
      const storedContestInfo = localStorage.getItem("contestInfo");

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
      console.error("Error parsing stored data:", error);
      setIsInitialized(true);
    }
  }, []);

  // Socket connection
  useEffect(() => {
    if (!isInitialized || !contestInfo || !userInfo.current) return;

    const socket = io(import.meta.env.VITE_WEBSOCKET_URL, {
      path: "/ws/",
      transports: ["websocket"],
      auth: { token: localStorage.getItem("authToken") },
    });

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
      socket.emit("join-waiting-room", {
        contestId: contestInfo.slug,
        userId: userInfo.current.registrationId,
        startTime: contestInfo.startTime,
      });
    });

    socket.on("participant-joined", () => {
      setParticipants((prev) => prev + 1);
    });

    socket.on("participant-left", () => {
      setParticipants((prev) => Math.max(prev - 1, 0));
    });

    socket.on("quiz-started", ({ contestId }) => {
      navigate(`/contest/live/${contestId}`, {
        state: { contestInfo, userInfo: userInfo.current },
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected");
    });

    return () => {
      socket.emit("leave-waiting-room", {
        contestId: contestInfo.slug,
        userId: userInfo.current.registrationId,
      });
      socket.disconnect();
    };
  }, [isInitialized, contestInfo, navigate]);

  // Timer
  useEffect(() => {
    if (!isInitialized || !contestInfo) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const contestStart = new Date(contestInfo.startTime).getTime();
      const difference = contestStart - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds, total: difference };
      }
      return null;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const time = calculateTimeLeft();
      setTimeLeft(time);

      if (!time) {
        clearInterval(timer);
        handleContestStart();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isInitialized, contestInfo]);

  const handleContestStart = useCallback(() => {
    if (!contestInfo) return;
    navigate(`/contest/live/${contestInfo.slug}`, {
      state: { contestInfo, userInfo: userInfo.current },
    });
  }, [contestInfo, navigate]);

  const handleBackToJoin = useCallback(() => {
    navigate("/contest/join");
  }, [navigate]);

  const formatTimeUnit = (value) => value.toString().padStart(2, "0");

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBackToJoin}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Back to Join</span>
          </button>

          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Waiting Room
          </h1>

          <div className="w-20"></div>
        </div>

        <div className="space-y-4">
            <video ref={videoRef} > </video>
          {/* Status */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-800 dark:text-green-300">
                You're in the Waiting Room!
              </span>
            </div>
            <div className="text-sm text-green-700 dark:text-green-400">
              Contest will start automatically when the timer reaches zero.
            </div>
          </div>

          {/* Timer */}
          {timeLeft && (
            <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg p-3 text-white text-center shadow-lg">
              <div className="flex items-center justify-center space-x-1 mb-2">
                <Clock className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Contest Starts In</h3>
              </div>
              <div className="grid grid-cols-4 gap-1 mb-2 max-w-xs mx-auto">
                <div className="bg-white/20 rounded p-1.5">
                  <div className="text-sm font-bold">
                    {formatTimeUnit(timeLeft.days)}
                  </div>
                  <div className="text-xs opacity-90">Days</div>
                </div>
                <div className="bg-white/20 rounded p-1.5">
                  <div className="text-sm font-bold">
                    {formatTimeUnit(timeLeft.hours)}
                  </div>
                  <div className="text-xs opacity-90">Hours</div>
                </div>
                <div className="bg-white/20 rounded p-1.5">
                  <div className="text-sm font-bold">
                    {formatTimeUnit(timeLeft.minutes)}
                  </div>
                  <div className="text-xs opacity-90">Min</div>
                </div>
                <div className="bg-white/20 rounded p-1.5">
                  <div className="text-sm font-bold">
                    {formatTimeUnit(timeLeft.seconds)}
                  </div>
                  <div className="text-xs opacity-90">Sec</div>
                </div>
              </div>
              <div className="text-xs opacity-90">
                Auto-start when timer reaches zero
              </div>
            </div>
          )}

          {/* Contest Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                <Trophy className="h-4 w-4" />
                <span>Contest</span>
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {contestInfo.title}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Start Time</span>
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(contestInfo.startTime).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Duration</span>
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {contestInfo.duration} minutes
              </span>
            </div>
          </div>

          {/* System Check */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              System Check
            </h4>
            <div className="text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Connection
                </span>
                <span className="text-green-600 dark:text-green-400 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs">Connected</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Camera
                </span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs ${
                      cameraPermission === "granted"
                        ? "text-green-600 dark:text-green-400"
                        : cameraPermission === "denied"
                        ? "text-red-600 dark:text-red-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {cameraPermission === "granted"
                      ? "Ready"
                      : cameraPermission === "denied"
                      ? "Denied"
                      : "Required"}
                  </span>
                  {(cameraPermission === "prompt" ||
                    cameraPermission === "denied") && (
                    <button
                      onClick={requestCameraPermission}
                      disabled={cameraPermission === "requesting"}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                    >
                      {cameraPermission === "requesting" ? "Wait..." : "Enable"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {cameraError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
              <strong>Error:</strong> {cameraError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
