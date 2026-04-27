# doc

Dumi 文档站，展示所有包的交互式示例。包含各组件的 demo 场景。

## Structure

- `src/components/Map/` — 各功能的 demo 组件：simple, compass, drawer/, eagle-eye, frustum/, frustum-demo, geojson-render/, heat, height-measure/, measure/, mouseTooltip, popup, subscriber, sync-viewer, triangle-measure/, uav-line/, zoomControl
- `src/components/Map/geojson-render/` — GeoJSON 渲染示例：bubble-auto, bubble-cluster, point-height, point-value, polygon-height, single-sprite
- `src/components/Map/frustum/` — Frustum 视锥体 demo 样式
- `src/utils/initMap.ts` — Cesium viewer 初始化工具

## Notes

消费 `@gaea-explorer/gaea-explorer-js` 聚合包。新增组件 demo 时参照现有目录结构。
