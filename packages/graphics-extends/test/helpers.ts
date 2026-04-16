import { Entity } from 'cesium';
import type { Viewer, Scene, EntityCollection } from 'cesium';

export function createMockViewer(): Viewer {
  const entities: Entity[] = [];
  const primitives: any[] = [];

  return {
    entities: {
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
      collectionChanged: {
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    } as any as EntityCollection,
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
