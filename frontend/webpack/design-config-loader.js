/**
 * Design Config Webpack Loader v2.0
 * Transforms design.config.json → CSS variables
 * Resolves @ref syntax → Final values
 * Generates _design-tokens.css with all design tokens
 * 
 * Usage in webpack.config.js:
 * {
 *   test: /design\.config\.json$/,
 *   use: [path.resolve(__dirname, 'webpack/design-config-loader.js')]
 * }
 */

const fs = require('fs');
const path = require('path');

module.exports = function (source) {
  try {
    // Parse the JSON config
    let config = JSON.parse(source);

    // Validate config structure
    if (!config.colors || !config.typography || !config.spacing) {
      throw new Error('Config missing required sections: colors, typography, spacing');
    }

    // ← NEW: Resolve @ref syntax throughout the config
    config = resolveReferences(config);

    // Generate CSS variables string
    const cssVars = generateCSSVariables(config);

    // ← NEW: Generate button-specific CSS variables
    const buttonVars = generateButtonCSSVariables(config);

    // Generate dark mode overrides if needed
    const darkModeCss = generateDarkMode(config);

    // Combine into final CSS
    const finalCSS = `:root {\n${cssVars}${buttonVars}}\n\n${darkModeCss}`;

    // Write CSS file to disk
    const outputPath = path.resolve(__dirname, 'styles', '_design-tokens.css');
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, finalCSS);
    console.log(`✅ Generated: ${outputPath}`);

    // Return the config as a JavaScript module (not JSON)
    return `module.exports = ${JSON.stringify(config)};`;

  } catch (error) {
    throw new Error(`Design Config Loader Error: ${error.message}`);
  }
};

/**
 * ← NEW: Resolve @ref syntax throughout config
 * Converts @ref colors.primary to actual values
 * Handles nested references recursively
 */
function resolveReferences(config, visited = new Set()) {
  const resolved = JSON.parse(JSON.stringify(config)); // Deep copy

  const processValue = (value, path = []) => {
    // Skip if already visited (prevent infinite loops)
    const pathStr = path.join('.');
    if (visited.has(pathStr)) {
      console.warn(`⚠️ Circular reference detected at ${pathStr}`);
      return value;
    }

    if (typeof value === 'string' && value.startsWith('@ref ')) {
      // Extract the reference path (e.g., "colors.primary")
      const refPath = value.substring(5).trim();
      visited.add(pathStr);

      // Navigate the config object to find the value
      const parts = refPath.split('.');
      let refValue = config;

      for (const part of parts) {
        if (refValue && typeof refValue === 'object' && part in refValue) {
          refValue = refValue[part];
        } else {
          console.warn(`⚠️ Reference not found: @ref ${refPath}`);
          return value; // Return original if not found
        }
      }

      visited.delete(pathStr);

      // Recursively resolve if the resolved value is also a reference
      if (typeof refValue === 'string' && refValue.startsWith('@ref ')) {
        return processValue(refValue, [...path, refPath]);
      }

      return refValue;
    }

    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).reduce((acc, [key, val]) => {
        acc[key] = processValue(val, [...path, key]);
        return acc;
      }, Array.isArray(value) ? [] : {});
    }

    return value;
  };

  return processValue(resolved);
}

/**
 * Generate CSS Custom Properties from config
 * Converts all config values to CSS variables
 */
function generateCSSVariables(config) {
  let css = '';

  // Colors
  if (config.colors) {
    Object.entries(config.colors).forEach(([key, value]) => {
      css += `  --color-${key}: ${value};\n`;
    });
  }

  // Typography
  if (config.typography) {
    if (config.typography.font_family_base) {
      css += `  --font-family-base: ${config.typography.font_family_base};\n`;
    }

    if (config.typography.font_family_mono) {
      css += `  --font-family-mono: ${config.typography.font_family_mono};\n`;
    }

    // Font sizes
    if (config.typography.font_sizes) {
      Object.entries(config.typography.font_sizes).forEach(([key, value]) => {
        css += `  --font-size-${key}: ${value};\n`;
      });
    }

    // Font weights
    if (config.typography.font_weights) {
      Object.entries(config.typography.font_weights).forEach(([key, value]) => {
        css += `  --font-weight-${key}: ${value};\n`;
      });
    }

    // Line heights
    if (config.typography.line_heights) {
      Object.entries(config.typography.line_heights).forEach(([key, value]) => {
        css += `  --line-height-${key}: ${value};\n`;
      });
    }

    // Letter spacing
    if (config.typography.letter_spacing) {
      Object.entries(config.typography.letter_spacing).forEach(([key, value]) => {
        css += `  --letter-spacing-${key}: ${value};\n`;
      });
    }
  }

  // Spacing
  if (config.spacing) {
    Object.entries(config.spacing).forEach(([key, value]) => {
      css += `  --space-${key}: ${value};\n`;
    });
  }

  // Border radius
  if (config.radius) {
    Object.entries(config.radius).forEach(([key, value]) => {
      css += `  --radius-${key}: ${value};\n`;
    });
  }

  // Shadows
  if (config.shadows) {
    Object.entries(config.shadows).forEach(([key, value]) => {
      css += `  --shadow-${key}: ${value};\n`;
    });
  }

  // Transitions
  if (config.transitions) {
    Object.entries(config.transitions).forEach(([key, value]) => {
      css += `  --transition-${key}: ${value};\n`;
    });
  }

  return css;
}

/**
 * ← NEW: Generate button-specific CSS variables
 * Converts all button properties to CSS variables
 * Handles all track_play button properties
 */
function generateButtonCSSVariables(config) {
  let css = '';

  if (!config.components || !config.components.buttons) {
    return css;
  }

  const buttons = config.components.buttons;

  // Generate variables for each button type
  Object.entries(buttons).forEach(([buttonName, buttonConfig]) => {
    if (typeof buttonConfig !== 'object' || buttonConfig === null) {
      return;
    }

    Object.entries(buttonConfig).forEach(([propName, propValue]) => {
      if (typeof propValue === 'object') {
        // Skip nested objects
        return;
      }

      const cssVarName = `--button-${buttonName}-${propName.replace(/_/g, '-')}`;
      css += `  ${cssVarName}: ${propValue};\n`;
    });
  });

  return css;
}

/**
 * Generate dark mode CSS overrides
 * Applied when user has dark mode preference
 */
function generateDarkMode(config) {
  // Check if dark mode colors are defined
  if (!config.darkMode || !config.darkMode.colors) {
    return '';
  }

  let css = '@media (prefers-color-scheme: dark) {\n  :root {\n';

  Object.entries(config.darkMode.colors).forEach(([key, value]) => {
    css += `    --color-${key}: ${value};\n`;
  });

  css += '  }\n}\n';

  return css;
}
