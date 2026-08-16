/**
 * main.js — AR Weapon Swing System
 */
import * as THREE from 'three';
import { Tower }          from './tower.js';
import { EffectsManager } from './effects.js';
import { initCamera, stopCamera } from './camera.js';
import { HandTracker }    from './hand-tracking.js';

/* ==========================================================
   State & Constants
   ========================================================== */
const GameState = Object.freeze({
  LANDING:   'landing',
  PLAYING:   'playing',
  EXPLODING: 'exploding',
  VICTORY:   'victory'
});

let state = GameState.LANDING;
let attackCount = 0;
let totalDamageDealt = 0;
let gameStartTime = 0;
let lastTimestamp = 0;
let lastSmokeTime = 0;
const SMOKE_INTERVAL = 0.28;

let currentGold = 500;
let bonusDamage = 0;

// Weapon Hotbar State
let selectedWeapon = 'fenrir';
const weaponImages = {};
let baseDamage = 400;

// Three.js instances
let scene, camera3d, renderer, tower, effects;
let cameraStream = null;
let handTracker = null;

// Web Audio API Context
let audioCtx = null;

// DOM refs
const dom = {};

/* ==========================================================
   Initialization
   ========================================================== */
function init() {
  cacheDOM();
  bindEvents();
  initThreeJS();
}

function cacheDOM() {
  dom.landing = document.getElementById('landing-screen');
  dom.gameScreen = document.getElementById('game-screen');
  dom.victory = document.getElementById('victory-screen');

  dom.startBtn = document.getElementById('start-btn');
  dom.replayBtn = document.getElementById('replay-btn');

  dom.hotbarSlots = document.querySelectorAll('.hotbar-slot');

  dom.hpBar = document.getElementById('hp-bar');
  dom.hpText = document.getElementById('hp-text');
  dom.goldText = document.getElementById('current-gold');
  dom.timerBox = document.querySelector('.timer-box');
  dom.damageCont = document.getElementById('damage-container');

  dom.video = document.getElementById('camera-feed');
  dom.canvas = document.getElementById('game-canvas');
  dom.handsCanvas = document.getElementById('hands-canvas');
}

function bindEvents() {
  // Preload weapon images
  const weapons = ['fenrir', 'claves', 'omni', 'muramasa'];
  weapons.forEach(w => {
    const img = new Image();
    img.src = `/assets/items/${w}.png`;
    weaponImages[w] = img;
  });

  dom.startBtn.addEventListener('click', startGame);
  dom.replayBtn.addEventListener('click', replay);

  // Hero Selection
  document.querySelectorAll('.hero-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // Hotbar Selection
  dom.hotbarSlots.forEach(slot => {
    slot.addEventListener('click', () => {
      dom.hotbarSlots.forEach(s => s.classList.remove('active'));
      slot.classList.add('active');
      selectedWeapon = slot.dataset.weapon;

      // Update AR weapon on hand
      if (handTracker) {
        handTracker.setWeapon(weaponImages[selectedWeapon]);
      }

      // Adjust damage based on weapon
      if (selectedWeapon === 'fenrir') baseDamage = 400;
      else if (selectedWeapon === 'claves') baseDamage = 250;
      else if (selectedWeapon === 'omni') baseDamage = 200;
      else if (selectedWeapon === 'muramasa') baseDamage = 300;
    });
  });

  window.addEventListener('resize', onResize);
}

function initThreeJS() {
  scene = new THREE.Scene();
  camera3d = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera3d.position.set(0, 3.2, 7.5);
  camera3d.lookAt(0, 1.2, 0);

  renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0x404060, 1.8));
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  tower = new Tower(scene);
  tower.maxHP = 5000;
  tower.currentHP = 5000;

  effects = new EffectsManager(scene);
}

/* ==========================================================
   Sound Synthesizer (Web Audio API)
   ========================================================== */
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'attack') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'explode') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(20, now + 2.0);
    gainNode.gain.setValueAtTime(1.0, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
    osc.start(now);
    osc.stop(now + 2.0);

    setTimeout(() => {
      const vOsc = audioCtx.createOscillator();
      const vGain = audioCtx.createGain();
      vOsc.connect(vGain);
      vGain.connect(audioCtx.destination);
      vOsc.type = 'sine';
      vOsc.frequency.setValueAtTime(800, audioCtx.currentTime);
      vGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      vGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
      vOsc.start(); vOsc.stop(audioCtx.currentTime + 1.0);
    }, 500);
  }
}

/* ==========================================================
   Game Flow
   ========================================================== */
