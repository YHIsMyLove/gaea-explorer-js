import { Color, Entity } from 'cesium';
import type { Cartesian3, PolylineGraphics, Viewer } from 'cesium';
import { MouseTooltip } from '@gaea-explorer/tooltip';
import Subscriber from '@gaea-explorer/subscriber';
import { Painter, defaultOptions } from '@gaea-explorer/drawer';

import { UAVLine } from './UAVLine';
import type {
  HeightFunction,
  HeightMode,
  UAVLineOptions,
  UAVLineStartOptions,
} from './typings';

const DEFAULT_FINAL_OPTIONS: PolylineGraphics.ConstructorOptions = {
  width: 2,
  material: Color.YELLOW,
};

const DEFAULT_DYNAMIC_OPTIONS: PolylineGraphics.ConstructorOptions = {
  width: 2,
  material: Color.YELLOW,
};

const DEFAULT_HEIGHT = 100;
const DEFAULT_HEIGHT_MODE: HeightMode = 'RELATIVE_TO_GROUND';

type UAVDrawerStatus = 'INIT' | 'START' | 'PAUSE' | 'DESTROY';

export class UAVLineDrawer {
  private _viewer: Viewer;
  private _painter: Painter | null = null;
  private _uavLine: UAVLine | null = null;
  private _subscriber: Subscriber;
  private _status: UAVDrawerStatus = 'INIT';
  private _events: string[] = [];

  private _height: number | HeightFunction = DEFAULT_HEIGHT;
  private _heightMode: HeightMode = DEFAULT_HEIGHT_MODE;
  private _showDropLines = true;

  private _lineEntity: Entity | null = null;
  private _groundPositions: Cartesian3[] = [];
  private _dropLineEntities: Entity[] = [];
  private _onEnd:
    | ((
        entity: Entity,
        positions: Cartesian3[],
        groundPositions: Cartesian3[],
      ) => void)
    | null = null;

  private _mouseTooltip: MouseTooltip;
  private _tips = {
    init: 'Click to draw UAV line',
    start: 'LeftClick to add a point, doubleClick end drawing',
    end: '',
  };

  get status(): UAVDrawerStatus {
    return this._status;
  }

  get isDestroyed(): boolean {
    return this._status === 'DESTROY';
  }

  get lineEntity(): Entity | null {
    return this._lineEntity;
  }

  get groundPositions(): Cartesian3[] {
    return [...this._groundPositions];
  }

  get dropLineEntities(): Entity[] {
    return [...this._dropLineEntities];
  }

  constructor(viewer: Viewer, _options?: { terrain?: boolean }) {
    this._viewer = viewer;
    this._subscriber = new Subscriber(viewer);

    this._mouseTooltip = new MouseTooltip(viewer);
    this._mouseTooltip.enabled = false;
  }

  start(options: UAVLineStartOptions = {}): void {
    if (this._status === 'START') return;

    this._height = options.height ?? DEFAULT_HEIGHT;
    this._heightMode = options.heightMode ?? DEFAULT_HEIGHT_MODE;
    this._showDropLines = options.showDropLines ?? true;
    this._onEnd = options.onEnd ?? null;

    this._groundPositions = [];
    this._dropLineEntities = [];
    this._lineEntity = null;

    const finalOptions: PolylineGraphics.ConstructorOptions = {
      ...DEFAULT_FINAL_OPTIONS,
      ...options.finalOptions,
    };

    const dynamicOptions: PolylineGraphics.ConstructorOptions = {
      ...DEFAULT_DYNAMIC_OPTIONS,
      ...options.dynamicOptions,
    };

    this._painter = new Painter({
      viewer: this._viewer,
      terrain: true,
      model: false,
    });

    const uavOptions: UAVLineOptions = {
      finalOptions,
      dynamicOptions,
      heightMode: this._heightMode,
      height: this._height,
      showDropLines: this._showDropLines,
      dropLineOptions: options.dropLineOptions,
      onEnd: (entity, positions) => {
        this._lineEntity = entity;
        this._groundPositions = this._uavLine?.groundPositions ?? [];
        this._dropLineEntities = this._uavLine?.dropLineEntities ?? [];

        if (this._onEnd) {
          this._onEnd(entity, positions, this._groundPositions);
        }

        this._viewer.entities.add(entity);
        this._complete();
      },
    };

    this._uavLine = new UAVLine(this._painter, uavOptions);

    this._status = 'START';
    this._viewer.canvas.style.cursor = 'crosshair';
    this._updateTips();

    let isStartDraw = false;

    const startId = this._subscriber.addExternal((move) => {
      if (!this._uavLine || !move.position) return;

      this._uavLine.dropPoint(move);

      this._updateTips();

      setTimeout(() => {
        isStartDraw = true;
      }, 100);
    }, 'LEFT_CLICK');

    const moveId = this._subscriber.addExternal((move) => {
      if (!this._uavLine || !isStartDraw) return;
      this._uavLine.moving(move);
    }, 'MOUSE_MOVE');

    const endId = this._subscriber.addExternal(() => {
      if (!this._uavLine || !isStartDraw) return;

      this._uavLine.playOff();

      isStartDraw = false;
    }, 'LEFT_DOUBLE_CLICK');

    const cancelId = this._subscriber.addExternal((_move) => {
      if (!this._uavLine || !isStartDraw) return;
      this._uavLine.cancel();
      this._updateTips();
    }, 'RIGHT_CLICK');

    this._events = [startId, moveId, endId, cancelId];
  }

  private _complete(): void {
    this._status = 'PAUSE';
    this._updateTips();
    this._subscriber.removeExternal(this._events);
    this._events = [];
    this._viewer.canvas.style.cursor = 'default';
  }

  private _updateTips(): void {
    if (this._status === 'INIT' || this._status === 'DESTROY') {
      this._mouseTooltip.enabled = false;
      return;
    }
    if (this._status === 'PAUSE') {
      this._mouseTooltip.content = this._tips.end;
      this._mouseTooltip.enabled = false;
      return;
    }

    if (!this._painter || this._painter._breakPointEntities.length === 0) {
      this._mouseTooltip.content = this._tips.init;
    } else {
      this._mouseTooltip.content = this._tips.start;
    }
    this._mouseTooltip.enabled = true;
  }

  pause(): void {
    if (this._status !== 'START') return;

    this._subscriber.removeExternal(this._events);
    this._events = [];
    this._status = 'PAUSE';
    this._viewer.canvas.style.cursor = 'default';
    this._mouseTooltip.enabled = false;
  }

  reset(): void {
    this.pause();
    this._status = 'INIT';

    if (this._painter) {
      this._painter.clear();
    }

    if (this._lineEntity) {
      this._viewer.entities.remove(this._lineEntity);
      this._lineEntity = null;
    }

    for (const entity of this._dropLineEntities) {
      this._viewer.entities.remove(entity);
    }
    this._dropLineEntities = [];
    this._groundPositions = [];

    this._viewer.scene.requestRender();
  }

  destroy(): void {
    this.reset();
    this._mouseTooltip.destroy();
    this._subscriber.destroy();
    this._status = 'DESTROY';
  }

  getGroundPositions(): Cartesian3[] {
    return [...this._groundPositions];
  }

  getDropLines(): Entity[] {
    return [...this._dropLineEntities];
  }

  getLineEntity(): Entity | null {
    return this._lineEntity;
  }
}
