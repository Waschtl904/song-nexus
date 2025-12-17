// ============================================================================
// 🔨 WEBPACK CONFIGURATION v8.0 - ES6 MODULES - CORRECTED
// ============================================================================

const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'production',

    // ✅ ENTRY POINT: ./js/main.js (NOT ./src!)
    entry: path.resolve(__dirname, 'js', 'main.js'),

    // ✅ OUTPUT
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.bundle.js',
        publicPath: '/dist/'
    },

    // ✅ DEVTOOL
    devtool: 'source-map',

    // ✅ MODULE RULES
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {
                                targets: {
                                    browsers: ['last 2 versions']
                                },
                                modules: 'auto'
                            }]
                        ]
                    }
                }
            }
        ]
    },

    // ✅ RESOLVE
    resolve: {
        extensions: ['.js', '.json']
    },

    // ✅ OPTIMIZATION
    optimization: {
        minimize: true
    },

    // ✅ PLUGINS
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ],

    // ✅ PERFORMANCE
    performance: {
        hints: 'warning',
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    }
};