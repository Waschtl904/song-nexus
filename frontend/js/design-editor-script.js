/**
 * SONG-NEXUS Design Editor Script v1.0
 * Manages design system configuration through web UI
 * 
 * Features:
 * - Load design config from API
 * - Real-time preview updates
 * - Save to database
 * - Reset functionality
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let designConfig = {};
let originalConfig = {};
let previewIframe = null;
let apiBaseUrl = '/api';

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎨 Design Editor initializing...');

    try {
        // Load design config from API
        await loadDesignConfig();

        // Initialize form with loaded values
        initializeForm();

        // Setup event listeners
        setupEventListeners();

        // Create preview
        createPreview();

        console.log('✅ Design Editor ready!');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showStatus('Fehler beim Laden der Design-Konfiguration', 'error');
    }
});

// ============================================================================
// LOAD DESIGN CONFIG FROM API
// ============================================================================

async function loadDesignConfig() {
    try {
        const response = await fetch(`${apiBaseUrl}/design-system`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        designConfig = await response.json();
        originalConfig = JSON.parse(JSON.stringify(designConfig)); // Deep copy for reset

        console.log('✅ Design config loaded:', designConfig);
    } catch (error) {
        console.error('❌ Error loading design config:', error);
        throw error;
    }
}

// ============================================================================
// FORM INITIALIZATION
// ============================================================================

function initializeForm() {
    // COLORS
    setInputValue('colorPrimary', designConfig.colors?.primary);
    setInputValue('colorSecondary', designConfig.colors?.secondary);
    setInputValue('colorAccentTeal', designConfig.colors?.accent_teal);
    setInputValue('colorTextPrimary', designConfig.colors?.text_primary);
    setInputValue('colorBackground', designConfig.colors?.background);

    // IMAGES
    setInputValue('backgroundImageUrl', designConfig.components?.buttons?.track_play?.background_image_url || '');
    setInputValue('playerBackgroundImageUrl', designConfig.components?.buttons?.track_play?.player_background_image_url || '');
    setInputValue('logoUrl', designConfig.components?.buttons?.track_play?.logo_url || '');
    setInputValue('buttonPlayImageUrl', designConfig.components?.buttons?.track_play?.image_url);

    // TYPOGRAPHY
    setInputValue('fontFamilyBase', designConfig.typography?.font_family_base);
    setInputValue('fontSizeBase', designConfig.typography?.font_sizes?.base?.replace('px', ''));

    // LAYOUT
    setInputValue('buttonPadding', designConfig.components?.buttons?.primary?.padding);
    setInputValue('borderRadius', designConfig.radius?.base?.replace('px', ''));
    setInputValue('spacingUnit', designConfig.spacing?.['8']?.replace('px', ''));

    // PLAY BUTTON BASICS
    setInputValue('buttonPlayIcon', designConfig.components?.buttons?.track_play?.icon);
    setInputValue('buttonPlayLabel', designConfig.components?.buttons?.track_play?.label);
    setInputValue('buttonPlayWidth', designConfig.components?.buttons?.track_play?.width);
    setInputValue('buttonPlayHeight', designConfig.components?.buttons?.track_play?.height);

    // PLAY BUTTON COLORS & STYLING
    setInputValue('buttonPlayGradientStart', designConfig.components?.buttons?.track_play?.background_gradient_start);
    setInputValue('buttonPlayGradientEnd', designConfig.components?.buttons?.track_play?.background_gradient_end);
    setInputValue('buttonPlayTextColor', designConfig.components?.buttons?.track_play?.text_color);
    setInputValue('buttonPlayBorderColor', designConfig.components?.buttons?.track_play?.border_color);
    setInputValue('buttonPlayTextShadow', designConfig.components?.buttons?.track_play?.text_shadow);

    // PLAY BUTTON SPACING & SIZE
    setInputValue('buttonPlayPadding', designConfig.components?.buttons?.track_play?.padding);
    setInputValue('buttonPlayFontSize', designConfig.components?.buttons?.track_play?.font_size?.replace('px', ''));
    setInputValue('buttonPlayBorderWidth', designConfig.components?.buttons?.track_play?.border_width?.replace('px', ''));
    setInputValue('buttonPlayBorderRadius', designConfig.components?.buttons?.track_play?.border_radius?.replace('px', ''));
    setInputValue('buttonPlayMarginTop', designConfig.components?.buttons?.track_play?.margin_top?.replace('px', '') || '12');

    // PLAY BUTTON EFFECTS & HOVER
    setInputValue('buttonPlayOpacity', designConfig.components?.buttons?.track_play?.opacity);
    setInputValue('buttonPlayOpacityHover', designConfig.components?.buttons?.track_play?.opacity_hover);
    setInputValue('buttonPlayHoverOffset', designConfig.components?.buttons?.track_play?.hover_offset_y?.replace('px', ''));
    setInputValue('buttonPlayShadowIntensity', '0.4');
    setInputValue('buttonPlayFilter', designConfig.components?.buttons?.track_play?.filter);
    setInputValue('buttonPlayFilterHover', designConfig.components?.buttons?.track_play?.filter_hover);
    setInputValue('buttonPlayTransform', designConfig.components?.buttons?.track_play?.transform);
    setInputValue('buttonPlayTransformHover', designConfig.components?.buttons?.track_play?.transform_hover);
    setInputValue('buttonPlayTransition', designConfig.components?.buttons?.track_play?.transition);

    // PLAY BUTTON SHADOWS
    setInputValue('buttonPlayBoxShadow', designConfig.components?.buttons?.track_play?.box_shadow);
    setInputValue('buttonPlayBoxShadowHover', designConfig.components?.buttons?.track_play?.box_shadow_hover);
    setInputValue('buttonPlayBoxShadowActive', designConfig.components?.buttons?.track_play?.box_shadow_active);

    console.log('✅ Form initialized with design config values');
}

// Helper: Set input value and update display
function setInputValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (element.type === 'color') {
        element.value = value || '#000000';
        updateColorDisplay(elementId);
    } else {
        element.value = value || '';
    }
}

// Update color value display
function updateColorDisplay(colorInputId) {
    const colorInput = document.getElementById(colorInputId);
    const displayElement = document.getElementById(`${colorInputId}Value`);

    if (colorInput && displayElement) {
        displayElement.textContent = colorInput.value.toUpperCase();
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Color inputs
    const colorInputs = document.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            updateColorDisplay(e.target.id);
            updatePreview();
        });
        input.addEventListener('input', updatePreview);
    });

    // Text inputs
    const textInputs = document.querySelectorAll('input[type="text"], input[type="number"], textarea');
    textInputs.forEach(input => {
        input.addEventListener('input', updatePreview);
    });

    // Buttons
    document.getElementById('saveBtn').addEventListener('click', saveDesignConfig);
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    document.getElementById('masterResetBtn').addEventListener('click', masterReset);

    console.log('✅ Event listeners setup complete');
}

// ============================================================================
// PREVIEW UPDATES
// ============================================================================

function updatePreview() {
    const previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) return;

    // Collect current values
    const currentConfig = collectFormValues();

    // Generate preview HTML
    const previewHTML = generatePreviewHTML(currentConfig);

    // Update preview
    previewContainer.innerHTML = previewHTML;

    // Apply inline styles
    applyPreviewStyles(currentConfig);

    console.log('🎨 Preview updated');
}

// Generate preview HTML
function generatePreviewHTML(config) {
    const playButton = config.components?.buttons?.track_play;

    return `
    <div style="width: 100%; text-align: center;">
      <h3 style="color: ${config.colors?.text_primary}; margin-bottom: 20px;">
        Design Preview
      </h3>

      <!-- Color Palette -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 30px;">
        <div style="background: ${config.colors?.primary}; padding: 20px; border-radius: 4px; color: white; font-size: 12px;">
          Primary
        </div>
        <div style="background: ${config.colors?.secondary}; padding: 20px; border-radius: 4px; color: white; font-size: 12px;">
          Secondary
        </div>
        <div style="background: ${config.colors?.accent_teal}; padding: 20px; border-radius: 4px; color: white; font-size: 12px;">
          Accent
        </div>
      </div>

      <!-- Play Button Preview -->
      <div style="margin: 30px 0;">
        <p style="color: #888; font-size: 12px; margin-bottom: 15px;">Play Button Preview:</p>
        <div style="display: flex; justify-content: center;">
          <button id="previewPlayButton" style="
            width: ${playButton?.width}px;
            height: ${playButton?.height}px;
            background: linear-gradient(135deg, ${playButton?.background_gradient_start}, ${playButton?.background_gradient_end});
            color: ${playButton?.text_color};
            border: ${playButton?.border_width} solid ${playButton?.border_color};
            border-radius: ${playButton?.border_radius};
            padding: ${playButton?.padding};
            font-size: ${playButton?.font_size};
            font-weight: bold;
            text-shadow: ${playButton?.text_shadow};
            box-shadow: ${playButton?.box_shadow};
            cursor: pointer;
            transition: ${playButton?.transition};
            text-transform: uppercase;
            opacity: ${playButton?.opacity};
            margin-top: ${playButton?.margin_top}px;
          ">
            ${playButton?.icon} ${playButton?.label}
          </button>
        </div>
      </div>

      <!-- Typography Preview -->
      <div style="margin-top: 30px; text-align: left; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 4px;">
        <p style="color: ${config.colors?.text_primary}; font-size: 20px; margin: 10px 0;">
          Large Text (${config.typography?.font_sizes?.['2xl']})
        </p>
        <p style="color: ${config.colors?.text_primary}; font-size: 14px; margin: 10px 0;">
          Base Text (${config.typography?.font_sizes?.base})
        </p>
        <p style="color: ${config.colors?.text_secondary}; font-size: 12px; margin: 10px 0;">
          Small Text (${config.typography?.font_sizes?.sm})
        </p>
      </div>
    </div>
  `;
}

// Apply hover effects to preview button
function applyPreviewStyles(config) {
    const previewButton = document.getElementById('previewPlayButton');
    if (!previewButton) return;

    const playButton = config.components?.buttons?.track_play;

    previewButton.addEventListener('mouseenter', () => {
        previewButton.style.transform = playButton?.transform_hover;
        previewButton.style.boxShadow = playButton?.box_shadow_hover;
        previewButton.style.filter = playButton?.filter_hover;
        previewButton.style.opacity = playButton?.opacity_hover;
    });

    previewButton.addEventListener('mouseleave', () => {
        previewButton.style.transform = playButton?.transform;
        previewButton.style.boxShadow = playButton?.box_shadow;
        previewButton.style.filter = playButton?.filter;
        previewButton.style.opacity = playButton?.opacity;
    });

    previewButton.addEventListener('mousedown', () => {
        previewButton.style.transform = playButton?.transform_active;
        previewButton.style.boxShadow = playButton?.box_shadow_active;
    });

    previewButton.addEventListener('mouseup', () => {
        previewButton.style.transform = playButton?.transform;
        previewButton.style.boxShadow = playButton?.box_shadow;
    });
}

// ============================================================================
// COLLECT FORM VALUES - MAPPED TO DATABASE SCHEMA
// ============================================================================

function collectFormValues() {
    // ✅ Sammle alle Farb-Inputs
    const colorPrimary = document.getElementById('colorPrimary')?.value || '#00CC77';
    const colorSecondary = document.getElementById('colorSecondary')?.value || '#5E5240';
    const colorAccentTeal = document.getElementById('colorAccentTeal')?.value || '#32B8C6';
    const colorTextPrimary = document.getElementById('colorTextPrimary')?.value || '#00ffff';
    const colorBackground = document.getElementById('colorBackground')?.value || '#FCF8F9';

    // ✅ Sammle Typography
    const fontFamilyBase = document.getElementById('fontFamilyBase')?.value || 'Rajdhani, sans-serif';
    const fontSizeBase = parseInt(document.getElementById('fontSizeBase')?.value || 14);
    const fontWeightNormal = parseInt(document.getElementById('fontWeightNormal')?.value || 400);
    const fontWeightBold = parseInt(document.getElementById('fontWeightBold')?.value || 600);

    // ✅ Sammle Spacing & Radius
    const spacingUnit = parseInt(document.getElementById('spacingUnit')?.value || 8);
    const borderRadius = parseInt(document.getElementById('borderRadius')?.value || 8);

    // ✅ Sammle Button-Werte
    const buttonBackgroundColor = document.getElementById('buttonPlayGradientStart')?.value || '#c0c0c0';
    const buttonTextColor = document.getElementById('buttonPlayTextColor')?.value || '#000000';
    const buttonBorderRadius = parseInt(document.getElementById('buttonPlayBorderRadius')?.value || 8);
    const buttonPadding = document.getElementById('buttonPlayPadding')?.value || '12px 24px';

    // ✅ Sammle Images
    const backgroundImageUrl = document.getElementById('backgroundImageUrl')?.value || null;
    const logoUrl = document.getElementById('logoUrl')?.value || null;
    const heroImageUrl = document.getElementById('heroImageUrl')?.value || null;

    // ✅ Sammle Player-Werte
    const playerBackgroundImageUrl = document.getElementById('playerBackgroundImageUrl')?.value || null;
    const playerButtonColor = document.getElementById('playerButtonColor')?.value || '#00CC77';
    const playerButtonSize = parseInt(document.getElementById('playerButtonSize')?.value || 70);

    // ✅ RETOURNIERE STRUKTUR EXAKT WIE BACKEND ERWARTET
    return {
        version: "1.0",
        meta: {
            name: "SONG-NEXUS Cyberpunk Theme",
            author: "Designer",
            lastUpdated: new Date().toISOString(),
            description: "Updated design configuration"
        },
        colors: {
            primary: colorPrimary,
            secondary: colorSecondary,
            accent_teal: colorAccentTeal,
            accent_green: document.getElementById('colorAccentGreen')?.value || '#22C55E',
            accent_red: document.getElementById('colorAccentRed')?.value || '#FF5459',
            text_primary: colorTextPrimary,
            background: colorBackground
        },
        typography: {
            font_family_base: fontFamilyBase,
            font_sizes: {
                base: fontSizeBase + "px"
            },
            font_weights: {
                normal: fontWeightNormal,
                bold: fontWeightBold
            }
        },
        spacing: {
            "8": spacingUnit + "px"
        },
        radius: {
            base: borderRadius + "px"
        },
        components: {
            buttons: {
                primary: {
                    background: buttonBackgroundColor,
                    text_color: buttonTextColor,
                    border_radius: buttonBorderRadius + "px",
                    padding: buttonPadding
                }
            },
            player: {
                background_image_url: playerBackgroundImageUrl,
                button_color: playerButtonColor,
                button_size: playerButtonSize + "px"
            }
        },
        images: {
            background: backgroundImageUrl,
            logo: logoUrl,
            hero: heroImageUrl
        }
    };
}
// ============================================================================
// SAVE DESIGN CONFIG
// ============================================================================

async function saveDesignConfig() {
    try {
        showStatus('Speichert...', 'loading');

        const formData = collectFormValues();

        // Prepare data for API
        const payload = {
            ...formData,
            updated_by: 'Designer', // TODO: Get from authenticated user
        };

        console.log('📤 Saving design config:', payload);

        const response = await fetch(`${apiBaseUrl}/design-system/1`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `API error: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Design config saved:', result);

        showStatus('✅ Design-Konfiguration erfolgreich gespeichert!', 'success');

        // Update original config
        originalConfig = JSON.parse(JSON.stringify(formData));

    } catch (error) {
        console.error('❌ Error saving design config:', error);
        showStatus(`❌ Fehler beim Speichern: ${error.message}`, 'error');
    }
}

// ============================================================================
// RESET FUNCTIONALITY
// ============================================================================

function resetForm() {
    if (confirm('Alle Änderungen zurücksetzen?')) {
        designConfig = JSON.parse(JSON.stringify(originalConfig));
        initializeForm();
        updatePreview();
        showStatus('✅ Form zurückgesetzt', 'success');
    }
}

function masterReset() {
    if (confirm('⚠️ Alle Design-Einstellungen auf Standard zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
        if (confirm('Wirklich alle auf Standard zurücksetzen?')) {
            // Call API to reset to defaults
            fetch(`${apiBaseUrl}/design-system/1/reset`, {
                method: 'POST',
            })
                .then(res => res.json())
                .then(data => {
                    designConfig = data;
                    originalConfig = JSON.parse(JSON.stringify(data));
                    initializeForm();
                    updatePreview();
                    showStatus('✅ Alle Einstellungen zurückgesetzt!', 'success');
                })
                .catch(err => {
                    console.error('Error:', err);
                    showStatus('❌ Fehler beim Zurücksetzen', 'error');
                });
        }
    }
}

// ============================================================================
// STATUS MESSAGES
// ============================================================================

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `status-message show status-${type}`;

    // Auto-hide after 3 seconds (except loading)
    if (type !== 'loading') {
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    }
}

// ============================================================================
// PREVIEW CREATION (Optional: IFrame setup)
// ============================================================================

function createPreview() {
    // Initial preview render
    updatePreview();
    console.log('✅ Preview created');
}

// ============================================================================
// EXPORT (Optional future feature)
// ============================================================================

function exportDesignConfig() {
    const config = collectFormValues();
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'design-config.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showStatus('✅ Design-Konfiguration exportiert!', 'success');
}

console.log('🎨 Design Editor Script loaded');