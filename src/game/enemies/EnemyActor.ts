import { Actor, CollisionType, vec, type Canvas } from 'excalibur';
import type { HostileController } from './EnemyController';
import { EnemyRig } from './EnemyRig';

/** A procedural visual that follows a hostile controller. */
export interface HostileRig {
  readonly graphic: Canvas;
  update(dt: number, controller: HostileController): void;
}

export class EnemyActor extends Actor {
  readonly controller: HostileController;
  private readonly rig: HostileRig;

  constructor(controller: HostileController, name = 'hollow-knight', rig?: HostileRig) {
    super({
      name,
      width: controller.body.w,
      height: controller.body.h,
      anchor: vec(0.5, 0.5),
      collisionType: CollisionType.Passive,
      z: 15,
    });
    this.controller = controller;
    this.rig = rig ?? new EnemyRig(controller);
    this.graphics.add(this.rig.graphic);
  }

  sync(dt: number): void {
    const body = this.controller.body;
    this.pos = vec(body.x + body.w / 2, body.y + body.h / 2);
    this.rig.update(dt, this.controller);

    if (this.controller.state === 'dead') {
      this.graphics.opacity = Math.max(0.05, 1 - this.controller.deathProgress * 0.95);
    } else {
      this.graphics.opacity = 1;
    }
    this.graphics.visible = !this.controller.removed;
  }

  resetVisual(): void {
    this.sync(0);
  }
}
