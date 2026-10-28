import { Canvas } from 'excalibur';
import type { HostileController } from './EnemyController';
import { damp } from '../util/math';

const W = 380;
const H = 300;

/**
 * The Moth Mother drawn procedurally with Canvas 2D: a huge dust-grey moth
 * with a furred thorax, feathery antennae, glowing eyespots and four torn
 * wings. Wings sweep wide on the telegraph and fold back into a dive.
 */
export class MothmanRig {
  readonly graphic: Canvas;

  private readonly controller: HostileController;
  private time = 0;
  private beatRate = 8;
  private flash = 0;

  constructor(controller: HostileController) {
    this.controller = controller;
    this.graphic = new Canvas({
      width: W,
      height: H,
      quality: 2,
      cache: false,
      draw: (ctx) => this.draw(ctx),
    });
  }

  update(dt: number, controller: HostileController): void {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    if (controller.state === 'hurt') this.flash = 1;

    const target = controller.state === 'attack'
      ? 26
      : controller.state === 'windup'
        ? 18
        : controller.state === 'recover'
          ? 12
          : 7;
    this.beatRate = damp(this.beatRate, target, 8, dt);
  }

  private draw(ctx: CanvasRenderingContext2D): void {
    const c = this.controller;
    ctx.clearRect(0, 0, W, H);

    const dead = c.state === 'dead';
    const diving = c.state === 'attack';
    const telegraph = c.state === 'windup';
    const hurt = c.state === 'hurt';

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(c.facing, 1);

    if (dead) {
      ctx.rotate(-1.05 * c.deathProgress);
      ctx.translate(0, 24 * c.deathProgress);
    } else if (hurt) {
      ctx.rotate(-0.1);
    }

    const beat = Math.sin(this.time * this.beatRate);
    const spread = diving ? 0.42 : telegraph ? 1.22 : 1;
    const lift = beat * (diving ? 0.12 : 0.3) * spread;

    // Telegraph aura
    if (telegraph) {
      const pulse = 0.5 + Math.sin(this.time * 18) * 0.5;
      const glow = ctx.createRadialGradient(0, -10, 10, 0, -10, 140);
      glow.addColorStop(0, `rgba(210, 70, 60, ${0.12 + pulse * 0.12})`);
      glow.addColorStop(1, 'rgba(210, 70, 60, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-170, -170, 340, 340);
    }

    // Far wing (behind the body, dimmer)
    this.drawWing(ctx, -1, spread * 0.96, lift, 0.5, telegraph);
    // Body
    this.drawBody(ctx, telegraph, diving, dead);
    // Near wing
    this.drawWing(ctx, 1, spread, lift, 0.92, telegraph);

    ctx.restore();

    if (this.flash > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(220, 120, 100, ${0.5 * this.flash})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  private drawWing(
    ctx: CanvasRenderingContext2D,
    side: 1 | -1,
    spread: number,
    lift: number,
    alpha: number,
    telegraph: boolean,
  ): void {
    const tip = 150 * spread;
    const rise = -64 - lift * 70;

    ctx.save();
    ctx.scale(side, 1);

    // Upper wing
    ctx.beginPath();
    ctx.moveTo(8, -14);
    ctx.bezierCurveTo(38, rise * 0.92, tip * 0.72, rise * 1.04, tip, -20);
    ctx.bezierCurveTo(tip * 0.99, 10, tip * 0.62, 44 + lift * 26, 34, 40);
    ctx.bezierCurveTo(17, 27, 9, 8, 8, -14);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, -60, tip, 40);
    grad.addColorStop(0, `rgba(46, 40, 34, ${0.95 * alpha})`);
    grad.addColorStop(0.55, `rgba(92, 80, 66, ${0.9 * alpha})`);
    grad.addColorStop(1, `rgba(140, 120, 98, ${0.72 * alpha})`);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = `rgba(196, 172, 146, ${0.22 * alpha})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Wing veins
    ctx.strokeStyle = `rgba(28, 24, 20, ${0.5 * alpha})`;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
      const t = 0.32 + i * 0.22;
      ctx.beginPath();
      ctx.moveTo(12, -6 + i * 6);
      ctx.quadraticCurveTo(tip * t * 0.8, rise * (0.5 - i * 0.12), tip * t, -14 + i * 26);
      ctx.stroke();
    }

    // Eyespot
    const ex = tip * 0.58;
    const ey = -6;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 15, 12, -0.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(26, 22, 20, ${0.55 * alpha})`;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ex, ey, 8.5, 6.5, -0.25, 0, Math.PI * 2);
    ctx.fillStyle = telegraph
      ? `rgba(220, 90, 70, ${0.85 * alpha})`
      : `rgba(198, 188, 140, ${0.6 * alpha})`;
    ctx.fill();

    ctx.restore();
  }

  private drawBody(
    ctx: CanvasRenderingContext2D,
    telegraph: boolean,
    diving: boolean,
    dead: boolean,
  ): void {
    // Fur halo
    ctx.fillStyle = 'rgba(120, 106, 88, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 40, 46, 0, 0, Math.PI * 2);
    ctx.fill();

    // Abdomen
    ctx.fillStyle = '#2e2822';
    ctx.beginPath();
    ctx.ellipse(0, 24, 21, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    // Segment bands
    ctx.strokeStyle = 'rgba(18, 15, 13, 0.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = 10 + i * 10;
      ctx.beginPath();
      ctx.arc(0, y, 20 - i * 2.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    // Fur tufts
    ctx.fillStyle = '#3a322a';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 19, 24 + Math.sin(a) * 30);
      ctx.lineTo(Math.cos(a) * 27, 24 + Math.sin(a) * 41);
      ctx.lineTo(Math.cos(a + 0.3) * 19, 24 + Math.sin(a + 0.3) * 30);
      ctx.closePath();
      ctx.fill();
    }

    // Thorax
    ctx.fillStyle = '#3a332b';
    ctx.beginPath();
    ctx.ellipse(0, -14, 26, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(90, 76, 60, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-6, -18, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#241f1a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x = -10 + i * 10;
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.quadraticCurveTo(x - 4, 26, x + (diving ? 6 : -2), 40);
      ctx.stroke();
    }

    // Head
    ctx.fillStyle = '#332c25';
    ctx.beginPath();
    ctx.ellipse(0, -48, 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = 'rgba(150, 132, 108, 0.85)';
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1] as const) {
      const bx = side * 5;
      const tx = side * 34;
      ctx.beginPath();
      ctx.moveTo(bx, -58);
      ctx.quadraticCurveTo(side * 24, -82, tx, -96);
      ctx.stroke();
      // feathery barbs
      ctx.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        const t = i / 6;
        const px = bx + (tx - bx) * t;
        const py = -58 + (-38) * t - Math.sin(t * Math.PI) * 6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + side * 7, py - 5);
        ctx.stroke();
      }
      ctx.lineWidth = 1.6;
    }

    // Eyes — big glowing lamps
    const eyeColor = telegraph ? '#ff9a80' : dead ? '#4a3a28' : '#d9e6b8';
    for (const side of [-1, 1] as const) {
      const ex = side * 8;
      const eyeGlow = ctx.createRadialGradient(ex, -49, 1, ex, -49, 11);
      eyeGlow.addColorStop(0, eyeColor);
      eyeGlow.addColorStop(0.45, telegraph ? 'rgba(220, 70, 50, 0.75)' : 'rgba(140, 170, 96, 0.6)');
      eyeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = eyeGlow;
      ctx.beginPath();
      ctx.arc(ex, -49, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = dead ? '#2a2118' : '#1a1612';
      ctx.beginPath();
      ctx.ellipse(ex, -49, 5.5, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!dead) {
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(ex, -50, 3.2, 4.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Fuzzy collar between head and thorax
    ctx.fillStyle = 'rgba(108, 92, 72, 0.7)';
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 18, -34 + Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 25, -30 + Math.sin(a) * 13);
      ctx.lineTo(Math.cos(a + 0.2) * 18, -34 + Math.sin(a + 0.2) * 8);
      ctx.closePath();
      ctx.fill();
    }
  }
}
