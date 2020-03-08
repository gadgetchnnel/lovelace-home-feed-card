const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/main.js',
  mode: 'production',
  devtool: false,
  output: {
    filename: 'lovelace-home-feed-card.js',
    path: path.resolve(__dirname)
  },
  plugins: [
    // Ignore all locale files of moment.js
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  ],
};
