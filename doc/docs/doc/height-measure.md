---
title: 高度测量
nav: 指南
group: 扩展
order: 12
---

# 高度测量

高度测量工具用于测量从地面沿法线方向的垂直距离，以垂直线 + 水平圆盘的形式可视化展示。

## 交互方式

1. 点击 **高度测量** 按钮开始
2. 点击地面选取基准点（圆盘中心）
3. 移动鼠标实时调整：
   - **上下移动**：控制垂直线的高度
   - **左右移动**：控制圆盘的半径
4. 点击确认完成测量

测量结果以标签形式显示在圆盘中心，格式为 `XX.XX m`。

## 使用

```typescript
import { Viewer } from 'cesium';
import { HeightMeasure } from '@gaea-explorer/measure';

const viewer = new Viewer('cesiumContainer');
const heightMeasure = new HeightMeasure(viewer);

// 开始测量
heightMeasure.start();

// 自定义样式
heightMeasure.start({
  lineColor: Color.CYAN,
  lineWidth: 2,
  discColor: Color.CYAN.withAlpha(0.3),
  discOutlineColor: Color.CYAN.withAlpha(0.8),
  basePointColor: Color.WHITE,
});

// 清除结果
heightMeasure.end();

// 销毁
heightMeasure.destroy();
```

## 示例

<code src="@/components/Map/height-measure/index.tsx"></code>

## API

### HeightMeasure

继承自 `Measure` 基类，用于垂直高度测量。

#### 构造函数

##### `constructor(viewer: Viewer, options?: { style?: HeightMeasureStyle })`

创建高度测量实例。

#### 方法

##### `start(style?: HeightMeasureStyle): void`

开始高度测量。点击地面选取基准点后，移动鼠标调整高度和半径，再次点击确认。

##### `end(): void`

清除测量结果。

##### `destroy(): void`

销毁测量工具。

#### 类型

##### HeightMeasureStyle

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| lineColor | `Color` | `Color.CYAN` | 垂直线颜色 |
| lineWidth | `number` | `2` | 垂直线宽度 |
| discColor | `Color` | `Color.CYAN.withAlpha(0.3)` | 圆盘填充色 |
| discOutlineColor | `Color` | `Color.CYAN.withAlpha(0.8)` | 圆盘边缘色 |
| basePointColor | `Color` | `Color.WHITE` | 基准点颜色 |
