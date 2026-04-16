import { Cartesian2, Cartesian3, Entity, JulianDate } from 'cesium';
import type { PointGraphics, Viewer } from 'cesium';
import Subscriber from '@gaea-explorer/subscriber';
import { pickCartesian3 } from '../utils';
import { detectEditableType } from './detect';
import { ControlPointType } from './typings';
import type {
  EditCallbacks,
  EditorOptions,
  EditableType,
  EditingParams,
} from './typings';
import {
  EDITOR_CONTROL_KEY,
  defaultVertexStyle,
  defaultMidPointStyle,
  defaultRadiusStyle,
  EditableShape,
} from './editable/base';
import { EditablePoint } from './editable/point';
import { EditablePolyline } from './editable/polyline';
import { EditablePolygon, convertRectangleToPolygon } from './editable/polygon';
import { EditableCircle } from './editable/circle';

type EditorStatus = 'INIT' | 'EDITING' | 'DESTROY';

export class Editor {
  private _viewer: Viewer;
  private _subscriber: Subscriber;
  private _status: EditorStatus = 'INIT';
  private _editableShape: EditableShape | null = null;
  private _activeEntity: Entity | undefined;
  private _callbacks: EditCallbacks | undefined;
  private _events: string[] = [];

  private _vertexStyle: PointGraphics.ConstructorOptions;
  private _midPointStyle: PointGraphics.ConstructorOptions;
  private _radiusStyle: PointGraphics.ConstructorOptions;
  private _terrain: boolean;
  private _model: boolean;

  private _isDragging = false;
  private _draggingControlPoint: Entity | null = null;

  get isEditing(): boolean {
    return this._status === 'EDITING';
  }

  get activeEntity(): Entity | undefined {
    return this._status === 'EDITING' ? this._activeEntity : undefined;
  }

  get isDestroyed(): boolean {
    return this._status === 'DESTROY';
  }

  constructor(viewer: Viewer, options?: EditorOptions) {
    this._viewer = viewer;
    this._vertexStyle = options?.vertexStyle ?? defaultVertexStyle;
    this._midPointStyle = options?.midPointStyle ?? defaultMidPointStyle;
    this._radiusStyle = options?.radiusStyle ?? defaultRadiusStyle;
    this._terrain = options?.terrain ?? false;
    this._model = options?.model ?? false;
    this._subscriber = new Subscriber(viewer, {
      pickResult: { enable: true },
    });
  }

  startEdit(entity: Entity, callbacks?: EditCallbacks): void {
    if (this._status === 'DESTROY') return;

    // 忽略重复编辑同一 entity
    if (this._activeEntity === entity && this._status === 'EDITING') return;

    // 检查 entity 是否仍在 viewer 中
    if (!this._viewer.entities.contains(entity)) return;

    // 自动结束当前编辑
    if (this._status === 'EDITING') {
      this.stopEdit();
    }

    // 检测类型
    let type = detectEditableType(entity);

    // Rectangle 转换为 Polygon
    if (type === 'RECTANGLE') {
      entity = convertRectangleToPolygon(entity, this._viewer);
      type = 'POLYGON';
    }

    if (!type) {
      console.warn('Cannot edit entity: unknown type');
      return;
    }

    // 创建策略
    this._editableShape = this._createEditableShape(type, entity);
    this._activeEntity = entity;
    this._callbacks = callbacks;

    // 创建控制点
    this._editableShape.createControlPoints();

    // 注册事件
    this._registerEvents();

    this._status = 'EDITING';

    // 触发回调
    if (this._callbacks?.onEditStart) {
      this._callbacks.onEditStart(entity);
    }

    this._viewer.scene.requestRender();
  }

  stopEdit(): void {
    if (this._status !== 'EDITING') return;

    this._isDragging = false;
    this._draggingControlPoint = null;
    this._viewer.scene.screenSpaceCameraController.enableInputs = true;

    // 触发 finalize（转回静态值）
    this._editableShape?.finalize();

    // 触发回调
    const entity = this._activeEntity;
    if (this._callbacks?.onEditEnd && entity) {
      this._callbacks.onEditEnd(entity);
    }

    // 清理控制点
    this._editableShape?.destroyControlPoints();

    // 移除事件
    this._subscriber.removeExternal(this._events);
    this._events = [];

    this._editableShape = null;
    this._activeEntity = undefined;
    this._callbacks = undefined;
    this._status = 'INIT';

    this._viewer.scene.requestRender();
  }

  destroy(): void {
    this.stopEdit();
    this._subscriber.destroy();
    this._status = 'DESTROY';
  }

