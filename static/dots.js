// minimal ascii field: faint dots that thicken into glyphs around the cursor
(function () {
  const canvas = document.getElementById('dots');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const RAMP = '.:-=+*#%';
  const GAP_X = 14, GAP_Y = 20, SIZE = 12, REACH = 130, BASE = 0.14, PEAK = 0.75;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                !window.matchMedia('(hover: hover)').matches;

  let cells = [], w = 0, h = 0, color = '#000', pointer = null, running = false;

  function readColor() {
    color = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#000';
  }

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cells = [];
    const ox = (w % GAP_X) / 2 + GAP_X / 2, oy = (h % GAP_Y) / 2 + GAP_Y / 2;
    for (let y = oy; y < h; y += GAP_Y)
      for (let x = ox; x < w; x += GAP_X)
        cells.push({ x, y, v: 0 });
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.font = SIZE + "px 'Geist Mono', ui-monospace, Menlo, monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const c of cells) {
      const k = Math.min(RAMP.length - 1, Math.floor(c.v * RAMP.length));
      ctx.globalAlpha = BASE + (PEAK - BASE) * c.v;
      ctx.fillText(RAMP[k], c.x, c.y);
    }
    ctx.globalAlpha = 1;
  }

  function tick() {
    let moving = false;
    for (const c of cells) {
      let target = 0;
      if (pointer) {
        const dist = Math.hypot(c.x - pointer.x, c.y - pointer.y);
        if (dist < REACH) target = Math.pow(1 - dist / REACH, 1.6);
      }
      // rise quickly, fade slowly, so the cursor leaves a short trail
      c.v += (target - c.v) * (target > c.v ? 0.35 : 0.06);
      if (Math.abs(target - c.v) > 0.01) moving = true;
      else c.v = target;
    }
    draw();
    if (moving || pointer) requestAnimationFrame(tick);
    else running = false;
  }

  function wake() {
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  readColor();
  layout();
  if (document.fonts) document.fonts.ready.then(draw);
  window.addEventListener('resize', layout);
  new MutationObserver(() => { readColor(); draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  if (still) return;
  // canvas is a fixed full-viewport background, so client coords map directly
  window.addEventListener('pointermove', (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    wake();
  });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; wake(); });
})();
