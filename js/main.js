/**
 * main.js — RoV AR Tournament with 40 Authentic RoV Heroes, Class-Strict Gacha, 
 * and AAA Cinematic Match Loading Screen
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
  LOADING:   'loading',
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
    heroes: ['butterfly', 'nakroth', 'murad', 'kriknak', 'zill', 'wukong', 'batman', 'quillen', 'paine', 'keera']
  },
  marksman: {
    id: 'marksman',
    name: 'MARKSMAN',
    title: 'สายแครี่ / ยิงไกล',
    heroes: ['valhein', 'violet', 'yorn', 'slimz', 'thorne', 'fennik', 'moren', 'lindis', 'wisp', 'telannas']
  }
};

/* ==========================================================
   40 Authentic RoV Heroes Data & Dedicated Skill Sets
   ========================================================== */
const HEROES = {
  // --- FIGHTER (10 Heroes) ---
  arthur: {
    id: 'arthur', name: 'ARTHUR', fullName: 'Arthur (อาเธอร์)', classId: 'fighter', role: 'ไฟต์เตอร์ / แทงค์',
    avatar: '/assets/heroes/arthur.png', splash: '/assets/ui/arthur_card.jpg', quote: '"ดาบแห่งความยุติธรรมจะไม่ปรานีใคร!"',
    skills: [
      { id: 'arthur_atk', name: 'ดาบฟันปกติ', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 330, color: '#ffd700', desc: 'ฟันดาบกายภาพ' },
      { id: 'arthur_s1', name: 'Righteous Fervor', tag: 'ดาบศักดิ์สิทธิ์', icon: '/assets/skills/arthur_s1.png', dmg: 490, color: '#ffb700', desc: 'เร่งความเร็วฟาดดาบศักดิ์สิทธิ์' },
      { id: 'arthur_s2', name: 'Holy Guard', tag: 'กงจักรดาบ', icon: '/assets/skills/arthur_s2.png', dmg: 410, color: '#ff9900', desc: 'กงจักรดาบหมุนวนรอบตัว' },
      { id: 'arthur_ult', name: 'Deep Impact', tag: 'ดาบผ่ามิติ', icon: '/assets/skills/arthur_ult.png', dmg: 760, color: '#ff3300', isCrit: true, desc: 'กระโดดฟาดดาบยักษ์ผ่ามิติ' }
    ]
  },
  lubu: {
    id: 'lubu', name: 'LU BU', fullName: 'Lu Bu (ลิโป้)', classId: 'fighter', role: 'ไฟต์เตอร์ / จอมคน',
    avatar: '/assets/heroes/lubu.png', splash: '/assets/ui/arthur_card.jpg', quote: '"ใต้หล้านี้ ไม่มีใครกล้าสบตาข้าผู้นี้!"',
    skills: [
      { id: 'lubu_atk', name: 'ทวนศึกกร้าว', tag: 'โจมตีปกติ', icon: '/assets/skills/lubu_s1.png', dmg: 340, color: '#ff3300', desc: 'ฟาดทวนศึก' },
      { id: 'lubu_s1', name: 'Red Stallion', tag: 'ทวนสามทิศ', icon: '/assets/skills/lubu_s1.png', dmg: 510, color: '#ff4400', desc: 'กระหน่ำแทงทวนศึก 3 จังหวะ' },
      { id: 'lubu_ult', name: 'Conqueror', tag: 'ร่างเทพสงคราม', icon: '/assets/skills/lubu_ult.png', dmg: 820, color: '#ff0000', isCrit: true, desc: 'ระเบิดพลังเทพสงคราม' }
    ]
  },
  maloch: {
    id: 'maloch', name: 'MALOCH', fullName: 'Maloch (มาลอค)', classId: 'fighter', role: 'ไฟต์เตอร์ / จอมมาร',
    avatar: '/assets/heroes/maloch.png', splash: '/assets/ui/arthur_card.jpg', quote: '"ขุมนรกจะกลืนกินเจ้าทั้งเป็น!"',
    skills: [
      { id: 'maloch_atk', name: 'ดาบมารโลกันตร์', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 360, color: '#ff0055', desc: 'ตวัดดาบมารระยะประชิด' },
      { id: 'maloch_s1', name: 'Cleave', tag: 'ดาบฟันกวาด', icon: '/assets/skills/arthur_s1.png', dmg: 550, color: '#cc0033', desc: 'ฟันกวาดดาเมจจริงทะลุเกราะ' },
      { id: 'maloch_ult', name: 'Shock', tag: 'กระแทกนรก', icon: '/assets/skills/arthur_ult.png', dmg: 850, color: '#990000', isCrit: true, desc: 'กระโดดทิ้งดิ่งถล่มป้อม' }
    ]
  },
  thane: {
    id: 'thane', name: 'THANE', fullName: 'Thane (เธน)', classId: 'fighter', role: 'แทงค์ / ราชาดาบ',
    avatar: '/assets/heroes/thane.png', splash: '/assets/ui/arthur_card.jpg', quote: '"ดาบเอกซ์คาลิเบอร์จะปกป้องบัลลังก์!"',
    skills: [
      { id: 'thane_atk', name: 'ดาบอัศวิน', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 320, color: '#ffcc00', desc: 'ฟันดาบอัศวิน' },
      { id: 'thane_ult', name: "King's Glory", tag: 'ดาบยักษ์ผ่าปฐพี', icon: '/assets/skills/arthur_ult.png', dmg: 800, color: '#ffaa00', isCrit: true, desc: 'ฟาดดาบยักษ์เอกซ์คาลิเบอร์' }
    ]
  },
  omen: {
    id: 'omen', name: 'OMEN', fullName: 'Omen (โอเมน)', classId: 'fighter', role: 'ไฟต์เตอร์ / นักฆ่าดาบโซ่',
    avatar: '/assets/heroes/omen.png', splash: '/assets/ui/arthur_card.jpg', quote: '"เสียงโซ่ตรวนคือสัญญาณแห่งความตาย..."',
    skills: [
      { id: 'omen_atk', name: 'ดาบโซ่สังหาร', tag: 'โจมตีปกติ', icon: '/assets/skills/butterfly_s1.png', dmg: 350, color: '#ff3300', desc: 'ฟาดดาบโซ่รวดเร็ว' },
      { id: 'omen_ult', name: 'Death\'s Embrace', tag: 'ลานประหาร', icon: '/assets/skills/lubu_ult.png', dmg: 790, color: '#990022', desc: 'ขังตรึงเป้าหมายในลานประหาร' }
    ]
  },
  ryoma: {
    id: 'ryoma', name: 'RYOMA', fullName: 'Ryoma (เรียวมะ)', classId: 'fighter', role: 'ไฟต์เตอร์ / ซามูไร',
    avatar: '/assets/heroes/ryoma.png', splash: '/assets/ui/arthur_card.jpg', quote: '"คมดาบของข้า เร็วกว่าเงา!"',
    skills: [
      { id: 'ryoma_atk', name: 'ดาบซามูไร', tag: 'โจมตีปกติ', icon: '/assets/skills/butterfly_s1.png', dmg: 340, color: '#33ccff', desc: 'ตวัดดาบซามูไรระยะไกล' },
      { id: 'ryoma_s2', name: 'Wailing Blade', tag: 'แทงทะลวง', icon: '/assets/skills/arthur_s1.png', dmg: 530, color: '#0099ff', desc: 'แทงดาบสตั๊นเป้าหมาย' }
    ]
  },
  taara: {
    id: 'taara', name: 'TAARA', fullName: 'Taara (ทาร่า)', classId: 'fighter', role: 'แทงค์ / ค้อนยักษ์',
    avatar: '/assets/heroes/taara.png', splash: '/assets/ui/arthur_card.jpg', quote: '"ค้อนเหล็กจะบดขยี้ทุกสิ่ง!"',
    skills: [
      { id: 'taara_atk', name: 'ทุบค้อนเหล็ก', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 330, color: '#ff6600', desc: 'ทุบค้อนยักษ์' },
      { id: 'taara_s2', name: 'Whirlwind', tag: 'ค้อนควงสว่าน', icon: '/assets/skills/arthur_s2.png', dmg: 480, color: '#ffaa00', desc: 'ควงค้อนเหล็กหมุนรอบตัว' }
    ]
  },
  astrid: {
    id: 'astrid', name: 'ASTRID', fullName: 'Astrid (แอสตริด)', classId: 'fighter', role: 'ไฟต์เตอร์ / เพลงดาบเพลิง',
    avatar: '/assets/heroes/astrid.png', splash: '/assets/ui/arthur_card.jpg', quote: '"เพื่อเกียรติยศแห่งตระกูลโรส!"',
    skills: [
      { id: 'astrid_atk', name: 'ดาบอัศวินหญิง', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 340, color: '#ff4400', desc: 'ฟันดาบอัศวิน' },
      { id: 'astrid_ult', name: 'Fearless Charge', tag: 'ฟันสะบั้นมิติ', icon: '/assets/skills/arthur_ult.png', dmg: 830, color: '#ff1100', isCrit: true, desc: 'ฟันดาบยักษ์อมตะสะบั้นป้อม' }
    ]
  },
  skud: {
    id: 'skud', name: 'SKUD', fullName: 'Skud (สกั๊ด)', classId: 'fighter', role: 'ไฟต์เตอร์ / หมัดเหล็ก',
    avatar: '/assets/heroes/skud.png', splash: '/assets/ui/arthur_card.jpg', quote: '"หมัดไซบอร์กนี้ ทลายได้แม้แต่ภูผา!"',
    skills: [
      { id: 'skud_atk', name: 'ชกหมัดเหล็ก', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 350, color: '#ff8800', desc: 'ต่อยหมัดหนัก' },
      { id: 'skud_s2', name: 'Power Punch', tag: 'หมัดระเบิดพลัง', icon: '/assets/skills/lubu_ult.png', dmg: 780, color: '#ff3300', isCrit: true, desc: 'ชาร์จหมัดระเบิดป้อม' }
    ]
  },
  airi: {
    id: 'airi', name: 'AIRI', fullName: 'Airi (ไอริ)', classId: 'fighter', role: 'ไฟต์เตอร์ / นินจามังกร',
    avatar: '/assets/heroes/airi.png', splash: '/assets/ui/arthur_card.jpg', quote: '"พลังมังกรสถิตอยู่ในคมดาบ!"',
    skills: [
      { id: 'airi_atk', name: 'ดาบนินจา', tag: 'โจมตีปกติ', icon: '/assets/skills/butterfly_s1.png', dmg: 340, color: '#00ffcc', desc: 'ฟันดาบนินจารวดเร็ว' },
      { id: 'airi_ult', name: 'Dragon Blade', tag: 'มังกรสะบัดคม', icon: '/assets/skills/nakroth_s2.png', dmg: 810, color: '#00e5ff', isCrit: true, desc: 'ปลดปล่อยพลังมังกรดาเมจจริง' }
    ]
  },

  // --- MAGE (10 Heroes) ---
  krixi: {
    id: 'krixi', name: 'KRIXI', fullName: 'Krixi (คริกซี่)', classId: 'mage', role: 'เมจ / พลังเวท',
    avatar: '/assets/heroes/krixi.png', splash: '/assets/ui/krixi_card.jpg', quote: '"สายลมและผีเสื้อจะปกป้องป่าแห่งนี้!"',
    skills: [
      { id: 'krixi_atk', name: 'กระสุนเวทมนตร์', tag: 'โจมตีปกติ', icon: '/assets/skills/krixi_s1.png', dmg: 310, color: '#00ffff', desc: 'ยิงเวทมนตร์ระยะไกล' },
      { id: 'krixi_s1', name: 'Mischief', tag: 'คลื่นผีเสื้อ', icon: '/assets/skills/krixi_s1.png', dmg: 510, color: '#33ccff', desc: 'ปล่อยฝูงผีเสื้อระเบิดใส่ป้อม' },
      { id: 'krixi_s2', name: "Nature's Wrath", tag: 'พายุดอกไม้', icon: '/assets/skills/krixi_s2.png', dmg: 430, color: '#66ff66', desc: 'พายุบุปผายกเป้าหมาย' },
      { id: 'krixi_ult', name: 'Moonfall', tag: 'ฝนดาวตก', icon: '/assets/skills/krixi_ult.png', dmg: 820, color: '#cc66ff', desc: 'ฝนดาวตกผีเสื้อถล่มป้อม' }
    ]
  },
  veera: {
    id: 'veera', name: 'VEERA', fullName: 'Veera (วีร่า)', classId: 'mage', role: 'เมจ / เจ้าเสน่ห์',
    avatar: '/assets/heroes/veera.png', splash: '/assets/ui/krixi_card.jpg', quote: '"ยินดีต้อนรับสู่ห้วงนิทราอันมืดมิด..."',
    skills: [
      { id: 'veera_atk', name: 'ไอเพลิงปีศาจ', tag: 'โจมตีปกติ', icon: '/assets/skills/veera_s1.png', dmg: 320, color: '#ff00ff', desc: 'ยิงไอเวทปีศาจ' },
      { id: 'veera_s1', name: 'Hell Bat', tag: 'ค้างคาวโลกันตร์', icon: '/assets/skills/veera_s1.png', dmg: 530, color: '#cc00ff', desc: 'ปล่อยค้างคาวเพลิงโลกันตร์' }
    ]
  },
  natalya: {
    id: 'natalya', name: 'NATALYA', fullName: 'Natalya (นาตาเลีย)', classId: 'mage', role: 'เมจ / ลำแสงพิษ',
    avatar: '/assets/heroes/natalya.png', splash: '/assets/ui/krixi_card.jpg', quote: '"วิญญาณของพวกเจ้า จะเป็นอาหารของอสูร!"',
    skills: [
      { id: 'nat_atk', name: 'วิญญาณพิษ', tag: 'โจมตีปกติ', icon: '/assets/skills/krixi_s1.png', dmg: 320, color: '#00ff88', desc: 'ยิงไอวิญญาณสีเขียว' },
      { id: 'nat_ult', name: 'Lethal Rays', tag: 'ลำแสงอสูร', icon: '/assets/skills/krixi_ult.png', dmg: 860, color: '#00ffaa', isCrit: true, desc: 'ยิงลำแสงเลเซอร์ทำลายล้าง' }
    ]
  },
  liliana: {
    id: 'liliana', name: 'LILIANA', fullName: 'Liliana (ลิเลียน่า)', classId: 'mage', role: 'เมจ / จิ้งจอกเก้าหาง',
    avatar: '/assets/heroes/liliana.png', splash: '/assets/ui/krixi_card.jpg', quote: '"มนุษย์ช่างน่าสนใจ แต่ก็เปราะบางเหลือเกิน..."',
    skills: [
      { id: 'lili_atk', name: 'ลูกแก้วจิ้งจอก', tag: 'โจมตีปกติ', icon: '/assets/skills/krixi_s1.png', dmg: 330, color: '#ff66cc', desc: 'ยิงลูกแก้วจิ้งจอก' },
      { id: 'lili_s2', name: 'Reiki Shot', tag: 'บอลเก้าหาง', icon: '/assets/skills/krixi_ult.png', dmg: 840, color: '#ff33aa', isCrit: true, desc: 'ปล่อยบอลพลังวิญญาณยักษ์' }
    ]
  },
  tulen: {
    id: 'tulen', name: 'TULEN', fullName: 'Tulen (ทูเลน)', classId: 'mage', role: 'เมจ / สายฟ้าเทพ',
    avatar: '/assets/heroes/tulen.png', splash: '/assets/ui/krixi_card.jpg', quote: '"สายฟ้าของข้า จะพิพากษาพวกเจ้า!"',
    skills: [
      { id: 'tulen_atk', name: 'กระสุนสายฟ้า', tag: 'โจมตีปกติ', icon: '/assets/skills/krixi_s1.png', dmg: 330, color: '#ffea00', desc: 'ยิงกระสุนสายฟ้า' },
      { id: 'tulen_ult', name: 'Thunderbird', tag: 'วิหคสายฟ้า', icon: '/assets/skills/krixi_ult.png', dmg: 870, color: '#ffff00', isCrit: true, desc: 'ยิงวิหคสายฟ้าพิฆาต' }
    ]
  },
  raz: {
    id: 'raz', name: 'RAZ', fullName: 'Raz (ราซ)', classId: 'mage', role: 'เมจ / หมัดมวยเพลิง',
    avatar: '/assets/heroes/raz.png', splash: '/assets/ui/krixi_card.jpg', quote: '"หมัดเพลิงของข้า ร้อนแรงเกินต้านทาน!"',
    skills: [
      { id: 'raz_atk', name: 'หมัดลมกรด', tag: 'โจมตีปกติ', icon: '/assets/skills/lubu_s1.png', dmg: 340, color: '#ff5500', desc: 'ต่อยหมัดเวทเพลิง' },
      { id: 'raz_s2', name: 'Power Surge', tag: 'ปล่อยลูกไฟ', icon: '/assets/skills/violet_s2.png', dmg: 560, color: '#ff3300', desc: 'ปล่อยหมัดคลื่นเพลิงระยะไกล' }
    ]
  },
  lauriel: {
    id: 'lauriel', name: 'LAURIEL', fullName: 'Lauriel (ลอเรียล)', classId: 'mage', role: 'เมจ / ทูตสวรรค์',
    avatar: '/assets/heroes/lauriel.png', splash: '/assets/ui/krixi_card.jpg', quote: '"แสงศักดิ์สิทธิ์จะชำระล้างมลทินทั้งปวง"',
    skills: [
      { id: 'lau_atk', name: 'ขนนกศักดิ์สิทธิ์', tag: 'โจมตีปกติ', icon: '/assets/skills/krixi_s1.png', dmg: 320, color: '#ffffff', desc: 'ยิงขนนกแสงศักดิ์สิทธิ์' },
      { id: 'lau_ult', name: 'Smite', tag: 'วงเวทพิพากษา', icon: '/assets/skills/krixi_ult.png', dmg: 810, color: '#fff0a0', isCrit: true, desc: 'กางวงเวททูตสวรรค์ลดคูลดาวน์' }
    ]
  },
  kahlii: {
    id: 'kahlii', name: 'KAHLII', fullName: 'Kahlii (กาลี)', classId: 'mage', role: 'เมจ / เทพีกาลี',
    avatar: '/assets/heroes/kahlii.png', splash: '/assets/ui/krixi_card.jpg', quote: '"วิญญาณแค้นพันเล่ม จะทิ่มแทงพวกเจ้า!"',
    skills: [
      { id: 'kah_atk', name: 'กระสุนวิญญาณ', tag: 'โจมตีปกติ', icon: '/assets/skills/veera_s1.png', dmg: 330, color: '#bb00ff', desc: 'ยิงกระสุนวิญญาณทะลุเกราะ' },
      { id: 'kah_ult', name: 'Ethering Ghost', tag: 'วิญญาณพันเล่ม', icon: '/assets/skills/krixi_ult.png', dmg: 850, color: '#9900ff', desc: 'สาดวิญญาณพันเล่มถล่มป้อม' }
    ]
  },
  ilumia: {
    id: 'ilumia', name: 'ILUMIA', fullName: 'Ilumia (อิลูเมีย)', classId: 'mage', role: 'เมจ / เทพีสูงสุดแห่งวิหาร',
    avatar: '/assets/heroes/ilumia.png', splash: '/assets/ui/krixi_card.jpg', quote: '"ยอมจำนนต่อแสงแห่งเทพเสียเถิด!"',
    skills: [
      { id: 'ilu_atk', name: 'แสงสุริยะ', tag: 'โจมตีปกติ', icon: '/assets/skills/krixi_s1.png', dmg: 320, color: '#ffe600', desc: 'ยิงประกายแสงสุริยะ' },
      { id: 'ilu_ult', name: 'Cataclysm', tag: 'สายฟ้าสวรรค์', icon: '/assets/skills/krixi_ult.png', dmg: 880, color: '#ffcc00', isCrit: true, desc: 'ทิ้งสายฟ้าสวรรค์ถล่มทั่วแมพ' }
    ]
  },
  aleister: {
    id: 'aleister', name: 'ALEISTER', fullName: 'Aleister (อเลสเตอร์)', classId: 'mage', role: 'เมจ / บงการวิญญาณ',
    avatar: '/assets/heroes/aleister.png', splash: '/assets/ui/krixi_card.jpg', quote: '"เวทมนตร์ของข้า จะทรมานพวกเจ้าช้าๆ..."',
    skills: [
      { id: 'ale_atk', name: 'ไอเวทสายฟ้า', tag: 'โจมตีปกติ', icon: '/assets/skills/veera_s1.png', dmg: 310, color: '#00ff99', desc: 'ยิงสายฟ้าสายมืด' },
      { id: 'ale_ult', name: 'Magic Prison', tag: 'คุกเวทพันธนาการ', icon: '/assets/skills/krixi_ult.png', dmg: 790, color: '#00cc77', desc: 'สร้างคุกเวทตรึงเป้าหมาย' }
    ]
  },

  // --- ASSASSIN (10 Heroes) ---
  butterfly: {
    id: 'butterfly', name: 'BUTTERFLY', fullName: 'Butterfly (บัตเตอร์ฟลาย)', classId: 'assassin', role: 'แอสซาซิน / ล้วง',
    avatar: '/assets/heroes/butterfly.png', splash: '/assets/ui/arthur_card.jpg', quote: '"งานนี้เสร็จเร็วเหมือนพริบตาเดียว!"',
    skills: [
      { id: 'bf_atk', name: 'ดาบสังหาร', tag: 'โจมตีปกติ', icon: '/assets/skills/butterfly_s1.png', dmg: 350, color: '#ff0077', desc: 'ฟันดาบสังหารรวดเร็ว' },
      { id: 'bf_s1', name: 'Whirlwind', tag: 'เพลงดาบหมุน', icon: '/assets/skills/butterfly_s1.png', dmg: 470, color: '#ff3366', desc: 'เพลงดาบหมุนว่องไว' },
      { id: 'bf_ult', name: 'Backstab', tag: 'ลอบสังหาร', icon: '/assets/skills/butterfly_ult.png', dmg: 790, color: '#ff0033', isCrit: true, desc: 'พุ่งแทงลอบสังหารคริติคอล' }
    ]
  },
  nakroth: {
    id: 'nakroth', name: 'NAKROTH', fullName: 'Nakroth (นาครอส)', classId: 'assassin', role: 'แอสซาซิน / ยมทูต',
    avatar: '/assets/heroes/nakroth.png', splash: '/assets/ui/arthur_card.jpg', quote: '"ยมทูตมาทวงวิญญาณของเจ้าแล้ว!"',
    skills: [
      { id: 'nak_atk', name: 'เคียวคู่ยมทูต', tag: 'โจมตีปกติ', icon: '/assets/skills/nakroth_s2.png', dmg: 360, color: '#ff8800', desc: 'ฟันเคียวคู่ยมทูต' },
      { id: 'nak_s2', name: 'Double Whammy', tag: 'ทะลวงมิติ', icon: '/assets/skills/nakroth_s2.png', dmg: 550, color: '#ffaa00', desc: 'พุ่งตวัดฟันดาเมจทะลุเกราะ' }
    ]
  },
  murad: {
    id: 'murad', name: 'MURAD', fullName: 'Murad (มูราด)', classId: 'assassin', role: 'แอสซาซิน / กาลเวลา',
    avatar: '/assets/heroes/murad.png', splash: '/assets/ui/arthur_card.jpg', quote: '"กาลเวลาอยู่ในการควบคุมของข้า!"',
    skills: [
      { id: 'mur_atk', name: 'ดาบแห่งทราย', tag: 'โจมตีปกติ', icon: '/assets/skills/nakroth_s2.png', dmg: 350, color: '#ffcc00', desc: 'ฟันดาบแห่งทราย' },
      { id: 'mur_ult', name: 'Turbulence', tag: 'เพลงดาบไร้เงา', icon: '/assets/skills/butterfly_ult.png', dmg: 860, color: '#ff9900', isCrit: true, desc: 'ฟันเพลงดาบไร้เงาอมตะ 5 จังหวะ' }
    ]
  },
  kriknak: {
    id: 'kriknak', name: 'KRIKNAK', fullName: 'Kriknak (คริกแนก)', classId: 'assassin', role: 'แอสซาซิน / ด้วงมรณะ',
    avatar: '/assets/heroes/kriknak.png', splash: '/assets/ui/arthur_card.jpg', quote: '"เสียงบินของข้า คือจุดจบของเจ้า!"',
    skills: [
      { id: 'krik_atk', name: 'ก้ามมรณะ', tag: 'โจมตีปกติ', icon: '/assets/skills/butterfly_s1.png', dmg: 360, color: '#33ff33', desc: 'ฟาดก้ามด้วงยักษ์' },
      { id: 'krik_ult', name: 'Drone Drop', tag: 'ดิ่งมรณะ', icon: '/assets/skills/butterfly_ult.png', dmg: 880, color: '#00cc00', isCrit: true, desc: 'บินทิ้งดิ่งระเบิดดาเมจมหาศาล' }
    ]
  },
  zill: {
    id: 'zill', name: 'ZILL', fullName: 'Zill (ซิล)', classId: 'assassin', role: 'แอสซาซิน / สายลมมรณะ',
    avatar: '/assets/heroes/zill.png', splash: '/assets/ui/arthur_card.jpg', quote: '"สายลมจะเฉือนร่างเจ้าเป็นชิ้นๆ!"',
    skills: [
      { id: 'zill_atk', name: 'เคียวลมกรด', tag: 'โจมตีปกติ', icon: '/assets/skills/nakroth_s2.png', dmg: 350, color: '#00ffff', desc: 'ฟันเคียวลมกรด' },
      { id: 'zill_ult', name: 'Dust Devil', tag: 'พายุหมุนเชือดเฉือน', icon: '/assets/skills/krixi_ult.png', dmg: 850, color: '#00e5ff', isCrit: true, desc: 'กลายร่างเป็นพายุหมุนเชือดเฉือน' }
    ]
  },
  wukong: {
    id: 'wukong', name: 'WUKONG', fullName: 'Wukong (วูคอง)', classId: 'assassin', role: 'แอสซาซิน / พญาวานร',
    avatar: '/assets/heroes/wukong.png', splash: '/assets/ui/arthur_card.jpg', quote: '"กระบองทองของข้า หนักหมื่นกิโล!"',
    skills: [
      { id: 'wu_atk', name: 'ฟาดกระบองทอง', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 380, color: '#ffaa00', desc: 'ฟาดกระบองทองคริติคอล' },
      { id: 'wu_ult', name: 'Monkey Business', tag: 'กระบองยักษ์สะท้านฟ้า', icon: '/assets/skills/arthur_ult.png', dmg: 890, color: '#ff6600', isCrit: true, desc: 'ขยายกระบองยักษ์ฟาดสะท้านฟ้า' }
    ]
  },
  batman: {
    id: 'batman', name: 'BATMAN', fullName: 'Batman (แบทแมน)', classId: 'assassin', role: 'แอสซาซิน / อัศวินรัตติกาล',
    avatar: '/assets/heroes/batman.png', splash: '/assets/ui/arthur_card.jpg', quote: '"ข้าคือความยุติธรรม... ข้าคือแบทแมน!"',
    skills: [
      { id: 'bat_atk', name: 'หมัดอัศวินดำ', tag: 'โจมตีปกติ', icon: '/assets/skills/attack.png', dmg: 360, color: '#5555ff', desc: 'ชกหมัดอัศวินดำ' },
      { id: 'bat_ult', name: 'Dark Knight', tag: 'พุ่งสังหารในเงา', icon: '/assets/skills/butterfly_ult.png', dmg: 870, color: '#3333cc', isCrit: true, desc: 'พุ่งสังหารจากเงามืด' }
    ]
  },
  quillen: {
    id: 'quillen', name: 'QUILLEN', fullName: 'Quillen (ควิลเลน)', classId: 'assassin', role: 'แอสซาซิน / ดาบคู่หลังสังหาร',
    avatar: '/assets/heroes/butterfly.png', splash: '/assets/ui/arthur_card.jpg', quote: '"ดาบของข้า เสียบข้างหลังเสมอ!"',
    skills: [
      { id: 'quil_atk', name: 'มีดคู่ลอบแทง', tag: 'โจมตีปกติ', icon: '/assets/skills/butterfly_s1.png', dmg: 370, color: '#ff0044', desc: 'แทงมีดคู่ด้านหลังคริติคอล 100%' },
      { id: 'quil_ult', name: 'Purification', tag: 'ล่องหนสังหาร', icon: '/assets/skills/butterfly_ult.png', dmg: 880, color: '#cc0033', isCrit: true, desc: 'ล่องหนฟันดาเมจคริติคอลแท้' }
    ]
  },
  paine: {
    id: 'paine', name: 'PAINE', fullName: 'Paine (เพน)', classId: 'assassin', role: 'แอสซาซิน / นักดนตรีวิญญาณ',
    avatar: '/assets/heroes/veera.png', splash: '/assets/ui/krixi_card.jpg', quote: '"บทเพลงนี้ จะบรรเลงในงานศพเจ้า!"',
    skills: [
      { id: 'paine_atk', name: 'เสียงเปียโนวิญญาณ', tag: 'โจมตีปกติ', icon: '/assets/skills/veera_s1.png', dmg: 360, color: '#cc00ff', desc: 'ฟาดดาบเวทเสียงดนตรี' },
      { id: 'paine_ult', name: 'Requiem', tag: 'ทะยานเพลงมรณะ', icon: '/assets/skills/krixi_ult.png', dmg: 870, color: '#9900cc', isCrit: true, desc: 'พุ่งทะยานบรรเลงเพลงมรณะ' }
    ]
  },
  keera: {
    id: 'keera', name: 'KEERA', fullName: 'Keera (คีร่า)', classId: 'assassin', role: 'แอสซาซิน / มนตราแห่งเงา',
    avatar: '/assets/heroes/krixi.png', splash: '/assets/ui/krixi_card.jpg', quote: '"มาเล่นซ่อนแอบในเงามืดกันเถอะ..."',
    skills: [
      { id: 'keera_atk', name: 'กรงเล็บเงา', tag: 'โจมตีปกติ', icon: '/assets/skills/butterfly_s1.png', dmg: 360, color: '#ff33aa', desc: 'ฟันกรงเล็บเงาเวทมนตร์' },
      { id: 'keera_ult', name: 'Dark Abyss', tag: 'มนตราทลายกำแพง', icon: '/assets/skills/krixi_ult.png', dmg: 860, color: '#ff0077', desc: 'เร่งความเร็วพุ่งทะลุสิ่งกีดขวาง' }
    ]
  },

  // --- MARKSMAN (10 Heroes) ---
  valhein: {
    id: 'valhein', name: 'VALHEIN', fullName: 'Valhein (แวนเฮล)', classId: 'marksman', role: 'แครี่ / นักล่าปีศาจ',
    avatar: '/assets/heroes/valhein.png', splash: '/assets/heroes/violet_card.jpg', quote: '"ลูกปืนสีเงินจะชำระล้างความชั่วร้าย!"',
    skills: [
      { id: 'vh_atk', name: 'ปืนกงจักรเงิน', tag: 'โจมตีปกติ', icon: '/assets/skills/valhein_s2.png', dmg: 320, color: '#ffcc00', desc: 'สาดกระสุนกงจักรเงิน' },
      { id: 'vh_s2', name: 'Curse of Death', tag: 'กงจักรทอง', icon: '/assets/skills/valhein_s2.png', dmg: 460, color: '#ffdd33', desc: 'กงจักรสีทองสตั๊นเป้าหมาย' },
      { id: 'vh_ult', name: 'Bullet Storm', tag: 'พายุกระสุนเงิน', icon: '/assets/skills/valhein_ult.png', dmg: 730, color: '#ff8800', desc: 'พายุกระสุนเงินทะลวงเกราะ' }
    ]
  },
  violet: {
    id: 'violet', name: 'VIOLET', fullName: 'Violet (ไวโอเลต)', classId: 'marksman', role: 'แครี่ / มือปืนระห่ำ',
    avatar: '/assets/heroes/violet.png', splash: '/assets/heroes/violet_card.jpg', quote: '"กระสุนของฉันไม่เคยพลาดเป้า!"',
    skills: [
      { id: 'vio_atk', name: 'ปืนคู่สังหาร', tag: 'โจมตีปกติ', icon: '/assets/skills/violet_s1.png', dmg: 340, color: '#ff8800', desc: 'ยิงปืนคู่รวดเร็ว' },
      { id: 'vio_s1', name: 'Tactical Fire', tag: 'กลิ้งยิงทรงพลัง', icon: '/assets/skills/violet_s1.png', dmg: 530, color: '#ffaa00', desc: 'กลิ้งยิงเสริมดาเมจระยะไกล' },
      { id: 'vio_s2', name: 'Fire in the Hole', tag: 'ระเบิดเพลิง', icon: '/assets/skills/violet_s2.png', dmg: 450, color: '#ff4400', desc: 'ขว้างลูกระเบิดเพลิง' },
      { id: 'vio_ult', name: 'Concussive Rounds', tag: 'ปืนใหญ่สังหาร', icon: '/assets/skills/violet_ult.png', dmg: 790, color: '#ff2200', isCrit: true, desc: 'ยิงปืนใหญ่ระเบิดป้อม' }
    ]
  },
  yorn: {
    id: 'yorn', name: 'YORN', fullName: 'Yorn (ยอร์น)', classId: 'marksman', role: 'แครี่ / เทพบุตรธนูสุริยะ',
    avatar: '/assets/heroes/yorn.png', splash: '/assets/heroes/violet_card.jpg', quote: '"แสงแห่งสุริยัน จะแผดเผาทุกสิ่ง!"',
    skills: [
      { id: 'yorn_atk', name: 'ศรสุริยะ', tag: 'โจมตีปกติ', icon: '/assets/skills/valhein_s2.png', dmg: 340, color: '#ffea00', desc: 'ยิงธนูสุริยะรัวกระหน่ำ' },
      { id: 'yorn_ult', name: 'Heart Shot', tag: 'ศรสุริยันทะลวงมิติ', icon: '/assets/skills/valhein_ult.png', dmg: 840, color: '#ff9900', isCrit: true, desc: 'ยิงศรยักษ์ทะลุข้ามสมรภูมิ' }
    ]
  },
  slimz: {
    id: 'slimz', name: 'SLIMZ', fullName: 'Slimz (สลิมซ์)', classId: 'marksman', role: 'แครี่ / กระต่ายหอกบิน',
    avatar: '/assets/heroes/slimz.png', splash: '/assets/heroes/violet_card.jpg', quote: '"ใครว่ากระต่ายทำธุรกิจไม่ได้?!"',
    skills: [
      { id: 'slim_atk', name: 'ปาหอกสั้น', tag: 'โจมตีปกติ', icon: '/assets/skills/valhein_s2.png', dmg: 330, color: '#ffaa33', desc: 'ปาหอกสั้น' },
      { id: 'slim_s1', name: 'Flying Spear', tag: 'หอกบินสตั๊น', icon: '/assets/skills/violet_s1.png', dmg: 550, color: '#ff7700', desc: 'ขว้างหอกบินสตั๊นตามระยะทาง' }
    ]
  },
  thorne: {
    id: 'thorne', name: 'THORNE', fullName: 'Thorne (ธอร์น)', classId: 'marksman', role: 'แครี่ / กระสุนเวท 3 สี',
    avatar: '/assets/heroes/thorne.png', splash: '/assets/heroes/violet_card.jpg', quote: '"กระสุนสีม่วงนี้ จะปลิดชีพเจ้า"',
    skills: [
      { id: 'thorne_atk', name: 'กระสุนมนตรา', tag: 'โจมตีปกติ', icon: '/assets/skills/violet_s1.png', dmg: 350, color: '#cc33ff', desc: 'ยิงกระสุนมนตรา 3 สี' },
      { id: 'thorne_ult', name: 'Dark Matter', tag: 'ระเบิดอนุภาคทมิฬ', icon: '/assets/skills/violet_ult.png', dmg: 860, color: '#9900cc', isCrit: true, desc: 'ยิงระเบิดวงกว้างทำลายล้าง' }
    ]
  },
  fennik: {
    id: 'fennik', name: 'FENNIK', fullName: 'Fennik (เฟนนิค)', classId: 'marksman', role: 'แครี่ / จิ้งจอกสายฟ้าระเบิด',
    avatar: '/assets/heroes/fennik.png', splash: '/assets/heroes/violet_card.jpg', quote: '"ไม่มีใครวิ่งเร็วกว่าข้าหรอก!"',
    skills: [
      { id: 'fen_atk', name: 'ยิงกงจักรสายฟ้า', tag: 'โจมตีปกติ', icon: '/assets/skills/valhein_s2.png', dmg: 330, color: '#ffee00', desc: 'ยิงกงจักรสายฟ้า' },
      { id: 'fen_s1', name: 'Thief\'s Mark', tag: 'โซ่วงแหวนระเบิด', icon: '/assets/skills/violet_s2.png', dmg: 560, color: '#ffbb00', desc: 'แปะวงแหวนระเบิดป้อม' }
    ]
  },
  moren: {
    id: 'moren', name: 'MOREN', fullName: 'Moren (มอร์เรน)', classId: 'marksman', role: 'แครี่ / ช่างปืนกลเกราะหนา',
    avatar: '/assets/heroes/moren.png', splash: '/assets/heroes/violet_card.jpg', quote: '"ปืนลูกซองของข้า พร้อมเผาผลาญ!"',
    skills: [
      { id: 'mor_atk', name: 'ลูกซองคู่', tag: 'โจมตีปกติ', icon: '/assets/skills/violet_s1.png', dmg: 340, color: '#ff6600', desc: 'ยิงลูกซองระยะใกล้หนักหน่วง' },
      { id: 'mor_ult', name: 'Magnetic Storm', tag: 'พายุสนามแม่เหล็ก', icon: '/assets/skills/violet_ult.png', dmg: 810, color: '#ff3300', desc: 'ปล่อยพายุแม่เหล็กช็อตป้อม' }
    ]
  },
  lindis: {
    id: 'lindis', name: 'LINDIS', fullName: 'Lindis (ลินดิส)', classId: 'marksman', role: 'แครี่ / เทพีจันทรา',
    avatar: '/assets/heroes/lindis.png', splash: '/assets/heroes/violet_card.jpg', quote: '"แสงจันทราจะนำทางลูกศรของข้า"',
    skills: [
      { id: 'lin_atk', name: 'ศรจันทรา', tag: 'โจมตีปกติ', icon: '/assets/skills/valhein_s2.png', dmg: 340, color: '#e0f7ff', desc: 'ยิงศรจันทราเพิ่มสปีด' },
      { id: 'lin_ult', name: 'Lunar Champion', tag: 'วิญญาณจันทราพิฆาต', icon: '/assets/skills/valhein_ult.png', dmg: 830, color: '#80d8ff', isCrit: true, desc: 'ปล่อยวิญญาณจันทรา 5 ดอก' }
    ]
  },
  wisp: {
    id: 'wisp', name: 'WISP', fullName: 'Wisp (วิสป์)', classId: 'marksman', role: 'แครี่ / หุ่นยนต์ปืนกลยักษ์',
    avatar: '/assets/heroes/wisp.png', splash: '/assets/heroes/violet_card.jpg', quote: '"หุ่นยนต์ของหนู พลังทำลายอันดับหนึ่ง!"',
    skills: [
      { id: 'wisp_atk', name: 'ยิงปืนกลหนัก', tag: 'โจมตีปกติ', icon: '/assets/skills/violet_s1.png', dmg: 340, color: '#ff9900', desc: 'ยิงกระสุนปืนกลกระจาย' },
      { id: 'wisp_ult', name: 'Shock and Awe', tag: 'ปูพรมระเบิด', icon: '/assets/skills/violet_ult.png', dmg: 850, color: '#ff3300', isCrit: true, desc: 'ปูพรมระเบิด 6 ระลอกใส่ป้อม' }
    ]
  },
  telannas: {
    id: 'telannas', name: 'TEL\'ANNAS', fullName: 'Tel\'Annas (เทลอันนาส)', classId: 'marksman', role: 'แครี่ / ราชินีเอลฟ์แห่งพงไพร',
    avatar: '/assets/heroes/valhein.png', splash: '/assets/heroes/violet_card.jpg', quote: '"เพื่อปกป้องป่าแห่งมนตรา ข้าจะไม่ยอมถอย!"',
    skills: [
      { id: 'tel_atk', name: 'ศรเอลฟ์มังกร', tag: 'โจมตีปกติ', icon: '/assets/skills/valhein_s2.png', dmg: 340, color: '#66ffcc', desc: 'ยิงศรเวทมนตร์ระยะไกลพิเศษ' },
      { id: 'tel_ult', name: 'Arrow of Chaos', tag: 'ศรมังกรพญายม', icon: '/assets/skills/valhein_ult.png', dmg: 860, color: '#00ffaa', isCrit: true, desc: 'ยิงศรมังกรยักษ์สตั๊นทำลายล้าง' }
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
  dom.summonScreen = document.getElementById('summoning-screen');
  dom.matchLoadingScreen = document.getElementById('match-loading-screen');
  dom.gameScreen = document.getElementById('game-screen');
  dom.victory = document.getElementById('victory-screen');

  dom.startBtn = document.getElementById('start-btn');
  dom.replayBtn = document.getElementById('replay-btn');
  dom.enterBattleBtn = document.getElementById('enter-battle-btn');
  dom.classCards = document.querySelectorAll('.hero-card');

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

  dom.video = document.getElementById('camera-feed');
  dom.canvas = document.getElementById('game-canvas');
  dom.handsCanvas = document.getElementById('hands-canvas');
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

  dom.replayBtn.addEventListener('click', replay);
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
  const totalSteps = 20 + Math.floor(Math.random() * 8);

  playSound('summon_charge');

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
   AAA Match Loading Sequence (RoV 5v5 Cinematic Start)
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

  const interval = setInterval(() => {
    playerPct = Math.min(100, playerPct + Math.floor(Math.random() * 12 + 8));
    bossPct = Math.min(100, bossPct + Math.floor(Math.random() * 14 + 6));

    dom.matchPlayerBar.style.width = `${playerPct}%`;
    dom.matchPlayerPercent.textContent = `${playerPct}%`;

    dom.matchBossBar.style.width = `${bossPct}%`;
    dom.matchBossPercent.textContent = `${bossPct}%`;

    if (playerPct < 40) {
      dom.matchStatusMsg.textContent = 'กำลังโหลดข้อมูลแผนที่ Antaris Battlefield...';
    } else if (playerPct < 85) {
      dom.matchStatusMsg.textContent = 'กำลังเปิดระบบตรวจจับกล้อง AR และ Hand Tracking...';
    } else {
      dom.matchStatusMsg.textContent = 'พร้อมเข้าสู่สมรภูมิ! ยินดีต้อนรับสู่ Arena of Valor!';
    }

    if (playerPct >= 100 && bossPct >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        dom.matchLoadingScreen.style.display = 'none';
        startGame();
      }, 700);
    }
  }, 140);
}

