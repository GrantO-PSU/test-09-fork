import { BOSS, COMBAT } from '../config';
import type { Rect } from '../physics/aabb';
import type { Body, CollisionWorld } from '../physics/kinematic';
import { moveBody } from '../physics/kinematic';
import { clamp, damp, moveTowards } from '../util/math';
import type {
  EnemyEvent,
  EnemyPlayerInfo,
  EnemyState,
  HostileController,
} from './EnemyController';

/** Wing-beat speed of the idle hover. */
const HOVER_BOB_SPEED = 1.7;

/**
 * The Moth Mother — the level boss.
 *
 * She is a flyer, so she ignores the ground-bound collision rules while
 * airborne: she hovers above the arena, telegraphs with a shriek, then swoops
 * at the player. A successful parry knocks her out of the air and leaves her
 * grounded and vulnerable for a long window.
 */
export class MothmanController implements HostileController {
  readonly body: Body;
  readonly maxHealth: number;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly groundTop: number;
  readonly arenaMin: number;
  readonly arenaMax: number;

  health: number;
  state: EnemyState = 'patrol';
  stateTimer = 0;
  facing: 1 | -1 = -1;
  attackId = 0;
  attackCooldown = 0;
  removed = false;

  private bob = Math.PI / 2;
  private diveVX = 0;
  private diveVY = 0;
  private enraged = false;
  private fallingHurt = false;

  constructor(
    x: number,
    groundTop: number,
    arenaMin: number,
    arenaMax: number,
    maxHealth: number = BOSS.maxHealth,
  ) {
    this.groundTop = groundTop;
    this.arenaMin = arenaMin;
    this.arenaMax = arenaMax;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.spawnX = x - BOSS.width / 2;
    this.spawnY = this.baseY;
    this.body = {
      x: this.spawnX,
      y: this.spawnY,
      w: BOSS.width,
      h: BOSS.height,
      vx: 0,
      vy: 0,
      onGround: false,
      standingOnOneWay: false,
    };
  }

  get centerX(): number { return this.body.x + this.body.w / 2; }
  get centerY(): number { return this.body.y + this.body.h / 2; }
  get isAlive(): boolean { return this.state !== 'dead'; }
  get showHealthBar(): boolean { return false; }
  get contactDamage(): number { return BOSS.contactDamage; }
  get deathProgress(): number {
    return this.state === 'dead'
      ? clamp(1 - this.stateTimer / BOSS.deathTime, 0, 1)
      : 0;
  }

  get attackActive(): boolean {
    if (this.state !== 'attack') return false;
    const elapsed = BOSS.diveTime - this.stateTimer;
    return elapsed >= BOSS.diveActiveStart && elapsed <= BOSS.diveActiveEnd;
  }

  getAttackBox(): Rect | null {
    if (!this.attackActive) return null;
    return {
      x: this.body.x + 10,
      y: this.body.y + 12,
      w: this.body.w - 20,
      h: this.body.h - 12,
    };
  }

  step(dt: number, world: CollisionWorld, player: EnemyPlayerInfo): EnemyEvent[] {
    const events: EnemyEvent[] = [];
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.stateTimer -= dt;
    this.bob += dt * HOVER_BOB_SPEED;
    this.enraged = this.health <= this.maxHealth * BOSS.phaseTwoAt;

    const playerCX = player.x + player.w / 2;
    const dx = playerCX - this.centerX;
    const aggro = player.alive && Math.abs(dx) < BOSS.aggroRange;

    switch (this.state) {
      case 'patrol':
      case 'chase':
        this.hover(dt, dx, aggro);
        if (aggro && this.attackCooldown <= 0) {
          this.enter('windup', BOSS.diveTelegraphTime);
          this.body.vx = 0;
          this.body.vy = 0;
          events.push({ type: 'windup' });
        }
        break;

      case 'windup':
        this.body.vx = moveTowards(this.body.vx, 0, 600 * dt);
        this.body.y = damp(this.body.y, this.hoverY(), 5, dt);
        this.clampToArena();
        if (player.alive) this.facing = dx < 0 ? -1 : 1;
        if (this.stateTimer <= 0) {
          this.beginDive(player);
          this.attackId += 1;
          events.push({ type: 'attack' });
        }
        break;

      case 'attack':
        this.flight(dt);
        if (this.stateTimer <= 0 || this.body.y + this.body.h >= this.groundTop - 6) {
          this.enter('recover', BOSS.riseTime);
        }
        break;

      case 'recover':
        this.body.vx = 0;
        this.body.vy = 0;
        this.body.y = damp(this.body.y, this.hoverY(), 5, dt);
        this.clampToArena();
        if (this.stateTimer <= 0) {
          this.attackCooldown = this.enraged ? BOSS.cooldown * 0.55 : BOSS.cooldown;
          this.enter('patrol', 0);
        }
        break;

      case 'hurt':
        if (this.fallingHurt) {
          this.fall(dt, world);
        } else {
          this.body.y = damp(this.body.y, this.hoverY(), 4, dt);
          this.clampToArena();
        }
        if (this.stateTimer <= 0) {
          this.fallingHurt = false;
          this.enter('recover', BOSS.riseTime * 0.6);
        }
        break;

      case 'dead':
        this.fall(dt, world);
        if (this.stateTimer <= 0 && !this.removed) {
          this.removed = true;
          events.push({ type: 'removed' });
        }
        break;
    }

    return events;
  }

