# primitive-geojson

高性能 GeoJSON 加载器，使用 Cesium Primitive API（而非 Entity/DataSource）获得更好的渲染性能。

## Structure

- `src/index.ts` — 导出 `GeoJsonPrimitiveLayer`, `getPositionsCenter` 及类型
- `src/GeoJsonPrimitiveLayer.ts` — 核心加载和渲染逻辑
- `src/BasicGraphicLayer.ts` — 基础图形图层
- `src/GeoJsonLayer-util.ts` — GeoJSON 解析工具
- `src/getPositionsCenter.ts` — 坐标中心点计算

## Notes

依赖 `@turf/centroid`, `@turf/helpers`, `nanoid`。被 `geojson-render` 包使用。
