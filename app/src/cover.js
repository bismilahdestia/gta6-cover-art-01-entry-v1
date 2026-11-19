// Vice Coast Cover Studio — render engine.
// Draws the multi-panel cover onto any canvas at any size: panels, gradient-map
// grades, bold Anton title, Pacifico neon subtitle, badge ribbon and print effects.
// Pure canvas 2D, no network, no dependencies.

export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    swatch: '#ff2e88',
    stops: [[0, 26, 8, 60], [0.35, 122, 16, 72], [0.65, 255, 46, 136], [1, 255, 179, 71]],
    sky: ['#2b0a4a', '#7a1048', '#ff6a3d'],
  },
  neon: {
    name: 'Neon Night',
    swatch: '#00e5ff',
    stops: [[0, 4, 8, 32], [0.4, 10, 40, 90], [0.7, 0, 229, 255], [1, 255, 46, 136]],
    sky: ['#040820', '#0a2850', '#ff2e88'],
  },
  gold: {
    name: 'Palm Gold',
    swatch: '#ffb347',
    stops: [[0, 43, 24, 8], [0.4, 120, 74, 22], [0.7, 255, 179, 71], [1, 255, 240, 200]],
    sky: ['#2b1808', '#7a4a16', '#ffb347'],
  },
  teal: {
    name: 'Teal Noir',
    swatch: '#2dd4bf',
    stops: [[0, 2, 24, 28], [0.4, 6, 80, 88], [0.7, 45, 212, 191], [1, 220, 252, 245]],
    sky: ['#02181c', '#065a58', '#2dd4bf'],
  },
  pink: {
    name: 'Hot Pink',
    swatch: '#ff5da2',
    stops: [[0, 60, 6, 30], [0.4, 150, 20, 80], [0.7, 255, 93, 162], [1, 255, 255, 255]],
    sky: ['#3c061e', '#961450', '#ff5da2'],
  },
  mono: {
    name: 'Mono Ink',
    swatch: '#e5e5e5',
    stops: [[0, 8, 8, 10], [0.5, 110, 110, 114], [1, 245, 245, 242]],
    sky: ['#08080a', '#3a3a3e', '#e5e5e5'],
  },
};

// Layouts. Each returns panels as fractions of the cover (x, y, w, h) plus an
// optional rotation in degrees and, for the diagonal layout, a clip polygon.
export const LAYOUTS = {
  nine: {
    name: 'Nine-Panel Grid',
    panels(W, H) {
      return [
        { x: 0, y: 0, w: 0.66, h: 0.66 },
        { x: 0.67, y: 0, w: 0.33, h: 0.325 },
        { x: 0.67, y: 0.335, w: 0.33, h: 0.325 },
        { x: 0, y: 0.67, w: 0.325, h: 0.33 },
        { x: 0.335, y: 0.67, w: 0.325, h: 0.33 },
        { x: 0.67, y: 0.67, w: 0.33, h: 0.33 },
      ];
    },
  },
  heroThree: {
    name: 'Hero + Three',
    panels(W, H) {
      return [
        { x: 0, y: 0, w: 0.615, h: 1 },
        { x: 0.625, y: 0, w: 0.375, h: 0.326 },
        { x: 0.625, y: 0.337, w: 0.375, h: 0.326 },
        { x: 0.625, y: 0.674, w: 0.375, h: 0.326 },
      ];
    },
  },
  fullBleed: {
    name: 'Full Bleed',
    panels(W, H) {
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    },
  },
  tilted: {
    name: 'Tilted Snapshots',
    panels(W, H) {
      return [
        { x: 0.03, y: 0.05, w: 0.44, h: 0.62, rot: -6 },
        { x: 0.5, y: 0.03, w: 0.46, h: 0.6, rot: 5 },
        { x: 0.22, y: 0.52, w: 0.56, h: 0.42, rot: -2 },
      ];
    },
  },
  diagonal: {
    name: 'Diagonal Split',
    panels(W, H) {
      return [
        { x: 0, y: 0, w: 1, h: 1, poly: [[0, 0], [0.62, 0], [0.38, 1], [0, 1]] },
        { x: 0, y: 0, w: 1, h: 1, poly: [[0.62, 0], [1, 0], [1, 1], [0.38, 1]] },
      ];
    },
  },
  triptych: {
    name: 'Triptych',
    panels(W, H) {
      return [
        { x: 0, y: 0, w: 0.326, h: 1 },
        { x: 0.337, y: 0, w: 0.326, h: 1 },
        { x: 0.674, y: 0, w: 0.326, h: 1 },
      ];
    },
  },
};

/** Panels (fraction rects) for a layout name. */
export function layoutPanels(name, W, H) {
  const def = LAYOUTS[name] ?? LAYOUTS.nine;
  return def.panels(W, H);
}

