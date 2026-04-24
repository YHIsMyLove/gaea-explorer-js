import {
  ArcType,
  Cartographic,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  Entity,
  PolylineDashMaterialProperty,
} from 'cesium';
import type { Cartesian3, PointGraphics, Viewer } from 'cesium';
import {
  EditablePolyline,
  ControlPointType,
  EDITOR_CONTROL_KEY,
  defaultVertexStyle,
  defaultMidPointStyle,
} from '@gaea-explorer/drawer';

import type {
  DropLineOptions,
  HeightFunction,
  HeightMode,
  UAVEditOptions,
  UAVEditingParams,
  UAVNode,
} from './typings';

const DEFAULT_DROP_LINE_WIDTH = 1;
const DEFAULT_DROP_LINE_COLOR = Color.WHITE.withAlpha(0.5);

export class EditableUAVLine extends EditablePolyline {
  private _nodes: UAVNode[] = [];
  private _heightMode: HeightMode;
  private _height: number | HeightFunction;
  private _dropLineOptions: DropLineOptions;
  private _showDropLines: boolean;
  private _dropLineEntities: Entity[] = [];

  constructor(viewer: Viewer, entity: Entity, options: UAVEditOptions) {
    const vertexStyle: PointGraphics.ConstructorOptions =
      options.vertexStyle ?? defaultVertexStyle;
    const midPointStyle: PointGraphics.ConstructorOptions =
      options.midPointStyle ?? defaultMidPointStyle;

    super({
      viewer,
      entity,
      vertexStyle,
      midPointStyle,
      radiusStyle: vertexStyle,
    });

    this._heightMode = options.heightMode;
    this._height = options.height;
    this._dropLineOptions = options.dropLineOptions ?? {};
    this._showDropLines = options.showDropLines ?? true;

    this._initializeNodes(options.groundPositions);
  }

  private _initializeNodes(groundPositions: Cartesian3[]): void {
    const positions = this._positions;

    for (let i = 0; i < positions.length; i++) {
      const height = this._getNodeHeight(i);
      this._nodes.push({
        position: positions[i],
        groundPosition: groundPositions[i],
        height,
      });

      if (this._showDropLines) {
        const dropLine = this._createDropLine(positions[i], groundPositions[i]);
        this._dropLineEntities.push(dropLine);
        this._viewer.entities.add(dropLine);
      }
    }
  }

  private _getNodeHeight(index: number): number {
    if (typeof this._height === 'function') {
      return this._height(
        index,
        this._nodes.map((n) => n.groundPosition),
      );
    }
    return this._height;
  }

  private _calculateHeightPosition(
    groundPosition: Cartesian3,
    height: number,
  ): Cartesian3 {
    const cartographic = Cartographic.fromCartesian(groundPosition);

    if (this._heightMode === 'RELATIVE_TO_GROUND') {
      return Cartographic.toCartesian(
        new Cartographic(
          cartographic.longitude,
          cartographic.latitude,
          cartographic.height + height,
        ),
      );
    }
    return Cartographic.toCartesian(
      new Cartographic(cartographic.longitude, cartographic.latitude, height),
    );
  }

  private _getGroundPositionFromAir(airPosition: Cartesian3): Cartesian3 {
    const cartographic = Cartographic.fromCartesian(airPosition);

    if (this._heightMode === 'RELATIVE_TO_GROUND') {
      const nodeHeight = this._getNodeHeight(0);
      return Cartographic.toCartesian(
        new Cartographic(
          cartographic.longitude,
          cartographic.latitude,
          cartographic.height - nodeHeight,
        ),
      );
    }
    return Cartographic.toCartesian(
      new Cartographic(cartographic.longitude, cartographic.latitude, 0),
    );
  }

