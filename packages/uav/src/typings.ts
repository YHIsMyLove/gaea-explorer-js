import type { Cartesian3, Entity, PolylineGraphics, Viewer } from 'cesium';
import type {
  BasicGraphicesOptions,
  EditingParams,
} from '@gaea-explorer/drawer';

/** 窗口位置 */
export type POVWidgetPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/** POVWidget 构造选项 */
export interface POVWidgetOptions {
  /** 目标 Entity（必须有 position 和 orientation） */
  entity: Entity;
  /** 窗口宽度，默认 150 */
  width?: number;
  /** 窗口高度，默认 150 */
  height?: number;
  /** 窗口位置，默认 bottom-right */
  position?: POVWidgetPosition;
  /** 位置偏移 */
  offset?: { x: number; y: number };
  /** 相机高度偏移（相对于 entity 高度），默认 0 */
  heightOffset?: number;
  /** 是否同步 FOV（仅当 entity 有 frustum 属性时生效），默认 true */
  fovSync?: boolean;
  /** 平滑跟随系数，0~1，值越大跟随越快，默认 0.15 */
  smoothing?: number;
  /** 自定义容器，默认 viewer.container */
  container?: Element;
}

/** 高度模式 */
export type HeightMode = 'ABSOLUTE' | 'RELATIVE_TO_GROUND';

/** 高度计算函数 - index + 当前所有地表位置数组 */
export type HeightFunction = (
  index: number,
  groundPositions: Cartesian3[],
) => number;

/** 下垂线样式选项 */
export interface DropLineOptions extends PolylineGraphics.ConstructorOptions {
  /** 是否显示，默认 true */
  show?: boolean;
}

/** 航线绘制选项 */
export interface UAVLineOptions extends BasicGraphicesOptions {
  /** 高度模式，默认 RELATIVE_TO_GROUND */
  heightMode?: HeightMode;
  /** 固定高度值(m)或高度计算函数，默认 100 */
  height?: number | HeightFunction;
  /** 下垂线样式 */
  dropLineOptions?: DropLineOptions;
  /** 是否显示下垂线，默认 true */
  showDropLines?: boolean;
}

/** 航线节点信息（含地表位置） */
export interface UAVNode {
  /** 节点位置（带高度） */
  position: Cartesian3;
  /** 地表位置（下垂线终点） */
  groundPosition: Cartesian3;
  /** 高度值 */
  height: number;
}

/** 航线编辑参数（独立类型，不继承 EditingParams） */
export interface UAVEditingParams {
  type: 'POLYLINE';
  positions: Cartesian3[];
  nodes: UAVNode[];
  heightMode: HeightMode;
}

/** 航线开始绘制选项 */
export interface UAVLineStartOptions {
  /** 最终航线样式 */
  finalOptions?: PolylineGraphics.ConstructorOptions;
  /** 动态绘制时的样式 */
  dynamicOptions?: PolylineGraphics.ConstructorOptions;
  /** 固定高度值(m)或高度计算函数，默认 100 */
  height?: number | HeightFunction;
  /** 高度模式，默认 RELATIVE_TO_GROUND */
  heightMode?: HeightMode;
  /** 是否显示下垂线，默认 true */
  showDropLines?: boolean;
  /** 下垂线样式 */
  dropLineOptions?: DropLineOptions;
  /** 结束绘制回调 */
  onEnd?: (
    entity: Entity,
    positions: Cartesian3[],
    groundPositions: Cartesian3[],
  ) => void;
}

/** 航线编辑器构造选项 */
export interface UAVEditOptions {
  /** 地表位置数组（用于下垂线和高度计算） */
  groundPositions: Cartesian3[];
  /** 高度值或函数 */
  height: number | HeightFunction;
  /** 高度模式 */
  heightMode: HeightMode;
  /** 下垂线样式 */
  dropLineOptions?: DropLineOptions;
  /** 是否显示下垂线 */
  showDropLines?: boolean;
  /** 顶点控制点样式 */
  vertexStyle?: PolylineGraphics.ConstructorOptions;
  /** 中点控制点样式 */
  midPointStyle?: PolylineGraphics.ConstructorOptions;
}
