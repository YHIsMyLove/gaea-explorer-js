import { Property, ConstantProperty, Color, defined } from 'cesium';

import type { FrustumGraphicsConstructorOptions } from './typings';
import { DEFAULT_FRUSTUM_OPTIONS } from './constants';

/**
 * Frustum 图形属性类
 * 仿照 Cesium Entity Graphics 模式（PointGraphics, PolygonGraphics 等）
 */
export class FrustumGraphics {
  private _show: Property;
  private _fov: Property;
  private _near: Property;
  private _far: Property;
  private _aspectRatio: Property;
  private _fill: Property;
  private _fillColor: Property;
  private _fillOpacity: Property;
  private _outline: Property;
  private _outlineColor: Property;

  constructor(options: FrustumGraphicsConstructorOptions = {}) {
    this._show = createProperty(options.show, DEFAULT_FRUSTUM_OPTIONS.show);
    this._fov = createProperty(options.fov, DEFAULT_FRUSTUM_OPTIONS.fov);
    this._near = createProperty(options.near, DEFAULT_FRUSTUM_OPTIONS.near);
    this._far = createProperty(options.far, DEFAULT_FRUSTUM_OPTIONS.far);
    this._aspectRatio = createProperty(
      options.aspectRatio,
      DEFAULT_FRUSTUM_OPTIONS.aspectRatio,
    );
    this._fill = createProperty(options.fill, DEFAULT_FRUSTUM_OPTIONS.fill);
    this._fillColor = createProperty(
      options.fillColor,
      DEFAULT_FRUSTUM_OPTIONS.fillColor,
    );
    this._fillOpacity = createProperty(
      options.fillOpacity,
      DEFAULT_FRUSTUM_OPTIONS.fillOpacity,
    );
    this._outline = createProperty(
      options.outline,
      DEFAULT_FRUSTUM_OPTIONS.outline,
    );
    this._outlineColor = createProperty(
      options.outlineColor,
      DEFAULT_FRUSTUM_OPTIONS.outlineColor,
    );
  }

  get show(): Property {
    return this._show;
  }
  set show(value: boolean | Property) {
    this._show = createProperty(value);
  }

  get fov(): Property {
    return this._fov;
  }
  set fov(value: number | Property) {
    this._fov = createProperty(value);
  }

  get near(): Property {
    return this._near;
  }
  set near(value: number | Property) {
    this._near = createProperty(value);
  }

  get far(): Property {
    return this._far;
  }
  set far(value: number | Property) {
    this._far = createProperty(value);
  }

  get aspectRatio(): Property {
    return this._aspectRatio;
  }
  set aspectRatio(value: number | Property) {
    this._aspectRatio = createProperty(value);
  }

  get fill(): Property {
    return this._fill;
  }
  set fill(value: boolean | Property) {
    this._fill = createProperty(value);
  }

  get fillColor(): Property {
    return this._fillColor;
  }
  set fillColor(value: Color | Property) {
    this._fillColor = createProperty(value);
  }

  get fillOpacity(): Property {
    return this._fillOpacity;
  }
  set fillOpacity(value: number | Property) {
    this._fillOpacity = createProperty(value);
  }

  get outline(): Property {
    return this._outline;
  }
  set outline(value: boolean | Property) {
    this._outline = createProperty(value);
  }

  get outlineColor(): Property {
    return this._outlineColor;
  }
  set outlineColor(value: Color | Property) {
    this._outlineColor = createProperty(value);
  }
}

function isProperty(value: unknown): value is Property {
  return defined(value) && typeof (value as any).getValue === 'function';
}

function createProperty<T>(
  value: T | Property | undefined,
  defaultValue?: T,
): Property {
  if (isProperty(value)) return value;
  if (defined(value)) return new ConstantProperty(value);
  if (defined(defaultValue)) return new ConstantProperty(defaultValue);
  return new ConstantProperty(defaultValue as T);
}
