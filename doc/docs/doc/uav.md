---
title: uav
nav: 指南
group: 扩展
order: 14
---

# @gaea-explorer/uav

UAV（无人机）相关功能组件，提供第一视角同步 Widget。

## 安装

```bash
npm install @gaea-explorer/uav --save
```

## 使用方法

### POVWidget

`POVWidget` 创建一个内部 Viewer，同步显示目标 Entity 的第一视角。适用于无人机、人物模型、车辆等。

```typescript
import { POVWidget } from '@gaea-explorer/uav';

const povWidget = new POVWidget(viewer, {
  entity: entity,           // 目标 Entity（必须有 position 和 orientation）
  width: 200,               // 窗口宽度，默认 150
  height: 150,              // 窗口高度，默认 150
  position: 'bottom-right', // 窗口位置
  offset: { x: 10, y: 10 }, // 位置偏移
  heightOffset: 0,          // 相机高度偏移
  fovSync: true,            // 是否同步 FOV（仅当 entity 有 frustum 时生效）
});
```

## API

### POVWidgetOptions

| 参数 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `entity` | `Entity` | - | 目标 Entity（必须有 position 和 orientation） |
| `width` | `number` | `150` | 窗口宽度（px） |
| `height` | `number` | `150` | 窗口高度（px） |
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-right'` | 窗口位置 |
| `offset` | `{ x?: number; y?: number }` | - | 位置偏移 |
| `heightOffset` | `number` | `0` | 相机高度偏移（相对于 entity 高度） |
| `fovSync` | `boolean` | `true` | 是否同步 FOV（仅当 entity 有 frustum 属性时生效） |
| `smoothing` | `number` | `0.15` | 平滑跟随系数，0~1，值越大跟随越快 |
| `container` | `Element` | `viewer.container` | 自定义容器 |

### 方法

- `destroy()` - 销毁 Widget
- `povViewer` - 获取内部 Viewer（用于调试）
- `isDestroyed` - 是否已销毁

## 场景示例

以下示例展示一个完整的无人机飞行模拟场景，包含视锥体动画、第一视角同步和相机追踪功能。

### 功能说明

- **飞行路线绘制**：北京本地短距离路线 polyline（约 20km）
- **视锥体动画**：使用 `SampledPositionProperty` 和 `SampledProperty` 实现无人机飞行动画，动态 heading 基于 `EllipsoidGeodesic` 计算
- **第一视角同步**：使用 `POVWidget` 在右下角渲染 Entity 第一视角画面，支持 FOV 同步
- **相机追踪**：主视图相机锁定在视锥体后方，跟随飞行方向
- **动画控制**：播放/暂停/重置、进度条拖拽、追踪开关

<code src="@/components/Map/frustum-demo.tsx"></code>

### 动画实现

视锥体动画使用 Cesium 的 `SampledPositionProperty` 和 `SampledProperty` 实现：

```typescript
// 创建采样位置
const sampledPosition = new SampledPositionProperty();
positions.forEach(({ time, position }) => {
  sampledPosition.addSample(time, position);
});

// 创建采样朝向
const sampledOrientation = new SampledProperty(Quaternion);
orientations.forEach(({ time, orientation }) => {
  sampledOrientation.addSample(time, orientation);
});

// 创建 Entity
const entity = viewer.entities.add({
  position: sampledPosition,
  orientation: sampledOrientation,
  frustum: new FrustumGraphics({
    fov: 60,
    near: 1,
    far: 500,
    aspectRatio: 1,
    fillColor: Color.CYAN,
    fillOpacity: 0.2,
    outline: true,
    outlineColor: Color.WHITE,
  }),
});

// 创建 FrustumVisualizer
const visualizer = new FrustumVisualizer(viewer.entities, viewer.scene);
viewer.scene.preRender.addEventListener(() => {
  visualizer.update(JulianDate.now());
});
```
