// Sunset Cover Studio's editor: photos in, panels arranged, title typed,
// PNG out. Photos are read locally with FileReader and never uploaded.
// The same drawCover from cover.js paints the preview and the export.
import { drawCover, panelRects, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const statusEl = $('status');
const selftestEl = $('selftest');

const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** The editor state: every panel points at a photo by index, with its own pan/zoom. */
const state = {
  layout: 'triptych',
  palette: 'sunset',
  title: 'SUNSET HEIST',
  subtitle: 'SUNSET BOULEVARD · SUMMER 2026',
  showTitle: true,
  photos: [],
  panels: [],
  size: '1080x1080',
  selectedPanel: 0,
};

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

/** Grows or trims the panel list to the current layout, keeping each panel's crop. */
function syncPanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    const i = state.panels.length;
    state.panels.push({ photo: Math.min(i, Math.max(0, state.photos.length - 1)), ox: 0, oy: 0, zoom: 1 });
  }
  state.panels.length = n;
  if (state.selectedPanel >= n) state.selectedPanel = 0;
}

/** Repaints the preview canvas at the chosen export aspect. */
function redraw() {
  const [w, h] = EXPORT_SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
  drawCover(ctx, w, h, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Reads a File into an Image via FileReader (local only, no upload). */
export function loadFileImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result).then(resolve, reject);
    reader.onerror = () => reject(new Error(`could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Adds photos, assigns empty panels to the first new photo, repaints. */
export async function addPhotos(files) {
  const loaded = [];
  for (const file of files) {
    try {
      loaded.push(await loadFileImage(file));
    } catch (err) {
      statusEl.textContent = err.message;
    }
  }
  if (!loaded.length) return;
  const firstIndex = state.photos.length;
  state.photos.push(...loaded);
  state.panels.forEach((p) => {
    if (state.photos[p.photo] === undefined) p.photo = firstIndex;
  });
  refreshPhotoTray();
  refreshPanelControls();
  redraw();
}

/** Renders the export at the chosen size and returns its PNG bytes. */
export async function exportCoverPng() {
  const [w, h] = EXPORT_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  return { blob, bytes: blob.size, w, h };
}

// ---------------------------------------------------------- controls UI

function refreshPhotoTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.src = photo.src;
    thumb.alt = `Photo ${i + 1}`;
    thumb.className = state.panels.some((p) => p.photo === i) ? 'selected' : '';
    thumb.addEventListener('click', () => {
      state.panels[state.selectedPanel].photo = i;
      refreshPhotoTray();
      refreshPanelControls();
      redraw();
    });
    tray.appendChild(thumb);
  });
}

function refreshPanelControls() {
  const sel = $('panelSelect');
  sel.innerHTML = '';
  state.panels.forEach((_, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Panel ${i + 1}`;
    sel.appendChild(opt);
  });
  sel.value = String(state.selectedPanel);

  const photoSel = $('panelPhoto');
  photoSel.innerHTML = '';
  if (!state.photos.length) {
    const opt = document.createElement('option');
    opt.textContent = 'No photos yet';
    photoSel.appendChild(opt);
  }
  state.photos.forEach((_, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Photo ${i + 1}`;
    photoSel.appendChild(opt);
  });
  photoSel.value = String(state.panels[state.selectedPanel]?.photo ?? 0);

  const panel = state.panels[state.selectedPanel];
  if (panel) {
    $('zoomSlider').value = String(panel.zoom);
    $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
  }
}

function selectPanel(i) {
  state.selectedPanel = i;
  refreshPhotoTray();
  refreshPanelControls();
  redraw();
}

function bindSegmented(id, key) {
  $(id).addEventListener('click', (e) => {
    const btn = e.target.closest('[data-' + key + ']');
    if (!btn) return;
    state[key] = btn.dataset[key];
    $(id).querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
    if (key === 'layout') syncPanels();
    refreshPanelControls();
    redraw();
  });
}
bindSegmented('layoutSeg', 'layout');
bindSegmented('paletteSeg', 'palette');
bindSegmented('sizeSeg', 'size');

$('panelSelect').addEventListener('change', (e) => selectPanel(Number(e.target.value)));
$('panelPhoto').addEventListener('change', (e) => {
  state.panels[state.selectedPanel].photo = Number(e.target.value);
  refreshPhotoTray();
  redraw();
});
$('zoomSlider').addEventListener('input', (e) => {
  const panel = state.panels[state.selectedPanel];
  panel.zoom = Number(e.target.value);
  $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
  redraw();
});
$('resetPanel').addEventListener('click', () => {
  Object.assign(state.panels[state.selectedPanel], { ox: 0, oy: 0, zoom: 1 });
  refreshPanelControls();
  redraw();
});
$('fillAll').addEventListener('click', () => {
  const idx = state.panels[state.selectedPanel].photo;
  state.panels.forEach((p) => { p.photo = idx; });
  refreshPhotoTray();
  redraw();
});
$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('titleToggle').addEventListener('change', (e) => { state.showTitle = e.target.checked; redraw(); });

$('photoInput').addEventListener('change', async (e) => {
  await addPhotos([...e.target.files]);
  e.target.value = '';
});
$('sampleBtn').addEventListener('click', async () => {
  statusEl.textContent = 'Loading sample photos…';
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  state.photos = [pier, boulevard];
  state.panels.forEach((p, i) => { p.photo = i % 2; });
  refreshPhotoTray();
  refreshPanelControls();
  redraw();
  statusEl.textContent = 'Sample photos loaded — pick a layout and export.';
});

$('exportBtn').addEventListener('click', async () => {
  statusEl.textContent = 'Exporting…';
  const { blob, bytes, w, h } = await exportCoverPng();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sunset-cover-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  statusEl.textContent = `Saved sunset-cover-${w}x${h}.png (${Math.round(bytes / 1024)} KiB)`;
});

// ---------------------------------------------------------- drag to pan

let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / r.width * canvas.width,
    y: (e.clientY - r.top) / r.height * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const i = rects.findIndex((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
  if (i < 0) return;
  selectPanel(i);
  drag = { x: p.x, y: p.y, panel: state.panels[i], rect: rects[i] };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  drag.panel.ox += (p.x - drag.x) / drag.rect.w;
  drag.panel.oy += (p.y - drag.y) / drag.rect.h;
  drag.panel.ox = Math.max(-0.6, Math.min(0.6, drag.panel.ox));
  drag.panel.oy = Math.max(-0.6, Math.min(0.6, drag.panel.oy));
  drag.x = p.x;
  drag.y = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// ---------------------------------------------------------- boot

syncPanels();
refreshPanelControls();
refreshPhotoTray();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const selftest = params.get('selftest');

async function boot() {
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch { /* fall back to system bold if the bundled font cannot load */ }
  // A ?size= deep link (used by the screenshot scenes) picks the export size.
  const sizeParam = params.get('size');
  if (sizeParam && EXPORT_SIZES[sizeParam]) {
    state.size = sizeParam;
    document.querySelectorAll('#sizeSeg .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.size === sizeParam));
  }
  if (shot) {
    await runShot(shot, params, async (sample, text) => {
      const img = await loadImage(sample);
      const other = await loadImage(sample.includes('pier') ? 'samples/boulevard.jpg' : 'samples/pier.jpg');
      state.photos = [img, other];
      state.panels.forEach((p, i) => { p.photo = i % 2; });
      state.title = text;
      $('titleInput').value = text;
      refreshPhotoTray();
      refreshPanelControls();
      redraw();
    });
  } else {
    redraw();
  }
  if (selftest === 'export') {
    if (!state.photos.length) {
      const img = await loadImage('samples/pier.jpg');
      state.photos = [img];
      redraw();
    }
    const { bytes, w, h } = await exportCoverPng();
    selftestEl.textContent = `selftest export ok ${w}x${h} ${bytes} bytes`;
    window.__selftest = { bytes, w, h };
  }
}

boot();
