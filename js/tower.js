/**
 * tower.js — Procedural 3D Tower with HP & destruction system
 */
import * as THREE from 'three';

export class Tower {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.maxHP = 1000;
    this.currentHP = 1000;
    this.destroyed = false;

    /** @type {THREE.Mesh[]} */
    this.parts = [];
    /** @type {THREE.Color[]} */
    this.originalColors = [];
    this.shakeIntensity = 0;
    this.shakeDecay = 0.92;

    this.crystal = null;
    this.crystalLight = null;

    this._buildTower();
    this.scene.add(this.group);
  }

  /* -------------------------------------------------- */
  /*  Build                                              */
  /* -------------------------------------------------- */
  _buildTower() {
    const mats = {
      stone:   new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.75, metalness: 0.2 }),
      stoneD:  new THREE.MeshStandardMaterial({ color: 0x3d3d4d, roughness: 0.80, metalness: 0.15 }),
      gold:    new THREE.MeshStandardMaterial({ color: 0xc9a44c, roughness: 0.30, metalness: 0.85 }),
      top:     new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.50, metalness: 0.4 }),
      crystal: new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        emissive: 0x0066ff,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.9
      })
    };

    // 1. Base platform
    this._addPart(new THREE.CylinderGeometry(1.8, 2.0, 0.3, 8), mats.stoneD.clone(), 0, 0.15, 0);

    // 2. Base cylinder
    this._addPart(new THREE.CylinderGeometry(1.2, 1.5, 1.0, 8), mats.stone.clone(), 0, 0.8, 0);

    // 3. Gold ring (lower)
    const ring1 = this._addPart(new THREE.TorusGeometry(1.3, 0.07, 8, 24), mats.gold.clone(), 0, 1.3, 0);
    ring1.rotation.x = Math.PI / 2;

    // 4. Main body (hexagonal prism)
    this._addPart(new THREE.CylinderGeometry(1.0, 1.2, 2.5, 6), mats.stone.clone(), 0, 2.55, 0);

    // 5. Gold ring (upper)
    const ring2 = this._addPart(new THREE.TorusGeometry(1.05, 0.06, 8, 24), mats.gold.clone(), 0, 3.8, 0);
    ring2.rotation.x = Math.PI / 2;

    // 6. Top cone / spire
    this._addPart(new THREE.ConeGeometry(0.8, 1.5, 6), mats.top.clone(), 0, 4.55, 0);

    // 7. Crystal
    this.crystal = this._addPart(new THREE.OctahedronGeometry(0.3, 0), mats.crystal, 0, 5.5, 0);

    // 8. Crystal point light
    this.crystalLight = new THREE.PointLight(0x00aaff, 2, 6);
    this.crystalLight.position.set(0, 5.5, 0);
    this.group.add(this.crystalLight);

    // Store original colours for damage colouring
    this.parts.forEach(p => this.originalColors.push(p.material.color.clone()));

    // Position entire group
    this.group.position.set(0, -2.2, 0);
  }

  /**
   * Helper: create mesh, position it, add to group, track it.
   * @returns {THREE.Mesh}
   */
  _addPart(geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.parts.push(mesh);
    return mesh;
  }

  /* -------------------------------------------------- */
  /*  Damage                                             */
  /* -------------------------------------------------- */
  /**
   * @param {number} amount
   * @returns {number} remaining HP
   */
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

    // Crystal colour shift
    if (this.crystal) {
      const cm = this.crystal.material;
      if (pct > 0.5) {
        cm.emissive.set(0x0066ff);
        this.crystalLight.color.set(0x00aaff);
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

  /* -------------------------------------------------- */
  /*  Explosion debris                                   */
  /* -------------------------------------------------- */
  getExplosionParts() {
    const debris = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      const s = 0.1 + Math.random() * 0.35;
      const geo = new THREE.BoxGeometry(s, s, s);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.07 + Math.random() * 0.05, 0.5, 0.25 + Math.random() * 0.3),
        roughness: 0.7
      });
      const piece = new THREE.Mesh(geo, mat);
      // Spread around tower centre
      piece.position.set(
        this.group.position.x + (Math.random() - 0.5) * 1.5,
        this.group.position.y + Math.random() * 5,
        this.group.position.z + (Math.random() - 0.5) * 1.5
      );
      piece.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 10 + 3,
        (Math.random() - 0.5) * 10
      );
      piece.rotationVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      debris.push(piece);
    }
    return debris;
  }

  /* -------------------------------------------------- */
  /*  Update (per-frame)                                 */
  /* -------------------------------------------------- */
  update(dt) {
    // Crystal spin
    if (this.crystal) this.crystal.rotation.y += dt * 1.8;

    // Shake decay
    if (this.shakeIntensity > 0.008) {
      this.group.position.x = (Math.random() - 0.5) * this.shakeIntensity;
      this.group.position.z = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.group.position.x = 0;
      this.group.position.z = 0;
      this.shakeIntensity = 0;
    }

    // Low-HP idle shake
    const pct = this.currentHP / this.maxHP;
    if (pct > 0 && pct < 0.25) {
      this.group.position.x += (Math.random() - 0.5) * 0.06;
      this.group.position.z += (Math.random() - 0.5) * 0.06;
    }
  }

  /* -------------------------------------------------- */
  /*  Utilities                                          */
  /* -------------------------------------------------- */
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
