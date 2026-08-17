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

    // Blade Slash Energy Trail
    this.trailPoints = [];
    this.trailColor = '#ffd700';

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

  setTrailColor(color) {
    if (color) this.trailColor = color;
  }

  initMediaPipe() {
    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1, // Only need 1 hand for swinging
      modelComplexity: 0, // Ultra-fast 60 FPS for mobile
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
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
    const w = this.videoElement.videoWidth || this.canvasElement.width;
    const h = this.videoElement.videoHeight || this.canvasElement.height;
    
    if (this.canvasElement.width !== w && w > 0) {
      this.canvasElement.width = w;
      this.canvasElement.height = h;
    }

    // Synchronize canvas mirroring with video feed
    if (this.canvasElement.style.transform !== this.videoElement.style.transform) {
      this.canvasElement.style.transform = this.videoElement.style.transform;
    }

    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, w, h);

    const now = performance.now();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // 1. Render AAA Cyber/Magitech Hand Skeleton & Joint Nodes
      this.renderHandSkeleton(landmarks, w, h);

      // 2. Track index fingertip (landmark 8) for Blade Slash Energy Trail
      const indexTip = landmarks[8];
      this.trailPoints.push({
        x: indexTip.x * w,
        y: indexTip.y * h,
        time: now
      });

      // 3. Analyze Motion for Swing detection
      this.analyzeMotion(landmarks);

      // 4. Render Blade Slash Energy Trail
      this.renderBladeSlashTrail(w, h, now);

      // 5. Render Weapon if equipped
      if (this.weaponImage) {
        const wrist = landmarks[0];
        const indexBase = landmarks[5];
        
        const px = wrist.x * w;
        const py = wrist.y * h;
        
        const dx = (indexBase.x * w) - px;
        const dy = (indexBase.y * h) - py;
        const angle = Math.atan2(dy, dx);
        
        const handSize = Math.hypot(dx, dy);
        const scale = (handSize / 50) * 1.5;

        this.canvasCtx.translate(px, py);
        this.canvasCtx.rotate(angle - Math.PI / 4);
        
        const imgW = 200 * scale;
        const imgH = 200 * scale;
        
        this.canvasCtx.drawImage(this.weaponImage, -imgW/2, -imgH, imgW, imgH);
      }
    } else {
      this.lastWristPos = null;
    }

    // Clean up expired trail points (> 280ms)
    this.trailPoints = this.trailPoints.filter(p => now - p.time < 280);

    this.canvasCtx.restore();
  }

  renderHandSkeleton(landmarks, w, h) {
    const ctx = this.canvasCtx;
    ctx.save();

    // 21 Hand Landmark bone connections
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle
      [9, 10], [10, 11], [11, 12],
      // Ring
      [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm knuckle bridge
      [5, 9], [9, 13], [13, 17]
    ];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const glowColor = this.trailColor || '#00e5ff';

    // --- Pass 1: Outer Magitech Neon Aura Lines ---
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 4.5;
    ctx.globalAlpha = 0.85;

    ctx.beginPath();
    for (let k = 0; k < connections.length; k++) {
      const [i, j] = connections[k];
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
    }
    ctx.stroke();

    // --- Pass 2: Inner High-Energy White Core ---
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.globalAlpha = 0.95;

    ctx.beginPath();
    for (let k = 0; k < connections.length; k++) {
      const [i, j] = connections[k];
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
    }
    ctx.stroke();

    // --- Pass 3: Glowing Joint Nodes (21 Points) ---
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const px = lm.x * w;
      const py = lm.y * h;
      const isFingertip = [4, 8, 12, 16, 20].includes(i);
      const isWrist = i === 0;

      const outerR = isFingertip ? 7.5 : (isWrist ? 8.5 : 5.0);
      const innerR = isFingertip ? 4.0 : (isWrist ? 4.5 : 2.8);

      // Outer Glow Orb
      ctx.beginPath();
      ctx.arc(px, py, outerR, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.globalAlpha = 0.9;
      ctx.fill();

      // Inner White Spark Core
      ctx.beginPath();
      ctx.arc(px, py, innerR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      ctx.fill();
    }

    // --- Pass 4: Palm Center Arcane Crosshair Marker ---
    const wrist = landmarks[0];
    const middleBase = landmarks[9];
    const palmX = ((wrist.x + middleBase.x) / 2) * w;
    const palmY = ((wrist.y + middleBase.y) / 2) * h;

    ctx.beginPath();
    ctx.arc(palmX, palmY, 10, 0, Math.PI * 2);
    ctx.strokeStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    ctx.stroke();

    ctx.restore();
  }

  renderBladeSlashTrail(w, h, now) {
    if (this.trailPoints.length < 3) return;

    this.canvasCtx.save();
    this.canvasCtx.lineCap = 'round';
    this.canvasCtx.lineJoin = 'round';
    this.canvasCtx.shadowColor = this.trailColor;
    this.canvasCtx.shadowBlur = 16;

    for (let i = 1; i < this.trailPoints.length; i++) {
      const pPrev = this.trailPoints[i - 1];
      const pCurr = this.trailPoints[i];
      const age = now - pCurr.time;
      const progress = Math.max(0, 1 - (age / 280)); // 1 (new) to 0 (old)

      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(pPrev.x, pPrev.y);
      this.canvasCtx.lineTo(pCurr.x, pCurr.y);

      this.canvasCtx.strokeStyle = this.trailColor;
      this.canvasCtx.globalAlpha = progress * 0.9;
      this.canvasCtx.lineWidth = 4 + progress * 14;
      this.canvasCtx.stroke();

      // Inner white core
      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(pPrev.x, pPrev.y);
      this.canvasCtx.lineTo(pCurr.x, pCurr.y);
      this.canvasCtx.strokeStyle = '#ffffff';
      this.canvasCtx.globalAlpha = progress * 0.95;
      this.canvasCtx.lineWidth = 2 + progress * 5;
      this.canvasCtx.stroke();
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
