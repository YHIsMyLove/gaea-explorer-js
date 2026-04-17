import type { Entity, EntityCollection, Scene } from 'cesium';
import { JulianDate } from 'cesium';

import { FrustumGraphics } from './FrustumGraphics';
import { FrustumPrimitive } from './FrustumPrimitive';

/**
 * FrustumVisualizer monitors an EntityCollection and auto-manages
 * FrustumPrimitive instances for entities that have a `frustum` property.
 *
 * Follows Cesium's native Visualizer pattern (as used by DataSourceDisplay).
 */
export class FrustumVisualizer {
  private readonly _entityCollection: EntityCollection;
  private readonly _scene: Scene;
  private readonly _primitives: Map<Entity, FrustumPrimitive>;
  private readonly _onCollectionChanged: (
    collection: EntityCollection,
    added: Entity[],
    removed: Entity[],
    changed: Entity[],
  ) => void;
  private _isDestroyed: boolean = false;

  constructor(entityCollection: EntityCollection, scene: Scene) {
    this._entityCollection = entityCollection;
    this._scene = scene;
    this._primitives = new Map();

    this._onCollectionChanged = (
      _collection: EntityCollection,
      added: Entity[],
      removed: Entity[],
      changed: Entity[],
    ) => {
      for (const entity of added) {
        this._onEntityAdded(entity);
      }
      for (const entity of removed) {
        this._onEntityRemoved(entity);
      }
      for (const entity of changed) {
        this._onEntityChanged(entity);
      }
    };

    this._entityCollection.collectionChanged.addEventListener(
      this._onCollectionChanged,
    );

    for (const entity of this._entityCollection.values) {
      this._onEntityAdded(entity);
    }
  }

  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  update(time: JulianDate): void {
    if (this._isDestroyed) return;

    for (const primitive of this._primitives.values()) {
      primitive.update(time);
    }
  }

  destroy(): void {
    if (this._isDestroyed) return;

    this._entityCollection.collectionChanged.removeEventListener(
      this._onCollectionChanged,
    );

    for (const primitive of this._primitives.values()) {
      primitive.destroy();
    }
    this._primitives.clear();

    this._isDestroyed = true;
  }

  private _onEntityAdded(entity: Entity): void {
    if (this._primitives.has(entity)) return;

    const graphics = entity.frustum;
    if (graphics instanceof FrustumGraphics) {
      const primitive = new FrustumPrimitive({
        entity,
        graphics,
        scene: this._scene,
      });
      this._primitives.set(entity, primitive);
    }
  }

  private _onEntityRemoved(entity: Entity): void {
    const primitive = this._primitives.get(entity);
    if (primitive) {
      primitive.destroy();
      this._primitives.delete(entity);
    }
  }

  private _onEntityChanged(entity: Entity): void {
    const existing = this._primitives.get(entity);
    const currentGraphics = entity.frustum;

    if (existing) {
      if (currentGraphics instanceof FrustumGraphics) {
        if (currentGraphics !== existing.graphics) {
          existing.destroy();
          const primitive = new FrustumPrimitive({
            entity,
            graphics: currentGraphics,
            scene: this._scene,
          });
          this._primitives.set(entity, primitive);
        }
      } else {
        existing.destroy();
        this._primitives.delete(entity);
      }
    } else {
      if (currentGraphics instanceof FrustumGraphics) {
        const primitive = new FrustumPrimitive({
          entity,
          graphics: currentGraphics,
          scene: this._scene,
        });
        this._primitives.set(entity, primitive);
      }
    }
  }
}
