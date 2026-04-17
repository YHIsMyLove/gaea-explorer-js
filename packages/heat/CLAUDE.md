# heat

热力图图层，基于 heatmap.js 渲染为 SingleTileImageryProvider。支持根据相机高度自动调整半径。

## Structure

- `src/index.ts` — 导出 `HeatMapLayer` 类和 `HeatMapLayerContructorOptions`（单文件实现）

## Notes

依赖 `@mars3d/heatmap.js`。实现简洁，核心逻辑集中在一个文件中。
