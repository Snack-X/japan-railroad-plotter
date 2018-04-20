const path = require("path");

module.exports = {
  entry: {
    app: "./assets/js/app.js",
  },
  output: {
    path: path.resolve(__dirname, "assets"),
    filename: "[name].js",
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: { loader: "babel-loader" },
    }],
  },
};
