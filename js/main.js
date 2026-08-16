/**
 * main.js — Authentic RoV Gameplay Loop & UI Wiring
 */
import * as THREE from 'three';
import { Tower }          from './tower.js';
import { EffectsManager } from './effects.js';
import { initCamera, stopCamera } from './camera.js';

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

// Authentic RoV Stats
let currentGold = 500;
let bonusDamage = 0;
let heroClass = 'fighter'; // 'fighter' or 'mage'

// Skills configuration
const skills = {
  attack: { cd: 0, maxCd: 0.4, baseDmg: 50 },
  s1: { cd: 0, maxCd: 5, baseDmg: 200, name: 'Skill 1' },
  s2: { cd: 0, maxCd: 8, baseDmg: 350, name: 'Skill 2' },
  ult: { cd: 0, maxCd: 20, baseDmg: 1000, name: 'Ultimate' }
};

// Shop Items
const shopItems = [
  { id: 'item1', name: 'ดาบสั้น', icon: '🗡️', price: 250, stat: '+20 DMG', bonus: 20 },
  { id: 'item2', name: 'ดาบใหญ่', icon: '⚔️', price: 800, stat: '+80 DMG', bonus: 80 },
  { id: 'item3', name: 'ไม้คฑา', icon: '🪄', price: 400, stat: '+40 DMG', bonus: 40 },
  { id: 'item4', name: 'มงกุฎเวทย์', icon: '👑', price: 1200, stat: '+150 DMG', bonus: 150 },
  { id: 'item5', name: 'ธนูคริติคอล', icon: '🏹', price: 900, stat: '+100 DMG', bonus: 100 },
  { id: 'item6', name: 'ดาบแดง', icon: '🩸', price: 2000, stat: '+300 DMG', bonus: 300 }
];

// Three.js instances
let scene, camera3d, renderer, tower, effects;
let cameraStream = null;

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
  initShop();
}

function cacheDOM() {
  dom.landing = document.getElementById('landing-screen');
  dom.gameScreen = document.getElementById('game-screen');
  dom.victory = document.getElementById('victory-screen');
  dom.shopModal = document.getElementById('shop-modal');
  
  dom.startBtn = document.getElementById('start-btn');
  dom.replayBtn = document.getElementById('replay-btn');
  dom.shopBtn = document.getElementById('shop-btn');
  dom.closeShopBtn = document.getElementById('close-shop');
  
  dom.attackBtn = document.getElementById('attack-btn');
  dom.s1Btn = document.getElementById('skill1-btn');
  dom.s2Btn = document.getElementById('skill2-btn');
  dom.ultBtn = document.getElementById('ultimate-btn');
  
  dom.hpBar = document.getElementById('hp-bar');
  dom.hpText = document.getElementById('hp-text');
  dom.goldText = document.getElementById('current-gold');
  dom.timerBox = document.querySelector('.timer-box');
  dom.damageCont = document.getElementById('damage-container');
  
  dom.video = document.getElementById('camera-feed');
  dom.canvas = document.getElementById('game-canvas');
}

function bindEvents() {
  // Hero Selection
  document.querySelectorAll('.hero-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      heroClass = card.dataset.hero;
      updateSkillIcons();
    });
  });

  dom.startBtn.addEventListener('click', startGame);
  dom.replayBtn.addEventListener('click', replay);
  
  // Combat Buttons
  dom.attackBtn.addEventListener('touchstart', (e) => { e.preventDefault(); castSkill('attack'); });
  dom.s1Btn.addEventListener('touchstart', (e) => { e.preventDefault(); castSkill('s1'); });
  dom.s2Btn.addEventListener('touchstart', (e) => { e.preventDefault(); castSkill('s2'); });
  dom.ultBtn.addEventListener('touchstart', (e) => { e.preventDefault(); castSkill('ult'); });

  // Mouse fallback for desktop testing
  dom.attackBtn.addEventListener('mousedown', () => castSkill('attack'));
  dom.s1Btn.addEventListener('mousedown', () => castSkill('s1'));
  dom.s2Btn.addEventListener('mousedown', () => castSkill('s2'));
  dom.ultBtn.addEventListener('mousedown', () => castSkill('ult'));

  // Shop
  dom.shopBtn.addEventListener('click', () => dom.shopModal.classList.remove('hidden'));
  dom.closeShopBtn.addEventListener('click', () => dom.shopModal.classList.add('hidden'));

  window.addEventListener('resize', onResize);
}

function updateSkillIcons() {
  if (heroClass === 'fighter') {
    dom.attackBtn.querySelector('.icon').textContent = '⚔️';
    dom.s1Btn.querySelector('.icon').textContent = '🏃';
    dom.s2Btn.querySelector('.icon').textContent = '🌪️';
    dom.ultBtn.querySelector('.icon').textContent = '💥';
  } else {
    dom.attackBtn.querySelector('.icon').textContent = '🪄';
    dom.s1Btn.querySelector('.icon').textContent = '❄️';
    dom.s2Btn.querySelector('.icon').textContent = '🔥';
    dom.ultBtn.querySelector('.icon').textContent = '⚡';
  }
}

