import { describe, expect, it } from 'vitest';
import { ENEMY } from '../src/game/config';
import { ROOM, enemySpawnY } from '../src/game/level/room';
import { EnemyController } from '../src/game/enemies/EnemyController';
import { MothmanController } from '../src/game/enemies/MothmanController';

/**
 * These tests lock in the level invariant that caused the "enemies vanish into
 * the pits" bug: every enemy must start with its feet exactly on a solid top,
 * and its patrol span must stay over solid ground at that same height.
 */

const world = { solids: ROOM.solids, oneWays: ROOM.oneWays };
const farAway = { x: -9999, y: -9999, w: 32, h: 56, alive: false };

/** True when some solid with the given top supports the full [from, to] span. */
function isSupported(from: number, to: number, top: number): boolean {
  for (let x = from; x <= to; x += 4) {
    const supported = ROOM.solids.some(
      (solid) => solid.y === top && x >= solid.x && x < solid.x + solid.w,
    );
    if (!supported) return false;
  }
  return true;
}

describe('level geometry', () => {
  it('ships exactly five chaff enemies plus one boss', () => {
    expect(ROOM.enemies).toHaveLength(5);
    expect(ROOM.boss).toBeTruthy();
  });

  it('plants every chaff spawn exactly on the ground surface', () => {
    for (const spawn of ROOM.enemies) {
      const body = new EnemyController(spawn.x, enemySpawnY(spawn), spawn.patrolMin, spawn.patrolMax).body;
      expect(body.y + body.h, `${spawn.id} feet`).toBe(spawn.groundTop);
      expect(
        isSupported(body.x + 4, body.x + body.w - 4, spawn.groundTop),
        `${spawn.id} spawn support`,
      ).toBe(true);
    }
  });

  it('keeps every chaff patrol span fully over solid ground', () => {
    for (const spawn of ROOM.enemies) {
      const half = ENEMY.width / 2;
      const left = spawn.patrolMin - half;
      const right = spawn.patrolMax + half;
      expect(isSupported(left, right, spawn.groundTop), `${spawn.id} patrol span`).toBe(true);
    }
  });

  it('has a pit-free boss arena', () => {
    expect(isSupported(ROOM.boss.arenaMin, ROOM.boss.arenaMax, ROOM.boss.groundTop)).toBe(true);
  });

  it('never lets a chaff enemy fall out of the world', () => {
    const dt = 1 / 120;
    for (const spawn of ROOM.enemies) {
      const enemy = new EnemyController(
        spawn.x, enemySpawnY(spawn), spawn.patrolMin, spawn.patrolMax, spawn.maxHealth,
      );
      let lowest = enemy.body.y;
      for (let i = 0; i < 120 * 45; i++) {
        enemy.step(dt, world, farAway);
        lowest = Math.max(lowest, enemy.body.y);
      }
      const bottom = enemy.body.y + enemy.body.h;
      expect(lowest, `${spawn.id} stayed in the world`).toBeLessThan(ROOM.height);
      expect(Math.abs(bottom - spawn.groundTop), `${spawn.id} feet on ground`).toBeLessThan(1);
      expect(enemy.body.onGround, `${spawn.id} grounded`).toBe(true);
    }
  });

  it('keeps the boss inside her arena and above the floor', () => {
    const dt = 1 / 120;
    const boss = new MothmanController(
      ROOM.boss.x, ROOM.boss.groundTop, ROOM.boss.arenaMin, ROOM.boss.arenaMax, ROOM.boss.maxHealth,
    );
    for (let i = 0; i < 120 * 20; i++) {
      boss.step(dt, world, farAway);
      const bottom = boss.body.y + boss.body.h;
      expect(bottom, 'boss above the floor').toBeLessThanOrEqual(ROOM.boss.groundTop + 1);
      expect(bottom, 'boss below the ceiling').toBeGreaterThan(0);
      const center = boss.body.x + boss.body.w / 2;
      expect(center).toBeGreaterThanOrEqual(ROOM.boss.arenaMin - 1);
      expect(center).toBeLessThanOrEqual(ROOM.boss.arenaMax + 1);
      expect(boss.body.y).toBeLessThan(ROOM.height);
    }
  });
});
