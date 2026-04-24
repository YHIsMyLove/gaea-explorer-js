# geojson-render

GeoJSON 渲染引擎，支持 DataSource 和 Primitive 两种渲染模式，深度自定义样式（气泡、聚合、精灵图标、分级设色等）。

## Structure

- `src/index.ts` — 导出所有渲染和配置工具
- `src/dataSourceRender.ts` — DataSource 模式渲染
- `src/primitiveRender.ts` — Primitive 模式渲染（高性能）
- `src/BillBuilder.ts` — Billboard 构建器
- `src/geojsonStatisticQuery.ts` — GeoJSON 数据统计查询（分段、极值）
- `src/renderConfig/` — 渲染配置类型和实体样式定义
- `src/renderConfig2Style/` — 配置转 Cesium 样式转换器（SpriteIcon, lineStyle, pointStyle, polygonStyle 等）

## Notes

依赖 `@gaea-explorer/primitive-geojson` 和 `@turf/turf`。renderConfig2Style/ 是样式系统的核心，每种几何类型有独立转换器。
