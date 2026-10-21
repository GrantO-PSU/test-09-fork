import { Actor, Canvas, vec, type Scene, type Vector } from 'excalibur';
import { hash2 } from '../util/math';

interface Layer {
  actor: Actor;
  factor: number;
  baseX: number;
  baseY: number;
}

/**
 * Dark Souls 3 inspired graveyard parallax background: stormy moonlit sky,
 * distant cathedral ruins, leaning tombstones, and skeletal trees.
 */
export class Background {
  private layers: Layer[] = [];

  constructor(scene: Scene) {
    this.addLayer(scene, skyGraphic(), 1, -1000);
    this.addLayer(scene, ruinsGraphic(), 0.7, -900);
    this.addLayer(scene, graveyardGraphic(), 0.5, -850);
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
      x: 0, y: 0,
      anchor: vec(0, 0),
      z, graphic,
    });
    scene.add(actor);
    const l = { actor, factor, baseX: 0, baseY: 0 } as Layer;
    this.layers.push(l);
  }
}

function skyGraphic(): Canvas {
  return new Canvas({
    width: 2560, height: 720,
    cache: true, quality: 1,
    draw: (ctx) => {
      const sky = ctx.createLinearGradient(0, 0, 0, 720);
      sky.addColorStop(0, '#020408');
      sky.addColorStop(0.3, '#060a14');
      sky.addColorStop(0.55, '#0e1520');
      sky.addColorStop(0.8, '#1a202a');
      sky.addColorStop(1, '#181c22');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 2560, 720);

      // Storm clouds rolling in
      for (let i = 0; i < 12; i++) {
        const cx = hash2(i, 0, 31) * 2560;
        const cy = 60 + hash2(i, 1, 31) * 200;
        const rw = 120 + hash2(i, 2, 31) * 200;
        const rh = 20 + hash2(i, 3, 31) * 35;
        const alpha = 0.06 + hash2(i, 4, 31) * 0.08;
        ctx.fillStyle = `rgba(30, 25, 40, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stars
      for (let i = 0; i < 80; i++) {
        const x = hash2(i, 1, 41) * 2560;
        const y = hash2(i, 2, 41) * 380;
        const alpha = 0.08 + hash2(i, 3, 41) * 0.45;
        const r = 0.4 + hash2(i, 4, 41) * 1.0;
        ctx.fillStyle = `rgba(180, 190, 210, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sickly green moon
      const halo = ctx.createRadialGradient(1900, 140, 28, 1900, 140, 180);
      halo.addColorStop(0, 'rgba(180, 200, 140, 0.12)');
      halo.addColorStop(0.5, 'rgba(180, 200, 140, 0.04)');
      halo.addColorStop(1, 'rgba(180, 200, 140, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(1700, 0, 400, 320);

      ctx.fillStyle = '#b8c890';
      ctx.beginPath();
      ctx.arc(1900, 140, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(140, 160, 100, 0.25)';
      ctx.beginPath();
      ctx.arc(1890, 128, 10, 0, Math.PI * 2);
      ctx.arc(1915, 155, 7, 0, Math.PI * 2);
      ctx.fill();

      // Thin cloud veil over moon
      ctx.fillStyle = 'rgba(40, 35, 45, 0.05)';
      ctx.beginPath();
      ctx.ellipse(1900, 160, 260, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  });
}

function ruinsGraphic(): Canvas {
  const width = 3000;
  return new Canvas({
    width, height: 720,
    cache: true, quality: 1,
    draw: (ctx) => {
      // Distant cathedral ruins silhouette
      ctx.fillStyle = '#080c14';
      for (let i = 0; i < 6; i++) {
        const x = 150 + i * 450 + hash2(i, 3, 7) * 100;
        const h = 90 + hash2(i, 5, 7) * 150;
        const w = 35 + hash2(i, 7, 7) * 25;
        ctx.fillRect(x, 720 - h, w, h);
        // Broken spire
        ctx.beginPath();
        ctx.moveTo(x - 3, 720 - h + 10);
        ctx.lineTo(x + w / 2, 720 - h - 25 - hash2(i, 9, 7) * 35);
        ctx.lineTo(x + w + 3, 720 - h + 10);
        ctx.fill();
        // Broken window arch
        ctx.fillStyle = '#04060a';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, 720 - h * 0.6, w * 0.3, h * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#080c14';
      }

      // Ground ridge
      ctx.fillStyle = '#0a1018';
      ctx.beginPath();
      ctx.moveTo(0, 720);
      for (let x = 0; x < width; x += 20) {
        const y = 615 - Math.sin(x * 0.003 + 0.7) * 22 - Math.sin(x * 0.008 + 1.2) * 12;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, 720);
      ctx.closePath();
      ctx.fill();
    },
  });
}

function graveyardGraphic(): Canvas {
  const width = 3500;
  return new Canvas({
    width, height: 720,
    cache: true, quality: 1,
    draw: (ctx) => {
      // Fallen tombstones and grave markers
      for (let i = 0; i < 25; i++) {
        const x = hash2(i, 0, 17) * width;
        const baseY = 540 + hash2(i, 2, 17) * 120;
        const size = 8 + hash2(i, 3, 17) * 18;
        const lean = (hash2(i, 4, 17) - 0.5) * 0.4;
        const broken = hash2(i, 5, 17) > 0.7;

        ctx.globalAlpha = 0.25 + hash2(i, 6, 17) * 0.25;
        ctx.fillStyle = '#0a0e16';

        if (broken) {
          // Broken tombstone
          ctx.save();
          ctx.translate(x, baseY);
          ctx.rotate(lean + 0.3);
          ctx.fillRect(-size * 0.4, -size * 0.6, size * 0.8, size * 0.4);
          ctx.fillRect(size * 0.2, -size * 0.2, size * 0.3, size * 0.3);
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(x, baseY);
          ctx.rotate(lean);
          ctx.fillRect(-size * 0.3, -size, size * 0.6, size);
          // Rounded top
          ctx.beginPath();
          ctx.arc(0, -size, size * 0.3, Math.PI, 0);
          ctx.fill();
          ctx.restore();
        }
      }

      // Broken mausoleum / crypt entrance
      for (let i = 0; i < 3; i++) {
        const x = 500 + i * 1000 + hash2(i, 8, 5) * 200;
        const h = 50 + hash2(i, 9, 5) * 40;
        ctx.globalAlpha = 0.3 + hash2(i, 10, 5) * 0.15;
        ctx.fillStyle = '#0c101a';
        ctx.fillRect(x, 720 - h, 35 + hash2(i, 11, 5) * 20, h);
        ctx.fillRect(x + 5, 720 - h + 8, 25, h - 16);
      }

      // Mist wisps between graves
      ctx.globalAlpha = 0.035;
      ctx.fillStyle = '#607080';
      for (let i = 0; i < 5; i++) {
        const y = 520 + hash2(i, 12, 5) * 100;
        ctx.beginPath();
        ctx.ellipse(hash2(i, 13, 5) * width, y, 180 + hash2(i, 14, 5) * 100, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  });
}

function foregroundGraphic(): Canvas {
  const width = 4000;
  return new Canvas({
    width, height: 720,
    cache: true, quality: 1,
    draw: (ctx) => {
      // Dead twisted trees
      for (let i = 0; i < 12; i++) {
        const x = hash2(i, 2, 13) * width;
        const h = 70 + hash2(i, 7, 13) * 110;
        const lean = (hash2(i, 3, 13) - 0.5) * 35;

        ctx.globalAlpha = 0.2 + hash2(i, 11, 13) * 0.2;
        ctx.strokeStyle = '#04060a';
        ctx.lineWidth = 3 + hash2(i, 9, 13) * 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, 720);
        ctx.quadraticCurveTo(x + lean * 0.3, 720 - h * 0.5, x + lean, 720 - h);
        ctx.stroke();

        // Twisted branches
        for (let b = 0; b < 3; b++) {
          const by = 720 - h * (0.3 + b * 0.2);
          const dir = hash2(i, b + 20, 13) > 0.5 ? 1 : -1;
          ctx.strokeStyle = '#04060a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + lean * 0.5, by);
          ctx.quadraticCurveTo(x + dir * 12 + lean * 0.3, by - 8, x + dir * 20, by + 4);
          ctx.stroke();
        }
      }

      // Crumbling fence posts at the edges
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#080c12';
      for (let i = 0; i < 8; i++) {
        const x = i * 500 + 100;
        ctx.fillRect(x, 700, 5, 20);
        ctx.fillRect(x + 2, 690, 3, 30);
      }

      ctx.globalAlpha = 1;
    },
  });
}