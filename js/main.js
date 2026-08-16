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
  dom.randomWeaponBtn = document.getElementById('random-weapon-btn');
  dom.hitCount = document.getElementById('hit-count');
  dom.liveDamageText = document.getElementById('live-damage-text');
  dom.comboBadge = document.querySelector('.combo-badge');
  dom.damageCont = document.getElementById('damage-container');

  dom.video = document.getElementById('camera-feed');
  dom.canvas = document.getElementById('game-canvas');
  dom.handsCanvas = document.getElementById('hands-canvas');
}

const weaponConfig = {
  arthur_s1:     { name: "ดาบศักดิ์สิทธิ์ Arthur", path: "/assets/skills/arthur_s1.png", baseDmg: 400, color: '#ffd700', desc: 'ดาบกายภาพผสานพลังทองคำ' },
  arthur_ult:    { name: "ดาบยักษ์ผ่ามิติ Arthur", path: "/assets/skills/arthur_ult.png", baseDmg: 650, color: '#ff5500', desc: 'อัลติเมตฟาดกระแทกป้อมรุนแรง' },
  butterfly_s1:  { name: "เพลงดาบหมุน Butterfly", path: "/assets/skills/butterfly_s1.png", baseDmg: 350, color: '#ff0077', desc: 'หมุนฟันรวดเร็วต่อเนื่อง' },
  butterfly_ult: { name: "ดาบลอบสังหาร Butterfly", path: "/assets/skills/butterfly_ult.png", baseDmg: 520, color: '#ff0033', desc: 'แทงจุดตายดาเมจคริติคอล x2' },
  krixi_s1:      { name: "คลื่นเวทผีเสื้อ Krixi", path: "/assets/skills/krixi_s1.png", baseDmg: 450, color: '#33ccff', desc: 'ปล่อยพลังเวทผีเสื้อระเบิดใส่ป้อม' },
  valhein_ult:   { name: "กงจักรกระสุนเงิน Valhein", path: "/assets/skills/valhein_ult.png", baseDmg: 480, color: '#ffbb00', desc: 'สาดกระสุนเงินเวทมนตร์ทะลวงเกราะ' }
};

let isRolling = false;

function bindEvents() {
  // Preload all 6 hero skill images
  const weapons = Object.keys(weaponConfig);
  weapons.forEach(w => {
    const img = new Image();
    img.src = weaponConfig[w].path;
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

  // Hotbar Direct Slot Selection
  dom.hotbarSlots.forEach(slot => {
    slot.addEventListener('click', () => {
      if (isRolling) return;
      selectWeapon(slot.dataset.weapon);
    });
  });

  // Random Weapon Roll Button
  if (dom.randomWeaponBtn) {
    dom.randomWeaponBtn.addEventListener('click', () => {
      rollRandomWeapon();
    });
  }

  window.addEventListener('resize', onResize);
}

function selectWeapon(weaponKey) {
  if (!weaponConfig[weaponKey]) return;
  selectedWeapon = weaponKey;

  // Update UI active slot
  dom.hotbarSlots.forEach(s => {
    if (s.dataset.weapon === weaponKey) s.classList.add('active');
    else s.classList.remove('active');
  });

  // Update AR weapon on hand
  if (handTracker && weaponImages[selectedWeapon]) {
    handTracker.setWeapon(weaponImages[selectedWeapon]);
  }

  baseDamage = weaponConfig[weaponKey].baseDmg;
}

function rollRandomWeapon() {
  if (isRolling) return;
  isRolling = true;
  initAudio();

  const slots = Array.from(dom.hotbarSlots);
  const keys = Object.keys(weaponConfig);
  let currentIndex = 0;
  let speed = 60;
  let counter = 0;
  const totalSteps = 15 + Math.floor(Math.random() * 8);

  function step() {
    // Remove rolling class from all
    slots.forEach(s => s.classList.remove('rolling'));

    // Highlight current slot
    const currentSlot = slots[currentIndex % slots.length];
    currentSlot.classList.add('rolling');
    playSound('roll');

    currentIndex++;
    counter++;

    if (counter < totalSteps) {
      speed += 12; // Slow down gradually like a real gacha roulette
      setTimeout(step, speed);
    } else {
      // Pick final weapon
      slots.forEach(s => s.classList.remove('rolling'));
      const chosenSlot = slots[(currentIndex - 1) % slots.length];
      const chosenKey = chosenSlot.dataset.weapon;

      selectWeapon(chosenKey);
      playSound('win');
      isRolling = false;

      // Show notification
      showFloatingRollNotice(weaponConfig[chosenKey]);
    }
  }

  step();
}

function showFloatingRollNotice(weapon) {
  const el = document.createElement('div');
  el.className = 'dmg-text';
  el.textContent = `🎲 สุ่มได้: ${weapon.name}!`;
  el.style.color = weapon.color;
  el.style.fontSize = '2.2rem';
  el.style.left = '35%';
  el.style.top = '60%';
  dom.damageCont.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
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
  } else if (type === 'roll') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'win') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(783.99, now + 0.1);
    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
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

  // Hero skill specific effects
  const cfg = weaponConfig[selectedWeapon] || { color: '#ff3333', baseDmg: 400 };
  color = cfg.color;

  if (selectedWeapon === 'butterfly_ult' && Math.random() < 0.5) {
    isCrit = true;
    dmg *= 2;
    dmgClass = 'dmg-crit';
  } else if (selectedWeapon === 'arthur_ult') {
    isCrit = true;
    dmgClass = 'dmg-ult';
  } else if (selectedWeapon === 'krixi_s1') {
    dmgClass = 'dmg-magic';
  }

  // Apply Damage
  tower.takeDamage(dmg);
  totalDamageDealt += dmg;
  attackCount++;

  // Rewards
  currentGold += Math.floor(dmg / 10);

  // Visual Effects & Sound
  const hitPos = new THREE.Vector3(0, Math.random() * 2, 0);
  effects.createHitParticles(hitPos, color, isCrit ? 30 : 15);
  showFloatingDamage(Math.floor(dmg), dmgClass, color);

  playSound('attack');

  if (navigator.vibrate) navigator.vibrate(isCrit ? [80, 40, 80] : 50);

  // Combo Badge bounce effect
  if (dom.comboBadge) {
    dom.comboBadge.classList.add('combo-active');
    setTimeout(() => dom.comboBadge.classList.remove('combo-active'), 150);
  }

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
  if (dom.goldText) dom.goldText.textContent = currentGold;
  if (dom.hitCount) dom.hitCount.textContent = attackCount;
  if (dom.liveDamageText) dom.liveDamageText.textContent = `${totalDamageDealt.toLocaleString()} DMG`;
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
