// Vice Coast Cover Studio — editor wiring.
// State, photo tray, panel selection, drag-to-pan, zoom, undo/redo and PNG export.
// All photos stay on the device: FileReader and local sample files only.
import { GRADES, LAYOUTS, layoutPanels, renderCover } from './cover.js';
import { runShot } from './shots.js';

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
};

const DEFAULT_PANELS = (n) => Array.from({ length: n }, () => ({ photo: null, ox: 0, oy: 0, zoom: 1 }));

function defaultState() {
  return {
    layout: 'nine',
    grade: 'sunset',
    title: 'VICE COAST',
    subtitle: 'sunset over the strip',
    badge: 'EST. 2026',
    titleColor: '#ffffff',
    outline: 'dark',
    badgeOn: true,
    grain: true,
    halftone: false,
    vignette: true,
    size: '1080x1080',
    selected: 0,
    panels: DEFAULT_PANELS(6),
  };
}

let state = defaultState();
let photos = []; // [{ img, name }]
let undoStack = [];
let redoStack = [];
let pickedPhoto = null; // index into photos, chosen in the tray

const canvas = document.getElementById('cover');
const tray = document.getElementById('tray');
const status = document.getElementById('status');
const panelHint = document.getElementById('panelHint');
const overlay = document.getElementById('panelOverlay');
const sizeLabel = document.getElementById('sizeLabel');

let fontsReady = false;
async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('16px Anton'),
      document.fonts.load('16px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to generic fonts; lettering still renders */ }
  fontsReady = true;
}

/** Pushes the current state onto the undo stack before a change. */
function pushHistory() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function syncUndoButtons() {
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(state));
  state = JSON.parse(undoStack.pop());
  syncControls();
  render();
  syncUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(state));
  state = JSON.parse(redoStack.pop());
  syncControls();
  render();
  syncUndoButtons();
}

/** Resizes the panel-state array when the layout's panel count changes. */
function resizePanels() {
  const n = layoutPanels(state.layout, 1, 1).length;
  const next = DEFAULT_PANELS(n);
  for (let i = 0; i < Math.min(n, state.panels.length); i++) next[i] = state.panels[i];
  state.panels = next;
  if (state.selected >= n) state.selected = 0;
}

function previewSize() {
  // Preview at half the export size: fast enough to grade live, sharp on screen.
  const s = SIZES[state.size];
  return { w: Math.round(s.w / 2), h: Math.round(s.h / 2) };
}

async function render() {
  await ensureFonts();
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(canvas, state, photos.map((p) => p.img));
  drawSelectionOverlay();
  updatePanelHint();
}

function drawSelectionOverlay() {
  overlay.innerHTML = '';
  const panels = layoutPanels(state.layout, 1, 1);
  const p = panels[state.selected];
  if (!p) return;
  const box = document.createElement('div');
  box.className = 'hot';
  box.style.left = `${p.x * 100}%`;
  box.style.top = `${p.y * 100}%`;
  box.style.width = `${p.w * 100}%`;
  box.style.height = `${p.h * 100}%`;
  if (p.rot) box.style.transform = `rotate(${p.rot}deg)`;
  overlay.appendChild(box);
}

function updatePanelHint() {
  const p = state.panels[state.selected];
  if (!p) { panelHint.textContent = 'No panel selected — click a panel on the cover.'; return; }
  const hasPhoto = p.photo != null;
  panelHint.textContent = hasPhoto
    ? `Panel ${state.selected + 1}: ${photos[p.photo]?.name ?? 'photo'} — drag to pan, slide to zoom.`
    : `Panel ${state.selected + 1} is empty — pick a photo in the tray to fill it.`;
}

/** Loads an image element from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Adds a loaded image to the tray and returns its index. */
function addPhoto(img, name) {
  const idx = photos.length;
  photos.push({ img, name });
  const thumb = document.createElement('img');
  thumb.src = img.src;
  thumb.alt = name;
  thumb.title = name;
  thumb.addEventListener('click', () => {
    pickedPhoto = idx;
    [...tray.querySelectorAll('img')].forEach((t) => t.classList.remove('picked'));
    thumb.classList.add('picked');
    if (state.selected != null) assignPhotoToPanel(idx, state.selected);
  });
  tray.querySelector('.empty')?.remove();
  tray.appendChild(thumb);
  return idx;
}

/** Reads user files on-device (FileReader) and adds them to the tray. */
export async function loadUserPhoto(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('could not read file'));
    reader.readAsDataURL(file);
  });
  const img = await loadImage(dataUrl);
  const idx = addPhoto(img, file.name);
  status.textContent = `Added ${file.name}. Click a panel to place it.`;
  return idx;
}

/** Loads one of the bundled sample photos (samples/<name>.jpg). */
export async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  return addPhoto(img, `${name}.jpg`);
}

