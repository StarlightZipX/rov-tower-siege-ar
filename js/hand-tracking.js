/**
 * hand-tracking.js
 * Uses MediaPipe Hands to detect hand gestures and trigger events.
 */

export class HandTracker {
  constructor(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    
    this.onSwingDetected = null;
    this.lastSwingTime = 0;
    this.swingCooldown = 400; // ms between swings
    
    // Weapon rendering
    this.weaponImage = null; // HTMLImageElement
    this.weaponScale = 1.0;

    // Motion tracking
    this.lastWristPos = null;
    this.lastFrameTime = 0;

    this.statusDot = document.querySelector('.status-dot');
    this.statusText = document.querySelector('#ai-status').lastChild;

    this.initMediaPipe();
  }

  setWeapon(imageElement) {
    this.weaponImage = imageElement;
  }

  initMediaPipe() {
    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1, // Only need 1 hand for swinging
      modelComplexity: 1,
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
    this.updateStatus(true, 'AI: พร้อมรบ! (ถืออาวุธแล้วฟันเลย)');
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
    const w = this.videoElement.videoWidth;
    const h = this.videoElement.videoHeight;
    
    if (this.canvasElement.width !== w) {
      this.canvasElement.width = w;
      this.canvasElement.height = h;
    }

    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, w, h);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Draw Skeleton lightly
      window.drawConnectors(this.canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: 'rgba(255,215,0,0.5)', lineWidth: 2 });
      window.drawLandmarks(this.canvasCtx, landmarks, { color: '#ffffff', lineWidth: 1, radius: 2 });

      // Analyze Motion
      this.analyzeMotion(landmarks);

      // Render Weapon
      if (this.weaponImage) {
        // Wrist is landmark 0, Index finger base is 5
        const wrist = landmarks[0];
        const indexBase = landmarks[5];
        
        const px = wrist.x * w;
        const py = wrist.y * h;
        
        // Calculate angle between wrist and index finger to rotate weapon
        const dx = (indexBase.x * w) - px;
        const dy = (indexBase.y * h) - py;
        const angle = Math.atan2(dy, dx);
        
        // Estimate depth for scaling (distance between wrist and index base)
        const handSize = Math.hypot(dx, dy);
        const scale = (handSize / 50) * 1.5; // adjust multiplier as needed

        this.canvasCtx.translate(px, py);
        this.canvasCtx.rotate(angle - Math.PI / 4); // Adjust rotation so weapon points up from hand
        
        const imgW = 200 * scale;
        const imgH = 200 * scale;
        
        this.canvasCtx.drawImage(this.weaponImage, -imgW/2, -imgH, imgW, imgH);
      }
    } else {
      this.lastWristPos = null; // Hand lost
    }
    this.canvasCtx.restore();
  }

  analyzeMotion(landmarks) {
    const now = performance.now();
    const wrist = landmarks[0];
    
    if (this.lastWristPos) {
      const dt = now - this.lastFrameTime;
      if (dt > 0) {
        // Calculate velocity (distance in normalized coordinates per second)
        const dx = wrist.x - this.lastWristPos.x;
        const dy = wrist.y - this.lastWristPos.y;
        const speed = Math.hypot(dx, dy) / (dt / 1000); // units per second
        
        // If hand moves fast enough (e.g. > 1.5 screen widths per second)
        if (speed > 1.5 && now - this.lastSwingTime > this.swingCooldown) {
          
          // Check if hand is somewhat near the center (the tower)
          // X: 0.2 to 0.8, Y: 0.2 to 0.8
          if (wrist.x > 0.2 && wrist.x < 0.8 && wrist.y > 0.2 && wrist.y < 0.8) {
            if (this.onSwingDetected) {
              this.onSwingDetected();
            }
            this.lastSwingTime = now;
          }
        }
      }
    }
    
    this.lastWristPos = { x: wrist.x, y: wrist.y };
    this.lastFrameTime = now;
  }
}
