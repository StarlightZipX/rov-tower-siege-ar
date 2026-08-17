/**
 * main.js — RoV AR Tournament with 40 Authentic RoV Heroes,
 * 100% Real RoV Skill Sets (Full 4 Actions for EVERY Hero: Basic Attack + Skill 1 + Skill 2 + Ultimate),
 * Class-Strict Gacha, and Cinematic 6-Second Match Loading Screen
 */
import * as THREE from 'three';
import { Tower }          from './tower.js';
import { EffectsManager } from './effects.js';
import { initCamera, toggleCamera } from './camera.js';
import { HandTracker }    from './hand-tracking.js';

/* ==========================================================
   State & Constants
   ========================================================== */
const GameState = Object.freeze({
  LANDING:   'landing',
  SUMMONING: 'summoning',
  LOADING:   'loading',
  PLAYING:   'playing',
  EXPLODING: 'exploding',
  VICTORY:   'victory',
  DEFEAT:    'defeat'
});

let state = GameState.LANDING;
let attackCount = 0;
let totalDamageDealt = 0;
let gameStartTime = 0;
let lastTimestamp = 0;
let lastSmokeTime = 0;
const SMOKE_INTERVAL = 0.28;

// AR Gyroscope & Parallax Tracking
let targetCamX = 0;
let targetCamY = 1.0;
let currentCamX = 0;
let currentCamY = 1.0;
let isGyroActive = false;

let currentGold = 500;
let bonusDamage = 0;

let ultimateCharge = 0; // 0 to 100
const MAX_ULT_CHARGE = 100;
const ULT_RING_CIRCUMFERENCE = 257.6;
let isUltimateReady = false;

// Player Health & Challenger Skill: Shield
let playerHP = 1000;
const maxPlayerHP = 1000;
let isShieldActive = false;
let shieldCooldownTimer = 0;
const SHIELD_COOLDOWN = 6.0;

// Tower Retaliation Loop
let towerAttackTimer = 5.0;
let isTowerLockingOn = false;

/* ==========================================================
   RoV Hero Classes & Strict 10-Hero Pools (40 Heroes Total)
   ========================================================== */
const HERO_CLASSES = {
  fighter: {
    id: 'fighter',
    name: 'FIGHTER / TANK',
    title: 'สายไฟต์เตอร์ / แทงค์',
    heroes: ['arthur', 'lubu', 'maloch', 'thane', 'omen', 'ryoma', 'taara', 'astrid', 'skud', 'airi']
  },
  mage: {
    id: 'mage',
    name: 'MAGE',
    title: 'สายเมจ / พลังเวท',
    heroes: ['krixi', 'veera', 'natalya', 'liliana', 'tulen', 'raz', 'lauriel', 'kahlii', 'ilumia', 'aleister']
  },
  assassin: {
    id: 'assassin',
    name: 'ASSASSIN',
    title: 'สายแอสซาซิน / ล้วง',
    heroes: ['butterfly', 'nakroth', 'murad', 'kriknak', 'zill', 'wukong', 'kaine', 'quillen', 'paine', 'keera']
  },
  marksman: {
    id: 'marksman',
    name: 'MARKSMAN',
    title: 'สายแครี่ / ยิงไกล',
    heroes: ['valhein', 'violet', 'yorn', 'slimz', 'thorne', 'fennik', 'moren', 'lindis', 'wisp', 'telannas']
  }
};

/* ==========================================================
   40 Authentic RoV Heroes — ALL 40 HEROES HAVE 4 ACTIONS:
   [ โจมตีปกติ (Basic Attack), สกิล 1 (Skill 1), สกิล 2 (Skill 2), อัลติเมท (Ultimate) ]
   ========================================================== */
