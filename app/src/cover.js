// Sunset Cover Studio's renderer: one drawCover(ctx, w, h, state) draws the
// multi-panel poster both for the live preview and for the exported PNG.
// Layouts split the cover into photo panels above a bold title band; palettes
// grade the whole poster in a sunset or a neon-night colour story. All artwork
// is drawn in code — no Rockstar logo, artwork or font is used anywhere.

export const LAYOUTS = {
  triptych: { label: 'Three strips', panels: 3 },
  grid: { label: '2 x 2 grid', panels: 4 },
  hero: { label: 'Hero + strip', panels: 3 },
};

export const PALETTES = {
  sunset: {
    bandTop: '#ff7a3d', bandBottom: '#c2187a', bandMid: '#ff2e88',
    sun: '#ffd166', sunCore: '#fff3c4',
    title: '#ffffff', titleStroke: '#1c0a2e', titleShadow: '#ff2e88',
    subtitle: '#ffe9a8', gutter: '#160a24', tint: '255, 46, 136', accent: '#22d3ee',
  },
  neon: {
    bandTop: '#120b3d', bandBottom: '#3b0f66', bandMid: '#7c3aed',
    sun: '#22d3ee', sunCore: '#d9fbff',
    title: '#ffffff', titleStroke: '#0a0618', titleShadow: '#22d3ee',
    subtitle: '#9df3ff', gutter: '#070312', tint: '34, 211, 238', accent: '#ff2e88',
  },
};

/** Fraction of the cover height the title band takes. */
export const TITLE_BAND = 0.22;

/**
 * The photo-panel rectangles for a layout, as fractions of the cover
 * (x, y, w, h). The title band occupies the bottom TITLE_BAND of the cover.
 */
export function panelRects(layout, w, h) {
  const photoH = h * (1 - TITLE_BAND);
  const gap = Math.max(3, Math.round(w * 0.006));
  if (layout === 'grid') {
    const cw = (w - gap) / 2;
    const ch = (photoH - gap) / 2;
    return [
      { x: 0, y: 0, w: cw, h: ch },
      { x: cw + gap, y: 0, w: cw, h: ch },
      { x: 0, y: ch + gap, w: cw, h: ch },
      { x: cw + gap, y: ch + gap, w: cw, h: ch },
    ];
  }
  if (layout === 'hero') {
    const stripH = photoH * 0.24;
    const heroH = photoH - stripH - gap;
    const cw = (w - gap) / 2;
    return [
      { x: 0, y: 0, w, h: heroH },
      { x: 0, y: heroH + gap, w: cw, h: stripH },
      { x: cw + gap, y: heroH + gap, w: cw, h: stripH },
    ];
  }
  const cw = (w - gap * 2) / 3;
  return [
    { x: 0, y: 0, w: cw, h: photoH },
    { x: cw + gap, y: 0, w: cw, h: photoH },
    { x: cw * 2 + gap * 2, y: 0, w: cw, h: photoH },
  ];
}

/** Draws one photo into a panel rect, cover-fit, with the panel's pan/zoom. */
export function drawPanelPhoto(ctx, photo, rect, panel) {
  if (!photo) return;
  const zoom = panel.zoom ?? 1;
  const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * zoom;
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const dx = rect.x + (rect.w - pw) / 2 + (panel.ox ?? 0) * rect.w;
  const dy = rect.y + (rect.h - ph) / 2 + (panel.oy ?? 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, dx, dy, pw, ph);
  ctx.restore();
}

/** A retro striped sun disc, cut by horizontal slits, for the title band. */
export function drawSun(ctx, cx, cy, r, palette) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, palette.sunCore);
  g.addColorStop(0.55, palette.sun);
  g.addColorStop(1, palette.bandMid);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = palette.bandBottom;
  let y = cy + r * 0.08;
  let slit = r * 0.07;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, slit);
    y += slit * 2.6;
    slit *= 1.5;
  }
  ctx.restore();
}

/** The bold title and subtitle, centred in the title band. */
export function drawTitleBand(ctx, w, h, state, palette) {
  const bandY = h * (1 - TITLE_BAND);
  const bandH = h * TITLE_BAND;
  const g = ctx.createLinearGradient(0, bandY, 0, h);
  g.addColorStop(0, palette.bandTop);
  g.addColorStop(0.55, palette.bandMid);
  g.addColorStop(1, palette.bandBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, bandY, w, bandH);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, bandY, w, Math.max(2, h * 0.003));

  const title = (state.title ?? '').trim().toUpperCase();
  const subtitle = (state.subtitle ?? '').trim().toUpperCase();
  if (state.showTitle === false) return;

  // Sun disc rising behind the title, half sunk into the band's top edge.
  const sunR = bandH * 0.62;
  drawSun(ctx, w * 0.5, bandY + bandH * 0.18, sunR, palette);

  if (title) {
    let size = bandH * 0.52;
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    while (ctx.measureText(title).width > w * 0.92 && size > 10) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const ty = bandY + bandH * 0.46;
    ctx.shadowColor = palette.titleShadow;
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeStyle = palette.titleStroke;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeText(title, w / 2, ty);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = palette.title;
    ctx.fillText(title, w / 2, ty);
  }
  if (subtitle) {
    const size = Math.max(10, bandH * 0.13);
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    const text = subtitle.split('').join(' ');
    const tw = ctx.measureText(text).width;
    const ty = bandY + bandH * 0.86;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = palette.subtitle;
    ctx.fillText(text, w / 2, ty);
    const ruleW = Math.min(w * 0.14, (w - tw) / 2 - w * 0.03);
    if (ruleW > 8) {
      ctx.fillRect(w / 2 - tw / 2 - w * 0.02 - ruleW, ty - 1, ruleW, 2);
      ctx.fillRect(w / 2 + tw / 2 + w * 0.02, ty - 1, ruleW, 2);
    }
  }
}

/**
 * Draws the whole cover. `state` is { layout, palette, title, subtitle,
 * showTitle, photos: [Image], panels: [{ photo, ox, oy, zoom }] }.
 */
export function drawCover(ctx, w, h, state) {
  const palette = PALETTES[state.palette] ?? PALETTES.sunset;
  const rects = panelRects(state.layout ?? 'triptych', w, h);
  ctx.fillStyle = palette.gutter;
  ctx.fillRect(0, 0, w, h);

  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: 0, ox: 0, oy: 0, zoom: 1 };
    const photo = state.photos[panel.photo] ?? null;
    if (photo) {
      drawPanelPhoto(ctx, photo, rect, panel);
    } else {
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, palette.bandTop);
      g.addColorStop(1, palette.bandBottom);
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `700 ${Math.max(12, rect.w * 0.06)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    // Warm/cool grade rising from the bottom of each panel.
    const tint = ctx.createLinearGradient(0, rect.y + rect.h * 0.45, 0, rect.y + rect.h);
    tint.addColorStop(0, `rgba(${palette.tint},0)`);
    tint.addColorStop(1, `rgba(${palette.tint},0.38)`);
    ctx.fillStyle = tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    // Thin poster-white inner edge.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1, w * 0.0015);
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  });

  drawTitleBand(ctx, w, h, state, palette);

  // Poster frame + vignette.
  const frame = Math.max(4, Math.round(w * 0.008));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}
