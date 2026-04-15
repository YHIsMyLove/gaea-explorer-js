import { describe, expect, it } from 'vitest';
import { Cartesian3, Entity } from 'cesium';
import { ControlPointType } from '../src/editor/typings';
import { EditablePoint } from '../src/editor/editable/point';
import { createMockViewer } from './helpers';

describe('EditablePoint', () => {
  const viewer = createMockViewer();
  const position = new Cartesian3(1, 2, 3);
  const entity = new Entity({
    position,
    point: { pixelSize: 10 },
  });

  const editable = new EditablePoint({
    viewer,
    entity,
    vertexStyle: { pixelSize: 10 },
    midPointStyle: { pixelSize: 6 },
    radiusStyle: { pixelSize: 8 },
  });

  it('should create 1 vertex control point', () => {
    const cps = editable.createControlPoints();
    expect(cps).toHaveLength(1);
    const meta =
      cps[0].properties?.__editorControl?.getValue?.() ??
      cps[0].properties?.__editorControl;
    expect(meta.controlType).toBe(ControlPointType.VERTEX);
  });

  it('should update entity position on drag', () => {
    const cp = editable.controlPoints[0];
    const newPos = new Cartesian3(10, 20, 30);
    editable.onDrag(cp, newPos);

    const updatedPos =
      editable.entity.position?.getValue?.({}) ?? editable.entity.position;
    expect(updatedPos).toEqual(newPos);
  });

  it('should return POINT editing params', () => {
    const params = editable.getEditingParams();
    expect(params.type).toBe('POINT');
    if (params.type === 'POINT') {
      expect(params.position).toBeInstanceOf(Cartesian3);
    }
  });

  it('should destroy control points', () => {
    editable.destroyControlPoints();
    expect(editable.controlPoints).toHaveLength(0);
  });

  it('finalize should not throw', () => {
    expect(() => editable.finalize()).not.toThrow();
  });
});
