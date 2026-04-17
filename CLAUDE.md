# gaea-explorer-js

Cesium 地图交互组件 monorepo，基于 pnpm workspace + Turbo 管理构建。提供绘制、测量、热力图、弹窗、指南针、无人机视角等地图交互能力。

## Structure

- `packages/` — 15 个功能包，每个独立发布到 npm
  - `gaea-explorer-js/` — 聚合包，re-export 所有子包
  - `common/` — Widget 基类和 DomUtil 工具
  - `graphics-extends/` — Cesium 自定义 Graphics 扩展（Frustum 等）
  - `subscriber/` — 统一的鼠标/屏幕事件管理层
- `doc/` — Dumi 文档站，含交互式示例
- `vite-example/` — 最小 Vite 接入示例

## Notes

构建工具链：rollup + esbuild，类型生成用 rollup-plugin-dts。代码规范用 Biome，提交规范用 commitlint + husky。
