/**
 * Design Config Webpack Loader v2.1 - WITH DEBUG LOGGING
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

// ===== DEBUG CONFIG =====
const DEBUG = {
  enabled: true,
  logToFile: true,
  logPath: path.resolve(__dirname, '../.design-loader-debug.log'),
};

const debugLog = (message, data = null) => {
  if (!DEBUG.enabled) return;

  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}${data ? ` ${JSON.stringify(data, null, 2)}` : ''}`;

  console.log(logMessage);

  if (DEBUG.logToFile) {
    try {
      fs.appendFileSync(DEBUG.logPath, logMessage + '\n');
    } catch (e) {
      // Silent fail if can't write to log
    }
  }
};

debugLog('🚀 Design Config Loader started');
debugLog(`📁 Webpack context: ${__dirname}`);

module.exports = function (source) {
  debugLog('📥 Loader invoked');
  debugLog(`📏 Source size: ${source.length} bytes`);

  try {
    // ===== STEP 1: Parse JSON =====
    debugLog('1️⃣ Parsing JSON...');
    let config;

    try {
      config = JSON.parse(source);
      debugLog('✅ JSON parsed successfully');
      debugLog('📊 Config keys:', Object.keys(config));
    } catch (parseError) {
      throw new Error(`Invalid JSON in design.config.json: ${parseError.message}`);
    }

    // ===== STEP 2: Validate structure =====
    debugLog('2️⃣ Validating config structure...');
    const requiredSections = ['colors', 'typography', 'spacing'];
    const missingSections = requiredSections.filter(section => !config[section]);

    if (missingSections.length > 0) {
      throw new Error(
        `Config missing required sections: ${missingSections.join(', ')}. ` +
        `Found sections: ${Object.keys(config).join(', ')}`
      );
    }
    debugLog('✅ All required sections present');

    // ===== STEP 3: Resolve references =====
    debugLog('3️⃣ Resolving @ref syntax...');
    const refCountBefore = countReferences(config);
    debugLog(`📍 Found ${refCountBefore} @ref references`);

    config = resolveReferences(config);

    const refCountAfter = countReferences(config);
    debugLog(`✅ References resolved (${refCountBefore} → ${refCountAfter} remaining)`);

    if (refCountAfter > 0) {
      debugLog(`⚠️ Warning: ${refCountAfter} unresolved references remain`);
    }

    // ===== STEP 4: Generate CSS =====
    debugLog('4️⃣ Generating CSS variables...');
    const cssVars = generateCSSVariables(config);
    debugLog(`✅ CSS variables generated (${countLines(cssVars)} lines)`);

    // ===== STEP 5: Generate button CSS =====
    debugLog('5️⃣ Generating button-specific CSS...');
    const buttonVars = generateButtonCSSVariables(config);
    debugLog(`✅ Button CSS generated (${countLines(buttonVars)} lines)`);

    // ===== STEP 6: Generate dark mode CSS =====
    debugLog('6️⃣ Generating dark mode CSS...');
    const darkModeCss = generateDarkMode(config);
    debugLog(`✅ Dark mode CSS generated (${countLines(darkModeCss)} lines)`);

    // ===== STEP 7: Combine CSS =====
    debugLog('7️⃣ Combining CSS...');
    const finalCSS = `:root {\n${cssVars}${buttonVars}}\n\n${darkModeCss}`;
    debugLog(`✅ Final CSS combined (${finalCSS.length} bytes)`);

    // ===== STEP 8: Write to disk =====
    debugLog('8️⃣ Writing CSS to disk...');
    const outputPath = path.resolve(__dirname, '../styles/_design-tokens.css');
    const outputDir = path.dirname(outputPath);

    debugLog(`📍 Output path: ${outputPath}`);
    debugLog(`📂 Output directory: ${outputDir}`);

    if (!fs.existsSync(outputDir)) {
      debugLog(`📁 Creating output directory...`);
      fs.mkdirSync(outputDir, { recursive: true });
      debugLog(`✅ Directory created`);
    }

    try {
      fs.writeFileSync(outputPath, finalCSS, 'utf8');
      debugLog(`✅ CSS file written successfully`);

      // Verify file was written
      const stats = fs.statSync(outputPath);
      debugLog(`📊 File size: ${stats.size} bytes`);
    } catch (writeError) {
      debugLog(`❌ Failed to write CSS file: ${writeError.message}`);
      throw writeError;
    }

    // ===== STEP 9: Generate output =====
    debugLog('9️⃣ Generating webpack module export...');
    const moduleExport = `module.exports = ${JSON.stringify(config)};`;
    debugLog(`✅ Module export generated (${moduleExport.length} bytes)`);

    debugLog('✅ Design Config Loader completed successfully!');
    debugLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return moduleExport;

  } catch (error) {
    debugLog(`❌ CRITICAL ERROR: ${error.message}`);
    debugLog(`📍 Stack trace:`, error.stack);
    debugLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw new Error(`Design Config Loader Error: ${error.message}`);
  }
};

/**
 * ===== HELPER: Count unresolved references =====
 */
