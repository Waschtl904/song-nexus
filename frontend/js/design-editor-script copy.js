/**
 * SONG-NEXUS Design Editor Script v1.1 - FIXED
 * Manages design system configuration through web UI
 * 
 * Features:
 * - Load design config from API
 * - Real-time preview updates
 * - Save to database (FIXED)
 * - Reset functionality
 */


// ============================================================================
// STATE MANAGEMENT
// ============================================================================


let designConfig = {};
let originalConfig = {};
let previewIframe = null;
const apiBaseUrl = 'https://localhost:3000/api'; // ✅ EXPLIZIT - keine Fallbacks


// ============================================================================
// INITIALIZATION
// ============================================================================


document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎨 Design Editor v1.1 initializing...');
    console.log('📍 API Base URL:', apiBaseUrl);

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
        console.log('📊 Response type:', response.headers.get('content-type'));

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        designConfig = await response.json();
        originalConfig = JSON.parse(JSON.stringify(designConfig)); // Deep copy for reset

        console.log('✅ Design config loaded:', designConfig);
        console.log('   Colors:', designConfig.colors);
        console.log('   Updated by:', designConfig.metadata?.updated_by);
        console.log('   Updated at:', designConfig.metadata?.updated_at);
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
    setInputValue('colorAccentGreen', designConfig.colors?.accent_green);
    setInputValue('colorAccentRed', designConfig.colors?.accent_red);
    setInputValue('colorTextPrimary', designConfig.colors?.text_primary);
    setInputValue('colorBackground', designConfig.colors?.background);

    // IMAGES
    setInputValue('backgroundImageUrl', designConfig.images?.background || '');
    setInputValue('logoUrl', designConfig.images?.logo || '');
    setInputValue('heroImageUrl', designConfig.images?.hero || '');
    setInputValue('playerBackgroundImageUrl', designConfig.components?.player?.background_image_url || '');

    // TYPOGRAPHY
    setInputValue('fontFamilyBase', designConfig.typography?.font_family_base);
    setInputValue('fontSizeBase', designConfig.typography?.font_sizes?.base?.replace('px', ''));
    setInputValue('fontWeightNormal', designConfig.typography?.font_weights?.normal);
    setInputValue('fontWeightBold', designConfig.typography?.font_weights?.bold);

    // LAYOUT
    setInputValue('buttonPadding', designConfig.components?.buttons?.primary?.padding);
    setInputValue('borderRadius', designConfig.radius?.base?.replace('px', ''));
    setInputValue('spacingUnit', designConfig.spacing?.['8']?.replace('px', ''));

    // PLAYER
    setInputValue('playerButtonColor', designConfig.components?.player?.button_color);
    setInputValue('playerButtonSize', designConfig.components?.player?.button_size?.replace('px', ''));

    console.log('✅ Form initialized');
}


// Helper: Set input value and update display
function setInputValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`⚠️ Element not found: ${elementId}`);
        return;
    }

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
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const masterResetBtn = document.getElementById('masterResetBtn');

    if (saveBtn) saveBtn.addEventListener('click', saveDesignConfig);
    if (resetBtn) resetBtn.addEventListener('click', resetForm);
    if (masterResetBtn) masterResetBtn.addEventListener('click', masterReset);

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
    return `
        <div style="width: 100%; text-align: center; padding: 20px;">
            <h3 style="color: ${config.colors?.text_primary}; margin-bottom: 20px;">
                🎨 Design Preview
            </h3>

            <!-- Color Palette -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 30px;">
                <div style="background: ${config.colors?.primary}; padding: 20px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold;">
                    Primary<br/>${config.colors?.primary}
                </div>
                <div style="background: ${config.colors?.secondary}; padding: 20px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold;">
                    Secondary<br/>${config.colors?.secondary}
                </div>
                <div style="background: ${config.colors?.accent_teal}; padding: 20px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold;">
                    Accent<br/>${config.colors?.accent_teal}
                </div>
            </div>

            <!-- Buttons -->
            <div style="margin: 30px 0;">
                <p style="color: #888; font-size: 12px; margin-bottom: 15px;">Button Preview:</p>
                <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                    <button style="
                        background: ${config.colors?.primary};
                        color: white;
                        padding: ${config.components?.buttons?.primary?.padding || '12px 24px'};
                        border: none;
                        border-radius: ${config.radius?.base || '8px'};
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s;
                    " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        Primary Button
                    </button>
                    <button style="
                        background: ${config.colors?.secondary};
                        color: white;
                        padding: ${config.components?.buttons?.primary?.padding || '12px 24px'};
                        border: none;
                        border-radius: ${config.radius?.base || '8px'};
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s;
                    " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        Secondary Button
                    </button>
                </div>
            </div>

            <!-- Typography Preview -->
            <div style="margin-top: 30px; text-align: left; background: rgba(0,0,0,0.1); padding: 15px; border-radius: ${config.radius?.base || '8px'};">
                <p style="color: ${config.colors?.text_primary}; font-family: ${config.typography?.font_family_base}; font-size: 20px; font-weight: bold; margin: 10px 0;">
                    Large Text (20px)
                </p>
                <p style="color: ${config.colors?.text_primary}; font-family: ${config.typography?.font_family_base}; font-size: ${config.typography?.font_sizes?.base}; margin: 10px 0;">
                    Base Text (${config.typography?.font_sizes?.base})
                </p>
                <p style="color: ${config.colors?.text_primary}; font-family: ${config.typography?.font_family_base}; font-size: 12px; margin: 10px 0;">
                    Small Text (12px)
                </p>
            </div>

            <!-- Spacing Demo -->
            <div style="margin-top: 30px; text-align: left;">
                <p style="color: #888; font-size: 12px; margin-bottom: 10px;">Spacing (${config.spacing?.['8']}):</p>
                <div style="background: ${config.colors?.primary}; width: 100%; height: 20px; border-radius: ${config.radius?.base || '8px'};"></div>
                <div style="margin: ${config.spacing?.['8']} 0; background: ${config.colors?.secondary}; width: 100%; height: 20px; border-radius: ${config.radius?.base || '8px'};"></div>
                <div style="background: ${config.colors?.accent_teal}; width: 100%; height: 20px; border-radius: ${config.radius?.base || '8px'};"></div>
            </div>
        </div>
    `;
}


