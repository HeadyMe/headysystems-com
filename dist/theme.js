(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('[data-theme-toggle]');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  let currentTheme = prefersDark.matches ? 'dark' : 'light';

  function icon(theme) {
    return theme === 'dark'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function apply(theme) {
    currentTheme = theme;
    root.setAttribute('data-theme', theme);
    if (toggle) {
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      toggle.innerHTML = icon(theme);
    }
  }

  apply(currentTheme);

  prefersDark.addEventListener('change', (event) => {
    if (!root.hasAttribute('data-theme-lock')) {
      apply(event.matches ? 'dark' : 'light');
    }
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      root.setAttribute('data-theme-lock', 'true');
      apply(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }
})();
