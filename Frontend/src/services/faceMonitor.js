import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';

let detector;
let video;
let intervalId;
let lastSeenFace = Date.now();

const config = {
  maxYawAngle: 20,            // degrees
  maxMissingDuration: 3000,   // ms
  multipleFaceWarning: true,
  intervalMs: 500             // check frequency
};

export async function startFaceMonitor({ videoEl, onWarning, onClear }) {
  video = videoEl;
  await loadModel();

  intervalId = setInterval(async () => {
    if (!video || video.readyState < 2) return;

    const faces = await detector.estimateFaces(video);

    if (faces.length === 0) {
      const timeSinceSeen = Date.now() - lastSeenFace;
      if (timeSinceSeen > config.maxMissingDuration) {
        onWarning('⚠️ Face not detected. Please stay in front of the camera.');
      }
    } else {
      lastSeenFace = Date.now();

      if (faces.length > 1 && config.multipleFaceWarning) {
        onWarning('⚠️ Multiple faces detected. This is not allowed.');
        return;
      }

      const face = faces[0];
      const yaw = estimateYaw(face);

      if (Math.abs(yaw) > config.maxYawAngle) {
        onWarning('⚠️ Please face the screen directly.');
      } else {
        onClear();
      }
    }
  }, config.intervalMs);
}

export function stopFaceMonitor() {
  clearInterval(intervalId);
  intervalId = null;
}

async function loadModel() {
  if (!detector) {
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
    };
    detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
  }
}

function estimateYaw(face) {
  const keypoints = face.keypoints;

  const leftEye = keypoints.find(k => k.name === 'leftEye');
  const rightEye = keypoints.find(k => k.name === 'rightEye');
  const nose = keypoints.find(k => k.name === 'noseTip');

  if (!leftEye || !rightEye || !nose) return 0;

  const midEyeX = (leftEye.x + rightEye.x) / 2;
  const dx = nose.x - midEyeX;

  return (dx / (rightEye.x - leftEye.x)) * 30;
}
