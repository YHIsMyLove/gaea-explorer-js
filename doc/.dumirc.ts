import { defineConfig } from 'dumi';
import path from 'path';

const cesiumSource = 'node_modules/cesium/Source';
const cesiumWorkers = '../Build/Cesium/Workers';

export default defineConfig({
  // GitHub Pages 子路径部署配置
  base: '/gaea-explorer-js/',
  publicPath: '/gaea-explorer-js/',

  themeConfig: {
    name: 'gaea-explorer-js',
    logo: '/gaea-explorer-js/logo.svg',
    socialLinks: {
      github: 'https://github.com/YHIsMyLove/gaea-explorer-js',
    },
  },
  alias: {
    '@': path.resolve(__dirname, 'src'),
    cesium: path.resolve(__dirname, 'node_modules/cesium'),
  },
  // Fix: @cesium/engine@24.0.0 imports '@zip.js/zip.js/lib/zip-core.js',
  // but zip.js@2.8.26 removed this export path from its package.json exports.
  // This alias workaround points directly to the file in pnpm's store.
  // If zip.js version changes, update the path accordingly.
  chainWebpack: (config) => {
    config.resolve.alias.set(
      '@zip.js/zip.js/lib/zip-core.js',
      path.resolve(
        __dirname,
        '../node_modules/.pnpm/@zip.js+zip.js@2.8.26/node_modules/@zip.js/zip.js/lib/zip-core.js',
      ),
    );
  },
  copy: [
    { from: path.join(cesiumSource, cesiumWorkers), to: 'dist/cesium/Workers' },
    { from: path.join(cesiumSource, 'Assets'), to: 'dist/cesium/Assets' },
    { from: path.join(cesiumSource, 'Widgets'), to: 'dist/cesium/Widgets' },
  ],
  define: {
    CESIUM_BASE_URL: '/gaea-explorer-js/cesium',
  },
  jsMinifier: 'terser',
});