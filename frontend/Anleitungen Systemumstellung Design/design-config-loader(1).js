/**
 * Design Config Webpack Loader
 * 
 * Transforms design.config.json → CSS variables
 * Generates _design-tokens.css with all design tokens
 * 
 * Usage in webpack.config.js:
 * {
 *   test: /design\.config\.json$/,
 *   use: [path.resolve(__dirname, 'webpack/design-config-loader.js')]
 * }
 * 
 * @author SONG-NEXUS Team
 * @version 1.0
 * @date 2025-12-20
 */

const fs = require('fs');
const path = require('path');

module.exports = function(source) {
  try {
    // Parse the JSON config
    const config = JSON.parse(source);
    
    // Validate config structure
    if (!config.colors || !config.typography || !config.spacing) {
      throw new Error('Config missing required sections: colors, typography, spacing');
    }

    // Generate CSS variables string
    const cssVars = generateCSSVariables(config);
    
    // Generate dark mode overrides if needed
    const darkModeCss = generateDarkMode(config);
    
    // Combine into final CSS
    const finalCSS = `:root {\n${cssVars}}\n\n${darkModeCss}`;
    
    // Return as JS module that emits CSS
    const code = `
module.exports = ${JSON.stringify(config)};
`;
    
    // Also write the CSS file directly
    const outputPath = path.resolve(__dirname, '../styles/_design-tokens.css');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, finalCSS);
    
    return code;
  } catch (error) {
    throw new Error(`Design Config Loader Error: ${error.message}`);
  }
};

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
  
  // Component-specific tokens
  if (config.components) {
    Object.entries(config.components).forEach(([componentName, componentConfig]) => {
      Object.entries(componentConfig).forEach(([propName, propValue]) => {
        // Handle nested objects (like buttons.primary)
        if (typeof propValue === 'object' && propValue !== null) {
          Object.entries(propValue).forEach(([nestedKey, nestedValue]) => {
            // Replace @ref with actual values
            const resolvedValue = resolveReference(nestedValue, config);
            css += `  --${componentName}-${propName}-${nestedKey}: ${resolvedValue};\n`;
          });
        } else {
          const resolvedValue = resolveReference(propValue, config);
          css += `  --${componentName}-${propName}: ${resolvedValue};\n`;
        }
      });
    });
  }
  
  return css;
}

/**
 * Resolve @ref references to actual config values
 * Example: "@ref colors.primary" → "#32B8C6"
 */
function resolveReference(value, config) {
  if (typeof value !== 'string' || !value.startsWith('@ref ')) {
    return value;
  }
  
  const path = value.substring(5).split('.');
  let current = config;
  
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      console.warn(`Reference not found: @ref ${path.join('.')}`);
      return value;
    }
  }
  
  return current;
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