// Apply hover effects to preview button
function applyPreviewStyles(config) {
    // Preview is static, styles are inline
}


// ============================================================================
// COLLECT FORM VALUES - MAPPED TO DATABASE SCHEMA
// ============================================================================


function collectFormValues() {
    // ✅ Sammle alle Farb-Inputs
    const colors = {
        primary: document.getElementById('colorPrimary')?.value || '#00CC77',
        secondary: document.getElementById('colorSecondary')?.value || '#5E5240',
        accent_teal: document.getElementById('colorAccentTeal')?.value || '#32B8C6',
        accent_green: document.getElementById('colorAccentGreen')?.value || '#22C55E',
        accent_red: document.getElementById('colorAccentRed')?.value || '#FF5459',
        text_primary: document.getElementById('colorTextPrimary')?.value || '#00ffff',
        background: document.getElementById('colorBackground')?.value || '#FCF8F9'
    };

    // ✅ Sammle Typography
    const typography = {
        font_family_base: document.getElementById('fontFamilyBase')?.value || 'Rajdhani, sans-serif',
        font_sizes: {
            base: (document.getElementById('fontSizeBase')?.value || 14) + "px"
        },
        font_weights: {
            normal: parseInt(document.getElementById('fontWeightNormal')?.value || 400),
            bold: parseInt(document.getElementById('fontWeightBold')?.value || 600)
        }
    };

    // ✅ Sammle Spacing & Radius
    const spacing = {
        "8": (parseInt(document.getElementById('spacingUnit')?.value || 8)) + "px"
    };

    const radius = {
        base: (parseInt(document.getElementById('borderRadius')?.value || 8)) + "px"
    };

    // ✅ Sammle Button-Werte
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

    // ✅ Sammle Images
    const images = {
        background: document.getElementById('backgroundImageUrl')?.value || null,
        logo: document.getElementById('logoUrl')?.value || null,
        hero: document.getElementById('heroImageUrl')?.value || null
    };

    // ✅ RETOURNIERE STRUKTUR EXAKT WIE BACKEND ERWARTET
    const collected = {
        colors,
        typography,
        spacing,
        radius,
        components,
        images
    };

    console.log('📦 Collected form values:', collected);
    return collected;
}


// ============================================================================
// SAVE DESIGN CONFIG (COMPLETELY FIXED)
// ============================================================================


async function saveDesignConfig() {
    try {
        showStatus('⏳ Speichert...', 'loading');

        const formData = collectFormValues();

        console.log('📤 Preparing to save design config...');
        console.log('   API URL:', apiBaseUrl + '/design-system/1');
        console.log('   Method: PUT');
        console.log('   Payload:', formData);

        // ✅ CRITICAL: Direct HTTPS URL with explicit credentials
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

        console.log('📨 Response received:');
        console.log('   Status:', response.status);
        console.log('   Status Text:', response.statusText);
        console.log('   Content-Type:', response.headers.get('content-type'));

        // ✅ Robust error handling - check status FIRST
        if (!response.ok) {
            // Try to parse as JSON error
            let errorMessage = `Server returned ${response.status}`;

            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } else {
                    const errorText = await response.text();
                    errorMessage = errorText.substring(0, 100);
                }
            } catch (parseErr) {
                // Ignore parse error, use generic message
            }

            throw new Error(`❌ API Error (${response.status}): ${errorMessage}`);
        }

        // ✅ Parse success response
        const result = await response.json();
        console.log('✅ Server response:', result);

        showStatus('✅ Design-Konfiguration erfolgreich gespeichert!', 'success');

        // Update original config
        originalConfig = JSON.parse(JSON.stringify(formData));

    } catch (error) {
        console.error('❌ Error saving design config:');
        console.error('   Error:', error.message);
        console.error('   Stack:', error.stack);

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
        console.warn('⚠️ Status element not found, logging:', message);
        return;
    }

    statusElement.textContent = message;
    statusElement.className = `status-message show status-${type}`;

    console.log(`[${type.toUpperCase()}] ${message}`);

    // Auto-hide after 3 seconds (except loading)
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


console.log('🎨 Design Editor Script v1.1 loaded');
