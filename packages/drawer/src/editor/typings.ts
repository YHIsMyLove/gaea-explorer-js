import type { Cartesian3, Entity, PointGraphics } from 'cesium';

/** 控制点类型 */
export enum ControlPointType {
  VERTEX = 'VERTEX',
  MIDPOINT = 'MIDPOINT',
  CENTER = 'CENTER',
  RADIUS = 'RADIUS',
}

/** 控制点元数据，存储在 entity.properties.__editorControl */
export interface ControlPointMeta {
  controlType: ControlPointType;
  vertexIndex?: number;
  editableEntityId: string;
}

/** 可编辑图形类型 */
export type EditableType =
  | 'POINT'
  | 'POLYLINE'
  | 'POLYGON'
  | 'CIRCLE'
  | 'RECTANGLE';

/** Editor 构造选项 */
export interface EditorOptions {
  vertexStyle?: PointGraphics.ConstructorOptions;
  midPointStyle?: PointGraphics.ConstructorOptions;
  radiusStyle?: PointGraphics.ConstructorOptions;
  terrain?: boolean;
  model?: boolean;
}

/** 编辑回调 */
export interface EditCallbacks {
  onEditStart?: (entity: Entity) => void;
  onEditing?: (params: EditingParams) => void;
  onEditEnd?: (entity: Entity) => void;
}

/** 编辑状态参数 */
export type EditingParams =
  | { type: 'POINT'; position: Cartesian3 }
  | { type: 'POLYLINE'; positions: Cartesian3[] }
  | { type: 'POLYGON'; positions: Cartesian3[] }
  | { type: 'CIRCLE'; center: Cartesian3; radius: number };
