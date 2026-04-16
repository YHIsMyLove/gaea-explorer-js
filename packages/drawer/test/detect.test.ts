import { describe, expect, it } from 'vitest';
import { Cartesian3, Entity, PolygonHierarchy } from 'cesium';
import { detectEditableType } from '../src/editor/detect';

describe('detectEditableType', () => {
  it('should detect POINT type', () => {
    const entity = new Entity({ point: { pixelSize: 10 } });
    expect(detectEditableType(entity)).toBe('POINT');
  });

  it('should detect RECTANGLE type', () => {
    const entity = new Entity({ rectangle: {} });
    expect(detectEditableType(entity)).toBe('RECTANGLE');
  });

  it('should detect CIRCLE type', () => {
    const entity = new Entity({
      position: new Cartesian3(0, 0, 0),
      ellipse: { semiMinorAxis: 100, semiMajorAxis: 100 },
    });
    expect(detectEditableType(entity)).toBe('CIRCLE');
  });

  it('should detect POLYGON type', () => {
    const entity = new Entity({
      polygon: { hierarchy: new PolygonHierarchy() },
    });
    expect(detectEditableType(entity)).toBe('POLYGON');
  });

  it('should detect POLYLINE type', () => {
    const entity = new Entity({ polyline: { positions: [] } });
    expect(detectEditableType(entity)).toBe('POLYLINE');
  });

  it('should return null for unknown entity', () => {
    const entity = new Entity({});
    expect(detectEditableType(entity)).toBeNull();
  });

  it('should detect POLYGON over POLYLINE when both exist', () => {
    const entity = new Entity({
      polygon: { hierarchy: new PolygonHierarchy() },
      polyline: { positions: [] },
    });
    expect(detectEditableType(entity)).toBe('POLYGON');
  });
});