  setPosition(position: Cartesian3): void {
    if (!this._editableShape) return;
    if (this._editableShape instanceof EditablePoint) {
      this._editableShape.onDrag(
        this._editableShape.controlPoints[0],
        position,
      );
    } else if (this._editableShape instanceof EditableCircle) {
      this._editableShape.setPosition(position);
    }
    this._fireOnEditing();
  }

  moveVertex(index: number, position: Cartesian3): void {
    if (!this._editableShape) return;
    if (
      this._editableShape instanceof EditablePolyline ||
      this._editableShape instanceof EditablePolygon
    ) {
      this._editableShape.moveVertex(index, position);
    }
    this._fireOnEditing();
  }

  addVertex(index: number, position: Cartesian3): void {
    if (!this._editableShape) return;
    if (
      this._editableShape instanceof EditablePolyline ||
      this._editableShape instanceof EditablePolygon
    ) {
      this._editableShape.addVertex(index, position);
    }
    this._fireOnEditing();
  }

  removeVertex(index: number): void {
    if (!this._editableShape) return;
    if (
      this._editableShape instanceof EditablePolyline ||
      this._editableShape instanceof EditablePolygon
    ) {
      this._editableShape.removeVertex(index);
    }
    this._fireOnEditing();
  }

  setRadius(radius: number): void {
    if (!this._editableShape) return;
    if (this._editableShape instanceof EditableCircle) {
      this._editableShape.setRadius(radius);
    }
    this._fireOnEditing();
  }

  private _createEditableShape(
    type: EditableType,
    entity: Entity,
  ): EditableShape {
    const config = {
      viewer: this._viewer,
      entity,
      vertexStyle: this._vertexStyle,
      midPointStyle: this._midPointStyle,
      radiusStyle: this._radiusStyle,
    };

    switch (type) {
      case 'POINT':
        return new EditablePoint(config);
      case 'POLYLINE':
        return new EditablePolyline(config);
      case 'POLYGON':
        return new EditablePolygon(config);
      case 'CIRCLE':
        return new EditableCircle(config);
      default:
        throw new Error(`Unsupported edit type: ${type}`);
    }
  }

  private _registerEvents(): void {
    const leftDownId = this._subscriber.addExternal((_movement, result) => {
      if (this._status !== 'EDITING') return;

      const pickedEntity = result?.id as Entity | undefined;
      if (
        pickedEntity &&
        pickedEntity.properties?.[EDITOR_CONTROL_KEY]?.getValue?.(
          JulianDate.now(),
        )?.editableEntityId === this._activeEntity?.id
      ) {
        this._isDragging = true;
        this._draggingControlPoint = pickedEntity;
        this._viewer.scene.screenSpaceCameraController.enableInputs = false;
        this._viewer.canvas.style.cursor = 'grabbing';
      }
    }, 'LEFT_DOWN');

    const moveId = this._subscriber.addExternal((movement) => {
      if (!this._isDragging || !this._draggingControlPoint) return;
      if (!movement.endPosition) return;

      const earthPosition = this._pickPosition(movement.endPosition);
      if (!earthPosition) return;

      this._editableShape?.onDrag(this._draggingControlPoint, earthPosition);
      this._fireOnEditing();
    }, 'MOUSE_MOVE');

    const leftUpId = this._subscriber.addExternal(() => {
      this._isDragging = false;
      this._draggingControlPoint = null;
      this._viewer.scene.screenSpaceCameraController.enableInputs = true;
      if (this._status === 'EDITING') {
        this._viewer.canvas.style.cursor = 'default';
      }
    }, 'LEFT_UP');

    const leftClickId = this._subscriber.addExternal((_movement, result) => {
      if (this._status !== 'EDITING') return;
      if (this._isDragging) return;

      const pickedEntity = result?.id as Entity | undefined;

      // 点击控制点 → 中点新增逻辑（如果不是拖动，是点击 MIDPOINT）
      const meta = pickedEntity?.properties?.[EDITOR_CONTROL_KEY]?.getValue?.(
        JulianDate.now(),
      );
      if (meta?.controlType === ControlPointType.MIDPOINT) {
        if (!_movement.position) return;
        const pos = this._pickPosition(_movement.position);
        if (pos) {
          this.addVertex(meta.vertexIndex + 1, pos);
        }
        return;
      }

      // 点击空白区域或其他 entity → 结束编辑
      if (!pickedEntity || pickedEntity !== this._activeEntity) {
        this.stopEdit();
      }
    }, 'LEFT_CLICK');

    this._events = [leftDownId, moveId, leftUpId, leftClickId];
  }

  private _pickPosition(screenPos: Cartesian2): Cartesian3 | undefined {
    return pickCartesian3(this._viewer, screenPos, this._terrain, this._model);
  }

  private _fireOnEditing(): void {
    if (this._callbacks?.onEditing && this._editableShape) {
      this._callbacks.onEditing(this._editableShape.getEditingParams());
    }
  }
}
