import { CameraOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { startFaceMonitor, stopFaceMonitor } from "../../services/faceMonitor";

const ProctoringCamera = ({ onWarning, onAutoSubmit }) => {
  const webcamRef = useRef(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [status, setStatus] = useState("loading"); // loading, active, warning, error
  const [warningCount, setWarningCount] = useState(0);
  const [proctoringWarning, setProctoringWarning] = useState("");

  useEffect(() => {
    if (webcamRef.current && webcamRef.current.video) {
      const videoEl = webcamRef.current.video;

      startFaceMonitor({
        videoEl,
        onWarning: (msg) => {
          setProctoringWarning(msg);
          setStatus("warning");

          setWarningCount((prev) => {
            const newCount = prev + 1;
            if (newCount >= 7) {
              onAutoSubmit();
            }
            return newCount;
          });

          if (onWarning) onWarning(msg);
        },
        onClear: () => {
          setProctoringWarning("");
          setStatus("active");
        },
      })
        .then(() => {
          setCameraEnabled(true);
          setStatus("active");
        })
        .catch((err) => {
          console.error("Face monitor failed:", err);
          setStatus("error");
        });
    }

    return () => {
      stopFaceMonitor();
    };
  }, [onAutoSubmit, onWarning]);

  return (
    <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
      <Webcam
        ref={webcamRef}
        audio={true}
        mirrored={true}
        videoConstraints={{
          facingMode: { exact: "user" }, // ✅ Force front cam
          width: 320,
          height: 240,
        }}
        className="w-full h-32 md:h-48 object-cover"
      />
      {!cameraEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <CameraOff className="h-8 w-8 text-gray-400" />
        </div>
      )}
      {cameraEnabled && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
          REC
        </div>
      )}

      {/* Overlay status/warning */}
      {proctoringWarning && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-red-500 text-white text-xs">
          {proctoringWarning}
        </div>
      )}
    </div>
  );
};

export default ProctoringCamera;
