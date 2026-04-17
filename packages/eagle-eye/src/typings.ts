import type { Color, Entity, HeadingPitchRoll, Viewer } from 'cesium';

export type EagleEyePosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface EagleEyeOptions {
  /** 鹰眼宽度，默认 150px */
  width?: number;
  /** 鹰眼高度，默认 150px */
  height?: number;
  /** 鹰眼位置，默认 bottom-right */
  position?: EagleEyePosition;
  /** 位置偏移 */
  offset?: { x: number; y: number };
  /** 鹰眼朝向配置，不设置则同步主视图 */
  orientation?: {
    heading?: number;
    pitch?: number;
    roll?: number;
  };
  /** 是否同步主视图朝向，默认 false（当 orientation 未设置时自动同步） */
  syncOrientation?: boolean;
  /** 是否显示视野框，默认 true */
  showViewRect?: boolean;
  /** 视野框颜色 */
  viewRectColor?: Color | string;
  /** 视野框填充透明度 0-1 */
  viewRectFillOpacity?: number;
  /** 是否允许鹰眼切换图层 */
  baseLayerPicker?: boolean;
  /** 相机变化触发阈值，默认 0.01 */
  percentageChanged?: number;
  /** 点击鹰眼时飞行持续时间，默认 0.5 */
  flyDuration?: number;
  /** 自定义容器 */
  container?: Element;
  /** Entity 视角同步选项 */
  syncEntityView?: SyncEntityViewOptions;
  /** Frustum Entity 视角同步选项 */
  syncFrustumView?: SyncFrustumViewOptions;
}

export interface ViewRectOptions {
  viewer: Viewer;
  color?: Color | string;
  fillOpacity?: number;
}

/** 通用 Entity 视角同步选项 */
export interface SyncEntityViewOptions {
  /** 同步视角的目标 Entity */
  entity: Entity;
  /** 是否同步 orientation，默认 true */
  followOrientation?: boolean;
  /** 相机高度偏移，默认 0 */
  heightOffset?: number;
}

/** Frustum Entity 视角同步选项（同步位置、朝向、FOV 等相机属性） */
export interface SyncFrustumViewOptions {
  /** 拥有 frustum 属性的 Entity */
  entity: Entity;
}
