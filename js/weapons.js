/**
 * weapons.js — RoV weapon database & randomization
 */

const ALL_WEAPONS = [
  // ——— นักรบ (Warrior) ———
  { id: 'claves',      name: 'Claves Sancti',     nameTh: 'ดาบสังหาร',         damage: 120, type: 'warrior',  color: '#e74c3c', rgb: '231,76,60',   icon: '⚔️' },
  { id: 'rankbreaker',  name: 'Rankbreaker',        nameTh: 'ดาบทะลุเกราะ',      damage: 100, type: 'warrior',  color: '#e74c3c', rgb: '231,76,60',   icon: '🗡️' },
  { id: 'fenrir',       name: "Fenrir's Tooth",     nameTh: 'เขี้ยวเฟนเรียร์',   damage: 200, type: 'warrior',  color: '#e74c3c', rgb: '231,76,60',   icon: '🐺' },

  // ——— นักเวทย์ (Mage) ———
  { id: 'nuul',         name: 'Staff of Nuul',      nameTh: 'คทาแห่งนูล',        damage: 150, type: 'mage',     color: '#3498db', rgb: '52,152,219',  icon: '🔮' },
  { id: 'hecate',       name: "Hecate's Diadem",    nameTh: 'มงกุฎเฮคาเต้',      damage: 130, type: 'mage',     color: '#3498db', rgb: '52,152,219',  icon: '👑' },
  { id: 'boomstick',    name: 'Boomstick',          nameTh: 'ไม้เท้าระเบิด',      damage: 180, type: 'mage',     color: '#3498db', rgb: '52,152,219',  icon: '💥' },

  // ——— พลแม่นปืน (Marksman) ———
  { id: 'slikk',        name: "Slikk's Sting",      nameTh: 'เหล็กไนสลิค',       damage: 90,  type: 'marksman', color: '#f1c40f', rgb: '241,196,15',  icon: '🏹' },
  { id: 'devil',        name: "Devil's Handshake",  nameTh: 'มือปีศาจ',          damage: 85,  type: 'marksman', color: '#f1c40f', rgb: '241,196,15',  icon: '🤝' },
  { id: 'bow',          name: 'Bow of Slaughter',   nameTh: 'ธนูสังหาร',         damage: 160, type: 'marksman', color: '#f1c40f', rgb: '241,196,15',  icon: '🎯' },

  // ——— แทงค์ (Tank) ———
  { id: 'shield_lost',  name: 'Shield of the Lost', nameTh: 'โล่สาบสูญ',         damage: 50,  type: 'tank',     color: '#2ecc71', rgb: '46,204,113',  icon: '🛡️' },
  { id: 'gaia',         name: "Gaia's Standard",    nameTh: 'ธงไกอา',            damage: 45,  type: 'tank',     color: '#2ecc71', rgb: '46,204,113',  icon: '🏴' },
  { id: 'frost',        name: 'Frost Cape',         nameTh: 'ผ้าคลุมน้ำแข็ง',    damage: 60,  type: 'tank',     color: '#2ecc71', rgb: '46,204,113',  icon: '❄️' },

  // ——— นักฆ่า / สายป่า (Assassin) ———
  { id: 'soulreaver',   name: 'Soulreaver',         nameTh: 'ดาบดูดวิญญาณ',      damage: 170, type: 'assassin', color: '#e67e22', rgb: '230,126,34',  icon: '💀' },
  { id: 'scorching',    name: 'Scorching Wind',     nameTh: 'ลมไฟ',              damage: 110, type: 'assassin', color: '#e67e22', rgb: '230,126,34',  icon: '🔥' },
  { id: 'leviathan',    name: 'Leviathan',          nameTh: 'เลเวียธาน',         damage: 70,  type: 'assassin', color: '#e67e22', rgb: '230,126,34',  icon: '🐉' },

  // ——— ซัพพอร์ต (Support) ———
  { id: 'tidecaller',   name: "Tidecaller's Mark",  nameTh: 'ตราแห่งสมุทร',      damage: 40,  type: 'support',  color: '#9b59b6', rgb: '155,89,182',  icon: '🌊' },
  { id: 'aegis',        name: 'The Aegis',          nameTh: 'โล่อีจิส',           damage: 55,  type: 'support',  color: '#9b59b6', rgb: '155,89,182',  icon: '⏱️' },
  { id: 'purifying',    name: 'Purifying Bracers',  nameTh: 'กำไลบริสุทธิ์',      damage: 35,  type: 'support',  color: '#9b59b6', rgb: '155,89,182',  icon: '💫' },
];

/**
 * Returns `count` randomly selected weapons (no duplicates).
 * @param {number} count
 * @returns {Array}
 */
export function getRandomWeapons(count = 5) {
  const shuffled = [...ALL_WEAPONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Returns all available weapons. */
export function getAllWeapons() {
  return ALL_WEAPONS;
}
