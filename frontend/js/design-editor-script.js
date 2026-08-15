/**
 * SONG-NEXUS Design Editor Script v1.2 - COMPLETE REFACTOR
 * ✅ Live CSS-Variable Updates
 * ✅ Real-time preview on main page
 * ✅ Full design system mapping
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let designConfig = {};
let originalConfig = {};
const apiBaseUrl = '/api';   // relativ, siehe Begründung in config.js

// CSS Variable mapping
const cssVariableMap = {
    'colors.primary': '--color-primary',
    'colors.secondary': '--color-secondary',
    'colors.accent_teal': '--color-accent-teal',
    'colors.accent_green': '--color-accent-green',
    'colors.accent_red': '--color-accent-red',
    'colors.text_primary': '--color-text-primary',
    'colors.background': '--color-background',
    'typography.font_family_base': '--font-family-base',
    'typography.font_sizes.base': '--font-size-base',
    'radius.base': '--border-radius',
    'spacing.8': '--spacing-unit'
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎨 Design Editor v1.2 initializing...');

    try {
        await loadDesignConfig();
        initializeForm();
        setupEventListeners();
        applyLivePreview(); // ← WICHTIG: Initial preview
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
        console.log('🔄 Loading design config from:', apiBaseUrl + '/design-system');

        const response = await fetch(`${apiBaseUrl}/design-system`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        console.log('📊 Response status:', response.status);

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        designConfig = await response.json();
        originalConfig = JSON.parse(JSON.stringify(designConfig));

        console.log('✅ Design config loaded:', designConfig);
    } catch (error) {
        console.error('❌ Error loading design config:', error);
        showStatus(`Fehler beim Laden der Konfiguration: ${error.message}`, 'error');
        throw error;
    }
}

// ============================================================================
// FORM INITIALIZATION
// ============================================================================

function initializeForm() {
    console.log('📝 Initializing form with values...');

    // COLORS
    setInputValue('colorPrimary', designConfig.colors?.primary);
    setInputValue('colorSecondary', designConfig.colors?.secondary);
    setInputValue('colorAccentTeal', designConfig.colors?.accent_teal);
    setInputValue('colorTextPrimary', designConfig.colors?.text_primary);
    setInputValue('colorBackground', designConfig.colors?.background);

    // IMAGES
    setInputValue('backgroundImageUrl', designConfig.images?.background || '');
    setInputValue('logoUrl', designConfig.images?.logo || '');
    setInputValue('playerBackgroundImageUrl', designConfig.components?.player?.background_image_url || '');

    // TYPOGRAPHY
    setInputValue('fontFamilyBase', designConfig.typography?.font_family_base);
    setInputValue('fontSizeBase', designConfig.typography?.font_sizes?.base?.replace('px', ''));

    // LAYOUT
    setInputValue('buttonPadding', designConfig.components?.buttons?.primary?.padding);
    setInputValue('borderRadius', designConfig.radius?.base?.replace('px', ''));
    setInputValue('spacingUnit', designConfig.spacing?.['8']?.replace('px', ''));

    console.log('✅ Form initialized');
}

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
    // Color inputs - live update
    const colorInputs = document.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            updateColorDisplay(e.target.id);
            applyLivePreview(); // ← LIVE UPDATE!
            updatePreview();
        });
        input.addEventListener('input', () => {
            updateColorDisplay(input.id);
            applyLivePreview(); // ← LIVE UPDATE while dragging!
        });
    });

    // Text inputs - live update
    const textInputs = document.querySelectorAll('input[type="text"], input[type="number"]');
    textInputs.forEach(input => {
        input.addEventListener('input', () => {
            applyLivePreview();
            updatePreview();
        });
    });

    // Buttons
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const masterResetBtn = document.getElementById('masterResetBtn');

    if (saveBtn) saveBtn.addEventListener('click', saveDesignConfig);
    if (resetBtn) resetBtn.addEventListener('click', resetForm);
    if (masterResetBtn) masterResetBtn.addEventListener('click', masterReset);

    console.log('✅ Event listeners setup complete');
}

// ============================================================================
// 🔥 LIVE PREVIEW - THE MAGIC SAUCE! 🔥
// ============================================================================

function applyLivePreview() {
    const config = collectFormValues();
    const root = document.documentElement;

    console.log('🎨 Applying live CSS variables...', config);

    // ✅ COLORS
    root.style.setProperty('--color-primary', config.colors.primary);
    root.style.setProperty('--color-secondary', config.colors.secondary);
    root.style.setProperty('--color-accent-teal', config.colors.accent_teal);
    root.style.setProperty('--color-text-primary', config.colors.text_primary);
    root.style.setProperty('--color-background', config.colors.background);

    // ✅ TYPOGRAPHY
    root.style.setProperty('--font-family-base', config.typography.font_family_base);
    root.style.setProperty('--font-size-base', config.typography.font_sizes.base);

    // ✅ LAYOUT
    root.style.setProperty('--border-radius', config.radius.base);
    root.style.setProperty('--spacing-unit', config.spacing['8']);

    // ✅ IMAGES (for background)
    if (config.images.background) {
        document.body.style.backgroundImage = `url('${config.images.background}')`;
    }

    // ✅ BUTTON PADDING
    const buttonPadding = config.components.buttons.primary.padding;
    root.style.setProperty('--button-padding', buttonPadding);

    console.log('✅ CSS variables applied to root element!');
}

// ============================================================================
// PREVIEW PANEL
// ============================================================================

function updatePreview() {
    const previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) return;

    const config = collectFormValues();
    const previewHTML = generatePreviewHTML(config);

    previewContainer.innerHTML = previewHTML;
    console.log('🎨 Preview panel updated');
}

function generatePreviewHTML(config) {
    return `
        <div style="width: 100%; text-align: center; padding: 20px;">
            <h3 style="color: ${config.colors.text_primary}; margin-bottom: 20px;">
                🎨 Design Preview
            </h3>

            <!-- Color Palette -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 30px;">
                <div style="background: ${config.colors.primary}; padding: 20px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold;">
                    Primary<br/>${config.colors.primary}
                </div>
                <div style="background: ${config.colors.secondary}; padding: 20px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold;">
                    Secondary<br/>${config.colors.secondary}
                </div>
                <div style="background: ${config.colors.accent_teal}; padding: 20px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold;">
                    Accent<br/>${config.colors.accent_teal}
                </div>
            </div>

            <!-- Buttons -->
            <div style="margin: 30px 0;">
                <p style="color: #888; font-size: 12px; margin-bottom: 15px;">Button Preview:</p>
                <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                    <button style="
                        background: ${config.colors.primary};
                        color: white;
                        padding: ${config.components.buttons.primary.padding};
                        border: none;
                        border-radius: ${config.radius.base};
                        font-size: 14px;
                        cursor: pointer;
                        font-family: ${config.typography.font_family_base};
                        transition: all 0.3s;
                    " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        Primary Button
                    </button>
                    <button style="
                        background: ${config.colors.secondary};
                        color: white;
                        padding: ${config.components.buttons.primary.padding};
                        border: none;
                        border-radius: ${config.radius.base};
                        font-size: 14px;
                        cursor: pointer;
                        font-family: ${config.typography.font_family_base};
                        transition: all 0.3s;
                    " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        Secondary Button
                    </button>
                </div>
            </div>

            <!-- Typography Preview -->
            <div style="margin-top: 30px; text-align: left; background: rgba(0,0,0,0.1); padding: 15px; border-radius: ${config.radius.base};">
                <p style="color: ${config.colors.text_primary}; font-family: ${config.typography.font_family_base}; font-size: 20px; font-weight: bold; margin: 10px 0;">
                    Large Text (20px)
                </p>
                <p style="color: ${config.colors.text_primary}; font-family: ${config.typography.font_family_base}; font-size: ${config.typography.font_sizes.base}; margin: 10px 0;">
                    Base Text (${config.typography.font_sizes.base})
                </p>
            </div>
        </div>
    `;
}

// ============================================================================
// COLLECT FORM VALUES
// ============================================================================

function collectFormValues() {
    const colors = {
        primary: document.getElementById('colorPrimary')?.value || '#00CC77',
        secondary: document.getElementById('colorSecondary')?.value || '#5E5240',
        accent_teal: document.getElementById('colorAccentTeal')?.value || '#32B8C6',
        text_primary: document.getElementById('colorTextPrimary')?.value || '#00ffff',
        background: document.getElementById('colorBackground')?.value || '#FCF8F9'
    };

    const typography = {
        font_family_base: document.getElementById('fontFamilyBase')?.value || 'Rajdhani, sans-serif',
        font_sizes: {
            base: (document.getElementById('fontSizeBase')?.value || 14) + "px"
        }
    };

    const spacing = {
        "8": (parseInt(document.getElementById('spacingUnit')?.value || 8)) + "px"
    };

    const radius = {
        base: (parseInt(document.getElementById('borderRadius')?.value || 8)) + "px"
    };

    const components = {
        buttons: {
            primary: {
                background: document.getElementById('colorPrimary')?.value || '#00CC77',
                text_color: '#FFFFFF',
                border_radius: (parseInt(document.getElementById('borderRadius')?.value || 8)) + "px",
                padding: document.getElementById('buttonPadding')?.value || '12px 24px'
            }
        },
        player: {
            background_image_url: document.getElementById('playerBackgroundImageUrl')?.value || null,
            button_color: document.getElementById('playerButtonColor')?.value || '#00CC77',
            button_size: (parseInt(document.getElementById('playerButtonSize')?.value || 70)) + "px"
        }
    };

    const images = {
        background: document.getElementById('backgroundImageUrl')?.value || null,
        logo: document.getElementById('logoUrl')?.value || null
    };

    return {
        colors,
        typography,
        spacing,
        radius,
        components,
        images
    };
}

// ============================================================================
// SAVE DESIGN CONFIG
// ============================================================================

async function saveDesignConfig() {
    try {
        showStatus('⏳ Speichert...', 'loading');

        const formData = collectFormValues();

        console.log('📤 Saving design config...');

        const url = `${apiBaseUrl}/design-system/1`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        if (!response.ok) {
            let errorMessage = `Server returned ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) { }
            throw new Error(`❌ API Error (${response.status}): ${errorMessage}`);
        }

        const result = await response.json();
        console.log('✅ Server response:', result);

        showStatus('✅ Design-Konfiguration erfolgreich gespeichert!', 'success');
        originalConfig = JSON.parse(JSON.stringify(formData));

    } catch (error) {
        console.error('❌ Error saving design config:', error.message);
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
        applyLivePreview();
        updatePreview();
        showStatus('✅ Form zurückgesetzt', 'success');
    }
}

function masterReset() {
    if (confirm('⚠️ Alle Design-Einstellungen auf Standard zurücksetzen?')) {
        if (confirm('Wirklich? Diese Aktion kann nicht rückgängig gemacht werden!')) {
            fetch(`${apiBaseUrl}/design-system/1/reset`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })
                .then(res => {
                    if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    designConfig = data;
                    originalConfig = JSON.parse(JSON.stringify(data));
                    initializeForm();
                    applyLivePreview();
                    updatePreview();
                    showStatus('✅ Alle Einstellungen zurückgesetzt!', 'success');
                })
                .catch(err => {
                    console.error('❌ Reset Error:', err);
                    showStatus(`❌ Fehler beim Zurücksetzen: ${err.message}`, 'error');
                });
        }
    }
}

// ============================================================================
// STATUS MESSAGES
// ============================================================================

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    if (!statusElement) {
        console.warn('⚠️ Status element not found');
        return;
    }

    statusElement.textContent = message;
    statusElement.className = `status-message show status-${type}`;

    console.log(`[${type.toUpperCase()}] ${message}`);

    if (type !== 'loading') {
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    }
}

// ============================================================================
// PREVIEW CREATION
// ============================================================================

function createPreview() {
    updatePreview();
    console.log('✅ Preview created');
}

console.log('🎨 Design Editor Script v1.2 loaded');
