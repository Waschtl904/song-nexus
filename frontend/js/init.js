/**
 * init.js — Ersetzt alle Inline-<script>-Blöcke aus index.html
 * Wird als externe Datei geladen → kein Nonce nötig, CSP-konform
 */

// ── 1. DESIGN SYSTEM RUNTIME LOADER ────────────────────────────────────────
async function loadDesignSystemFromAPI() {
  try {
    const response = await fetch('/api/design-system', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include'
    });
    if (!response.ok) return false;
    const designSystem = await response.json();
    const colors = designSystem.colors || {};
    const typography = designSystem.typography || {};
    const spacing = designSystem.spacing || {};
    const radius = designSystem.radius || {};
    const components = designSystem.components || {};
    let cssVariables = 'html {\n';
    if (colors.primary)              cssVariables += `  --color-primary: ${colors.primary};\n`;
    if (colors.secondary)            cssVariables += `  --color-secondary: ${colors.secondary};\n`;
    if (colors.accent_teal)          cssVariables += `  --color-accent-teal: ${colors.accent_teal};\n`;
    if (colors.accent_green)         cssVariables += `  --color-accent-green: ${colors.accent_green};\n`;
    if (colors.accent_red)           cssVariables += `  --color-accent-red: ${colors.accent_red};\n`;
    if (colors.text_primary)         cssVariables += `  --color-text-primary: ${colors.text_primary};\n`;
    if (colors.background)           cssVariables += `  --color-background: ${colors.background};\n`;
    if (typography.font_family_base) cssVariables += `  --font-family-base: ${typography.font_family_base};\n`;
    if (typography.font_sizes?.base) cssVariables += `  --font-size-base: ${typography.font_sizes.base};\n`;
    if (typography.font_weights?.normal) cssVariables += `  --font-weight-normal: ${typography.font_weights.normal};\n`;
    if (typography.font_weights?.bold)   cssVariables += `  --font-weight-bold: ${typography.font_weights.bold};\n`;
    if (spacing['8'])                cssVariables += `  --space-8: ${spacing['8']};\n`;
    if (radius.base)                 cssVariables += `  --radius-base: ${radius.base};\n`;
    if (components.buttons?.primary?.background)    cssVariables += `  --button-primary-background: ${components.buttons.primary.background};\n`;
    if (components.buttons?.primary?.padding)        cssVariables += `  --button-primary-padding: ${components.buttons.primary.padding};\n`;
    if (components.buttons?.primary?.border_radius)  cssVariables += `  --button-primary-border-radius: ${components.buttons.primary.border_radius};\n`;
    cssVariables += '}\n';
    const styleElement = document.getElementById('design-system-styles');
    if (styleElement) { styleElement.textContent = cssVariables; return true; }
    return false;
  } catch (err) {
    console.warn('Design System API unavailable, using CSS defaults.');
    return false;
  }
}

// ── 2. AUTH INIT ────────────────────────────────────────────────────────────
function ensureAuthInitialized() {
  if (typeof Auth === 'undefined') {
    setTimeout(ensureAuthInitialized, 50);
    return;
  }
  if (typeof Auth.init === 'function') Auth.init();

  const closeBtn  = document.getElementById('closeAuthModalBtn');
  const authModal = document.getElementById('authModal');
  if (closeBtn && authModal) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      authModal.style.display = 'none';
    });
  }
}

// ── 3. MAGIC LINK HANDLER ───────────────────────────────────────────────────
function handleMagicLink() {
  if (window.location.pathname === '/auth/magic-link' ||
      window.location.pathname.includes('auth/magic-link')) {
    const verify = async () => {
      if (typeof Auth !== 'undefined' && Auth.verifyMagicLinkFromUrl) {
        try { await Auth.verifyMagicLinkFromUrl(); }
        catch (err) { console.error('Magic link verification failed:', err); }
      }
    };
    setTimeout(verify, 500);
  }
}

// ── 4. THEME TOGGLE ─────────────────────────────────────────────────────────
function initThemeToggle() {
  const html = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let currentTheme = prefersDark ? 'dark' : 'light';
  html.setAttribute('data-theme', currentTheme);

  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  function setIcon(theme) {
    toggle.innerHTML = theme === 'dark'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  setIcon(currentTheme);
  toggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', currentTheme);
    setIcon(currentTheme);
  });
}

// ── BOOTSTRAP ───────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadDesignSystemFromAPI();
    initThemeToggle();
    handleMagicLink();
    setTimeout(ensureAuthInitialized, 1000);
  });
} else {
  loadDesignSystemFromAPI();
  initThemeToggle();
  handleMagicLink();
  setTimeout(ensureAuthInitialized, 1000);
}
