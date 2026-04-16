// packages/graphics-extends/src/frustum/typings.ts

import type { Property, Color } from 'cesium';

/**
 * FrustumGraphics 构造选项
 * 仿照 Cesium Graphics.ConstructorOptions 模式
 */
export interface FrustumGraphicsConstructorOptions {
  /** 是否显示，默认 true */
  show?: boolean | Property;

  /** 视场角（度数），默认 60 */
  fov?: number | Property;

  /** 近裁剪面距离，默认 1 */
  near?: number | Property;

  /** 远裁剪面距离，默认 1000 */
  far?: number | Property;

  /** 宽高比，默认 1.0 */
  aspectRatio?: number | Property;

  /** 是否显示填充，默认 true */
  fill?: boolean | Property;

  /** 填充颜色，默认 Color.RED */
  fillColor?: Color | Property;

  /** 填充透明度，默认 0.3 */
  fillOpacity?: number | Property;

  /** 是否显示轮廓线，默认 true */
  outline?: boolean | Property;

  /** 轮廓线颜色，默认 Color.WHITE */
  outlineColor?: Color | Property;
}

/**
 * FrustumPrimitive 构造选项（内部使用）
 */
export interface FrustumPrimitiveOptions {
  entity: Cesium.Entity;
  graphics: FrustumGraphics;
  scene: Cesium.Scene;
}