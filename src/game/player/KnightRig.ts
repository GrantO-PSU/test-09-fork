import { Canvas } from 'excalibur';
import type { PlayerController } from './PlayerController';
import { clamp, damp } from '../util/math';

const W = 200;
const H = 160;

/**
 * Procedural dark knight drawn with Canvas 2D. No sprite sheets needed: the
 * knight is built from geometric shapes with a Dark Souls 3 aesthetic — dark
 * armour, a greatsword, tattered cloth, and ember-like glow effects.
 */
export class KnightRig {
  readonly graphic: Canvas;

  private time = 0;
  private runPhase = 0;
  private squash = 0;
  private headLagX = 0;
  private headLagY = 0;
  private lastGrounded = true;
  private lastVy = 0;
  private attacking = false;
  private attackIndex = 0;
  private attackProgress = 0;
  private attackActive = false;
  private hurt = 0;
  private dead = false;
  private rolling = false;
  private crouching = false;
  private parrying = false;

  constructor() {
    this.graphic = new Canvas({
      width: W,
      height: H,
      quality: 2,
      cache: false,
      draw: (ctx) => this.draw(ctx),
    });
  }

  update(dt: number, controller: PlayerController): void {
    const body = controller.body;
    this.time += dt;
    this.bodySnapshot = {
      vx: body.vx,
      vy: body.vy,
      facing: controller.facing,
      grounded: body.onGround,
    };
    this.attacking = controller.isAttacking;
    this.attackIndex = controller.attackIndex;
    this.attackProgress = controller.attackProgress;
    this.attackActive = controller.isAttackActive;
    this.hurt = controller.stun > 0 ? 1 : 0;
    this.dead = controller.isDead;
    this.rolling = controller.rollTime > 0;
    this.crouching = controller.crouching;
    this.parrying = controller.isParrying;

    if (!this.lastGrounded && body.onGround) {
      this.squash = clamp(Math.abs(this.lastVy) / 850, 0.2, 1);
      this.runPhase = 0;
    }
    if (body.onGround) {
      this.runPhase += (Math.abs(body.vx) * dt) / 34;
    }

    this.lastGrounded = body.onGround;
    this.lastVy = body.vy;
    this.squash = Math.max(0, this.squash - dt * 4.2);

    const targetHeadX = clamp(-body.vx * 0.01, -8, 8);
    const targetHeadY = clamp(-body.vy * 0.005, -5, 5);
    this.headLagX = damp(this.headLagX, targetHeadX, 11, dt);
    this.headLagY = damp(this.headLagY, targetHeadY, 11, dt);
  }

  private bodySnapshot = {
    vx: 0, vy: 0,
    facing: 1 as 1 | -1,
    grounded: true,
  };

