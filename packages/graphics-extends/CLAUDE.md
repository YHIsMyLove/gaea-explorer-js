# graphics-extends

Cesium Graphics 扩展层，通过模块增强（module augmentation）为 Entity 添加自定义图形类型。当前实现 Frustum（相机视锥体）可视化。

## Structure

- `src/index.ts` — 导出 `FrustumGraphics`, `FrustumVisualizer` 及类型
- `src/frustum/` — Frustum 完整实现
  - `FrustumGraphics.ts` — 属性定义
  - `FrustumPrimitive.ts` — 渲染实现
  - `FrustumVisualizer.ts` — 生命周期管理
  - `constants.ts` — 默认参数常量
  - `typings.ts` — FrustumState、FrustumGraphicsConstructorOptions、FrustumPrimitiveOptions 类型
- `src/typings.ts` — 模块增强，为 Entity 添加 `frustum` 属性

## Notes

使用 Cesium 的 `Visualizer` 注册机制扩展 Entity 系统。通过模块增强为 `Entity` 接口添加 `frustum` 属性。
