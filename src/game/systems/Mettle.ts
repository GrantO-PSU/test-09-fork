import { COMBAT } from '../config';

export interface MettleState {
  value: number;
  /** Is the mettle gauge broken (depleted)? */
  broken: boolean;
  breakTimer: number;
}

/**
 * Mettle = fighting spirit. It replaces the old "buzz" system with something
 * closer to a stamina/poise hybrid. Attacking, parrying and rolling all cost
 * mettle. When it breaks, the knight is vulnerable briefly before it recharges.
 */
export class Mettle {
  value: number;
  max: number;
  breakTimer: number = 0;

  constructor() {
    this.max = COMBAT.mettleMax;
    this.value = this.max;
  }

  get broken(): boolean {
    return this.value <= 0;
  }

  get ratio(): number {
    return this.value / this.max;
  }

  get isRecharging(): boolean {
    return this.breakTimer > 0;
  }

  /** Returns true if the action was affordable and consumed mettle. */
  spend(amount: number): boolean {
    if (this.value < amount || this.value <= 0) {
      return false;
    }
    this.value = Math.max(0, this.value - clampCost(amount));
    if (this.value <= 0) {
      this.breakTimer = 1.2;
    }
    return true;
  }

  update(dt: number): void {
    if (this.breakTimer > 0) {
      this.breakTimer -= dt;
      if (this.breakTimer <= 0) {
        this.value = this.max * 0.5;
      }
      return;
    }

    if (this.value < this.max) {
      this.value = Math.min(this.max, this.value + COMBAT.mettleRechargePerSecond * dt);
    }
  }

  reset(): void {
    this.value = this.max;
    this.breakTimer = 0;
  }
}

function clampCost(amount: number): number {
  return Math.max(1, Math.round(amount));
}