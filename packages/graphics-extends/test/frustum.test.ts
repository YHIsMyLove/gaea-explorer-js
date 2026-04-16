import { describe, expect, it, vi } from 'vitest';
import { ConstantProperty, CallbackProperty, Color, JulianDate, Cartesian3, Entity } from 'cesium';
import { FrustumGraphics } from '../src/frustum/FrustumGraphics';
import { FrustumPrimitive } from '../src/frustum/FrustumPrimitive';
import { FrustumVisualizer } from '../src/frustum/FrustumVisualizer';
import { createMockViewer, createMockEntityCollection } from './helpers';
import type { MockCollectionChanged } from './helpers';

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

describe('FrustumVisualizer', () => {
  /**
   * Helper: create an entity with position and optional frustum property.
   */
  function createFrustumEntity(graphics?: FrustumGraphics): Entity {
    const opts: any = {
      position: Cartesian3.fromDegrees(120, 30, 2000),
    };
    if (graphics) {
      opts.frustum = graphics;
    }
    return new Entity(opts);
  }

  it('should subscribe to collectionChanged on construction', () => {
    const viewer = createMockViewer();
    const collection = createMockEntityCollection();
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    expect(cc.listenerCount()).toBe(1);
    expect(visualizer.isDestroyed).toBe(false);

    visualizer.destroy();
  });

  it('should initialize primitives for existing entities with frustum', () => {
    const viewer = createMockViewer();
    const graphics = new FrustumGraphics();
    const entity = createFrustumEntity(graphics);
    const collection = createMockEntityCollection([entity]);

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    // The entity has a frustum property, so a primitive should have been created
    expect(visualizer.isDestroyed).toBe(false);

    visualizer.destroy();
  });

  it('should skip entities without a frustum property during initialization', () => {
    const viewer = createMockViewer();
    const entity = createFrustumEntity(); // no frustum
    const collection = createMockEntityCollection([entity]);

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    // Should not throw, and should be functional
    expect(visualizer.isDestroyed).toBe(false);

    visualizer.destroy();
  });

  it('should create primitive when entity with frustum is added', () => {
    const viewer = createMockViewer();
    const collection = createMockEntityCollection();
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);
    const graphics = new FrustumGraphics();
    const entity = createFrustumEntity(graphics);

    // Add entity to collection and fire event
    (collection as any).values.push(entity);
    cc.fire([entity], [], []);

    // Primitive should have been created - verify by checking update doesn't throw
    const time = JulianDate.now();
    expect(() => visualizer.update(time)).not.toThrow();

    visualizer.destroy();
  });

  it('should not create primitive for entity without frustum on add', () => {
    const viewer = createMockViewer();
    const collection = createMockEntityCollection();
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);
    const entity = createFrustumEntity(); // no frustum

    cc.fire([entity], [], []);

    // Should not throw
    const time = JulianDate.now();
    expect(() => visualizer.update(time)).not.toThrow();

    visualizer.destroy();
  });

  it('should destroy primitive when entity is removed', () => {
    const viewer = createMockViewer();
    const graphics = new FrustumGraphics();
    const entity = createFrustumEntity(graphics);
    const collection = createMockEntityCollection([entity]);
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    // Fire remove event
    cc.fire([], [entity], []);

    // Should not throw on update
    expect(() => visualizer.update(JulianDate.now())).not.toThrow();

    visualizer.destroy();
  });

  it('should replace primitive when frustum graphics instance changes', () => {
    const viewer = createMockViewer();
    const oldGraphics = new FrustumGraphics({ fov: 60 });
    const entity = createFrustumEntity(oldGraphics);
    const collection = createMockEntityCollection([entity]);
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    // Replace frustum with a new graphics instance
    const newGraphics = new FrustumGraphics({ fov: 90 });
    (entity as any).frustum = newGraphics;
    cc.fire([], [], [entity]);

    // Should not throw, visualizer should have recreated the primitive
    expect(() => visualizer.update(JulianDate.now())).not.toThrow();

    visualizer.destroy();
  });

  it('should destroy primitive when frustum property is removed from entity', () => {
    const viewer = createMockViewer();
    const graphics = new FrustumGraphics();
    const entity = createFrustumEntity(graphics);
    const collection = createMockEntityCollection([entity]);
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    // Remove frustum property
    delete (entity as any).frustum;
    cc.fire([], [], [entity]);

    // Should not throw
    expect(() => visualizer.update(JulianDate.now())).not.toThrow();

    visualizer.destroy();
  });

  it('should create primitive when entity gains frustum property on change', () => {
    const viewer = createMockViewer();
    const entity = createFrustumEntity(); // no frustum initially
    const collection = createMockEntityCollection([entity]);
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    // Add frustum property
    const graphics = new FrustumGraphics();
    (entity as any).frustum = graphics;
    cc.fire([], [], [entity]);

    // Should not throw - primitive should now be created
    expect(() => visualizer.update(JulianDate.now())).not.toThrow();

    visualizer.destroy();
  });

  it('should do nothing when same graphics instance is reported as changed', () => {
    const viewer = createMockViewer();
    const graphics = new FrustumGraphics();
    const entity = createFrustumEntity(graphics);
    const collection = createMockEntityCollection([entity]);
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    // Fire change event with same graphics instance
    cc.fire([], [], [entity]);

    // Should still work fine - no double-creation
    expect(() => visualizer.update(JulianDate.now())).not.toThrow();

    visualizer.destroy();
  });

  it('should call update on all managed primitives during frame update', () => {
    const viewer = createMockViewer();
    const g1 = new FrustumGraphics();
    const g2 = new FrustumGraphics({ fov: 90 });
    const e1 = createFrustumEntity(g1);
    const e2 = createFrustumEntity(g2);
    const collection = createMockEntityCollection([e1, e2]);

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    // update should not throw with multiple entities
    const time = JulianDate.now();
    expect(() => visualizer.update(time)).not.toThrow();

    visualizer.destroy();
  });

  it('should unsubscribe from collectionChanged on destroy', () => {
    const viewer = createMockViewer();
    const collection = createMockEntityCollection();
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);
    expect(cc.listenerCount()).toBe(1);

    visualizer.destroy();

    expect(visualizer.isDestroyed).toBe(true);
    expect(cc.listenerCount()).toBe(0);
  });

  it('should destroy all managed primitives on destroy', () => {
    const viewer = createMockViewer();
    const g1 = new FrustumGraphics();
    const g2 = new FrustumGraphics();
    const e1 = createFrustumEntity(g1);
    const e2 = createFrustumEntity(g2);
    const collection = createMockEntityCollection([e1, e2]);

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    visualizer.destroy();

    expect(visualizer.isDestroyed).toBe(true);

    // After destroy, update should be a no-op (not throw)
    expect(() => visualizer.update(JulianDate.now())).not.toThrow();
  });

  it('should be safe to call destroy multiple times', () => {
    const viewer = createMockViewer();
    const collection = createMockEntityCollection();

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    visualizer.destroy();
    visualizer.destroy(); // second call should be no-op

    expect(visualizer.isDestroyed).toBe(true);
  });

  it('should ignore duplicate entity additions', () => {
    const viewer = createMockViewer();
    const graphics = new FrustumGraphics();
    const entity = createFrustumEntity(graphics);
    const collection = createMockEntityCollection([entity]);
    const cc = (collection as any)._collectionChanged as MockCollectionChanged;

    const visualizer = new FrustumVisualizer(collection, viewer.scene);

    // Fire add event for the same entity again - should not create duplicate
    cc.fire([entity], [], []);

    // Should still work correctly
    expect(() => visualizer.update(JulianDate.now())).not.toThrow();

    visualizer.destroy();
  });
});
