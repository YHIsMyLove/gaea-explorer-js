import { CallbackProperty, Cartesian3 } from 'cesium';
import type { Entity } from 'cesium';
import { ControlPointType } from '../typings';
import type { EditingParams } from '../typings';
import { EditableShape } from './base';

export class EditableCircle extends EditableShape {
  protected _center: Cartesian3 = new Cartesian3();
  protected _radius: number = 0;

  createControlPoints(): Entity[] {
    const ellipse = this._entity.ellipse;
    if (!ellipse) return [];

    this._center = this.resolvePosition();
    const semiMinor = ellipse.semiMinorAxis;
    this._radius =
      typeof semiMinor === 'number'
        ? semiMinor
        : ((semiMinor as CallbackProperty)?.getValue?.({}) ?? 100);

    ellipse.semiMinorAxis = new CallbackProperty(
      () => this._radius,
      false,
    ) as any;
    ellipse.semiMajorAxis = new CallbackProperty(
      () => this._radius,
      false,
    ) as any;

    this.createControlPointEntity(
      this._center,
      ControlPointType.CENTER,
      this._vertexStyle,
    );

    const radiusPoint = this._computeRadiusPoint();
    this.createControlPointEntity(
      radiusPoint,
      ControlPointType.RADIUS,
      this._radiusStyle,
    );

    return this._controlPointEntities;
  }

  protected _computeRadiusPoint(): Cartesian3 {
    return new Cartesian3(
      this._center.x + this._radius,
      this._center.y,
      this._center.z,
    );
  }

  onDrag(controlPointEntity: Entity, newPosition: Cartesian3): void {
    const meta = this.getControlPointMeta(controlPointEntity);
    if (!meta) return;

    if (meta.controlType === ControlPointType.CENTER) {
      this._center = newPosition;
      this._entity.position = newPosition as any;

      const radiusCp = this._findControlPoint(ControlPointType.RADIUS);
      if (radiusCp) {
        this.updateControlPointPosition(radiusCp, this._computeRadiusPoint());
      }
      this.updateControlPointPosition(controlPointEntity, newPosition);
      this._viewer.scene.requestRender();
    } else if (meta.controlType === ControlPointType.RADIUS) {
      this._radius = Cartesian3.distance(this._center, newPosition);
      this.updateControlPointPosition(controlPointEntity, newPosition);
      this._viewer.scene.requestRender();
    }
  }

  setPosition(position: Cartesian3): void {
    this._center = position;
    this._entity.position = position as any;

    const centerCp = this._findControlPoint(ControlPointType.CENTER);
    if (centerCp) this.updateControlPointPosition(centerCp, position);

    const radiusCp = this._findControlPoint(ControlPointType.RADIUS);
    if (radiusCp) {
      this.updateControlPointPosition(radiusCp, this._computeRadiusPoint());
    }

    this._viewer.scene.requestRender();
  }

  setRadius(radius: number): void {
    this._radius = radius;

    const radiusCp = this._findControlPoint(ControlPointType.RADIUS);
    if (radiusCp) {
      this.updateControlPointPosition(radiusCp, this._computeRadiusPoint());
    }

    this._viewer.scene.requestRender();
  }

  finalize(): void {
    this._entity.ellipse!.semiMinorAxis = this._radius as any;
    this._entity.ellipse!.semiMajorAxis = this._radius as any;
  }

  getEditingParams(): EditingParams {
    return {
      type: 'CIRCLE',
      center: Cartesian3.clone(this._center),
      radius: this._radius,
    };
  }

  protected _findControlPoint(type: ControlPointType): Entity | undefined {
    return this._controlPointEntities.find(
      (cp) => this.getControlPointMeta(cp)?.controlType === type,
    );
  }
}
