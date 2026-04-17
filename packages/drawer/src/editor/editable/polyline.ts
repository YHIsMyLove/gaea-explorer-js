import {
  CallbackProperty,
  Cartesian3,
  ConstantProperty,
  JulianDate,
} from 'cesium';
import type { Entity } from 'cesium';
import { ControlPointType } from '../typings';
import type { EditingParams } from '../typings';
import { EditableShape } from './base';

const MIN_VERTICES = 2;

export class EditablePolyline extends EditableShape {
  protected _positions: Cartesian3[] = [];

  createControlPoints(): Entity[] {
    // 从 entity 读取原始 positions
    const rawPositions = this._entity.polyline?.positions;
    if (!rawPositions) return [];

    this._positions = Array.isArray(rawPositions)
      ? [...rawPositions]
      : ((rawPositions as CallbackProperty).getValue?.(JulianDate.now()) ?? []);

    // polyline 已通过上面的 null 检查
    const polyline = this._entity.polyline;
    if (!polyline) return [];
    polyline.positions = new CallbackProperty(() => this._positions, false);

    // 创建顶点控制点
    for (let i = 0; i < this._positions.length; i++) {
      this.createControlPointEntity(
        this._positions[i],
        ControlPointType.VERTEX,
        this._vertexStyle,
        i,
      );
    }

    // 创建中点控制点
    this._createMidPoints();

    return this._controlPointEntities;
  }

  protected _createMidPoints(): void {
    // 移除旧中点
    this._controlPointEntities = this._controlPointEntities.filter((cp) => {
      const meta = this.getControlPointMeta(cp);
      if (meta?.controlType === ControlPointType.MIDPOINT) {
        this._viewer.entities.remove(cp);
        return false;
      }
      return true;
    });

    // 创建新中点
    for (let i = 0; i < this._positions.length - 1; i++) {
      const mid = Cartesian3.midpoint(
        this._positions[i],
        this._positions[i + 1],
        new Cartesian3(),
      );
      this.createControlPointEntity(
        mid,
        ControlPointType.MIDPOINT,
        this._midPointStyle,
        i,
      );
    }
  }

  onDrag(controlPointEntity: Entity, newPosition: Cartesian3): void {
    const meta = this.getControlPointMeta(controlPointEntity);
    if (!meta) return;

    if (
      meta.controlType === ControlPointType.VERTEX &&
      meta.vertexIndex !== undefined
    ) {
      const index = meta.vertexIndex;
      this._positions[index] = newPosition;
      this.updateControlPointPosition(controlPointEntity, newPosition);
      this._refreshAdjacentMidPoints(index);
      this._viewer.scene.requestRender();
    }
  }

  /** 刷新与顶点 i 相邻的中点位置 */
  protected _refreshAdjacentMidPoints(vertexIndex: number): void {
    const midPoints = this._controlPointEntities.filter((cp) => {
      const meta = this.getControlPointMeta(cp);
      return meta?.controlType === ControlPointType.MIDPOINT;
    });

    for (const mp of midPoints) {
      const meta = this.getControlPointMeta(mp);
      if (!meta) continue;
      if (
        meta.vertexIndex === vertexIndex - 1 ||
        meta.vertexIndex === vertexIndex
      ) {
        const i = meta.vertexIndex;
        if (i === undefined) continue;
        const mid = Cartesian3.midpoint(
          this._positions[i],
          this._positions[i + 1],
          new Cartesian3(),
        );
        this.updateControlPointPosition(mp, mid);
      }
    }
  }

  moveVertex(index: number, position: Cartesian3): void {
    if (index < 0 || index >= this._positions.length) return;
    this._positions[index] = position;
    this._refreshAdjacentMidPoints(index);
    this._viewer.scene.requestRender();
  }

  addVertex(index: number, position: Cartesian3): void {
    if (index < 0 || index > this._positions.length) return;
    this._positions.splice(index, 0, position);
    // 重建所有控制点
    this.destroyControlPoints();
    this._rebuildControlPoints();
  }

  removeVertex(index: number): void {
    if (this._positions.length <= MIN_VERTICES) {
      throw new Error(
        `Cannot remove vertex: minimum ${MIN_VERTICES} vertices required`,
      );
    }
    if (index < 0 || index >= this._positions.length) return;
    this._positions.splice(index, 1);
    // 重建所有控制点
    this.destroyControlPoints();
    this._rebuildControlPoints();
  }

  protected _rebuildControlPoints(): void {
    // 重建顶点
    for (let i = 0; i < this._positions.length; i++) {
      this.createControlPointEntity(
        this._positions[i],
        ControlPointType.VERTEX,
        this._vertexStyle,
        i,
      );
    }
    // 重建中点
    this._createMidPoints();
  }

  finalize(): void {
    if (this._entity.polyline) {
      this._entity.polyline.positions = new ConstantProperty([
        ...this._positions,
      ]);
    }
  }

  getEditingParams(): EditingParams {
    return {
      type: 'POLYLINE',
      positions: [...this._positions],
    };
  }
}
