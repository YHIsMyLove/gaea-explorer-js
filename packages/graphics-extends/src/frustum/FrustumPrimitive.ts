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
import type { FrustumPrimitiveOptions, FrustumState } from './typings';

const IDENTITY_QUATERNION = Quaternion.IDENTITY;

export class FrustumPrimitive {
  private _entity: Entity;
  private _graphics: FrustumGraphics;
  private _scene: Scene;
  private _primitiveCollection: PrimitiveCollection;

  private _lastState: FrustumState | undefined;
  private _isDestroyed: boolean = false;
  private _initialized: boolean = false;

  constructor(options: FrustumPrimitiveOptions) {
    this._entity = options.entity;
    this._graphics = options.graphics;
    this._scene = options.scene;
    this._primitiveCollection = new PrimitiveCollection();
    this._scene.primitives.add(this._primitiveCollection);
  }

  get entity(): Entity {
    return this._entity;
  }
  get graphics(): FrustumGraphics {
    return this._graphics;
  }
  get isDestroyed(): boolean {
    return this._isDestroyed;
  }
  get primitiveCollection(): PrimitiveCollection {
    return this._primitiveCollection;
  }

  update(time: JulianDate): void {
    this._update(time);
  }

  private _update(time: JulianDate): void {
    const show = this._graphics.show.getValue(time);
    this._primitiveCollection.show = show;

    if (!show) return;

    const position = this._entity.position?.getValue(time);
    if (!position) return;

    const state: FrustumState = {
      position,
      orientation: this._entity.orientation?.getValue(time),
      fov: this._graphics.fov.getValue(time),
      near: this._graphics.near.getValue(time),
      far: this._graphics.far.getValue(time),
      aspectRatio: this._graphics.aspectRatio.getValue(time),
      fill: this._graphics.fill.getValue(time),
      fillColor: this._graphics.fillColor.getValue(time),
      fillOpacity: this._graphics.fillOpacity.getValue(time),
      outline: this._graphics.outline.getValue(time),
      outlineColor: this._graphics.outlineColor.getValue(time),
    };

    if (this._needsRebuild(state)) {
      this._rebuild(state);
      this._lastState = this._cloneState(state, this._lastState);
      this._initialized = true;
    }
  }

  private _cloneState(
    state: FrustumState,
    result: FrustumState | undefined,
  ): FrustumState {
    if (!result) {
      result = {
        position: Cartesian3.clone(state.position),
        orientation: state.orientation
          ? Quaternion.clone(state.orientation)
          : undefined,
        fov: state.fov,
        near: state.near,
        far: state.far,
        aspectRatio: state.aspectRatio,
        fill: state.fill,
        fillColor: Color.clone(state.fillColor),
        fillOpacity: state.fillOpacity,
        outline: state.outline,
        outlineColor: Color.clone(state.outlineColor),
      };
    } else {
      Cartesian3.clone(state.position, result.position);
      result.orientation = state.orientation
        ? Quaternion.clone(state.orientation, result.orientation)
        : undefined;
      result.fov = state.fov;
      result.near = state.near;
      result.far = state.far;
      result.aspectRatio = state.aspectRatio;
      result.fill = state.fill;
      Color.clone(state.fillColor, result.fillColor);
      result.fillOpacity = state.fillOpacity;
      result.outline = state.outline;
      Color.clone(state.outlineColor, result.outlineColor);
    }
    return result;
  }

  private _needsRebuild(state: FrustumState): boolean {
    if (!this._initialized || !this._lastState) return true;

    const last = this._lastState;
    return (
      !Cartesian3.equals(state.position, last.position) ||
      this._orientationChanged(state.orientation, last.orientation) ||
      state.fov !== last.fov ||
      state.near !== last.near ||
      state.far !== last.far ||
      state.aspectRatio !== last.aspectRatio ||
      state.fill !== last.fill ||
      !Color.equals(state.fillColor, last.fillColor) ||
      state.fillOpacity !== last.fillOpacity ||
      state.outline !== last.outline ||
      !Color.equals(state.outlineColor, last.outlineColor)
    );
  }

  private _orientationChanged(
    current: Quaternion | undefined,
    last: Quaternion | undefined,
  ): boolean {
    if (!current && !last) return false;
    if (!current || !last) return true;
    return !Quaternion.equals(current, last);
  }

  private _rebuild(state: FrustumState): void {
    this._primitiveCollection.removeAll();

    const effectiveOrientation = state.orientation ?? IDENTITY_QUATERNION;

    const frustum = new PerspectiveFrustum({
      fov: CesiumMath.toRadians(state.fov),
      aspectRatio: state.aspectRatio,
      near: state.near,
      far: state.far,
    });

    if (state.fill) {
      this._primitiveCollection.add(
        new Primitive({
          geometryInstances: [
            new GeometryInstance({
              geometry: new FrustumGeometry({
                frustum,
                origin: state.position,
                orientation: effectiveOrientation,
                vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
              }),
              id: this._entity,
              attributes: {
                color: ColorGeometryInstanceAttribute.fromColor(
                  state.fillColor.withAlpha(state.fillOpacity),
                ),
              },
            }),
          ],
          appearance: new PerInstanceColorAppearance({
            closed: true,
            flat: true,
            translucent: true,
          }),
          asynchronous: false,
        }),
      );
    }

    if (state.outline) {
      this._primitiveCollection.add(
        new Primitive({
          geometryInstances: [
            new GeometryInstance({
              geometry: new FrustumOutlineGeometry({
                frustum,
                origin: state.position,
                orientation: effectiveOrientation,
              }),
              id: this._entity,
              attributes: {
                color: ColorGeometryInstanceAttribute.fromColor(
                  state.outlineColor,
                ),
              },
            }),
          ],
          appearance: new PerInstanceColorAppearance({
            flat: true,
            translucent: false,
          }),
          asynchronous: false,
        }),
      );
    }
  }

  destroy(): void {
    if (this._isDestroyed) return;

    this._scene.primitives.remove(this._primitiveCollection);
    this._primitiveCollection.removeAll();
    this._isDestroyed = true;
  }
}
