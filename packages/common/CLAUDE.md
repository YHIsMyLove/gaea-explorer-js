# common

所有 UI 组件共享的基础设施：Widget 基类（管理 Cesium viewer overlay 生命周期）和 DomUtil（DOM 创建/解析工具）。

## Structure

- `src/Widget.ts` — 抽象基类，子类需实现 `onAdd`/`onRemove`
- `src/DomUtil.ts` — DOM 元素创建、CSS class 工具
- `src/index.ts` — 导出 `Widget`, `DomUtil`
