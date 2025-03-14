const webpack = require('webpack')

module.exports = {
  devServer: {
    port: 3002,
  },
  jest: {
    configure: {
      globals: {
        CONFIG: true,
      },
    },
  },
  webpack: {
    plugins: {
      add: [
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
        new webpack.IgnorePlugin({
          checkResource(resource) {
            return /.*\/wordlists\/(?!english).*\.json/.test(resource)
          },
        }),
      ],
      remove: ['ModuleScopePlugin'],
    },
    configure: (webpackConfig) => {
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin',
      )
      webpackConfig.resolve.plugins.splice(scopePluginIndex, 1)
      webpackConfig.resolve.fallback = {
        buffer: require.resolve('buffer'),
        path: require.resolve('path-browserify'),
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        fs: false,
        'process/browser': require.resolve('process/browser'),
      }
      webpackConfig.module.rules = [
        ...webpackConfig.module.rules,
        {
          test: /\.wasm$/,
          type: 'webassembly/experimental',
        },
      ]
      webpackConfig.experiments = { ...webpackConfig.experiments, asyncWebAssembly: true }
      return webpackConfig
    },
  },
}
