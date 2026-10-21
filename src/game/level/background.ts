import { Actor, Canvas, vec, type Scene, type Vector } from 'excalibur';
import { hash2 } from '../util/math';

interface Layer {
  actor: Actor;
  factor: number;
  baseX: number;
  baseY: number;
}

/**
 * Dark Souls 3 inspired parallax background: a moonlit sky, distant
 * cathedral ruins, misty cliffs, and skeletal trees.
 */
export class Background {
  private layers: Layer[] = [];

  constructor(scene: Scene) {
    this.addLayer(scene, skyGraphic(), 1, -1000);
    this.addLayer(scene, ruinsGraphic(), 0.7, -900);
    this.addLayer(scene, mistGraphic(), 0.55, -850);
    this.addLayer(scene, foregroundGraphic(), 0.35, -780);
  }

  update(cameraPos: Vector): void {
    for (const layer of this.layers) {
      layer.actor.pos = vec(
        layer.baseX + cameraPos.x * layer.factor,
        layer.baseY + cameraPos.y * layer.factor,
      );
    }
  }

  private addLayer(scene: Scene, graphic: Canvas, factor: number, z: number): void {
    const actor = new Actor({
      x: 0,
      y: 0,
      anchor: vec(0, 0),
      z,
      graphic,
    });
    scene.add(actor);
    const l = { actor, factor, baseX: 0, baseY: 0 } as Layer;
    this.layers.push(l);
  }
}

function skyGraphic(): Canvas {
  return new Canvas({
    width: 2560,
    height: 720,
    cache: true, quality: 1,
    draw: (ctx) => {
      const sky = ctx.createLinearGradient(0, 0, 0, 720);
      sky.addColorStop(0, '#030508');
      sky.addColorStop(0.35, '#080d18');
      sky.addColorStop(0.6, '#121926');
      sky.addColorStop(0.82, '#1e242e');
      sky.addColorStop(1, '#1a1c22');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 2560, 720);

      // Stars
      for (let i = 0; i < 100; i++) {
        const x = hash2(i, 1, 41) * 2560;
        const y = hash2(i, 2, 41) * 400;
        const alpha = 0.1 + hash2(i, 3, 41) * 0.5;
        const r = 0.5 + hash2(i, 4, 41) * 1.2;
        ctx.fillStyle = `rgba(200, 210, 230, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distant red moon
      const halo = ctx.createRadialGradient(1800, 120, 25, 1800, 120, 160);
      halo.addColorStop(0, 'rgba(200, 80, 40, 0.15)');
      halo.addColorStop(0.5, 'rgba(200, 80, 40, 0.05)');
      halo.addColorStop(1, 'rgba(200, 80, 40, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(1600, 0, 400, 300);

      ctx.fillStyle = '#c04830';
      ctx.beginPath();
      ctx.arc(1800, 120, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(160, 60, 30, 0.3)';
      ctx.beginPath();
      ctx.arc(1790, 108, 12, 0, Math.PI * 2);
      ctx.arc(1815, 135, 8, 0, Math.PI * 2);
      ctx.fill();

      // Thin cloud bands
      ctx.fillStyle = 'rgba(60, 50, 60, 0.04)';
      for (let i = 0; i < 6; i++) {
        const y = 200 + i * 60 + hash2(i, 8, 5) * 20;
        ctx.beginPath();
        ctx.ellipse(300 + i * 300, y, 280, 8 + i * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  });
}

function ruinsGraphic(): Canvas {
  const width = 3000;
  return new Canvas({
    width, height: 720,
    cache: true, quality: 1,
    draw: (ctx) => {
      // Distant cathedral silhouette
      ctx.fillStyle = '#0a101a';
      for (let i = 0; i < 8; i++) {
        const x = 200 + i * 350 + hash2(i, 3, 7) * 80;
        const h = 80 + hash2(i, 5, 7) * 140;
        const w = 40 + hash2(i, 7, 7) * 30;
        ctx.fillRect(x, 720 - h, w, h);
        // Spire
        ctx.beginPath();
        ctx.moveTo(x - 5, 720 - h);
        ctx.lineTo(x + w / 2, 720 - h - 35 - hash2(i, 9, 7) * 40);
        ctx.lineTo(x + w + 5, 720 - h);
        ctx.fill();
      }

      // Ground ridge
      ctx.fillStyle = '#0c141e';
      ctx.beginPath();
      ctx.moveTo(0, 720);
      for (let x = 0; x < width; x += 20) {
        const y = 610 - Math.sin(x * 0.003 + 0.7) * 25 - Math.sin(x * 0.008 + 1.2) * 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, 720);
      ctx.closePath();
      ctx.fill();
    },
  });
}

function mistGraphic(): Canvas {
  return new Canvas({
    width: 3200,
    height: 720,
    cache: true, quality: 1,
    draw: (ctx) => {
      for (let i = 0; i < 8; i++) {
        const y = 380 + i * 35;
        const band = ctx.createLinearGradient(0, y, 0, y + 30);
        band.addColorStop(0, 'rgba(100, 120, 140, 0)');
        band.addColorStop(0.4, `rgba(100, 120, 140, ${0.015 + i * 0.004})`);
        band.addColorStop(1, 'rgba(100, 120, 140, 0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, y, 3200, 30);
      }
    },
  });
}

function foregroundGraphic(): Canvas {
  const width = 4000;
  return new Canvas({
    width, height: 720,
    cache: true, quality: 1,
    draw: (ctx) => {
      // Skeletal dead trees in silhouette
      for (let i = 0; i < 14; i++) {
        const x = hash2(i, 2, 13) * width;
        const height = 80 + hash2(i, 7, 13) * 120;
        const lean = (hash2(i, 3, 13) - 0.5) * 40;

        ctx.globalAlpha = 0.15 + hash2(i, 11, 13) * 0.2;
        ctx.strokeStyle = '#05080e';
        ctx.lineWidth = 3 + hash2(i, 9, 13) * 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, 720);
        ctx.quadraticCurveTo(x + lean * 0.3, 720 - height * 0.5, x + lean, 720 - height);
        ctx.stroke();

        // Branches
        for (let b = 0; b < 3; b++) {
          const by = 720 - height * (0.3 + b * 0.2);
          const dir = hash2(i, b + 20, 13) > 0.5 ? 1 : -1;
          ctx.strokeStyle = '#05080e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + lean * 0.5, by);
          ctx.quadraticCurveTo(x + dir * 15 + lean * 0.3, by - 10, x + dir * 25, by + 5);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
  });
}