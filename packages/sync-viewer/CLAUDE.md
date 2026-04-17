# sync-viewer

双视图同步导航组件，追踪最后交互的 viewer 并将视点同步到另一个 viewer。

## Structure

- `src/index.ts` — 导出 `SyncViewer` 类和 `SyncViewProps`（单文件实现）

## Notes

纯 Cesium 依赖。典型场景：2D/3D 双视图联动。
