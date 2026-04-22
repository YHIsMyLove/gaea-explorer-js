# uav

无人机第一人称视角组件和航线绘制工具。POV 视角 Widget 在 Cesium viewer 上渲染叠加层，支持视锥体可视化；航线绘制支持固定/动态高度、下垂线、节点编辑。

## Structure

- `src/index.ts` — 导出 `POVWidget`, `UAVLine`, `UAVLineDrawer`, `EditableUAVLine` 及类型
- `src/POVWidget.ts` — POV 视角 Widget 实现
- `src/UAVLine.ts` — 航线实体管理
- `src/UAVLineDrawer.ts` — 航线交互绘制
- `src/EditableUAVLine.ts` — 航线节点编辑（继承 drawer 的 EditablePolyline）
- `src/typings.ts` — HeightMode, HeightFunction, UAVLineStartOptions 等类型
- `src/styles/` — POV Widget 样式

## Notes

航线绘制依赖 `@gaea-explorer/drawer`（绘制基类、编辑器）、`@gaea-explorer/subscriber`（事件）、`@gaea-explorer/tooltip`（提示）。POV 视角依赖 `@gaea-explorer/graphics-extends`（Frustum）。