/** Builds a 256-entry gradient-map lookup from [pos, r, g, b] stops. */
export function gradientLUT(stops) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = b[0] - a[0] || 1;
    const k = Math.min(1, Math.max(0, (t - a[0]) / span));
    lut[i * 3] = Math.round(a[1] + (b[1] - a[1]) * k);
    lut[i * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * k);
    lut[i * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * k);
  }
  return lut;
}

/** Applies a gradient-map grade to an ImageData in place (88% grade, 12% photo). */
export function applyGrade(imageData, lut) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const j = lum * 3;
    d[i] = Math.round(lut[j] * 0.88 + d[i] * 0.12);
    d[i + 1] = Math.round(lut[j + 1] * 0.88 + d[i + 1] * 0.12);
    d[i + 2] = Math.round(lut[j + 2] * 0.88 + d[i + 2] * 0.12);
  }
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo cover-fit into a rect, with pan offsets and zoom. */
function drawPhotoCover(ctx, img, x, y, w, h, ox, oy, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * (zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2 + (ox || 0) * w, y + (h - dh) / 2 + (oy || 0) * h, dw, dh);
}

/** Placeholder art for an empty panel: sunset gradient, sun disc, horizon bands. */
function drawPlaceholder(ctx, x, y, w, h, grade) {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const cx = x + w * 0.5;
  const cy = y + h * 0.42;
  const r = Math.min(w, h) * 0.22;
  ctx.fillStyle = 'rgba(255, 240, 200, 0.95)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 4; i++) {
    const by = y + h * (0.62 + i * 0.09);
    ctx.fillRect(x, by, w, Math.max(2, h * 0.012));
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `${Math.max(12, Math.round(h * 0.055))}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD A PHOTO', cx, y + h * 0.88);
}

/**
 * Draws one panel (photo or placeholder) graded, clipped to its shape,
 * with a white poster border. `panel` is a fraction rect; `photo` an image or null.
 */
export function drawPanel(ctx, panel, photo, pstate, grade, W, H) {
  const px = panel.x * W;
  const py = panel.y * H;
  const pw = panel.w * W;
  const ph = panel.h * H;
  const lut = gradientLUT(grade.stops);

  // Render the panel content on a scratch canvas so the grade can run on pixels.
  const tmp = document.createElement('canvas');
  tmp.width = Math.max(2, Math.round(pw));
  tmp.height = Math.max(2, Math.round(ph));
  const tctx = tmp.getContext('2d');
  if (photo) drawPhotoCover(tctx, photo, 0, 0, tmp.width, tmp.height, pstate.ox, pstate.oy, pstate.zoom);
  else drawPlaceholder(tctx, 0, 0, tmp.width, tmp.height, grade);
  const imgData = tctx.getImageData(0, 0, tmp.width, tmp.height);
  applyGrade(imgData, lut);
  tctx.putImageData(imgData, 0, 0);

  // Soft warm overlay to keep the sunset feel on every grade.
  tctx.globalCompositeOperation = 'overlay';
  const ov = tctx.createLinearGradient(0, 0, tmp.width, tmp.height);
  ov.addColorStop(0, 'rgba(255,120,80,0.10)');
  ov.addColorStop(1, 'rgba(40,0,80,0.14)');
  tctx.fillStyle = ov;
  tctx.fillRect(0, 0, tmp.width, tmp.height);
  tctx.globalCompositeOperation = 'source-over';

  // Tilted panels cast a soft drop shadow, like snapshots laid on the poster.
  if (panel.rot) {
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate((panel.rot * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = W * 0.02;
    ctx.shadowOffsetY = W * 0.012;
    ctx.fillStyle = '#000';
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([fx, fy], i) => {
      const X = fx * W;
      const Y = fy * H;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.closePath();
  } else if (panel.rot) {
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    ctx.translate(cx, cy);
    ctx.rotate((panel.rot * Math.PI) / 180);
    ctx.rect(-pw / 2, -ph / 2, pw, ph);
  } else {
    ctx.rect(px, py, pw, ph);
  }
  ctx.clip();
  if (panel.poly) {
    // Polygon panels share the full-cover box; draw the temp image stretched
    // across the whole cover so the diagonal cut crops the photo.
    const full = document.createElement('canvas');
    full.width = Math.max(2, Math.round(W));
    full.height = Math.max(2, Math.round(H));
    const fctx = full.getContext('2d');
    if (photo) drawPhotoCover(fctx, photo, 0, 0, W, H, pstate.ox, pstate.oy, pstate.zoom);
    else drawPlaceholder(fctx, 0, 0, W, H, grade);
    const fd = fctx.getImageData(0, 0, full.width, full.height);
    applyGrade(fd, lut);
    fctx.putImageData(fd, 0, 0);
    ctx.drawImage(full, 0, 0);
  } else if (panel.rot) {
    ctx.drawImage(tmp, -pw / 2, -ph / 2, pw, ph);
  } else {
    ctx.drawImage(tmp, px, py, pw, ph);
  }
  ctx.restore();

  // White poster border around the panel.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, W * 0.006);
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([fx, fy], i) => {
      const X = fx * W;
      const Y = fy * H;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.closePath();
  } else if (panel.rot) {
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    ctx.translate(cx, cy);
    ctx.rotate((panel.rot * Math.PI) / 180);
    ctx.rect(-pw / 2, -ph / 2, pw, ph);
  } else {
    ctx.rect(px, py, pw, ph);
  }
  ctx.stroke();
  ctx.restore();
}

/** Fits Anton text to a max width, returning the font size used. */
function fitFont(ctx, text, family, startSize, maxWidth, weight) {
  let size = startSize;
  ctx.font = `${weight || ''} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight || ''} ${size}px ${family}`;
  }
  return size;
}

/** The title block: scrim, big Anton title, Pacifico subtitle, badge ribbon. */
export function drawTitleBlock(ctx, state, grade, W, H) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const bandH = H * 0.26;
  const bandY = H - bandH;

  // Scrim so lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, bandY - H * 0.06, 0, H);
  scrim.addColorStop(0, 'rgba(8,2,18,0)');
  scrim.addColorStop(0.45, 'rgba(8,2,18,0.55)');
  scrim.addColorStop(1, 'rgba(8,2,18,0.9)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - H * 0.06, W, bandH + H * 0.06);

  // Gold rule above the title.
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(W * 0.05, bandY + H * 0.02, W * 0.9, Math.max(3, H * 0.005));

  if (title) {
    const size = fitFont(ctx, title, 'Anton, sans-serif', Math.round(H * 0.115), W * 0.9);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const tx = W / 2;
    const ty = H - H * 0.085;
    if (state.outline === 'dark') {
      ctx.lineWidth = Math.max(3, size * 0.09);
      ctx.strokeStyle = 'rgba(10,2,20,0.9)';
      ctx.lineJoin = 'round';
      ctx.strokeText(title, tx, ty);
    } else if (state.outline === 'neon') {
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.45;
    }
    ctx.fillStyle = state.titleColor || '#ffffff';
    ctx.fillText(title, tx, ty);
    ctx.shadowBlur = 0;
  }

  if (subtitle) {
    const size = fitFont(ctx, subtitle, 'Pacifico, cursive', Math.round(H * 0.042), W * 0.8);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7df9ff';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = size * 0.6;
    ctx.fillText(subtitle, W / 2, H - H * 0.028);
    ctx.shadowBlur = 0;
  }

  if (state.badgeOn && (state.badge || '').trim()) {
    const label = state.badge.trim().toUpperCase();
    const fs = Math.max(12, Math.round(H * 0.024));
    ctx.font = `${fs}px Anton, sans-serif`;
    const tw = ctx.measureText(label).width;
    const bw = tw + fs * 1.6;
    const bh = fs * 2.1;
    const bx = W - bw - W * 0.035;
    const by = H * 0.045;
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.rotate(-0.1);
    const bg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    bg.addColorStop(0, '#ff6a3d');
    bg.addColorStop(1, '#ff2e88');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, H * 0.002);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }
}

/** Film grain: seeded speckles, deterministic per render. */
export function drawGrain(ctx, W, H) {
  const rnd = mulberry32(20261119);
  const count = Math.round((W * H) / 260);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rnd();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  ctx.restore();
}

/** Halftone dots across the lower third, classic poster print. */
export function drawHalftone(ctx, W, H) {
  const gap = Math.max(10, W * 0.014);
  ctx.save();
  for (let y = H * 0.62; y < H; y += gap) {
    for (let x = 0; x < W; x += gap) {
      const k = (y - H * 0.62) / (H * 0.38);
      const r = Math.max(0.6, gap * 0.32 * (0.4 + k));
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.arc(x + gap / 2, y + gap / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Darkened corners, poster vignette. */
export function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.72,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Renders the whole cover onto `canvas` (its own width/height are the output
 * size). `state` is the editor state; `photos` an array of image elements.
 */
export function renderCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;

  // Backdrop: sunset sky gradient so tilted layouts have a scene behind them.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, grade.sky[0]);
  bg.addColorStop(0.55, grade.sky[1]);
  bg.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(state.layout, W, H);
  panels.forEach((panel, i) => {
    const pstate = (state.panels && state.panels[i]) || { photo: null, ox: 0, oy: 0, zoom: 1 };
    const photo = pstate.photo != null ? photos[pstate.photo] : null;
    drawPanel(ctx, panel, photo || null, pstate, grade, W, H);
  });

  drawTitleBlock(ctx, state, grade, W, H);
  if (state.halftone) drawHalftone(ctx, W, H);
  if (state.grain) drawGrain(ctx, W, H);
  if (state.vignette) drawVignette(ctx, W, H);
}