/** Assigns a tray photo to a panel (undoable). */
export function assignPhotoToPanel(photoIdx, panelIdx) {
  if (photoIdx == null || panelIdx == null || !photos[photoIdx]) return;
  pushHistory();
  state.panels[panelIdx] = { photo: photoIdx, ox: 0, oy: 0, zoom: 1 };
  state.selected = panelIdx;
  render();
}

/** Fills the selected panel with the photo (reset pan/zoom to cover-fit). */
function fillSelectedPanel() {
  const p = state.panels[state.selected];
  if (!p) return;
  pushHistory();
  p.ox = 0; p.oy = 0; p.zoom = 1;
  render();
}

function pointInPoly(fx, fy, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (((yi > fy) !== (yj > fy)) && (fx < ((xj - xi) * (fy - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

/** Finds the topmost panel under a fractional point (fx, fy in 0..1). */
function panelAt(fx, fy) {
  const panels = layoutPanels(state.layout, 1, 1);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (p.poly) { if (pointInPoly(fx, fy, p.poly)) return i; }
    else if (fx >= p.x && fx <= p.x + p.w && fy >= p.y && fy <= p.y + p.h) return i;
  }
  return null;
}

function canvasFraction(e) {
  const r = canvas.getBoundingClientRect();
  return { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height };
}

// Drag on the preview pans the selected panel's photo; a tap selects a panel.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const { fx, fy } = canvasFraction(e);
  const idx = panelAt(fx, fy);
  if (idx == null) return;
  state.selected = idx;
  canvas.setPointerCapture(e.pointerId);
  // Snapshot before the drag so one undo step restores the pre-drag state.
  drag = { fx, fy, ox: state.panels[idx].ox, oy: state.panels[idx].oy, moved: false, snapshot: JSON.stringify(state) };
  drawSelectionOverlay();
  updatePanelHint();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { fx, fy } = canvasFraction(e);
  const panels = layoutPanels(state.layout, 1, 1);
  const p = panels[state.selected];
  const dx = (fx - drag.fx) / p.w;
  const dy = (fy - drag.fy) / p.h;
  if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) drag.moved = true;
  if (!drag.moved) return;
  const ps = state.panels[state.selected];
  ps.ox = Math.max(-0.5, Math.min(0.5, drag.ox + dx));
  ps.oy = Math.max(-0.5, Math.min(0.5, drag.oy + dy));
  render();
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const wasDrag = drag.moved;
  const snapshot = drag.snapshot;
  drag = null;
  if (wasDrag) {
    undoStack.push(snapshot);
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
    syncUndoButtons();
  }
  if (pickedPhoto != null && state.selected != null) {
    assignPhotoToPanel(pickedPhoto, state.selected);
    pickedPhoto = null;
    [...tray.querySelectorAll('img')].forEach((t) => t.classList.remove('picked'));
  }
  render();
});

/** Renders the cover at an exact export size and returns a PNG data URL. */
export async function exportCover(sizeKey) {
  const s = SIZES[sizeKey];
  if (!s) throw new Error(`unknown size ${sizeKey}`);
  await ensureFonts();
  const off = document.createElement('canvas');
  off.width = s.w;
  off.height = s.h;
  renderCover(off, state, photos.map((p) => p.img));
  return off.toDataURL('image/png');
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

async function exportCoverPNG(sizeKey) {
  status.textContent = `Exporting ${sizeKey}…`;
  const url = await exportCover(sizeKey);
  downloadDataUrl(url, `vice-coast-cover-${sizeKey}.png`);
  status.textContent = `Saved vice-coast-cover-${sizeKey}.png`;
  return url;
}

async function exportAll() {
  const btn = document.getElementById('exportAllBtn');
  btn.disabled = true;
  try {
    for (const key of Object.keys(SIZES)) {
      await exportCoverPNG(key);
      await new Promise((r) => setTimeout(r, 120));
    }
    status.textContent = 'Saved all three PNGs.';
  } finally {
    btn.disabled = false;
  }
}

/** Restores the default cover (undoable) and keeps the photo tray. */
function resetCover() {
  pushHistory();
  const keepSize = state.size;
  state = defaultState();
  state.size = keepSize;
  syncControls();
  render();
  status.textContent = 'Cover reset — photos stay in the tray.';
}

// ---- Controls ----

function buildChips(container, items, current, onPick) {
  container.innerHTML = '';
  items.forEach(([key, label, swatch]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (key === current ? ' active' : '');
    b.innerHTML = swatch ? `<span class="swatch" style="background:${swatch}"></span>${label}` : label;
    b.addEventListener('click', () => {
      pushHistory();
      onPick(key);
      buildChips(container, items, key, onPick);
      render();
    });
    container.appendChild(b);
  });
}

function buildLayoutChips() {
  buildChips(
    document.getElementById('layoutPicker'),
    Object.entries(LAYOUTS).map(([k, v]) => [k, v.name]),
    state.layout,
    (key) => { state.layout = key; resizePanels(); },
  );
}

function buildGradeChips() {
  buildChips(
    document.getElementById('gradePicker'),
    Object.entries(GRADES).map(([k, v]) => [k, v.name, v.swatch]),
    state.grade,
    (key) => { state.grade = key; },
  );
}

function syncControls() {
  document.getElementById('titleInput').value = state.title;
  document.getElementById('subtitleInput').value = state.subtitle;
  document.getElementById('badgeInput').value = state.badge;
  document.getElementById('titleColor').value = state.titleColor;
  document.getElementById('outlineSelect').value = state.outline;
  document.getElementById('badgeToggle').checked = state.badgeOn;
  document.getElementById('grainToggle').checked = state.grain;
  document.getElementById('halftoneToggle').checked = state.halftone;
  document.getElementById('vignetteToggle').checked = state.vignette;
  const p = state.panels[state.selected];
  document.getElementById('zoomSlider').value = p ? p.zoom : 1;
  document.querySelectorAll('.size-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  sizeLabel.textContent = SIZES[state.size].label;
  buildLayoutChips();
  buildGradeChips();
}

function bindControls() {
  const onText = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      render();
    });
    document.getElementById(id).addEventListener('change', () => pushHistory());
  };
  onText('titleInput', 'title');
  onText('subtitleInput', 'subtitle');
  onText('badgeInput', 'badge');

  document.getElementById('titleColor').addEventListener('input', (e) => {
    state.titleColor = e.target.value;
    render();
  });
  document.getElementById('titleColor').addEventListener('change', () => pushHistory());
  document.getElementById('outlineSelect').addEventListener('change', (e) => {
    pushHistory();
    state.outline = e.target.value;
    render();
  });
  const toggle = (id, key) => {
    document.getElementById(id).addEventListener('change', (e) => {
      pushHistory();
      state[key] = e.target.checked;
      render();
    });
  };
  toggle('badgeToggle', 'badgeOn');
  toggle('grainToggle', 'grain');
  toggle('halftoneToggle', 'halftone');
  toggle('vignetteToggle', 'vignette');

  document.getElementById('zoomSlider').addEventListener('input', (e) => {
    const p = state.panels[state.selected];
    if (!p) return;
    p.zoom = Number(e.target.value);
    render();
  });
  document.getElementById('zoomSlider').addEventListener('change', () => pushHistory());
  document.getElementById('fillBtn').addEventListener('click', fillSelectedPanel);

  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  document.getElementById('resetBtn').addEventListener('click', resetCover);

  document.getElementById('photoInput').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      try { await loadUserPhoto(file); } catch (err) { status.textContent = String(err.message || err); }
    }
    render();
  });
  document.getElementById('samplesBtn').addEventListener('click', async () => {
    status.textContent = 'Loading sample photos…';
    for (const name of ['boulevard', 'pier']) {
      try { await loadSample(name); } catch (err) { status.textContent = String(err.message || err); }
    }
    // Fill the first panels with the samples so the cover is alive at once.
    pushHistory();
    state.panels.forEach((p, i) => { if (p.photo == null && photos[i]) p.photo = i % photos.length; });
    status.textContent = 'Sample photos loaded — click a panel to place one.';
    render();
  });

  document.querySelectorAll('.size-btn').forEach((b) => {
    b.addEventListener('click', () => {
      pushHistory();
      state.size = b.dataset.size;
      syncControls();
      render();
    });
  });
  document.getElementById('exportAllBtn').addEventListener('click', exportAll);
}

// Automation hooks: screenshots and exports can be driven from DevTools.
window.__coverApp = {
  exportCover,
  loadSample,
  setLayout(name) { pushHistory(); state.layout = name; resizePanels(); syncControls(); return render(); },
  setGrade(name) { pushHistory(); state.grade = name; syncControls(); return render(); },
  setTitle(t) { pushHistory(); state.title = t; syncControls(); return render(); },
  get state() { return state; },
  get photos() { return photos.map((p) => p.name); },
};

// Boot: fixed scenes for screenshots (?shot=) or the plain editor.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
buildLayoutChips();
buildGradeChips();
bindControls();
syncControls();
syncUndoButtons();

if (shot) {
  runShot(shot, query, {
    loadSample,
    get state() { return state; },
    setLayout(name) { state.layout = name; resizePanels(); },
    setGrade(name) { state.grade = name; },
    setTitle(t) { state.title = t; },
    setSubtitle(t) { state.subtitle = t; },
    setBadge(t) { state.badge = t; },
    setSize(key) { state.size = key; },
    assign(i, photoIdx) { state.panels[i] = { photo: photoIdx, ox: 0, oy: 0, zoom: 1 }; },
    render,
    syncControls,
  });
} else {
  render();
}
