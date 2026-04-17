# gaea-explorer-js

聚合包，re-export 所有子包作为统一入口。消费者只需安装此包即可使用全部功能。

## Structure

- `src/index.ts` — 纯 re-export，导出 Drawer, Popup, Compass, ZoomControl, SyncViewer, HeatMapLayer, POVWidget 等

## Notes

不包含任何实现代码，仅做 re-export。版本发布跟随各子包。
