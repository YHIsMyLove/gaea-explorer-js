import { Cartesian3 } from 'cesium';
import type { Entity } from 'cesium';
import { ControlPointType } from '../typings';
import type { EditingParams } from '../typings';
import { EditableShape } from './base';

export class EditablePoint extends EditableShape {
  createControlPoints(): Entity[] {
    const position = this.resolvePosition();
    return [
      this.createControlPointEntity(
        position,
        ControlPointType.VERTEX,
        this._vertexStyle,
      ),
    ];
  }

  onDrag(_controlPointEntity: Entity, newPosition: Cartesian3): void {
    this._entity.position = newPosition as any;
    this._viewer.scene.requestRender();
  }

  finalize(): void {
    // Point 直接修改 position，不需要 CallbackProperty 清理
  }

  getEditingParams(): EditingParams {
    return { type: 'POINT', position: this.resolvePosition() };
  }
}
