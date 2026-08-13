/**
 * main.js — Game loop, state management & UI wiring
 * Entry point loaded by index.html
 */
import * as THREE from 'three';
import { Tower }          from './tower.js';
import { EffectsManager } from './effects.js';
import { getRandomWeapons } from './weapons.js';
import { initCamera, stopCamera } from './camera.js';

/* ==========================================================
   Constants & State
   ========================================================== */
const GameState = Object.freeze({
  LANDING:   'landing',
  PLAYING:   'playing',
  EXPLODING: 'exploding',
  VICTORY:   'victory'
});

let state = GameState.LANDING;

// Game data
let selectedWeapon  = null;
let currentWeapons  = [];
let attackCount     = 0;
let gameStartTime   = 0;
let attackCooldown  = 0;

// Timers for continuous effects
let lastSmokeTime = 0;
const SMOKE_INTERVAL = 0.28;

// Three.js
let scene, camera3d, renderer;
let tower, effects;

// Camera stream
let cameraStream = null;

// Clock
let lastTimestamp = 0;

/* ==========================================================
   DOM refs (resolved once on init)
   ========================================================== */
const $ = (id) => document.getElementById(id);

let dom = {};

/* ==========================================================
   Initialisation
   ========================================================== */
function init() {
  dom = {
    landing:    $('landing-screen'),
    gameScreen: $('game-screen'),
    victory:    $('victory-screen'),
    startBtn:   $('start-btn'),
    attackBtn:  $('attack-btn'),
    shuffleBtn: $('shuffle-btn'),
    replayBtn:  $('replay-btn'),
    hpBar:      $('hp-bar'),
    hpText:     $('hp-text'),
    weaponList: $('weapon-list'),
    damageCont: $('damage-container'),
    statAtk:    $('stat-attacks'),
    statTime:   $('stat-time'),
    video:      $('camera-feed'),
    canvas:     $('game-canvas')
  };

  // ---- Three.js scene ----
  scene = new THREE.Scene();

  camera3d = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera3d.position.set(0, 3.2, 7.5);
  camera3d.lookAt(0, 1.2, 0);

  renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    alpha: true,       // transparent so camera video shows through
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // ---- Lighting ----
  scene.add(new THREE.AmbientLight(0x404060, 1.8));

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight(0x4488ff, 0.6);
  rimLight.position.set(-5, 5, -5);
  scene.add(rimLight);

  // ---- Tower & Effects ----
  tower   = new Tower(scene);
  effects = new EffectsManager(scene);

  // ---- UI event bindings ----
  dom.startBtn.addEventListener('click', startGame);
  dom.attackBtn.addEventListener('click', attack);
  dom.shuffleBtn.addEventListener('click', shuffleWeapons);
  dom.replayBtn.addEventListener('click', replay);
  window.addEventListener('resize', onResize);

  // Pre-shuffle weapons so they appear on game start
  shuffleWeapons();
}

/* ==========================================================
   Start Game
   ========================================================== */
async function startGame() {
  dom.landing.style.display = 'none';
  dom.gameScreen.style.display = 'block';

  // Attempt camera
  try {
    cameraStream = await initCamera(dom.video);
  } catch (_err) {
    // Camera unavailable — show gradient background instead
    console.warn('Camera not available; using fallback background.');
    dom.video.style.display = 'none';
  }

  state = GameState.PLAYING;
  attackCount   = 0;
  gameStartTime = performance.now();
  lastTimestamp  = performance.now();

  updateHPBar();
  requestAnimationFrame(gameLoop);
}

/* ==========================================================
   Attack
   ========================================================== */
function attack() {
  if (state !== GameState.PLAYING) return;
  if (!selectedWeapon) return;
  if (attackCooldown > 0) return;

  // Critical hit (12 % chance → 2× damage)
  const isCrit = Math.random() < 0.12;
  const dmg    = isCrit ? selectedWeapon.damage * 2 : selectedWeapon.damage;

  tower.takeDamage(dmg);
  attackCount++;
  attackCooldown = 0.38;   // 380 ms between hits

  // 3-D hit particles at approximate tower centre
  const hitPos = new THREE.Vector3(0, -0.5 + Math.random() * 3, 0);
  effects.createHitParticles(hitPos, selectedWeapon.color, isCrit ? 25 : 14);

  // DOM floating damage
  showFloatingDamage(dmg, isCrit, selectedWeapon.color);

  // HP bar
  updateHPBar();

  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate(isCrit ? [80, 40, 80] : 40);
  }

  // Flash attack button
  dom.attackBtn.style.transform = 'translateX(-50%) scale(0.88)';
  setTimeout(() => {
    dom.attackBtn.style.transform = 'translateX(-50%) scale(1)';
  }, 100);

  // Destroyed?
  if (tower.isDestroyed()) {
    triggerExplosion();
  }
}

