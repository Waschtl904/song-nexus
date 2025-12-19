const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'js', 'main.js'),

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.bundle.js',
        publicPath: '/dist/'
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
        })
    ],

    performance: {
        hints: 'warning',
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    }
};