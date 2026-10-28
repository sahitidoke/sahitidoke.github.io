// fake shell: types each section's command before showing its output, then leaves a live prompt
(function () {
  const term = document.querySelector('.term');
  if (!term) return;
  const root = document.documentElement;
  const cwd = document.body.dataset.cwd || '~';
  const blocks = Array.from(document.querySelectorAll('.cmd-block'));

  // where each directory lives, and which page/section answers each command
  const DIRS = { '~': '/', 'portfolio': '/blog/', 'blog': '/writing/', 'about': '/blog/abme/' };
  const ROUTES = [
    [/^(cat|less|more|head) .*readme/i, '/#readme'],
    [/^(ps|top|htop)\b/, '/#now'],
    [/^playerctl\b/, '/#now-playing'],
    [/^(cal|ncal)\b/, '/#cal'],
    [/^git (log|show)\b/, '/blog/#done'],
    [/^ls .*courses/, '/blog/#courses'],
    [/^ls .*(blog|writing)/, '/writing/#posts'],
    [/newsboat|urls/, '/writing/#reading'],
    [/^(cat|less|more|head|grep).*\bdislikes/, '/blog/abme/#dislikes'],
    [/^(cat|less|more|head|grep).*\blikes/, '/blog/abme/#likes'],
    [/^(cat|less|more|head|grep).*\bneutral/, '/blog/abme/#neutral'],
    [/^crontab\b/, '/blog/abme/#todo'],
  ];
  const LINKS = {};
  document.querySelectorAll('.statusbar a[target]').forEach(a => {
    LINKS[a.textContent.trim()] = a.href;
  });

  // "Last login" shows the previous visit, like a real login shell
  const login = document.querySelector('.last-login');
  if (login) {
    // remember the previous visit once per browser session so page changes don't reset it
    let last = null;
    try {
      last = sessionStorage.getItem('login-prev');
      if (last === null) {
        last = localStorage.getItem('last-login') || '';
        sessionStorage.setItem('login-prev', last);
        localStorage.setItem('last-login', String(Date.now()));
      }
    } catch (e) {}
    const when = new Date(last ? +last : Date.now());
    const stamp = when.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '') + ' ' +
      when.toTimeString().slice(0, 8);
    login.textContent = 'Last login: ' + stamp + ' on ttys001';
  }

  const cmdText = b => b.querySelector('.cmd') ? b.querySelector('.cmd').textContent : '';
  const visible = b => !b.hidden;

  // `cal` prints a real calendar above the "grab a time" line
  const calBlock = document.getElementById('cal');
  if (calBlock) {
    const pre = document.createElement('pre');
    pre.className = 'cal-out';
    pre.innerHTML = calendar(new Date());
    calBlock.querySelector('.eyebrow').after(pre);
  }

  function calendar(d) {
    const y = d.getFullYear(), m = d.getMonth();
    const title = d.toLocaleString('en-US', { month: 'long' }) + ' ' + y;
    const pad = ' '.repeat(Math.max(0, Math.floor((20 - title.length) / 2)));
    let out = pad + title + '\nSu Mo Tu We Th Fr Sa\n';
    const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    let line = '   '.repeat(first);
    for (let day = 1; day <= days; day++) {
      const s = String(day).padStart(2, ' ');
      line += (day === d.getDate() ? '<mark>' + s + '</mark>' : s) + ' ';
      if ((first + day) % 7 === 0 || day === days) { out += line.trimEnd() + '\n'; line = ''; }
    }
    return out.trimEnd();
  }

  // ---- boot: type every command in order ----
  let skip = false;
  const finish = () => { skip = true; };
  const sleep = ms => new Promise(r => setTimeout(r, skip ? 0 : ms));

  async function typeInto(el, text, speed) {
    el.textContent = '';
    for (let i = 0; i < text.length; i++) {
      if (skip) { el.textContent = text; return; }
      el.textContent += text[i];
      await sleep(speed + Math.random() * speed);
    }
  }

  async function boot() {
    if (!root.classList.contains('booting')) return;
    addEventListener('keydown', finish, { once: true });
    addEventListener('pointerdown', finish, { once: true });
    await sleep(250);
    for (const b of blocks) {
      if (!visible(b)) { b.classList.add('ran'); continue; }
      const cmd = b.querySelector('.cmd');
      b.classList.add('typing');
      await typeInto(cmd, cmd.textContent, 18);
      await sleep(140);
      b.classList.remove('typing');
      b.classList.add('ran');
      await sleep(120);
    }
    root.classList.remove('booting');
  }

  // ---- interactive prompt ----
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.innerHTML =
    '<div class="shell-out" aria-live="polite"></div>' +
    '<label class="shell-line"><span class="prompt"></span>' +
    '<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="shell command" placeholder="type help"></label>';
  (term.querySelector('.term-body') || term).appendChild(shell);
  const out = shell.querySelector('.shell-out');
  const input = shell.querySelector('input');
  shell.querySelector('.prompt').textContent = cwd + '$';

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem('sh-history') || '[]'); } catch (e) {}
  let hIndex = history.length;

  function print(html, cls) {
    const div = document.createElement('div');
    div.className = 'shell-print' + (cls ? ' ' + cls : '');
    if (typeof html === 'string') div.innerHTML = html; else div.appendChild(html);
    out.appendChild(div);
    return div;
  }
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function echo(line) {
    print('<span class="prompt">' + esc(cwd) + '$</span> ' + esc(line));
  }

  function go(url) {
    print('<span class="dim">loading ' + esc(url) + ' ...</span>');
    setTimeout(() => { location.href = url; }, 250);
  }

  function resolveDir(arg) {
    if (!arg || arg === '~' || arg === '/' || arg === '~/') return '/';
    if (arg === '..') return cwd.split('/').length > 2 ? DIRS[cwd.split('/')[1]] || '/' : '/';
    if (arg === '.') return location.pathname;
    const name = arg.replace(/^~?\/?/, '').replace(/\/$/, '');
    return DIRS[name] || null;
  }

  const BUILTINS = {
    help() {
      print(
        '<span class="dim">try the commands above, or:</span>\n' +
        '  ls                 list directories\n' +
        '  cd portfolio|blog|about|~\n' +
        '  open github|linkedin|x|curius|chat|admonymous\n' +
        '  whoami, pwd, date, history, clear\n' +
        '  export THEME=dark|light', 'pre');
    },
    ls(args) {
      // `ls <dir>` opens that directory; anything else falls through to the routes
      if (args.length) {
        const url = resolveDir(args[args.length - 1]);
        if (!url) return false;
        return go(url);
      }
      print('<span class="dir">portfolio/</span>  <span class="dir">blog/</span>  <span class="dir">about/</span>  README.md', 'pre');
    },
    cd(args) {
      const url = resolveDir(args[0]);
      if (!url) return print('bash: cd: ' + esc(args[0]) + ': No such file or directory');
      go(url);
    },
    open(args) {
      const href = LINKS[(args[0] || '').toLowerCase()];
      if (!href) return print('usage: open ' + Object.keys(LINKS).join('|'));
      window.open(href, '_blank', 'noopener');
    },
    whoami() { print('sahiti'); },
    pwd() { print('/home/sahiti' + cwd.slice(1)); },
    date() { print(new Date().toString().replace(/ \(.*\)$/, '')); },
    echo(args) { print(esc(args.join(' '))); },
    history() { print(history.map((h, i) => String(i + 1).padStart(4) + '  ' + esc(h)).join('\n'), 'pre'); },
    clear() {
      out.innerHTML = '';
      term.classList.add('cleared');
    },
    export(args) {
      const m = /^THEME=(dark|light)$/i.exec(args[0] || '');
      if (!m) return;
      if ((m[1].toLowerCase() === 'dark') !== root.classList.contains('dark')) window.toggleTheme();
    },
    sudo() { print('sahiti is not in the sudoers file. This incident will be reported.'); },
    exit() { print('logout\n<span class="dim">(there is no exit)</span>', 'pre'); },
    man(args) { if ((args[0] || '') === 'sahiti') return run('cat README.md'); print('What manual page do you want?'); },
    rm() { print('rm: permission denied. nice try'); },
    vim() { print('<span class="dim">you\'re stuck in vim now. (:q)</span>'); },
  };
  BUILTINS.vi = BUILTINS.nvim = BUILTINS.vim;
  BUILTINS.theme = () => window.toggleTheme();

  function showBlock(block) {
    term.classList.remove('cleared');
    const copy = block.cloneNode(true);
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    copy.querySelector('.eyebrow').remove();
    copy.classList.add('ran');
    print(copy);
  }

  function run(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    // a command printed on this page runs in place
    const here = blocks.find(b => visible(b) && cmdText(b) === trimmed);
    if (here) return showBlock(here);
    const [name, ...args] = trimmed.split(/\s+/);
    if (BUILTINS[name] && BUILTINS[name](args) !== false) return;
    const route = ROUTES.find(([re]) => re.test(trimmed));
    if (route) {
      const [path, id] = route[1].split('#');
      const block = path === location.pathname && document.getElementById(id);
      if (block && visible(block)) return showBlock(block);
      if (block) return print('<span class="dim">nothing playing right now</span>');
      return go(route[1]);
    }
    print('bash: ' + esc(name) + ': command not found');
  }

  function completions(prefix) {
    const words = Object.keys(BUILTINS)
      .concat(blocks.filter(visible).map(cmdText))
      .concat(Object.keys(DIRS).filter(d => d !== '~').map(d => 'cd ' + d))
      .concat(Object.keys(LINKS).map(l => 'open ' + l));
    return Array.from(new Set(words)).filter(w => w.startsWith(prefix)).sort();
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const line = input.value;
      input.value = '';
      echo(line);
      if (line.trim()) {
        history.push(line.trim());
        history = history.slice(-50);
        try { sessionStorage.setItem('sh-history', JSON.stringify(history)); } catch (err) {}
      }
      hIndex = history.length;
      run(line);
      input.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      if (hIndex > 0) input.value = history[--hIndex];
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      hIndex = Math.min(history.length, hIndex + 1);
      input.value = history[hIndex] || '';
      e.preventDefault();
    } else if (e.key === 'Tab') {
      if (!input.value) return;
      e.preventDefault();
      const options = completions(input.value);
      if (options.length === 1) input.value = options[0] + ' ';
      else if (options.length > 1) { echo(input.value); print(options.map(esc).join('  '), 'pre'); }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      BUILTINS.clear();
    } else if (e.key === 'Escape') {
      input.blur();
    }
  });
  input.addEventListener('input', () => input.scrollIntoView({ block: 'nearest' }));

  // clicking empty space in the window focuses the prompt, like a real terminal
  term.addEventListener('click', e => {
    if (e.target.closest('a, button, input') || String(getSelection())) return;
    input.focus({ preventScroll: true });
  });

  boot();
})();
