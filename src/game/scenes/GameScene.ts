import { Actor, CollisionType, Scene, vec, type Engine } from 'excalibur';
import * as CONFIG from '../config';
import { COMBAT, PHYSICS, VIEW } from '../config';
import { overlaps } from '../physics/aabb';
import type { CollisionWorld } from '../physics/kinematic';
import { ROOM } from '../level/room';
import { Background } from '../level/background';
import { stoneGraphic, woodGraphic } from '../level/terrainArt';
import { PlayerController, type ControllerEvent } from '../player/PlayerController';
import { PlayerActor } from '../player/PlayerActor';
import { EnemyController } from '../enemies/EnemyController';
import { EnemyActor } from '../enemies/EnemyActor';
import { Mettle } from '../systems/Mettle';
import { ParticleSystem } from '../fx/Particles';
import { Sfx } from '../audio/Sfx';
import { Hud } from '../ui/Hud';
import { InputMap } from '../input/InputMap';


const SPAWN = ROOM.spawn;

export class GameScene extends Scene {
  private controller!: PlayerController;
  private mettle!: Mettle;
  private player!: PlayerActor;
  private background!: Background;
  private particles!: ParticleSystem;
  private controls!: InputMap;
  private hud!: Hud;
  private sfx!: Sfx;

  private readonly collisionWorld: CollisionWorld = {
    solids: ROOM.solids,
    oneWays: ROOM.oneWays,
  };

  private enemies: {
    actor: EnemyActor;
    lastPlayerAttack: number;
    lastEnemyAttack: number;
  }[] = [];

  /** Current scroll position (in world pixels, left edge of view). */
  private scrollX = 0;
  private time = 0;
  private hudTimer = 0;
  private debugTimer = 0;
  private hitstop = 0;
  private deathTimer = 0;
  private debug = false;
  /** Has the player reached the end? */
  private levelComplete = false;

  onInitialize(engine: Engine): void {
    this.engine = engine;
    this.camera.zoom = 1;

    this.mettle = new Mettle();
    this.controller = new PlayerController(SPAWN.x, SPAWN.y);
    this.sfx = new Sfx();
    this.hud = new Hud();

    this.background = new Background(this);
    this.buildRoom();

    this.player = new PlayerActor();
    this.add(this.player);
    this.player.sync(this.controller, 0);

    this.particles = new ParticleSystem(this);
    this.controls = new InputMap(engine, {
      onToggleDebug: () => this.toggleDebug(),
    });
    this.hud.update(this.mettle, this.controller);

    // Start camera at spawn
    this.scrollX = 0;
    this.camera.pos = vec(VIEW.width / 2, VIEW.height / 2);

    const unlock = () => this.sfx.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    if (new URLSearchParams(window.location.search).has('debug')) {
      this.toggleDebug();
    }

    window.__panda = {
      scene: this,
      controller: this.controller,
      mettle: this.mettle,
      enemies: this.enemies,
      room: ROOM,
      config: CONFIG,
    };

    window.setTimeout(() => {
      this.hud.toast('FORWARD · SURVIVE · REACH THE END');
    }, 650);
  }

  onPreUpdate(_engine: Engine, elapsed: number): void {
    const dt = Math.min(elapsed / 1000, 1 / 30);
    if (dt <= 0) return;

    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }

