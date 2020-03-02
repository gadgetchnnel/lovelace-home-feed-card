const path = require('path');

module.exports = {
  entry: './src/main.js',
  mode: 'production',
  devtool: false,
  output: {
    filename: 'lovelace-home-feed-card.js',
    path: path.resolve(__dirname)
  }
};
