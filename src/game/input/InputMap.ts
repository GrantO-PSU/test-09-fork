import { Keys, type Engine, type KeyEvent } from 'excalibur';
import type { PlayerInput } from '../player/PlayerController';

interface Callbacks {
  onToggleDebug: () => void;
}

type EdgeAction = 'jump' | 'roll' | 'attack' | 'parry';

interface Held {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  roll: boolean;
  attack: boolean;
  parry: boolean;
  ctrl: boolean;
}

const NONE: Held = {
  left: false, right: false, down: false,
  jump: false, roll: false, attack: false, parry: false,
  ctrl: false,
};

export class InputMap {
  private previous: Held = { ...NONE };
  private latched = new Set<EdgeAction>();

  constructor(
    private readonly engine: Engine,
    private readonly callbacks: Callbacks,
  ) {
    this.engine.input.keyboard.on('press', this.handleKeyPress);
  }

  sample(): PlayerInput {
    const kb = this.engine.input.keyboard;

    const held: Held = {
      left: kb.isHeld(Keys.A),
      right: kb.isHeld(Keys.D),
      down: kb.isHeld(Keys.S),
      jump: kb.isHeld(Keys.W),
      roll: kb.isHeld(Keys.ShiftLeft) || kb.isHeld(Keys.ShiftRight),
      attack: kb.isHeld(Keys.J),
      parry: kb.isHeld(Keys.K),
      ctrl: kb.isHeld(Keys.ControlLeft) || kb.isHeld(Keys.ControlRight),
    };

    // Roll = CTRL + left/right
    const rollTriggered =
      held.ctrl && (held.left || held.right) &&
      !(this.previous.ctrl && (this.previous.left || this.previous.right));

    const result: PlayerInput = {
      left: held.left,
      right: held.right,
      down: held.down,
      jump: held.jump,
      jumpPressed: this.latched.has('jump') || (held.jump && !this.previous.jump),
      rollHeld: held.roll,
      rollPressed: this.latched.has('roll') || rollTriggered,
      attackPressed: this.latched.has('attack') || (held.attack && !this.previous.attack),
      parryPressed: this.latched.has('parry') || (held.parry && !this.previous.parry),
      crouch: held.down && !this.previous.down,
    };

    this.latched.clear();
    this.previous = held;
    return result;
  }

  private readonly handleKeyPress = (event: KeyEvent): void => {
    switch (event.key) {
      case Keys.W:
        this.latched.add('jump');
        break;
      case Keys.ShiftLeft:
      case Keys.ShiftRight:
        this.latched.add('roll');
        break;
      case Keys.J:
        this.latched.add('attack');
        break;
      case Keys.K:
        this.latched.add('parry');
        break;
      case Keys.F1:
        this.callbacks.onToggleDebug();
        break;
    }
  };
}