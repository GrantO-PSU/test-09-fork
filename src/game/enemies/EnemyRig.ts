import { Canvas } from 'excalibur';
import { COMBAT } from '../config';
import type { EnemyController } from './EnemyController';
import { clamp, damp } from '../util/math';

const W = 140;
const H = 160;

/**
 * Hollow Knight — a dark, ragged enemy with a rusted sword. The "!" telegraph
 * is kept from drunk-panda's Sober Monk but restyled for dark fantasy.
 */
export class EnemyRig {
  readonly graphic: Canvas;

  private readonly controller: EnemyController;
  private time = 0;
  private walkPhase = 0;
  private lean = 0;
  private flash = 0;

  constructor(controller: EnemyController) {
    this.controller = controller;
    this.graphic = new Canvas({
      width: W, height: H,
      quality: 2,
      cache: false,
      draw: (ctx) => this.draw(ctx),
    });
  }

  update(dt: number, controller: EnemyController): void {
    this.time += dt;
    this.walkPhase += (Math.abs(controller.body.vx) * dt) / 26;
    this.lean = damp(this.lean, clamp(controller.body.vx / 350, -0.35, 0.35), 10, dt);
    this.flash = Math.max(0, this.flash - dt * 6);
    if (controller.state === 'hurt') this.flash = 1;
  }

  private draw(ctx: CanvasRenderingContext2D): void {
    const c = this.controller;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);

    const walking = c.state === 'patrol' || c.state === 'chase';
    const walkAmount = walking && c.body.onGround ? clamp(Math.abs(c.body.vx) / 110, 0, 1) : 0;
    const bob = c.body.onGround ? Math.sin(this.walkPhase * 2) * 1.4 * walkAmount : 0;

