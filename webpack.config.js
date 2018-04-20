const path = require("path");

module.exports = {
  entry: {
    app: "./assets/app.js",
  },
  output: {
    path: path.resolve(__dirname, "assets"),
    filename: "[name].pack.js",
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: { loader: "babel-loader" },
    }],
  },
};
