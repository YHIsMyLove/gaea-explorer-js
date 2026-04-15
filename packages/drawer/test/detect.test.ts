import { describe, expect, it } from 'vitest';
import { Entity } from 'cesium';
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
      position: { x: 0, y: 0, z: 0 },
      ellipse: { semiMinorAxis: 100, semiMajorAxis: 100 },
    });
    expect(detectEditableType(entity)).toBe('CIRCLE');
  });

  it('should detect POLYGON type', () => {
    const entity = new Entity({ polygon: { hierarchy: {} } });
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
      polygon: { hierarchy: {} },
      polyline: { positions: [] },
    });
    expect(detectEditableType(entity)).toBe('POLYGON');
  });
});
