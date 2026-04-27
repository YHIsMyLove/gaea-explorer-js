import {
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  EllipseGraphics,
  HeightReference,
  PolylineGraphics,
  PointGraphics,
  SceneTransforms,
} from 'cesium';

import { Subscriber } from '@gaea-explorer/subscriber';

import Measure from './Measure';

import type { EventArgs } from '@gaea-explorer/subscriber';
import type { Entity, PerspectiveFrustum, Viewer } from 'cesium';

export type HeightMeasureStyle = {
  lineColor?: Color;
  lineWidth?: number;
  discColor?: Color;
  discOutlineColor?: Color;
  basePointColor?: Color;
};

type HeightMeasureStatus = 'INIT' | 'PICKING_BASE' | 'ADJUSTING' | 'DESTROY';

const DefaultStyle: Required<HeightMeasureStyle> = {
  lineColor: Color.CYAN,
  lineWidth: 2,
  discColor: Color.CYAN.withAlpha(0.3),
  discOutlineColor: Color.CYAN.withAlpha(0.8),
  basePointColor: Color.WHITE,
};

class HeightMeasure extends Measure {
  private _heightStatus: HeightMeasureStatus = 'INIT';
  private _subscriber: Subscriber | null = null;
  private _clickEventId: string | null = null;
  private _moveEventId: string | null = null;

  private _baseCartographic: Cartographic | null = null;
  private _basePoint: Cartesian3 | null = null;
  private _baseScreen: Cartesian2 | null = null;
  private _height = 0;
  private _radius = 0;

  private _baseMarker: Entity | null = null;
  private _verticalLine: Entity | null = null;
  private _disc: Entity | null = null;
  private _topPosition: Cartesian3 = Cartesian3.ZERO;

  private _style: Required<HeightMeasureStyle>;

  constructor(viewer: Viewer, options?: { style?: HeightMeasureStyle }) {
    super(viewer);
    this._style = { ...DefaultStyle, ...options?.style };
  }

  start(style?: HeightMeasureStyle): void {
    if (this._heightStatus !== 'INIT') return;
    this.end();
    if (style) {
      this._style = { ...DefaultStyle, ...style };
    }

    this._subscriber = new Subscriber(this._viewer, {
      pickResult: { enable: true, moveDebounce: 16 },
    });

    this._clickEventId = this._subscriber.addExternal(
      this._onClick.bind(this),
      'LEFT_CLICK',
    );
    this._moveEventId = this._subscriber.addExternal(
      this._onMouseMove.bind(this),
      'MOUSE_MOVE',
    );

    this.mouseTooltip.content = '点击地面选取基准点';
    this._heightStatus = 'PICKING_BASE';
  }

  private _onClick(movement: EventArgs): void {
    if (this._heightStatus === 'DESTROY') return;

    const position = movement.position;
    if (!position) return;

    if (this._heightStatus === 'PICKING_BASE') {
      this._pickBasePoint(position);
    } else if (this._heightStatus === 'ADJUSTING') {
      this._confirm();
    }
  }

  private _pickBasePoint(position: Cartesian2): void {
    const ray = this._viewer.camera.getPickRay(position);
    if (!ray) return;
    const cartesian = this._viewer.scene.globe.pick(ray, this._viewer.scene);
    if (!cartesian) return;

    this._basePoint = cartesian;
    this._baseCartographic = Cartographic.fromCartesian(cartesian);
    if (!this._baseCartographic) return;

    this._baseScreen =
      SceneTransforms.worldToWindowCoordinates(this._viewer.scene, cartesian) ??
      null;
    if (!this._baseScreen) return;

    this._createEntities();

    this.mouseTooltip.content = '移动鼠标调整高度和半径，点击确认';
    this._heightStatus = 'ADJUSTING';
  }

  private _updateTopPosition(): void {
    if (!this._baseCartographic) return;
    this._topPosition = Cartesian3.fromRadians(
      this._baseCartographic.longitude,
      this._baseCartographic.latitude,
      this._baseCartographic.height + this._height,
    );
  }

