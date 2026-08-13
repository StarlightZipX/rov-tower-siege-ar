/**
 * camera.js — Camera API management for AR background
 */

/**
 * Initialize the device camera and stream to a <video> element.
 * Prefers the rear-facing (environment) camera for AR.
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<MediaStream>}
 */
export async function initCamera(videoElement) {
  const constraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    },
    audio: false
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoElement.srcObject = stream;

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
 * Stop the camera stream.
 * @param {MediaStream|null} stream
 */
export function stopCamera(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}
