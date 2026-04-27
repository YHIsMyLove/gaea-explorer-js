# packages

15 个功能子包，每个独立发布到 npm，由聚合包 `gaea-explorer-js` 统一 re-export。

## Structure

- `common/` — Widget 基类和 DomUtil 工具（无内部依赖）
- `subscriber/` — 统一的 Cesium 事件管理层（无内部依赖）
- `tooltip/` — 固定/鼠标跟随提示框（依赖 common）
- `popup/` — 地理坐标锚定弹窗（无内部依赖）
- `compass/` — 3D 指南针导航组件（依赖 common）
- `zoom-controller/` — 缩放控制组件（依赖 common）
- `drawer/` — 矢量绘制和编辑工具（依赖 subscriber, tooltip）
- `measure/` — 距离/面积/高度/三角测量工具（依赖 drawer, subscriber, tooltip）
- `primitive-geojson/` — 高性能 GeoJSON Primitive 渲染（无内部依赖）
- `geojson-render/` — GeoJSON 样式渲染引擎（依赖 primitive-geojson）
- `graphics-extends/` — Cesium Graphics 扩展如 Frustum（依赖 subscriber）
- `heat/` — 热力图图层（无内部依赖）
- `sync-viewer/` — 双视图同步导航（无内部依赖）
- `uav/` — 无人机视角和航线绘制（依赖 drawer, graphics-extends, subscriber, tooltip）
- `gaea-explorer-js/` — 聚合包，re-export 所有子包

## Notes

依赖关系形成层级：common → [compass, zoom-controller, tooltip] → [drawer] → [measure, uav]。primitive-geojson → geojson-render 形成独立渲染管线。
