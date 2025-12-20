const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');  // ← HINZUFÜGEN


module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'js', 'main.js'),

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.bundle.js',
        publicPath: '/'  // ← ÄNDERE von '/dist/' zu '/'
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
        // ← HINZUFÜGEN: Assets kopieren
        new CopyPlugin({
            patterns: [
                { from: 'assets', to: 'assets' }  // Kopiert assets/ → dist/assets/
            ],
        }),
    ],

    performance: {
        hints: 'warning',
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    }
};