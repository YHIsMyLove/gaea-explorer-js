import {
  Primitive,
  PrimitiveCollection,
  FrustumGeometry,
  FrustumOutlineGeometry,
  GeometryInstance,
  PerInstanceColorAppearance,
  ColorGeometryInstanceAttribute,
  Color,
  Cartesian3,
  Quaternion,
  PerspectiveFrustum,
  Math as CesiumMath,
  JulianDate,
} from 'cesium';
import type { Entity, Scene } from 'cesium';

import { FrustumGraphics } from './FrustumGraphics';
import type { FrustumPrimitiveOptions } from './typings';

/** 单位四元数（无旋转），当 Entity 未提供 orientation 时使用 */
const IDENTITY_QUATERNION = Quaternion.IDENTITY;

export class FrustumPrimitive {
  private _entity: Entity;
  private _graphics: FrustumGraphics;
  private _scene: Scene;

  private _fillPrimitive: Primitive | undefined;
  private _outlinePrimitive: Primitive | undefined;
  private _primitiveCollection: PrimitiveCollection;

  private _lastPosition: Cartesian3 | undefined;
  private _lastOrientation: Quaternion | undefined;
  private _lastFov: number | undefined;
  private _lastNear: number | undefined;
  private _lastFar: number | undefined;
  private _lastAspectRatio: number | undefined;

  private _isDestroyed: boolean = false;

  constructor(options: FrustumPrimitiveOptions) {
    this._entity = options.entity;
    this._graphics = options.graphics;
    this._scene = options.scene;
    this._primitiveCollection = new PrimitiveCollection();

    this._update(JulianDate.now());
    this._scene.primitives.add(this._primitiveCollection);
  }

  get entity(): Entity { return this._entity; }
  get graphics(): FrustumGraphics { return this._graphics; }
  get isDestroyed(): boolean { return this._isDestroyed; }
  get primitiveCollection(): PrimitiveCollection { return this._primitiveCollection; }

  update(time: JulianDate): void {
    this._update(time);
  }

  private _update(time: JulianDate): void {
    const show = this._graphics.show.getValue(time);
    this._primitiveCollection.show = show;

    if (!show) return;

    const position = this._entity.position?.getValue(time);
    if (!position) return;

    const orientation = this._entity.orientation?.getValue(time);

    const fov = this._graphics.fov.getValue(time);
    const near = this._graphics.near.getValue(time);
    const far = this._graphics.far.getValue(time);
    const aspectRatio = this._graphics.aspectRatio.getValue(time);
    const fill = this._graphics.fill.getValue(time);
    const fillColor = this._graphics.fillColor.getValue(time);
    const fillOpacity = this._graphics.fillOpacity.getValue(time);
    const outline = this._graphics.outline.getValue(time);
    const outlineColor = this._graphics.outlineColor.getValue(time);

    const needsRebuild = this._needsRebuild(
      position, orientation, fov, near, far, aspectRatio
    );

    if (needsRebuild) {
      this._rebuild(
        position, orientation, fov, near, far, aspectRatio,
        fill, fillColor, fillOpacity, outline, outlineColor
      );

      this._lastPosition = Cartesian3.clone(position, this._lastPosition);
      if (orientation) {
        this._lastOrientation = Quaternion.clone(orientation, this._lastOrientation);
      }
      this._lastFov = fov;
      this._lastNear = near;
      this._lastFar = far;
      this._lastAspectRatio = aspectRatio;
    }
  }

  private _needsRebuild(
    position: Cartesian3,
    orientation: Quaternion | undefined,
    fov: number,
    near: number,
    far: number,
    aspectRatio: number
  ): boolean {
    if (!this._lastPosition) return true;

    return (
      !Cartesian3.equals(position, this._lastPosition) ||
      (orientation && this._lastOrientation && !Quaternion.equals(orientation, this._lastOrientation)) ||
      fov !== this._lastFov ||
      near !== this._lastNear ||
      far !== this._lastFar ||
      aspectRatio !== this._lastAspectRatio
    );
  }

  private _rebuild(
    position: Cartesian3,
    orientation: Quaternion | undefined,
    fov: number,
    near: number,
    far: number,
    aspectRatio: number,
    fill: boolean,
    fillColor: Color,
    fillOpacity: number,
    outline: boolean,
    outlineColor: Color
  ): void {
    this._primitiveCollection.removeAll();
    this._fillPrimitive = undefined;
    this._outlinePrimitive = undefined;

    const effectiveOrientation = orientation ?? IDENTITY_QUATERNION;

    const frustum = new PerspectiveFrustum({
      fov: CesiumMath.toRadians(fov),
      aspectRatio: aspectRatio,
      near: near,
      far: far,
    });

    if (fill) {
      const fillGeometry = new FrustumGeometry({
        frustum: frustum,
        origin: position,
        orientation: effectiveOrientation,
        vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
      });

      const fillInstance = new GeometryInstance({
        geometry: fillGeometry,
        id: this._entity,
        attributes: {
          color: ColorGeometryInstanceAttribute.fromColor(
            fillColor.withAlpha(fillOpacity)
          ),
        },
      });

      this._fillPrimitive = new Primitive({
        geometryInstances: [fillInstance],
        appearance: new PerInstanceColorAppearance({
          closed: true,
          flat: true,
          translucent: true,
        }),
        asynchronous: false,
      });

      this._primitiveCollection.add(this._fillPrimitive);
    }

    if (outline) {
      const outlineGeometry = new FrustumOutlineGeometry({
        frustum: frustum,
        origin: position,
        orientation: effectiveOrientation,
      });

      const outlineInstance = new GeometryInstance({
        geometry: outlineGeometry,
        id: this._entity,
        attributes: {
          color: ColorGeometryInstanceAttribute.fromColor(outlineColor),
        },
      });

      this._outlinePrimitive = new Primitive({
        geometryInstances: [outlineInstance],
        appearance: new PerInstanceColorAppearance({
          flat: true,
          translucent: false,
        }),
        asynchronous: false,
      });

      this._primitiveCollection.add(this._outlinePrimitive);
    }
  }

  destroy(): void {
    if (this._isDestroyed) return;

    this._scene.primitives.remove(this._primitiveCollection);
    this._primitiveCollection.removeAll();
    this._fillPrimitive = undefined;
    this._outlinePrimitive = undefined;
    this._isDestroyed = true;
  }
}