    if (this.deathTimer > 0) {
      this.time += dt;
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) { this.respawnFromDeath(); return; }
      this.particles.update(dt);
      this.updateHud(dt);
      return;
    }

    if (this.levelComplete) return;

    this.time += dt;

    // --- Forward scroll ---
    this.scrollX += PHYSICS.scrollSpeed * dt;
    if (this.scrollX > ROOM.endX - VIEW.width) {
      this.scrollX = ROOM.endX - VIEW.width;
      this.levelComplete = true;
      this.hud.toast('THE PATH ENDS · FOR NOW', 'amber');
    }

    // Clamp camera to scroll
    const cameraX = this.scrollX + VIEW.width / 2;
    const cameraY = VIEW.height / 2;
    this.camera.pos = vec(cameraX, cameraY);

    // --- Input & systems ---
    const input = this.controls.sample();
    this.mettle.update(dt);
    const events = this.controller.step(input, dt, this.collisionWorld, this.mettle);

    this.handleEvents(events);
    this.resolvePlayerAttack();
    this.updateEnemies(dt);
    this.checkScrollDamage();

    if (!this.controller.isDead) {
      this.checkFall();
    }

    this.player.sync(this.controller, dt);
    this.background.update(this.camera.pos);
    this.particles.update(dt);
    this.updateHud(dt);
  }

  private buildRoom(): void {
    for (const solid of ROOM.solids) {
      const graphic = solid.kind === 'wood'
        ? woodGraphic(solid.w, solid.h)
        : stoneGraphic(solid.w, solid.h);
      const actor = new Actor({
        x: solid.x, y: solid.y,
        width: solid.w, height: solid.h,
        anchor: vec(0, 0),
        collisionType: CollisionType.Passive,
        z: 0, graphic,
      });
      this.add(actor);
    }

    for (const spawn of ROOM.enemies) {
      const controller = new EnemyController(
        spawn.x, spawn.y, spawn.patrolMin, spawn.patrolMax, spawn.maxHealth,
      );
      const actor = new EnemyActor(controller, spawn.id);
      this.add(actor);
      actor.sync(0);
      this.enemies.push({ actor, lastPlayerAttack: -1, lastEnemyAttack: -1 });
    }
  }

  private handleEvents(events: ControllerEvent[]): void {
    const body = this.controller.body;
    const centerX = body.x + body.w / 2;
    const feetY = body.y + body.h;

    for (const event of events) {
      switch (event.type) {
        case 'jump':
          this.sfx.jump();
          this.particles.jumpDust(centerX, feetY);
          break;
        case 'land':
          this.sfx.land(event.impact);
          this.particles.landDust(centerX, feetY, event.impact);
          if (event.impact > 650) this.camera.shake(3, 2, 120);
          break;
        case 'roll':
          this.sfx.roll();
          this.camera.shake(1.4, 0, 70);
          break;
        case 'attack':
          this.sfx.attack(event.index);
          if (event.index === 2) this.camera.shake(1.8, 1, 70);
          break;
        case 'parry':
          break;
        case 'parrySuccess':
          this.sfx.parry();
          this.camera.shake(2, 2, 100);
          break;
        case 'bonk':
          this.sfx.playerHurt();
          this.particles.landDust(centerX, body.y, 260);
          this.camera.shake(2.5, 1.5, 100);
          break;
        case 'scrollDamage':
          this.sfx.scrollDamage();
          this.particles.scrollDamageEffect(centerX, body.y + body.h / 2);
          break;
      }
    }
  }

  private resolvePlayerAttack(): void {
    const box = this.controller.getAttackBox();
    if (!box) return;

    const attackId = this.controller.attackId;
    const damage = this.controller.attackDamage;
    const heavy = this.controller.attackIndex === 2;
    const sourceX = this.controller.body.x + this.controller.body.w / 2;
    let hits = 0;

    for (const enemy of this.enemies) {
      const monster = enemy.actor.controller;
      if (!monster.isAlive || enemy.lastPlayerAttack === attackId) continue;
      if (!overlaps(box, monster.body)) continue;

      enemy.lastPlayerAttack = attackId;
      const result = monster.takeDamage(damage, sourceX);
      if (result === 'ignored') continue;

      hits += 1;
      const left = Math.max(box.x, monster.body.x);
      const right = Math.min(box.x + box.w, monster.body.x + monster.body.w);
      const top = Math.max(box.y, monster.body.y);
      const bottom = Math.min(box.y + box.h, monster.body.y + monster.body.h);
      const hitX = (left + right) / 2;
      const hitY = (top + bottom) / 2;

      this.particles.hitSpark(hitX, hitY, heavy ? '#e0a060' : '#c0c0e0');
      this.particles.damageNumber(hitX, hitY - 12, `${Math.round(damage)}`, heavy ? '#e0a060' : '#c0c0e0');

      if (result === 'dead') this.onEnemyKilled(enemy.actor);
    }

    if (hits > 0) {
      this.sfx.hit(heavy);
      this.camera.shake(heavy ? 5 : 3, heavy ? 3 : 2, heavy ? 150 : 100);
      this.hitstop = Math.max(this.hitstop, heavy ? 0.09 : 0.05);
    }
  }

  private onEnemyKilled(enemy: EnemyActor): void {
    const monster = enemy.controller;
    this.particles.enemyDeathBurst(monster.centerX, monster.centerY);
    this.particles.damageNumber(monster.centerX, monster.centerY - 28, 'VANQUISHED', '#c0a080');
    this.sfx.enemyDeath();
    this.camera.shake(4, 3, 160);
    this.hitstop = Math.max(this.hitstop, 0.11);
  }

  private updateEnemies(dt: number): void {
    const player = this.controller.body;
    const playerAlive = !this.controller.isDead;

    for (const enemy of this.enemies) {
      const monster = enemy.actor.controller;
      if (monster.removed) continue;

      const events = monster.step(dt, this.collisionWorld, {
        x: player.x, y: player.y, w: player.w, h: player.h, alive: playerAlive,
      });

      for (const event of events) {
        if (event.type === 'windup') this.sfx.enemyWindup();
        else if (event.type === 'attack') this.sfx.enemyAttack();
      }

      // Check parry
      const parryBox = this.controller.getParryBox();
      if (parryBox && monster.attackActive && overlaps(parryBox, monster.body)) {
        if (this.controller.tryParry(monster.centerX)) {
          monster.parryStun();
          this.particles.parryFlash(monster.centerX, monster.centerY);
          if (monster.health <= 0) {
            this.onEnemyKilled(enemy.actor);
          }
        }
      }

      // Normal enemy attack on player
      if (playerAlive) {
        const attackBox = monster.getAttackBox();
        if (attackBox && enemy.lastEnemyAttack !== monster.attackId && overlaps(attackBox, player)) {
          enemy.lastEnemyAttack = monster.attackId;
          this.damagePlayer(COMBAT.enemyDamage, monster.centerX);
        }
      }

      // Die if scrolled off-screen behind
      if (monster.body.x + monster.body.w < this.scrollX - COMBAT.enemyScrollDeathDistance && monster.isAlive && monster.state !== 'dead') {
        monster.health = 0;
        monster.enter('dead', COMBAT.enemyDeathTime);
      }

      enemy.actor.sync(dt);
    }
  }

  private checkScrollDamage(): void {
    // Player takes damage if they fall behind the scroll
    const playerRight = this.controller.body.x + this.controller.body.w;
    const scrollDanger = this.scrollX + PHYSICS.scrollLimit;
    if (playerRight < scrollDanger && !this.controller.isDead && this.controller.scrollDamageCooldown <= 0) {
      this.controller.scrollDamageCooldown = 0.5;
      this.damagePlayer(5, this.controller.body.x - 100);
      if (!this.controller.isDead) {
        this.hud.toast('THE DARKNESS CONSUMES', 'red');
      }
    }
  }

  private damagePlayer(amount: number, sourceX: number): void {
    if (this.controller.isDead) return;
    if (!this.controller.takeDamage(amount, sourceX)) return;

    const body = this.controller.body;
    const centerX = body.x + body.w / 2;
    const centerY = body.y + body.h / 2;

    this.hitstop = Math.max(this.hitstop, COMBAT.playerHurtHitstop);
    this.hud.flash();
    this.camera.shake(5, 3, 180);
    this.sfx.playerHurt();
    this.particles.hitSpark(centerX, centerY, '#d03020');
    this.particles.damageNumber(centerX, centerY - 30, `${Math.round(amount)}`, '#d06040');

    if (this.controller.isDead) this.beginDeath();
  }

  private beginDeath(): void {
    this.deathTimer = 1.0;
    this.hud.toast('FALLEN', 'red');
    this.hud.flash();
    this.camera.shake(7, 5, 320);
    this.sfx.playerDeath();
    this.hitstop = Math.max(this.hitstop, 0.1);
    const body = this.controller.body;
    this.particles.enemyDeathBurst(body.x + body.w / 2, body.y + body.h / 2);
    this.player.sync(this.controller, 0);
  }

  private respawnFromDeath(): void {
    this.deathTimer = 0;
    this.hitstop = 0;

    // Respawn at the current scroll position
    const respawnX = this.scrollX + 120;
    const respawnY = 540;
    this.controller.teleport(respawnX, respawnY);
    this.controller.resetCombat();
    this.controller.invulnerable = 1.5;
    this.mettle.reset();
    this.resetEnemies();
    this.hud.flash();
    this.hud.toast('RISE AGAIN');
    this.hud.update(this.mettle, this.controller);
    this.sfx.reset();
    this.particles.jumpDust(respawnX + 16, respawnY + 56);
    this.camera.pos = vec(this.scrollX + VIEW.width / 2, VIEW.height / 2);
    this.player.sync(this.controller, 0);
  }

  private resetEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.actor.controller.reset();
      enemy.actor.controller.attackCooldown = 1.5;
      enemy.actor.resetVisual();
      enemy.lastPlayerAttack = -1;
      enemy.lastEnemyAttack = -1;
    }
  }

  private checkFall(): void {
    if (this.controller.body.y > ROOM.height + 100) {
      this.respawnFall();
    }
  }

  private respawnFall(): void {
    const respawnX = this.controller.body.x;
    const respawnY = 540;
    this.controller.teleport(respawnX, respawnY);
    this.controller.invulnerable = 0.8;
    this.hitstop = 0;
    this.hud.flash();
    this.hud.toast('WATCH YOUR STEP', 'red');
    this.sfx.playerHurt();
    this.particles.landDust(respawnX + 16, respawnY + 56, 700);
  }

  private updateHud(dt: number): void {
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.05;
      this.hud.update(this.mettle, this.controller);
    }

    if (this.debug) {
      this.debugTimer -= dt;
      if (this.debugTimer <= 0) {
        this.debugTimer = 0.1;
        this.hud.setDebugText(this.debugText());
      }
    }
  }

  private toggleDebug(): void {
    this.debug = !this.debug;
    this.engine!.toggleDebug();
    this.hud.setDebugVisible(this.debug);
    if (this.debug) { this.debugTimer = 0; this.hud.setDebugText(this.debugText()); }
  }

  private debugText(): string {
    const body = this.controller.body;
    const stats = this.engine!.stats.currFrame;
    return [
      `fps      ${stats.fps.toFixed(0)}`,
      `state    ${this.controller.stateName}`,
      `health   ${this.controller.health.toFixed(0)} / ${this.controller.maxHealth}`,
      `mettle   ${this.mettle.value.toFixed(0)} / ${this.mettle.max}${this.mettle.broken ? ' (BROKEN)' : ''}`,
      `pos      ${body.x.toFixed(1)}, ${body.y.toFixed(1)}`,
      `vel      ${body.vx.toFixed(0)}, ${body.vy.toFixed(0)}`,
      `scroll   ${this.scrollX.toFixed(0)} / ${ROOM.endX}`,
      `ground   ${body.onGround}`,
      `coyote   ${(this.controller.coyote * 1000).toFixed(0)} ms`,
      `attack   ${this.controller.attackIndex >= 0 ? this.controller.attackIndex + 1 : '-'}`,
      `iframes  ${(this.controller.invulnerable * 1000).toFixed(0)} ms`,
      `hitstop  ${(this.hitstop * 1000).toFixed(0)} ms`,
      `enemies  ${this.enemies.filter((e) => e.actor.controller.isAlive).length} / ${this.enemies.length}`,
      `actors   ${this.actors.length}`,
    ].join('\n');
  }
}