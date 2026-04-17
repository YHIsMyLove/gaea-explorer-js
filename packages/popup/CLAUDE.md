# popup

地理坐标锚定的 HTML 弹窗，跟随相机移动更新屏幕位置，支持背面遮挡检测（地球背面自动隐藏）。

## Structure

- `src/index.ts` — 导出 `Popup` 类和 `PopupOptions`（单文件实现）

## Notes

纯 Cesium 依赖，无内部包依赖。通过监听相机变化实时更新位置。
