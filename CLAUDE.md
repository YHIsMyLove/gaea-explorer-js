# gaea-explorer-js

Cesium 地图交互组件 monorepo，基于 pnpm workspace + Turbo 管理构建。提供绘制、测量、热力图、弹窗、指南针、无人机视角等地图交互能力。

## Project Setup

- 这是 TypeScript monorepo，使用 pnpm 管理。所有包管理、脚本、构建一律使用 pnpm（不要用 npm 或 yarn）。

## Code Quality Rules

- 修改代码后，必须运行 lint 和 build 验证。使用 `pnpm lint`（或 `pnpm lint:fix --unsafe` 进行 Biome 自动修复）和 `pnpm build`。修复所有错误后才能认为任务完成。
- 项目使用 Biome 做代码规范和格式化（已从 ESLint/Prettier 迁移）。部分修复需要 `--unsafe` 标志，当 `pnpm lint:fix` 无法修复所有问题时，使用 `pnpm lint:fix --unsafe`。
- TypeScript 类型检查通过 `pnpm build` 执行（rollup-plugin-dts 生成类型声明文件时会验证类型）。

## Cesium/GIS Conventions

- 编写 Cesium 示例时，优先使用本地 public 目录数据路径而非外部 URL。
- Terrain 加载使用远程 TMS 格式（需要设置 `tms: true`）。
- 禁用海洋渲染时，使用 `viewer.scene.globe.showWaterEffect = false`。

## Workflow

- 实现新功能时，遵循 brainstorm → plan → task breakdown → implement 工作流。使用 brainstorm skill 进行设计讨论，使用 plan skill 创建实现计划，然后再写代码。

## Structure

- `packages/` — 15 个功能包，每个独立发布到 npm
  - `gaea-explorer-js/` — 聚合包，re-export 所有子包
  - `common/` — Widget 基类和 DomUtil 工具
  - `graphics-extends/` — Cesium 自定义 Graphics 扩展（Frustum 等）
  - `subscriber/` — 统一的鼠标/屏幕事件管理层
  - `uav/` — 无人机 POV 视角 Widget 和航线绘制工具
- `doc/` — Dumi 文档站，含交互式示例
- `vite-example/` — 最小 Vite 接入示例

## Notes

构建工具链：rollup + esbuild，类型生成用 rollup-plugin-dts。代码规范用 Biome，提交规范用 commitlint + husky。

