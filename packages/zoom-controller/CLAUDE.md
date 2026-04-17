# zoom-controller

缩放控制组件，提供放大、缩小、重置视角按钮。支持 3D 和 2D/Columbus 视图模式。

## Structure

- `src/index.ts` — 导出 `ZoomController` 类和 `ZoomControllerProps`
- `src/icons/` — SVG 图标（放大、缩小、重置）
- `src/styles/zoom-controller.scss` — 组件样式

## Notes

依赖 `@gaea-explorer/common` 的 Widget 和 DomUtil。
