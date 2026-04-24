import {
  Cartesian3,
  ConstantPositionProperty,
  Color,
  Entity,
  JulianDate,
} from 'cesium';
import type { PointGraphics, Viewer } from 'cesium';
import { ControlPointType } from '../typings';
import type {
  ControlPointMeta,
  EditorOptions,
  EditingParams,
} from '../typings';

/** 控制点默认样式 */
/** 控制点元数据属性名 */
export const EDITOR_CONTROL_KEY = '__editorControl';

export const defaultVertexStyle: PointGraphics.ConstructorOptions = {
  color: Color.WHITE,
  pixelSize: 10,
  outlineColor: Color.BLUE,
  outlineWidth: 2,
};

export const defaultMidPointStyle: PointGraphics.ConstructorOptions = {
  color: Color.WHITE,
  pixelSize: 6,
  outlineColor: Color.GRAY,
  outlineWidth: 1,
};

export const defaultRadiusStyle: PointGraphics.ConstructorOptions = {
  color: Color.WHITE,
  pixelSize: 8,
  outlineColor: Color.RED,
  outlineWidth: 2,
};

export interface EditableShapeConfig {
  viewer: Viewer;
  entity: Entity;
  vertexStyle: PointGraphics.ConstructorOptions;
  midPointStyle: PointGraphics.ConstructorOptions;
  radiusStyle: PointGraphics.ConstructorOptions;
}

export abstract class EditableShape {
  protected _viewer: Viewer;
  protected _entity: Entity;
  protected _vertexStyle: PointGraphics.ConstructorOptions;
  protected _midPointStyle: PointGraphics.ConstructorOptions;
  protected _radiusStyle: PointGraphics.ConstructorOptions;
  protected _controlPointEntities: Entity[] = [];

  constructor(config: EditableShapeConfig) {
    this._viewer = config.viewer;
    this._entity = config.entity;
    this._vertexStyle = config.vertexStyle;
    this._midPointStyle = config.midPointStyle;
    this._radiusStyle = config.radiusStyle;
  }

  get entity(): Entity {
    return this._entity;
  }

  get controlPoints(): Entity[] {
    return this._controlPointEntities;
  }

  /** 创建控制点并绑定到 Viewer */
  abstract createControlPoints(): Entity[];

  /** 销毁所有控制点 */
  destroyControlPoints(): void {
    for (const cp of this._controlPointEntities) {
      this._viewer.entities.remove(cp);
    }
    this._controlPointEntities = [];
  }

  /** 处理控制点拖动 */
  abstract onDrag(controlPointEntity: Entity, newPosition: Cartesian3): void;

  /** 结束编辑：将 CallbackProperty 转回静态值 */
  abstract finalize(): void;

  /** 获取编辑状态数据 */
  abstract getEditingParams(): EditingParams;

  /** 创建单个控制点 Entity */
  protected createControlPointEntity(
    position: Cartesian3,
    type: ControlPointType,
    style: PointGraphics.ConstructorOptions,
    vertexIndex?: number,
  ): Entity {
    const meta: ControlPointMeta = {
      controlType: type,
      vertexIndex,
      editableEntityId: this._entity.id,
    };

    const entity = new Entity({
      position,
      point: { ...style },
      properties: { [EDITOR_CONTROL_KEY]: meta },
    });

    this._viewer.entities.add(entity);
    this._controlPointEntities.push(entity);
    return entity;
  }

  /** 获取控制点的元数据 */
  protected getControlPointMeta(entity: Entity): ControlPointMeta | undefined {
    const raw = entity.properties?.[EDITOR_CONTROL_KEY];
    if (!raw) return undefined;
    if (typeof raw.getValue === 'function')
      return raw.getValue(JulianDate.now());
    return raw;
  }

  /** 更新控制点位置 */
  protected updateControlPointPosition(
    entity: Entity,
    newPosition: Cartesian3,
  ): void {
    entity.position = new ConstantPositionProperty(newPosition);
  }

  /** 从 Entity 解析 position（处理 Cesium Property 包装） */
  protected resolvePosition(): Cartesian3 {
    const pos = this._entity.position;
    if (pos instanceof Cartesian3) return pos;
    if (pos != null && typeof pos.getValue === 'function')
      return pos.getValue(JulianDate.now()) as Cartesian3;
    return pos as unknown as Cartesian3;
  }
}
