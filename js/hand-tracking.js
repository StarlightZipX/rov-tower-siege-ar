/**
 * hand-tracking.js
 * Uses MediaPipe Hands to detect hand gestures and trigger events.
 */

export class HandTracker {
  constructor(videoElement, canvasElement, heroClassCallback) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.heroClassCallback = heroClassCallback; // 'fighter' or 'mage' to determine skeleton color
    
    this.onGestureDetected = null; // Callback for when a gesture is recognized
    this.lastGestureTime = 0;
    this.gestureCooldown = 600; // ms between gestures

    this.statusDot = document.querySelector('.status-dot');
    this.statusText = document.querySelector('#ai-status').lastChild;

    this.initMediaPipe();
  }

  initMediaPipe() {
    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1, // 0 = fast, 1 = accurate
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    this.hands.onResults(this.onResults.bind(this));

    this.camera = new window.Camera(this.videoElement, {
      onFrame: async () => {
        if (!this.videoElement.paused && !this.videoElement.ended) {
          await this.hands.send({ image: this.videoElement });
        }
      },
      width: 1280,
      height: 720
    });
  }

  start() {
    this.camera.start();
    this.updateStatus(true, 'AI: พร้อมรบ! (เจอมือแล้วจะตี)');
  }

  stop() {
    this.camera.stop();
    this.updateStatus(false, 'AI: หยุดทำงาน');
  }

  updateStatus(isActive, text) {
    if (this.statusDot) {
      if (isActive) this.statusDot.classList.add('active');
      else this.statusDot.classList.remove('active');
    }
    if (this.statusText) {
      this.statusText.textContent = ` ${text}`;
    }
  }

  onResults(results) {
    // Resize canvas to match video dimensions for correct drawing
    if (this.canvasElement.width !== this.videoElement.videoWidth) {
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;
    }

    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // Determine skeleton color based on hero class
      const heroColor = this.heroClassCallback() === 'fighter' ? '#ff3300' : '#33ccff';

      // Draw Skeleton
      for (const landmarks of results.multiHandLandmarks) {
        window.drawConnectors(this.canvasCtx, landmarks, window.HAND_CONNECTIONS, {
          color: heroColor,
          lineWidth: 4
        });
        window.drawLandmarks(this.canvasCtx, landmarks, {
          color: '#ffffff',
          lineWidth: 2,
          radius: 3
        });
      }

      // Analyze Gestures
      this.analyzeGestures(results.multiHandLandmarks);
    }
    this.canvasCtx.restore();
  }

  analyzeGestures(hands) {
    const now = performance.now();
    if (now - this.lastGestureTime < this.gestureCooldown) return;

    // If both hands are fully open -> Ultimate
    if (hands.length === 2) {
      if (this.isOpenHand(hands[0]) && this.isOpenHand(hands[1])) {
        this.triggerGesture('ult');
        this.lastGestureTime = now;
        return;
      }
    }

    // Check single hand gestures (just use the first detected hand)
    const hand = hands[0];

    if (this.isFist(hand)) {
      this.triggerGesture('attack');
      this.lastGestureTime = now;
    } else if (this.isPeaceSign(hand)) {
      this.triggerGesture('s1');
      this.lastGestureTime = now;
    } else if (this.isPinch(hand)) {
      this.triggerGesture('s2');
      this.lastGestureTime = now;
    }
  }

  triggerGesture(skillKey) {
    if (this.onGestureDetected) {
      this.onGestureDetected(skillKey);
    }
  }

  // --- Gesture Math Helpers ---

  // Point 0 is wrist
  // Points 4, 8, 12, 16, 20 are fingertips (Thumb, Index, Middle, Ring, Pinky)
  // Points 3, 7, 11, 15, 19 are lower joints

  isFist(landmarks) {
    // Check if index, middle, ring, pinky are folded (fingertip is lower/closer to wrist than the joint)
    const fingers = [8, 12, 16, 20];
    let foldedCount = 0;
    
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    
    for (let tip of fingers) {
      let joint = tip - 2;
      let distTipToWrist = dist(landmarks[tip], landmarks[0]);
      let distJointToWrist = dist(landmarks[joint], landmarks[0]);
      if (distTipToWrist < distJointToWrist) {
        foldedCount++;
      }
    }
    
    return foldedCount >= 3; // At least 3 fingers folded = fist
  }

  isOpenHand(landmarks) {
    const fingers = [8, 12, 16, 20];
    let openCount = 0;
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    
    for (let tip of fingers) {
      let joint = tip - 2;
      if (dist(landmarks[tip], landmarks[0]) > dist(landmarks[joint], landmarks[0])) {
        openCount++;
      }
    }
    return openCount >= 4;
  }

  isPeaceSign(landmarks) {
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    
    const indexOpen = dist(landmarks[8], landmarks[0]) > dist(landmarks[6], landmarks[0]);
    const middleOpen = dist(landmarks[12], landmarks[0]) > dist(landmarks[10], landmarks[0]);
    const ringFolded = dist(landmarks[16], landmarks[0]) < dist(landmarks[14], landmarks[0]);
    const pinkyFolded = dist(landmarks[20], landmarks[0]) < dist(landmarks[18], landmarks[0]);

    return indexOpen && middleOpen && ringFolded && pinkyFolded;
  }

  isPinch(landmarks) {
    // Distance between thumb tip (4) and index tip (8) is very small
    const dist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
    return dist < 0.05; // Coordinates are normalized 0-1
  }
}
