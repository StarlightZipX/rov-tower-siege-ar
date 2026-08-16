/**
 * main.js — RoV AR Tournament with Class-Specific AAA Summoning Gacha & Dedicated Hero Arsenals
 */
import * as THREE from 'three';
import { Tower }          from './tower.js';
import { EffectsManager } from './effects.js';
import { initCamera }     from './camera.js';
import { HandTracker }    from './hand-tracking.js';

/* ==========================================================
   State & Constants
   ========================================================== */
const GameState = Object.freeze({
  LANDING:   'landing',
  SUMMONING: 'summoning',
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
   RoV Hero Classes & Strict Hero Pools
   ========================================================== */
const HERO_CLASSES = {
  fighter: {
    id: 'fighter',
    name: 'FIGHTER / TANK',
    title: 'สายไฟต์เตอร์ / แทงค์',
    heroes: ['arthur', 'lubu']
  },
  mage: {
    id: 'mage',
    name: 'MAGE',
    title: 'สายเมจ / พลังเวท',
    heroes: ['krixi', 'veera']
  },
  assassin: {
    id: 'assassin',
    name: 'ASSASSIN',
    title: 'สายแอสซาซิน / ล้วง',
    heroes: ['butterfly', 'nakroth']
  },
  marksman: {
    id: 'marksman',
    name: 'MARKSMAN',
    title: 'สายแครี่ / ยิงไกล',
    heroes: ['valhein', 'violet']
  }
};

/* ==========================================================
   RoV Heroes & 100% Authentic Skills & Weapons
   ========================================================== */
const HEROES = {
  arthur: {
    id: 'arthur',
    name: 'ARTHUR',
    fullName: 'Arthur (อาเธอร์)',
    classId: 'fighter',
    role: 'ไฟต์เตอร์ / แทงค์',
    avatar: '/assets/heroes/arthur.png',
    splash: '/assets/ui/arthur_card.jpg',
    quote: '"ดาบแห่งความยุติธรรมจะไม่ปรานีใคร!"',
    skills: [
      { id: 'arthur_atk', name: 'ดาบฟันปกติ', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 320, color: '#ffd700', desc: 'ฟันดาบกายภาพ' },
      { id: 'arthur_s1', name: 'Righteous Fervor', tag: 'ดาบศักดิ์สิทธิ์', icon: '/assets/skills/arthur_s1.png', dmg: 480, color: '#ffb700', desc: 'ดาบศักดิ์สิทธิ์เร่งสปีด' },
      { id: 'arthur_s2', name: 'Holy Guard', tag: 'กงจักรดาบ', icon: '/assets/skills/arthur_s2.png', dmg: 400, color: '#ff9900', desc: 'กงจักรดาบหมุนวน' },
      { id: 'arthur_ult', name: 'Deep Impact', tag: 'ดาบผ่ามิติ', icon: '/assets/skills/arthur_ult.png', dmg: 750, color: '#ff3300', isCrit: true, desc: 'อัลติเมตฟาดผ่ามิติ' }
    ]
  },
  lubu: {
    id: 'lubu',
    name: 'LU BU',
    fullName: 'Lu Bu (ลิโป้)',
    classId: 'fighter',
    role: 'ไฟต์เตอร์ / จอมคน',
    avatar: '/assets/heroes/lubu.png',
    splash: '/assets/ui/arthur_card.jpg',
    quote: '"ใต้หล้านี้ ไม่มีใครกล้าสบตาข้าผู้นี้!"',
    skills: [
      { id: 'lubu_atk', name: 'ทวนศึกกร้าว', tag: 'โจมตีปกติ', icon: '/assets/skills/lubu_s1.png', dmg: 340, color: '#ff3300', desc: 'ฟาดทวนศึก' },
      { id: 'lubu_s1', name: 'Red Stallion', tag: 'ทวนสามทิศ', icon: '/assets/skills/lubu_s1.png', dmg: 500, color: '#ff4400', desc: 'กระหน่ำแทงทวนศึก' },
      { id: 'lubu_ult', name: 'Conqueror', tag: 'ร่างเทพสงคราม', icon: '/assets/skills/lubu_ult.png', dmg: 800, color: '#ff0000', isCrit: true, desc: 'ระเบิดพลังเทพสงคราม' }
    ]
  },
  krixi: {
    id: 'krixi',
    name: 'KRIXI',
    fullName: 'Krixi (คริกซี่)',
    classId: 'mage',
    role: 'เมจ / พลังเวท',
    avatar: '/assets/heroes/krixi.png',
    splash: '/assets/ui/krixi_card.jpg',
    quote: '"สายลมและผีเสื้อจะปกป้องป่าแห่งนี้!"',
    skills: [
      { id: 'krixi_atk', name: 'กระสุนเวทมนตร์', tag: 'โจมตีปกติ', icon: '/assets/skills/krixi_s1.png', dmg: 300, color: '#00ffff', desc: 'ยิงเวทมนตร์ระยะไกล' },
      { id: 'krixi_s1', name: 'Mischief', tag: 'คลื่นผีเสื้อ', icon: '/assets/skills/krixi_s1.png', dmg: 500, color: '#33ccff', desc: 'ปล่อยฝูงผีเสื้อระเบิดใส่ป้อม' },
      { id: 'krixi_s2', name: "Nature's Wrath", tag: 'พายุดอกไม้', icon: '/assets/skills/krixi_s2.png', dmg: 420, color: '#66ff66', desc: 'พายุบุปผายกเป้าหมาย' },
      { id: 'krixi_ult', name: 'Moonfall', tag: 'ฝนดาวตก', icon: '/assets/skills/krixi_ult.png', dmg: 800, color: '#cc66ff', desc: 'ฝนดาวตกผีเสื้อถล่มป้อม' }
    ]
  },
  veera: {
    id: 'veera',
    name: 'VEERA',
    fullName: 'Veera (วีร่า)',
    classId: 'mage',
    role: 'เมจ / เจ้าเสน่ห์',
    avatar: '/assets/heroes/veera.png',
    splash: '/assets/ui/krixi_card.jpg',
    quote: '"ยินดีต้อนรับสู่ห้วงนิทราอันมืดมิด..."',
    skills: [
      { id: 'veera_atk', name: 'ไอเพลิงปีศาจ', tag: 'โจมตีปกติ', icon: '/assets/skills/veera_s1.png', dmg: 310, color: '#ff00ff', desc: 'ยิงไอเวทปีศาจ' },
      { id: 'veera_s1', name: 'Hell Bat', tag: 'ค้างคาวโลกันตร์', icon: '/assets/skills/veera_s1.png', dmg: 520, color: '#cc00ff', desc: 'ปล่อยค้างคาวเพลิงโลกันตร์' }
    ]
  },
  butterfly: {
    id: 'butterfly',
    name: 'BUTTERFLY',
    fullName: 'Butterfly (บัตเตอร์ฟลาย)',
    classId: 'assassin',
    role: 'แอสซาซิน / ล้วง',
    avatar: '/assets/heroes/butterfly.png',
    splash: '/assets/ui/arthur_card.jpg',
    quote: '"งานนี้เสร็จเร็วเหมือนพริบตาเดียว!"',
    skills: [
      { id: 'bf_atk', name: 'ดาบสังหาร', tag: 'โจมตีปกติ', icon: '/assets/skills/butterfly_s1.png', dmg: 340, color: '#ff0077', desc: 'ฟันดาบสังหารรวดเร็ว' },
      { id: 'bf_s1', name: 'Whirlwind', tag: 'เพลงดาบหมุน', icon: '/assets/skills/butterfly_s1.png', dmg: 460, color: '#ff3366', desc: 'เพลงดาบหมุนว่องไว' },
      { id: 'bf_ult', name: 'Backstab', tag: 'ลอบสังหาร', icon: '/assets/skills/butterfly_ult.png', dmg: 780, color: '#ff0033', isCrit: true, desc: 'พุ่งแทงลอบสังหารคริติคอล' }
    ]
  },
  nakroth: {
    id: 'nakroth',
    name: 'NAKROTH',
    fullName: 'Nakroth (นาครอส)',
    classId: 'assassin',
    role: 'แอสซาซิน / ยมทูต',
    avatar: '/assets/heroes/nakroth.png',
    splash: '/assets/ui/arthur_card.jpg',
    quote: '"ยมทูตมาทวงวิญญาณของเจ้าแล้ว!"',
    skills: [
      { id: 'nak_atk', name: 'เคียวคู่ยมทูต', tag: 'โจมตีปกติ', icon: '/assets/skills/nakroth_s2.png', dmg: 350, color: '#ff8800', desc: 'ฟันเคียวคู่ยมทูต' },
      { id: 'nak_s2', name: 'Double Whammy', tag: 'ทะลวงมิติ', icon: '/assets/skills/nakroth_s2.png', dmg: 540, color: '#ffaa00', desc: 'พุ่งตวัดฟันดาเมจทะลุเกราะ' }
    ]
  },
  valhein: {
    id: 'valhein',
    name: 'VALHEIN',
    fullName: 'Valhein (แวนเฮล)',
    classId: 'marksman',
    role: 'แครี่ / นักล่าปีศาจ',
    avatar: '/assets/heroes/valhein.png',
    splash: '/assets/heroes/violet_card.jpg',
    quote: '"ลูกปืนสีเงินจะชำระล้างความชั่วร้าย!"',
    skills: [
      { id: 'vh_atk', name: 'ปืนกงจักรเงิน', tag: 'โจมตีปกติ', icon: '/assets/skills/valhein_s2.png', dmg: 310, color: '#ffcc00', desc: 'สาดกระสุนกงจักรเงิน' },
      { id: 'vh_s2', name: 'Curse of Death', tag: 'กงจักรทอง', icon: '/assets/skills/valhein_s2.png', dmg: 450, color: '#ffdd33', desc: 'กงจักรสีทองสตั๊นเป้าหมาย' },
      { id: 'vh_ult', name: 'Bullet Storm', tag: 'พายุกระสุนเงิน', icon: '/assets/skills/valhein_ult.png', dmg: 720, color: '#ff8800', desc: 'พายุกระสุนเงินทะลวงเกราะ' }
    ]
  },
  violet: {
    id: 'violet',
    name: 'VIOLET',
    fullName: 'Violet (ไวโอเลต)',
    classId: 'marksman',
    role: 'แครี่ / มือปืนระห่ำ',
    avatar: '/assets/heroes/violet.png',
    splash: '/assets/heroes/violet_card.jpg',
    quote: '"กระสุนของฉันไม่เคยพลาดเป้า!"',
    skills: [
      { id: 'vio_atk', name: 'ปืนคู่สังหาร', tag: 'โจมตีปกติ', icon: '/assets/skills/violet_s1.png', dmg: 330, color: '#ff8800', desc: 'ยิงปืนคู่รวดเร็ว' },
      { id: 'vio_s1', name: 'Tactical Fire', tag: 'กลิ้งยิงทรงพลัง', icon: '/assets/skills/violet_s1.png', dmg: 520, color: '#ffaa00', desc: 'กลิ้งยิงเสริมดาเมจระยะไกล' },
      { id: 'vio_s2', name: 'Fire in the Hole', tag: 'ระเบิดเพลิง', icon: '/assets/skills/violet_s2.png', dmg: 440, color: '#ff4400', desc: 'ขว้างลูกระเบิดเพลิง' },
      { id: 'vio_ult', name: 'Concussive Rounds', tag: 'ปืนใหญ่สังหาร', icon: '/assets/skills/violet_ult.png', dmg: 780, color: '#ff2200', isCrit: true, desc: 'ยิงปืนใหญ่ระเบิดป้อม' }
    ]
  }
};

let selectedClass = 'fighter';
let activeHero = HEROES.arthur;
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
  dom.summonScreen = document.getElementById('summoning-screen');

  dom.startBtn = document.getElementById('start-btn');
  dom.replayBtn = document.getElementById('replay-btn');
  dom.enterBattleBtn = document.getElementById('enter-battle-btn');

  dom.classCards = document.querySelectorAll('.hero-card');
  dom.randomHeroBtn = document.getElementById('random-hero-btn');

  // Summoning screen elements
  dom.summonRoulettePhase = document.getElementById('summon-roulette-phase');
  dom.summonRevealPhase = document.getElementById('summon-reveal-phase');
  dom.summonClassTitle = document.getElementById('summon-class-title');
  dom.rouletteHeroImg = document.getElementById('roulette-hero-img');
  dom.revealHeroBanner = document.getElementById('reveal-hero-banner');
  dom.revealAvatar = document.getElementById('reveal-avatar');
  dom.revealName = document.getElementById('reveal-name');
  dom.revealRole = document.getElementById('reveal-role');
  dom.revealQuote = document.getElementById('reveal-quote');
  dom.revealSkillsList = document.getElementById('reveal-skills-list');

  // In-Game UI
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
  // Preload all skills
  Object.values(HEROES).forEach(hero => {
    hero.skills.forEach(sk => {
      if (!skillImages[sk.id]) {
        const img = new Image();
        img.src = sk.icon;
        skillImages[sk.id] = img;
      }
    });
  });

  // Class Selection on Landing Screen
  dom.classCards.forEach(card => {
    card.addEventListener('click', () => {
      dom.classCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedClass = card.dataset.class || 'fighter';
    });
  });

  // Start Button -> Triggers AAA Summoning Gacha Ritual
  dom.startBtn.addEventListener('click', () => {
    initAudio();
    startSummoningRitual(selectedClass);
  });

  // Enter Battle Button from Reveal Screen
  dom.enterBattleBtn.addEventListener('click', () => {
    dom.summonScreen.style.display = 'none';
    startGame();
  });

  // In-Game Re-roll within the chosen class
  if (dom.randomHeroBtn) {
    dom.randomHeroBtn.addEventListener('click', () => {
      rollInGameHero(selectedClass);
    });
  }

  dom.replayBtn.addEventListener('click', replay);
  window.addEventListener('resize', onResize);
}

/* ==========================================================
   AAA Hero Summoning Gacha Ritual
   ========================================================== */
function startSummoningRitual(classKey) {
  state = GameState.SUMMONING;
  dom.landing.style.display = 'none';
  dom.summonScreen.style.display = 'flex';

  dom.summonRoulettePhase.style.display = 'flex';
  dom.summonRevealPhase.style.display = 'none';

  const cls = HERO_CLASSES[classKey] || HERO_CLASSES.fighter;
  dom.summonClassTitle.textContent = `กำลังอัญเชิญฮีโร่สาย: ${cls.name}`;

  const heroPool = cls.heroes;
  let currentIndex = 0;
  let speed = 70;
  let counter = 0;
  const totalSteps = 16 + Math.floor(Math.random() * 6);

  // Play epic ritual charge sound
  playSound('summon_charge');

  function step() {
    const hKey = heroPool[currentIndex % heroPool.length];
    const hero = HEROES[hKey];

    dom.rouletteHeroImg.src = hero.avatar;
    playSound('roll');

    currentIndex++;
    counter++;

    if (counter < totalSteps) {
      speed += 10;
      setTimeout(step, speed);
    } else {
      // Finished roll -> Reveal selected hero!
      const chosenKey = heroPool[(currentIndex - 1) % heroPool.length];
      activeHero = HEROES[chosenKey];
      triggerHeroReveal(activeHero);
    }
  }

  step();
}

function triggerHeroReveal(hero) {
  playSound('summon_reveal');

  dom.summonRoulettePhase.style.display = 'none';
  dom.summonRevealPhase.style.display = 'flex';

  dom.revealAvatar.src = hero.avatar;
  dom.revealName.textContent = hero.name;
  dom.revealRole.textContent = hero.role;
  dom.revealQuote.textContent = hero.quote;

  // Render skills preview
  dom.revealSkillsList.innerHTML = '';
  hero.skills.forEach(sk => {
    const div = document.createElement('div');
    div.className = 'reveal-skill-item';
    div.innerHTML = `
      <img src="${sk.icon}" alt="${sk.name}">
      <span>${sk.tag}</span>
    `;
    dom.revealSkillsList.appendChild(div);
  });
}

/* ==========================================================
   In-Game Hero & Skill Management
   ========================================================== */
function rollInGameHero(classKey) {
  if (isRolling) return;
  isRolling = true;
  initAudio();

  const cls = HERO_CLASSES[classKey] || HERO_CLASSES.fighter;
  const heroPool = cls.heroes;
  let currentIndex = 0;
  let speed = 60;
  let counter = 0;
  const totalSteps = 12 + Math.floor(Math.random() * 4);

  function step() {
    const hKey = heroPool[currentIndex % heroPool.length];
    const hero = HEROES[hKey];

    dom.heroBadgeAvatar.src = hero.avatar;
    dom.heroBadgeName.textContent = hero.name;
    dom.heroBadgeType.textContent = hero.role;

    playSound('roll');
    currentIndex++;
    counter++;

    if (counter < totalSteps) {
      speed += 14;
      setTimeout(step, speed);
    } else {
      const chosenKey = heroPool[(currentIndex - 1) % heroPool.length];
      activeHero = HEROES[chosenKey];
      setHero(activeHero);
      playSound('win');
      isRolling = false;

      showFloatingNotice(`🎲 สุ่มได้: ${activeHero.name}!`);
    }
  }

  step();
}

function setHero(hero) {
  activeHero = hero;

  // Update In-Game Hero Badge
  if (dom.heroBadgeAvatar) dom.heroBadgeAvatar.src = hero.avatar;
  if (dom.heroBadgeName) dom.heroBadgeName.textContent = hero.name;
  if (dom.heroBadgeType) dom.heroBadgeType.textContent = hero.role;

  // Render skills in the bottom hotbar
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

function showFloatingNotice(text) {
  const el = document.createElement('div');
  el.className = 'dmg-text';
  el.textContent = text;
  el.style.color = '#ffd700';
  el.style.fontSize = '2.2rem';
  el.style.left = '32%';
  el.style.top = '60%';
  dom.damageCont.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ==========================================================
   Three.js & Graphics (AAA RoV Lighting Setup)
   ========================================================== */
function initThreeJS() {
  scene = new THREE.Scene();
  camera3d = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera3d.position.set(0, 2.5, 7.8);
  camera3d.lookAt(0, 1.2, 0);

  renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // 1. Ambient environmental base
  scene.add(new THREE.AmbientLight(0x2a3352, 1.6));

  // 2. Warm Key Light (Antaris Sun)
  const keyLight = new THREE.DirectionalLight(0xffeedd, 2.4);
  keyLight.position.set(6, 12, 6);
  scene.add(keyLight);

  // 3. Cool Blue Fill Light (Mystical Field)
  const fillLight = new THREE.DirectionalLight(0x00c8ff, 1.5);
  fillLight.position.set(-6, 4, 4);
  scene.add(fillLight);

  // 4. Gold Rim/Back Light (For high-spec metallic sheen)
  const rimLight = new THREE.DirectionalLight(0xff9900, 2.2);
  rimLight.position.set(0, 8, -6);
  scene.add(rimLight);

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
  const now = audioCtx.currentTime;

  if (type === 'attack') {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'summon_charge') {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 1.8);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 1.8);
    osc.start(now);
    osc.stop(now + 1.8);
  } else if (type === 'summon_reveal') {
    // Huge golden gong / triumph chord
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, now + i * 0.05);
      g.gain.setValueAtTime(0.35, now + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      o.start(now + i * 0.05);
      o.stop(now + 2.5);
    });
  } else if (type === 'explode') {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(20, now + 2.0);
    gainNode.gain.setValueAtTime(1.0, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
    osc.start(now);
    osc.stop(now + 2.0);
  } else if (type === 'roll') {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(1300, now + 0.05);
    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'win') {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(783.99, now + 0.1);
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

/* ==========================================================
   Game Flow
   ========================================================== */
async function startGame() {
  initAudio();
  dom.landing.style.display = 'none';
  dom.gameScreen.style.display = 'block';

  // Apply chosen hero and their skills
  setHero(activeHero);

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
  let dmgClass = isCrit ? 'dmg-crit' : (activeHero.classId === 'mage' ? 'dmg-magic' : 'dmg-text');

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
