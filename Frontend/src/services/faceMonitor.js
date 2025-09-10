// services/faceMonitor.js
import '@mediapipe/face_mesh';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';

let detector;
let video;
let intervalId;
let lastSeenFace = Date.now();
let lastBlinkTime = Date.now();
let lastFaceX = null;

const config = {
  maxYawAngle: 90,            
  maxMissingDuration: 10000,  
  multipleFaceWarning: true,  
  intervalMs: 10000,           
  requireBlink: true          
};

// Start monitoring a video feed for a single, real face
export async function startFaceMonitor({ videoEl, onWarning, onClear }) {
  video = videoEl;
  await loadModel();

  intervalId = setInterval(async () => {
    if (!video || video.readyState < 2) return;

    const faces = await detector.estimateFaces(video);

    // No face
    if (faces.length === 0) {
      const timeSinceSeen = Date.now() - lastSeenFace;
      if (timeSinceSeen > config.maxMissingDuration) {
        onWarning('⚠️ No face detected. Please stay in front of the camera.');
      }
      return;
    }

    // Multiple faces
    if (faces.length > 1 && config.multipleFaceWarning) {
      onWarning('⚠️ Multiple faces detected. Only one person is allowed.');
      return;
    }

    // Single face
    lastSeenFace = Date.now();
    const face = faces[0];

    // Head  check
    const yaw = estimateYaw(face);
    if (Math.abs(yaw) > config.maxYawAngle) {
      onWarning('⚠️ Please face the screen directly.');
      return;
    }

    // Liveness check
    // if (config.requireBlink && !isAlive(face)) {
    //   onWarning('⚠️ Liveness not detected. Please avoid using photos.');
    //   return;
    // }

    // OK
    onClear();
  }, config.intervalMs);
}

//  Stop monitoring
export function stopFaceMonitor() {
  clearInterval(intervalId);
  intervalId = null;
}

// Load MediaPipe FaceMesh model
async function loadModel() {
  if (!detector) {
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
      runtime: 'mediapipe',
      maxFaces: 1,
      refineLandmarks: true ,
      solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh`,
    };
    detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
  }
}

//  Estimate yaw (left/right head turn)
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

//  Detect blink or micro-movement to confirm liveness
function isAlive(face) {
  if (detectBlink(face)) {
    lastBlinkTime = Date.now();
    return true;
  }

  // If no blink for >10s -> suspicious
  if (Date.now() - lastBlinkTime > 10000) {
    return false;
  }

  // Micro-movement 
  const nose = face.keypoints.find(k => k.name === 'noseTip');
  if (nose) {
    if (lastFaceX === null) {
      lastFaceX = nose.x;
      return true;
    }
    const movement = Math.abs(nose.x - lastFaceX);
    lastFaceX = nose.x;

    if (movement > 0.5) return true; // natural small jitter
  }

  return true;
}

// Detect blink using eye landmarks
function detectBlink(face) {
  const leftEyeTop = face.keypoints.find(k => k.name === 'leftEyeUpper0');
  const leftEyeBottom = face.keypoints.find(k => k.name === 'leftEyeLower0');
  const rightEyeTop = face.keypoints.find(k => k.name === 'rightEyeUpper0');
  const rightEyeBottom = face.keypoints.find(k => k.name === 'rightEyeLower0');

  if (!leftEyeTop || !leftEyeBottom || !rightEyeTop || !rightEyeBottom) return false;

  const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
  const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);

  const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;

  // If eyes "shrink" suddenly (closed) -> blink detected
  return avgEyeHeight < 2; // threshold (tune based on resolution)
}