/* ==========================================================
   In-Game Hero & Skill Management
   ========================================================== */
function setHero(hero) {
  activeHero = hero;

  if (dom.heroBadgeAvatar) dom.heroBadgeAvatar.src = hero.avatar;
  if (dom.heroBadgeName) dom.heroBadgeName.textContent = hero.name;
  if (dom.heroBadgeType) dom.heroBadgeType.textContent = hero.role;

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

  if (dom.skillsContainer) {
    dom.skillsContainer.querySelectorAll('.hotbar-slot').forEach(s => s.classList.remove('active'));
  }
  if (slotEl) slotEl.classList.add('active');

  if (handTracker && skillImages[skill.id]) {
    handTracker.setWeapon(skillImages[skill.id]);
  }
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
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gainNode.gain.setValueAtTime(0.32, now);
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
    osc.frequency.exponentialRampToValueAtTime(850, now + 1.8);
    gainNode.gain.setValueAtTime(0.06, now);
    gainNode.gain.linearRampToValueAtTime(0.42, now + 1.8);
    osc.start(now);
    osc.stop(now + 1.8);
  } else if (type === 'summon_reveal') {
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, now + i * 0.05);
      g.gain.setValueAtTime(0.38, now + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      o.start(now + i * 0.05);
      o.stop(now + 2.5);
    });
  } else if (type === 'match_start') {
    // RoV War Horn / Fanfare
    [196, 261.63, 329.63, 392, 523.25].forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, now + i * 0.08);
      g.gain.setValueAtTime(0.28, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      o.start(now + i * 0.08);
      o.stop(now + 2.2);
    });
  } else if (type === 'explode') {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
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
  }
}

/* ==========================================================
   Game Flow
   ========================================================== */
async function startGame() {
  initAudio();
  dom.landing.style.display = 'none';
  dom.gameScreen.style.display = 'block';

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
      const elapsedSecs = Math.floor((performance.now() - gameStartTime) / 1000);
      const m = Math.floor(elapsedSecs / 60).toString().padStart(2, '0');
      const s = (elapsedSecs % 60).toString().padStart(2, '0');
      dom.timerBox.textContent = `${m}:${s}`;

      lastSmokeTime += dt;
      if (lastSmokeTime >= SMOKE_INTERVAL) {
        lastSmokeTime = 0;
        const hp = tower.getHPPercent();
        const base = new THREE.Vector3(0, -2.4, 0);
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
  effects.createExplosion(new THREE.Vector3(0, -2.4, 0), debrisPieces);
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
