import type { Cartesian2, Cartesian3, Viewer } from 'cesium';

/**
 * 从屏幕坐标拾取世界坐标
 */
export function pickCartesian3(
  viewer: Viewer,
  position: Cartesian2,
  terrain?: boolean,
  model?: boolean,
): Cartesian3 | undefined {
  // 防止无效屏幕坐标（如 NaN、Infinity）导致后续 Cesium API 异常
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    return undefined;
  }
  if (model) {
    return viewer.scene.pickPosition(position);
  }
  if (terrain) {
    const ray = viewer.camera.getPickRay(position);
    if (ray) return viewer.scene.globe.pick(ray, viewer.scene);
  } else {
    return viewer.camera.pickEllipsoid(position);
  }
  return undefined;
}
