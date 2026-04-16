import { describe, expect, it } from 'vitest';
import { ConstantProperty, CallbackProperty, Color, JulianDate } from 'cesium';
import { FrustumGraphics } from '../src/frustum/FrustumGraphics';

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
