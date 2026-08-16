/**
 * main.js — RoV Hero Arsenal & Dedicated Skill Sets with Hero Gacha Roll
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

/* ==========================================================
   RoV Heroes & Signature Skill Sets
   ========================================================== */
const HEROES = {
  arthur: {
    name: "ARTHUR",
    fullName: "Arthur (อาเธอร์)",
    type: "ไฟต์เตอร์ / แทงค์",
    avatar: "/assets/heroes/arthur.png",
    skills: [
      { id: 'arthur_atk', name: 'ดาบฟันปกติ', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 320, color: '#ffd700', desc: 'ฟันดาบกายภาพ' },
      { id: 'arthur_s1', name: 'Righteous Fervor', tag: 'ดาบศักดิ์สิทธิ์', icon: '/assets/skills/arthur_s1.png', dmg: 480, color: '#ffb700', desc: 'ดาบศักดิ์สิทธิ์เพิ่มความเร็ว' },
      { id: 'arthur_s2', name: 'Holy Guard', tag: 'กงจักรดาบ', icon: '/assets/skills/arthur_s2.png', dmg: 400, color: '#ff9900', desc: 'กงจักรดาบหมุนวน' },
      { id: 'arthur_ult', name: 'Deep Impact', tag: 'ดาบผ่ามิติ', icon: '/assets/skills/arthur_ult.png', dmg: 750, color: '#ff3300', isCrit: true, desc: 'อัลติเมตฟาดผ่ามิติ' }
    ]
  },
  krixi: {
    name: "KRIXI",
    fullName: "Krixi (คริกซี่)",
    type: "เมจ / พลังเวท",
    avatar: "/assets/heroes/krixi.png",
    skills: [
      { id: 'krixi_atk', name: 'เวทมนตร์', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 300, color: '#00ffff', desc: 'ยิงเวทมนตร์ระยะไกล' },
      { id: 'krixi_s1', name: 'Mischief', tag: 'คลื่นผีเสื้อ', icon: '/assets/skills/krixi_s1.png', dmg: 500, color: '#33ccff', desc: 'ปล่อยฝูงผีเสื้อระเบิดใส่ป้อม' },
      { id: 'krixi_s2', name: "Nature's Wrath", tag: 'พายุดอกไม้', icon: '/assets/skills/krixi_s2.png', dmg: 420, color: '#66ff66', desc: 'พายุบุปผายกเป้าหมาย' },
      { id: 'krixi_ult', name: 'Moonfall', tag: 'ฝนดาวตก', icon: '/assets/skills/krixi_ult.png', dmg: 800, color: '#cc66ff', desc: 'ฝนดาวตกผีเสื้อถล่มป้อม' }
    ]
  },
  butterfly: {
    name: "BUTTERFLY",
    fullName: "Butterfly (บัตเตอร์ฟลาย)",
    type: "แอสซาซิน / ล้วง",
    avatar: "/assets/heroes/butterfly.png",
    skills: [
      { id: 'bf_atk', name: 'ดาบสังหาร', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 340, color: '#ff0077', desc: 'ฟันดาบสังหารรวดเร็ว' },
      { id: 'bf_s1', name: 'Whirlwind', tag: 'เพลงดาบหมุน', icon: '/assets/skills/butterfly_s1.png', dmg: 460, color: '#ff3366', desc: 'เพลงดาบหมุนว่องไว' },
      { id: 'bf_ult', name: 'Backstab', tag: 'ลอบสังหาร', icon: '/assets/skills/butterfly_ult.png', dmg: 780, color: '#ff0033', isCrit: true, desc: 'พุ่งแทงลอบสังหารคริติคอล' }
    ]
  },
  valhein: {
    name: "VALHEIN",
    fullName: "Valhein (แวนเฮล)",
    type: "แครี่ / นักล่าปีศาจ",
    avatar: "/assets/heroes/valhein.png",
    skills: [
      { id: 'vh_atk', name: 'ปืนกงจักรเงิน', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 310, color: '#ffcc00', desc: 'สาดกระสุนกงจักรเงิน' },
      { id: 'vh_s2', name: 'Curse of Death', tag: 'กงจักรทอง', icon: '/assets/skills/valhein_s2.png', dmg: 450, color: '#ffdd33', desc: 'กงจักรสีทองสตั๊นเป้าหมาย' },
      { id: 'vh_ult', name: 'Bullet Storm', tag: 'พายุกระสุนเงิน', icon: '/assets/skills/valhein_ult.png', dmg: 720, color: '#ff8800', desc: 'พายุกระสุนเงินทะลวงเกราะ' }
    ]
  }
};

