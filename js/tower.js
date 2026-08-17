/**
 * tower.js — AAA RoV Antaris Defense Tower (ป้อมปราการมนตรา Antaris)
 * High-fidelity 3D model with tiered fortress architecture, magitech gold armor,
 * multifaceted floating nexus crystal, orbiting arcane shards, and rotating runic glyph rings.
 */
import * as THREE from 'three';

export class Tower {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.maxHP = 5000;
    this.currentHP = 5000;
    this.destroyed = false;

    this.parts = [];
    this.originalColors = [];
    this.shakeIntensity = 0;
    this.shakeDecay = 0.92;

    this.crystal = null;
    this.crystalCore = null;
    this.crystalLight = null;
    this.orbitShards = [];
    this.runeRings = [];
    this.energyBeams = [];
    this.groundDecalMesh = null;
    this.time = 0;

    this._buildAAATower();
    this.group.scale.set(0.68, 0.68, 0.68);
    this.group.position.set(0, -1.9, 0);
    this.scene.add(this.group);
  }

  /* ----------------------------------------------------------
     Procedural Canvas Texture Generators for AAA Realism
     ---------------------------------------------------------- */
  _createGroundDecalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Soft Ambient Occlusion Contact Shadow
    const shadowGrad = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    shadowGrad.addColorStop(0.5, 'rgba(5, 10, 25, 0.65)');
    shadowGrad.addColorStop(0.85, 'rgba(0, 200, 255, 0.15)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Glowing Antaris Gold & Arcane Magic Circle
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.7)';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ffbb00';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(256, 256, 210, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 220, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(256, 256, 175, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Ancient Runic Glyphs
    ctx.fillStyle = '#ffe680';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const runes = ['⚔️', '⚡', '🛡️', '✦', '᚛', '᚜', 'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ'];
    for (let i = 0; i < runes.length; i++) {
      const angle = (i / runes.length) * Math.PI * 2;
      const x = 256 + Math.cos(angle) * 192;
      const y = 256 + Math.sin(angle) * 192;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(runes[i], 0, 0);
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  _createStoneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base granite gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#1c1f2b');
    grad.addColorStop(0.5, '#282d3c');
    grad.addColorStop(1, '#151722');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Stone noise & grain
    for (let i = 0; i < 15000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const lum = Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgba(${lum + 30}, ${lum + 35}, ${lum + 50}, 0.15)`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Carved runic grooves
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.25)';
    ctx.lineWidth = 3;
    for (let i = 50; i < 512; i += 90) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 40, 256);
      ctx.lineTo(i, 512);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  _createRunicRingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 512);

    // Glowing circle
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(256, 256, 220, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 256, 180, 0, Math.PI * 2);
    ctx.stroke();

    // Runic Symbols around circumference
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const runes = ['᚛', '᚜', 'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛈ', 'ᛉ'];
    for (let i = 0; i < runes.length; i++) {
      const angle = (i / runes.length) * Math.PI * 2;
      const x = 256 + Math.cos(angle) * 200;
      const y = 256 + Math.sin(angle) * 200;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(runes[i], 0, 0);
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  _addPart(geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.parts.push(mesh);
    return mesh;
  }

  /* ----------------------------------------------------------
     Build Complete AAA Antaris Tower Architecture
     ---------------------------------------------------------- */
  _buildAAATower() {
    const stoneTex = this._createStoneTexture();

    // High-end PBR Materials
    const darkStoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0x222633,
      roughness: 0.75,
      metalness: 0.25
    });

    const lightStoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0x3d4358,
      roughness: 0.65,
      metalness: 0.35
    });

    const royalGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      roughness: 0.2,
      metalness: 0.92,
      emissive: 0x553300,
      emissiveIntensity: 0.35
    });

    const glowingRuneMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00c8ff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.1
    });

    // 0. Antaris Runic Ground Decal & Soft Shadow
    const groundTex = this._createGroundDecalTexture();
    const groundMat = new THREE.MeshBasicMaterial({
      map: groundTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.groundDecalMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), groundMat);
    this.groundDecalMesh.rotation.x = -Math.PI / 2;
    this.groundDecalMesh.position.y = 0.01;
    this.group.add(this.groundDecalMesh);

    // 1. Tier 1: Grand Foundation Plinth (Hexagonal Stepped Base)
    this._addPart(new THREE.CylinderGeometry(2.5, 2.9, 0.45, 6), darkStoneMat.clone(), 0, 0.22, 0);
    this._addPart(new THREE.CylinderGeometry(2.2, 2.55, 0.35, 6), lightStoneMat.clone(), 0, 0.62, 0);

    // Gold Foundation Inlay Rings
    const baseGoldRing = this._addPart(new THREE.TorusGeometry(2.35, 0.08, 12, 36), royalGoldMat.clone(), 0, 0.78, 0, Math.PI / 2);

    // 2. Tier 2: Pedestal Core with Arcane Runes
    this._addPart(new THREE.CylinderGeometry(1.8, 2.1, 0.6, 6), darkStoneMat.clone(), 0, 1.1, 0);

    // 3. Main Obelisk Monolith (Fluted Fortress Tower Shaft)
    this._addPart(new THREE.CylinderGeometry(1.35, 1.65, 2.6, 8), lightStoneMat.clone(), 0, 2.7, 0);
    this._addPart(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 8), darkStoneMat.clone(), 0, 2.7, 0, 0, Math.PI / 8);

    // 4. Four Royal Winged Buttresses (Heavy Armor Brackets)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const x = Math.cos(angle) * 1.55;
      const z = Math.sin(angle) * 1.55;

      // Outer Support Pillar
      this._addPart(new THREE.BoxGeometry(0.35, 2.8, 0.55), darkStoneMat.clone(), x, 2.6, z, 0, -angle, 0);

      // Gold Armor Flanges
      this._addPart(new THREE.BoxGeometry(0.18, 2.2, 0.35), royalGoldMat.clone(), x * 1.12, 2.6, z * 1.12, 0, -angle, 0);

      // Glowing Arcane Conduit in center of each buttress
      this._addPart(new THREE.BoxGeometry(0.08, 2.0, 0.12), glowingRuneMat.clone(), x * 1.18, 2.6, z * 1.18, 0, -angle, 0);

      // Buttress Top Finial Crest (Eagle / Lion Crown)
      this._addPart(new THREE.ConeGeometry(0.28, 0.65, 4), royalGoldMat.clone(), x, 4.3, z, 0, angle + Math.PI / 4, 0);
    }

    // 5. Upper Fortress Platform (Crenellated Defense Gallery)
    this._addPart(new THREE.CylinderGeometry(1.9, 1.35, 0.5, 8), darkStoneMat.clone(), 0, 4.25, 0);
    this._addPart(new THREE.CylinderGeometry(1.95, 1.9, 0.25, 8), royalGoldMat.clone(), 0, 4.6, 0);

    // 8 Crenellations / Battlements around the platform
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const bx = Math.cos(angle) * 1.85;
      const bz = Math.sin(angle) * 1.85;
      this._addPart(new THREE.BoxGeometry(0.35, 0.45, 0.25), darkStoneMat.clone(), bx, 4.85, bz, 0, -angle, 0);
      this._addPart(new THREE.ConeGeometry(0.18, 0.25, 4), royalGoldMat.clone(), bx, 5.15, bz, 0, angle, 0);
    }

    // Pedestal Focus Brazier
    this._addPart(new THREE.CylinderGeometry(1.1, 0.8, 0.3, 8), darkStoneMat.clone(), 0, 4.85, 0);
    this._addPart(new THREE.TorusGeometry(1.05, 0.08, 12, 32), glowingRuneMat.clone(), 0, 5.0, 0, Math.PI / 2);

    // 6. Prismatic Floating Nexus Core (Multifaceted Double-Apex Crystal)
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f7ff,
      emissive: 0x0099ff,
      emissiveIntensity: 2.2,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92
    });

    const crystalCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });

    // Outer Faceted Crystal
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), crystalMat);
    this.crystal.position.set(0, 6.3, 0);
    this.crystal.scale.set(1, 1.45, 1);
    this.group.add(this.crystal);

    // Inner Glowing Core (Pure white energy)
    this.crystalCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), crystalCoreMat);
    this.crystal.add(this.crystalCore);

    // Intense Dynamic PointLight
    this.crystalLight = new THREE.PointLight(0x00f0ff, 4.5, 8, 1.5);
    this.crystal.add(this.crystalLight);

    // 7. Six Orbiting Floating Guardian Shards
    this.orbitShards = [];
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0088ff,
      emissiveIntensity: 2.0,
      roughness: 0.1,
      metalness: 0.2
    });

    for (let i = 0; i < 6; i++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), shardMat.clone());
      shard.scale.set(0.6, 1.6, 0.6);
      this.group.add(shard);
      this.orbitShards.push({
        mesh: shard,
        radius: 1.45,
        speed: 1.2 + (i % 2 === 0 ? 0.3 : -0.2),
        phase: (i * Math.PI) / 3,
        yOffset: (i % 2 === 0 ? 0.25 : -0.25)
      });
    }

    // 8. Dynamic Orbiting Rune Rings (Authentic RoV Magic Runes)
    const runeTex = this._createRunicRingTexture();
    const runeRingMat = new THREE.MeshBasicMaterial({
      map: runeTex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    // Ring 1 (Horizontal Halo)
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.75, 48), runeRingMat.clone());
    ring1.position.set(0, 6.3, 0);
    ring1.rotation.x = Math.PI / 2;
    this.group.add(ring1);
    this.runeRings.push({ mesh: ring1, rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0.8 });

    // Ring 2 (Tilted Orbiting Sphere Ring)
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 48), runeRingMat.clone());
    ring2.position.set(0, 6.3, 0);
    ring2.rotation.x = Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    this.group.add(ring2);
    this.runeRings.push({ mesh: ring2, rotSpeedX: 0.4, rotSpeedY: -0.6, rotSpeedZ: 0.5 });

    // Store original part colors for dynamic combat damage reaction
    this.parts.forEach(p => this.originalColors.push(p.material.color.clone()));
  }

  /* ----------------------------------------------------------
     Combat Interaction & Damage Visuals
     ---------------------------------------------------------- */
  takeDamage(amount) {
    if (this.destroyed) return this.currentHP;
    this.currentHP = Math.max(0, this.currentHP - amount);
    this.shakeIntensity = 0.45;
    this._updateDamageVisuals();
    if (this.currentHP <= 0) this.destroyed = true;
    return this.currentHP;
  }

  _updateDamageVisuals() {
    const pct = this.currentHP / this.maxHP;
    const damageCol = new THREE.Color();

    // Tower stone and gold tarnishing / burning under siege
    this.parts.forEach((part, i) => {
      const orig = this.originalColors[i];
      if (pct > 0.75) {
        part.material.color.copy(orig);
      } else if (pct > 0.5) {
        damageCol.set(0x8b4513);
        part.material.color.copy(orig).lerp(damageCol, 0.35);
      } else if (pct > 0.25) {
        damageCol.set(0x4a1a00);
        part.material.color.copy(orig).lerp(damageCol, 0.6);
      } else {
        damageCol.set(0x2a0a00);
        part.material.color.copy(orig).lerp(damageCol, 0.85);
      }
    });

    // Nexus Crystal shifts energy color: Azure -> Amber -> Critical Crimson Overload
    if (this.crystal) {
      const cm = this.crystal.material;
      if (pct > 0.5) {
        cm.color.set(0x00f7ff);
        cm.emissive.set(0x0088ff);
        this.crystalLight.color.set(0x00f0ff);
      } else if (pct > 0.25) {
        cm.color.set(0xffaa00);
        cm.emissive.set(0xff5500);
        this.crystalLight.color.set(0xff7700);
      } else {
        cm.color.set(0xff2200);
        cm.emissive.set(0xff0000);
        this.crystalLight.color.set(0xff0000);
      }
      cm.emissiveIntensity = 1.5 + (1 - pct) * 2.5;
    }
  }

  getExplosionParts() {
    const debris = [];
    for (let i = 0; i < 60; i++) {
      const s = 0.12 + Math.random() * 0.28;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.06 + Math.random() * 0.08, 0.7, 0.2 + Math.random() * 0.4),
        roughness: 0.6,
        metalness: 0.4
      });
      const piece = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
      piece.position.set(
        this.group.position.x + (Math.random() - 0.5) * 1.8,
        this.group.position.y + 0.5 + Math.random() * 3.0,
        this.group.position.z + (Math.random() - 0.5) * 1.8
      );
      piece.velocity = new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 10 + 4, (Math.random() - 0.5) * 12);
      piece.rotationVelocity = new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
      debris.push(piece);
    }
    return debris;
  }

  /* ----------------------------------------------------------
     Frame Update Animations
     ---------------------------------------------------------- */
  update(dt) {
    this.time += dt;

    // 1. Crystal core floating levitation & spin
    if (this.crystal) {
      this.crystal.rotation.y += dt * 1.8;
      this.crystal.rotation.z = Math.sin(this.time * 1.5) * 0.12;
      this.crystal.position.y = 6.3 + Math.sin(this.time * 2.2) * 0.18;

      // Inner core counter-rotation
      if (this.crystalCore) {
        this.crystalCore.rotation.y -= dt * 3.0;
        this.crystalCore.rotation.x += dt * 1.5;
      }
    }

    // 2. Orbiting satellite crystal shards
    this.orbitShards.forEach(s => {
      const angle = this.time * s.speed + s.phase;
      s.mesh.position.set(
        Math.cos(angle) * s.radius,
        6.3 + s.yOffset + Math.sin(this.time * 3 + s.phase) * 0.2,
        Math.sin(angle) * s.radius
      );
      s.mesh.rotation.y += dt * 3.0;
      s.mesh.rotation.x += dt * 2.0;
    });

    // 3. Rotating Arcane Rune Rings
    this.runeRings.forEach(r => {
      r.mesh.rotation.z += r.rotSpeedZ * dt;
      if (r.rotSpeedX) r.mesh.rotation.x += r.rotSpeedX * dt;
      if (r.rotSpeedY) r.mesh.rotation.y += r.rotSpeedY * dt;
      r.mesh.position.y = 6.3 + Math.sin(this.time * 2.2) * 0.18;
    });

    // 4. Ground Decal Gentle Rotation
    if (this.groundDecalMesh) {
      this.groundDecalMesh.rotation.z += dt * 0.15;
    }

    // 5. Hit Shake decay
    if (this.shakeIntensity > 0.008) {
      this.group.position.x = (Math.random() - 0.5) * this.shakeIntensity;
      this.group.position.z = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.group.position.x = 0;
      this.group.position.z = 0;
      this.shakeIntensity = 0;
    }

    // Critical low health tremor
    const pct = this.currentHP / this.maxHP;
    if (pct > 0 && pct < 0.25) {
      this.group.position.x += (Math.random() - 0.5) * 0.08;
      this.group.position.z += (Math.random() - 0.5) * 0.08;
    }
  }

  hide() { this.group.visible = false; }

  reset() {
    this.currentHP = this.maxHP;
    this.destroyed = false;
    this.shakeIntensity = 0;
    this.group.visible = true;
    this.parts.forEach((part, i) => part.material.color.copy(this.originalColors[i]));
    if (this.crystal) {
      this.crystal.material.color.set(0x00f7ff);
      this.crystal.material.emissive.set(0x0088ff);
      this.crystalLight.color.set(0x00f0ff);
    }
  }

  setTargeting(isTargeting) {
    if (!this.crystal || !this.crystalLight) return;
    if (isTargeting) {
      this.crystal.material.color.set(0xff0044);
      this.crystal.material.emissive.set(0xff0022);
      this.crystalLight.color.set(0xff0033);
      this.crystalLight.intensity = 18;
    } else {
      const pct = this.getHPPercent();
      if (pct > 0.5) {
        this.crystal.material.color.set(0x00f7ff);
        this.crystal.material.emissive.set(0x0088ff);
        this.crystalLight.color.set(0x00f0ff);
      } else {
        this.crystal.material.color.set(0xff7700);
        this.crystal.material.emissive.set(0xff3300);
        this.crystalLight.color.set(0xff5500);
      }
      this.crystalLight.intensity = 8;
    }
  }

  getCrystalWorldPosition() {
    const pos = new THREE.Vector3();
    if (this.crystal) {
      this.crystal.getWorldPosition(pos);
    } else {
      pos.set(this.group.position.x, this.group.position.y + 3.2, this.group.position.z);
    }
    return pos;
  }

  getHPPercent() {
    return this.currentHP / this.maxHP;
  }

  isDestroyed() {
    return this.destroyed || this.currentHP <= 0;
  }
}