  private _createEntities(): void {
    this._updateTopPosition();
    const viewer = this._viewer;
    const ds = viewer.entities;

    this._baseMarker = ds.add({
      position: this._basePoint ?? undefined,
      point: {
        pixelSize: 8,
        color: this._style.basePointColor,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      } as PointGraphics.ConstructorOptions,
    });

    this._verticalLine = ds.add({
      polyline: {
        positions: new CallbackProperty(() => {
          if (!this._basePoint || !this._baseCartographic) {
            return [this._topPosition, this._topPosition];
          }
          return [this._basePoint, this._topPosition];
        }, false),
        width: this._style.lineWidth,
        material: this._style.lineColor,
        clampToGround: false,
      } as PolylineGraphics.ConstructorOptions,
    });

    this._disc = ds.add({
      position: new CallbackProperty(() => this._topPosition, false) as any,
      ellipse: {
        semiMajorAxis: new CallbackProperty(() => this._radius, false),
        semiMinorAxis: new CallbackProperty(() => this._radius, false),
        material: this._style.discColor,
        outline: true,
        outlineColor: this._style.discOutlineColor,
        height: new CallbackProperty(() => {
          if (!this._baseCartographic) return 0;
          return this._baseCartographic.height + this._height;
        }, false),
      } as EllipseGraphics.ConstructorOptions,
    });

    this._labels.removeAll();
    this._labels.add({
      position: this._topPosition,
      text: '',
      ...this._labelStyle,
      heightReference: HeightReference.NONE,
    });
  }

  private _onMouseMove(movement: EventArgs): void {
    if (this._heightStatus !== 'ADJUSTING') return;
    if (!this._baseScreen || !this._baseCartographic) return;

    const mousePos = movement.endPosition;
    if (!mousePos) return;

    const mpp = this._getMetersPerPixel();
    const deltaY = this._baseScreen.y - mousePos.y;
    const deltaX = mousePos.x - this._baseScreen.x;

    this._height = Math.max(0, deltaY * mpp);
    this._radius = Math.abs(deltaX) * mpp;
    this._updateTopPosition();

    const label = this._labels.get(0);
    if (label) {
      label.text = `${this._height.toFixed(2)} m`;
      label.position = this._topPosition;
    }
  }

  private _getMetersPerPixel(): number {
    if (!this._basePoint) return 1;

    const camera = this._viewer.camera;
    const distance = Cartesian3.distance(camera.positionWC, this._basePoint);
    const frustum = camera.frustum as PerspectiveFrustum;
    const fovy = frustum.fovy ?? 1;
    const sseDenominator = 2 * Math.tan(fovy / 2);
    const canvasHeight = this._viewer.canvas.clientHeight;

    return (distance * sseDenominator) / canvasHeight;
  }

  private _confirm(): void {
    this._cleanupEvents();

    const label = this._labels.get(0);
    if (label) {
      label.text = `${this._height.toFixed(2)} m`;
    }

    this.mouseTooltip.hide();
    this._heightStatus = 'INIT';
  }

  end(): void {
    this._cleanupEvents();

    const ds = this._viewer.entities;
    if (this._baseMarker) {
      ds.remove(this._baseMarker);
      this._baseMarker = null;
    }
    if (this._verticalLine) {
      ds.remove(this._verticalLine);
      this._verticalLine = null;
    }
    if (this._disc) {
      ds.remove(this._disc);
      this._disc = null;
    }

    this._baseCartographic = null;
    this._basePoint = null;
    this._baseScreen = null;
    this._height = 0;
    this._radius = 0;
    this._topPosition = Cartesian3.ZERO;

    this.mouseTooltip.hide();
    this._heightStatus = 'INIT';

    super.end();
  }

  destroy(): void {
    this.end();
    if (this._subscriber) {
      this._subscriber.destroy();
      this._subscriber = null;
    }
    this._heightStatus = 'DESTROY';
    super.destroy();
  }

  private _cleanupEvents(): void {
    if (this._clickEventId) {
      this._subscriber?.removeExternal(this._clickEventId, 'LEFT_CLICK');
      this._clickEventId = null;
    }
    if (this._moveEventId) {
      this._subscriber?.removeExternal(this._moveEventId, 'MOUSE_MOVE');
      this._moveEventId = null;
    }
  }
}

export default HeightMeasure;
