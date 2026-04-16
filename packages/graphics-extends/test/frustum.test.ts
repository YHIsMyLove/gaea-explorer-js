import { describe, expect, it } from 'vitest';
import { ConstantProperty, CallbackProperty, Color, JulianDate, Cartesian3, Entity } from 'cesium';
import { FrustumGraphics } from '../src/frustum/FrustumGraphics';
import { FrustumPrimitive } from '../src/frustum/FrustumPrimitive';
import { createMockViewer } from './helpers';

describe('FrustumGraphics', () => {
  it('should create with default values', () => {
    const graphics = new FrustumGraphics();

    expect(graphics.show).toBeInstanceOf(ConstantProperty);
    expect(graphics.show.getValue(JulianDate.now())).toBe(true);

    expect(graphics.fov).toBeInstanceOf(ConstantProperty);
    expect(graphics.fov.getValue(JulianDate.now())).toBe(60);

    expect(graphics.near).toBeInstanceOf(ConstantProperty);
    expect(graphics.near.getValue(JulianDate.now())).toBe(1);

    expect(graphics.far).toBeInstanceOf(ConstantProperty);
    expect(graphics.far.getValue(JulianDate.now())).toBe(1000);

    expect(graphics.aspectRatio).toBeInstanceOf(ConstantProperty);
    expect(graphics.aspectRatio.getValue(JulianDate.now())).toBe(1.0);
  });

  it('should accept custom values and wrap as ConstantProperty', () => {
    const graphics = new FrustumGraphics({
      fov: 90,
      far: 5000,
      fillColor: Color.BLUE,
    });

    expect(graphics.fov.getValue(JulianDate.now())).toBe(90);
    expect(graphics.far.getValue(JulianDate.now())).toBe(5000);
    expect(graphics.fillColor.getValue(JulianDate.now())).toEqual(Color.BLUE);
  });

  it('should accept Property instances directly', () => {
    const dynamicFov = new CallbackProperty(() => 45, false);
    const graphics = new FrustumGraphics({
      fov: dynamicFov,
    });

    expect(graphics.fov).toBe(dynamicFov);
    expect(graphics.fov.getValue(JulianDate.now())).toBe(45);
  });

  it('should support property assignment via setter', () => {
    const graphics = new FrustumGraphics();

    graphics.fov = 120;
    expect(graphics.fov.getValue(JulianDate.now())).toBe(120);

    const dynamicFar = new CallbackProperty(() => 2000, false);
    graphics.far = dynamicFar;
    expect(graphics.far).toBe(dynamicFar);
  });

  it('should handle fill and outline options', () => {
    const graphics = new FrustumGraphics({
      fill: true,
      fillColor: Color.RED,
      fillOpacity: 0.5,
      outline: true,
      outlineColor: Color.WHITE,
    });

    expect(graphics.fill.getValue(JulianDate.now())).toBe(true);
    expect(graphics.fillOpacity.getValue(JulianDate.now())).toBe(0.5);
    expect(graphics.outline.getValue(JulianDate.now())).toBe(true);
  });
});

describe('FrustumPrimitive', () => {
  it('should create primitive with entity and graphics', () => {
    const viewer = createMockViewer();
    const entity = new Entity({
      position: Cartesian3.fromDegrees(120, 30, 2000),
    });
    const graphics = new FrustumGraphics({
      fov: 60,
      far: 1000,
    });

    const primitive = new FrustumPrimitive({
      entity,
      graphics,
      scene: viewer.scene,
    });

    expect(primitive.entity).toBe(entity);
    expect(primitive.graphics).toBe(graphics);
    expect(primitive.isDestroyed).toBe(false);
  });

  it('should update primitive on time change', () => {
    const viewer = createMockViewer();
    const entity = new Entity({
      position: Cartesian3.fromDegrees(120, 30, 2000),
    });
    const graphics = new FrustumGraphics();

    const primitive = new FrustumPrimitive({
      entity,
      graphics,
      scene: viewer.scene,
    });

    primitive.update(JulianDate.now());
    expect(primitive.primitiveCollection.show).toBe(true);
  });

  it('should destroy primitive and remove from scene', () => {
    const viewer = createMockViewer();
    const entity = new Entity({
      position: Cartesian3.fromDegrees(120, 30, 2000),
    });
    const graphics = new FrustumGraphics();

    const primitive = new FrustumPrimitive({
      entity,
      graphics,
      scene: viewer.scene,
    });

    primitive.destroy();
    expect(primitive.isDestroyed).toBe(true);
  });
});
