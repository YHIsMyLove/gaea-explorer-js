import {
  Color,
  ConstantProperty,
  ColorMaterialProperty,
  RectangleGraphics,
  Entity,
} from 'cesium';

import type { Rectangle, Viewer } from 'cesium';
import type { ViewRectOptions } from './typings';

const DEFAULT_COLOR = Color.YELLOW.withAlpha(0.3);
const DEFAULT_FILL_OPACITY = 0.1;

/**
 * 视野矩形管理类
 * 在鹰眼地图上绘制主地图当前视野范围
 */
export class ViewRect {
  private _viewer: Viewer;
  private _entity: Entity | null = null;
  private _outlineColor: Color;
  private _fillColor: Color;
  private _destroyed = false;

  constructor(options: ViewRectOptions) {
    this._viewer = options.viewer;
    const baseColor = this._parseColor(options.color ?? DEFAULT_COLOR);
    this._outlineColor = baseColor;
    this._fillColor = baseColor.withAlpha(
      options.fillOpacity ?? DEFAULT_FILL_OPACITY,
    );
  }

  private _parseColor(color: Color | string): Color {
    if (typeof color === 'string') {
      return Color.fromCssColorString(color);
    }
    return color;
  }

  /**
   * 更新视野矩形位置
   * @param rectangle 视野范围，为 undefined 时隐藏矩形
   */
  update(rectangle: Rectangle | undefined): void {
    if (this._destroyed) return;

    // 当视野不可见时（如相机看向天空），隐藏矩形
    if (!rectangle) {
      this.hide();
      return;
    }

    // 确保矩形可见
    this.show();

    if (!this._entity) {
      this._entity = this._viewer.entities.add(
        new Entity({
          id: 'eagle-eye-view-rect',
          rectangle: new RectangleGraphics({
            coordinates: new ConstantProperty(rectangle),
            material: new ColorMaterialProperty(this._fillColor),
            outline: new ConstantProperty(true),
            outlineColor: new ConstantProperty(this._outlineColor),
            outlineWidth: new ConstantProperty(2),
          }),
        }),
      );
    } else {
      const rectGraphics = this._entity.rectangle;
      if (rectGraphics) {
        rectGraphics.coordinates = new ConstantProperty(rectangle);
      }
    }
  }

  /**
   * 显示视野矩形
   */
  show(): void {
    if (this._entity) {
      this._entity.show = true;
    }
  }

  /**
   * 隐藏视野矩形
   */
  hide(): void {
    if (this._entity) {
      this._entity.show = false;
    }
  }

  /**
   * 销毁视野矩形
   */
  destroy(): void {
    if (this._destroyed) return;

    if (this._entity) {
      this._viewer.entities.remove(this._entity);
      this._entity = null;
    }
    this._destroyed = true;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }
}
