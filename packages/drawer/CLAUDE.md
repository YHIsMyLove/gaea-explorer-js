# drawer

交互式矢量绘制工具，支持点、线、面、圆、矩形的创建和编辑。包含完整的编辑器系统（控制点拖拽、形状修改）。

## Structure

- `src/index.ts` — 导出 `Drawer`、`Editor` 及所有类型
- `src/painter.ts` — 绘制状态机，管理绘制生命周期
- `src/base.ts` — 绘制基类
- `src/shape/` — 各形状实现：circle, line, point, polygon, rectangle
- `src/editor/` — 编辑器核心 + `editable/` 下各形状的编辑实现
- `src/typings.ts` — DrawOption, StartOption, OperationType 等类型定义

## Notes

依赖 `@gaea-explorer/subscriber`（事件监听）和 `@gaea-explorer/tooltip`（绘制提示）。编辑器的 editable/ 子目录与 shape/ 一一对应。
