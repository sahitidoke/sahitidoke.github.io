// now playing: last.fm recent track, shown as an ascii record drawn with the dot field's glyph ramp
(function () {
  const root = document.getElementById('now-playing');
  if (!root) return;
  const user = root.dataset.user, key = root.dataset.key;
  if (!user || !key) return;

  const RAMP = '.:-=+*#%';
  const COLS = 32, ROWS = 15, EQ = 8, POLL = 30000, REACH = 4, SPIN = 1.2;
  // record geometry in row units; cells are ~0.6 as wide as tall
  const CX = 11.5, CY = 7, R = 7.2, ARM_X = 28;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const API = 'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&limit=1&format=json' +
              '&user=' + encodeURIComponent(user) + '&api_key=' + encodeURIComponent(key);

  const status = root.querySelector('.np-status');
  const caret = root.querySelector('.np-caret');
  const card = root.querySelector('.np-card');
  const art = root.querySelector('.np-art');
  const title = root.querySelector('.np-title');
  const sub = root.querySelector('.np-sub');
  const eq = root.querySelector('.np-eq');

  let hover = new Float32Array(COLS * ROWS), pointer = null, running = false;
  let theta = 0.8, last = 0, current = '', playing = false, bars = new Float32Array(EQ), eqTimer = null;

  function glyph(v) {
    return RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(v * RAMP.length)))];
  }

  // ---- record ----

  // fixed parts (hole, label, rim) are characters; grooves store their angle and base level
  const cells = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const dx = (x - CX) * 0.6, dy = y - CY, d = Math.hypot(dx, dy);
      if (d > R) cells.push(' ');
      else if (d < 0.7) cells.push('o');
      else if (d < R * 0.36) cells.push('%');
      else if (d > R - 0.6) cells.push('#');
      else cells.push({ a: Math.atan2(dy, dx), base: Math.floor(d * 1.6) % 2 ? 0.3 : 0.18 });
    }

  function arm(row) {
    if (row === 0) return 'O';
    // on the record while playing, parked beside it otherwise
    if (playing) return row < 6 ? '|' : null;
    return row < 11 ? '|' : row === 11 ? '=' : null;
  }

  function drawArt() {
    let out = '';
    for (let y = 0; y < ROWS; y++) {
      const line = [];
      for (let x = 0; x < COLS; x++) {
        const c = cells[y * COLS + x];
        if (typeof c === 'string') { line.push(c); continue; }
        // two faint streaks of light that turn with the record
        const sheen = Math.pow(Math.max(0, Math.cos(2 * (c.a - theta))), 12) * 0.4;
        line.push(glyph(c.base + sheen + hover[y * COLS + x] * 0.6));
      }
      const a = arm(y);
      if (a) line[ARM_X] = a;
      if (playing && y >= 6 && y <= 8) line[ARM_X - y + 5] = '/';
      if (playing && y === 9) line[ARM_X - 4] = line[ARM_X - 5] = '=';
      out += line.join('') + (y < ROWS - 1 ? '\n' : '');
    }
    art.textContent = out;
  }

  function spinning() {
    return playing && !still && !document.hidden;
  }

  // one loop drives both the spin and the hover glyphs
  function tick(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (spinning()) theta += dt * SPIN;

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
    if (moving || pointer || spinning()) requestAnimationFrame(tick);
    else { running = false; last = 0; }
  }

  function wake() {
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  if (!still && window.matchMedia('(hover: hover)').matches) {
    art.addEventListener('pointermove', (e) => {
      const r = art.getBoundingClientRect();
      pointer = { x: (e.clientX - r.left) / r.width * COLS, y: (e.clientY - r.top) / r.height * ROWS };
      wake();
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
    drawArt();
    if (spinning()) wake();

    const id = artist + '\u0000' + name;
    if (id !== current) {
      current = id;
      title.textContent = name;
      sub.textContent = album ? artist + ' — ' + album : artist;
      card.href = track.url;
    }
    card.setAttribute('aria-label', (playing ? 'listening to ' : 'last played ') + name + ' by ' + artist);
    root.hidden = false;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setEq(false);
    else refresh();
  });
  setInterval(() => { if (!document.hidden) refresh(); }, POLL);
  refresh();
})();
