// minimal dot field: dots part around the cursor and drift back
(function () {
  const canvas = document.getElementById('dots');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const GAP = 22, R = 1, REACH = 110, PUSH = 16, BASE = 0.13, PEAK = 0.7;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                !window.matchMedia('(hover: hover)').matches;

  let dots = [], w = 0, h = 0, color = '#000', pointer = null, running = false;

  function readColor() {
    color = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#000';
  }

  function layout() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    const ox = (w % GAP) / 2 + GAP / 2, oy = (h % GAP) / 2 + GAP / 2;
    for (let y = oy; y < h; y += GAP)
      for (let x = ox; x < w; x += GAP)
        dots.push({ x0: x, y0: y, x, y, a: BASE });
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    for (const d of dots) {
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.arc(d.x, d.y, R, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function tick() {
    let moving = false;
    for (const d of dots) {
      let tx = d.x0, ty = d.y0, ta = BASE;
      if (pointer) {
        const dx = d.x0 - pointer.x, dy = d.y0 - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < REACH) {
          const f = 1 - dist / REACH, s = f * f;
          const n = dist || 1;
          tx += (dx / n) * PUSH * s;
          ty += (dy / n) * PUSH * s;
          ta = BASE + (PEAK - BASE) * f;
        }
      }
      d.x += (tx - d.x) * 0.15;
      d.y += (ty - d.y) * 0.15;
      d.a += (ta - d.a) * 0.15;
      if (Math.abs(tx - d.x) > 0.05 || Math.abs(ty - d.y) > 0.05 || Math.abs(ta - d.a) > 0.005) moving = true;
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