    ctx.scale(c.facing, 1);
    if (c.state === 'dead') {
      ctx.rotate(-0.95 * c.deathProgress);
      ctx.translate(0, 16 * c.deathProgress);
    } else if (c.state === 'hurt') {
      ctx.rotate(-0.16);
    }
    ctx.translate(0, bob);

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.2 * (1 - c.deathProgress);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 28, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Wind-up glow (red)
    if (c.state === 'windup') {
      const pulse = 0.5 + Math.sin(this.time * 22) * 0.5;
      const glow = ctx.createRadialGradient(0, -8, 4, 0, -8, 50);
      glow.addColorStop(0, `rgba(200, 50, 30, ${0.1 + pulse * 0.12})`);
      glow.addColorStop(1, 'rgba(200, 50, 30, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-55, -65, 110, 130);
    }

    // Legs
    const legSwing = Math.sin(this.walkPhase) * 0.55 * walkAmount;
    this.drawLeg(ctx, -7, 12, legSwing);
    this.drawLeg(ctx, 7, 12, -legSwing);

    // Tattered robe / armour
    ctx.fillStyle = '#1a1a24';
    ctx.beginPath();
    ctx.moveTo(-14, -12);
    ctx.quadraticCurveTo(-18, -2, -17, 22);
    ctx.lineTo(17, 22);
    ctx.quadraticCurveTo(18, -2, 14, -12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2a2a38';
    ctx.fillRect(-15, 16, 30, 3);

    // Ragged surcoat
    ctx.fillStyle = '#18101a';
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-14, 22);
    ctx.lineTo(14, 22);
    ctx.lineTo(12, 0);
    ctx.closePath();
    ctx.fill();

    // Far arm
    this.drawArm(ctx, -14, -5, -0.45 + Math.sin(this.walkPhase) * 0.15 * walkAmount);

    // Head / Helmet — hollow dark helm with faint red glow
    const headY = -22;
    ctx.fillStyle = '#1e1e2c';
    ctx.beginPath();
    ctx.arc(0, headY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2e2e3c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Visor — empty dark slit with red pinprick
    ctx.fillStyle = '#050508';
    ctx.fillRect(-5, headY - 3, 10, 5);
    ctx.fillStyle = 'rgba(180, 40, 20, 0.5)';
    ctx.fillRect(-3, headY - 1, 2, 2);
    ctx.fillRect(1, headY - 1, 2, 2);

    // Dead — eyes out
    if (c.state === 'dead') {
      ctx.fillStyle = 'rgba(100, 30, 20, 0.15)';
      ctx.fillRect(-5, headY - 3, 10, 5);
    }

    // Rusted sword held in near arm
    const swordAngle = this.swordAngle(c);
    const handX = 15;
    const handY = -3;
    const swordEndX = handX + Math.cos(swordAngle) * 48;
    const swordEndY = handY + Math.sin(swordAngle) * 48;

    // Attack trail
    if (c.state === 'attack') {
      const progress = 1 - c.stateTimer / COMBAT.enemyAttackDuration;
      const trailStart = lerp(-2.0, 0.9, clamp(progress - 0.18, 0, 1));
      ctx.save();
      ctx.strokeStyle = `rgba(200, 120, 60, ${0.2 + (1 - progress) * 0.3})`;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(handX, handY, 40, trailStart, swordAngle);
      ctx.stroke();
      ctx.restore();
    }

    // Near arm
    this.drawArm(ctx, 14, -6, swordAngle * 0.55 + 0.2);

    // Sword
    ctx.strokeStyle = '#3a3a48';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(swordEndX, swordEndY);
    ctx.stroke();
    ctx.strokeStyle = '#5a5a6a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(handX, handY - 1);
    ctx.lineTo(swordEndX, swordEndY - 1);
    ctx.stroke();

    // Hands
    ctx.fillStyle = '#22222e';
    ctx.beginPath();
    ctx.arc(handX, handY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Hurt flash
    if (this.flash > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(200, 80, 60, ${0.5 * this.flash})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Health bar
    if (c.state !== 'dead' && c.showHealthBar) {
      const barWidth = 50;
      const barHeight = 5;
      const x = W / 2 - barWidth / 2;
      const y = 6;
      const ratio = clamp(c.health / c.maxHealth, 0, 1);
      ctx.fillStyle = 'rgba(8, 6, 8, 0.8)';
      ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
      ctx.fillStyle = '#1a1018';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.fillStyle = '#8a3020';
      ctx.fillRect(x, y, barWidth * ratio, barHeight);
      ctx.strokeStyle = 'rgba(200, 160, 120, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, barWidth - 1, barHeight - 1);
    }

    // Telegraph "!"
    if (c.state === 'windup') {
      const pulse = 0.55 + Math.sin(this.time * 20) * 0.45;
      ctx.save();
      ctx.globalAlpha = 0.7 + pulse * 0.3;
      ctx.font = 'bold 25px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(20, 8, 8, 0.85)';
      ctx.strokeText('!', W / 2, 27);
      ctx.fillStyle = '#d04030';
      ctx.fillText('!', W / 2, 27);
      ctx.restore();
    }
  }

  private swordAngle(c: EnemyController): number {
    if (c.state === 'windup') {
      const progress = 1 - c.stateTimer / COMBAT.enemyWindup;
      return lerp(0.3, -2.0, clamp(progress * 1.6, 0, 1));
    }
    if (c.state === 'attack') {
      const progress = 1 - c.stateTimer / COMBAT.enemyAttackDuration;
      return lerp(-2.0, 0.9, easeOutCubic(progress));
    }
    if (c.state === 'recover') return lerp(0.9, 0.35, clamp((1 - c.stateTimer / COMBAT.enemyRecover), 0, 1));
    if (c.state === 'hurt') return -0.5;
    return 0.35;
  }

  private drawLeg(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#1a1a24';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.fillStyle = '#1a1a24';
    ctx.beginPath();
    ctx.ellipse(1, 11, 4, 2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawArm(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#1a1a24';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.restore();
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}