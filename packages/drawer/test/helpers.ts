import { Entity } from 'cesium';
import type { Viewer } from 'cesium';

/**
 * 创建最小 mock Viewer，仅包含 Editor 需要的 API
 */
export function createMockViewer(): Viewer {
  const entities: Entity[] = [];

  return {
    entities: {
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
    } as any,
    scene: {
      requestRender: () => {},
      pick: () => ({ id: undefined }),
      pickPosition: () => undefined,
      globe: {
        pick: () => undefined,
      },
    } as any,
    camera: {
      getPickRay: () => undefined,
      pickEllipsoid: () => undefined,
    } as any,
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
      setAttribute: () => {},
      clientWidth: 800,
      clientHeight: 600,
    } as any,
    screenSpaceEventHandler: {
      setInputAction: () => {},
      removeInputAction: () => {},
      destroy: () => {},
    } as any,
  } as unknown as Viewer;
}
