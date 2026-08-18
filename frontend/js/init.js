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

/* Frueher standen hier noch eine zweite Auth-Initialisierung, ein zweiter
   Magic-Link-Aufruf und ein zweiter Theme-Umschalter. Alle drei gibt es im
   Bundle bereits (main.js und app.js rufen Auth.init, ui.js haengt den
   Theme-Umschalter an). Dadurch war jeder Klick doppelt bis vierfach
   verdrahtet: die Anmeldung schickte drei WebAuthn-Anfragen mit drei
   verschiedenen Challenges, und der Theme-Umschalter schaltete zweimal,
   also sichtbar gar nicht. Dieser Teil bleibt deshalb leer. */

// ── SCHLIESSEN-KNOPF DES ANMELDEFENSTERS ────────────────────────────────────
// Das ist die einzige Bindung dafuer im Projekt, Auth.init uebernimmt sie nicht.
function initAuthModalClose() {
  const closeBtn  = document.getElementById('closeAuthModalBtn');
  const authModal = document.getElementById('authModal');
  if (!closeBtn || !authModal) return;
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    authModal.style.display = 'none';
  });
}

// ── BOOTSTRAP ───────────────────────────────────────────────────────────────
function bootstrap() {
  loadDesignSystemFromAPI();
  initAuthModalClose();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
