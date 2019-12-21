const path = require('path')
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: './src/main.js',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
          }
          // other vue-loader options go here
        }
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]?[hash]',
          esModule: false
        }
      }
    ]
  },
  devServer: {
    hot: true,
    historyApiFallback: true
  },
  performance: {
    hints: false
  },
  devtool: '#eval-source-map'
}

module.exports.plugins = [
  new webpack.HotModuleReplacementPlugin(),
  new VueLoaderPlugin(),
  new HtmlWebpackPlugin({
    filename: 'index.html',
    template: 'index.html',
    inject: true
  })
]

if (process.env.NODE_ENV === 'production') {
  module.exports.mode = 'production'
  module.exports.output = {
    path: path.resolve(__dirname, './dist'),
    publicPath: './dist/',
    filename: 'build.js'
  }

  module.exports.optimization = {
    minimize: true
  }

  module.exports.devtool = '#source-map'
  // http://vue-loader.vuejs.org/en/workflow/production.html
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  ])
}
