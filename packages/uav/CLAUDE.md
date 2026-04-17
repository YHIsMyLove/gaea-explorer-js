# uav

无人机第一人称视角组件，在 Cesium viewer 上渲染 POV 叠加层，支持视锥体可视化。

## Structure

- `src/index.ts` — 导出 `POVWidget` 及类型
- `src/POVWidget.ts` — POV 视角 Widget 实现
- `src/typings.ts` — POVWidgetOptions, POVWidgetPosition 类型
- `src/styles/pov-widget.scss` — 组件样式

## Notes

前身为 eagle-eye 包，已重命名为 uav。依赖 `@gaea-explorer/common` 和 `@gaea-explorer/graphics-extends`（Frustum 可视化）。
