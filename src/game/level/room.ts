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
  endX: number;
}

/**
 * The graveyard path. A ruined cemetery with uneven terrain, collapsed crypts,
 * and hollow knights guarding the way to Gorbox's arena.
 */
export const ROOM: RoomData = {
  width: 6400,
  height: 720,
  spawn: { x: 80, y: 530 },
  endX: 6000,
  solids: [
    // === Left wall ===
    { x: 0, y: 0, w: 32, h: 640, kind: 'stone' },

    // === Opening area — cobblestone path, slightly raised ===
    { x: 0, y: 600, w: 700, h: 120, kind: 'stone' },

    // === First pit gap (dash-jump needed) ===
    // Landing on the far side
    { x: 900, y: 600, w: 350, h: 120, kind: 'stone' },

    // === Collapsed crypt platform (mid-air) ===
    { x: 1100, y: 520, w: 80, h: 24, kind: 'stone' },

    // === Graveyard ground section with uneven terrain ===
    { x: 1400, y: 620, w: 500, h: 100, kind: 'stone' },
    // Low tombstone step
    { x: 1550, y: 588, w: 60, h: 32, kind: 'stone' },
    // Higher tomb platform
    { x: 1750, y: 548, w: 48, h: 72, kind: 'stone' },

    // === Second gap over sunken graves ===
    { x: 2100, y: 620, w: 400, h: 100, kind: 'stone' },
    // Mid-gap crumbling pillar (stepping stone across the gap)
    { x: 1980, y: 540, w: 40, h: 80, kind: 'stone' },

    // === Mausoleum ruins — multi-level ===
    { x: 2650, y: 640, w: 600, h: 80, kind: 'stone' },
    // Mausoleum floor (raised)
    { x: 2750, y: 560, w: 180, h: 20, kind: 'stone' },
    // Mausoleum wall stub
    { x: 2680, y: 480, w: 24, h: 100, kind: 'stone' },
    { x: 2900, y: 480, w: 24, h: 100, kind: 'stone' },
    // Collapsed roof beam (bridge)
    { x: 3100, y: 580, w: 120, h: 16, kind: 'wood' },

    // === Crypt staircase ===
    { x: 3300, y: 640, w: 500, h: 80, kind: 'stone' },
    { x: 3350, y: 608, w: 80, h: 32, kind: 'stone' },
    { x: 3430, y: 576, w: 80, h: 64, kind: 'stone' },

    // === Lower catacomb path ===
    { x: 3900, y: 660, w: 400, h: 60, kind: 'stone' },
    // Broken archway pillars
    { x: 3950, y: 560, w: 24, h: 100, kind: 'stone' },
    { x: 4200, y: 560, w: 24, h: 100, kind: 'stone' },

    // === Ascent back up ===
    { x: 4400, y: 640, w: 500, h: 80, kind: 'stone' },
    { x: 4550, y: 572, w: 80, h: 32, kind: 'stone' },

    // === Final approach to boss arena ===
    { x: 5000, y: 620, w: 400, h: 100, kind: 'stone' },
    // Boss arena floor — wide and flat
    { x: 5500, y: 600, w: 900, h: 120, kind: 'stone' },

    // Arena pillars (decorative)
    { x: 5550, y: 440, w: 32, h: 160, kind: 'stone' },
    { x: 5850, y: 440, w: 32, h: 160, kind: 'stone' },
    { x: 6150, y: 440, w: 32, h: 160, kind: 'stone' },

    // === Right wall ===
    { x: 6368, y: 0, w: 32, h: 640, kind: 'stone' },
  ],
  oneWays: [
    // Crumbling wooden plank over first pit
    { x: 740, y: 584, w: 120, h: 10 },
    // Fallen crypt door over second gap
    { x: 2100, y: 600, w: 80, h: 10 },
  ],
  enemies: [
    { id: 'hk-1', x: 500, y: 542, patrolMin: 300, patrolMax: 650 },
    { id: 'hk-2', x: 1200, y: 542, patrolMin: 950, patrolMax: 1380 },
    { id: 'hk-3', x: 1500, y: 562, patrolMin: 1420, patrolMax: 1750 },
    { id: 'hk-4', x: 2200, y: 562, patrolMin: 2130, patrolMax: 2450 },
    { id: 'hk-5', x: 2700, y: 582, patrolMin: 2670, patrolMax: 2950 },
    { id: 'hk-6', x: 3400, y: 582, patrolMin: 3320, patrolMax: 3650 },
    { id: 'hk-7', x: 4000, y: 602, patrolMin: 3920, patrolMax: 4250 },
    { id: 'hk-8', x: 4600, y: 582, patrolMin: 4420, patrolMax: 4750 },
    { id: 'hk-9', x: 5100, y: 562, patrolMin: 5020, patrolMax: 5350 },
  ],
};