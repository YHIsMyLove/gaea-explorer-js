---
title: frustum
nav: 指南
group: 扩展
order: 13
---

# @gaea-explorer/graphics-extends / 视锥体

## 简介

FrustumGraphics 和 FrustumVisualizer 提供了在 CesiumJS 地图上渲染视锥体的功能。视锥体通常用于表示摄像机或传感器的可视范围。该模块遵循 Cesium 的 Entity Graphics 模式，可以像使用 PointGraphics、PolygonGraphics 一样使用 FrustumGraphics。

## 安装

FrustumGraphics 和 FrustumVisualizer 已包含在 @gaea-explorer/gaea-explorer-js 中：

```bash
npm install @gaea-explorer/gaea-explorer-js
```

## 使用方法

### 导入

```javascript
import {
  FrustumGraphics,
  FrustumVisualizer,
} from '@gaea-explorer/gaea-explorer-js';
import {
  Viewer,
  Cartesian3,
  HeadingPitchRoll,
  Transforms,
  JulianDate,
  Color,
  Math as CMath,
} from 'cesium';
```

### 创建视锥体

```javascript
const viewer = new Viewer('cesiumContainer');

// 添加带有 frustum 属性的 Entity
const position = Cartesian3.fromDegrees(116.39, 39.9, 1000);
const entity = viewer.entities.add({
  position,
  orientation: Transforms.headingPitchRollQuaternion(
    position,
    new HeadingPitchRoll(
      CMath.toRadians(0),
      CMath.toRadians(-30),
      0,
    ),
  ),
  frustum: new FrustumGraphics({
    fov: 45,
    near: 1,
    far: 800,
    aspectRatio: 1.5,
    fill: true,
    fillColor: Color.CYAN,
    fillOpacity: 0.3,
    outline: true,
    outlineColor: Color.WHITE,
  }),
});
```

### 创建 FrustumVisualizer

```javascript
const visualizer = new FrustumVisualizer(viewer.entities, viewer.scene);

// 必须在每帧中调用 update
viewer.scene.preRender.addEventListener(() => {
  visualizer.update(JulianDate.now());
});

// 销毁
visualizer.destroy();
```

## 示例

下面的示例在地图上创建了两个不同配置的视锥体，展示不同的视场角、颜色和方向设置。

<code src="@/components/Map/frustum.tsx"></code>

## API 参考

### `new FrustumGraphics(options?: FrustumGraphicsConstructorOptions)`

创建一个新的 FrustumGraphics 实例。

#### 参数选项

| 参数 | 类型 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `show` | `boolean \| Property` | `true` | 是否显示视锥体 |
| `fov` | `number \| Property` | `60` | 视场角（度数） |
| `near` | `number \| Property` | `1` | 近裁剪面距离 |
| `far` | `number \| Property` | `1000` | 远裁剪面距离 |
| `aspectRatio` | `number \| Property` | `1.0` | 宽高比 |
| `fill` | `boolean \| Property` | `true` | 是否显示填充 |
| `fillColor` | `Color \| Property` | `Color.RED` | 填充颜色 |
| `fillOpacity` | `number \| Property` | `0.3` | 填充透明度 |
| `outline` | `boolean \| Property` | `true` | 是否显示轮廓线 |
| `outlineColor` | `Color \| Property` | `Color.WHITE` | 轮廓线颜色 |

### `new FrustumVisualizer(entityCollection: EntityCollection, scene: Scene)`

创建一个新的 FrustumVisualizer 实例，用于管理 EntityCollection 中所有带有 frustum 属性的 Entity。

#### 参数

| 参数 | 类型 | 描述 |
| --- | --- | --- |
| `entityCollection` | `EntityCollection` | 要监听的实体集合 |
| `scene` | `Scene` | CesiumJS 场景对象 |

### 方法

#### `visualizer.update(time: JulianDate): void`

更新所有受管理的视锥体图元。必须在每帧渲染时调用。

#### `visualizer.destroy(): void`

销毁 FrustumVisualizer，移除所有事件监听器并清理资源。

### 属性

#### `visualizer.isDestroyed: boolean`

指示 FrustumVisualizer 是否已被销毁。

## 完整场景示例

关于视锥体结合 POVWidget 的无人机飞行模拟场景，请参阅 [@gaea-explorer/uav](/doc/uav) 页面中的「场景示例」。
