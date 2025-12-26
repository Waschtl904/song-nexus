const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');

// 🆕 Call design system loader before webpack runs
function runDesignSystemLoader() {
    try {
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
            // Fallback (gekürzt für Übersichtlichkeit)
            source = JSON.stringify({ colors: { primary: '#00CC77' } });
        }

        const config = JSON.parse(source);
        let css = ':root {\n';

        // ... (Dein existierender Parser Code für Colors, Typography etc. BLEIBT HIER GLEICH) ...
        // Ich kürze das hier ab, kopiere einfach deinen bestehenden Parser-Code rein!

        // Colors
        if (config.colors) Object.entries(config.colors).forEach(([k, v]) => css += `  --color-${k}: ${v};\n`);

        // Button Variables (Wichtig!)
        if (config.components && config.components.buttons) {
            Object.entries(config.components.buttons).forEach(([btnName, btnConfig]) => {
                if (typeof btnConfig === 'object') {
                    Object.entries(btnConfig).forEach(([propName, propValue]) => {
                        if (typeof propValue !== 'object') {
                            css += `  --button-${btnName}-${propName.replace(/_/g, '-')}: ${propValue};\n`;
                        }
                    });
                }
            });
        }

        css += '}\n';

        const outputDir = path.resolve(__dirname, 'styles');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        fs.writeFileSync(path.resolve(outputDir, '_design-tokens.css'), css);
        console.log(`✅ Design tokens generated successfully`);

    } catch (error) {
        console.error(`❌ Design system loader error: ${error.message}`);
    }
}

// Run loader
// runDesignSystemLoader();

module.exports = {
    mode: 'production', // oder 'development' zum Debuggen
    entry: path.resolve(__dirname, 'js', 'main.js'),

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.bundle.js',
        publicPath: '/',
        clean: true, // 🧹 Leert den Ordner vor dem Build
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
            // 🔥 WICHTIG: CSS Loader Regel für Hintergründe
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
                // ✅ Config kopieren (Wichtig für das Frontend!)
                { from: 'config/design.config.json', to: 'config/design.config.json', noErrorOnMissing: true },

                // ✅ Assets kopieren (Optimiert!)
                // Wir kopieren den INHALT von assets direkt nach dist/assets
                // Das verhindert "assets/assets" Verschachtelung
                {
                    from: 'assets',
                    to: 'assets',
                    globOptions: {
                        ignore: ['**/.DS_Store', '**/Thumbs.db'], // Müll ignorieren
                    },
                    noErrorOnMissing: true
                },
                // Falls du Blog-Posts hast:
                { from: 'public/blog', to: 'blog', noErrorOnMissing: true }
            ],
        }),
    ],

    performance: {
        hints: 'warning',
        maxEntrypointSize: 2048000, // 2MB Limit (entspannter)
        maxAssetSize: 2048000       // 2MB Limit
    }
};
