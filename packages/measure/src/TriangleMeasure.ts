import {
  CallbackProperty,
  Cartesian3,
  Cartographic,
  Color,
  EllipsoidGeodesic,
  HeightReference,
} from 'cesium';

import { convertLength } from '@turf/helpers';

import Measure from './Measure';

import type { Entity, PolylineGraphics, Viewer } from 'cesium';
import type { MeasureOptions } from './Measure';

/**
 * 三角测量类
 * 点击第一个点 A（高处点），第二个点 B（斜边终点），
 * 自动计算 C 点（经纬度取 A，高度取 B），形成直角三角形。
 * 标注：斜边=空间距离，高=高度差，底边=地面水平距离。
 */
class TriangleMeasure extends Measure {
  private _triangleEntity: Entity | undefined;
  private _fixedPointCount = 0;
  private _lastPositionsLength = 0;
  private _trianglePositions: Cartesian3[] = [];

  constructor(viewer: Viewer, options: MeasureOptions = {}) {
    super(viewer, options);
  }

  start(style: PolylineGraphics.ConstructorOptions = {}) {
    this.end();
    this._start('POLYLINE', {
      style,
      clampToGround: false,
    });
  }

  protected _updateLabelFunc(positions: Cartesian3[]): void {
    if (positions.length > this._lastPositionsLength) {
      this._fixedPointCount++;
    }
    this._lastPositionsLength = positions.length;

    if (positions.length < 2) return;

    const A = positions[0];
    const B = positions[positions.length - 1];

    const cartoA = Cartographic.fromCartesian(A);
    const cartoB = Cartographic.fromCartesian(B);
    if (!cartoA || !cartoB) return;

    // C 点：经纬度取 A，高度取 B
    const C = Cartesian3.fromRadians(
      cartoA.longitude,
      cartoA.latitude,
      cartoB.height,
    );

    // 计算三边距离
    const slantDistance = Cartesian3.distance(A, B);
    const heightDiff = Math.abs(cartoA.height - cartoB.height);
    const geodesic = new EllipsoidGeodesic(
      new Cartographic(cartoA.longitude, cartoA.latitude, 0),
      new Cartographic(cartoB.longitude, cartoB.latitude, 0),
    );
    const groundDistance = geodesic.surfaceDistance ?? 0;

    // 更新三角形位置
    this._trianglePositions = [A, B, C, A];

    // 创建三角形实体（仅创建一次）
    if (!this._triangleEntity) {
      this._triangleEntity = this._viewer.entities.add({
        polyline: {
          positions: new CallbackProperty(() => this._trianglePositions, false),
          width: 2,
          material: Color.YELLOW,
          clampToGround: false,
        },
      });
    }

    // 更新标注
    this._labels.removeAll();

    const midAB = Cartesian3.midpoint(A, B, new Cartesian3());
    const midAC = Cartesian3.midpoint(A, C, new Cartesian3());
    const midCB = Cartesian3.midpoint(C, B, new Cartesian3());

    const labelOpts = {
      ...this._labelStyle,
      heightReference: HeightReference.NONE,
    };

    // 斜边标注（A→B 空间距离）
    const slant = +slantDistance.toFixed(2);
    const unitedSlant = +convertLength(slant, 'meters', this._units).toFixed(2);
    this._labels.add({
      position: midAB,
      ...labelOpts,
      text: `斜边: ${this._locale.formatLength(slant, unitedSlant, this._units)}`,
    });

    // 高标注（A→C 高度差）
    const height = +heightDiff.toFixed(2);
    const unitedHeight = +convertLength(height, 'meters', this._units).toFixed(
      2,
    );
    this._labels.add({
      position: midAC,
      ...labelOpts,
      text: `高度: ${this._locale.formatLength(height, unitedHeight, this._units)}`,
    });

    // 底边标注（C→B 地面水平距离）
    const ground = +groundDistance.toFixed(2);
    const unitedGround = +convertLength(ground, 'meters', this._units).toFixed(
      2,
    );
    this._labels.add({
      position: midCB,
      ...labelOpts,
      text: `地面: ${this._locale.formatLength(ground, unitedGround, this._units)}`,
    });

    // 2 个固定点后自动结束绘制
    // 使用 positions.length >= 3 作为更可靠的检测：
    // Drawer POLYLINE 模式下，N 个固定点 + 1 个鼠标跟随点 = length N+1
    // 所以 2 个固定点时 length >= 3
    if (positions.length >= 3 || this._fixedPointCount >= 2) {
      this.drawer.pause();
      // 移除 Drawer 残留的动态 POLYLINE（避免与三角形线框重叠）
      const painter = (this.drawer as any)?._painter;
      if (painter?._dynamicShapeEntity) {
        this._viewer.entities.remove(painter._dynamicShapeEntity);
        painter._dynamicShapeEntity = undefined;
      }
    }
  }

  end() {
    super.end();
    if (this._triangleEntity) {
      this._viewer.entities.remove(this._triangleEntity);
      this._triangleEntity = undefined;
    }
    this._trianglePositions = [];
    this._fixedPointCount = 0;
    this._lastPositionsLength = 0;
  }
}

export default TriangleMeasure;
