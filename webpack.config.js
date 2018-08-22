const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  entry: {
    app: './src/js/browser/app.js',
  },
  output: {
    filename: 'js/[name].js?hash=[contenthash:6]',
    publicPath: '/dist/',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [ 'babel-loader' ],
      },
      {
        test: /\.html$/,
        use: {
          loader: 'html-loader',
          options: { minimize: !isDev },
        },
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              outputStyle: isDev ? 'expanded' : 'compressed',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: '../index.html',
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css?hash=[contenthash:6]',
      chunkFilename: 'css/[id].css',
    }),
  ],
};