/* ==========================================================
   Explosion → Victory
   ========================================================== */
function triggerExplosion() {
  state = GameState.EXPLODING;

  const debrisPieces = tower.getExplosionParts();
  effects.createExplosion(new THREE.Vector3(0, -2.2, 0), debrisPieces);
  tower.hide();

  if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 300]);

  setTimeout(showVictory, 2800);
}

function showVictory() {
  state = GameState.VICTORY;
  const elapsed = ((performance.now() - gameStartTime) / 1000).toFixed(1);
  dom.statAtk.textContent  = attackCount;
  dom.statTime.textContent = elapsed + ' วินาที';
  dom.victory.style.display = 'flex';
}

/* ==========================================================
   Replay
   ========================================================== */
function replay() {
  dom.victory.style.display = 'none';

  tower.reset();
  effects.clear();
  attackCount    = 0;
  gameStartTime  = performance.now();
  selectedWeapon = null;
  attackCooldown = 0;
  lastSmokeTime  = 0;

  dom.attackBtn.disabled = true;
  shuffleWeapons();
  updateHPBar();

  state = GameState.PLAYING;
}

/* ==========================================================
   Weapons UI
   ========================================================== */
function shuffleWeapons() {
  currentWeapons = getRandomWeapons(5);
  selectedWeapon = null;
  dom.attackBtn.disabled = true;
  renderWeapons();
}

function renderWeapons() {
  dom.weaponList.innerHTML = '';

  currentWeapons.forEach((w, idx) => {
    const card = document.createElement('div');
    card.className = 'weapon-card';
    card.style.setProperty('--weapon-color', w.color);
    card.style.setProperty('--weapon-rgb', w.rgb);
    card.innerHTML = `
      <span class="weapon-icon">${w.icon}</span>
      <span class="weapon-name">${w.nameTh}</span>
      <span class="weapon-damage">DMG ${w.damage}</span>
    `;
    card.addEventListener('click', () => selectWeapon(idx));
    dom.weaponList.appendChild(card);
  });
}

function selectWeapon(idx) {
  selectedWeapon = currentWeapons[idx];
  dom.attackBtn.disabled = false;

  document.querySelectorAll('.weapon-card').forEach((c, i) => {
    c.classList.toggle('selected', i === idx);
  });
}

/* ==========================================================
   Floating Damage (DOM)
   ========================================================== */
function showFloatingDamage(amount, isCrit, color) {
  const el = document.createElement('div');
  el.className = 'floating-damage' + (isCrit ? ' critical' : '');
  el.textContent = isCrit ? `${amount} CRIT!` : `-${amount}`;
  el.style.color = color;
  // Random horizontal spread around centre
  el.style.left = `${38 + Math.random() * 24}%`;
  el.style.top  = `${28 + Math.random() * 14}%`;
  dom.damageCont.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ==========================================================
   HP Bar
   ========================================================== */
function updateHPBar() {
  const pct = tower.getHPPercent();
  dom.hpBar.style.width = `${pct * 100}%`;
  dom.hpText.textContent = `${tower.currentHP} / ${tower.maxHP}`;

  if (pct > 0.5) {
    dom.hpBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
  } else if (pct > 0.25) {
    dom.hpBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
  } else {
    dom.hpBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
  }
}

/* ==========================================================
   Game Loop
   ========================================================== */
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  if (state === GameState.PLAYING || state === GameState.EXPLODING) {
    // Attack cooldown
    if (attackCooldown > 0) attackCooldown -= dt;

    // Continuous damage-stage effects
    if (state === GameState.PLAYING) {
      lastSmokeTime += dt;
      if (lastSmokeTime >= SMOKE_INTERVAL) {
        lastSmokeTime = 0;
        const hp = tower.getHPPercent();
        const base = new THREE.Vector3(0, -2.2, 0);

        if (hp < 0.75 && hp > 0) {
          effects.createSmokeParticles(base, hp < 0.5 ? 3 : 1);
        }
        if (hp < 0.5 && hp > 0) {
          effects.createFireParticles(base, hp < 0.25 ? 6 : 2);
        }
      }
    }

    tower.update(dt);
    effects.update(dt);
    renderer.render(scene, camera3d);
  }

  requestAnimationFrame(gameLoop);
}

/* ==========================================================
   Resize
   ========================================================== */
function onResize() {
  camera3d.aspect = window.innerWidth / window.innerHeight;
  camera3d.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ==========================================================
   Boot
   ========================================================== */
document.addEventListener('DOMContentLoaded', init);