function countReferences(obj, count = 0) {
  if (typeof obj === 'string' && obj.startsWith('@ref ')) {
    return count + 1;
  }

  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).reduce((total, val) => {
      return total + countReferences(val, 0);
    }, count);
  }

  return count;
}

/**
 * ===== HELPER: Count lines in string =====
 */
function countLines(str) {
  return str.split('\n').length;
}

/**
 * ===== RESOLVE @ref SYNTAX =====
 * Converts @ref colors.primary to actual values
 * Handles nested references recursively
 */
function resolveReferences(config, visited = new Set()) {
  debugLog('  🔄 Starting reference resolution...');
  const resolved = JSON.parse(JSON.stringify(config)); // Deep copy

  const processValue = (value, path = []) => {
    // Skip if already visited (prevent infinite loops)
    const pathStr = path.join('.');
    if (visited.has(pathStr)) {
      debugLog(`  ⚠️ Circular reference detected at ${pathStr}`);
      return value;
    }

    if (typeof value === 'string' && value.startsWith('@ref ')) {
      // Extract the reference path (e.g., "colors.primary")
      const refPath = value.substring(5).trim();
      visited.add(pathStr);

      debugLog(`  📍 Resolving @ref ${refPath} (at ${pathStr})`);

      // Navigate the config object to find the value
      const parts = refPath.split('.');
      let refValue = config;

      for (const part of parts) {
        if (refValue && typeof refValue === 'object' && part in refValue) {
          refValue = refValue[part];
        } else {
          debugLog(`  ❌ Reference not found: @ref ${refPath}`);
          return value; // Return original if not found
        }
      }

      visited.delete(pathStr);

      // Recursively resolve if the resolved value is also a reference
      if (typeof refValue === 'string' && refValue.startsWith('@ref ')) {
        debugLog(`  🔄 Chained reference found, recursing...`);
        return processValue(refValue, [...path, refPath]);
      }

      debugLog(`  ✅ Resolved ${refPath} → ${refValue}`);
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
 * ===== GENERATE CSS CUSTOM PROPERTIES =====
 * Converts all config values to CSS variables
 */
function generateCSSVariables(config) {
  let css = '';
  let varCount = 0;

  // Colors
  if (config.colors) {
    debugLog('  🎨 Processing colors...');
    Object.entries(config.colors).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        // Nested color object (e.g., neutral: {50, 100, ...})
        Object.entries(value).forEach(([shade, shadeValue]) => {
          css += `  --color-${key}-${shade}: ${shadeValue};\n`;
          varCount++;
        });
      } else {
        css += `  --color-${key}: ${value};\n`;
        varCount++;
      }
    });
    debugLog(`  ✅ Colors: ${varCount} variables`);
  }

  // Typography
  if (config.typography) {
    debugLog('  ✍️  Processing typography...');
    const typoBefore = varCount;

    if (config.typography.font_family_base) {
      css += `  --font-family-base: ${config.typography.font_family_base};\n`;
      varCount++;
    }

    if (config.typography.font_family_mono) {
      css += `  --font-family-mono: ${config.typography.font_family_mono};\n`;
      varCount++;
    }

    // Font sizes
    if (config.typography.font_sizes) {
      Object.entries(config.typography.font_sizes).forEach(([key, value]) => {
        css += `  --font-size-${key}: ${value};\n`;
        varCount++;
      });
    }

    // Font weights
    if (config.typography.font_weights) {
      Object.entries(config.typography.font_weights).forEach(([key, value]) => {
        css += `  --font-weight-${key}: ${value};\n`;
        varCount++;
      });
    }

    // Line heights
    if (config.typography.line_heights) {
      Object.entries(config.typography.line_heights).forEach(([key, value]) => {
        css += `  --line-height-${key}: ${value};\n`;
        varCount++;
      });
    }

    // Letter spacing
    if (config.typography.letter_spacing) {
      Object.entries(config.typography.letter_spacing).forEach(([key, value]) => {
        css += `  --letter-spacing-${key}: ${value};\n`;
        varCount++;
      });
    }

    debugLog(`  ✅ Typography: ${varCount - typoBefore} variables`);
  }

  // Spacing
  if (config.spacing) {
    debugLog('  📏 Processing spacing...');
    const spacingBefore = varCount;

    Object.entries(config.spacing).forEach(([key, value]) => {
      css += `  --space-${key}: ${value};\n`;
      varCount++;
    });

    debugLog(`  ✅ Spacing: ${varCount - spacingBefore} variables`);
  }

  // Border radius
  if (config.radius) {
    debugLog('  🔲 Processing radius...');
    const radiusBefore = varCount;

    Object.entries(config.radius).forEach(([key, value]) => {
      css += `  --radius-${key}: ${value};\n`;
      varCount++;
    });

    debugLog(`  ✅ Radius: ${varCount - radiusBefore} variables`);
  }

  // Shadows
  if (config.shadows) {
    debugLog('  🌑 Processing shadows...');
    const shadowBefore = varCount;

    Object.entries(config.shadows).forEach(([key, value]) => {
      css += `  --shadow-${key}: ${value};\n`;
      varCount++;
    });

    debugLog(`  ✅ Shadows: ${varCount - shadowBefore} variables`);
  }

  // Transitions
  if (config.transitions) {
    debugLog('  ⏱️  Processing transitions...');
    const transitionBefore = varCount;

    Object.entries(config.transitions).forEach(([key, value]) => {
      css += `  --transition-${key}: ${value};\n`;
      varCount++;
    });

    debugLog(`  ✅ Transitions: ${varCount - transitionBefore} variables`);
  }

  debugLog(`  📊 Total CSS variables: ${varCount}`);
  return css;
}

