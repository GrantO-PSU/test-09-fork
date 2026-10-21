import { Canvas } from 'excalibur';
import { hash2 } from '../util/math';

export function stoneGraphic(width: number, height: number): Canvas {
  return new Canvas({
    width, height,
    cache: true, quality: 1,
    draw: (ctx) => {
      ctx.fillStyle = '#1a2028';
      ctx.fillRect(0, 0, width, height);

      const tile = 32;
      for (let y = 0; y < height; y += tile) {
        const offset = Math.floor(y / tile) % 2 === 0 ? 0 : -16;
        for (let x = offset - tile; x < width + tile; x += tile) {
          const n = hash2(x, y, 11);
          const shade = 26 + Math.floor(n * 10);
          ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 10})`;
          ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
          ctx.fillRect(x + 1, y + 1, tile - 2, 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.fillRect(x + 1, y + tile - 3, tile - 2, 2);

          if (n > 0.85) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const cx = x + 7 + n * 14;
            ctx.moveTo(cx, y + 5);
            ctx.lineTo(cx + 3, y + 14);
            ctx.lineTo(cx + 1, y + 22);
            ctx.stroke();
          }
        }
      }

      // Dark moss / lichen
      ctx.fillStyle = '#1a2a1a';
      ctx.fillRect(0, 0, width, 2);
      for (let x = 0; x < width; x += 8) {
        const n = hash2(x, 0, 5);
        const tuft = 1 + Math.floor(n * 5);
        ctx.fillStyle = n > 0.5 ? '#1a2e20' : '#142618';
        ctx.fillRect(x, 0, 3, tuft);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, 2, height);
      ctx.fillRect(width - 2, 0, 2, height);
    },
  });
}

export function woodGraphic(width: number, height: number): Canvas {
  return new Canvas({
    width, height,
    cache: true, quality: 1,
    draw: (ctx) => {
      ctx.fillStyle = '#2a1a12';
      ctx.fillRect(0, 0, width, height);

      const plankHeight = Math.max(8, Math.min(16, height / 2));
      for (let y = 0; y < height; y += plankHeight) {
        const n = hash2(y, 0, 3);
        ctx.fillStyle = n > 0.5 ? '#3a2218' : '#321e16';
        ctx.fillRect(0, y + 1, width, plankHeight - 2);
        ctx.fillStyle = 'rgba(180, 120, 80, 0.08)';
        ctx.fillRect(0, y + 1, width, 1);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, y + plankHeight - 2, width, 1);
      }

      for (let i = 0; i < Math.max(2, Math.floor(width / 55)); i++) {
        const y = 3 + hash2(i, 2, 9) * (height - 6);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hash2(i, 1, 2) * 12, y);
        ctx.lineTo(width - hash2(i, 4, 2) * 12, y + 1);
        ctx.stroke();
      }

      ctx.fillStyle = '#1e1a18';
      ctx.fillRect(2, 0, 3, height);
      ctx.fillRect(width - 5, 0, 3, height);
      ctx.fillStyle = '#2a1a12';
      ctx.fillRect(0, 0, width, 2);
    },
  });
}

export function ruinedPillarGraphic(width: number, height: number): Canvas {
  return new Canvas({
    width, height,
    cache: true, quality: 1,
    draw: (ctx) => {
      ctx.fillStyle = '#1a1a26';
      ctx.fillRect(0, 0, width, height);

      // Stone block lines
      const hCount = Math.max(2, Math.floor(width / 24));
      const vCount = Math.max(2, Math.floor(height / 16));
      for (let v = 0; v < vCount; v++) {
        for (let h = 0; h < hCount; h++) {
          const n = hash2(h, v, 7);
          const bx = h * (width / hCount);
          const by = v * (height / vCount);
          ctx.fillStyle = `rgba(26, 26, 40, ${0.5 + n * 0.5})`;
          ctx.fillRect(bx + 1, by + 1, width / hCount - 2, height / vCount - 2);
        }
      }

      // Crack
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(4, height * 0.3);
      ctx.lineTo(width * 0.5, height * 0.55);
      ctx.lineTo(width - 4, height * 0.7);
      ctx.stroke();

      // Moss at top
      ctx.fillStyle = '#121e18';
      ctx.fillRect(0, 0, width, 3);
    },
  });
}

export function bridgeGraphic(width: number, height: number): Canvas {
  return woodGraphic(width, height);
}

export function backgroundTerrain(width: number, height: number): Canvas {
  return new Canvas({
    width, height,
    cache: true, quality: 1,
    draw: (ctx) => {
      // Silhouette of distant ruins
      ctx.fillStyle = '#0a0e18';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x < width; x += 16) {
        const y = height - 20 -
          Math.sin(x * 0.02 + 0.5) * 15 -
          Math.sin(x * 0.008 + 1.3) * 25;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Occasional broken tower silhouette
      for (let i = 0; i < 4; i++) {
        const tx = 200 + i * 700 + hash2(i, 5, 3) * 400;
        const th = 60 + hash2(i, 7, 3) * 80;
        ctx.fillStyle = '#080c14';
        ctx.fillRect(tx, height - th, 20 + hash2(i, 3, 7) * 25, th);
        ctx.fillRect(tx - 5, height - th + 10, 8, th - 15);
      }
    },
  });
}