// now playing: last.fm recent track, album art drawn with the same glyph ramp as the dot field
(function () {
  const root = document.getElementById('now-playing');
  if (!root) return;
  const user = root.dataset.user, key = root.dataset.key;
  if (!user || !key) return;

  const RAMP = '.:-=+*#%';
  const COLS = 22, ROWS = 13, EQ = 8, POLL = 30000, REACH = 4;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const API = 'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&limit=1&format=json' +
              '&user=' + encodeURIComponent(user) + '&api_key=' + encodeURIComponent(key);
  // last.fm serves this grey star when a track has no cover
  const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';

  const status = root.querySelector('.np-status');
  const caret = root.querySelector('.np-caret');
  const card = root.querySelector('.np-card');
  const art = root.querySelector('.np-art');
  const title = root.querySelector('.np-title');
  const sub = root.querySelector('.np-sub');
  const eq = root.querySelector('.np-eq');

  let lum = null, hover = new Float32Array(COLS * ROWS), pointer = null, running = false;
  let current = '', playing = false, bars = new Float32Array(EQ), eqTimer = null;

  // ---- album art ----

  function glyph(v) {
    return RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(v * RAMP.length)))];
  }

  function drawArt() {
    if (!lum) return;
    // denser glyphs mean more ink, so invert brightness on the light theme
    const dark = document.documentElement.classList.contains('dark');
    let out = '';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const v = dark ? lum[i] : 1 - lum[i];
        out += glyph(Math.min(1, v + hover[i] * 0.7));
      }
      if (y < ROWS - 1) out += '\n';
    }
    art.textContent = out;
  }

  // stretch contrast so dim covers still use the whole ramp
  function normalize(grid) {
    let lo = 1, hi = 0;
    for (const v of grid) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const span = hi - lo || 1;
    return grid.map((v) => (v - lo) / span);
  }

  function fromImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = COLS; c.height = ROWS;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(img, 0, 0, COLS, ROWS);
          const d = g.getImageData(0, 0, COLS, ROWS).data;
          const grid = new Float32Array(COLS * ROWS);
          for (let i = 0; i < grid.length; i++)
            grid[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
          resolve(normalize(grid));
        } catch (e) { reject(e); } // tainted canvas
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // no readable cover: interference rings seeded from the track name
  function fromName(name) {
    let h = 2166136261;
    for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
    const r = (n) => ((h >>> n) & 255) / 255;
    const cx = COLS * (0.25 + r(0) * 0.5), cy = ROWS * (0.25 + r(8) * 0.5);
    const f = 0.5 + r(16) * 0.7, k = 2 + Math.floor(r(24) * 4);
    const grid = new Float32Array(COLS * ROWS);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        // cells are ~0.6 as wide as tall, so scale x to keep rings round
        const dx = (x - cx) * 0.6, dy = y - cy;
        const a = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
        grid[y * COLS + x] = 0.5 + 0.5 * Math.sin(d * f + Math.cos(a * k));
      }
    return normalize(grid);
  }

  // ---- hover: glyphs thicken around the cursor like the background field ----

  function tick() {
    let moving = false;
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        let target = 0;
        if (pointer) {
          const d = Math.hypot((x - pointer.x) * 0.6, y - pointer.y);
          if (d < REACH) target = Math.pow(1 - d / REACH, 1.6);
        }
        hover[i] += (target - hover[i]) * (target > hover[i] ? 0.35 : 0.08);
        if (Math.abs(target - hover[i]) > 0.01) moving = true;
        else hover[i] = target;
      }
    drawArt();
    if (moving || pointer) requestAnimationFrame(tick);
    else running = false;
  }

  if (!still && window.matchMedia('(hover: hover)').matches) {
    art.addEventListener('pointermove', (e) => {
      const r = art.getBoundingClientRect();
      pointer = { x: (e.clientX - r.left) / r.width * COLS, y: (e.clientY - r.top) / r.height * ROWS };
      if (!running) { running = true; requestAnimationFrame(tick); }
    });
    art.addEventListener('pointerleave', () => { pointer = null; });
  }

  // ---- equalizer ----

  function drawEq() {
    eq.textContent = Array.from(bars, glyph).join('');
  }

  function stepEq() {
    for (let i = 0; i < EQ; i++) {
      const target = Math.random() * (i % 3 === 1 ? 1 : 0.8);
      bars[i] += (target - bars[i]) * 0.55;
    }
    drawEq();
  }

  function setEq(on) {
    clearInterval(eqTimer); eqTimer = null;
    if (on && !still) eqTimer = setInterval(stepEq, 140);
    else { bars.fill(on ? 0.5 : 0); drawEq(); }
  }

  // ---- data ----

  function ago(uts) {
    const s = Date.now() / 1000 - uts;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    return Math.round(s / 86400) + 'd ago';
  }

  async function refresh() {
    let track;
    try {
      const res = await fetch(API);
      if (!res.ok) return;
      const list = (await res.json()).recenttracks?.track;
      track = Array.isArray(list) ? list[0] : list;
    } catch (e) { return; }
    if (!track) return;

    const name = track.name, artist = track.artist?.['#text'] || '', album = track.album?.['#text'] || '';
    playing = track['@attr']?.nowplaying === 'true';

    status.textContent = playing ? 'listening now' : 'last played' + (track.date ? ' · ' + ago(+track.date.uts) : '');
    caret.hidden = !playing;
    setEq(playing && !document.hidden);

    const id = artist + '\u0000' + name;
    if (id === current) return;
    current = id;

    title.textContent = name;
    sub.textContent = album ? artist + ' — ' + album : artist;
    card.href = track.url;
    card.setAttribute('aria-label', (playing ? 'listening to ' : 'last played ') + name + ' by ' + artist);

    const cover = (track.image || []).map((im) => im['#text']).filter(Boolean).pop();
    try {
      if (!cover || cover.includes(PLACEHOLDER)) throw 0;
      lum = await fromImage(cover);
    } catch (e) {
      lum = fromName(id);
    }
    drawArt();
    root.hidden = false;
  }

  new MutationObserver(drawArt)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setEq(false);
    else refresh();
  });
  setInterval(() => { if (!document.hidden) refresh(); }, POLL);
  refresh();
})();
