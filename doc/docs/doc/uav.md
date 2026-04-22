---
title: uav
nav: 指南
group: 扩展
order: 14
---

# @gaea-explorer/uav

UAV（无人机）相关功能组件，提供第一视角同步 Widget 和航线绘制功能。

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

### UAVLineDrawer

`UAVLineDrawer` 提供无人机航线绘制功能，支持：
- 固定高度或动态高度函数
- 相对地形高度或绝对高度模式
- 每个节点自动生成下垂虚线指向地表
- 绘制完成后支持编辑节点位置和高度

```typescript
import { UAVLineDrawer, EditableUAVLine, Editor } from '@gaea-explorer/uav';

// 创建航线绘制器
const drawer = new UAVLineDrawer(viewer);

// 固定高度绘制
drawer.start({
  height: 100,                          // 固定高度 100m
  heightMode: 'RELATIVE_TO_GROUND',     // 相对地形高度
  showDropLines: true,                  // 显示下垂线
  onEnd: (entity, positions, groundPositions) => {
    console.log('航线绘制完成');
    
    // 进入编辑模式
    editor.startEdit(entity, {
      onEditing: (params) => {
        console.log('节点信息:', params.nodes);
      },
    });
  },
});

// 动态高度绘制（阶梯高度）
drawer.start({
  height: (index, positions) => 50 + index * 30, // 阶梯高度
  heightMode: 'RELATIVE_TO_GROUND',
  showDropLines: true,
});

// 编辑节点高度
const editableShape = editor['_editableShape'];
if (editableShape instanceof EditableUAVLine) {
  editableShape.setNodeHeight(0, 200); // 设置第一个节点高度为 200m
}
```

## 示例

### 航线绘制

以下示例展示无人机航线绘制功能，包括固定高度、阶梯高度、递减高度三种模式，以及节点高度编辑。

<code src="@/components/Map/uav-line/index.tsx"></code>

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

### POVWidget 方法

- `destroy()` - 销毁 Widget
- `povViewer` - 获取内部 Viewer（用于调试）
- `isDestroyed` - 是否已销毁

### UAVLineStartOptions

| 参数 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `height` | `number \| HeightFunction` | `100` | 固定高度值(m)或高度计算函数 |
| `heightMode` | `'RELATIVE_TO_GROUND' \| 'ABSOLUTE'` | `'RELATIVE_TO_GROUND'` | 高度模式 |
| `showDropLines` | `boolean` | `true` | 是否显示下垂线 |
| `finalOptions` | `PolylineGraphics.ConstructorOptions` | - | 最终航线样式 |
| `dynamicOptions` | `PolylineGraphics.ConstructorOptions` | - | 动态绘制时的样式 |
| `dropLineOptions` | `PolylineGraphics.ConstructorOptions` | - | 下垂线样式 |
| `onEnd` | `(entity, positions, groundPositions) => void` | - | 结束绘制回调 |

### HeightFunction

高度计算函数签名：

```typescript
type HeightFunction = (index: number, groundPositions: Cartesian3[]) => number;
```

- `index` - 当前节点序号
- `groundPositions` - 当前所有地表位置数组
- 返回值 - 该节点的飞行高度(m)

### UAVLineDrawer 方法

| 方法 | 描述 |
|---|---|
| `start(options)` | 开始绘制航线 |
| `pause()` | 暂停绘制 |
| `reset()` | 重置并清除已绘制内容 |
| `destroy()` | 销毁绘制器 |
| `lineEntity` | 获取航线实体 |
| `groundPositions` | 获取地表位置数组 |
| `dropLineEntities` | 获取下垂线实体数组 |

### EditableUAVLine 方法

| 方法 | 描述 |
|---|---|
| `setNodeHeight(index, height)` | 设置指定节点的高度 |
| `nodes` | 获取所有节点信息（含位置、地表位置、高度） |
| `dropLineEntities` | 获取下垂线实体数组 |

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
