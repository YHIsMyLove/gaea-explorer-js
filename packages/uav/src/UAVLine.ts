import {
  ArcType,
  CallbackProperty,
  Cartographic,
  Color,
  ConstantProperty,
  Entity,
  PolylineDashMaterialProperty,
} from 'cesium';
import type { Cartesian3, PolylineGraphics } from 'cesium';
import type { EventArgs } from '@gaea-explorer/subscriber';
import { BasicGraphices, type LifeCycle, Painter } from '@gaea-explorer/drawer';

import type {
  DropLineOptions,
  HeightFunction,
  HeightMode,
  UAVLineOptions,
} from './typings';

const DEFAULT_HEIGHT = 100;
const DEFAULT_DROP_LINE_WIDTH = 1;
const DEFAULT_DROP_LINE_COLOR = Color.WHITE.withAlpha(0.5);

export class UAVLine extends BasicGraphices implements LifeCycle {
  private _heightMode: HeightMode;
  private _height: number | HeightFunction;
  private _showDropLines: boolean;
  private _dropLineOptions: DropLineOptions;

  private _groundPositions: Cartesian3[] = [];
  private _dropLineEntities: Entity[] = [];

  constructor(painter: Painter, options: UAVLineOptions = {}) {
    super(painter, options);
    this._heightMode = options.heightMode ?? 'RELATIVE_TO_GROUND';
    this._height = options.height ?? DEFAULT_HEIGHT;
    this._showDropLines = options.showDropLines ?? true;
    this._dropLineOptions = options.dropLineOptions ?? {};
  }

  get groundPositions(): Cartesian3[] {
    return [...this._groundPositions];
  }

  get dropLineEntities(): Entity[] {
    return [...this._dropLineEntities];
  }

  private _calculateHeightPosition(
    groundPosition: Cartesian3,
    index: number,
  ): Cartesian3 {
    const heightValue =
      typeof this._height === 'function'
        ? this._height(index, this._groundPositions)
        : this._height;

    const cartographic = Cartographic.fromCartesian(groundPosition);

    if (this._heightMode === 'RELATIVE_TO_GROUND') {
      return Cartographic.toCartesian(
        new Cartographic(
          cartographic.longitude,
          cartographic.latitude,
          cartographic.height + heightValue,
        ),
      );
    }
    return Cartographic.toCartesian(
      new Cartographic(
        cartographic.longitude,
        cartographic.latitude,
        heightValue,
      ),
    );
  }

  dropPoint(event: EventArgs): void {
    if (!event.position) return;

    const groundPosition = this.painter.pickCartesian3(event.position);
    if (!groundPosition) return;

    this._groundPositions.push(groundPosition);

    const nodeIndex = this._groundPositions.length - 1;
    const heightPosition = this._calculateHeightPosition(
      groundPosition,
      nodeIndex,
    );

    if (this.painter._activeShapePoints.length === 0) {
      this.dynamicUpdate(heightPosition, this.createShape.bind(this));
    }

    this.painter._activeShapePoints.push(heightPosition);
    if (this._onPointsChange) {
      this._onPointsChange([...this.painter._activeShapePoints]);
    }

    const pointEntity = this.painter.createPoint(heightPosition);
    this.painter._breakPointEntities.push(pointEntity);
    this.painter.addView(pointEntity);

    if (this._showDropLines) {
      const dropLine = this._createDropLine(heightPosition, groundPosition);
      this._dropLineEntities.push(dropLine);
      this.painter.addView(dropLine);
    }

    this.painter._viewer.scene.requestRender();
  }

  moving(event: EventArgs): void {
    if (!event.endPosition || this.painter._activeShapePoints.length === 0)
      return;

    const groundPosition = this.painter.pickCartesian3(event.endPosition);
    if (!groundPosition) return;

    const previewHeightPosition = this._calculateHeightPosition(
      groundPosition,
      this._groundPositions.length,
    );

    this.painter._activeShapePoints.pop();
    this.painter._activeShapePoints.push(previewHeightPosition);

    if (this._onPointsChange) {
      this._onPointsChange([...this.painter._activeShapePoints]);
    }

    this.painter._viewer.scene.requestRender();
  }

  private _createDropLine(from: Cartesian3, to: Cartesian3): Entity {
    const options = this._dropLineOptions;
    const color = (options.material as Color) ?? DEFAULT_DROP_LINE_COLOR;

    return new Entity({
      polyline: {
        positions: [from, to],
        width: options.width ?? DEFAULT_DROP_LINE_WIDTH,
        material: new PolylineDashMaterialProperty({
          color,
          dashLength: 8.0,
          dashPattern: 255.0,
        }),
        arcType: ArcType.NONE,
      },
    });
  }

  playOff(): Entity {
    this.painter._activeShapePoints.pop();

    if (this._onPointsChange) {
      this._onPointsChange([...this.painter._activeShapePoints]);
    }

    this.result = this.createShape(this.painter._activeShapePoints);

    if (this._onEnd) {
      this._onEnd(this.result, [...this.painter._activeShapePoints]);
    }

    this.painter.reset();
    return this.result;
  }

  cancel(): void {
    if (this.painter._activeShapePoints.length < 2) {
      this.painter.reset();
      this._groundPositions = [];
      this._dropLineEntities.forEach((e) =>
        this.painter._viewer.entities.remove(e),
      );
      this._dropLineEntities = [];
      return;
    }

    this.painter._activeShapePoints.splice(-2, 1);
    this._groundPositions.pop();

    if (this._onPointsChange) {
      this._onPointsChange([...this.painter._activeShapePoints]);
    }

    const dropLine = this._dropLineEntities.pop();
    if (dropLine) this.painter._viewer.entities.remove(dropLine);

    this.result = this.createShape(this.painter._activeShapePoints);
  }

  createShape(
    positions: Cartesian3[] | CallbackProperty,
    _isDynamic = false,
  ): Entity {
    const polylineOpts: PolylineGraphics.ConstructorOptions = {
      positions,
      width:
        (this.finalOptions as PolylineGraphics.ConstructorOptions).width ?? 2,
      material:
        (this.finalOptions as PolylineGraphics.ConstructorOptions).material ??
        Color.YELLOW,
      arcType: ArcType.NONE,
    };

    return new Entity({ polyline: polylineOpts });
  }

  clearDropLines(): void {
    for (const entity of this._dropLineEntities) {
      this.painter._viewer.entities.remove(entity);
    }
    this._dropLineEntities = [];
  }
}
