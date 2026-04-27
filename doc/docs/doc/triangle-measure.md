---
title: 三角测量
nav: 指南
group: 扩展
order: 11
---

# 三角测量

三角测量工具用于测量空间中两点之间的空间距离、高度差和地面水平距离，以直角三角形的形式可视化展示。

## 交互方式

1. 点击 **三角测量** 按钮开始
2. 点击第一个点（高处点 A）
3. 移动鼠标，三角形实时预览
4. 点击第二个点（斜边终点 B），自动完成测量

三角形的三条边分别标注：
- **斜边**：A 到 B 的空间直线距离
- **高度**：A 到 C 的垂直高度差
- **地面**：C 到 B 的水平地面距离

## 使用

```typescript
import { Viewer } from 'cesium';
import { TriangleMeasure } from '@gaea-explorer/measure';

const viewer = new Viewer('cesiumContainer');
const triangleMeasure = new TriangleMeasure(viewer, {
  units: 'kilometers',
  locale: {
    start: '起点',
    total: '总计',
    area: '面积',
    formatLength: (length, unitedLength) => {
      if (length < 1000) {
        return `${length}米`;
      }
      return `${unitedLength}千米`;
    },
  },
  drawerOptions: {
    tips: {
      init: '点击高处点开始',
      start: '点击斜边终点完成测量',
    },
  },
});

// 开始测量
triangleMeasure.start();

// 清除结果
triangleMeasure.end();
```

## 示例

<code src="@/components/Map/triangle-measure/index.tsx"></code>

## API

### TriangleMeasure

继承自 `Measure` 基类，用于三角测量。

#### 构造函数

##### `constructor(viewer: Viewer, options?: MeasureOptions)`

创建三角测量实例。

#### 方法

##### `start(style?: PolylineGraphics.ConstructorOptions): void`

开始三角测量。点击 2 个点后自动完成。

##### `end(): void`

清除测量结果。

##### `destroy(): void`

销毁测量工具。
