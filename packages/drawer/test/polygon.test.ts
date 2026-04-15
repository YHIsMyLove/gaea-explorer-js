import { describe, expect, it } from 'vitest';
import { CallbackProperty, Cartesian3, Entity, PolygonHierarchy } from 'cesium';
import { ControlPointType } from '../src/editor/typings';
import { EditablePolygon } from '../src/editor/editable/polygon';
import { convertRectangleToPolygon } from '../src/editor/editable/polygon';
import { createMockViewer } from './helpers';

function getControlMeta(cp: Entity) {
  const raw = cp.properties?.__editorControl;
  if (!raw) return undefined;
  if (typeof raw.getValue === 'function') return raw.getValue({});
  return raw;
}

describe('EditablePolygon', () => {
  const viewer = createMockViewer();
  const positions = [
    new Cartesian3(0, 0, 0),
    new Cartesian3(1, 0, 0),
    new Cartesian3(1, 1, 0),
    new Cartesian3(0, 1, 0),
  ];

  function createPolygonEntity(): Entity {
    return new Entity({
      polygon: {
        hierarchy: new PolygonHierarchy(positions),
      },
      polyline: {
        positions: [...positions, positions[0]],
      },
    });
  }

  it('should create 4 vertex + 4 midpoint control points (closed polygon)', () => {
    const entity = createPolygonEntity();
    const editable = new EditablePolygon({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    const cps = editable.createControlPoints();
    expect(cps).toHaveLength(8); // 4 vertex + 4 midpoint (closed)
  });

  it('should update vertex and sync polyline on drag', () => {
    const entity = createPolygonEntity();
    const editable = new EditablePolygon({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    const vertex0 = editable.controlPoints.find((cp) => {
      const meta = getControlMeta(cp);
      return (
        meta?.controlType === ControlPointType.VERTEX && meta?.vertexIndex === 0
      );
    });

    const newPos = new Cartesian3(10, 0, 0);
    expect(vertex0).toBeDefined();
    editable.onDrag(vertex0 as Entity, newPos);

    const params = editable.getEditingParams();
    expect(params.type).toBe('POLYGON');
    if (params.type === 'POLYGON') {
      expect(params.positions[0]).toEqual(newPos);
    }
  });

  it('should refuse removeVertex when only 3 vertices remain', () => {
    const entity = new Entity({
      polygon: {
        hierarchy: new PolygonHierarchy([
          new Cartesian3(0, 0, 0),
          new Cartesian3(1, 0, 0),
          new Cartesian3(0, 1, 0),
        ]),
      },
    });
    const editable = new EditablePolygon({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    expect(() => editable.removeVertex(0)).toThrow();
  });
});

describe('convertRectangleToPolygon', () => {
  it('should convert rectangle entity to polygon entity', () => {
    const viewer = createMockViewer();
    const rectEntity = new Entity({
      rectangle: {
        coordinates: {
          getValue: () => ({
            west: 0,
            east: 1,
            north: 1,
            south: 0,
          }),
        },
      } as any,
    });

    const result = convertRectangleToPolygon(rectEntity, viewer);

    expect(result.polygon).toBeDefined();
    expect(result.rectangle).toBeUndefined();
  });
});