  /** Parry reward: she is swatted out of the air and lands hard. */
  parryStun(): void {
    this.enter('hurt', BOSS.stunTime);
    this.fallingHurt = true;
    this.body.vx = (this.facing === 1 ? -1 : 1) * 220;
    this.body.vy = 60;
    this.body.onGround = false;
    this.attackId += 1;
    this.health = Math.max(0, this.health - COMBAT.parryDamage);
    if (this.health <= 0) {
      this.health = 0;
      this.enter('dead', BOSS.deathTime);
    }
  }

  takeDamage(amount: number, sourceX: number): 'hit' | 'dead' | 'ignored' {
    if (amount <= 0 || this.state === 'dead') return 'ignored';

    this.health = Math.max(0, this.health - amount);
    this.facing = sourceX < this.centerX ? -1 : 1;

    if (this.health <= 0) {
      this.health = 0;
      this.fallingHurt = false;
      this.enter('dead', BOSS.deathTime);
      this.body.vx = 0;
      this.body.vy = 40;
      this.body.onGround = false;
      return 'dead';
    }

    // Only flinch when she is not committed to a dive, so she cannot be
    // stun-locked out of her own boss fight.
    if (this.state === 'patrol' || this.state === 'windup' || this.state === 'chase') {
      this.fallingHurt = false;
      this.enter('hurt', BOSS.hurtTime);
    }
    return 'hit';
  }

  reset(): void {
    this.health = this.maxHealth;
    this.state = 'patrol';
    this.stateTimer = 0;
    this.facing = -1;
    this.attackId = 0;
    this.attackCooldown = 0;
    this.removed = false;
    this.enraged = false;
    this.fallingHurt = false;
    this.bob = Math.PI / 2;
    this.placeAtSpawn();
  }

  placeAtSpawn(): void {
    this.body.x = this.spawnX;
    this.body.y = this.spawnY;
    this.body.vx = 0;
    this.body.vy = 0;
    this.body.onGround = false;
    this.body.standingOnOneWay = false;
    if (this.state !== 'dead') this.enter('patrol', 0);
  }

  private get baseY(): number {
    return this.groundTop - BOSS.hoverHeight - BOSS.height;
  }

  private hoverY(): number {
    return this.baseY + Math.sin(this.bob) * BOSS.hoverAmplitude;
  }

  private enter(state: EnemyState, timer: number): void {
    this.state = state;
    this.stateTimer = timer;
  }

  private hover(dt: number, dx: number, aggro: boolean): void {
    const direction = aggro ? Math.sign(dx) : 0;
    this.body.vx = moveTowards(this.body.vx, direction * BOSS.hoverSpeed, 320 * dt);
    this.body.x += this.body.vx * dt;
    this.body.y = damp(this.body.y, this.hoverY(), 4, dt);
    if (aggro) this.facing = dx < 0 ? -1 : 1;
    this.clampToArena();
    this.body.onGround = false;
    this.body.standingOnOneWay = false;
  }

  private beginDive(player: EnemyPlayerInfo): void {
    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const dx = targetX - this.centerX;
    const dy = targetY - this.centerY;
    const length = Math.hypot(dx, dy) || 1;
    const speed = BOSS.diveSpeed * (this.enraged ? 1.25 : 1);

    this.diveVX = (dx / length) * speed;
    // Always commit to a downward swoop, even if the player is level with her.
    this.diveVY = Math.max(140, (dy / length) * speed);
    this.facing = dx < 0 ? -1 : 1;
    this.enter('attack', BOSS.diveTime);
  }

  private flight(dt: number): void {
    this.body.x += this.diveVX * dt;
    this.body.y += this.diveVY * dt;
    this.clampToArena();
    const floor = this.groundTop - this.body.h;
    if (this.body.y > floor) this.body.y = floor;
    if (this.body.y < 0) {
      this.body.y = 0;
      this.diveVY = Math.abs(this.diveVY);
    }
  }

  private fall(dt: number, world: CollisionWorld): void {
    if (!this.body.onGround) {
      this.body.vy = Math.min(this.body.vy + 2200 * dt, COMBAT.enemyMaxFallSpeed);
    } else if (this.body.vy > 0) {
      this.body.vy = 0;
    }
    moveBody(this.body, dt, world, { dropThrough: false, cornerCorrection: 0 });
  }

  private clampToArena(): void {
    const minX = this.arenaMin - this.body.w / 2;
    const maxX = this.arenaMax - this.body.w / 2;
    this.body.x = clamp(this.body.x, minX, maxX);
  }
}
