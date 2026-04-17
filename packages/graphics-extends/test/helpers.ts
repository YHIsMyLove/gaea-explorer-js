import { Entity } from 'cesium';
import type { Viewer, Scene, EntityCollection } from 'cesium';

/**
 * Create a mock collectionChanged event object that stores callbacks
 * and provides a fireCollectionChanged method for triggering events.
 */
function createMockCollectionChanged() {
  const listeners: Array<(...args: any[]) => void> = [];

  return {
    addEventListener: (callback: (...args: any[]) => void) => {
      listeners.push(callback);
    },
    removeEventListener: (callback: (...args: any[]) => void) => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    },
    /** Fire all registered listeners with the given arguments */
    fire: (...args: any[]) => {
      for (const listener of listeners) {
        listener(...args);
      }
    },
    /** Get the number of registered listeners (useful for test assertions) */
    listenerCount: () => listeners.length,
  };
}

export type MockCollectionChanged = ReturnType<
  typeof createMockCollectionChanged
>;

/**
 * Create a standalone mock EntityCollection with event support.
 * Useful for FrustumVisualizer tests where we need collectionChanged events.
 */
export function createMockEntityCollection(
  initialEntities: Entity[] = [],
): EntityCollection & { _collectionChanged: MockCollectionChanged } {
  const entities: Entity[] = [...initialEntities];
  const _collectionChanged = createMockCollectionChanged();

  return {
    values: entities,
    add: (entityOrOpts: Entity | any) => {
      const entity =
        entityOrOpts instanceof Entity
          ? entityOrOpts
          : new Entity(entityOrOpts);
      entities.push(entity);
      return entity;
    },
    remove: (entity: Entity) => {
      const index = entities.indexOf(entity);
      if (index > -1) {
        entities.splice(index, 1);
        return true;
      }
      return false;
    },
    contains: (entity: Entity) => entities.includes(entity),
    collectionChanged: _collectionChanged,
    _collectionChanged,
  } as any as EntityCollection & { _collectionChanged: MockCollectionChanged };
}

export function createMockViewer(): Viewer {
  const primitives: any[] = [];

  const entityCollection = createMockEntityCollection();

  return {
    entities: entityCollection as any as EntityCollection,
    scene: {
      primitives: {
        add: (primitive: any) => {
          primitives.push(primitive);
          return primitive;
        },
        remove: (primitive: any) => {
          const index = primitives.indexOf(primitive);
          if (index > -1) {
            primitives.splice(index, 1);
            return true;
          }
          return false;
        },
        contains: (primitive: any) => primitives.includes(primitive),
      } as any,
      pick: () => undefined,
      requestRender: () => {},
    } as any as Scene,
    canvas: {
      style: {} as CSSStyleDeclaration,
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }),
      clientWidth: 800,
      clientHeight: 600,
    } as any,
  } as unknown as Viewer;
}
