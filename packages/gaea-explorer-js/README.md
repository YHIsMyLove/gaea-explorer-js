![npm latest version](https://img.shields.io/npm/v/gaea-explorer-js.svg) ![license](https://img.shields.io/npm/l/gaea-explorer-js)

gaea-explorer-js 是一个从[DDE-Earth](https://alpha.deep-time.org/map/#/)中抽离的、用于 CesiumJS 的扩展库，它与前端框架无关，提供了一些常用的功能和组件，方便开发者快速构建 Cesium 应用。

## 安装

使用 npm 安装：

```bash
npm install gaea-explorer-js --save
```

## 功能

gaea-explorer-js 提供了以下功能：

- 事件订阅 `@gaea/subscriber`
- primitive 方式加速渲染 geojson `@gaea/primitive-geojson`
- 丰富的 geojson 样式渲染 `@gaea/geojson-render`
- tooltip `@gaea/tooltip`
- 弹出框 `@gaea/popup`
- 指南针 `@gaea/compass`
- 缩放控制 `@gaea/zoom-control`
- 绘图工具 `@gaea/drawer`
- 测量工具 `@gaea/measure`
- 双屏联动工具 `@gaea/sync-viewer`
- 热力图 `@gaea/heat`
- ...

详细信息及 demo，请参阅 [API 文档](https://gaea-explorer-js.vercel.app/)。

## 示例

<table>
  <tr>
    <td><img src="../../doc/public/images/geojson-render-height.png" alt="高度渲染"></td>
    <td><img src="../../doc/public/images/geojson-render-polygon-height.png" alt="高度渲染"></td>
  </tr>
  <tr>
    <td><img src="../../doc/public/images/geojson-render-section.png" alt="分段渲染"></td>
    <td><img src="../../doc/public/images/geojson-render-single.png" alt="单值渲染"></td>
  </tr>
</table>

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
