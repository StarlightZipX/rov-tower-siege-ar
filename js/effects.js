/**
 * effects.js — AAA RoV 2026 Particle Effects, Slash Trails, Shockwaves, Magic & Explosions
 */
import * as THREE from 'three';

export class EffectsManager {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    /** @type {{ mesh: THREE.Mesh, velocity: THREE.Vector3, life: number, decay: number, growRate?: number, rotVel?: THREE.Vector3, gravity?: number }[]} */
    this.particles = [];
    /** @type {{ mesh: THREE.Mesh, velocity: THREE.Vector3, rotVel: THREE.Vector3, life: number }[]} */
    this.debris = [];
    /** @type {{ type: string, light?: THREE.PointLight, mesh?: THREE.Mesh, life: number, decay: number, scaleRate?: number }[]} */
    this.activeEffects = [];
  }

  /* -------------------------------------------------- */
  /*  Hit Particles & Weapon FX (RoV 2026 In-Game FX)   */
  /* -------------------------------------------------- */
  createHitParticles(position, color, count = 18, isCrit = false, fxType = 'sword') {
    const col = new THREE.Color(color);
    const actualCount = isCrit ? Math.floor(count * 1.8) : count;

    // 1. Specialized archetype particle generation
    for (let i = 0; i < actualCount; i++) {
      let geo, mat, speed, gravity = 6.5;

      if (fxType === 'lightning') {
        // Jagged lightning streaks
        const length = 0.15 + Math.random() * 0.25;
        geo = new THREE.CylinderGeometry(0.015, 0.015, length, 4);
        mat = new THREE.MeshBasicMaterial({
          color: col.clone().offsetHSL(0, 0, 0.3),
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        });
        speed = isCrit ? (8 + Math.random() * 8) : (5 + Math.random() * 5);
        gravity = 1.0;
      } else if (fxType === 'fire') {
        // Flame droplets
        const r = 0.04 + Math.random() * 0.09;
        geo = new THREE.SphereGeometry(r, 6, 6);
        mat = new THREE.MeshBasicMaterial({
          color: col.clone().offsetHSL(Math.random() * 0.05, 0, 0.1),
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending
        });
        speed = 2.5 + Math.random() * 4.5;
        gravity = -2.5; // Fire floats up
      } else if (fxType === 'magic' || fxType === 'wind') {
        // Arcane orbs & stardust
        const r = 0.03 + Math.random() * 0.06;
        geo = new THREE.OctahedronGeometry(r, 0);
        mat = new THREE.MeshBasicMaterial({
          color: col.clone().offsetHSL(0, 0, 0.15),
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        });
        speed = 3.0 + Math.random() * 4.5;
        gravity = 1.5;
      } else if (fxType === 'gun' || fxType === 'heavy') {
        // Heavy impact shrapnel & sparks
        const r = 0.03 + Math.random() * 0.07;
        geo = new THREE.BoxGeometry(r, r, r);
        mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        });
        speed = isCrit ? 9 : 6;
        gravity = 9.8;
      } else if (fxType === 'bow' || fxType === 'spear') {
        // Needle streaks
        const l = 0.18 + Math.random() * 0.22;
        geo = new THREE.CylinderGeometry(0.01, 0.01, l, 4);
        mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        });
        speed = 7 + Math.random() * 6;
        gravity = 3.5;
      } else {
        // Default Sharp Steel/Blood Sparks
        const isSpark = Math.random() < 0.65;
        const r = isSpark ? (0.02 + Math.random() * 0.04) : (0.04 + Math.random() * 0.07);
        geo = isSpark ? new THREE.BoxGeometry(r, r * 3.5, r) : new THREE.SphereGeometry(r, 6, 6);
        mat = new THREE.MeshBasicMaterial({
          color: isSpark ? col.clone().offsetHSL(0, 0, 0.25) : col,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending
        });
        speed = isCrit ? (6 + Math.random() * 8) : (3.5 + Math.random() * 5);
        gravity = 6.0;
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        position.x + (Math.random() - 0.5) * 0.5,
        position.y + (Math.random() - 0.5) * 1.0,
        position.z + (Math.random() - 0.5) * 0.5
      );

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      const velocity = new THREE.Vector3(
        Math.cos(theta) * Math.cos(phi) * speed,
        Math.sin(phi) * speed + 1.5,
        Math.sin(theta) * Math.cos(phi) * speed
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        gravity,
        rotVel: new THREE.Vector3(Math.random() * 18, Math.random() * 18, Math.random() * 18),
        life: 1.0,
        decay: isCrit ? (0.022 + Math.random() * 0.02) : (0.035 + Math.random() * 0.025)
      });
    }

    // 2. Dynamic PointLight Flash
    const flashLight = new THREE.PointLight(col, isCrit ? 7.5 : 3.2, isCrit ? 6.5 : 4.0);
    flashLight.position.copy(position);
    this.scene.add(flashLight);
    this.activeEffects.push({ type: 'flash', light: flashLight, life: 1, decay: isCrit ? 0.07 : 0.14 });

    // 3. Shockwave ripple on critical or heavy strike
    if (isCrit || count > 20 || fxType === 'heavy') {
      this.createShockwave(position, color, isCrit ? 2.0 : 1.3);
    }
  }

  /* -------------------------------------------------- */
  /*  Shockwave Ring (RoV Arcane Impact Ripple)         */
  /* -------------------------------------------------- */
  createShockwave(position, color, maxScale = 1.5) {
    const geo = new THREE.RingGeometry(0.18, 0.42, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    mesh.rotation.y = (Math.random() - 0.5) * 0.3;

    this.scene.add(mesh);
    this.activeEffects.push({
      type: 'shockwave',
      mesh,
      life: 1.0,
      decay: 0.045,
      scaleRate: maxScale
    });
  }

  /* -------------------------------------------------- */
  /*  Smoke (Tower Damage Indicator)                     */
  /* -------------------------------------------------- */
  createSmokeParticles(position, count = 3) {
    for (let i = 0; i < count; i++) {
      const r = 0.14 + Math.random() * 0.22;
      const geo = new THREE.SphereGeometry(r, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0x333845, transparent: true, opacity: 0.5 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        position.x + (Math.random() - 0.5) * 1.5,
        position.y + Math.random() * 3.2,
        position.z + (Math.random() - 0.5) * 1.5
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        0.7 + Math.random() * 0.6,
        (Math.random() - 0.5) * 0.3
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, gravity: 0, life: 1, decay: 0.009, growRate: 1.018 });
    }
  }

  /* -------------------------------------------------- */
  /*  Fire & Sparks (Heavy Siege Damage)                */
  /* -------------------------------------------------- */
  createFireParticles(position, count = 4) {
    for (let i = 0; i < count; i++) {
      const r = 0.08 + Math.random() * 0.12;
      const geo = new THREE.SphereGeometry(r, 6, 6);
      const hue = 0.04 + Math.random() * 0.08;
      const col = new THREE.Color().setHSL(hue, 1, 0.55);
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        position.x + (Math.random() - 0.5) * 1.2,
        position.y + Math.random() * 2.5,
        position.z + (Math.random() - 0.5) * 1.2
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        1.6 + Math.random() * 1.8,
        (Math.random() - 0.5) * 0.5
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, gravity: -1.5, life: 1, decay: 0.028 + Math.random() * 0.015 });
    }
  }

  /* -------------------------------------------------- */
  /*  Explosion (Tower Destruction Climax)               */
  /* -------------------------------------------------- */
  createExplosion(position, debrisPieces) {
    debrisPieces.forEach(piece => {
      this.scene.add(piece);
      this.debris.push({
        mesh: piece,
        velocity: piece.velocity,
        rotVel: piece.rotationVelocity,
        life: 1
      });
    });

    const flash = new THREE.PointLight(0xffdd66, 16, 22);
    flash.position.set(position.x, position.y + 1.5, position.z);
    this.scene.add(flash);
    this.activeEffects.push({ type: 'flash', light: flash, life: 1, decay: 0.018 });

    this.createHitParticles(position, '#ff6600', 60, true, 'fire');
    this.createHitParticles(position, '#ffd700', 45, true, 'sword');
    this.createHitParticles(position, '#00e5ff', 35, true, 'magic');
    this.createShockwave(position, '#ffd700', 3.5);
    this.createShockwave(position, '#ff3300', 2.8);
  }

  /* -------------------------------------------------- */
  /*  Per-frame update                                   */
  /* -------------------------------------------------- */
  update(dt) {
    // 1. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.velocity, dt);
      const g = p.gravity !== undefined ? p.gravity : 6.5;
      p.velocity.y -= g * dt;
      p.velocity.multiplyScalar(0.98);

      if (p.rotVel) {
        p.mesh.rotation.x += p.rotVel.x * dt;
        p.mesh.rotation.y += p.rotVel.y * dt;
        p.mesh.rotation.z += p.rotVel.z * dt;
      }

      p.life -= p.decay;
      p.mesh.material.opacity = Math.max(0, p.life);
      if (p.growRate) p.mesh.scale.multiplyScalar(p.growRate);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    // 2. Debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.mesh.position.addScaledVector(d.velocity, dt);
      d.velocity.y -= 10.5 * dt;
      d.velocity.multiplyScalar(0.985);
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      d.mesh.rotation.z += d.rotVel.z * dt;
      d.life -= 0.008;

      if (d.life <= 0 || d.mesh.position.y < -15) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        this.debris.splice(i, 1);
      }
    }

    // 3. Active effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const e = this.activeEffects[i];
      e.life -= e.decay;

      if (e.type === 'flash' && e.light) {
        e.light.intensity = Math.max(0, e.life * 16);
      } else if (e.type === 'shockwave' && e.mesh) {
        const scale = 1 + (1 - e.life) * (e.scaleRate || 1.5);
        e.mesh.scale.set(scale, scale, scale);
        e.mesh.material.opacity = Math.max(0, e.life * 0.95);
      }

      if (e.life <= 0) {
        if (e.light) this.scene.remove(e.light);
        if (e.mesh) {
          this.scene.remove(e.mesh);
          e.mesh.geometry.dispose();
          e.mesh.material.dispose();
        }
        this.activeEffects.splice(i, 1);
      }
    }
  }

  /* -------------------------------------------------- */
  /*  Clean-up                                           */
  /* -------------------------------------------------- */
  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    for (const d of this.debris) {
      this.scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      d.mesh.material.dispose();
    }
    for (const e of this.activeEffects) {
      if (e.light) this.scene.remove(e.light);
      if (e.mesh) {
        this.scene.remove(e.mesh);
        e.mesh.geometry.dispose();
        e.mesh.material.dispose();
      }
    }
    this.particles = [];
    this.debris = [];
    this.activeEffects = [];
  }
}
