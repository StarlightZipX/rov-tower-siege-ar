/**
 * tower.js — Procedural 3D Tower with high-fidelity realistic model
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
    this.crystalLight = null;
    this.rings = [];
    this.time = 0;

    this._buildTower();
    this.group.position.set(0, -2.2, 0);
    this.scene.add(this.group);
  }

  _addPart(geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.parts.push(mesh);
    return mesh;
  }

  _buildTower() {
    // Materials
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4e59, roughness: 0.9, metalness: 0.1 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x2b2d36, roughness: 0.9, metalness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.8 });
    const crystalMat = new THREE.MeshStandardMaterial({ 
      color: 0x00ffcc, emissive: 0x0088ff, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.9, roughness: 0.1, metalness: 0.1
    });

    // 1. Base (Octagon)
    this._addPart(new THREE.CylinderGeometry(1.8, 2.2, 0.5, 8), darkStoneMat.clone(), 0, 0.25, 0);

    // 2. Second Tier (Octagon)
    this._addPart(new THREE.CylinderGeometry(1.5, 1.8, 0.4, 8), stoneMat.clone(), 0, 0.7, 0);

    // 3. Main Pillar
    this._addPart(new THREE.CylinderGeometry(1.2, 1.4, 2.5, 8), stoneMat.clone(), 0, 2.15, 0);

    // 4. 4 Mini Support Pillars
    for(let i=0; i<4; i++) {
      const angle = (i * Math.PI) / 2;
      const x = Math.cos(angle) * 1.3;
      const z = Math.sin(angle) * 1.3;
      this._addPart(new THREE.CylinderGeometry(0.2, 0.2, 3.2, 6), darkStoneMat.clone(), x, 2.15, z);
      // Caps
      const cap = this._addPart(new THREE.SphereGeometry(0.25, 8, 8), goldMat.clone(), x, 3.75, z);
    }

    // 5. Top Platform
    this._addPart(new THREE.CylinderGeometry(1.6, 1.2, 0.3, 8), darkStoneMat.clone(), 0, 3.55, 0);
    
    // Gold Trim
    const topTrim = this._addPart(new THREE.TorusGeometry(1.6, 0.1, 8, 24), goldMat.clone(), 0, 3.55, 0);
    topTrim.rotation.x = Math.PI / 2;

    // 6. Floating Crystal Core
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), crystalMat);
    this.crystal.position.y = 4.8;
    this.group.add(this.crystal);

    // Crystal Light
    this.crystalLight = new THREE.PointLight(0x00ccff, 3, 5);
    this.crystal.add(this.crystalLight);

    // 7. Orbiting Rings
    this.rings = [];
    for(let i=1; i<=2; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1 + (i*0.3), 0.05, 8, 32), goldMat.clone());
      ring.position.y = 4.8;
      this.group.add(ring);
      this.rings.push(ring);
    }

    // Store original colors for damage effect
    this.parts.forEach(p => this.originalColors.push(p.material.color.clone()));
  }

  takeDamage(amount) {
    if (this.destroyed) return this.currentHP;
    this.currentHP = Math.max(0, this.currentHP - amount);
    this.shakeIntensity = 0.35;
    this._updateDamageVisuals();
    if (this.currentHP <= 0) this.destroyed = true;
    return this.currentHP;
  }

  _updateDamageVisuals() {
    const pct = this.currentHP / this.maxHP;
    const damageCol = new THREE.Color();

    this.parts.forEach((part, i) => {
      const orig = this.originalColors[i];
      if (pct > 0.75) {
        part.material.color.copy(orig);
      } else if (pct > 0.5) {
        damageCol.set(0x8b4513);
        part.material.color.copy(orig).lerp(damageCol, 0.3);
      } else if (pct > 0.25) {
        damageCol.set(0x4a1a00);
        part.material.color.copy(orig).lerp(damageCol, 0.55);
      } else {
        damageCol.set(0x2a0a00);
        part.material.color.copy(orig).lerp(damageCol, 0.8);
      }
    });

    if (this.crystal) {
      const cm = this.crystal.material;
      if (pct > 0.5) {
        cm.emissive.set(0x0088ff);
        this.crystalLight.color.set(0x00ccff);
      } else if (pct > 0.25) {
        cm.emissive.set(0xff6600);
        this.crystalLight.color.set(0xff6600);
      } else {
        cm.emissive.set(0xff0000);
        this.crystalLight.color.set(0xff0000);
      }
      cm.emissiveIntensity = 0.5 + (1 - pct) * 1.8;
    }
  }

  getExplosionParts() {
    const debris = [];
    for (let i = 0; i < 40; i++) {
      const s = 0.2 + Math.random() * 0.4;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.07 + Math.random() * 0.05, 0.5, 0.25 + Math.random() * 0.3),
        roughness: 0.7
      });
      const piece = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat);
      piece.position.set(
        this.group.position.x + (Math.random() - 0.5) * 2,
        this.group.position.y + 1 + Math.random() * 4,
        this.group.position.z + (Math.random() - 0.5) * 2
      );
      piece.velocity = new THREE.Vector3((Math.random() - 0.5) * 15, Math.random() * 12 + 4, (Math.random() - 0.5) * 15);
      piece.rotationVelocity = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      debris.push(piece);
    }
    return debris;
  }

  update(dt) {
    this.time += dt;

    if (this.crystal) {
      this.crystal.rotation.y += dt * 1.5;
      this.crystal.position.y = 4.8 + Math.sin(this.time * 2) * 0.2;
    }
    
    if (this.rings.length === 2) {
      this.rings[0].rotation.x = Math.sin(this.time * 0.5) * 0.5;
      this.rings[0].rotation.y -= 1.0 * dt;
      
      this.rings[1].rotation.x = Math.cos(this.time * 0.5) * 0.5;
      this.rings[1].rotation.y += 1.2 * dt;
    }

    if (this.shakeIntensity > 0.008) {
      this.group.position.x = (Math.random() - 0.5) * this.shakeIntensity;
      this.group.position.z = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.group.position.x = 0;
      this.group.position.z = 0;
      this.shakeIntensity = 0;
    }

    const pct = this.currentHP / this.maxHP;
    if (pct > 0 && pct < 0.25) {
      this.group.position.x += (Math.random() - 0.5) * 0.06;
      this.group.position.z += (Math.random() - 0.5) * 0.06;
    }
  }

  hide() { this.group.visible = false; }

  reset() {
    this.currentHP = this.maxHP;
    this.destroyed = false;
    this.shakeIntensity = 0;
    this.group.visible = true;
    this.group.position.set(0, -2.2, 0);
    this._updateDamageVisuals();
  }

  getHPPercent() { return this.currentHP / this.maxHP; }
  isDestroyed()  { return this.destroyed; }
}
