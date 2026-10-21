import type { PlayerController } from '../player/PlayerController';
import type { Mettle } from '../systems/Mettle';

type ToastTone = 'amber' | 'red' | '';

export class Hud {
  private readonly mettleValue = mustGet<HTMLElement>('mettle-value');
  private readonly mettleFill = mustGet<HTMLElement>('mettle-fill');
  private readonly staminaFill = mustGet<HTMLElement>('stamina-fill');
  private readonly healthFill = mustGet<HTMLElement>('health-fill');
  private readonly healthValue = mustGet<HTMLElement>('health-value');
  private readonly toastEl = mustGet<HTMLElement>('toast');
  private readonly flashEl = mustGet<HTMLElement>('flash');
  private readonly debugEl = mustGet<HTMLElement>('debug');
  private readonly debugBody = mustGet<HTMLElement>('debug-body');

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  update(mettle: Mettle, controller: PlayerController): void {
    const mettleRatio = mettle.ratio;
    this.mettleValue.textContent = `${Math.round(mettleRatio * 100)}%`;
    this.mettleFill.style.width = `${mettleRatio * 100}%`;
    if (mettle.broken) {
      this.mettleFill.style.background = '#8a6a4a';
    } else if (mettleRatio < 0.25) {
      this.mettleFill.style.background = '#d08050';
    } else {
      this.mettleFill.style.background = '#5a8fc4';
    }

    // Stamina is just mettle visualization
    const staminaRatio = mettleRatio;
    this.staminaFill.style.width = `${staminaRatio * 100}%`;

    const healthRatio = Math.max(0, Math.min(1, controller.health / controller.maxHealth));
    this.healthFill.style.width = `${healthRatio * 100}%`;
    this.healthFill.style.background = healthRatio > 0.5 ? '#8a3a2a' : healthRatio > 0.25 ? '#b05a30' : '#d03020';
    this.healthValue.textContent = `${Math.ceil(controller.health)}`;
  }

  toast(text: string, tone: ToastTone = 'amber'): void {
    if (this.toastTimer) { clearTimeout(this.toastTimer); this.toastTimer = null; }
    this.toastEl.textContent = text;
    this.toastEl.className = `toast show ${tone}`.trim();
    this.toastTimer = setTimeout(() => { this.toastEl.classList.remove('show'); this.toastTimer = null; }, 1550);
  }

  flash(): void {
    this.flashEl.classList.remove('show');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('show');
  }

  setDebugVisible(visible: boolean): void {
    this.debugEl.hidden = !visible;
  }

  setDebugText(text: string): void {
    this.debugBody.textContent = text;
  }
}

function mustGet<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`HUD element #${id} is missing from the document`);
  return el as T;
}