import { Actor, CollisionType, vec } from 'excalibur';
import { PLAYER } from '../config';
import { KnightRig } from './KnightRig';
import type { PlayerController } from './PlayerController';

export class PlayerActor extends Actor {
  private readonly rig = new KnightRig();

  constructor() {
    super({
      name: 'knight',
      width: PLAYER.width,
      height: PLAYER.height,
      anchor: vec(0.5, 0.5),
      collisionType: CollisionType.Passive,
      z: 20,
    });
    this.graphics.add(this.rig.graphic);
  }

  sync(controller: PlayerController, dt: number): void {
    const body = controller.body;
    this.pos = vec(body.x + body.w / 2, body.y + body.h / 2);
    this.rig.update(dt, controller);

    if (controller.isDead) {
      this.graphics.opacity = 0.45;
    } else if (controller.invulnerable > 0) {
      this.graphics.opacity = Math.sin(controller.time * 55) > 0 ? 0.35 : 1;
    } else {
      this.graphics.opacity = 1;
    }
  }
}