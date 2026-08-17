/**
 * minions.js — AAA RoV 3D Minion & Creep Wave System (ระบบกองทหารครีป RoV 3D)
 * Includes:
 * 1. Melee Creep (ทหารราบเกราะเหล็ก ดาบ-โล่)
 * 2. Ranged Mage Creep (ทหารเมจ คทาเวทมนตร์ ยิงกระสุนพลังงาน)
 * 3. Siege Cannon Creep (รถปืนใหญ่จักรกล หุ้มเกราะทอง ยิงระเบิดหนัก)
 * 
 * Features:
 * - Dynamic Limb Walk Cycles & Attack Windup Animations
 * - Canvas-based 3D World Floating Segmented HP Bars with Level Tags
 * - Hit Reaction Flinches & Shatter Death Debris
 * - Projectiles targeting player camera with Shield block integration
 */
import * as THREE from 'three';

export class Minion {
  /**
   * @param {THREE.Scene} scene
   * @param {'melee'|'ranged'|'siege'} type
   * @param {THREE.Vector3} spawnPos
   * @param {number} waveNumber
   */
  constructor(scene, type, spawnPos, waveNumber = 1) {
    this.scene = scene;
    this.type = type;
    this.wave = waveNumber;
    this.group = new THREE.Group();

    // Stats based on RoV creep scaling
    if (type === 'siege') {
      this.maxHP = 1200 + (waveNumber - 1) * 300;
      this.attackDamage = 90 + (waveNumber - 1) * 20;
      this.speed = 0.9;
      this.attackRange = 4.2;
      this.goldReward = 85;
      this.nameTh = 'ครีปรถปืนใหญ่';
      this.scaleVal = 0.62;
    } else if (type === 'ranged') {
      this.maxHP = 600 + (waveNumber - 1) * 150;
      this.attackDamage = 65 + (waveNumber - 1) * 15;
      this.speed = 1.05;
      this.attackRange = 4.8;
      this.goldReward = 55;
      this.nameTh = 'ครีปเมจมนตรา';
      this.scaleVal = 0.52;
    } else {
      // Melee
      this.maxHP = 850 + (waveNumber - 1) * 200;
      this.attackDamage = 50 + (waveNumber - 1) * 12;
      this.speed = 1.25;
      this.attackRange = 2.4;
      this.goldReward = 45;
      this.nameTh = 'ครีปดาบประจัญบาน';
      this.scaleVal = 0.54;
    }

    this.currentHP = this.maxHP;
    this.isDead = false;
    this.attackCooldown = 0;
    this.attackInterval = type === 'siege' ? 3.0 : (type === 'ranged' ? 2.2 : 1.6);
    this.animTime = Math.random() * 10;
    this.flinchTimer = 0;

    // Movement Target (Advances towards player at Z = 7.8)
    this.group.position.copy(spawnPos);
    this.targetZ = 7.5;

    // Animated sub-mesh references
    this.leftLeg = null;
    this.rightLeg = null;
    this.leftArm = null;
    this.rightArm = null;
    this.weaponMesh = null;
    this.cannonBarrel = null;
    this.wheels = [];
    this.bodyMesh = null;
    this.emissiveParts = [];
    this.originalColors = [];

    // Build 3D Model
    this._buildModel();

    // Floating HP Bar Sprite
    this._buildFloatingHPBar();

    this.group.scale.set(this.scaleVal, this.scaleVal, this.scaleVal);
    this.scene.add(this.group);
  }

