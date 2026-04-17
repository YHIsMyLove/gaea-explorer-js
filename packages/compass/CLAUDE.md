# compass

3D 指南针导航组件。旋转环 + 陀螺仪造型，支持拖拽旋转、双击重置视角。

## Structure

- `src/index.ts` — 导出 `Compass` 类和 `CompassOptions` 接口
- `src/icons/` — SVG 图标（内环、外环、旋转标记）
- `src/styles/Compass.scss` — 组件样式

## Notes

依赖 `@gaea-explorer/common` 的 Widget 和 DomUtil。
