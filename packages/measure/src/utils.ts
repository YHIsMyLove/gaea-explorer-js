import type { Cartesian2, Cartesian3, HeightReference, Viewer } from 'cesium';
import { pickCartesian3 as pickFromDrawer } from '@gaea-explorer/drawer';
import { MeasureUnits } from './Measure';

export type PickResult = {
  cartesian: Cartesian3;
  CartesianModel: Cartesian3;
  cartesianTerrain: Cartesian3;
  windowCoordinates: Cartesian2;
  altitudeMode: HeightReference;
};

/**
 * Measure 包专用拾取函数，强制启用 terrain 模式以确保地形上的精确拾取。
 * 使用 globe.pick（基于 ray）而非 pickEllipsoid，适配测量场景的精度需求。
 */
export const pickCartesian3 = (
  viewer: Viewer,
  position: Cartesian2,
): Cartesian3 | undefined => pickFromDrawer(viewer, position, true);

export function getBounds(points: Cartesian2[]): number[] {
  const left = Math.min(...points.map((item) => item.x));
  const right = Math.max(...points.map((item) => item.x));
  const top = Math.max(...points.map((item) => item.y));
  const bottom = Math.min(...points.map((item) => item.y));

  const bounds = [left, top, right, bottom];
  return bounds;
}

/**
 * 格式化显示长度
 * @param length 单位米
 * @param unit 目标单位
 */
export function formatLength(
  length: number,
  unitedLength: number,
  unit: MeasureUnits,
) {
  if (length < 1000) {
    return `${length}meters`;
  }
  return unitedLength + unit;
}

/**
 * 格式化显示面积
 * @param area 单位米
 * @param unit 目标单位
 */
export function formatArea(
  area: number,
  unitedArea: number,
  unit: MeasureUnits,
) {
  if (area < 1000000) {
    return `${area} square meters `;
  }
  return `${unitedArea} square ${unit}`;
}

export function mean(array: number[]): number {
  return (
    array.reduce((accumulator, currentValue) => accumulator + currentValue, 0) /
    array.length
  );
}