  override onDrag(controlPointEntity: Entity, newPosition: Cartesian3): void {
    const meta = this.getControlPointMeta(controlPointEntity);
    if (!meta) return;

    if (
      meta.controlType === ControlPointType.VERTEX &&
      meta.vertexIndex !== undefined
    ) {
      const index = meta.vertexIndex;

      const newGroundPos = this._getGroundPositionFromAir(newPosition);
      const height = this._nodes[index].height;
      const newHeightPos = this._calculateHeightPosition(newGroundPos, height);

      this._positions[index] = newHeightPos;
      this._nodes[index].position = newHeightPos;
      this._nodes[index].groundPosition = newGroundPos;

      this.updateControlPointPosition(controlPointEntity, newHeightPos);

      this._updateDropLine(index);
      this._refreshAdjacentMidPoints(index);

      this._viewer.scene.requestRender();
    } else if (
      meta.controlType === ControlPointType.MIDPOINT &&
      meta.vertexIndex !== undefined
    ) {
      const insertIndex = meta.vertexIndex + 1;

      const newGroundPos = newPosition;
      const newHeight = this._getNodeHeight(insertIndex);
      const newHeightPos = this._calculateHeightPosition(
        newGroundPos,
        newHeight,
      );

      this._positions.splice(insertIndex, 0, newHeightPos);
      this._nodes.splice(insertIndex, 0, {
        position: newHeightPos,
        groundPosition: newGroundPos,
        height: newHeight,
      });

      this.destroyControlPoints();
      this._dropLineEntities.forEach((e) => this._viewer.entities.remove(e));
      this._dropLineEntities = [];

      this._rebuildControlPointsAndDropLines();

      this._viewer.scene.requestRender();
    }
  }

  private _rebuildControlPointsAndDropLines(): void {
    for (let i = 0; i < this._positions.length; i++) {
      this.createControlPointEntity(
        this._positions[i],
        ControlPointType.VERTEX,
        this._vertexStyle,
        i,
      );
    }

    this._createMidPoints();

    if (this._showDropLines) {
      for (let i = 0; i < this._nodes.length; i++) {
        const dropLine = this._createDropLine(
          this._nodes[i].position,
          this._nodes[i].groundPosition,
        );
        this._dropLineEntities.push(dropLine);
        this._viewer.entities.add(dropLine);
      }
    }
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

  private _updateDropLine(index: number): void {
    const node = this._nodes[index];
    const dropLine = this._dropLineEntities[index];

    if (dropLine?.polyline) {
      dropLine.polyline.positions = new ConstantProperty([
        node.position,
        node.groundPosition,
      ]);
    }
  }

  setNodeHeight(index: number, newHeight: number): void {
    if (index < 0 || index >= this._nodes.length) return;

    const node = this._nodes[index];
    node.height = newHeight;

    const newHeightPos = this._calculateHeightPosition(
      node.groundPosition,
      newHeight,
    );

    node.position = newHeightPos;
    this._positions[index] = newHeightPos;

    const vertexEntity = this._controlPointEntities.find(
      (e) => this.getControlPointMeta(e)?.vertexIndex === index,
    );
    if (vertexEntity) {
      this.updateControlPointPosition(vertexEntity, newHeightPos);
    }

    this._updateDropLine(index);
    this._refreshAdjacentMidPoints(index);

    this._viewer.scene.requestRender();
  }

  override removeVertex(index: number): void {
    if (this._positions.length <= 2) {
      throw new Error('Cannot remove vertex: minimum 2 vertices required');
    }
    if (index < 0 || index >= this._positions.length) return;

    this._positions.splice(index, 1);
    this._nodes.splice(index, 1);

    if (this._showDropLines && this._dropLineEntities[index]) {
      this._viewer.entities.remove(this._dropLineEntities[index]);
      this._dropLineEntities.splice(index, 1);
    }

    this.destroyControlPoints();
    this._rebuildControlPointsAndDropLines();
  }

  override finalize(): void {
    if (this._entity.polyline) {
      this._entity.polyline.positions = new ConstantProperty([
        ...this._positions,
      ]);
    }

    for (let i = 0; i < this._dropLineEntities.length; i++) {
      const dropLine = this._dropLineEntities[i];
      if (dropLine.polyline) {
        dropLine.polyline.positions = new ConstantProperty([
          this._nodes[i].position,
          this._nodes[i].groundPosition,
        ]);
      }
    }
  }

  override getEditingParams(): UAVEditingParams {
    return {
      type: 'POLYLINE',
      positions: [...this._positions],
      nodes: [...this._nodes],
      heightMode: this._heightMode,
    };
  }

  get nodes(): UAVNode[] {
    return [...this._nodes];
  }

  get dropLineEntities(): Entity[] {
    return [...this._dropLineEntities];
  }

  clearDropLines(): void {
    for (const entity of this._dropLineEntities) {
      this._viewer.entities.remove(entity);
    }
    this._dropLineEntities = [];
  }
}
