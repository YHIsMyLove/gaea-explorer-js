import type { Entity } from 'cesium';
import type { EditableType } from './typings';

/**
 * 根据 Entity 的图形属性自动检测可编辑类型
 * 检测优先级：point > rectangle > ellipse > polygon > polyline
 */
export function detectEditableType(entity: Entity): EditableType | null {
  if (entity.point) return 'POINT';
  if (entity.rectangle) return 'RECTANGLE';
  if (entity.ellipse) return 'CIRCLE';
  if (entity.polygon) return 'POLYGON';
  if (entity.polyline) return 'POLYLINE';
  return null;
}