function initShop() {
  const container = document.getElementById('shop-items-container');
  shopItems.forEach(item => {
    const el = document.createElement('div');
    el.className = 'shop-item';
    el.innerHTML = `
      <div class="icon">${item.icon}</div>
      <div class="name">${item.name}</div>
      <div class="stats">${item.stat}</div>
      <div class="price">💰 ${item.price}</div>
    `;
    el.addEventListener('click', () => buyItem(item));
    container.appendChild(el);
  });
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
  // Increase tower HP for a longer fight
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
    // Quick slash sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'skill') {
    // Magic/Heavy attack sound
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'ult') {
    // Ultimate explosion sound
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
    gainNode.gain.setValueAtTime(0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  } else if (type === 'explode') {
    // Tower Destroyed (Rumble)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(20, now + 2.0);
    gainNode.gain.setValueAtTime(1.0, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
    osc.start(now);
    osc.stop(now + 2.0);
    
    // Voice simulation (Beeps like an announcer)
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
  initAudio(); // Initialize audio on user interaction
  dom.landing.style.display = 'none';
  dom.gameScreen.style.display = 'block';

  try {
    cameraStream = await initCamera(dom.video);
  } catch (err) {
    console.warn('Camera fallback used.');
    dom.video.style.display = 'none';
  }

  state = GameState.PLAYING;
  gameStartTime = performance.now();
  lastTimestamp = performance.now();
  currentGold = 500;
  bonusDamage = 0;
  totalDamageDealt = 0;
  attackCount = 0;
  
  // Reset cooldowns
  Object.values(skills).forEach(s => s.cd = 0);

  updateUI();
  requestAnimationFrame(gameLoop);
}

/* ==========================================================
   Combat Logic
   ========================================================== */
function castSkill(skillKey) {
  if (state !== GameState.PLAYING) return;
  const skill = skills[skillKey];
  if (skill.cd > 0) return; // on cooldown

  let dmg = skill.baseDmg + bonusDamage;
  let isCrit = false;
  let color = heroClass === 'fighter' ? '#ff5500' : '#aa00ff';
  let dmgClass = 'dmg-text';

  // Normal attack logic
  if (skillKey === 'attack') {
    isCrit = Math.random() < 0.2;
    if (isCrit) {
      dmg *= 2;
      dmgClass = 'dmg-crit';
    }
  } else if (skillKey === 'ult') {
    dmgClass = 'dmg-ult';
    color = '#ffcc00';
  } else {
    dmgClass = 'dmg-magic';
    color = heroClass === 'fighter' ? '#ff3333' : '#33ccff';
  }

  // Apply Damage
  tower.takeDamage(dmg);
  totalDamageDealt += dmg;
  attackCount++;
  skill.cd = skill.maxCd; // Start cooldown

  // Rewards
  currentGold += Math.floor(dmg / 10);
  
  // Visual Effects & Sound
  const hitPos = new THREE.Vector3(0, Math.random() * 2, 0);
  effects.createHitParticles(hitPos, color, skillKey === 'ult' ? 40 : 15);
  showFloatingDamage(dmg, dmgClass, color);
  
  // Play sound based on skill
  if (skillKey === 'attack') playSound('attack');
  else if (skillKey === 'ult') playSound('ult');
  else playSound('skill');
  
  // Haptic
  if (navigator.vibrate) navigator.vibrate(skillKey === 'ult' ? [100, 50, 100] : 40);

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

function buyItem(item) {
  if (currentGold >= item.price) {
    currentGold -= item.price;
    bonusDamage += item.bonus;
    updateUI();
    // Flash shop button
    dom.shopBtn.style.backgroundColor = '#2ecc71';
    setTimeout(() => dom.shopBtn.style.backgroundColor = '', 300);
  }
}

/* ==========================================================
   Game Loop & UI Updates
   ========================================================== */
function updateUI() {
  // HP Bar
  const pct = tower.getHPPercent();
  dom.hpBar.style.width = `${pct * 100}%`;
  dom.hpText.textContent = `${Math.ceil(tower.currentHP)} / ${tower.maxHP}`;
  
  // Gold
  dom.goldText.textContent = currentGold;
}

function updateCooldowns(dt) {
  const btns = {
    s1: dom.s1Btn,
    s2: dom.s2Btn,
    ult: dom.ultBtn
  };

  for (let key in skills) {
    if (skills[key].cd > 0) {
      skills[key].cd -= dt;
      if (skills[key].cd < 0) skills[key].cd = 0;
      
      // Update DOM for active skills
      if (btns[key]) {
        const pct = (skills[key].cd / skills[key].maxCd) * 100;
        const overlay = btns[key].querySelector('.cooldown-overlay');
        const text = btns[key].querySelector('.cooldown-text');
        
        if (skills[key].cd > 0) {
          overlay.style.height = `${pct}%`;
          text.textContent = Math.ceil(skills[key].cd);
          btns[key].disabled = true;
        } else {
          overlay.style.height = '0%';
          text.textContent = '';
          btns[key].disabled = false;
        }
      }
    }
  }
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  if (state === GameState.PLAYING || state === GameState.EXPLODING) {
    updateCooldowns(dt);

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
