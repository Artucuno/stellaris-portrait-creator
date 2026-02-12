// @ts-check
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  html: {
    title: "Stellaris Portrait Generator",
    viewport: 'width=device-width, initial-scale=1.0',
    meta: {
      description: "A tool to create static portraits for Stellaris"
    }
  },
  plugins: [
    pluginReact(),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["postcss-loader"],
        type: "css",
      },
    ],
  },
});
