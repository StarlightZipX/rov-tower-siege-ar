/**
 * effects.js — Particle effects, explosions, smoke & fire
 */
import * as THREE from 'three';

export class EffectsManager {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene;
    /** @type {{ mesh: THREE.Mesh, velocity: THREE.Vector3, life: number, decay: number, growRate?: number }[]} */
    this.particles = [];
    /** @type {{ mesh: THREE.Mesh, velocity: THREE.Vector3, rotVel: THREE.Vector3, life: number }[]} */
    this.debris = [];
    /** @type {{ type: string, light: THREE.PointLight, life: number, decay: number }[]} */
    this.activeEffects = [];
  }

  /* -------------------------------------------------- */
  /*  Hit particles                                      */
  /* -------------------------------------------------- */
  /**
   * Spray coloured particles from a position.
   * @param {THREE.Vector3} position
   * @param {string} color  CSS hex colour
   * @param {number} count
   */
  createHitParticles(position, color, count = 15) {
    const col = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const r = 0.04 + Math.random() * 0.07;
      const geo = new THREE.SphereGeometry(r, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        position.x + (Math.random() - 0.5) * 0.8,
        position.y + Math.random() * 3.5,
        position.z + (Math.random() - 0.5) * 0.8
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 5 + 1,
        (Math.random() - 0.5) * 4
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, life: 1, decay: 0.018 + Math.random() * 0.02 });
    }
  }

  /* -------------------------------------------------- */
  /*  Smoke                                              */
  /* -------------------------------------------------- */
  createSmokeParticles(position, count = 3) {
    for (let i = 0; i < count; i++) {
      const r = 0.12 + Math.random() * 0.22;
      const geo = new THREE.SphereGeometry(r, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.45 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        position.x + (Math.random() - 0.5) * 1.8,
        position.y + Math.random() * 4.5,
        position.z + (Math.random() - 0.5) * 1.8
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        0.6 + Math.random() * 0.6,
        (Math.random() - 0.5) * 0.35
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, life: 1, decay: 0.008, growRate: 1.015 });
    }
  }

  /* -------------------------------------------------- */
  /*  Fire                                               */
  /* -------------------------------------------------- */
  createFireParticles(position, count = 4) {
    for (let i = 0; i < count; i++) {
      const r = 0.06 + Math.random() * 0.1;
      const geo = new THREE.SphereGeometry(r, 6, 6);
      const hue = 0.02 + Math.random() * 0.08; // red-orange
      const col = new THREE.Color().setHSL(hue, 1, 0.5);
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        position.x + (Math.random() - 0.5) * 1.2,
        position.y + Math.random() * 3,
        position.z + (Math.random() - 0.5) * 1.2
      );
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        1.5 + Math.random() * 1.5,
        (Math.random() - 0.5) * 0.6
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, life: 1, decay: 0.025 + Math.random() * 0.015 });
    }
  }

  /* -------------------------------------------------- */
  /*  Explosion                                          */
  /* -------------------------------------------------- */
  /**
   * @param {THREE.Vector3} position
   * @param {THREE.Mesh[]} debrisPieces  from Tower.getExplosionParts()
   */
  createExplosion(position, debrisPieces) {
    // Debris
    debrisPieces.forEach(piece => {
      this.scene.add(piece);
      this.debris.push({
        mesh: piece,
        velocity: piece.velocity,
        rotVel: piece.rotationVelocity,
        life: 1
      });
    });

    // Flash light
    const flash = new THREE.PointLight(0xffaa00, 12, 18);
    flash.position.set(position.x, position.y + 2, position.z);
    this.scene.add(flash);
    this.activeEffects.push({ type: 'flash', light: flash, life: 1, decay: 0.025 });

    // Massive particle burst
    this.createHitParticles(position, '#ff6600', 50);
    this.createHitParticles(position, '#ffcc00', 35);
    this.createHitParticles(position, '#ff2200', 25);
  }

  /* -------------------------------------------------- */
  /*  Per-frame update                                   */
  /* -------------------------------------------------- */
  update(dt) {
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 5 * dt;          // gravity
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

    // Debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.mesh.position.addScaledVector(d.velocity, dt);
      d.velocity.y -= 9.8 * dt;
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

    // Active effects (flash lights, etc.)
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const e = this.activeEffects[i];
      e.life -= e.decay;
      if (e.type === 'flash') e.light.intensity = e.life * 12;

      if (e.life <= 0) {
        if (e.light) this.scene.remove(e.light);
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
    }
    this.particles = [];
    this.debris = [];
    this.activeEffects = [];
  }
}
