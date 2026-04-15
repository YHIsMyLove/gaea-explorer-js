import { describe, expect, it } from 'vitest';
import { CallbackProperty, Cartesian3, Entity } from 'cesium';
import { ControlPointType } from '../src/editor/typings';
import { EditableCircle } from '../src/editor/editable/circle';
import { createMockViewer } from './helpers';

function getControlMeta(cp: Entity) {
  const raw = cp.properties?.__editorControl;
  if (!raw) return undefined;
  if (typeof raw.getValue === 'function') return raw.getValue({});
  return raw;
}

describe('EditableCircle', () => {
  const viewer = createMockViewer();
  const center = new Cartesian3(0, 0, 0);

  function createCircleEntity(radius = 100): Entity {
    return new Entity({
      position: center,
      ellipse: {
        semiMinorAxis: radius,
        semiMajorAxis: radius,
      },
    });
  }

  it('should create center + radius control points', () => {
    const entity = createCircleEntity();
    const editable = new EditableCircle({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    const cps = editable.createControlPoints();
    expect(cps).toHaveLength(2);

    const types = cps.map((cp) => getControlMeta(cp)?.controlType);
    expect(types).toContain(ControlPointType.CENTER);
    expect(types).toContain(ControlPointType.RADIUS);
  });

  it('should update center position on drag', () => {
    const entity = createCircleEntity();
    const editable = new EditableCircle({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    const centerCp = editable.controlPoints.find(
      (cp) => getControlMeta(cp)?.controlType === ControlPointType.CENTER,
    );

    const newCenter = new Cartesian3(10, 20, 30);
    expect(centerCp).toBeDefined();
    editable.onDrag(centerCp as Entity, newCenter);

    const params = editable.getEditingParams();
    expect(params.type).toBe('CIRCLE');
    if (params.type === 'CIRCLE') {
      expect(params.center).toEqual(newCenter);
    }
  });

  it('should update radius on drag', () => {
    const entity = createCircleEntity(100);
    const editable = new EditableCircle({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    const radiusCp = editable.controlPoints.find(
      (cp) => getControlMeta(cp)?.controlType === ControlPointType.RADIUS,
    );

    // 拖动半径点到距中心 200 处
    const newRadiusPos = new Cartesian3(200, 0, 0);
    expect(radiusCp).toBeDefined();
    editable.onDrag(radiusCp as Entity, newRadiusPos);

    const params = editable.getEditingParams();
    if (params.type === 'CIRCLE') {
      expect(params.radius).toBeCloseTo(200, 0);
    }
  });

  it('should set radius via setRadius', () => {
    const entity = createCircleEntity(100);
    const editable = new EditableCircle({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    editable.setRadius(500);
    const params = editable.getEditingParams();
    if (params.type === 'CIRCLE') {
      expect(params.radius).toBe(500);
    }
  });

  it('should set center via setPosition', () => {
    const entity = createCircleEntity(100);
    const editable = new EditableCircle({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    const newCenter = new Cartesian3(50, 50, 50);
    editable.setPosition(newCenter);
    const params = editable.getEditingParams();
    if (params.type === 'CIRCLE') {
      expect(params.center).toEqual(newCenter);
    }
  });

  it('should convert to static values on finalize', () => {
    const entity = createCircleEntity(100);
    const editable = new EditableCircle({
      viewer,
      entity,
      vertexStyle: { pixelSize: 10 },
      midPointStyle: { pixelSize: 6 },
      radiusStyle: { pixelSize: 8 },
    });
    editable.createControlPoints();

    editable.finalize();

    const semiMinor = entity.ellipse?.semiMinorAxis;
    const semiMajor = entity.ellipse?.semiMajorAxis;
    expect(semiMinor).not.toBeInstanceOf(CallbackProperty);
    expect(semiMajor).not.toBeInstanceOf(CallbackProperty);
  });
});
