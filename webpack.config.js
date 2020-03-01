const path = require('path');



module.exports = {

  entry: './src/main.js',

  mode: 'production',

  output: {

    filename: 'lovelace-home-feed-card.js',

    path: path.resolve(__dirname)

  }

};
