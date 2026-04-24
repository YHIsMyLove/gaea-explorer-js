[![npm version](https://img.shields.io/npm/v/@gaea-explorer/gaea-explorer-js.svg)](https://www.npmjs.com/package/@gaea-explorer/gaea-explorer-js)
[![license](https://img.shields.io/npm/l/@gaea-explorer/gaea-explorer-js)](https://github.com/YHIsMyLove/gaea-explorer-js/blob/master/LICENSE)
[![CI](https://github.com/YHIsMyLove/gaea-explorer-js/actions/workflows/ci.yml/badge.svg)](https://github.com/YHIsMyLove/gaea-explorer-js/actions/workflows/ci.yml)
[![Release](https://github.com/YHIsMyLove/gaea-explorer-js/actions/workflows/release.yml/badge.svg)](https://github.com/YHIsMyLove/gaea-explorer-js/actions/workflows/release.yml)
[![Deploy Docs](https://github.com/YHIsMyLove/gaea-explorer-js/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/YHIsMyLove/gaea-explorer-js/actions/workflows/deploy-docs.yml)

# gaea-explorer-js

> Forked from [cesium-extends](https://github.com/hongfaqiu/cesium-extends), with modifications and enhancements.

gaea-explorer-js 是一个从 [DDE-Earth](https://alpha.deep-time.org/map/#/) 中抽离的、用于 CesiumJS 的扩展库，它与前端框架无关，提供了一些常用的功能和组件，方便开发者快速构建 Cesium 应用。

## 链接

- **文档与 Demo**: [GitHub Pages](https://yhismylove.github.io/gaea-explorer-js/)
- **npm 主包**: [@gaea-explorer/gaea-explorer-js](https://www.npmjs.com/package/@gaea-explorer/gaea-explorer-js)

## 安装

使用 npm 安装：

```bash
npm install @gaea-explorer/gaea-explorer-js --save
```

## 功能

gaea-explorer-js 提供了以下功能：

| 包名 | 说明 | npm |
| --- | --- | --- |
| `@gaea-explorer/subscriber` | 统一的 Cesium 鼠标/屏幕事件管理层 | [npm](https://www.npmjs.com/package/@gaea-explorer/subscriber) |
| `@gaea-explorer/common` | Widget 基类、DomUtil 工具 | [npm](https://www.npmjs.com/package/@gaea-explorer/common) |
| `@gaea-explorer/primitive-geojson` | Primitive API 高性能 GeoJSON 渲染 | [npm](https://www.npmjs.com/package/@gaea-explorer/primitive-geojson) |
| `@gaea-explorer/geojson-render` | GeoJSON 深度样式渲染引擎 | [npm](https://www.npmjs.com/package/@gaea-explorer/geojson-render) |
| `@gaea-explorer/tooltip` | 固定位置/鼠标跟随提示框 | [npm](https://www.npmjs.com/package/@gaea-explorer/tooltip) |
| `@gaea-explorer/popup` | 地理坐标锚定 HTML 弹窗 | [npm](https://www.npmjs.com/package/@gaea-explorer/popup) |
| `@gaea-explorer/compass` | 3D 指南针导航组件 | [npm](https://www.npmjs.com/package/@gaea-explorer/compass) |
| `@gaea-explorer/zoom-control` | 缩放控制组件 | [npm](https://www.npmjs.com/package/@gaea-explorer/zoom-control) |
| `@gaea-explorer/drawer` | 交互式矢量绘制和编辑（点、线、面、圆、矩形） | [npm](https://www.npmjs.com/package/@gaea-explorer/drawer) |
| `@gaea-explorer/measure` | 距离/面积测量工具 | [npm](https://www.npmjs.com/package/@gaea-explorer/measure) |
| `@gaea-explorer/sync-viewer` | 双视图同步联动 | [npm](https://www.npmjs.com/package/@gaea-explorer/sync-viewer) |
| `@gaea-explorer/heat` | 热力图图层 | [npm](https://www.npmjs.com/package/@gaea-explorer/heat) |
| `@gaea-explorer/uav` | 无人机第一人称视角和航线绘制 | [npm](https://www.npmjs.com/package/@gaea-explorer/uav) |
| `@gaea-explorer/graphics-extends` | Cesium Graphics 扩展（Frustum 视锥体等） | [npm](https://www.npmjs.com/package/@gaea-explorer/graphics-extends) |

详细信息及 demo，请参阅 [API 文档](https://yhismylove.github.io/gaea-explorer-js/)。

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 代码检查
pnpm lint

# 自动修复
pnpm lint:fix --unsafe

# 运行测试
pnpm test

# 启动文档站
pnpm dev
```

## 示例

<table>
  <tr>
    <td><img src="/doc/public/images/geojson-render-height.png" alt="高度渲染"></td>
    <td><img src="/doc/public/images/geojson-render-polygon-height.png" alt="高度渲染"></td>
  </tr>
  <tr>
    <td><img src="/doc/public/images/geojson-render-section.png" alt="分段渲染"></td>
    <td><img src="/doc/public/images/geojson-render-single.png" alt="单值渲染"></td>
  </tr>
</table>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
