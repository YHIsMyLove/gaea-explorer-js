import type { Entity, Viewer } from 'cesium';

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