const HEROES = {
  // ==================== FIGHTER (10 Heroes) ====================
  arthur: {
    id: 'arthur', name: 'ARTHUR', fullName: 'Arthur (อาเธอร์)', classId: 'fighter', role: 'ไฟต์เตอร์ / แทงค์',
    avatar: './assets/heroes/arthur.png', splash: './assets/ui/arthur_card.jpg', quote: '"ดาบแห่งความยุติธรรมจะไม่ปรานีใคร!"',
    skills: [
      { id: 'arthur_atk', name: 'ดาบแห่งความยุติธรรม', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 380, color: '#ffd700', desc: 'ฟันดาบอัศวินแห่งความยุติธรรม' },
      { id: 'arthur_s1', name: 'Righteous Fervor', tag: 'ดาบศักดิ์สิทธิ์', icon: './assets/skills/arthur_s1.png', dmg: 490, color: '#ffb700', desc: 'เร่งความเร็วฟาดดาบศักดิ์สิทธิ์' },
      { id: 'arthur_s2', name: 'Holy Guard', tag: 'กงจักรดาบ', icon: './assets/skills/arthur_s2.png', dmg: 430, color: '#ff9900', desc: 'กงจักรดาบหมุนวนรอบตัว' },
      { id: 'arthur_ult', name: 'Deep Impact', tag: 'ดาบผ่ามิติ', icon: './assets/skills/arthur_ult.png', dmg: 790, color: '#ff3300', isCrit: true, desc: 'กระโดดฟาดดาบยักษ์ผ่ามิติ' }
    ]
  },
  lubu: {
    id: 'lubu', name: 'LU BU', fullName: 'Lu Bu (ลิโป้)', classId: 'fighter', role: 'ไฟต์เตอร์ / จอมคน',
    avatar: './assets/heroes/lubu.png', splash: './assets/ui/arthur_card.jpg', quote: '"ใต้หล้านี้ ไม่มีใครกล้าสบตาข้าผู้นี้!"',
    skills: [
      { id: 'lubu_atk', name: 'ทวนศึกสะท้านภพ', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff5500', desc: 'ฟาดทวนศึกจอมคนสะท้านภพ' },
      { id: 'lubu_s1', name: 'Red Stallion', tag: 'ทวนสามทิศ', icon: './assets/skills/red_stallion.png', dmg: 510, color: '#ff4400', desc: 'กระหน่ำแทงทวนศึก 3 จังหวะ' },
      { id: 'lubu_s2', name: 'Impale', tag: 'หอกผ่าเวหา', icon: './assets/skills/impale.png', dmg: 470, color: '#ff7700', desc: 'ตวัดหอกคลื่นลมชะลอเป้าหมาย' },
      { id: 'lubu_ult', name: 'Conqueror', tag: 'เทพสงคราม', icon: './assets/skills/conqueror.png', dmg: 840, color: '#ff0000', isCrit: true, desc: 'ระเบิดพลังเทพสงครามอมตะฟื้นฟูเลือด' }
    ]
  },
  maloch: {
    id: 'maloch', name: 'MALOCH', fullName: 'Maloch (มาลอค)', classId: 'fighter', role: 'ไฟต์เตอร์ / จอมมาร',
    avatar: './assets/heroes/maloch.png', splash: './assets/ui/arthur_card.jpg', quote: '"ขุมนรกจะกลืนกินเจ้าทั้งเป็น!"',
    skills: [
      { id: 'maloch_atk', name: 'ดาบมารโลกันตร์', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 400, color: '#ff0033', desc: 'ฟันดาบมารโลกันตร์กวาดศัตรู' },
      { id: 'maloch_s1', name: 'Cleave', tag: 'ดาบมารฟันกวาด', icon: './assets/skills/1_cleave.png', dmg: 560, color: '#ff0055', desc: 'ฟันกวาดดาเมจจริงทะลุเกราะ 100%' },
      { id: 'maloch_s2', name: 'Souleater', tag: 'กรงเล็บดูดวิญญาณ', icon: './assets/skills/2_souleater.png', dmg: 460, color: '#cc0044', desc: 'กระชากวิญญาณสร้างเกราะหนา' },
      { id: 'maloch_ult', name: 'Shock', tag: 'กระแทกนรก', icon: './assets/skills/ult_shock.png', dmg: 860, color: '#cc0033', isCrit: true, desc: 'กระโดดทิ้งดิ่งถล่มป้อม' }
    ]
  },
  thane: {
    id: 'thane', name: 'THANE', fullName: 'Thane (เธน)', classId: 'fighter', role: 'แทงค์ / ราชาดาบ',
    avatar: './assets/heroes/thane.png', splash: './assets/ui/arthur_card.jpg', quote: '"ดาบเอกซ์คาลิเบอร์จะปกป้องบัลลังก์!"',
    skills: [
      { id: 'thane_atk', name: 'ดาบเอกซ์คาลิเบอร์', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 380, color: '#ffcc00', desc: 'ฟันดาบศักดิ์สิทธิ์เอกซ์คาลิเบอร์' },
      { id: 'thane_s1', name: 'Valiant Charge', tag: 'พุ่งชนโล่', icon: './assets/skills/valiant_charge.png', dmg: 480, color: '#ffcc00', desc: 'พุ่งกระแทกโล่อัศวิน' },
      { id: 'thane_s2', name: 'Avalon', tag: 'ทุบโล่อวาลอน', icon: './assets/skills/royal_power.png', dmg: 450, color: '#ffee33', desc: 'ทุบพื้นดินยกศัตรูชะลอความเร็ว' },
      { id: 'thane_ult', name: "King's Glory", tag: 'ดาบยักษ์ผ่าปฐพี', icon: './assets/skills/king_s_glory.png', dmg: 840, color: '#ffaa00', isCrit: true, desc: 'ฟาดดาบยักษ์เอกซ์คาลิเบอร์สร้างดาเมจจริง' }
    ]
  },
  omen: {
    id: 'omen', name: 'OMEN', fullName: 'Omen (โอเมน)', classId: 'fighter', role: 'ไฟต์เตอร์ / ดาบโซ่สังหาร',
    avatar: './assets/heroes/omen.png', splash: './assets/ui/arthur_card.jpg', quote: '"เสียงโซ่ตรวนคือสัญญาณแห่งความตาย..."',
    skills: [
      { id: 'omen_atk', name: 'ดาบโซ่กระหน่ำฟัน', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff3300', desc: 'ฟันดาบโซ่สะสมแต้มความกระหายเลือด' },
      { id: 'omen_s1', name: "Death's Beckon", tag: 'กระชากโซ่สังหาร', icon: './assets/skills/deaths_beckon.png', dmg: 480, color: '#ff5500', desc: 'ตวัดโซ่กระชากเป้าหมายเข้าหาตัว' },
      { id: 'omen_s2', name: 'Untouchable', tag: 'สะท้อนการโจมตี', icon: './assets/skills/untouchable.png', dmg: 530, color: '#ff4400', desc: 'เปิดม่านพลังสะท้อนความเสียหาย' },
      { id: 'omen_ult', name: "Death's Embrace", tag: 'ลานประหาร', icon: './assets/skills/deaths_embrace.png', dmg: 850, color: '#990022', isCrit: true, desc: 'พุ่งขังตรึงเป้าหมายในลานประหาร' }
    ]
  },
  ryoma: {
    id: 'ryoma', name: 'RYOMA', fullName: 'Ryoma (เรียวมะ)', classId: 'fighter', role: 'ไฟต์เตอร์ / ซามูไร',
    avatar: './assets/heroes/ryoma.png', splash: './assets/ui/arthur_card.jpg', quote: '"คมดาบของข้า เร็วกว่าเงา!"',
    skills: [
      { id: 'ryoma_atk', name: 'เพลงดาบซามูไร', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#00ccff', desc: 'ตวัดดาบซามูไรระยะไกลชะลอเป้าหมาย' },
      { id: 'ryoma_s1', name: 'Pin Wheel', tag: 'ตวัดดาบม้วนหลัง', icon: './assets/skills/naginatajutsu.png', dmg: 490, color: '#00ddff', desc: 'กระโดดม้วนตัวตวัดฟันคลื่นลม' },
      { id: 'ryoma_s2', name: 'Wailing Blade', tag: 'แทงดาบทะลวง', icon: './assets/skills/wailing_blade.png', dmg: 570, color: '#33ccff', desc: 'แทงดาบคลื่นลมสตั๊นเป้าหมาย' },
      { id: 'ryoma_ult', name: 'Spectral Spear', tag: 'รัวกระหน่ำคมดาบ', icon: './assets/skills/naginatajutsu.png', dmg: 850, color: '#0099ff', isCrit: true, desc: 'แทงดาบรัว 4 จังหวะต่อเนื่องฟื้นฟูเลือด' }
    ]
  },
  taara: {
    id: 'taara', name: 'TAARA', fullName: 'Taara (ทาร่า)', classId: 'fighter', role: 'แทงค์ / ค้อนยักษ์',
    avatar: './assets/heroes/taara.png', splash: './assets/ui/arthur_card.jpg', quote: '"ค้อนเหล็กจะบดขยี้ทุกสิ่ง!"',
    skills: [
      { id: 'taara_atk', name: 'ค้อนเหล็กทุบพิฆาต', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 380, color: '#ffaa00', desc: 'ฟาดค้อนเหล็กหนักทุบถล่มศัตรู' },
      { id: 'taara_s1', name: 'Colossal Smash', tag: 'ทุบกระแทกพื้น', icon: './assets/skills/colossal_smash.png', dmg: 490, color: '#ff8800', desc: 'กระโดดทุบค้อนสะเทือนดิน' },
      { id: 'taara_s2', name: 'Whirlwind', tag: 'ควงค้อนสว่าน', icon: './assets/skills/whirlwind.png', dmg: 540, color: '#ff6600', desc: 'ควงค้อนเหล็กหมุนรอบตัว' },
      { id: 'taara_ult', name: 'Steeled Focus', tag: 'ฟื้นฟูไร้ขีดจำกัด', icon: './assets/skills/steeled_focus.png', dmg: 800, color: '#ffbb00', desc: 'ฟื้นฟูเลือดและระเบิดพลังวิ่งไว' }
    ]
  },
  astrid: {
    id: 'astrid', name: 'ASTRID', fullName: 'Astrid (แอสตริด)', classId: 'fighter', role: 'ไฟต์เตอร์ / เพลงดาบเพลิง',
    avatar: './assets/heroes/astrid.png', splash: './assets/ui/arthur_card.jpg', quote: '"เพื่อเกียรติยศแห่งตระกูลโรส!"',
    skills: [
      { id: 'astrid_atk', name: 'เพลงดาบแห่งโรส', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff6600', desc: 'ฟันดาบตระกูลโรสรวดเร็ว' },
      { id: 'astrid_s1', name: 'Spin Slash', tag: 'ฟันดาบหมุนเพลิง', icon: './assets/skills/spin_slash.png', dmg: 530, color: '#ff5500', desc: 'ตวัดดาบหมุนเพลิงรอบตัว' },
      { id: 'astrid_s2', name: 'Fearless Charge', tag: 'พุ่งแทงทะลวงเกราะ', icon: './assets/skills/fearless_charge.png', dmg: 510, color: '#ff7700', desc: 'พุ่งแทงดาบทะลวงลดเกราะเป้าหมาย' },
      { id: 'astrid_ult', name: 'Dire Blow', tag: 'ดาบอมตะผ่าพิภพ', icon: './assets/skills/dire_blow.png', dmg: 870, color: '#ff1100', isCrit: true, desc: 'ฟันดาบยักษ์สถานะอมตะดาเมจจริง' }
    ]
  },
  skud: {
    id: 'skud', name: 'SKUD', fullName: 'Skud (สกั๊ด)', classId: 'fighter', role: 'ไฟต์เตอร์ / หมัดเหล็ก',
    avatar: './assets/heroes/skud.png', splash: './assets/ui/arthur_card.jpg', quote: '"หมัดไซบอร์กนี้ ทลายได้แม้แต่ภูผา!"',
    skills: [
      { id: 'skud_atk', name: 'หมัดเหล็กไซบอร์ก', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 400, color: '#ff8800', desc: 'ชกหมัดเหล็กไซบอร์กหนักหน่วง' },
      { id: 'skud_s1', name: 'Furious Charge', tag: 'หมัดพุ่งชน', icon: './assets/skills/1_furious_charge.png', dmg: 520, color: '#ff7700', desc: 'พุ่งกระแทกหมัดเหล็กงัดศัตรู' },
      { id: 'skud_s2', name: 'Power Glove', tag: 'หมัดชาร์จพลังยักษ์', icon: './assets/skills/2_power_glove.png', dmg: 580, color: '#ff5500', desc: 'ชาร์จหมัดยักษ์ระเบิดพลังถล่มป้อม' },
      { id: 'skud_ult', name: 'Wild Beast Fury', tag: 'หมัดคลั่งระเบิดปฐพี', icon: './assets/skills/ult_wild_beast_fury.png', dmg: 860, color: '#ff2200', isCrit: true, desc: 'เหวี่ยงหมัดคลั่งหมุนฟาดกระเด็นรอบทิศ' }
    ]
  },
  airi: {
    id: 'airi', name: 'AIRI', fullName: 'Airi (ไอริ)', classId: 'fighter', role: 'ไฟต์เตอร์ / นินจามังกร',
    avatar: './assets/heroes/airi.png', splash: './assets/ui/arthur_card.jpg', quote: '"พลังมังกรสถิตอยู่ในคมดาบ!"',
    skills: [
      { id: 'airi_atk', name: 'ดาบนินจามังกร', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#00e5ff', desc: 'ฟันดาบคู่นินจามังกรลดคูลดาวน์' },
      { id: 'airi_s1', name: 'Spin', tag: 'ดาวกระจายมังกร', icon: './assets/skills/spin.png', dmg: 490, color: '#00ffcc', desc: 'ขว้างดาวกระจายมังกรสตั๊น' },
      { id: 'airi_s2', name: 'Shadow', tag: 'พุ่งเงาดาบ 3 จังหวะ', icon: './assets/skills/shadow.png', dmg: 530, color: '#00e5ff', desc: 'พุ่งตวัดดาบ 3 จังหวะต่อเนื่อง' },
      { id: 'airi_ult', name: 'Dragon Blade', tag: 'มังกรสะบัดคม', icon: './assets/skills/dragon.png', dmg: 870, color: '#00ffff', isCrit: true, desc: 'ปลดปล่อยมังกรสร้างดาเมจจริง' }
    ]
  },

  // ==================== MAGE (10 Heroes) ====================
  krixi: {
    id: 'krixi', name: 'KRIXI', fullName: 'Krixi (คริกซี่)', classId: 'mage', role: 'เมจ / พลังเวท',
    avatar: './assets/heroes/krixi.png', splash: './assets/ui/krixi_card.jpg', quote: '"สายลมและผีเสื้อจะปกป้องป่าแห่งนี้!"',
    skills: [
      { id: 'krixi_atk', name: 'เวทมนตร์ผีเสื้อ', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 370, color: '#33ddff', desc: 'ยิงละอองเวทผีเสื้อ' },
      { id: 'krixi_s1', name: 'Mischief', tag: 'คลื่นผีเสื้อ', icon: './assets/skills/krixi_s1.png', dmg: 520, color: '#33ccff', desc: 'ปล่อยฝูงผีเสื้อระเบิดใส่ป้อม' },
      { id: 'krixi_s2', name: "Nature's Wrath", tag: 'พายุดอกไม้', icon: './assets/skills/krixi_s2.png', dmg: 460, color: '#66ff66', desc: 'พายุบุปผายกเป้าหมาย' },
      { id: 'krixi_ult', name: 'Moonfall', tag: 'ฝนดาวตกผีเสื้อ', icon: './assets/skills/krixi_ult.png', dmg: 850, color: '#cc66ff', desc: 'ฝนดาวตกผีเสื้อถล่มป้อม' }
    ]
  },
  veera: {
    id: 'veera', name: 'VEERA', fullName: 'Veera (วีร่า)', classId: 'mage', role: 'เมจ / เจ้าเสน่ห์',
    avatar: './assets/heroes/veera.png', splash: './assets/ui/krixi_card.jpg', quote: '"ยินดีต้อนรับสู่ห้วงนิทราอันมืดมิด..."',
    skills: [
      { id: 'veera_atk', name: 'เวทมนตร์ราตรี', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 370, color: '#dd00ff', desc: 'ยิงลูกแก้วมนตราปีศาจราตรี' },
      { id: 'veera_s1', name: 'Hell Bat', tag: 'ค้างคาวโลกันตร์', icon: './assets/skills/hell_bat.png', dmg: 540, color: '#cc00ff', desc: 'ปล่อยค้างคาวเพลิงโลกันตร์' },
      { id: 'veera_s2', name: 'Kisses', tag: 'จุมพิตเสน่ห์', icon: './assets/skills/come_hither.png', dmg: 490, color: '#ff66cc', desc: 'ส่งจุมพิตหัวใจสตั๊นเป้าหมาย' },
      { id: 'veera_ult', name: 'Little Bats', tag: 'ฝูงค้างคาวสังหาร', icon: './assets/skills/come_hither.png', dmg: 870, color: '#ff00aa', isCrit: true, desc: 'กระหน่ำค้างคาวปีศาจ 5 ตัวรวด' }
    ]
  },
  natalya: {
    id: 'natalya', name: 'NATALYA', fullName: 'Natalya (นาตาเลีย)', classId: 'mage', role: 'เมจ / ลำแสงพิษ',
    avatar: './assets/heroes/natalya.png', splash: './assets/ui/krixi_card.jpg', quote: '"วิญญาณของพวกเจ้า จะเป็นอาหารของอสูร!"',
    skills: [
      { id: 'nat_atk', name: 'เพลิงมรกตสังหาร', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 380, color: '#00ff77', desc: 'ยิงลูกไฟเพลิงมรกตสังหาร' },
      { id: 'nat_s1', name: 'Arcane Spirits', tag: 'ภูติวิญญาณสังหาร', icon: './assets/skills/1_arcane_spirits.png', dmg: 550, color: '#00ff88', desc: 'ยิงภูติวิญญาณเพลิงมรกต 5 ดวง' },
      { id: 'nat_s2', name: 'Arcane Nova', tag: 'วงเวทพิษระเบิด', icon: './assets/skills/2_arcane_nova.png', dmg: 510, color: '#33ffaa', desc: 'ปล่อยลูกบอลเวทระเบิดสตั๊นลดสปีด' },
      { id: 'nat_ult', name: 'Lethal Rays', tag: 'ลำแสงอสูรทำลายล้าง', icon: './assets/skills/ult_lethal_rays.png', dmg: 890, color: '#00ffaa', isCrit: true, desc: 'ยิงลำแสงเลเซอร์ทำลายล้างทะลวงป้อม' }
    ]
  },
  liliana: {
    id: 'liliana', name: 'LILIANA', fullName: 'Liliana (ลิเลียน่า)', classId: 'mage', role: 'เมจ / จิ้งจอกเก้าหาง',
    avatar: './assets/heroes/liliana.png', splash: './assets/ui/krixi_card.jpg', quote: '"มนุษย์ช่างน่าสนใจ แต่ก็เปราะบางเหลือเกิน..."',
    skills: [
      { id: 'lili_atk', name: 'ลูกแก้วเก้าหาง', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 370, color: '#ff66aa', desc: 'ยิงลูกแก้ววิญญาณจิ้งจอก' },
      { id: 'lili_s1', name: 'Shining Light', tag: 'แสงจิ้งจอกเบ่งบาน', icon: './assets/skills/shining_light.png', dmg: 530, color: '#ff77bb', desc: 'กางวงเวทแสงจิ้งจอกระเบิด' },
      { id: 'lili_s2', name: 'Blinding Light', tag: 'ประกายแสงลวงตา', icon: './assets/skills/blinding_light.png', dmg: 500, color: '#ff99cc', desc: 'ยิงกระสุนแสงจิ้งจอกสตั๊น' },
      { id: 'lili_ult', name: 'Fox Form', tag: 'แปลงร่างเก้าหาง', icon: './assets/skills/fox_form.png', dmg: 860, color: '#ff33aa', isCrit: true, desc: 'กลายร่างจิ้งจอกเก้าหางปล่อยบอลวิญญาณ' }
    ]
  },
  tulen: {
    id: 'tulen', name: 'TULEN', fullName: 'Tulen (ทูเลน)', classId: 'mage', role: 'เมจ / สายฟ้าเทพ',
    avatar: './assets/heroes/tulen.png', splash: './assets/ui/krixi_card.jpg', quote: '"สายฟ้าของข้า จะพิพากษาพวกเจ้า!"',
    skills: [
      { id: 'tulen_atk', name: 'กระสุนสายฟ้าเทวะ', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 380, color: '#fff000', desc: 'ยิงกระสุนสายฟ้าเทวะ' },
      { id: 'tulen_s1', name: 'Ion Blaster', tag: 'กระสุนแสงสายฟ้า', icon: './assets/skills/lightning_strike.png', dmg: 530, color: '#ffee00', desc: 'ยิงกระสุนแสงสายฟ้า 3 แฉก' },
      { id: 'tulen_s2', name: 'Lightning Strike', tag: 'วาร์ปสายฟ้า', icon: './assets/skills/lightning_strike.png', dmg: 510, color: '#ffea00', desc: 'วาร์ปทิ้งรอยสายฟ้าช็อตป้อม' },
      { id: 'tulen_ult', name: 'Thunderbird', tag: 'วิหคสายฟ้าพิฆาต', icon: './assets/skills/thunderbird.png', dmg: 900, color: '#ffff00', isCrit: true, desc: 'ยิงวิหคสายฟ้าปิดฉาก' }
    ]
  },
  raz: {
    id: 'raz', name: 'RAZ', fullName: 'Raz (ราซ)', classId: 'mage', role: 'เมจ / หมัดมวยเพลิง',
    avatar: './assets/heroes/raz.png', splash: './assets/ui/krixi_card.jpg', quote: '"หมัดเพลิงของข้า ร้อนแรงเกินต้านทาน!"',
    skills: [
      { id: 'raz_atk', name: 'หมัดมวยเพลิงโลกันตร์', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff6600', desc: 'ชกหมัดมวยเพลิงผลักเป้าหมาย' },
      { id: 'raz_s1', name: 'Rising Uppercut', tag: 'หมัดมวยทะยานฟ้า', icon: './assets/skills/1_rising_uppercut.png', dmg: 540, color: '#ff7700', desc: 'พุ่งปล่อยหมัดอัปเปอร์คัตเสยลอย' },
      { id: 'raz_s2', name: 'Power Surge', tag: 'ปล่อยหมัดคลื่นเพลิง', icon: './assets/skills/2_power_surge.png', dmg: 590, color: '#ff5500', desc: 'ปล่อยหมัดคลื่นเพลิงระยะไกลลดเกราะเวท' },
      { id: 'raz_ult', name: 'Explosive K.O.', tag: 'หมัดอสูรเพลิงสังหาร', icon: './assets/skills/ult_explosive_ko.png', dmg: 880, color: '#ff2200', isCrit: true, desc: 'พุ่งกระแทกหมัดเพลิงยักษ์ผลักกระจาย' }
    ]
  },
  lauriel: {
    id: 'lauriel', name: 'LAURIEL', fullName: 'Lauriel (ลอเรียล)', classId: 'mage', role: 'เมจ / ทูตสวรรค์',
    avatar: './assets/heroes/lauriel.png', splash: './assets/ui/krixi_card.jpg', quote: '"แสงศักดิ์สิทธิ์จะชำระล้างมลทินทั้งปวง"',
    skills: [
      { id: 'lau_atk', name: 'ประกายแสงสวรรค์', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 370, color: '#ffffff', desc: 'ยิงละอองแสงชำระล้างมลทิน' },
      { id: 'lau_s1', name: 'Holy Light', tag: 'กากบาทศักดิ์สิทธิ์', icon: './assets/skills/holy_light.png', dmg: 540, color: '#ffffff', desc: 'วาดกากบาทแสงทูตสวรรค์ระเบิด' },
      { id: 'lau_s2', name: 'Blink', tag: 'ปีกศักดิ์สิทธิ์', icon: './assets/skills/holy_light.png', dmg: 510, color: '#eef8ff', desc: 'พุ่งวาร์ปปล่อยลูกแก้วแสง 3 ลูก' },
      { id: 'lau_ult', name: 'Smite', tag: 'วงเวทพิพากษา', icon: './assets/skills/holy_light.png', dmg: 850, color: '#fff0a0', isCrit: true, desc: 'กางวงเวทศักดิ์สิทธิ์ลดคูลดาวน์สแปมสกิล' }
    ]
  },
  kahlii: {
    id: 'kahlii', name: 'KAHLII', fullName: 'Kahlii (กาลี)', classId: 'mage', role: 'เมจ / เทพีกาลี',
    avatar: './assets/heroes/kahlii.png', splash: './assets/ui/krixi_card.jpg', quote: '"วิญญาณแค้นพันเล่ม จะทิ่มแทงพวกเจ้า!"',
    skills: [
      { id: 'kah_atk', name: 'วิญญาณแค้นทิ่มแทง', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#aa00ff', desc: 'ยิงลำแสงวิญญาณทะลุเป้าหมาย' },
      { id: 'kah_s1', name: 'Damnation', tag: 'วงเวทสาปแช่ง', icon: './assets/skills/damnation.png', dmg: 520, color: '#bb00ff', desc: 'สร้างอาณาเขตเวทสาปดูดเลือด' },
      { id: 'kah_s2', name: 'Incorporeal', tag: 'ม่านวิญญาณเร่งสปีด', icon: './assets/skills/incorporeal.png', dmg: 470, color: '#cc33ff', desc: 'เปิดโล่วิญญาณเพิ่มพลังเวทและความเร็ว' },
      { id: 'kah_ult', name: 'Ethering Ghost', tag: 'วิญญาณพันเล่ม', icon: './assets/skills/damnation.png', dmg: 880, color: '#9900ff', isCrit: true, desc: 'สาดดาบวิญญาณพันเล่มถล่มป้อม' }
    ]
  },
  ilumia: {
    id: 'ilumia', name: 'ILUMIA', fullName: 'Ilumia (อิลูเมีย)', classId: 'mage', role: 'เมจ / เทพีสูงสุดแห่งวิหาร',
    avatar: './assets/heroes/ilumia.png', splash: './assets/ui/krixi_card.jpg', quote: '"ยอมจำนนต่อแสงแห่งเทพเสียเถิด!"',
    skills: [
      { id: 'ilu_atk', name: 'ลำแสงเทวะสูงสุด', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 370, color: '#ffea66', desc: 'ยิงลำแสงเทวะแห่งวิหารศักดิ์สิทธิ์' },
      { id: 'ilu_s1', name: 'Divine Light', tag: 'ประกายแสงศักดิ์สิทธิ์', icon: './assets/skills/1_divine_light.png', dmg: 530, color: '#fff275', desc: 'ยิงลูกแก้วแสงศักดิ์สิทธิ์ระเบิดสตั๊น' },
      { id: 'ilu_s2', name: 'Banish', tag: 'คลื่นผลักศักดิ์สิทธิ์', icon: './assets/skills/2_banish.png', dmg: 510, color: '#ffe600', desc: 'ผลักศัตรูรอบตัวด้วยแสงศักดิ์สิทธิ์' },
      { id: 'ilu_ult', name: 'Cataclysm', tag: 'สายฟ้าสวรรค์', icon: './assets/skills/ult_cataclysm.png', dmg: 900, color: '#ffcc00', isCrit: true, desc: 'ทิ้งสายฟ้าสวรรค์ถล่มทั่วแมพสตั๊น' }
    ]
  },
  aleister: {
    id: 'aleister', name: 'ALEISTER', fullName: 'Aleister (อเลสเตอร์)', classId: 'mage', role: 'เมจ / บงการวิญญาณ',
    avatar: './assets/heroes/aleister.png', splash: './assets/ui/krixi_card.jpg', quote: '"เวทมนตร์ของข้า จะทรมานพวกเจ้าช้าๆ..."',
    skills: [
      { id: 'ale_atk', name: 'กระแสไฟฟ้าทมิฬ', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 370, color: '#00ff88', desc: 'ยิงกระแสไฟฟ้าเวทมนตร์ทมิฬ' },
      { id: 'ale_s1', name: 'Magic Barrier', tag: 'กำแพงสายฟ้าสตั๊น', icon: './assets/skills/magic_barrier.png', dmg: 510, color: '#00ff99', desc: 'กางกำแพงสายฟ้าสตั๊นเป้าหมาย' },
      { id: 'ale_s2', name: 'Matrix of Woe', tag: 'วงเวทสายฟ้าทรมาน', icon: './assets/skills/matrix_of_woe.png', dmg: 540, color: '#00e676', desc: 'สร้างอาณาเขตเวทสายฟ้าช็อตต่อเนื่อง' },
      { id: 'ale_ult', name: 'Magic Prison', tag: 'คุกเวทพันธนาการ', icon: './assets/skills/magic_prison.png', dmg: 850, color: '#00cc77', isCrit: true, desc: 'ร่ายคุกเวทพันธนาการตรึงป้อม' }
    ]
  },

  // ==================== ASSASSIN (10 Heroes) ====================
  butterfly: {
    id: 'butterfly', name: 'BUTTERFLY', fullName: 'Butterfly (บัตเตอร์ฟลาย)', classId: 'assassin', role: 'แอสซาซิน / ล้วง',
    avatar: './assets/heroes/butterfly.png', splash: './assets/ui/arthur_card.jpg', quote: '"งานนี้เสร็จเร็วเหมือนพริบตาเดียว!"',
    skills: [
      { id: 'bf_atk', name: 'ดาบคู่สังหาร', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff2255', desc: 'ฟันดาบคู่สังหารรวดเร็ว' },
      { id: 'bf_s1', name: 'Whirlwind', tag: 'เพลงดาบหมุน', icon: './assets/skills/whirlwind.png', dmg: 520, color: '#ff3366', desc: 'เพลงดาบหมุนว่องไวเพิ่มความเร็ว' },
      { id: 'bf_s2', name: 'Sword Projectile', tag: 'ตวัดดาบสังหาร', icon: './assets/skills/flying_daggers.png', dmg: 550, color: '#ff1155', desc: 'ตวัดดาบแทงคลื่นลมชะลอเป้าหมาย' },
      { id: 'bf_ult', name: 'Backstab', tag: 'ลอบสังหารด้านหลัง', icon: './assets/skills/backstab.png', dmg: 860, color: '#ff0033', isCrit: true, desc: 'พุ่งแทงลอบสังหารคริติคอลรุนแรง' }
    ]
  },
  nakroth: {
    id: 'nakroth', name: 'NAKROTH', fullName: 'Nakroth (นาครอส)', classId: 'assassin', role: 'แอสซาซิน / ยมทูต',
    avatar: './assets/heroes/nakroth.png', splash: './assets/ui/arthur_card.jpg', quote: '"ยมทูตมาทวงวิญญาณของเจ้าแล้ว!"',
    skills: [
      { id: 'nak_atk', name: 'เคียวคู่ยมทูต', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff9900', desc: 'ฟันเคียวคู่ยมทูตงัดเป้าหมายลอย' },
      { id: 'nak_s1', name: 'Dread Judge', tag: 'พุ่งฟาดเคียวลอย', icon: './assets/skills/dread_judge.png', dmg: 520, color: '#ff9900', desc: 'พุ่งฟาดเคียวคู่งัดเป้าหมายลอย' },
      { id: 'nak_s2', name: 'Double Whammy', tag: 'ถอยหลังตวัดฟัน', icon: './assets/skills/double_whammy.png', dmg: 570, color: '#ffaa00', desc: 'พุ่งถอยหลังตวัดฟันเสริมพลัง' },
      { id: 'nak_ult', name: "Judgement's Blade", tag: 'เพลงเคียวพิพากษา', icon: './assets/skills/judgement_s_blade.png', dmg: 870, color: '#ff6600', isCrit: true, desc: 'รัวเคียวคู่สถานะต้านสถานะ' }
    ]
  },
  murad: {
    id: 'murad', name: 'MURAD', fullName: 'Murad (มูราด)', classId: 'assassin', role: 'แอสซาซิน / กาลเวลา',
    avatar: './assets/heroes/murad.png', splash: './assets/ui/arthur_card.jpg', quote: '"กาลเวลาอยู่ในการควบคุมของข้า!"',
    skills: [
      { id: 'mur_atk', name: 'ดาบแห่งทรายกาลเวลา', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ffcc00', desc: 'ฟันดาบทรายสะสมแต้มปลดล็อกอัลติ' },
      { id: 'mur_s1', name: 'Thorn of Time', tag: 'พุ่งแทงมิติเงา', icon: './assets/skills/1_thorn_of_time.png', dmg: 530, color: '#ffdd00', desc: 'พุ่งแทงทิ้งเงาย้อนเวลากลับ' },
      { id: 'mur_s2', name: 'Another Dimension', tag: 'มิติหลบภัยลดเกราะ', icon: './assets/skills/2_another_dimension.png', dmg: 550, color: '#ffcc00', desc: 'กางอาณาเขตทรายลดเกราะศัตรู' },
      { id: 'mur_ult', name: 'Temporal Turbulence', tag: 'เพลงดาบไร้เงา', icon: './assets/skills/ult_temporal_turbulence.png', dmg: 900, color: '#ff9900', isCrit: true, desc: 'ฟันเพลงดาบไร้เงาอมตะ 5 จังหวะ' }
    ]
  },
  kriknak: {
    id: 'kriknak', name: 'KRIKNAK', fullName: 'Kriknak (คริกแนก)', classId: 'assassin', role: 'แอสซาซิน / ด้วงมรณะ',
    avatar: './assets/heroes/kriknak.png', splash: './assets/ui/arthur_card.jpg', quote: '"เสียงบินของข้า คือจุดจบของเจ้า!"',
    skills: [
      { id: 'krik_atk', name: 'ก้ามด้วงมรณะ', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#33ff33', desc: 'ฟาดก้ามด้วงยักษ์เสริมดาเมจพิษ' },
      { id: 'krik_s1', name: 'Terrifying Plague', tag: 'แมลงพิษกัดกร่อน', icon: './assets/skills/1_terrifying_plague.png', dmg: 540, color: '#33ff33', desc: 'ปล่อยแมลงพิษแปะเป้าหมาย' },
      { id: 'krik_s2', name: 'Horn Rush', tag: 'พุ่งเสียบเขากระแทก', icon: './assets/skills/2_horn_rush.png', dmg: 520, color: '#66ff66', desc: 'พุ่งแทงเขาฟื้นฟูเลือด' },
      { id: 'krik_ult', name: 'Drone Drop', tag: 'ดิ่งมรณะทลายป้อม', icon: './assets/skills/ult_drone_drop.png', dmg: 900, color: '#00cc00', isCrit: true, desc: 'บินทะยานทิ้งดิ่งระเบิดดาเมจมหาศาล' }
    ]
  },
  zill: {
    id: 'zill', name: 'ZILL', fullName: 'Zill (ซิล)', classId: 'assassin', role: 'แอสซาซิน / สายลมมรณะ',
    avatar: './assets/heroes/zill.png', splash: './assets/ui/arthur_card.jpg', quote: '"สายลมจะเฉือนร่างเจ้าเป็นชิ้นๆ!"',
    skills: [
      { id: 'zill_atk', name: 'เคียวลมกรดสังหาร', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 380, color: '#00ffff', desc: 'ฟันเคียวลมกรดเวทมนตร์' },
      { id: 'zill_s1', name: 'Wind Blade', tag: 'มีดสายลมแฝด', icon: './assets/skills/1_wind_blade.png', dmg: 530, color: '#00ffff', desc: 'ขว้างเคียวลมกรดไป-กลับ' },
      { id: 'zill_s2', name: 'Wind Shift', tag: 'วาร์ปสายลม', icon: './assets/skills/2_wind_shift.png', dmg: 510, color: '#33ffff', desc: 'วาร์ปตามทิศทางพร้อมสร้างดาเมจ' },
      { id: 'zill_ult', name: 'Dust Devil', tag: 'พายุหมุนเชือดเฉือน', icon: './assets/skills/ult_tornado.png', dmg: 880, color: '#00e5ff', isCrit: true, desc: 'กลายร่างเป็นพายุหมุนเชือดเฉือนอมตะ' }
    ]
  },
  wukong: {
    id: 'wukong', name: 'WUKONG', fullName: 'Wukong (วูคอง)', classId: 'assassin', role: 'แอสซาซิน / พญาวานร',
    avatar: './assets/heroes/wukong.png', splash: './assets/ui/arthur_card.jpg', quote: '"กระบองทองของข้า หนักหมื่นกิโล!"',
    skills: [
      { id: 'wu_atk', name: 'ฟาดกระบองทองคำ', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 410, color: '#ffaa00', desc: 'ฟาดกระบองทองคำคริติคอลทรงพลัง' },
      { id: 'wu_s1', name: 'Shadow Clone', tag: 'แยกร่างล่องหน', icon: './assets/skills/1_shadow_clone.png', dmg: 550, color: '#ffaa00', desc: 'ล่องหนพร้อมทิ้งร่างแยกไว้' },
      { id: 'wu_s2', name: 'Great Sage', tag: 'กระโดดควงกระบอง', icon: './assets/skills/2_great_sage.png', dmg: 530, color: '#ffbb00', desc: 'กระโดดเพิ่มเกราะและเสริมดาเมจคริ' },
      { id: 'wu_ult', name: 'Monkey Business', tag: 'กระบองยักษ์สะท้านฟ้า', icon: './assets/skills/monkey_business.png', dmg: 920, color: '#ff6600', isCrit: true, desc: 'ฟาดกระบองยักษ์สตั๊นคริติคอลสูงสุด' }
    ]
  },
  kaine: {
    id: 'kaine', name: 'KAINE', fullName: 'Kaine (เคน)', classId: 'assassin', role: 'แอสซาซิน / นักล่าโลหิต',
    avatar: './assets/heroes/kaine.png', splash: './assets/ui/arthur_card.jpg', quote: '"รัตติกาลนี้... จะถูกย้อมด้วยสีเลือด!"',
    skills: [
      { id: 'kaine_atk', name: 'กรงเล็บโลหิตสังหาร', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 400, color: '#cc0022', desc: 'ตวัดกรงเล็บแวมไพร์สังหารรวดเร็ว' },
      { id: 'kaine_s1', name: 'Whirlwind of Blood', tag: 'กรงเล็บโลหิตฟันกวาด', icon: './assets/skills/kaine_s1.png', dmg: 550, color: '#dd0033', desc: 'ตวัดกรงเล็บโลหิตสร้างความเสียหายรอบตัว 2 จังหวะ' },
      { id: 'kaine_s2', name: 'Bloodied Judgment', tag: 'มีดบินผนึกวิญญาณ', icon: './assets/skills/kaine_s2.png', dmg: 530, color: '#ff0044', desc: 'ขว้างมีดบินผนึกวิญญาณสตั๊นและฟื้นฟูเลือด' },
      { id: 'kaine_ult', name: 'Sanguinary End', tag: 'พุ่งสังหารปลิดชีพ', icon: './assets/skills/kaine_ult.png', dmg: 910, color: '#990022', isCrit: true, desc: 'พุ่งทะลวงสังหารในสถานะกายทองไร้เป้าหมาย' }
    ]
  },
  quillen: {
    id: 'quillen', name: 'QUILLEN', fullName: 'Quillen (ควิลเลน)', classId: 'assassin', role: 'แอสซาซิน / ดาบคู่หลังสังหาร',
    avatar: './assets/heroes/quillen.png', splash: './assets/ui/arthur_card.jpg', quote: '"ดาบของข้า เสียบข้างหลังเสมอ!"',
    skills: [
      { id: 'quil_atk', name: 'มีดสั้นลอบสังหาร', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 400, color: '#ff0033', desc: 'แทงมีดสั้นคริติคอล 100% จากด้านหลัง' },
      { id: 'quil_s1', name: 'Decimate', tag: 'มีดคู่แทงหลัง', icon: './assets/skills/butterfly_s1.png', dmg: 560, color: '#ff0044', desc: 'แทงมีดคู่ด้านหลังคริติคอล 100%' },
      { id: 'quil_s2', name: 'Mutilate', tag: 'แทงทะลวงจุดตาย', icon: './assets/skills/whirlwind.png', dmg: 530, color: '#ff2255', desc: 'พุ่งแทงดาบทะลวงลดสปีดศัตรู' },
      { id: 'quil_ult', name: 'Purification', tag: 'ล่องหนลอบสังหาร', icon: './assets/skills/butterfly_ult.png', dmg: 900, color: '#cc0033', isCrit: true, desc: 'ล่องหนเร่งความเร็วและฟื้นฟูเลือด' }
    ]
  },
  paine: {
    id: 'paine', name: 'PAINE', fullName: 'Paine (เพน)', classId: 'assassin', role: 'แอสซาซิน / นักดนตรีวิญญาณ',
    avatar: './assets/heroes/paine.png', splash: './assets/ui/krixi_card.jpg', quote: '"บทเพลงนี้ จะบรรเลงในงานศพเจ้า!"',
    skills: [
      { id: 'paine_atk', name: 'เคียวโน้ตมรณะ', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#cc00ff', desc: 'ตวัดเคียวโน้ตดนตรีเวทมนตร์' },
      { id: 'paine_s1', name: 'Soul Elegy', tag: 'ถอดจิตวิญญาณ', icon: './assets/skills/paine_skill_1.png', dmg: 540, color: '#cc00ff', desc: 'ถอดจิตพุ่งทะยานสร้างดาเมจ' },
      { id: 'paine_s2', name: 'Symphony of Death', tag: 'วงเวทใบ้', icon: './assets/skills/paine_skill_2.png', dmg: 560, color: '#bb00ee', desc: 'กางวงเวทดนตรีใบ้ศัตรู' },
      { id: 'paine_ult', name: 'Requiem', tag: 'ทะยานเพลงมรณะ', icon: './assets/skills/paine_skill_3.png', dmg: 900, color: '#9900cc', isCrit: true, desc: 'พุ่งทะยานข้ามสมรภูมิบรรเลงเพลงมรณะ' }
    ]
  },
  keera: {
    id: 'keera', name: 'KEERA', fullName: 'Keera (คีร่า)', classId: 'assassin', role: 'แอสซาซิน / มนตราแห่งเงา',
    avatar: './assets/heroes/keera.png', splash: './assets/ui/krixi_card.jpg', quote: '"มาเล่นซ่อนแอบในเงามืดกันเถอะ..."',
    skills: [
      { id: 'keera_atk', name: 'คมมีดมนตราเงา', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff0077', desc: 'ฟันคมมีดมนตราแห่งเงามืด' },
      { id: 'keera_s1', name: 'Umbral Bloom', tag: 'เงาดูดวิญญาณ', icon: './assets/skills/ke_s1.png', dmg: 540, color: '#ff33aa', desc: 'ส่งร่างเงาไปเกาะและระเบิดพลัง' },
      { id: 'keera_s2', name: 'Triangle Maze', tag: 'ค่ายกลสามเหลี่ยม', icon: './assets/skills/ke_s2.png', dmg: 570, color: '#ff0088', desc: 'สร้างมิติสามเหลี่ยมหลบการโจมตี' },
      { id: 'keera_ult', name: 'Dark Abyss', tag: 'มนตราทลายกำแพง', icon: './assets/skills/ke_s3.png', dmg: 880, color: '#ff0066', desc: 'เร่งความเร็วพุ่งทะลุสิ่งกีดขวาง' }
    ]
  },

  // ==================== MARKSMAN (10 Heroes) ====================
  valhein: {
    id: 'valhein', name: 'VALHEIN', fullName: 'Valhein (แวนเฮล)', classId: 'marksman', role: 'แครี่ / นักล่าปีศาจ',
    avatar: './assets/heroes/valhein.png', splash: './assets/heroes/violet_card.jpg', quote: '"ลูกปืนสีเงินจะชำระล้างความชั่วร้าย!"',
    skills: [
      { id: 'vh_atk', name: 'กระสุนเวทมนตร์เงิน', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ffd700', desc: 'ยิงกระสุนเงินสุ่มกงจักรพิเศษ' },
      { id: 'vh_s1', name: 'Bloody Hunt', tag: 'กงจักรเพลิงแดง', icon: './assets/skills/bloody_hunt.png', dmg: 530, color: '#ff3300', desc: 'ขว้างกงจักรสีแดงระเบิดพลังวิ่งไว' },
      { id: 'vh_s2', name: 'Curse of Death', tag: 'กงจักรทองสตั๊น', icon: './assets/skills/curse_of_death.png', dmg: 520, color: '#ffdd33', desc: 'ขว้างกงจักรสีทองสตั๊นเป้าหมาย' },
      { id: 'vh_ult', name: 'Bullet Storm', tag: 'พายุกระสุนเงิน', icon: './assets/skills/bullet_storm.png', dmg: 820, color: '#ff8800', desc: 'สาดพายุกระสุนเงิน 6 นัดทะลวงเกราะ' }
    ]
  },
  violet: {
    id: 'violet', name: 'VIOLET', fullName: 'Violet (ไวโอเลต)', classId: 'marksman', role: 'แครี่ / มือปืนระห่ำ',
    avatar: './assets/heroes/violet.png', splash: './assets/heroes/violet_card.jpg', quote: '"กระสุนของฉันไม่เคยพลาดเป้า!"',
    skills: [
      { id: 'vio_atk', name: 'ปืนคู่สังหาร', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff9900', desc: 'ยิงปืนพกคู่กระสุนสังหาร' },
      { id: 'vio_s1', name: 'Tactical Fire', tag: 'กลิ้งยิงทรงพลัง', icon: './assets/skills/violet_s1.png', dmg: 560, color: '#ffaa00', desc: 'กลิ้งยิงเสริมดาเมจระยะไกล' },
      { id: 'vio_s2', name: 'Fire in the Hole', tag: 'ระเบิดเพลิง', icon: './assets/skills/violet_s2.png', dmg: 490, color: '#ff4400', desc: 'ขว้างลูกระเบิดเพลิงชะลอศัตรู' },
      { id: 'vio_ult', name: 'Concussive Rounds', tag: 'ปืนใหญ่สังหาร', icon: './assets/skills/violet_ult.png', dmg: 850, color: '#ff2200', isCrit: true, desc: 'ยิงปืนใหญ่ระเบิดป้อมรุนแรง' }
    ]
  },
  yorn: {
    id: 'yorn', name: 'YORN', fullName: 'Yorn (ยอร์น)', classId: 'marksman', role: 'แครี่ / เทพบุตรธนูสุริยะ',
    avatar: './assets/heroes/yorn.png', splash: './assets/heroes/violet_card.jpg', quote: '"แสงแห่งสุริยัน จะแผดเผาทุกสิ่ง!"',
    skills: [
      { id: 'yorn_atk', name: 'ศรสุริยันยิงรัว', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ffee00', desc: 'ยิงศรสุริยันรัวเป็นชุด' },
      { id: 'yorn_s1', name: 'Explosive Arrow', tag: 'ศรระเบิดสตั๊น', icon: './assets/skills/explosive_arrow.png', dmg: 530, color: '#ffea00', desc: 'ยิงศรระเบิดสตั๊นป้อม' },
      { id: 'yorn_s2', name: 'Heavenly Barrage', tag: 'วงเวทศรสุริยัน', icon: './assets/skills/heavenly_barrage.png', dmg: 550, color: '#ffcc00', desc: 'เรียกวงเวททิ้งฝนศรสุริยะ' },
      { id: 'yorn_ult', name: 'Heart Shot', tag: 'ศรสุริยันทะลวงมิติ', icon: './assets/skills/heart_shot.png', dmg: 890, color: '#ff9900', isCrit: true, desc: 'ยิงศรยักษ์ทะลุข้ามสมรภูมิ' }
    ]
  },
  slimz: {
    id: 'slimz', name: 'SLIMZ', fullName: 'Slimz (สลิมซ์)', classId: 'marksman', role: 'แครี่ / กระต่ายหอกบิน',
    avatar: './assets/heroes/slimz.png', splash: './assets/heroes/violet_card.jpg', quote: '"ใครว่ากระต่ายทำธุรกิจไม่ได้?!"',
    skills: [
      { id: 'slim_atk', name: 'ปาหอกกระต่าย', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff9933', desc: 'ปาหอกกระต่ายสร้างดาเมจกระจาย' },
      { id: 'slim_s1', name: 'Flying Spear', tag: 'หอกบินสตั๊น', icon: './assets/skills/flying_spear.png', dmg: 570, color: '#ff7700', desc: 'ขว้างหอกบินสตั๊นตามระยะทาง' },
      { id: 'slim_s2', name: 'Leap of Vitality', tag: 'กระโดดเสริมพลัง', icon: './assets/skills/leap_of_vitality.png', dmg: 520, color: '#ffaa33', desc: 'กระโดดเพิ่มพลังโจมตี' },
      { id: 'slim_ult', name: 'Savage Potion', tag: 'น้ำยาบ้าคลั่ง', icon: './assets/skills/ult_savage_potion.png', dmg: 860, color: '#ff5500', isCrit: true, desc: 'ดื่มน้ำยาเสริมดาเมจตาม % เลือด' }
    ]
  },
  thorne: {
    id: 'thorne', name: 'THORNE', fullName: 'Thorne (ธอร์น)', classId: 'marksman', role: 'แครี่ / กระสุนเวท 3 สี',
    avatar: './assets/heroes/thorne.png', splash: './assets/heroes/violet_card.jpg', quote: '"กระสุนสีม่วงนี้ จะปลิดชีพเจ้า"',
    skills: [
      { id: 'thorne_atk', name: 'ยิงปืนเวทมนตร์', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#cc44ff', desc: 'ยิงกระสุนปืนเวทมนตร์' },
      { id: 'thorne_s1', name: 'Magic Bullet', tag: 'บรรจุกระสุนมนตรา', icon: './assets/skills/violet_s1.png', dmg: 560, color: '#cc33ff', desc: 'โหลดกระสุนเวทมนตร์ 3 สีเสริมพลัง' },
      { id: 'thorne_s2', name: 'Excite', tag: 'กลิ้งสลับโหมดกระสุน', icon: './assets/skills/violet_s2.png', dmg: 530, color: '#aa22ee', desc: 'กลิ้งตัวรีโหลดกระสุนพิเศษ' },
      { id: 'thorne_ult', name: 'Dark Matter', tag: 'ระเบิดอนุภาคทมิฬ', icon: './assets/skills/violet_ult.png', dmg: 890, color: '#9900cc', isCrit: true, desc: 'ยิงระเบิดวงกว้างทำลายล้าง' }
    ]
  },
  fennik: {
    id: 'fennik', name: 'FENNIK', fullName: 'Fennik (เฟนนิค)', classId: 'marksman', role: 'แครี่ / จิ้งจอกสายฟ้าระเบิด',
    avatar: './assets/heroes/fennik.png', splash: './assets/heroes/violet_card.jpg', quote: '"ไม่มีใครวิ่งเร็วกว่าข้าหรอก!"',
    skills: [
      { id: 'fen_atk', name: 'ดาวกระจายสายฟ้า', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ffcc00', desc: 'ขว้างดาวกระจายสายฟ้ารวดเร็ว' },
      { id: 'fen_s1', name: "Thief's Mark", tag: 'โซ่วงแหวนระเบิด', icon: './assets/skills/hidden_weapons.png', dmg: 570, color: '#ffbb00', desc: 'แปะวงแหวนระเบิดป้อม 4 จังหวะ' },
      { id: 'fen_s2', name: 'Rolling Lightning', tag: 'กลิ้งสายฟ้าผ่าดิน', icon: './assets/skills/rolling_lightning.png', dmg: 530, color: '#ffee00', desc: 'กลิ้งทิ้งรอยสายฟ้าช็อตศัตรู' },
      { id: 'fen_ult', name: 'Chain Hammer Cyclone', tag: 'กงจักรพายุสายฟ้า', icon: './assets/skills/chain_hammer_cyclone.png', dmg: 870, color: '#ff8800', isCrit: true, desc: 'ขว้างกงจักรยักษ์หมุนถล่มป้อม' }
    ]
  },
  moren: {
    id: 'moren', name: 'MOREN', fullName: 'Moren (มอร์เรน)', classId: 'marksman', role: 'แครี่ / ช่างปืนกลเกราะหนา',
    avatar: './assets/heroes/moren.png', splash: './assets/heroes/violet_card.jpg', quote: '"ปืนลูกซองของข้า พร้อมเผาผลาญ!"',
    skills: [
      { id: 'mor_atk', name: 'ปืนลูกซองยักษ์', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 400, color: '#ff6600', desc: 'ยิงปืนลูกซองคู่สะสมเกราะป้องกัน' },
      { id: 'mor_s1', name: 'Tactical Maneuver', tag: 'กระสุนลูกซองคู่', icon: './assets/skills/tactical_maneuver.png', dmg: 550, color: '#ff6600', desc: 'ยิงลูกซองแฝดเพิ่มเกราะและสปีด' },
      { id: 'mor_s2', name: 'Impact Barrage', tag: 'ผลักกระแทกกระสุน', icon: './assets/skills/impact_barrage.png', dmg: 520, color: '#ff8800', desc: 'ยิงปืนผลักศัตรูกระเด็น' },
      { id: 'mor_ult', name: 'Magnetic Storm', tag: 'พายุสนามแม่เหล็ก', icon: './assets/skills/magnetic_storm.png', dmg: 850, color: '#ff3300', isCrit: true, desc: 'ปล่อยพายุแม่เหล็กช็อตป้อมต่อเนื่อง' }
    ]
  },
  lindis: {
    id: 'lindis', name: 'LINDIS', fullName: 'Lindis (ลินดิส)', classId: 'marksman', role: 'แครี่ / เทพีจันทรา',
    avatar: './assets/heroes/lindis.png', splash: './assets/heroes/violet_card.jpg', quote: '"แสงจันทราจะนำทางลูกศรของข้า"',
    skills: [
      { id: 'lin_atk', name: 'ศรแสงจันทรา', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#aae8ff', desc: 'ยิงศรแสงจันทราต่อเนื่อง' },
      { id: 'lin_s1', name: 'Piercing Gaze', tag: 'เนตรจันทราเปิดแมพ', icon: './assets/skills/piercing_gaze.png', dmg: 540, color: '#e0f7ff', desc: 'เปิดเนตรส่องสว่างมองเห็นทั่วบริเวณ' },
      { id: 'lin_s2', name: 'Entrapment', tag: 'กับดักจันทรา', icon: './assets/skills/entrapment.png', dmg: 520, color: '#b3e5fc', desc: 'วางกับดักจันทราชะลอความเร็ว' },
      { id: 'lin_ult', name: 'Lunar Champion', tag: 'วิญญาณจันทราพิฆาต', icon: './assets/skills/lunar_champion.png', dmg: 870, color: '#80d8ff', isCrit: true, desc: 'ปล่อยวิญญาณจันทรา 5 ดอกรัวกระหน่ำ' }
    ]
  },
  wisp: {
    id: 'wisp', name: 'WISP', fullName: 'Wisp (วิสป์)', classId: 'marksman', role: 'แครี่ / หุ่นยนต์ปืนกลยักษ์',
    avatar: './assets/heroes/wisp.png', splash: './assets/heroes/violet_card.jpg', quote: '"หุ่นยนต์ของหนู พลังทำลายอันดับหนึ่ง!"',
    skills: [
      { id: 'wisp_atk', name: 'ปืนกลหุ่นยนต์ยักษ์', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#ff9900', desc: 'ยิงปืนกลหุ่นยนต์สร้างความเสียหายกระจาย' },
      { id: 'wisp_s1', name: 'Loose Cannon', tag: 'ปืนกลยิงกระจาย', icon: './assets/skills/loose_cannon.png', dmg: 550, color: '#ff9900', desc: 'กลิ้งเปลี่ยนโหมดปืนกลยิงกระจาย' },
      { id: 'wisp_s2', name: 'Barrel Bomb', tag: 'กลิ้งถังระเบิด', icon: './assets/skills/barrel_bomb.png', dmg: 520, color: '#ff7700', desc: 'กลิ้งถังระเบิดสตั๊นเป้าหมาย' },
      { id: 'wisp_ult', name: 'Shock and Awe', tag: 'ปูพรมระเบิดถล่มป้อม', icon: './assets/skills/shock_and_awe.png', dmg: 890, color: '#ff3300', isCrit: true, desc: 'ปูพรมระเบิด 6 ระลอกใส่ป้อม' }
    ]
  },
  telannas: {
    id: 'telannas', name: 'TEL\'ANNAS', fullName: 'Tel\'Annas (เทลอันนาส)', classId: 'marksman', role: 'แครี่ / ราชินีเอลฟ์แห่งพงไพร',
    avatar: './assets/heroes/telannas.png', splash: './assets/heroes/violet_card.jpg', quote: '"เพื่อปกป้องป่าแห่งมนตรา ข้าจะไม่ยอมถอย!"',
    skills: [
      { id: 'tel_atk', name: 'ศรเอลฟ์พงไพร', tag: 'โจมตีปกติ', icon: './assets/skills/attack.png', dmg: 390, color: '#55ffaa', desc: 'ยิงศรมนตราเอลฟ์แห่งพงไพร' },
      { id: 'tel_s1', name: 'Eagle Eye', tag: 'เนตรอินทรียิงไกล', icon: './assets/skills/1_eagle_eye.png', dmg: 570, color: '#66ffcc', desc: 'เพิ่มระยะยิงไกลพิเศษและสร้างเวทผสมกายภาพ' },
      { id: 'tel_s2', name: 'Penetrating Shot', tag: 'ศรทะลวง 3 ดอก', icon: './assets/skills/2_penetrating_shot.png', dmg: 530, color: '#33ffaa', desc: 'ยิงศร 3 ดอกชะลอความเร็ว' },
      { id: 'tel_ult', name: 'Arrow of Chaos', tag: 'ศรมังกรพญายม', icon: './assets/skills/ult_arrow_of_chaos.png', dmg: 890, color: '#00ffaa', isCrit: true, desc: 'ยิงศรมังกรยักษ์สตั๊นทำลายล้าง' }
    ]
  }
};

let selectedClass = 'fighter';
let activeHero = HEROES.arthur;
let selectedSkill = null;
const skillImages = {};
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
  initGyroscopeAR();
}

function initGyroscopeAR() {
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma !== null && e.beta !== null) {
      isGyroActive = true;
      const clampGamma = Math.max(-40, Math.min(40, e.gamma));
      const clampBeta = Math.max(15, Math.min(75, e.beta));

      targetCamX = (clampGamma / 40) * 1.5;
      targetCamY = 1.0 + ((clampBeta - 45) / 30) * 1.0;
    }
  });

  // Desktop mouse parallax fallback
  window.addEventListener('pointermove', (e) => {
    if (state === GameState.PLAYING && !isGyroActive) {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      targetCamX = normX * 1.2;
      targetCamY = 1.0 - normY * 0.8;
    }
  });
}

function cacheDOM() {
  dom.landing = document.getElementById('landing-screen');
  dom.summonScreen = document.getElementById('summoning-screen');
  dom.matchLoadingScreen = document.getElementById('match-loading-screen');
  dom.gameScreen = document.getElementById('game-screen');
  dom.victory = document.getElementById('victory-screen');

  dom.startBtn = document.getElementById('start-btn');
  dom.replayBtn = document.getElementById('replay-btn');
  dom.enterBattleBtn = document.getElementById('enter-battle-btn');
  dom.rerollHeroBtn = document.getElementById('reroll-hero-btn');
  dom.classCards = document.querySelectorAll('.hero-card');

  // Top stats and AR Controls
  dom.cameraToggleBtn = document.getElementById('camera-toggle-btn');

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

  // Match Loading Screen elements
  dom.matchPlayerAvatar = document.getElementById('match-player-avatar');
  dom.matchPlayerHeroName = document.getElementById('match-player-hero-name');
  dom.matchPlayerRole = document.getElementById('match-player-role');
  dom.matchPlayerBar = document.getElementById('match-player-bar');
  dom.matchPlayerPercent = document.getElementById('match-player-percent');
  dom.matchBossBar = document.getElementById('match-boss-bar');
  dom.matchBossPercent = document.getElementById('match-boss-percent');
  dom.matchStatusMsg = document.getElementById('match-status-msg');

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
  dom.announcerBanner = document.getElementById('announcer-banner');
  dom.announcerTitle = document.getElementById('announcer-title');

  dom.video = document.getElementById('camera-feed');
  dom.canvas = document.getElementById('game-canvas');
  dom.handsCanvas = document.getElementById('hands-canvas');

  // Ultimate Skill & Cut-in UI
  dom.ultContainer = document.getElementById('ult-button-container');
  dom.ultRingFill = document.getElementById('ult-ring-fill');
  dom.ultActionBtn = document.getElementById('ult-action-btn');
  dom.ultBtnIcon = document.getElementById('ult-btn-icon');
  dom.ultPercentText = document.getElementById('ult-percent-text');
  dom.ultCinematicOverlay = document.getElementById('ult-cinematic-overlay');
  dom.ultCutinAvatar = document.getElementById('ult-cutin-avatar');
  dom.ultCutinHeroName = document.getElementById('ult-cutin-hero-name');
  dom.ultCutinSkillName = document.getElementById('ult-cutin-skill-name');
  dom.ultCutinQuote = document.getElementById('ult-cutin-quote');

  // Player HP & Challenger Shield & Retaliation Elements
  dom.playerHpBar = document.getElementById('player-hp-bar');
  dom.playerHpText = document.getElementById('player-hp-text');
  dom.shieldBtn = document.getElementById('challenger-shield-btn');
  dom.shieldCdOverlay = document.getElementById('shield-cd-overlay');
  dom.shieldCdText = document.getElementById('shield-cd-text');
  dom.towerWarningBanner = document.getElementById('tower-warning-banner');
  dom.playerHitFlash = document.getElementById('player-hit-flash');
  dom.playerShieldFx = document.getElementById('player-shield-fx');

  // Defeat Screen Elements
  dom.defeatScreen = document.getElementById('defeat-screen');
  dom.defeatStatDamage = document.getElementById('defeat-stat-damage');
  dom.defeatStatTime = document.getElementById('defeat-stat-time');
  dom.defeatRetryBtn = document.getElementById('defeat-retry-btn');
}

function bindEvents() {
  // Preload skills
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

  // Enter Battle Button from Reveal Screen -> Triggers AAA Match Loading Screen!
  dom.enterBattleBtn.addEventListener('click', () => {
    dom.summonScreen.style.display = 'none';
    startMatchLoadingSequence();
  });

  // Re-roll Hero Button
  if (dom.rerollHeroBtn) {
    dom.rerollHeroBtn.addEventListener('click', () => {
      startSummoningRitual(selectedClass);
    });
  }

  // Camera Toggle (Front / Back AR Camera)
  if (dom.cameraToggleBtn) {
    dom.cameraToggleBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        cameraStream = await toggleCamera(dom.video, cameraStream);
      } catch (err) {
        console.warn('Failed to switch camera', err);
      }
    });
  }

  // Challenger Skill: Shield Button Trigger
  if (dom.shieldBtn) {
    dom.shieldBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activateShield();
    });
  }

  // Ultimate Skill Button Trigger
  if (dom.ultActionBtn) {
    dom.ultActionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      castUltimateSkill();
    });
  }

  // Tap-to-attack on canvas / screen for mobile touch and desktop click
  if (dom.canvas) {
    dom.canvas.addEventListener('pointerdown', (e) => {
      if (state === GameState.PLAYING) {
        performSwingAttack();
      }
    });
  }

  dom.replayBtn.addEventListener('click', replay);
  if (dom.defeatRetryBtn) {
    dom.defeatRetryBtn.addEventListener('click', retryAfterDefeat);
  }
  window.addEventListener('resize', onResize);
}

/* ==========================================================
   AAA Hero Summoning Gacha Ritual (Strict Class-Pool)
   ========================================================== */
function startSummoningRitual(classKey) {
  state = GameState.SUMMONING;
  dom.landing.style.display = 'none';
  dom.summonScreen.style.display = 'flex';

  dom.summonRoulettePhase.style.display = 'flex';
  dom.summonRevealPhase.style.display = 'none';

  const cls = HERO_CLASSES[classKey] || HERO_CLASSES.fighter;
  dom.summonClassTitle.textContent = `กำลังอัญเชิญฮีโร่สาย: ${cls.name} (${cls.heroes.length} ตัวละคร)`;

  const heroPool = cls.heroes;
  let currentIndex = 0;
  let speed = 60;
  let counter = 0;
  const totalSteps = 22 + Math.floor(Math.random() * 8);

  playSound('summon_charge');
  playAnnouncerVoice('summon_charge');

  function step() {
    const hKey = heroPool[currentIndex % heroPool.length];
    const hero = HEROES[hKey] || HEROES.arthur;

    dom.rouletteHeroImg.src = hero.avatar;
    playSound('roll');

    currentIndex++;
    counter++;

    if (counter < totalSteps) {
      speed += 9;
      setTimeout(step, speed);
    } else {
      const chosenKey = heroPool[(currentIndex - 1) % heroPool.length];
      activeHero = HEROES[chosenKey] || HEROES.arthur;
      triggerHeroReveal(activeHero);
    }
  }

  step();
}

function triggerHeroReveal(hero) {
  playSound('summon_reveal');
  playAnnouncerVoice('summon_reveal');

  dom.summonRoulettePhase.style.display = 'none';
  dom.summonRevealPhase.style.display = 'flex';

  dom.revealAvatar.src = hero.avatar;
  dom.revealName.textContent = hero.name;
  dom.revealRole.textContent = hero.role;
  dom.revealQuote.textContent = hero.quote;

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
   AAA Match Loading Sequence (RoV 5v5 Cinematic 6-Sec Match Load)
   ========================================================== */
function startMatchLoadingSequence() {
  state = GameState.LOADING;
  dom.matchLoadingScreen.style.display = 'flex';

  // Setup match player card details
  dom.matchPlayerAvatar.src = activeHero.avatar;
  dom.matchPlayerHeroName.textContent = activeHero.name;
  dom.matchPlayerRole.textContent = activeHero.role;

  playSound('match_start');

  let playerPct = 0;
  let bossPct = 0;

  const tipMessages = [
    'กำลังเชื่อมต่อเซิร์ฟเวอร์ Antaris Tournament (Ping: 12ms)...',
    'กำลังซิงค์สกิลเฉพาะตัวของ ' + activeHero.fullName + '...',
    'กำลังเปิดกล้อง AR และระบบตรวจจับการฟาดฟันมือ MediaPipe...',
    'เคล็ดลับ: โจมตีด้วยท่า Ultimate เพื่อสร้างคริติคอลสูงสุดทะลุเกราะ!',
    'พร้อมประจัญบาน! ยินดีต้อนรับสู่ Arena of Valor!'
  ];

  // 6-second total load time with smooth progress steps
  const totalIntervalSteps = 30;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;

    // Calculate natural ramping curve
    playerPct = Math.min(100, Math.floor((currentStep / totalIntervalSteps) * 100));
    bossPct = Math.min(100, Math.floor(((currentStep + 1) / totalIntervalSteps) * 100));

    dom.matchPlayerBar.style.width = `${playerPct}%`;
    dom.matchPlayerPercent.textContent = `${playerPct}%`;

    dom.matchBossBar.style.width = `${bossPct}%`;
    dom.matchBossPercent.textContent = `${bossPct}%`;

    // Dynamic tip rotation
    if (playerPct < 20) {
      dom.matchStatusMsg.textContent = tipMessages[0];
    } else if (playerPct < 50) {
      dom.matchStatusMsg.textContent = tipMessages[1];
    } else if (playerPct < 75) {
      dom.matchStatusMsg.textContent = tipMessages[2];
    } else if (playerPct < 95) {
      dom.matchStatusMsg.textContent = tipMessages[3];
    } else {
      dom.matchStatusMsg.textContent = tipMessages[4];
    }

    if (currentStep >= totalIntervalSteps) {
      clearInterval(interval);
      setTimeout(() => {
        dom.matchLoadingScreen.style.display = 'none';
        startGame();
      }, 1000);
    }
  }, 190);
}

/* ==========================================================
   In-Game Hero & Skill Management
   ========================================================== */
function setHero(hero) {
  activeHero = hero;

  if (dom.heroBadgeAvatar) dom.heroBadgeAvatar.src = hero.avatar;
  if (dom.heroBadgeName) dom.heroBadgeName.textContent = hero.name;
  if (dom.heroBadgeType) dom.heroBadgeType.textContent = hero.role;

  // Configure Ultimate Action Button
  if (dom.ultBtnIcon && hero.skills && hero.skills[3]) {
    dom.ultBtnIcon.src = hero.skills[3].icon;
    dom.ultBtnIcon.alt = hero.skills[3].name;
  }

  // Reset Ultimate Charge Gauge
  ultimateCharge = 0;
  isUltimateReady = false;
  if (dom.ultContainer) dom.ultContainer.classList.remove('ready');
  if (dom.ultActionBtn) dom.ultActionBtn.disabled = true;
  if (dom.ultRingFill) dom.ultRingFill.style.strokeDashoffset = ULT_RING_CIRCUMFERENCE;
  if (dom.ultPercentText) dom.ultPercentText.textContent = '0%';

  renderHeroSkills(hero);
}

function renderHeroSkills(hero) {
  if (!dom.skillsContainer) return;
  dom.skillsContainer.innerHTML = '';

  hero.skills.forEach((sk, idx) => {
    const slot = document.createElement('div');
    slot.className = `hotbar-slot ${idx === 0 ? 'active' : ''}`;
    slot.dataset.skillId = sk.id;
    slot.title = `${sk.name} - ${sk.desc}`;

    slot.innerHTML = `
      <img src="${sk.icon}" alt="${sk.name}">
      <span class="weapon-tag">${sk.tag}</span>
    `;

    slot.addEventListener('click', () => {
      selectSkill(sk, slot);
    });

    dom.skillsContainer.appendChild(slot);
  });

  selectSkill(hero.skills[0], dom.skillsContainer.firstChild);
}

function selectSkill(skill, slotEl) {
  if (!skill) return;
  selectedSkill = skill;
  baseDamage = skill.dmg;

  playSound('skill_select');

  if (dom.skillsContainer) {
    dom.skillsContainer.querySelectorAll('.hotbar-slot').forEach(s => s.classList.remove('active'));
  }
  if (slotEl) slotEl.classList.add('active');

  if (handTracker) {
    if (skillImages[skill.id]) {
      handTracker.setWeapon(skillImages[skill.id]);
    }
    handTracker.setTrailColor(skill.color || '#ffd700');
  }
}

/* ==========================================================
   Three.js & Graphics (AAA RoV 2026 Lighting Setup)
   ========================================================== */
function initThreeJS() {
  scene = new THREE.Scene();
  camera3d = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera3d.position.set(0, 1.0, 8.2);
  camera3d.lookAt(0, 0.1, 0);

  renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  // 1. Ambient environmental base (Antaris deep mystic field)
  scene.add(new THREE.AmbientLight(0x1e263d, 1.8));

  // 2. Warm Key Light (Sun of Antaris)
  const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.6);
  keyLight.position.set(6, 12, 6);
  scene.add(keyLight);

  // 3. Cool Arcane Fill Light (Mystical Field)
  const fillLight = new THREE.DirectionalLight(0x00e5ff, 1.6);
  fillLight.position.set(-6, 4, 4);
  scene.add(fillLight);

  // 4. Gold Rim/Back Light (For high-spec metallic sheen)
  const rimLight = new THREE.DirectionalLight(0xffaa22, 2.5);
  rimLight.position.set(0, 8, -6);
  scene.add(rimLight);

  tower = new Tower(scene);
  tower.maxHP = 5000;
  tower.currentHP = 5000;

  effects = new EffectsManager(scene);
}

/* ==========================================================
   RoV 2026 AAA Sound Synthesizer & Announcer Engine (Web Audio API)
   ========================================================== */
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Authentic Preloaded Audio Clips (RoV / Arena of Valor Real Audio Files)
const AUDIO_CLIPS = {
  welcome: new Audio('./assets/audio/welcome.ogg'),
  victory: new Audio('./assets/audio/victory.ogg'),
  defeat: new Audio('./assets/audio/defeat.ogg'),
  first_blood: new Audio('./assets/audio/first_blood.ogg'),
  double_kill: new Audio('./assets/audio/double_kill.ogg'),
  triple_kill: new Audio('./assets/audio/triple_kill.ogg'),
  legendary: new Audio('./assets/audio/legendary.ogg'),
  turret_destroyed: new Audio('./assets/audio/turret_destroyed.ogg'),
  summon_charge: new Audio('./assets/audio/summon_charge.ogg'),
  summon_reveal: new Audio('./assets/audio/summon_reveal.ogg')
};

Object.values(AUDIO_CLIPS).forEach(a => {
  a.preload = 'auto';
  a.volume = 0.95;
});

let triggeredAnnouncements = {
  firstBlood: false,
  doubleKill: false,
  tripleKill: false,
  legendary: false
};

function playAnnouncerVoice(clipKey, bannerText = null) {
  try {
    const audio = AUDIO_CLIPS[clipKey];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  } catch (e) {}

  if (bannerText && dom.announcerBanner && dom.announcerTitle) {
    dom.announcerTitle.textContent = bannerText;
    dom.announcerBanner.style.display = 'flex';
    dom.announcerBanner.classList.remove('announcer-banner');
    void dom.announcerBanner.offsetWidth; // Trigger reflow
    dom.announcerBanner.classList.add('announcer-banner');

    setTimeout(() => {
      if (dom.announcerBanner) dom.announcerBanner.style.display = 'none';
    }, 2400);
  }
}

function getSkillArchetype(hero, skill) {
  const name = ((skill.name || '') + ' ' + (skill.tag || '') + ' ' + (skill.desc || '')).toLowerCase();
  const hId = hero.id;
  const cId = hero.classId;

  // 1. Explicit hero definitions (Hard overrides)
  if (hId === 'tulen' || hId === 'fennik' || hId === 'aleister') return 'lightning';
  if (hId === 'raz' || hId === 'zill' || hId === 'wukong') {
    if (hId === 'raz') return 'fire';
    if (hId === 'zill') return 'wind';
    if (hId === 'wukong') return 'heavy';
  }
  if (hId === 'kaine' || hId === 'maloch') return 'blood';
  if (['violet', 'moren', 'thorne', 'wisp', 'valhein'].includes(hId)) return 'gun';
  if (['yorn', 'telannas', 'lindis', 'slimz'].includes(hId)) return 'bow';
  if (['taara', 'skud', 'thane'].includes(hId)) return 'heavy';

  // 2. Keyword matching with strict boundaries
  if (name.includes('สายฟ้า') || name.includes('lightning') || name.includes('thunder')) return 'lightning';
  if (name.includes('เพลิง') || name.includes('fire') || name.includes('flame')) return 'fire';
  if (name.includes('ลม') || name.includes('wind') || name.includes('cyclone') || name.includes('tornado')) return 'wind';
  if (name.includes('ศร') || name.includes('ธนู') || name.includes('หอก') || name.includes('arrow') || name.includes('spear')) return 'bow';
  if (name.includes('ปืน') || name.includes('กระสุน') || name.includes('gun') || name.includes('bullet')) return 'gun';
  if (name.includes('ค้อน') || name.includes('หมัด') || name.includes('กระบอง') || name.includes('hammer')) return 'heavy';
  if (name.includes('โลหิต') || name.includes('blood') || name.includes('แวมไพร์')) return 'blood';

  // 3. Fallbacks based on class
  if (cId === 'mage' || name.includes('เวท') || name.includes('มนตรา') || name.includes('magic') || name.includes('วิญญาณ')) return 'magic';

  return 'sword';
}

function playSound(type, opts = {}) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  if (type === 'attack') {
    const isCrit = opts.isCrit || false;
    const isMagic = opts.isMagic || false;
    const sType = opts.soundType || 'sword';

    if (sType === 'gun') {
      // High-caliber Gunshot Pop & Shell Ejection
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
      gain.gain.setValueAtTime(isCrit ? 0.75 : 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.12);

      const bufSize = Math.floor(audioCtx.sampleRate * 0.09);
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.2));
      const n = audioCtx.createBufferSource();
      n.buffer = buf;
      const f = audioCtx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1800, now);
      const ng = audioCtx.createGain();
      ng.gain.setValueAtTime(0.4, now);
      ng.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      n.connect(f);
      f.connect(ng);
      ng.connect(audioCtx.destination);
      n.start(now);

    } else if (sType === 'bow') {
      // Bowstring Release Twang & Piercing Whistle
      const twang = audioCtx.createOscillator();
      const tg = audioCtx.createGain();
      twang.type = 'triangle';
      twang.frequency.setValueAtTime(520, now);
      twang.frequency.exponentialRampToValueAtTime(180, now + 0.1);
      tg.gain.setValueAtTime(isCrit ? 0.6 : 0.35, now);
      tg.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      twang.connect(tg);
      tg.connect(audioCtx.destination);
      twang.start(now);
      twang.stop(now + 0.1);

      const whistle = audioCtx.createOscillator();
      const wg = audioCtx.createGain();
      whistle.type = 'sine';
      whistle.frequency.setValueAtTime(1200, now);
      whistle.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      wg.gain.setValueAtTime(0.2, now);
      wg.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      whistle.connect(wg);
      wg.connect(audioCtx.destination);
      whistle.start(now);
      whistle.stop(now + 0.15);

    } else if (sType === 'lightning') {
      // Thunder Crack & Static Arc
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
      gain.gain.setValueAtTime(isCrit ? 0.7 : 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.18);

    } else if (sType === 'heavy') {
      // Earth-Shaking Heavy Hammer Slam
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.2);
      gain.gain.setValueAtTime(isCrit ? 0.8 : 0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.2);

    } else {
      // 1. Blade Slash / Projectile Noise Transient
      const bufferSize = Math.floor(audioCtx.sampleRate * 0.08);
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = isMagic ? 'bandpass' : 'highpass';
      noiseFilter.frequency.setValueAtTime(isMagic ? 1200 : 2500, now);
      noiseFilter.Q.setValueAtTime(2, now);
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(isCrit ? 0.45 : 0.28, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start(now);

      // 2. Heavy Physical/Magic Impact Punch
      const punchOsc = audioCtx.createOscillator();
      const punchGain = audioCtx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(isCrit ? 140 : 110, now);
      punchOsc.frequency.exponentialRampToValueAtTime(30, now + 0.14);
      punchGain.gain.setValueAtTime(isCrit ? 0.65 : 0.4, now);
      punchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      punchOsc.connect(punchGain);
      punchGain.connect(audioCtx.destination);
      punchOsc.start(now);
      punchOsc.stop(now + 0.14);

      // 3. Metallic Weapon Resonance / Magic Ring
      const ringOsc = audioCtx.createOscillator();
      const ringGain = audioCtx.createGain();
      ringOsc.type = isMagic ? 'sine' : 'sawtooth';
      ringOsc.frequency.setValueAtTime(isMagic ? 680 : 380, now);
      ringOsc.frequency.exponentialRampToValueAtTime(isMagic ? 440 : 180, now + 0.12);
      ringGain.gain.setValueAtTime(isCrit ? 0.35 : 0.18, now);
      ringGain.gain.exponentialRampToValueAtTime(0.005, now + 0.12);
      ringOsc.connect(ringGain);
      ringGain.connect(audioCtx.destination);
      ringOsc.start(now);
      ringOsc.stop(now + 0.12);
    }

    // Critical Hit Shockwave Crack for all archetypes
    if (isCrit) {
      const critOsc = audioCtx.createOscillator();
      const critGain = audioCtx.createGain();
      critOsc.type = 'sawtooth';
      critOsc.frequency.setValueAtTime(850, now);
      critOsc.frequency.exponentialRampToValueAtTime(75, now + 0.22);
      critGain.gain.setValueAtTime(0.42, now);
      critGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      critOsc.connect(critGain);
      critGain.connect(audioCtx.destination);
      critOsc.start(now);
      critOsc.stop(now + 0.22);
    }
  } else if (type === 'skill_select') {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, now + i * 0.03);
      g.gain.setValueAtTime(0.18, now + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(now + i * 0.03);
      o.stop(now + 0.25);
    });
  } else if (type === 'summon_charge') {
    [120, 122, 240, 360].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, now);
      o.frequency.exponentialRampToValueAtTime(freq * 3.5, now + 1.8);
      g.gain.setValueAtTime(0.08, now);
      g.gain.linearRampToValueAtTime(0.28, now + 1.8);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(now);
      o.stop(now + 1.8);
    });
  } else if (type === 'summon_reveal') {
    [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sawtooth';
      const startTime = now + i * 0.06;
      o.frequency.setValueAtTime(freq, startTime);
      g.gain.setValueAtTime(0.25, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 2.4);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(startTime);
      o.stop(startTime + 2.4);
    });
  } else if (type === 'match_start') {
    [130.81, 196.00, 261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sawtooth';
      const delay = i * 0.07;
      o.frequency.setValueAtTime(freq, now + delay);
      g.gain.setValueAtTime(0.22, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 2.2);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(now + delay);
      o.stop(now + delay + 2.2);
    });
    setTimeout(() => {
      playAnnouncerVoice('welcome');
    }, 400);
  } else if (type === 'explode') {
    const subOsc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(18, now + 2.2);
    subGain.gain.setValueAtTime(0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 2.2);
    subOsc.connect(subGain);
    subGain.connect(audioCtx.destination);
    subOsc.start(now);
    subOsc.stop(now + 2.2);

    for (let j = 0; j < 3; j++) {
      const crashDelay = now + j * 0.25;
      const bSize = Math.floor(audioCtx.sampleRate * 0.3);
      const b = audioCtx.createBuffer(1, bSize, audioCtx.sampleRate);
      const d = b.getChannelData(0);
      for (let k = 0; k < bSize; k++) d[k] = (Math.random() * 2 - 1) * Math.exp(-k / (bSize * 0.4));
      const s = audioCtx.createBufferSource();
      s.buffer = b;
      const f = audioCtx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(800 - j * 150, crashDelay);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.5 - j * 0.1, crashDelay);
      g.gain.exponentialRampToValueAtTime(0.01, crashDelay + 0.3);
      s.connect(f);
      f.connect(g);
      g.connect(audioCtx.destination);
      s.start(crashDelay);
    }
  } else if (type === 'victory') {
    playAnnouncerVoice('victory');
    [392.00, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      const t = now + 0.2 + i * 0.08;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 2.5);
    });
  } else if (type === 'roll') {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);
    gainNode.gain.setValueAtTime(0.16, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } else if (type === 'ult_ready') {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sawtooth';
      const t = now + i * 0.05;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.24, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.5);
    });
  } else if (type === 'ult_cast') {
    // Deep Sub-Bass Shockwave Impact
    const subOsc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(240, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 1.6);
    subGain.gain.setValueAtTime(0.95, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    subOsc.connect(subGain);
    subGain.connect(audioCtx.destination);
    subOsc.start(now);
    subOsc.stop(now + 1.6);

    // Ascending Laser Riser
    const riseOsc = audioCtx.createOscillator();
    const riseGain = audioCtx.createGain();
    riseOsc.type = 'sawtooth';
    riseOsc.frequency.setValueAtTime(280, now);
    riseOsc.frequency.exponentialRampToValueAtTime(2400, now + 0.35);
    riseGain.gain.setValueAtTime(0.4, now);
    riseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    riseOsc.connect(riseGain);
    riseGain.connect(audioCtx.destination);
    riseOsc.start(now);
    riseOsc.stop(now + 0.35);

    // Huge Metallic Explosion Blast
    for (let j = 0; j < 4; j++) {
      const burstDelay = now + 0.12 + j * 0.1;
      const bSize = Math.floor(audioCtx.sampleRate * 0.35);
      const b = audioCtx.createBuffer(1, bSize, audioCtx.sampleRate);
      const d = b.getChannelData(0);
      for (let k = 0; k < bSize; k++) d[k] = (Math.random() * 2 - 1) * Math.exp(-k / (bSize * 0.35));
      const s = audioCtx.createBufferSource();
      s.buffer = b;
      const f = audioCtx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1500 - j * 220, burstDelay);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.65 - j * 0.09, burstDelay);
      g.gain.exponentialRampToValueAtTime(0.001, burstDelay + 0.35);
      s.connect(f);
      f.connect(g);
      g.connect(audioCtx.destination);
      s.start(burstDelay);
    }
  } else if (type === 'shield_cast') {
    // Arcane Barrier Activation
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'shield_block') {
    // Metallic Shield Deflect Clang
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.25);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'tower_lock') {
    // Threat Alarm Siren Beep
    for (let i = 0; i < 3; i++) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sawtooth';
      const t = now + i * 0.15;
      o.frequency.setValueAtTime(880, t);
      o.frequency.setValueAtTime(1100, t + 0.07);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.12);
    }
  } else if (type === 'tower_fire') {
    // Plasma Cannon Shot Release
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.28);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  } else if (type === 'player_hit') {
    // Heavy Flesh/Armor Hit Impact
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

/* ==========================================================
   Combat Logic — Swing Attack
   ========================================================== */
function performSwingAttack() {
  if (state !== GameState.PLAYING || !selectedSkill) return;

  let dmg = baseDamage + bonusDamage;
  let isCrit = selectedSkill.isCrit || false;
  let color = selectedSkill.color || '#ffd700';
  let isMagic = activeHero.classId === 'mage';
  let dmgClass = isCrit ? 'dmg-crit' : (isMagic ? 'dmg-magic' : 'dmg-text');

  if (isCrit && Math.random() < 0.6) {
    dmg = Math.floor(dmg * 1.5);
  }

  // Apply Damage
  tower.takeDamage(dmg);
  totalDamageDealt += dmg;
  attackCount++;

  // Rewards
  currentGold += Math.floor(dmg / 10);

  // Charge Ultimate Gauge (+18% per hit)
  chargeUltimate(18);

  // Determine RoV 2026 Skill Archetype (Sound + Visual FX)
  const archetype = getSkillArchetype(activeHero, selectedSkill);

  // Visual Effects & Sound
  const hitPos = new THREE.Vector3(0, -0.4 + Math.random() * 1.6, 0);
  effects.createHitParticles(hitPos, color, isCrit ? 36 : 20, isCrit, archetype);
  showFloatingDamage(Math.floor(dmg), dmgClass, color);

  playSound('attack', { isCrit, isMagic, soundType: archetype, color });

  // Authentic RoV In-Game Announcer Killstreaks
  if (attackCount >= 5 && !triggeredAnnouncements.firstBlood) {
    triggeredAnnouncements.firstBlood = true;
    playAnnouncerVoice('first_blood', 'FIRST BLOOD');
  } else if (attackCount >= 15 && !triggeredAnnouncements.doubleKill) {
    triggeredAnnouncements.doubleKill = true;
    playAnnouncerVoice('double_kill', 'DOUBLE KILL');
  } else if (attackCount >= 30 && !triggeredAnnouncements.tripleKill) {
    triggeredAnnouncements.tripleKill = true;
    playAnnouncerVoice('triple_kill', 'TRIPLE KILL');
  } else if (attackCount >= 50 && !triggeredAnnouncements.legendary) {
    triggeredAnnouncements.legendary = true;
    playAnnouncerVoice('legendary', 'LEGENDARY');
  }

  if (navigator.vibrate) navigator.vibrate(isCrit ? [80, 40, 80] : 50);

  if (dom.comboBadge) {
    dom.comboBadge.classList.add('combo-active');
    setTimeout(() => dom.comboBadge.classList.remove('combo-active'), 150);
  }

  updateUI();

  if (tower.isDestroyed()) {
    playAnnouncerVoice('turret_destroyed', 'TOWER DESTROYED');
    triggerExplosion();
  }
}

/* ==========================================================
   RoV Ultimate Skill System — Energy Gauge & Cinematic Cast
   ========================================================== */
function chargeUltimate(amount) {
  if (ultimateCharge >= MAX_ULT_CHARGE) return;
  ultimateCharge = Math.min(MAX_ULT_CHARGE, ultimateCharge + amount);

  const pct = Math.floor(ultimateCharge);
  if (dom.ultPercentText) dom.ultPercentText.textContent = `${pct}%`;

  if (dom.ultRingFill) {
    const offset = ULT_RING_CIRCUMFERENCE - (ultimateCharge / 100) * ULT_RING_CIRCUMFERENCE;
    dom.ultRingFill.style.strokeDashoffset = offset;
  }

  if (ultimateCharge >= MAX_ULT_CHARGE && !isUltimateReady) {
    isUltimateReady = true;
    if (dom.ultContainer) dom.ultContainer.classList.add('ready');
    if (dom.ultActionBtn) dom.ultActionBtn.disabled = false;
    playSound('ult_ready');
    if (navigator.vibrate) navigator.vibrate([100, 60, 150]);
  }
}

function castUltimateSkill() {
  if (ultimateCharge < MAX_ULT_CHARGE || state !== GameState.PLAYING) return;

  // Reset Ultimate Gauge
  ultimateCharge = 0;
  isUltimateReady = false;
  if (dom.ultContainer) dom.ultContainer.classList.remove('ready');
  if (dom.ultActionBtn) dom.ultActionBtn.disabled = true;
  if (dom.ultRingFill) dom.ultRingFill.style.strokeDashoffset = ULT_RING_CIRCUMFERENCE;
  if (dom.ultPercentText) dom.ultPercentText.textContent = '0%';

  const ultSkill = (activeHero.skills && activeHero.skills[3]) ? activeHero.skills[3] : selectedSkill;
  const ultColor = ultSkill.color || '#ffcc00';

  // 1. Cinematic Anime / RoV Cut-in Overlay
  if (dom.ultCinematicOverlay) {
    if (dom.ultCutinAvatar) dom.ultCutinAvatar.src = activeHero.avatar;
    if (dom.ultCutinHeroName) dom.ultCutinHeroName.textContent = activeHero.name;
    if (dom.ultCutinSkillName) dom.ultCutinSkillName.textContent = ultSkill.name.toUpperCase();
    if (dom.ultCutinQuote) dom.ultCutinQuote.textContent = activeHero.quote;

    dom.ultCinematicOverlay.style.display = 'flex';
    dom.ultCinematicOverlay.classList.remove('ult-cinematic-overlay');
    void dom.ultCinematicOverlay.offsetWidth; // Reflow
    dom.ultCinematicOverlay.classList.add('ult-cinematic-overlay');

    setTimeout(() => {
      if (dom.ultCinematicOverlay) dom.ultCinematicOverlay.style.display = 'none';
    }, 1300);
  }

  // 2. Play Ultimate Sounds
  playSound('ult_cast', { color: ultColor });

  // Web Speech API Voice Shout (RoV Champion Voice simulation)
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${activeHero.name}! ${ultSkill.name}!`);
      utterance.lang = 'th-TH';
      utterance.pitch = 1.1;
      utterance.rate = 1.15;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {}

  // 3. Huge Ultimate Burst Damage & 3D Particle Storm
  const ultDmg = Math.floor(ultSkill.dmg * 3.4 + Math.random() * 600);
  tower.takeDamage(ultDmg);
  totalDamageDealt += ultDmg;
  attackCount += 5;
  currentGold += Math.floor(ultDmg / 8);

  const archetype = getSkillArchetype(activeHero, ultSkill);
  effects.createUltimateImpact(new THREE.Vector3(0, 0.2, 0), ultColor, archetype);
  showFloatingDamage(ultDmg, 'dmg-ult', '#ffea00');

  if (navigator.vibrate) navigator.vibrate([150, 60, 250, 60, 450]);

  // Killstreak announcer check
  if (attackCount >= 5 && !triggeredAnnouncements.firstBlood) {
    triggeredAnnouncements.firstBlood = true;
    playAnnouncerVoice('first_blood', 'FIRST BLOOD');
  } else if (attackCount >= 15 && !triggeredAnnouncements.doubleKill) {
    triggeredAnnouncements.doubleKill = true;
    playAnnouncerVoice('double_kill', 'DOUBLE KILL');
  } else if (attackCount >= 30 && !triggeredAnnouncements.tripleKill) {
    triggeredAnnouncements.tripleKill = true;
    playAnnouncerVoice('triple_kill', 'TRIPLE KILL');
  } else if (attackCount >= 50 && !triggeredAnnouncements.legendary) {
    triggeredAnnouncements.legendary = true;
    playAnnouncerVoice('legendary', 'LEGENDARY');
  }

  updateUI();

  if (tower.isDestroyed()) {
    playAnnouncerVoice('turret_destroyed', 'TOWER DESTROYED');
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
  if (dom.damageCont) dom.damageCont.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ==========================================================
   RoV Challenger Skill: Shield & Tower Retaliation System
   ========================================================== */
function activateShield() {
  if (shieldCooldownTimer > 0 || state !== GameState.PLAYING) return;

  isShieldActive = true;
  shieldCooldownTimer = SHIELD_COOLDOWN;

  if (dom.shieldBtn) dom.shieldBtn.classList.add('shield-active');
  if (dom.playerShieldFx) {
    dom.playerShieldFx.style.display = 'flex';
    dom.playerShieldFx.classList.remove('player-shield-fx');
    void dom.playerShieldFx.offsetWidth;
    dom.playerShieldFx.classList.add('player-shield-fx');
  }

  playSound('shield_cast');
  effects.createShieldBarrierFX(new THREE.Vector3(0, 1.0, 7.2));

  // Shield barrier lasts 1.6 seconds
  setTimeout(() => {
    isShieldActive = false;
    if (dom.shieldBtn) dom.shieldBtn.classList.remove('shield-active');
    if (dom.playerShieldFx) dom.playerShieldFx.style.display = 'none';
  }, 1600);
}

function startTowerLockOn() {
  if (state !== GameState.PLAYING || tower.isDestroyed() || isTowerLockingOn) return;

  isTowerLockingOn = true;
  tower.setTargeting(true);

  if (dom.towerWarningBanner) {
    dom.towerWarningBanner.style.display = 'flex';
  }

  playSound('tower_lock');

  const startPos = tower.getCrystalWorldPosition();
  const targetPos = new THREE.Vector3(0, 1.0, 8.2);

  effects.createTowerLaser(startPos, targetPos, 1.5);

  // 1.5-second lock-on warning before firing plasma shot
  setTimeout(() => {
    if (state === GameState.PLAYING && !tower.isDestroyed()) {
      fireTowerShot(startPos, targetPos);
    }
    isTowerLockingOn = false;
    tower.setTargeting(false);
    if (dom.towerWarningBanner) dom.towerWarningBanner.style.display = 'none';
  }, 1500);
}

function fireTowerShot(startPos, targetPos) {
  playSound('tower_fire');
  effects.createTowerProjectile(startPos, targetPos, 1.5, () => {
    handleTowerProjectileImpact();
  });
}

function handleTowerProjectileImpact() {
  if (state !== GameState.PLAYING) return;

  if (isShieldActive) {
    // Shield Block Success (0 DMG)
    showFloatingDamage(0, 'dmg-text', '#00e5ff');
    playSound('shield_block');
    effects.createHitParticles(new THREE.Vector3(0, 1.0, 7.5), '#00f0ff', 30, true, 'magic');
    if (navigator.vibrate) navigator.vibrate([50, 40, 50]);
  } else {
    // Player Hit by Tower Plasma Shot
    const dmg = 350;
    playerHP = Math.max(0, playerHP - dmg);

    playSound('player_hit');
    effects.createHitParticles(new THREE.Vector3(0, 1.0, 7.8), '#ff0033', 40, true, 'fire');

    if (dom.playerHitFlash) {
      dom.playerHitFlash.style.display = 'block';
      dom.playerHitFlash.classList.remove('player-hit-flash');
      void dom.playerHitFlash.offsetWidth;
      dom.playerHitFlash.classList.add('player-hit-flash');
      setTimeout(() => {
        if (dom.playerHitFlash) dom.playerHitFlash.style.display = 'none';
      }, 600);
    }

    showFloatingDamage(dmg, 'dmg-crit', '#ff0033');

    if (navigator.vibrate) navigator.vibrate([180, 80, 250]);

    updateUI();

    if (playerHP <= 0) {
      triggerDefeat();
    }
  }
}

function triggerDefeat() {
  state = GameState.DEFEAT;
  playAnnouncerVoice('defeat');

  const elapsed = ((performance.now() - gameStartTime) / 1000).toFixed(1);
  if (dom.defeatStatDamage) dom.defeatStatDamage.textContent = totalDamageDealt.toLocaleString();
  if (dom.defeatStatTime) dom.defeatStatTime.textContent = elapsed + 's';
  if (dom.defeatScreen) dom.defeatScreen.style.display = 'flex';

  if (handTracker) handTracker.stop();
}

function retryAfterDefeat() {
  if (dom.defeatScreen) dom.defeatScreen.style.display = 'none';
  replay();
}

/* ==========================================================
   Game Flow & Loop
   ========================================================== */
async function startGame() {
  initAudio();
  dom.landing.style.display = 'none';
  dom.gameScreen.style.display = 'block';

  // Reset Player & Retaliation State
  playerHP = maxPlayerHP;
  isShieldActive = false;
  shieldCooldownTimer = 0;
  towerAttackTimer = 5.0;
  isTowerLockingOn = false;

  if (dom.towerWarningBanner) dom.towerWarningBanner.style.display = 'none';
  if (dom.playerHitFlash) dom.playerHitFlash.style.display = 'none';
  if (dom.playerShieldFx) dom.playerShieldFx.style.display = 'none';
  if (dom.defeatScreen) dom.defeatScreen.style.display = 'none';

  setHero(activeHero);

  try {
    cameraStream = await initCamera(dom.video);

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

function updateUI() {
  const pct = tower.getHPPercent();
  dom.hpBar.style.width = `${pct * 100}%`;
  dom.hpText.textContent = `${Math.ceil(tower.currentHP)} / ${tower.maxHP}`;
  if (dom.goldText) dom.goldText.textContent = currentGold;
  if (dom.hitCount) dom.hitCount.textContent = attackCount;
  if (dom.liveDamageText) dom.liveDamageText.textContent = `${totalDamageDealt.toLocaleString()} DMG`;

  // Player HP Update
  const playerPct = Math.max(0, playerHP / maxPlayerHP);
  if (dom.playerHpBar) {
    dom.playerHpBar.style.width = `${playerPct * 100}%`;
    if (playerPct < 0.35) {
      dom.playerHpBar.classList.add('low-hp');
    } else {
      dom.playerHpBar.classList.remove('low-hp');
    }
  }
  if (dom.playerHpText) {
    dom.playerHpText.textContent = `${Math.ceil(playerHP)} / ${maxPlayerHP} HP`;
  }
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  if (state === GameState.PLAYING || state === GameState.EXPLODING) {

    if (state === GameState.PLAYING) {
      const elapsedSecs = Math.floor((performance.now() - gameStartTime) / 1000);
      const m = Math.floor(elapsedSecs / 60).toString().padStart(2, '0');
      const s = (elapsedSecs % 60).toString().padStart(2, '0');
      dom.timerBox.textContent = `${m}:${s}`;

      // Update Shield Cooldown
      if (shieldCooldownTimer > 0) {
        shieldCooldownTimer -= dt;
        if (dom.shieldCdOverlay && dom.shieldCdText) {
          dom.shieldCdOverlay.style.display = 'flex';
          dom.shieldCdText.textContent = `${Math.ceil(shieldCooldownTimer)}s`;
        }
      } else {
        if (dom.shieldCdOverlay) {
          dom.shieldCdOverlay.style.display = 'none';
        }
      }

      // Tower Retaliation Attack Loop
      if (!isTowerLockingOn && !tower.isDestroyed()) {
        towerAttackTimer -= dt;
        if (towerAttackTimer <= 0) {
          towerAttackTimer = 6.0 + Math.random() * 2.0;
          startTowerLockOn();
        }
      }

      lastSmokeTime += dt;
      if (lastSmokeTime >= SMOKE_INTERVAL) {
        lastSmokeTime = 0;
        const hp = tower.getHPPercent();
        const base = new THREE.Vector3(0, -1.9, 0);
        if (hp < 0.75 && hp > 0) effects.createSmokeParticles(base, hp < 0.5 ? 3 : 1);
        if (hp < 0.5 && hp > 0) effects.createFireParticles(base, hp < 0.25 ? 6 : 2);
      }
    }

    // 3D AR Camera Gyroscope & Parallax Smooth Interpolation
    currentCamX += (targetCamX - currentCamX) * 0.08;
    currentCamY += (targetCamY - currentCamY) * 0.08;
    camera3d.position.x = currentCamX;
    camera3d.position.y = currentCamY;
    camera3d.lookAt(0, 0.3, 0);

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
  effects.createExplosion(new THREE.Vector3(0, -0.5, 0), debrisPieces);
  tower.hide();

  playSound('explode');

  if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 300]);
  setTimeout(showVictory, 2800);
}

function showVictory() {
  state = GameState.VICTORY;
  playSound('victory');
  const elapsed = ((performance.now() - gameStartTime) / 1000).toFixed(1);
  document.getElementById('stat-damage').textContent = totalDamageDealt;
  document.getElementById('stat-time').textContent = elapsed + 's';
  dom.victory.style.display = 'flex';

  if (handTracker) handTracker.stop();
}

function replay() {
  dom.victory.style.display = 'none';
  if (dom.defeatScreen) dom.defeatScreen.style.display = 'none';
  triggeredAnnouncements = {
    firstBlood: false,
    doubleKill: false,
    tripleKill: false,
    legendary: false
  };
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