  private draw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);

    const body = this.bodySnapshot;
    const facing = body.facing;
    const speedAmount = clamp(Math.abs(body.vx) / 320, 0, 1.25);
    const grounded = body.grounded;
    const run = grounded ? speedAmount : 0;

    // Rolling: rotate the whole knight sideways
    if (this.rolling) {
      ctx.rotate(-1.2);
      ctx.translate(0, 8);
    }

    if (this.dead) {
      ctx.rotate(-0.6);
      ctx.translate(-4, 10);
    }

    // Crouch: squash vertically
    if (this.crouching) {
      ctx.scale(1, 0.65);
      ctx.translate(0, 14);
    }

    ctx.scale(facing, 1);

    // Lean
    const lean = clamp(body.vx / 900, -1, 1) * 0.08;
    ctx.rotate(lean);
    ctx.scale(1 + this.squash * 0.18, (1 - this.squash * 0.22));

    // --- Shadow on ground ---
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 30, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Legs ---
    const legSwing = Math.sin(this.runPhase) * 0.6 * run;
    const airPose = !grounded && !this.rolling;

    if (airPose) {
      drawArmourLeg(ctx, -8, 18, 0.5, '#1a1a22');
      drawArmourLeg(ctx, 8, 18, -0.2, '#1a1a22');
    } else {
      drawArmourLeg(ctx, -8, 18, legSwing, '#1a1a22');
      drawArmourLeg(ctx, 8, 18, -legSwing, '#1a1a22');
    }

    // --- Torso / Armour ---
    const torsoGrad = ctx.createLinearGradient(0, -4, 0, 20);
    torsoGrad.addColorStop(0, '#2a2a35');
    torsoGrad.addColorStop(0.5, '#1e1e28');
    torsoGrad.addColorStop(1, '#14141c');
    ctx.fillStyle = torsoGrad;
    ctx.strokeStyle = '#3a3a48';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 6, 22, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Chest plate highlight
    ctx.fillStyle = 'rgba(180, 180, 200, 0.12)';
    ctx.beginPath();
    ctx.ellipse(-5, 0, 9, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Tattered tabard / surcoat
    ctx.fillStyle = '#2a1820';
    ctx.beginPath();
    ctx.moveTo(-14, 8);
    ctx.lineTo(-10, 26);
    ctx.lineTo(10, 26);
    ctx.lineTo(14, 8);
    ctx.closePath();
    ctx.fill();

    // Tabard edges
    ctx.strokeStyle = 'rgba(160, 90, 70, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, 12);
    ctx.lineTo(12, 12);
    ctx.stroke();

    // --- Far arm (shield arm, behind) ---
    const farArmAngle = airPose ? -0.6 : -Math.sin(this.runPhase) * 0.5 * run;
    drawArmouredArm(ctx, -18, 0, farArmAngle, 14, '#1a1a24');

    // --- Greatsword (slung on back when not attacking) ---
    if (!this.attacking && !this.parrying) {
      ctx.save();
      ctx.rotate(-0.12);
      drawGreatsword(ctx, -20, -10, 0.35);
      ctx.restore();
    }

    // --- Near arm ---
    const nearArmAngle = airPose ? 0.6 : Math.sin(this.runPhase) * 0.5 * run;
    drawArmouredArm(ctx, 18, 0, this.parrying ? -1.2 : nearArmAngle, 14, '#1a1a24');

    // --- Head / Helmet ---
    ctx.save();
    ctx.translate(this.headLagX, -20 + this.headLagY - this.squash * 2);
    ctx.rotate(this.hurt * 0.2);
    this.drawHelmet(ctx);
    ctx.restore();

    // --- Greatsword during attack ---
    if (this.attacking) {
      this.drawSwordSwing(ctx);
    }

    // --- Parry shield flash ---
    if (this.parrying) {
      ctx.save();
      const flashAlpha = 0.3 + Math.sin(this.time * 35) * 0.2;
      ctx.translate(22, -2);
      ctx.fillStyle = `rgba(160, 200, 255, ${flashAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // Hurt red flash
    if (this.hurt > 0.5) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(200, 50, 40, ${0.3 * this.hurt})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  private drawHelmet(ctx: CanvasRenderingContext2D): void {
    // Greathelm — dark, angular, imposing
    ctx.fillStyle = '#2a2a35';
    ctx.strokeStyle = '#3c3c4a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-13, -4);
    ctx.lineTo(-14, -20);
    ctx.lineTo(14, -20);
    ctx.lineTo(13, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top dome
    ctx.fillStyle = '#22222e';
    ctx.beginPath();
    ctx.arc(0, -18, 10, Math.PI, 0);
    ctx.fill();

    // Visor slit
    ctx.fillStyle = '#08080c';
    ctx.beginPath();
    ctx.rect(-6, -9, 12, 2.5);
    ctx.fill();

    // Visor glow (red ember)
    ctx.fillStyle = 'rgba(200, 60, 30, 0.35)';
    ctx.beginPath();
    ctx.rect(-5.5, -9, 11, 2);
    ctx.fill();

    if (this.dead) {
      ctx.fillStyle = 'rgba(100, 30, 20, 0.15)';
      ctx.beginPath();
      ctx.rect(-6, -9, 12, 2.5);
      ctx.fill();
    }

    // Neck guard
    ctx.fillStyle = '#1e1e28';
    ctx.fillRect(-10, 0, 20, 4);

    // Plume
    ctx.strokeStyle = '#3a1820';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(
      4 + Math.sin(this.time * 2.5) * 3,
      -26,
      8 + Math.sin(this.time * 1.8 + 1) * 4,
      -22,
    );
    ctx.stroke();
    ctx.fillStyle = '#4a202a';
    ctx.beginPath();
    ctx.ellipse(2 + Math.sin(this.time * 2.5) * 3, -24, 7, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSwordSwing(ctx: CanvasRenderingContext2D): void {
    const angle = this.computeSwordAngle();
    const handX = 20;
    const handY = -1;
    const length = 62;
    const endX = handX + Math.cos(angle) * length;
    const endY = handY + Math.sin(angle) * length;

    // Swing trail
    if (this.attackProgress < 0.85) {
      ctx.save();
      ctx.globalAlpha = this.attackActive ? 0.5 : 0.2;
      ctx.strokeStyle = 'rgba(200, 180, 255, 0.3)';
      ctx.lineWidth = 3;

      const startAngle = this.attackIndex === 0 ? -1.8 : this.attackIndex === 1 ? 0.9 : -2.3;
      ctx.beginPath();
      ctx.arc(handX, handY, 55, startAngle, angle, startAngle > angle);
      ctx.stroke();
      ctx.restore();
    }

    // Sword blade
    ctx.save();
    ctx.strokeStyle = '#5a5a6a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Sword edge highlight
    ctx.strokeStyle = '#8888a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(handX, handY - 1);
    ctx.lineTo(endX, endY - 1);
    ctx.stroke();

    // Crossguard
    ctx.fillStyle = '#6a6a7a';
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(angle);
    ctx.fillRect(-4, -7, 8, 14);
    ctx.fillStyle = '#8888a0';
    ctx.fillRect(-3, -6, 6, 2);
    ctx.restore();

    // Pommel glow
    ctx.fillStyle = 'rgba(200, 180, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(handX - Math.cos(angle) * 6, handY - Math.sin(angle) * 6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Impact flash at tip during active frames
    if (this.attackActive) {
      ctx.fillStyle = '#c0c0e0';
      ctx.beginPath();
      ctx.arc(endX, endY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(endX, endY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private computeSwordAngle(): number {
    if (!this.attacking) return 0.35;
    const speed = this.attackIndex === 2 ? 0.7 : 0.55;
    const t = 1 - Math.pow(1 - clamp(this.attackProgress / speed, 0, 1), 2.5);
    switch (this.attackIndex) {
      case 0: return lerp(-1.8, 0.7, t);   // upward slash
      case 1: return lerp(0.9, -1.3, t);   // downward chop
      default: return lerp(-2.3, 0.9, t);  // heavy horizontal sweep
    }
  }
}

function drawArmourLeg(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number, color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 13);
  ctx.stroke();
  // Boot
  ctx.fillStyle = '#1a1a24';
  ctx.beginPath();
  ctx.ellipse(1.5, 14, 5, 2.5, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArmouredArm(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number, length: number, color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, length);
  ctx.stroke();
  // Gauntlet
  ctx.fillStyle = '#2a2a38';
  ctx.beginPath();
  ctx.arc(0, length, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGreatsword(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const bladeLen = 52;
  // Blade
  ctx.strokeStyle = '#5a5a6a';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -bladeLen);
  ctx.stroke();

  // Edge shine
  ctx.strokeStyle = '#7a7a90';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -bladeLen);
  ctx.stroke();

  // Crossguard
  ctx.fillStyle = '#6a6a7a';
  ctx.fillRect(-5, 0, 10, 3);
  ctx.fillStyle = '#8888a0';
  ctx.fillRect(-4, 1, 8, 1.5);

  // Grip
  ctx.fillStyle = '#1a1a22';
  ctx.fillRect(-1.5, 3, 3, 8);

  // Pommel
  ctx.fillStyle = '#7a7a8a';
  ctx.beginPath();
  ctx.arc(0, 11, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}