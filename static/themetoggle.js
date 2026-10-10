function syncToggleLabel() {
  const btn = document.querySelector('.theme-toggle');
  if (btn) btn.textContent = document.documentElement.classList.contains('dark') ? '[light]' : '[dark]';
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
  syncToggleLabel();
}

function initTheme() {
  const savedMode = localStorage.getItem('darkMode');
  if (savedMode === 'true') {
    document.documentElement.classList.add('dark');
  }
}

window.toggleTheme = toggleTheme;
initTheme();
document.addEventListener('DOMContentLoaded', syncToggleLabel);
