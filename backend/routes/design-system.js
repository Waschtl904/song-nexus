/**
 * Design System API Routes
 * GET /design-system - Load design config
 * PUT /design-system/:id - Save design config
 * POST /design-system/:id/reset - Reset to default
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Path to frontend design config
const configPath = path.resolve(__dirname, '../../frontend/config/design.config.json');
const defaultConfigPath = path.resolve(__dirname, '../../frontend/config/design.config.default.json');

console.log('📁 Design System Config Path:', configPath);

// ===== GET /api/design-system =====
router.get('/design-system', (req, res) => {
    try {
        console.log('📥 GET /api/design-system');

        if (!fs.existsSync(configPath)) {
            console.warn('⚠️ Config file not found, returning empty config');
            return res.json({
                colors: {},
                typography: {},
                spacing: {},
                radius: {},
                shadows: {},
                components: {},
                images: {}
            });
        }

        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);

        res.json(config);
        console.log('✅ Config sent to client');
    } catch (error) {
        console.error('❌ Error reading config:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== PUT /api/design-system/:id =====
router.put('/design-system/:id', (req, res) => {
    try {
        console.log('📤 PUT /api/design-system/:id');
        console.log('   ID:', req.params.id);
        console.log('   Body:', JSON.stringify(req.body).substring(0, 200));

        const updateData = req.body;

        // Read current config
        let currentConfig = {};
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf-8');
            currentConfig = JSON.parse(configData);
        }

        // Merge with new data
        const newConfig = {
            ...currentConfig,
            ...updateData,
            colors: { ...currentConfig.colors, ...updateData.colors },
            typography: { ...currentConfig.typography, ...updateData.typography },
            spacing: { ...currentConfig.spacing, ...updateData.spacing },
            radius: { ...currentConfig.radius, ...updateData.radius },
            components: { ...currentConfig.components, ...updateData.components },
            images: { ...currentConfig.images, ...updateData.images }
        };

        // Ensure directory exists
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // Write to disk
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
        console.log('✅ Config saved to disk');

        // ===== REGENERATE _design-tokens.css =====
        regenerateDesignTokens(newConfig);

        res.json({
            success: true,
            message: 'Design config updated',
            config: newConfig
        });
    } catch (error) {
        console.error('❌ Error saving config:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== POST /api/design-system/:id/reset =====
router.post('/design-system/:id/reset', (req, res) => {
    try {
        console.log('🔄 POST /api/design-system/:id/reset');

        if (!fs.existsSync(defaultConfigPath)) {
            console.warn('⚠️ Default config not found');
            return res.status(404).json({ error: 'Default config not found' });
        }

        const defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));

        // Write default config
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
        console.log('✅ Config reset to default');

        // Regenerate tokens
        regenerateDesignTokens(defaultConfig);

        res.json({
            success: true,
            message: 'Design config reset to default',
            config: defaultConfig
        });
    } catch (error) {
        console.error('❌ Error resetting config:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== REGENERATE DESIGN TOKENS CSS =====
function regenerateDesignTokens(config) {
    try {
        console.log('🎨 Regenerating _design-tokens.css...');

        let css = ':root {\n';

        // Colors
        if (config.colors) {
            Object.entries(config.colors).forEach(([k, v]) => {
                css += `  --color-${k.replace(/_/g, '-')}: ${v};\n`;
            });
        }

        // Typography
        if (config.typography) {
            if (config.typography.font_family_base) {
                css += `  --font-family-base: ${config.typography.font_family_base};\n`;
            }
            if (config.typography.font_sizes) {
                Object.entries(config.typography.font_sizes).forEach(([k, v]) => {
                    css += `  --font-size-${k}: ${v};\n`;
                });
            }
            if (config.typography.font_weights) {
                Object.entries(config.typography.font_weights).forEach(([k, v]) => {
                    css += `  --font-weight-${k}: ${v};\n`;
                });
            }
        }

        // Spacing
        if (config.spacing) {
            Object.entries(config.spacing).forEach(([k, v]) => {
                css += `  --space-${k}: ${v};\n`;
            });
        }

        // Border Radius
        if (config.radius) {
            Object.entries(config.radius).forEach(([k, v]) => {
                css += `  --radius-${k}: ${v};\n`;
            });
        }

        // Shadows
        if (config.shadows) {
            Object.entries(config.shadows).forEach(([k, v]) => {
                css += `  --shadow-${k}: ${v};\n`;
            });
        }

        // Components (Buttons, etc.)
        if (config.components && config.components.buttons) {
            Object.entries(config.components.buttons).forEach(([btnName, btnConfig]) => {
                if (typeof btnConfig === 'object') {
                    Object.entries(btnConfig).forEach(([propName, propValue]) => {
                        if (typeof propValue !== 'object') {
                            const cssVarName = `--button-${btnName}-${propName.replace(/_/g, '-')}`;
                            const cssVarValue = String(propValue).trim();
                            css += `  ${cssVarName}: ${cssVarValue};\n`;
                        }
                    });
                }
            });
        }

        css += '}\n';

        // Dark mode
        if (config.darkMode && config.darkMode.colors) {
            css += '@media (prefers-color-scheme: dark) {\n  :root {\n';
            Object.entries(config.darkMode.colors).forEach(([k, v]) => {
                css += `    --color-${k.replace(/_/g, '-')}: ${v};\n`;
            });
            css += '  }\n}\n';
        }

        // Write to frontend dist
        const tokenPath = path.resolve(__dirname, '../../frontend/dist/_design-tokens.css');
        const tokenDir = path.dirname(tokenPath);

        if (!fs.existsSync(tokenDir)) {
            fs.mkdirSync(tokenDir, { recursive: true });
        }

        fs.writeFileSync(tokenPath, css, 'utf-8');
        console.log(`✅ Design tokens CSS regenerated: ${tokenPath}`);
        console.log(`   Size: ${css.length} bytes`);
    } catch (error) {
        console.error('❌ Error regenerating design tokens:', error.message);
    }
}

module.exports = router;
