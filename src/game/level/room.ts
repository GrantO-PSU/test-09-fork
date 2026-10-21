import type { Rect } from '../physics/aabb';

export type SolidKind = 'stone' | 'wood';

export interface SolidDef extends Rect {
  kind: SolidKind;
}

export interface EnemySpawnDef {
  id: string;
  x: number;
  y: number;
  patrolMin: number;
  patrolMax: number;
  maxHealth?: number;
}

export interface RoomData {
  width: number;
  height: number;
  spawn: { x: number; y: number };
  solids: SolidDef[];
  oneWays: Rect[];
  enemies: EnemySpawnDef[];
  /** Right boundary — when scroll passes this, the level ends. */
  endX: number;
}

/**
 * The forward-scrolling test course. The camera auto-scrolls right.
 * Terrain is a ruined cathedral / castle approach with platforms,
 * gaps, and hollow knights.
 */
export const ROOM: RoomData = {
  width: 6000,
  height: 720,
  spawn: { x: 120, y: 540 },
  endX: 5600,
  solids: [
    // Left wall
    { x: 0, y: 0, w: 32, h: 640, kind: 'stone' },
    // Ground — long stretches with gaps
    { x: 0, y: 640, w: 800, h: 80, kind: 'stone' },
    { x: 1050, y: 640, w: 400, h: 80, kind: 'stone' },
    { x: 1700, y: 640, w: 600, h: 80, kind: 'stone' },
    { x: 2550, y: 640, w: 500, h: 80, kind: 'stone' },
    { x: 3300, y: 640, w: 700, h: 80, kind: 'stone' },
    { x: 4250, y: 640, w: 600, h: 80, kind: 'stone' },
    { x: 5100, y: 640, w: 900, h: 80, kind: 'stone' },

    // Ruined pillars (platforms)
    { x: 900, y: 568, w: 48, h: 72, kind: 'stone' },
    { x: 1450, y: 536, w: 48, h: 104, kind: 'stone' },
    { x: 2350, y: 560, w: 64, h: 80, kind: 'stone' },
    { x: 3050, y: 520, w: 48, h: 120, kind: 'stone' },
    { x: 3800, y: 544, w: 64, h: 96, kind: 'stone' },
    { x: 4600, y: 560, w: 48, h: 80, kind: 'stone' },

    // Staircase sections
    { x: 1600, y: 608, w: 80, h: 32, kind: 'stone' },
    { x: 1680, y: 576, w: 80, h: 64, kind: 'stone' },

    // Bridge section
    { x: 2000, y: 580, w: 160, h: 20, kind: 'wood' },

    // Right wall
    { x: 5968, y: 0, w: 32, h: 640, kind: 'stone' },
  ],
  oneWays: [],
  enemies: [
    { id: 'hk-1', x: 600, y: 582, patrolMin: 400, patrolMax: 750 },
    { id: 'hk-2', x: 1100, y: 582, patrolMin: 1070, patrolMax: 1380 },
    { id: 'hk-3', x: 1780, y: 582, patrolMin: 1720, patrolMax: 2000 },
    { id: 'hk-4', x: 2600, y: 582, patrolMin: 2570, patrolMax: 2950 },
    { id: 'hk-5', x: 3400, y: 582, patrolMin: 3320, patrolMax: 3700 },
    { id: 'hk-6', x: 4300, y: 582, patrolMin: 4270, patrolMax: 4650 },
    { id: 'hk-7', x: 5200, y: 582, patrolMin: 5120, patrolMax: 5500 },
  ],
};