/**
 * ===== GENERATE BUTTON CSS VARIABLES =====
 * Converts all button properties to CSS variables
 */
function generateButtonCSSVariables(config) {
  let css = '';
  let buttonCount = 0;

  if (!config.components || !config.components.buttons) {
    debugLog('  ℹ️  No button components found in config');
    return css;
  }

  debugLog('  🔘 Processing button components...');
  const buttons = config.components.buttons;

  // Generate variables for each button type
  Object.entries(buttons).forEach(([buttonName, buttonConfig]) => {
    if (typeof buttonConfig !== 'object' || buttonConfig === null) {
      return;
    }

    debugLog(`    Button type: ${buttonName}`);
    let propCount = 0;

    Object.entries(buttonConfig).forEach(([propName, propValue]) => {
      if (typeof propValue === 'object') {
        // Skip nested objects but log them
        debugLog(`      ℹ️  Skipping nested object: ${propName}`);
        return;
      }

      const cssVarName = `--button-${buttonName}-${propName.replace(/_/g, '-')}`;
      css += `  ${cssVarName}: ${propValue};\n`;
      propCount++;
      buttonCount++;
    });

    debugLog(`    ✅ ${buttonName} button: ${propCount} properties`);
  });

  debugLog(`  ✅ Total button variables: ${buttonCount}`);
  return css;
}

/**
 * ===== GENERATE DARK MODE CSS =====
 * Applied when user has dark mode preference
 */
function generateDarkMode(config) {
  if (!config.darkMode || !config.darkMode.colors) {
    debugLog('  ℹ️  No dark mode colors defined');
    return '';
  }

  debugLog('  🌙 Processing dark mode colors...');
  let darkModeVarCount = 0;

  let css = '@media (prefers-color-scheme: dark) {\n  :root {\n';

  Object.entries(config.darkMode.colors).forEach(([key, value]) => {
    css += `    --color-${key}: ${value};\n`;
    darkModeVarCount++;
  });

  css += '  }\n}\n';

  debugLog(`  ✅ Dark mode variables: ${darkModeVarCount}`);
  return css;
}
