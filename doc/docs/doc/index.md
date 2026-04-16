---
title: 快速上手
nav:
  title: 指南
  order: -1
group:
  title: Tutorials
  order: -1
---

![npm latest version](https://img.shields.io/npm/v/gaea-explorer-js.svg) ![license](https://img.shields.io/npm/l/gaea-explorer-js)

gaea-explorer-js 是一个从[DDE-Earth](https://alpha.deep-time.org/map/#/)中抽离的、用于 CesiumJS 的扩展库，它与前端框架无关，提供了一些常用的功能和组件，方便开发者快速构建 Cesium 应用。

## 安装

使用 npm 安装：

```bash
npm install gaea-explorer-js --save
```

## 功能

gaea-explorer-js 提供了以下功能：

- 事件订阅 `@gaea-explorer/subscriber`
- primitive 方式加速渲染 geojson `@gaea-explorer/primitive-geojson`
- 丰富的 geojson 样式渲染 `@gaea-explorer/geojson-render`
- tooltip `@gaea-explorer/tooltip`
- 弹出框 `@gaea-explorer/popup`
- 指南针 `@gaea-explorer/compass`
- 缩放控制 `@gaea-explorer/zoom-control`
- 绘图工具 `@gaea-explorer/drawer`
- 测量工具 `@gaea-explorer/measure`
- 双屏联动工具 `@gaea-explorer/sync-viewer`
- 热力图 `@gaea-explorer/heat`
- ...

详细信息及 demo，请参阅 [API 文档](https://extends.opendde.com/)。

## 示例

<table>
  <tr>
    <td><img src="/images/geojson-render-height.png" alt="高度渲染"></td>
    <td><img src="/images/geojson-render-polygon-height.png" alt="高度渲染"></td>
  </tr>
  <tr>
    <td><img src="/images/geojson-render-section.png" alt="分段渲染"></td>
    <td><img src="/images/geojson-render-single.png" alt="单值渲染"></td>
  </tr>
</table>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
