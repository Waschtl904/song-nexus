const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');

// ===== DESIGN SYSTEM LOADER (mit @ref Resolver) =====
function runDesignSystemLoader() {
    try {
        console.log('\n🚀 Design System Loader starting...');

        const possiblePaths = [
            path.resolve(__dirname, 'config/design.config.json'),
            path.resolve(__dirname, 'design.config.json'),
        ];

        let configPath = null;
        let source = null;

        for (const tryPath of possiblePaths) {
            if (fs.existsSync(tryPath)) {
                configPath = tryPath;
                source = fs.readFileSync(tryPath, 'utf-8');
                console.log(`✅ Found design config at: ${tryPath}`);
                break;
            }
        }

        if (!source) {
            throw new Error('design.config.json not found');
        }

        console.log('📏 Parsing JSON...');
        let config = JSON.parse(source);

        // ===== RESOLVE @ref REFERENCES =====
        console.log('🔄 Resolving @ref references...');
        config = resolveReferences(config);

        // ===== GENERATE CSS =====
        console.log('🎨 Generating CSS variables...');
        let css = ':root {\n';
        let varCount = 0;

        // Colors
        if (config.colors) {
            console.log('  Processing colors...');
            Object.entries(config.colors).forEach(([k, v]) => {
                if (typeof v === 'object' && v !== null) {
                    Object.entries(v).forEach(([shade, shadeVal]) => {
                        css += `  --color-${k}-${shade}: ${shadeVal};\n`;
                        varCount++;
                    });
                } else {
                    css += `  --color-${k}: ${v};\n`;
                    varCount++;
                }
            });
        }

        // Typography
        if (config.typography) {
            console.log('  Processing typography...');
            if (config.typography.font_family_base) {
                css += `  --font-family-base: ${config.typography.font_family_base};\n`;
                varCount++;
            }
            if (config.typography.font_family_mono) {
                css += `  --font-family-mono: ${config.typography.font_family_mono};\n`;
                varCount++;
            }

            if (config.typography.font_sizes) {
                Object.entries(config.typography.font_sizes).forEach(([k, v]) => {
                    css += `  --font-size-${k}: ${v};\n`;
                    varCount++;
                });
            }

            if (config.typography.font_weights) {
                Object.entries(config.typography.font_weights).forEach(([k, v]) => {
                    css += `  --font-weight-${k}: ${v};\n`;
                    varCount++;
                });
            }

            if (config.typography.line_heights) {
                Object.entries(config.typography.line_heights).forEach(([k, v]) => {
                    css += `  --line-height-${k}: ${v};\n`;
                    varCount++;
                });
            }

            if (config.typography.letter_spacing) {
                Object.entries(config.typography.letter_spacing).forEach(([k, v]) => {
                    css += `  --letter-spacing-${k}: ${v};\n`;
                    varCount++;
                });
            }
        }

        // Spacing
        if (config.spacing) {
            console.log('  Processing spacing...');
            Object.entries(config.spacing).forEach(([k, v]) => {
                css += `  --space-${k}: ${v};\n`;
                varCount++;
            });
        }

        // Border radius
        if (config.radius) {
            console.log('  Processing radius...');
            Object.entries(config.radius).forEach(([k, v]) => {
                css += `  --radius-${k}: ${v};\n`;
                varCount++;
            });
        }

        // Shadows
        if (config.shadows) {
            console.log('  Processing shadows...');
            Object.entries(config.shadows).forEach(([k, v]) => {
                css += `  --shadow-${k}: ${v};\n`;
                varCount++;
            });
        }

        // Transitions
        if (config.transitions) {
            console.log('  Processing transitions...');
            Object.entries(config.transitions).forEach(([k, v]) => {
                css += `  --transition-${k}: ${v};\n`;
                varCount++;
            });
        }

        // Button Variables - FIXED!
        if (config.components && config.components.buttons) {
            console.log('  Processing button components...');
            let buttonVarCount = 0;

            Object.entries(config.components.buttons).forEach(([btnName, btnConfig]) => {
                if (typeof btnConfig === 'object' && btnConfig !== null) {
                    Object.entries(btnConfig).forEach(([propName, propValue]) => {
                        // Skip nested objects
                        if (typeof propValue === 'object') {
                            return;
                        }

                        const cssVarName = `--button-${btnName}-${propName.replace(/_/g, '-')}`;
                        // ✅ FIX: Ensure propValue is a string
                        const cssVarValue = String(propValue).trim();
                        css += `  ${cssVarName}: ${cssVarValue};\n`;
                        buttonVarCount++;
                        varCount++;
                    });
                }
            });

            console.log(`    ✅ Button variables: ${buttonVarCount}`);
        }

        css += '}\n';

        // Dark mode
        if (config.darkMode && config.darkMode.colors) {
            console.log('  Processing dark mode...');
            css += '@media (prefers-color-scheme: dark) {\n  :root {\n';
            Object.entries(config.darkMode.colors).forEach(([k, v]) => {
                css += `    --color-${k}: ${v};\n`;
            });
            css += '  }\n}\n';
        }

        // ===== WRITE TO DISK =====
        console.log('💾 Writing CSS to disk...');
        const outputDir = path.resolve(__dirname, 'styles');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.resolve(outputDir, '_design-tokens.css');
        fs.writeFileSync(outputPath, css, 'utf-8');

        const stats = fs.statSync(outputPath);
        console.log(`✅ Design tokens CSS written successfully`);
        console.log(`  File: ${outputPath}`);
        console.log(`  Size: ${stats.size} bytes`);
        console.log(`  Variables: ${varCount}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error(`\n❌ CRITICAL ERROR in Design System Loader:`);
        console.error(`  ${error.message}`);
        process.exit(1);
    }
}

/**
 * ===== RESOLVE @ref SYNTAX =====
 * Converts @ref colors.primary to actual values
 */
function resolveReferences(config, visited = new Set()) {
    const resolved = JSON.parse(JSON.stringify(config)); // Deep copy

    const processValue = (value, path = []) => {
        const pathStr = path.join('.');

        if (visited.has(pathStr)) {
            console.warn(`⚠️ Circular reference: ${pathStr}`);
            return value;
        }

        // Handle @ref syntax
        if (typeof value === 'string' && value.startsWith('@ref ')) {
            const refPath = value.substring(5).trim();
            visited.add(pathStr);

            // Navigate the config to find the value
            const parts = refPath.split('.');
            let refValue = config;

            for (const part of parts) {
                if (refValue && typeof refValue === 'object' && part in refValue) {
                    refValue = refValue[part];
                } else {
                    console.warn(`⚠️ Reference not found: @ref ${refPath}`);
                    visited.delete(pathStr);
                    return value;
                }
            }

            visited.delete(pathStr);

            // Recursively resolve if result is also a @ref
            if (typeof refValue === 'string' && refValue.startsWith('@ref ')) {
                return processValue(refValue, [...path, refPath]);
            }

            return refValue;
        }

        // Recursively process objects
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

// ===== RUN LOADER IMMEDIATELY =====
console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║       🎨 WEBPACK DESIGN SYSTEM LOADER v2.2        ║');
console.log('╚════════════════════════════════════════════════════╝');
runDesignSystemLoader();

// ===== WEBPACK CONFIG =====
module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'js', 'main.js'),

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.bundle.js',
        publicPath: '/',
        clean: true,
    },

    devtool: 'source-map',

    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules\/(?!@simplewebauthn)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [['@babel/preset-env', { targets: { browsers: ['last 2 versions'] }, modules: false }]],
                        plugins: ['@babel/plugin-proposal-class-properties']
                    }
                }
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ]
    },

    resolve: {
        extensions: ['.js', '.json']
    },

    optimization: {
        minimize: true
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        new CopyPlugin({
            patterns: [
                { from: 'config/design.config.json', to: 'config/design.config.json', noErrorOnMissing: true },

                {
                    from: 'assets',
                    to: 'assets',
                    globOptions: {
                        ignore: ['**/.DS_Store', '**/Thumbs.db'],
                    },
                    noErrorOnMissing: true
                },

                { from: 'public/blog', to: 'blog', noErrorOnMissing: true }
            ],
        }),
    ],

    performance: {
        hints: 'warning',
        maxEntrypointSize: 2048000,
        maxAssetSize: 2048000
    }
};
