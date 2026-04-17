# measure

测量工具集：距离测量、表面距离测量、面积测量、表面面积测量。基于 drawer 的绘制能力采集点位，用 Turf.js 计算结果。

## Structure

- `src/index.ts` — 导出 `Measure`, `DistanceMeasure`, `DistanceSurfaceMeasure`, `AreaMeasure`, `AreaSurfaceMeasure`
- `src/Measure.ts` — 测量基类，协调绘制和计算
- `src/utils.ts` — 几何计算工具函数

## Notes

依赖 `@gaea-explorer/drawer`（采集点位）、`@gaea-explorer/subscriber`（事件）、`@gaea-explorer/tooltip`（结果提示）和多个 `@turf/*` 包。
