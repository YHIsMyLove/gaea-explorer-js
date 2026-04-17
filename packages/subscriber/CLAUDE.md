# subscriber

统一的 Cesium 鼠标/屏幕事件管理层。支持 Entity 级别和全局事件监听，内置防抖和 pick 结果缓存。

## Structure

- `src/index.ts` — 导出 `Subscriber` 类、`EventArgs` 接口和事件类型（单文件实现）

## Notes

纯 Cesium 依赖。多个包依赖此模块进行事件处理：drawer、measure、graphics-extends。