  /* ----------------------------------------------------------
     Build Procedural 3D Mesh for Minion
     ---------------------------------------------------------- */
  _buildModel() {
    // PBR Armor Materials (Antaris Enemy Siege Theme: Deep Crimson, Charcoal, and Burnished Gold)
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x8a1c1c, // Deep red armor
      roughness: 0.45,
      metalness: 0.75
    });

    const darkIronMat = new THREE.MeshStandardMaterial({
      color: 0x22262e,
      roughness: 0.65,
      metalness: 0.85
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0x332200,
      emissiveIntensity: 0.4
    });

    const glowingEyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0044,
      emissive: 0xff0033,
      emissiveIntensity: 2.5,
      roughness: 0.1,
      metalness: 0.1
    });

    if (this.type === 'melee') {
      this._buildMeleeModel(armorMat, darkIronMat, goldTrimMat, glowingEyeMat);
    } else if (this.type === 'ranged') {
      this._buildRangedModel(armorMat, darkIronMat, goldTrimMat, glowingEyeMat);
    } else {
      this._buildSiegeModel(armorMat, darkIronMat, goldTrimMat, glowingEyeMat);
    }
  }

  _buildMeleeModel(armorMat, darkIronMat, goldTrimMat, glowingEyeMat) {
    // 1. Torso / Chestplate
    const torsoGeo = new THREE.CylinderGeometry(0.55, 0.45, 0.9, 6);
    this.bodyMesh = new THREE.Mesh(torsoGeo, armorMat.clone());
    this.bodyMesh.position.y = 1.1;
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Gold Chest Emblem
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), goldTrimMat.clone());
    crest.position.set(0, 1.2, 0.48);
    this.group.add(crest);

    // 2. Armored Helmet / Head
    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const head = new THREE.Mesh(headGeo, darkIronMat.clone());
    head.position.set(0, 1.85, 0);
    this.group.add(head);

    // Horned Crest on Helmet
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 4), goldTrimMat.clone());
    hornL.position.set(-0.25, 2.15, 0);
    hornL.rotation.z = Math.PI / 5;
    this.group.add(hornL);

    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 4), goldTrimMat.clone());
    hornR.position.set(0.25, 2.15, 0);
    hornR.rotation.z = -Math.PI / 5;
    this.group.add(hornR);

    // Visor Glowing Eyes
    const eyeVisor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.1), glowingEyeMat.clone());
    eyeVisor.position.set(0, 1.85, 0.25);
    this.group.add(eyeVisor);
    this.emissiveParts.push(eyeVisor);

    // 3. Left Arm + Heavy Shield
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.65, 1.35, 0);

    const lArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6), darkIronMat.clone());
    lArmMesh.position.y = -0.3;
    this.leftArm.add(lArmMesh);

    // Shield
    const shieldGeo = new THREE.BoxGeometry(0.65, 1.0, 0.12);
    const shield = new THREE.Mesh(shieldGeo, armorMat.clone());
    shield.position.set(0, -0.3, 0.35);
    
    // Shield Gold Cross Trim
    const shieldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.14), goldTrimMat.clone());
    shieldTrim.position.set(0, -0.3, 0.36);
    this.leftArm.add(shield);
    this.leftArm.add(shieldTrim);
    this.group.add(this.leftArm);

    // 4. Right Arm + Broadsword
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.65, 1.35, 0);

    const rArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6), darkIronMat.clone());
    rArmMesh.position.y = -0.3;
    this.rightArm.add(rArmMesh);

    // Broadsword Blade
    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.04), darkIronMat.clone());
    swordBlade.position.set(0, -0.1, 0.6);
    swordBlade.rotation.x = Math.PI / 3;

    const swordHilt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.08), goldTrimMat.clone());
    swordHilt.position.set(0, -0.4, 0.25);

    this.weaponMesh = swordBlade;
    this.rightArm.add(swordBlade);
    this.rightArm.add(swordHilt);
    this.group.add(this.rightArm);

    // 5. Legs
    this.leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.65, 6), darkIronMat.clone());
    this.leftLeg.position.set(-0.25, 0.35, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.65, 6), darkIronMat.clone());
    this.rightLeg.position.set(0.25, 0.35, 0);
    this.group.add(this.rightLeg);
  }

  _buildRangedModel(armorMat, darkIronMat, goldTrimMat, glowingEyeMat) {
    // Arcane Caster with Wizard Robe & Glowing Staff
    const robeMat = new THREE.MeshStandardMaterial({
      color: 0x4a144a, // Dark arcane purple robe
      roughness: 0.8,
      metalness: 0.2
    });

    const magicOrbMat = new THREE.MeshStandardMaterial({
      color: 0xff00bb,
      emissive: 0xff0088,
      emissiveIntensity: 2.8,
      roughness: 0.1
    });

    // 1. Robe Base
    const robeGeo = new THREE.ConeGeometry(0.65, 1.3, 8);
    this.bodyMesh = new THREE.Mesh(robeGeo, robeMat.clone());
    this.bodyMesh.position.y = 0.65;
    this.group.add(this.bodyMesh);

    // Shoulder Armor Mantle
    const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 6), armorMat.clone());
    mantle.position.y = 1.35;
    this.group.add(mantle);

    // 2. Wizard Hood / Head
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 6), robeMat.clone());
    hood.position.set(0, 1.85, -0.05);
    hood.rotation.x = -0.15;
    this.group.add(hood);

    // Glowing Eyes in Shadow of Hood
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), glowingEyeMat.clone());
    eyeL.position.set(-0.12, 1.62, 0.25);
    this.group.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), glowingEyeMat.clone());
    eyeR.position.set(0.12, 1.62, 0.25);
    this.group.add(eyeR);
    this.emissiveParts.push(eyeL, eyeR);

    // 3. Right Arm + Arcane Staff
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.6, 1.25, 0);

    const staffShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 8), darkIronMat.clone());
    staffShaft.position.set(0, 0.3, 0.3);
    staffShaft.rotation.x = 0.2;
    this.rightArm.add(staffShaft);

    // Staff Golden Crown Head
    const staffCrown = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16), goldTrimMat.clone());
    staffCrown.position.set(0, 1.15, 0.45);
    this.rightArm.add(staffCrown);

    // Floating Magic Crystal Orb
    const staffOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), magicOrbMat.clone());
    staffOrb.position.set(0, 1.15, 0.45);
    this.rightArm.add(staffOrb);
    this.weaponMesh = staffOrb;
    this.emissiveParts.push(staffOrb);

    this.group.add(this.rightArm);
  }

  _buildSiegeModel(armorMat, darkIronMat, goldTrimMat, glowingEyeMat) {
    // Heavy Armored Mechanical Cannon Vehicle
    const chassisGeo = new THREE.BoxGeometry(1.4, 0.55, 1.5);
    this.bodyMesh = new THREE.Mesh(chassisGeo, armorMat.clone());
    this.bodyMesh.position.y = 0.6;
    this.group.add(this.bodyMesh);

    // Gold Armor Plate Inlays
    const armorPlate = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.3, 1.2), goldTrimMat.clone());
    armorPlate.position.set(0, 0.6, 0);
    this.group.add(armorPlate);

    // Turret Dome
    const turretGeo = new THREE.CylinderGeometry(0.55, 0.7, 0.45, 8);
    const turret = new THREE.Mesh(turretGeo, darkIronMat.clone());
    turret.position.set(0, 1.05, -0.1);
    this.group.add(turret);

    // Heavy Cannon Barrel
    this.cannonBarrel = new THREE.Group();
    this.cannonBarrel.position.set(0, 1.1, 0.2);

    const barrelPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.2, 8), darkIronMat.clone());
    barrelPipe.rotation.x = Math.PI / 2;
    barrelPipe.position.z = 0.5;

    const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 16), goldTrimMat.clone());
    muzzleRing.position.z = 1.1;

    // Glowing Core in Muzzle
    const muzzleCore = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), glowingEyeMat.clone());
    muzzleCore.position.z = 0.95;

    this.cannonBarrel.add(barrelPipe);
    this.cannonBarrel.add(muzzleRing);
    this.cannonBarrel.add(muzzleCore);
    this.emissiveParts.push(muzzleCore);

    this.group.add(this.cannonBarrel);

    // 4 Heavy Iron Wheels with Spikes
    this.wheels = [];
    const wheelPositions = [
      [-0.8, 0.35, 0.5],
      [0.8, 0.35, 0.5],
      [-0.8, 0.35, -0.5],
      [0.8, 0.35, -0.5]
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12), darkIronMat.clone());
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);

      const hub = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 6), goldTrimMat.clone());
      hub.position.set(x > 0 ? 0.15 : -0.15, 0, 0);
      hub.rotation.z = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      wheel.add(hub);

      this.wheels.push(wheel);
      this.group.add(wheel);
    });
  }

  /* ----------------------------------------------------------
     Canvas-based 3D World Floating Segmented HP Bar
     ---------------------------------------------------------- */
  _buildFloatingHPBar() {
    this.hpCanvas = document.createElement('canvas');
    this.hpCanvas.width = 256;
    this.hpCanvas.height = 64;
    this.hpCtx = this.hpCanvas.getContext('2d');

    this.hpTexture = new THREE.CanvasTexture(this.hpCanvas);
    this.hpTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.hpTexture,
      transparent: true,
      depthTest: false
    });

    this.hpSprite = new THREE.Sprite(spriteMat);
    this.hpSprite.scale.set(1.4, 0.35, 1.0);
    this.hpSprite.position.set(0, this.type === 'siege' ? 2.2 : 2.5, 0);
    this.group.add(this.hpSprite);

    this._updateHPBar();
  }

  _updateHPBar() {
    if (!this.hpCtx) return;
    const ctx = this.hpCtx;
    const w = 256;
    const h = 64;
    ctx.clearRect(0, 0, w, h);

    const pct = Math.max(0, this.currentHP / this.maxHP);

    // 1. Dark Glass Background Frame
    ctx.fillStyle = 'rgba(5, 8, 18, 0.88)';
    ctx.roundRect(10, 20, w - 20, 28, 6);
    ctx.fill();

    ctx.strokeStyle = '#3a4459';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Inner Health Bar (Red/Orange enemy bar with segments)
    const barW = (w - 28) * pct;
    if (barW > 0) {
      const grad = ctx.createLinearGradient(14, 0, w - 14, 0);
      grad.addColorStop(0, '#ff1a1a');
      grad.addColorStop(0.7, '#ff5500');
      grad.addColorStop(1, '#ffaa00');

      ctx.fillStyle = grad;
      ctx.roundRect(14, 24, barW, 20, 4);
      ctx.fill();
    }

    // 3. Segment Divider Lines (RoV 1,000 HP Bar tick lines)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1.5;
    const totalSegments = Math.max(2, Math.floor(this.maxHP / 300));
    for (let i = 1; i < totalSegments; i++) {
      const segX = 14 + ((w - 28) / totalSegments) * i;
      ctx.beginPath();
      ctx.moveTo(segX, 24);
      ctx.lineTo(segX, 44);
      ctx.stroke();
    }

    // 4. Minion Name & Level Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(`LV.${this.wave} ${this.nameTh}`, 14, 2);

    this.hpTexture.needsUpdate = true;
  }

  /* ----------------------------------------------------------
     Combat & Damage Interaction
     ---------------------------------------------------------- */
  takeDamage(amount) {
    if (this.isDead) return 0;

    this.currentHP = Math.max(0, this.currentHP - amount);
    this.flinchTimer = 0.18;
    this._updateHPBar();

    // Flash Red / White Hit Flash
    if (this.bodyMesh && this.bodyMesh.material) {
      const origCol = this.type === 'ranged' ? 0x4a144a : 0x8a1c1c;
      this.bodyMesh.material.color.set(0xffffff);
      setTimeout(() => {
        if (this.bodyMesh && this.bodyMesh.material) {
          this.bodyMesh.material.color.set(origCol);
        }
      }, 100);
    }

    if (this.currentHP <= 0) {
      this.isDead = true;
    }

    return amount;
  }

  /* ----------------------------------------------------------
     Frame Update Animations (Walk & Attack Logic)
     ---------------------------------------------------------- */
  update(dt, playerPos, onAttackCallback) {
    if (this.isDead) return;

    this.animTime += dt * 4.5;
    if (this.flinchTimer > 0) this.flinchTimer -= dt;

    // Calculate distance to player (Z target is player camera at 7.8)
    const distToPlayer = Math.abs(this.group.position.z - this.targetZ);

    if (distToPlayer > this.attackRange) {
      // 1. Advance March towards Player
      this.group.position.z += this.speed * dt;

      // 2. Procedural Walking Limb Animations
      if (this.leftLeg && this.rightLeg) {
        this.leftLeg.rotation.x = Math.sin(this.animTime) * 0.45;
        this.rightLeg.rotation.x = -Math.sin(this.animTime) * 0.45;
      }
      if (this.leftArm && this.rightArm) {
        this.leftArm.rotation.x = -Math.sin(this.animTime) * 0.35;
        this.rightArm.rotation.x = Math.sin(this.animTime) * 0.35;
      }
      if (this.wheels.length > 0) {
        this.wheels.forEach(w => w.rotation.x += dt * 5.0);
      }

      // Torso Walk Bobbing
      this.bodyMesh.position.y = (this.type === 'siege' ? 0.6 : (this.type === 'ranged' ? 0.65 : 1.1)) + Math.abs(Math.sin(this.animTime * 2)) * 0.06;

    } else {
      // Reached Attack Range -> Engage Combat Loop
      this.attackCooldown -= dt;

      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.attackInterval;
        this._triggerAttackAnimation(onAttackCallback);
      }
    }
  }

  _triggerAttackAnimation(onAttackCallback) {
    // Windup and strike
    if (this.type === 'melee') {
      if (this.rightArm) {
        this.rightArm.rotation.x = -Math.PI / 2.5;
        setTimeout(() => {
          if (this.rightArm) this.rightArm.rotation.x = Math.PI / 3;
          if (onAttackCallback) onAttackCallback(this);
        }, 220);
      }
    } else if (this.type === 'ranged') {
      if (this.rightArm) {
        this.rightArm.position.y = 1.45;
        setTimeout(() => {
          if (this.rightArm) this.rightArm.position.y = 1.25;
          if (onAttackCallback) onAttackCallback(this);
        }, 250);
      }
    } else if (this.type === 'siege') {
      if (this.cannonBarrel) {
        this.cannonBarrel.position.z = -0.1; // Recoil backward
        setTimeout(() => {
          if (this.cannonBarrel) this.cannonBarrel.position.z = 0.2;
          if (onAttackCallback) onAttackCallback(this);
        }, 200);
      }
    }
  }

  getWorldPosition() {
    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    return pos;
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

/* ==========================================================
   MinionManager — Coordinates Wave Spawning & Combat
   ========================================================== */
export class MinionManager {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} effects
   */
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.minions = [];
    this.projectiles = [];

    this.waveNumber = 0;
    this.waveTimer = 3.5; // First wave spawns after 3.5s
    this.waveInterval = 14.0; // Next wave every 14 seconds
    this.isWaveActive = false;

    this.onPlayerHit = null; // Callback when minion damages player
    this.onMinionKilled = null; // Callback when minion dies
    this.onWaveSpawned = null; // Callback when new wave starts
  }

  spawnWave() {
    this.waveNumber++;
    this.isWaveActive = true;

    // Spawn 3-4 minions in a tactical formation in front of the tower
    const spawnZ = -0.5;
    const waveSetup = [
      { type: 'melee',  x: -1.2, z: spawnZ },
      { type: 'melee',  x:  1.2, z: spawnZ },
      { type: 'ranged', x:  0.0, z: spawnZ - 1.2 }
    ];

    // Every 2nd wave includes a heavy Siege Cannon Minion
    if (this.waveNumber % 2 === 0) {
      waveSetup.push({ type: 'siege', x: 0.0, z: spawnZ - 2.2 });
    }

    waveSetup.forEach(cfg => {
      const minion = new Minion(this.scene, cfg.type, new THREE.Vector3(cfg.x, -1.85, cfg.z), this.waveNumber);
      this.minions.push(minion);
    });

    if (this.onWaveSpawned) {
      this.onWaveSpawned(this.waveNumber, this.minions.length);
    }
  }

  update(dt, playerPos) {
    // 1. Wave Spawner Timer
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.waveTimer = this.waveInterval;
      this.spawnWave();
    }

    // 2. Update Active Minions
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const minion = this.minions[i];

      if (minion.isDead) {
        // Create Death Debris & Gold Reward
        const pos = minion.getWorldPosition();
        if (this.effects) {
          this.effects.createHitParticles(pos, '#ff4400', 25, true, 'heavy');
        }
        if (this.onMinionKilled) {
          this.onMinionKilled(minion);
        }
        minion.destroy();
        this.minions.splice(i, 1);
        continue;
      }

      minion.update(dt, playerPos, (m) => this._handleMinionAttack(m));
    }

    // 3. Update Minion Projectiles flying towards player
    this._updateProjectiles(dt);
  }

  _handleMinionAttack(minion) {
    const startPos = minion.getWorldPosition();
    startPos.y += 0.8;
    const targetPos = new THREE.Vector3(0, 1.0, 7.8);

    if (minion.type === 'melee') {
      // Immediate melee slash impact
      if (this.onPlayerHit) {
        this.onPlayerHit(minion.attackDamage, 'melee');
      }
    } else if (minion.type === 'ranged') {
      // Magic Energy Ball Projectile
      this._createMinionProjectile(startPos, targetPos, minion.attackDamage, 'magic', 0xff00bb);
    } else if (minion.type === 'siege') {
      // Heavy Cannon Mortar Shell
      this._createMinionProjectile(startPos, targetPos, minion.attackDamage, 'cannon', 0xff7700);
    }
  }

  _createMinionProjectile(startPos, targetPos, dmg, type, colorHex) {
    const geo = new THREE.SphereGeometry(type === 'cannon' ? 0.22 : 0.14, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 2.5
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      startPos: startPos.clone(),
      targetPos: targetPos.clone(),
      progress: 0,
      speed: type === 'cannon' ? 1.6 : 2.2,
      damage: dmg,
      type
    });
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.progress += dt * p.speed;

      if (p.progress >= 1.0) {
        // Projectile Arrived at Player
        if (this.onPlayerHit) {
          this.onPlayerHit(p.damage, p.type);
        }
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      } else {
        // Linear & Arc interpolation
        p.mesh.position.lerpVectors(p.startPos, p.targetPos, p.progress);
        if (p.type === 'cannon') {
          // Arc trajectory
          p.mesh.position.y += Math.sin(p.progress * Math.PI) * 1.5;
        }
      }
    }
  }

  /**
   * Apply Hero Skill / Attack Damage to Minions
   * @param {number} damage
   * @param {boolean} isAOE
   * @param {number} hitRadius
   * @returns {{ hitMinions: Minion[], totalDamage: number, killedCount: number }}
   */
  damageMinions(damage, isAOE = false, hitRadius = 2.5) {
    const results = {
      hitMinions: [],
      totalDamage: 0,
      killedCount: 0
    };

    if (this.minions.length === 0) return results;

    if (isAOE) {
      // Hit all active minions in formation with full/splash skill damage
      this.minions.forEach(m => {
        if (!m.isDead) {
          m.takeDamage(damage);
          results.hitMinions.push(m);
          results.totalDamage += damage;
          if (m.isDead) results.killedCount++;
        }
      });
    } else {
      // Single Target: Hit the closest active minion in the frontline
      let closest = null;
      let maxZ = -999;
      this.minions.forEach(m => {
        if (!m.isDead && m.group.position.z > maxZ) {
          maxZ = m.group.position.z;
          closest = m;
        }
      });

      if (closest) {
        closest.takeDamage(damage);
        results.hitMinions.push(closest);
        results.totalDamage += damage;
        if (closest.isDead) results.killedCount++;
      }
    }

    return results;
  }

  /**
   * Ultimate Skill Screen Wipe
   * @param {number} damage
   */
  damageAllMinions(damage) {
    return this.damageMinions(damage, true, 99);
  }

  getActiveCount() {
    return this.minions.filter(m => !m.isDead).length;
  }

  clearAll() {
    this.minions.forEach(m => m.destroy());
    this.minions = [];
    this.projectiles.forEach(p => this.scene.remove(p.mesh));
    this.projectiles = [];
    this.waveNumber = 0;
    this.waveTimer = 3.5;
  }
}
