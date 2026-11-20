// Fixed scenes for screenshots: ?shot=cover shows the cover alone,
// ?shot=editor shows the editor with a sample photo loaded. `photo` picks the
// sample (samples/<photo>.jpg), `caption` the title, `layout` and `palette`
// pick the arrangement and grade. window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const layout = query.get('layout');
  const palette = query.get('palette');
  if (layout) {
    const btn = document.querySelector(`#layoutSeg [data-layout="${layout}"]`);
    if (btn) btn.click();
  }
  if (palette) {
    const btn = document.querySelector(`#paletteSeg [data-palette="${palette}"]`);
    if (btn) btn.click();
  }
  await load(`samples/${query.get('photo') ?? 'pier'}.jpg`, query.get('caption') ?? 'Sunset Heist');
  try { await document.fonts.ready; } catch { /* painted with the fallback */ }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