let activeHeroKey = 'arthur';
let selectedSkill = null;
const skillImages = {};
let baseDamage = 400;
let isRolling = false;

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

  dom.heroCards = document.querySelectorAll('.hero-card');
  dom.randomHeroBtn = document.getElementById('random-hero-btn');
  dom.heroBadgeBox = document.getElementById('hero-badge-box');
  dom.heroBadgeAvatar = document.getElementById('hero-badge-avatar');
  dom.heroBadgeName = document.getElementById('hero-badge-name');
  dom.heroBadgeType = document.querySelector('.hero-badge-type');
  dom.skillsContainer = document.getElementById('hero-skills-container');

  dom.hpBar = document.getElementById('hp-bar');
  dom.hpText = document.getElementById('hp-text');
  dom.goldText = document.getElementById('current-gold');
  dom.timerBox = document.querySelector('.timer-box');
  dom.hitCount = document.getElementById('hit-count');
  dom.liveDamageText = document.getElementById('live-damage-text');
  dom.comboBadge = document.querySelector('.combo-badge');
  dom.damageCont = document.getElementById('damage-container');

  dom.video = document.getElementById('camera-feed');
  dom.canvas = document.getElementById('game-canvas');
  dom.handsCanvas = document.getElementById('hands-canvas');
}

function bindEvents() {
  // Preload all skill images for all heroes
  Object.values(HEROES).forEach(hero => {
    hero.skills.forEach(sk => {
      if (!skillImages[sk.id]) {
        const img = new Image();
        img.src = sk.icon;
        skillImages[sk.id] = img;
      }
    });
  });

  dom.startBtn.addEventListener('click', startGame);
  dom.replayBtn.addEventListener('click', replay);

  // Hero Card Selection on Landing Screen
  dom.heroCards.forEach(card => {
    card.addEventListener('click', () => {
      dom.heroCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      activeHeroKey = card.dataset.hero || 'arthur';
    });
  });

  // Random Hero Roll Button in Gameplay
  if (dom.randomHeroBtn) {
    dom.randomHeroBtn.addEventListener('click', () => {
      rollRandomHero();
    });
  }

  window.addEventListener('resize', onResize);
}

/* ==========================================================
   Hero & Skill Assignment
   ========================================================== */
function setHero(heroKey) {
  if (!HEROES[heroKey]) return;
  activeHeroKey = heroKey;
  const hero = HEROES[heroKey];

  // Update Hero Badge in Hotbar
  if (dom.heroBadgeAvatar) dom.heroBadgeAvatar.src = hero.avatar;
  if (dom.heroBadgeName) dom.heroBadgeName.textContent = hero.name;
  if (dom.heroBadgeType) dom.heroBadgeType.textContent = hero.type;

  // Render this hero's dedicated skills in the hotbar
  renderHeroSkills(hero);
}

