const webpack = require("webpack");
const path = require("path");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");
const { ESBuildMinifyPlugin } = require("esbuild-loader");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

module.exports = {
  entry: {
    background: path.join(srcDir, "pages/content/background.ts"),
    content_script: path.join(srcDir, "pages/content/index.tsx"),
  },
  output: {
    path: path.join(__dirname, "../dist"),
    filename: "[name].js",
  },
  optimization: {
    minimizer: [
      new ESBuildMinifyPlugin({
        target: "ES2020",
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        include: /node_modules/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.tsx?$/,
        loader: "esbuild-loader",
        options: {
          loader: "tsx",
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: "@svgr/webpack",
            options: {
              svgoConfig: {
                plugins: [{ removeViewBox: false }],
              },
            },
          },
        ],
      },
    ],
  },
  resolve: {
    fallback: { fs: false },
    plugins: [new TsconfigPathsPlugin()],
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      react: path.resolve("../../node_modules/react"),
      "@solana/wallet-ledger": path.resolve(
        "../../node_modules/@solana/wallet-ledger/dist/lib/index.js"
      ),
      "@chakra-ui/react": path.resolve("../../node_modules/@chakra-ui/react"),
      "@solana/wallet-adapter-react": path.resolve(
        "../../node_modules/@solana/wallet-adapter-react"
      ),
      "@toruslabs/solana-embed": path.resolve(
        "../../node_modules/@toruslabs/solana-embed"
      ),
      ...(process.env.LINKED_DEV
        ? {
            "@strata-foundation/react": path.resolve(
              "./node_modules/@strata-foundation/react"
            ),
            "@strata-foundation/spl-token-bonding": path.resolve(
              "./node_modules/@strata-foundation/spl-token-bonding"
            ),
            "@strata-foundation/marketplace-ui": path.resolve(
              "./node_modules/@strata-foundation/marketplace-ui"
            ),
            "@strata-foundation/marketplace-sdk": path.resolve(
              "./node_modules/@strata-foundation/marketplace-sdk"
            ),
            "@strata-foundation/spl-utils": path.resolve(
              "./node_modules/@strata-foundation/spl-utils"
            ),
            "@strata-foundation/spl-token-collective": path.resolve(
              "./node_modules/@strata-foundation/spl-token-collective"
            ),
          }
        : {}),
    },
  },
  plugins: [
    new webpack.EnvironmentPlugin([
    ]),
    new NodePolyfillPlugin(),
    new CopyPlugin({
      patterns: [{ from: ".", to: ".", context: "public" }],
      options: {},
    }),
  ],
};
