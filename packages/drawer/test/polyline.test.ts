import { describe, expect, it } from 'vitest';
import { CallbackProperty, Cartesian3, Entity } from 'cesium';
import { ControlPointType } from '../src/editor/typings';
import type { ControlPointMeta } from '../src/editor/typings';
import { EditablePolyline } from '../src/editor/editable/polyline';
import { createMockViewer } from './helpers';

function getControlMeta(cp: Entity): ControlPointMeta | undefined {
  const raw = cp.properties?.__editorControl;
  if (!raw) return undefined;
  if (typeof raw.getValue === 'function') return raw.getValue({});
  return raw;
}

describe('EditablePolyline', () => {
  const viewer = createMockViewer();
  const positions = [
    new Cartesian3(0, 0, 0),
    new Cartesian3(1, 0, 0),
    new Cartesian3(2, 0, 0),
  ];

  function createPolylineEntity(): Entity {
    return new Entity({
      polyline: {
        positions: [...positions],
      },
    });
  }

  it('should create 3 vertex + 2 midpoint control points', () => {
    const entity = createPolylineEntity();
    const editable = new EditablePolyline({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    const cps = editable.createControlPoints();
    expect(cps).toHaveLength(5); // 3 vertex + 2 midpoint
  });

  it('should update vertex position on drag', () => {
    const entity = createPolylineEntity();
    const editable = new EditablePolyline({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    // 找到第一个 vertex 控制点
    const vertex0 = editable.controlPoints.find((cp) => {
      const meta = getControlMeta(cp);
      return (
        meta?.controlType === ControlPointType.VERTEX && meta?.vertexIndex === 0
      );
    });
    expect(vertex0).toBeDefined();

    const newPos = new Cartesian3(10, 0, 0);
    expect(vertex0).toBeDefined();
    editable.onDrag(vertex0 as Entity, newPos);

    const params = editable.getEditingParams();
    expect(params.type).toBe('POLYLINE');
    if (params.type === 'POLYLINE') {
      expect(params.positions[0]).toEqual(newPos);
    }
  });

  it('should add vertex via addVertex', () => {
    const entity = createPolylineEntity();
    const editable = new EditablePolyline({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    // 在 index 1 处插入新顶点
    const newPos = new Cartesian3(1.5, 0, 0);
    editable.addVertex(1, newPos);

    const params = editable.getEditingParams();
    if (params.type === 'POLYLINE') {
      expect(params.positions).toHaveLength(4);
      expect(params.positions[1]).toEqual(newPos);
    }
  });

  it('should remove vertex via removeVertex', () => {
    const entity = createPolylineEntity();
    const editable = new EditablePolyline({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    editable.removeVertex(1);

    const params = editable.getEditingParams();
    if (params.type === 'POLYLINE') {
      expect(params.positions).toHaveLength(2);
    }
  });

  it('should refuse removeVertex when only 2 vertices remain', () => {
    const entity = new Entity({
      polyline: {
        positions: [new Cartesian3(0, 0, 0), new Cartesian3(1, 0, 0)],
      },
    });
    const editable = new EditablePolyline({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    expect(() => editable.removeVertex(0)).toThrow();
  });

  it('should convert CallbackProperty to static values on finalize', () => {
    const entity = createPolylineEntity();
    const editable = new EditablePolyline({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    editable.finalize();

    const finalPositions = entity.polyline?.positions;
    // finalize 后不应再是 CallbackProperty
    expect(finalPositions).not.toBeInstanceOf(CallbackProperty);
  });
});
