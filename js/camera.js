/**
 * camera.js — Camera API management for AR background
 */

export let currentFacingMode = 'environment';

/**
 * Initialize the device camera and stream to a <video> element.
 * @param {HTMLVideoElement} videoElement
 * @param {string} [facingMode]
 * @returns {Promise<MediaStream>}
 */
export async function initCamera(videoElement, facingMode = currentFacingMode) {
  currentFacingMode = facingMode;
  const constraints = {
    video: {
      facingMode: currentFacingMode,
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    },
    audio: false
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoElement.srcObject = stream;

  // Mirror front camera feed for natural selfie interaction
  if (currentFacingMode === 'user') {
    videoElement.style.transform = 'scaleX(-1)';
  } else {
    videoElement.style.transform = 'scaleX(1)';
  }

  // Wait for video to actually start playing
  await new Promise((resolve, reject) => {
    videoElement.onloadedmetadata = () => {
      videoElement.play().then(resolve).catch(reject);
    };
    // Timeout fallback
    setTimeout(resolve, 3000);
  });

  return stream;
}

/**
 * Toggle between front and rear cameras.
 * @param {HTMLVideoElement} videoElement
 * @param {MediaStream} currentStream
 * @returns {Promise<MediaStream>}
 */
export async function toggleCamera(videoElement, currentStream) {
  stopCamera(currentStream);
  const nextMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  return await initCamera(videoElement, nextMode);
}

/**
 * Stop the camera stream.
 * @param {MediaStream|null} stream
 */
export function stopCamera(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
