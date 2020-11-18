const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const packagejson = require("./package.json");
const fs = require("fs");

module.exports = {
    entry: './src/app.js',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {test: /\.js$/, use: 'babel-loader', exclude: /node_modules/},
            {
                test: /\.scss|css$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: ["css-loader", 'sass-loader']
                })
            },
            {
                test: /\.xml$/,
                use: [
                    'xml-loader'
                ]
            },
            {
                test: /\.(png|jpg|gif|xlsx)$/,
                use: [
                    'url-loader'
                ]
            }
        ]
    },
    resolve: {
        alias: {
            'lib': path.resolve(__dirname, 'src/lib/'),
        }
    },
    plugins: [
        /*new UglifyJsPlugin({
         test: /\.js($|\?)/i
         }),*/
        new ExtractTextPlugin({
            filename: 'css/[name].css'
        }),
        new HtmlWebpackPlugin({
            template: 'index.html'
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.HashedModuleIdsPlugin(),
        new webpack.optimize.CommonsChunkPlugin({
            name: "vendor",
            minChunks: function(module){
                return module.context && module.context.includes("node_modules");
            }
        }),
        new webpack.optimize.CommonsChunkPlugin({
            name: "manifest",
            minChunks: Infinity
        }),
        new CopyWebpackPlugin([
            {
                from: path.resolve(__dirname, './static'),
                to: path.resolve(__dirname, './dist/static'),
                ignore: ['.*']
            }
        ]),
        new CleanWebpackPlugin(['dist'])
    ],
    output: {
        filename: '[name].[hash].js',
        path: path.resolve(__dirname, 'dist')
    }
};
