import {
  CallbackProperty,
  Cartesian3,
  Entity,
  JulianDate,
  PolygonHierarchy,
} from 'cesium';
import type { Viewer } from 'cesium';
import { ControlPointType } from '../typings';
import type { EditingParams } from '../typings';
import { EditablePolyline } from './polyline';

const MIN_VERTICES = 3;

export class EditablePolygon extends EditablePolyline {
  createControlPoints(): Entity[] {
    // 从 entity.polygon.hierarchy 读取顶点
    const hierarchy = this._entity.polygon?.hierarchy;
    if (!hierarchy) return [];

    // 处理各种 Property 类型：ConstantProperty, CallbackProperty, 或原始 PolygonHierarchy
    let resolvedHierarchy: any = hierarchy;
    if (typeof hierarchy?.getValue === 'function') {
      resolvedHierarchy = hierarchy.getValue({});
    }

    const positions = resolvedHierarchy?.positions ?? resolvedHierarchy;
    this._positions = [...positions];

    // 替换 polygon.hierarchy 为 CallbackProperty
    this._entity.polygon!.hierarchy = new CallbackProperty(
      () => new PolygonHierarchy(this._positions),
      false,
    ) as any;

    // 如果有 polyline（边框），也同步更新
    if (this._entity.polyline) {
      this._entity.polyline.positions = new CallbackProperty(
        () => [...this._positions, this._positions[0]],
        false,
      ) as any;
    }

    // 创建顶点控制点
    for (let i = 0; i < this._positions.length; i++) {
      this.createControlPointEntity(
        this._positions[i],
        ControlPointType.VERTEX,
        this._vertexStyle,
        i,
      );
    }

    // 创建中点（闭合：重写父类的 _createMidPoints）
    this._createMidPoints();

    return this._controlPointEntities;
  }

  /** 闭合多边形的中点：包含首尾之间的中点 */
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

    for (let i = 0; i < this._positions.length; i++) {
      const next = (i + 1) % this._positions.length;
      const mid = Cartesian3.midpoint(
        this._positions[i],
        this._positions[next],
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

  /** 闭合多边形的中点刷新：使用取模处理环绕 */
  protected _refreshAdjacentMidPoints(vertexIndex: number): void {
    const n = this._positions.length;
    const midPoints = this._controlPointEntities.filter((cp) => {
      const meta = this.getControlPointMeta(cp);
      return meta?.controlType === ControlPointType.MIDPOINT;
    });

    for (const mp of midPoints) {
      const meta = this.getControlPointMeta(mp)!;
      if (
        meta.vertexIndex === (vertexIndex - 1 + n) % n ||
        meta.vertexIndex === vertexIndex
      ) {
        const i = meta.vertexIndex!;
        const next = (i + 1) % n;
        const mid = Cartesian3.midpoint(
          this._positions[i],
          this._positions[next],
          new Cartesian3(),
        );
        this.updateControlPointPosition(mp, mid);
      }
    }
  }

  removeVertex(index: number): void {
    if (this._positions.length <= MIN_VERTICES) {
      throw new Error(
        `Cannot remove vertex: minimum ${MIN_VERTICES} vertices required`,
      );
    }
    if (index < 0 || index >= this._positions.length) return;
    this._positions.splice(index, 1);
    this.destroyControlPoints();
    this._rebuildControlPoints();
  }

  finalize(): void {
    this._entity.polygon!.hierarchy = new PolygonHierarchy([
      ...this._positions,
    ]) as any;
    if (this._entity.polyline) {
      this._entity.polyline.positions = [
        ...this._positions,
        this._positions[0],
      ] as any;
    }
  }

  getEditingParams(): EditingParams {
    return {
      type: 'POLYGON',
      positions: [...this._positions],
    };
  }
}

/**
 * 将 Rectangle entity 转换为 Polygon entity
 */
export function convertRectangleToPolygon(
  entity: Entity,
  viewer: Viewer,
): Entity {
  const rect = entity.rectangle?.coordinates?.getValue?.(new JulianDate());
  if (!rect) throw new Error('Entity has no rectangle coordinates');

  const { west, east, north, south } = rect;
  const positions = [
    Cartesian3.fromRadians(west, north),
    Cartesian3.fromRadians(east, north),
    Cartesian3.fromRadians(east, south),
    Cartesian3.fromRadians(west, south),
  ];

  // 保留原样式
  const oldRectangle = entity.rectangle;
  const material = oldRectangle?.material;

  // 移除原 entity
  viewer.entities.remove(entity);

  // 创建新 polygon entity
  const newEntity = new Entity({
    polygon: {
      hierarchy: new PolygonHierarchy(positions),
      material,
    },
  });

  viewer.entities.add(newEntity);
  return newEntity;
}
