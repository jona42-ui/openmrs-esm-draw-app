const config = require("openmrs/default-webpack-config");
const webpack = require("webpack");

config.additionalConfig.resolve = {
  fallback: {
    path: require.resolve("path-browserify"),
  },
};

config.additionalConfig.module = {
  rules: [
    {
      test: /node_modules\/vfile\/core\.js/,
      use: [
        {
          loader: "imports-loader",
          options: {
            type: "commonjs",
            imports: ["single process/browser process"],
          },
        },
      ],
    },
  ],
};

module.exports = config;
