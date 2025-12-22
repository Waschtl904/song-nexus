const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');

// 🆕 Call design system loader before webpack runs
function runDesignSystemLoader() {
    try {
        const configPath = path.resolve(__dirname, 'config/design.config.json');
        const source = fs.readFileSync(configPath, 'utf-8');
        
        // Read and parse config
        const config = JSON.parse(source);
        
        // Generate CSS variables
        let css = ':root {\n';
        
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
            if (config.typography.font_sizes) {
                Object.entries(config.typography.font_sizes).forEach(([key, value]) => {
                    css += `  --font-size-${key}: ${value};\n`;
                });
            }
            if (config.typography.font_weights) {
                Object.entries(config.typography.font_weights).forEach(([key, value]) => {
                    css += `  --font-weight-${key}: ${value};\n`;
                });
            }
            if (config.typography.line_heights) {
                Object.entries(config.typography.line_heights).forEach(([key, value]) => {
                    css += `  --line-height-${key}: ${value};\n`;
                });
            }
        }
        
        // Spacing
        if (config.spacing) {
            Object.entries(config.spacing).forEach(([key, value]) => {
                css += `  --space-${key}: ${value};\n`;
            });
        }
        
        // Radius
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
        
        css += '}\n';
        
        // Dark mode
        if (config.darkMode && config.darkMode.colors) {
            css += '\n@media (prefers-color-scheme: dark) {\n  :root {\n';
            Object.entries(config.darkMode.colors).forEach(([key, value]) => {
                css += `    --color-${key}: ${value};\n`;
            });
            css += '  }\n}\n';
        }
        
        // Write CSS file
        const outputDir = path.resolve(__dirname, 'styles');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputPath = path.resolve(outputDir, '_design-tokens.css');
        fs.writeFileSync(outputPath, css);
        console.log(`✅ Design tokens generated: ${outputPath}`);
        
    } catch (error) {
        console.error(`❌ Design system loader error: ${error.message}`);
    }
}

// Run loader before webpack starts
runDesignSystemLoader();

module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'js', 'main.js'),

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.bundle.js',
        publicPath: '/'
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
                        presets: [
                            ['@babel/preset-env', {
                                targets: { browsers: ['last 2 versions'] },
                                modules: false
                            }]
                        ],
                        plugins: [
                            '@babel/plugin-proposal-class-properties',
                            '@babel/plugin-proposal-export-default-from'
                        ]
                    }
                }
            }
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
                { from: 'assets', to: 'assets' }
            ],
        }),
    ],

    performance: {
        hints: 'warning',
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    }
};