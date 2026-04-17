# tooltip

提示框组件：固定位置 Tooltip 和鼠标跟随 MouseTooltip。

## Structure

- `src/index.ts` — 导出 `Tooltip` 和 `MouseTooltip`
- `src/Tooltip.ts` — 固定位置提示框
- `src/MouseTooltip.ts` — 鼠标跟随提示框
- `src/styles/tooltip.scss` — 组件样式

## Notes

依赖 `@gaea-explorer/common`。被 drawer 和 measure 包用于绘制/测量过程的操作提示。