function renderHeroSkills(hero) {
  if (!dom.skillsContainer) return;
  dom.skillsContainer.innerHTML = '';

  hero.skills.forEach((sk, idx) => {
    const slot = document.createElement('div');
    slot.className = `hotbar-slot ${idx === 0 ? 'active' : ''}`;
    slot.dataset.skillId = sk.id;
    slot.title = sk.name;

    slot.innerHTML = `
      <img src="${sk.icon}" alt="${sk.name}">
      <span class="weapon-tag">${sk.tag}</span>
    `;

    slot.addEventListener('click', () => {
      if (isRolling) return;
      selectSkill(sk, slot);
    });

    dom.skillsContainer.appendChild(slot);
  });

  // Automatically select the first skill / weapon of this hero
  selectSkill(hero.skills[0], dom.skillsContainer.firstChild);
}

function selectSkill(skill, slotEl) {
  if (!skill) return;
  selectedSkill = skill;
  baseDamage = skill.dmg;

  // Update active slot style
  if (dom.skillsContainer) {
    dom.skillsContainer.querySelectorAll('.hotbar-slot').forEach(s => s.classList.remove('active'));
  }
  if (slotEl) slotEl.classList.add('active');

  // Update AR weapon sprite attached to the hand
  if (handTracker && skillImages[skill.id]) {
    handTracker.setWeapon(skillImages[skill.id]);
  }
}

/* ==========================================================
   Random Hero Roll Gacha
   ========================================================== */
function rollRandomHero() {
  if (isRolling) return;
  isRolling = true;
  initAudio();

  const heroKeys = Object.keys(HEROES);
  let currentIndex = 0;
  let speed = 60;
  let counter = 0;
  const totalSteps = 14 + Math.floor(Math.random() * 6);

  if (dom.heroBadgeBox) dom.heroBadgeBox.style.transform = 'scale(1.15)';

  function step() {
    const currentKey = heroKeys[currentIndex % heroKeys.length];
    const currentHero = HEROES[currentKey];

    if (dom.heroBadgeAvatar) dom.heroBadgeAvatar.src = currentHero.avatar;
    if (dom.heroBadgeName) dom.heroBadgeName.textContent = currentHero.name;
    if (dom.heroBadgeType) dom.heroBadgeType.textContent = currentHero.type;

    playSound('roll');
    currentIndex++;
    counter++;

    if (counter < totalSteps) {
      speed += 12;
      setTimeout(step, speed);
    } else {
      const chosenKey = heroKeys[(currentIndex - 1) % heroKeys.length];
      setHero(chosenKey);
      playSound('win');
      isRolling = false;

      if (dom.heroBadgeBox) dom.heroBadgeBox.style.transform = 'scale(1)';

      // Show announcement
      showFloatingRollNotice(HEROES[chosenKey]);
    }
  }

  step();
}

function showFloatingRollNotice(hero) {
  const el = document.createElement('div');
  el.className = 'dmg-text';
  el.textContent = `🎲 สุ่มได้ฮีโร่: ${hero.name}!`;
  el.style.color = '#ffd700';
  el.style.fontSize = '2.2rem';
  el.style.left = '32%';
  el.style.top = '60%';
  dom.damageCont.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ==========================================================
   Three.js & Graphics
   ========================================================== */
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

  // Apply selected hero and generate their skills
  setHero(activeHeroKey);

  try {
    cameraStream = await initCamera(dom.video);

    // Initialize Hand Tracking
    if (!handTracker) {
      handTracker = new HandTracker(dom.video, dom.handsCanvas);
      handTracker.onSwingDetected = () => {
        performSwingAttack();
      };
    }
    if (selectedSkill && skillImages[selectedSkill.id]) {
      handTracker.setWeapon(skillImages[selectedSkill.id]);
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
  if (state !== GameState.PLAYING || !selectedSkill) return;

  let dmg = baseDamage + bonusDamage;
  let isCrit = selectedSkill.isCrit || false;
  let color = selectedSkill.color || '#ffd700';
  let dmgClass = isCrit ? 'dmg-crit' : (activeHeroKey === 'krixi' ? 'dmg-magic' : 'dmg-text');

  if (isCrit && Math.random() < 0.6) {
    dmg = Math.floor(dmg * 1.5);
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