async function startGame() {
  initAudio();
  dom.landing.style.display = 'none';
  dom.gameScreen.style.display = 'block';

  try {
    cameraStream = await initCamera(dom.video);

    // Initialize Hand Tracking
    if (!handTracker) {
      handTracker = new HandTracker(dom.video, dom.handsCanvas);
      handTracker.onSwingDetected = () => {
        performSwingAttack();
      };

      // Load initial weapon
      if (weaponImages[selectedWeapon]) {
        handTracker.setWeapon(weaponImages[selectedWeapon]);
      }
    }
    handTracker.start();

  } catch (err) {
    console.warn('Camera fallback used. Hand tracking unavailable.');
    dom.video.style.display = 'none';
    document.getElementById('ai-status').style.display = 'none';
  }

  state = GameState.PLAYING;
  gameStartTime = performance.now();
  lastTimestamp = performance.now();
  currentGold = 500;
  bonusDamage = 0;
  totalDamageDealt = 0;
  attackCount = 0;

  updateUI();
  requestAnimationFrame(gameLoop);
}

/* ==========================================================
   Combat Logic — Swing Attack
   ========================================================== */
function performSwingAttack() {
  if (state !== GameState.PLAYING) return;

  let dmg = baseDamage + bonusDamage;
  let isCrit = false;
  let color = '#ff3333';
  let dmgClass = 'dmg-text';

  // Weapon specific effects
  if (selectedWeapon === 'claves' && Math.random() < 0.4) {
    isCrit = true;
    dmg *= 2;
    dmgClass = 'dmg-crit';
    color = '#ffcc00';
  } else if (selectedWeapon === 'fenrir') {
    if (tower.getHPPercent() < 0.5) {
      dmg *= 1.3;
      color = '#ff0055';
    }
  }

  // Apply Damage
  tower.takeDamage(dmg);
  totalDamageDealt += dmg;
  attackCount++;

  // Rewards
  currentGold += Math.floor(dmg / 10);

  // Visual Effects & Sound
  const hitPos = new THREE.Vector3(0, Math.random() * 2, 0);
  effects.createHitParticles(hitPos, color, isCrit ? 25 : 15);
  showFloatingDamage(Math.floor(dmg), dmgClass, color);

  playSound('attack');

  if (navigator.vibrate) navigator.vibrate(isCrit ? [80, 40, 80] : 50);

  updateUI();

  if (tower.isDestroyed()) {
    triggerExplosion();
  }
}

function showFloatingDamage(amount, className, color) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = `-${amount}`;
  el.style.color = color;
  el.style.left = `${45 + Math.random() * 10}%`;
  el.style.top  = `${30 + Math.random() * 10}%`;
  dom.damageCont.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ==========================================================
   Game Loop & UI Updates
   ========================================================== */
function updateUI() {
  const pct = tower.getHPPercent();
  dom.hpBar.style.width = `${pct * 100}%`;
  dom.hpText.textContent = `${Math.ceil(tower.currentHP)} / ${tower.maxHP}`;
  dom.goldText.textContent = currentGold;
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  if (state === GameState.PLAYING || state === GameState.EXPLODING) {

    if (state === GameState.PLAYING) {
      // Update Timer
      const elapsedSecs = Math.floor((performance.now() - gameStartTime) / 1000);
      const m = Math.floor(elapsedSecs / 60).toString().padStart(2, '0');
      const s = (elapsedSecs % 60).toString().padStart(2, '0');
      dom.timerBox.textContent = `${m}:${s}`;

      // Particles based on HP
      lastSmokeTime += dt;
      if (lastSmokeTime >= SMOKE_INTERVAL) {
        lastSmokeTime = 0;
        const hp = tower.getHPPercent();
        const base = new THREE.Vector3(0, -2.2, 0);
        if (hp < 0.75 && hp > 0) effects.createSmokeParticles(base, hp < 0.5 ? 3 : 1);
        if (hp < 0.5 && hp > 0) effects.createFireParticles(base, hp < 0.25 ? 6 : 2);
      }
    }

    tower.update(dt);
    effects.update(dt);
    renderer.render(scene, camera3d);
  }

  requestAnimationFrame(gameLoop);
}

/* ==========================================================
   Victory / Replay
   ========================================================== */
function triggerExplosion() {
  state = GameState.EXPLODING;
  const debrisPieces = tower.getExplosionParts();
  effects.createExplosion(new THREE.Vector3(0, -2.2, 0), debrisPieces);
  tower.hide();

  playSound('explode');

  if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 300]);
  setTimeout(showVictory, 2800);
}

function showVictory() {
  state = GameState.VICTORY;
  const elapsed = ((performance.now() - gameStartTime) / 1000).toFixed(1);
  document.getElementById('stat-damage').textContent = totalDamageDealt;
  document.getElementById('stat-time').textContent = elapsed + 's';
  dom.victory.style.display = 'flex';

  if (handTracker) handTracker.stop();
}

function replay() {
  dom.victory.style.display = 'none';
  tower.reset();
  effects.clear();
  startGame();
}

function onResize() {
  camera3d.aspect = window.innerWidth / window.innerHeight;
  camera3d.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

document.addEventListener('DOMContentLoaded', init);
