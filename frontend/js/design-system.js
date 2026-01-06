// ============================================================================
// 🎨 DESIGN-SYSTEM.JS v1.0 - ES6 MODULE
// Loads Design System from Backend API (https://localhost:3000)
// ============================================================================

export const DesignSystem = {
    config: null,
    apiUrl: 'https://localhost:3000/api/design-system',

    async init() {
        console.log('🎨 Design System module initializing...');
        try {
            const config = await this.loadFromAPI();
            this.config = config;
            this.injectCSS();
            console.log('✅ Design System loaded and injected');
        } catch (err) {
            console.error('❌ Design System load failed:', err);
            this.loadFallback();
        }
    },

    async loadFromAPI() {
        console.log(`📡 Fetching Design System from: ${this.apiUrl}`);
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Design System API Response:', data);
            return data;

        } catch (err) {
            console.error('❌ Design System API Error:', err.message);
            throw err;
        }
    },

    injectCSS() {
        if (!this.config || !this.config.colors) {
            console.warn('⚠️ No color config to inject');
            return;
        }

        const { colors, typography, spacing, radius, components } = this.config;

        let css = ':root {\n';

        // Colors
        if (colors) {
            css += `  --color-primary: ${colors.primary || '#00CC77'};\n`;
            css += `  --color-secondary: ${colors.secondary || '#5E5240'};\n`;
            css += `  --color-accent-teal: ${colors.accent_teal || '#32B8C6'};\n`;
            css += `  --color-accent-green: ${colors.accent_green || '#22C55E'};\n`;
            css += `  --color-accent-red: ${colors.accent_red || '#FF5459'};\n`;
            css += `  --color-text-primary: ${colors.text_primary || '#00ffff'};\n`;
            css += `  --color-background: ${colors.background || '#FCF8F9'};\n`;
        }

        // Typography
        if (typography) {
            if (typography.font_family_base) {
                css += `  --font-family-base: ${typography.font_family_base};\n`;
            }
            if (typography.font_sizes?.base) {
                css += `  --font-size-base: ${typography.font_sizes.base};\n`;
            }
            if (typography.font_weights?.normal) {
                css += `  --font-weight-normal: ${typography.font_weights.normal};\n`;
            }
            if (typography.font_weights?.bold) {
                css += `  --font-weight-bold: ${typography.font_weights.bold};\n`;
            }
        }

        // Spacing
        if (spacing) {
            if (spacing['8']) {
                css += `  --space-8: ${spacing['8']};\n`;
            }
        }

        // Radius
        if (radius) {
            if (radius.base) {
                css += `  --radius-base: ${radius.base};\n`;
            }
        }

        // Button Components
        if (components?.buttons?.primary) {
            const btn = components.buttons.primary;
            css += `  --button-primary-background: ${btn.background || '#00CC77'};\n`;
            css += `  --button-primary-text-color: ${btn.text_color || '#FFFFFF'};\n`;
            if (btn.border_radius) {
                css += `  --button-primary-border-radius: ${btn.border_radius};\n`;
            }
            if (btn.padding) {
                css += `  --button-primary-padding: ${btn.padding};\n`;
            }
        }

        css += '}\n';

        // Inject as <style> tag
        const style = document.createElement('style');
        style.id = 'design-system-injected';
        style.textContent = css;
        document.head.appendChild(style);

        console.log(`✅ Design System CSS injected (${css.length} bytes)`);
        console.log(`🎨 Primary Color: ${colors?.primary || '#00CC77'}`);
    },

    loadFallback() {
        console.warn('⚠️ Using fallback design system colors');
        const style = document.createElement('style');
        style.id = 'design-system-fallback';
        style.textContent = `
:root {
  --color-primary: #00CC77;
  --color-secondary: #5E5240;
  --color-accent-teal: #32B8C6;
  --color-accent-green: #22C55E;
  --color-accent-red: #FF5459;
  --color-text-primary: #00ffff;
  --color-background: #FCF8F9;
  --font-family-base: Rajdhani, sans-serif;
  --font-size-base: 14px;
  --font-weight-normal: 400;
  --font-weight-bold: 600;
  --space-8: 8px;
  --radius-base: 8px;
  --button-primary-background: #00CC77;
  --button-primary-text-color: #FFFFFF;
  --button-primary-border-radius: 8px;
  --button-primary-padding: 8px 16px;
}
        `;
        document.head.appendChild(style);
    },

    getColor(key) {
        if (!this.config || !this.config.colors) return null;
        return this.config.colors[key];
    },

    getPrimaryColor() {
        return this.getColor('primary') || '#00CC77';
    },
};

console.log('✅ Design System module loaded (waiting for init)');
