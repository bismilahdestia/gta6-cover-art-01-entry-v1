// Fixed scenes for screenshots: ?shot=cover shows the exported cover full-bleed,
// ?shot=editor shows the editor with sample photos loaded, ?shot=editor-panels
// shows a second layout in the editor. Query params: layout, grade, title,
// subtitle, size. window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, api) {
  const layout = query.get('layout') ?? 'nine';
  const grade = query.get('grade') ?? 'sunset';
  const title = query.get('title') ?? 'VICE COAST';
  const subtitle = query.get('subtitle') ?? 'sunset over the strip';
  const size = query.get('size') ?? '1080x1080';

  if (shot === 'cover' || shot === 'cover-portrait') document.body.classList.add('shot-cover');

  // Load both bundled samples, then fill every panel, alternating photos.
  const boulevard = await api.loadSample('boulevard');
  const pier = await api.loadSample('pier');

  api.setLayout(layout);
  api.setGrade(grade);
  api.setTitle(title);
  api.setSubtitle(subtitle);
  api.setSize(size);
  const count = api.state.panels.length;
  for (let i = 0; i < count; i++) {
    api.assign(i, i % 2 === 0 ? boulevard : pier);
  }
  // The hero panel gets the boulevard photo for the strongest first read.
  api.assign(0, boulevard);
  api.syncControls();
  await api.render();

  // Two frames so the canvas paint lands before the screenshot.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
