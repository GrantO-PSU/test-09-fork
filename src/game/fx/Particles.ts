import { Actor, Color, Font, Text, vec, type Scene } from 'excalibur';
import { clamp } from '../util/math';

interface Particle {
  actor: Actor;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  gravity: number;
  startOpacity: number;
  shrink: boolean;
}

interface FloatingText {
  actor: Actor;
  vy: number;
  life: number;
  maxLife: number;
  startOpacity: number;
}

const EMBER = ['#d04030', '#e06040', '#c03020'];
const DARK = ['#1a1a28', '#2a2a3a', '#0e0e18'];

export class ParticleSystem {
  private particles: Particle[] = [];
  private texts: FloatingText[] = [];

  constructor(private readonly scene: Scene) {}

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.actor); p.actor.kill(); this.particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.actor.pos = vec(p.actor.pos.x + p.vx * dt, p.actor.pos.y + p.vy * dt);
      p.actor.graphics.opacity = p.startOpacity * clamp(p.life / p.maxLife, 0, 1);
      if (p.shrink) { const s = 0.5 + clamp(p.life / p.maxLife, 0, 1) * 0.5; p.actor.scale = vec(s, s); }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i]!;
      t.life -= dt;
      if (t.life <= 0) { this.scene.remove(t.actor); t.actor.kill(); this.texts.splice(i, 1); continue; }
      const progress = t.life / t.maxLife;
      t.actor.pos = vec(t.actor.pos.x, t.actor.pos.y + t.vy * dt);
      t.actor.graphics.opacity = t.startOpacity * clamp(progress * 2, 0, 1);
      const scale = 1 + (1 - progress) * 0.18;
      t.actor.scale = vec(scale, scale);
    }
  }

  clear(): void {
    for (const p of this.particles) { this.scene.remove(p.actor); p.actor.kill(); }
    for (const t of this.texts) { this.scene.remove(t.actor); t.actor.kill(); }
    this.particles = []; this.texts = [];
  }

  hitSpark(x: number, y: number, color = '#c0c0e0'): void {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 110 + Math.random() * 240;
      this.add({
        x, y, width: 5 + Math.random() * 9, height: 1.6, rotation: angle,
        color: i % 3 === 0 ? '#ffffff' : color,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        gravity: 210, life: 0.14 + Math.random() * 0.16, opacity: 0.95, shrink: false, z: 32,
      });
    }
  }

  parryFlash(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      this.add({
        x, y, radius: 1.5 + Math.random() * 2.2,
        color: i % 2 === 0 ? '#a0c0ff' : '#ffffff',
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        gravity: 100, life: 0.2 + Math.random() * 0.2, opacity: 0.9, shrink: true, z: 33,
      });
    }
  }

  enemyDeathBurst(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 150;
      this.add({
        x, y, radius: 1.8 + Math.random() * 2.8,
        color: pick(DARK),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80,
        gravity: 380, life: 0.45 + Math.random() * 0.5, opacity: 0.85, shrink: true, z: 24,
      });
    }
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 120;
      this.add({
        x, y, radius: 1.5 + Math.random() * 2,
        color: pick(EMBER),
        vx: Math.cos(angle) * speed, vy: -40 - Math.random() * 100,
        gravity: -20, life: 0.5 + Math.random() * 0.4, opacity: 0.8, shrink: true, z: 33,
      });
    }
  }

  landDust(x: number, y: number, impact: number): void {
    const count = clamp(Math.round(impact / 90), 3, 10);
    for (let i = 0; i < count; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 18, y: y - 2, radius: 1.8 + Math.random() * 2.4,
        color: pick(DARK),
        vx: (Math.random() - 0.5) * 150, vy: -25 - Math.random() * 95,
        gravity: 280, life: 0.28 + Math.random() * 0.26, opacity: 0.5, shrink: true, z: 18,
      });
    }
  }

  jumpDust(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 14, y: y - 1, radius: 1.6 + Math.random() * 2,
        color: pick(DARK),
        vx: (Math.random() - 0.5) * 90, vy: -10 - Math.random() * 45,
        gravity: 220, life: 0.22 + Math.random() * 0.2, opacity: 0.4, shrink: true, z: 18,
      });
    }
  }

  damageNumber(x: number, y: number, text: string, color = '#e0c8a0'): void {
    const font = new Font({
      family: 'monospace', size: 17, bold: true, color: Color.fromHex(color),
    });
    font.shadow = { blur: 4, offset: vec(0, 2), color: Color.fromHex('#000000') };
    const actor = new Actor({ x: x + (Math.random() - 0.5) * 10, y, z: 40 });
    actor.graphics.add(new Text({ text, font }));
    this.scene.add(actor);
    this.texts.push({ actor, vy: -38, life: 0.72, maxLife: 0.72, startOpacity: 1 });
  }

  scrollDamageEffect(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 10,
        radius: 1.5 + Math.random() * 2,
        color: pick(EMBER),
        vx: -50 - Math.random() * 80, vy: (Math.random() - 0.5) * 40,
        gravity: 80, life: 0.3 + Math.random() * 0.3, opacity: 0.7, shrink: true, z: 25,
      });
    }
  }

  private add(options: {
    x: number; y: number; radius?: number; width?: number; height?: number;
    rotation?: number; color: string;
    vx: number; vy: number; gravity: number; life: number;
    opacity: number; shrink: boolean; z: number;
  }): void {
    const shared = {
      x: options.x, y: options.y, color: Color.fromHex(options.color),
      anchor: vec(0.5, 0.5), z: options.z, opacity: options.opacity, rotation: options.rotation,
    };
    const actor = options.radius !== undefined
      ? new Actor({ ...shared, radius: options.radius })
      : new Actor({ ...shared, width: options.width ?? 2, height: options.height ?? 2 });
    this.scene.add(actor);
    this.particles.push({
      actor, vx: options.vx, vy: options.vy, life: options.life, maxLife: options.life,
      gravity: options.gravity, startOpacity: options.opacity, shrink: options.shrink,
    });
  }
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}