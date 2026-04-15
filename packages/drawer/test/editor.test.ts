import { describe, expect, it, vi } from 'vitest';
import { Cartesian3, Entity } from 'cesium';
import { Editor } from '../src/editor';
import { createMockViewer } from './helpers';

describe('Editor', () => {
  const viewer = createMockViewer();

  it('should start editing a point entity', () => {
    const editor = new Editor(viewer);
    const entity = new Entity({
      position: new Cartesian3(0, 0, 0),
      point: { pixelSize: 10 },
    });
    viewer.entities.add(entity);

    const onStart = vi.fn();
    editor.startEdit(entity, { onEditStart: onStart });

    expect(editor.isEditing).toBe(true);
    expect(editor.activeEntity).toBe(entity);
    expect(onStart).toHaveBeenCalledWith(entity);
  });

  it('should stop editing and trigger onEditEnd', () => {
    const editor = new Editor(viewer);
    const entity = new Entity({
      position: new Cartesian3(0, 0, 0),
      point: { pixelSize: 10 },
    });
    viewer.entities.add(entity);

    const onEnd = vi.fn();
    editor.startEdit(entity, { onEditEnd: onEnd });
    editor.stopEdit();

    expect(editor.isEditing).toBe(false);
    expect(editor.activeEntity).toBeUndefined();
    expect(onEnd).toHaveBeenCalledWith(entity);
  });

  it('should auto stopEdit when starting edit of different entity', () => {
    const editor = new Editor(viewer);
    const entity1 = new Entity({
      position: new Cartesian3(0, 0, 0),
      point: { pixelSize: 10 },
    });
    const entity2 = new Entity({
      position: new Cartesian3(1, 1, 1),
      point: { pixelSize: 10 },
    });
    viewer.entities.add(entity1);
    viewer.entities.add(entity2);

    const onEnd1 = vi.fn();
    editor.startEdit(entity1, { onEditEnd: onEnd1 });
    editor.startEdit(entity2);

    expect(onEnd1).toHaveBeenCalledWith(entity1);
    expect(editor.activeEntity).toBe(entity2);
  });

  it('should ignore startEdit for same entity', () => {
    const editor = new Editor(viewer);
    const entity = new Entity({
      position: new Cartesian3(0, 0, 0),
      point: { pixelSize: 10 },
    });
    viewer.entities.add(entity);

    const onStart = vi.fn();
    editor.startEdit(entity, { onEditStart: onStart });
    onStart.mockClear();

    editor.startEdit(entity, { onEditStart: onStart });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('should not start edit for unknown entity type', () => {
    const editor = new Editor(viewer);
    const entity = new Entity({}); // 无图形属性
    viewer.entities.add(entity);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    editor.startEdit(entity);
    expect(editor.isEditing).toBe(false);
    consoleSpy.mockRestore();
  });

  it('should destroy and clean up', () => {
    const editor = new Editor(viewer);
    const entity = new Entity({
      position: new Cartesian3(0, 0, 0),
      point: { pixelSize: 10 },
    });
    viewer.entities.add(entity);

    editor.startEdit(entity);
    editor.destroy();

    expect(editor.isEditing).toBe(false);
    expect(editor.isDestroyed).toBe(true);
  });

  it('should handle setPosition for point entity', () => {
    const editor = new Editor(viewer);
    const entity = new Entity({
      position: new Cartesian3(0, 0, 0),
      point: { pixelSize: 10 },
    });
    viewer.entities.add(entity);

    editor.startEdit(entity);
    const newPos = new Cartesian3(10, 20, 30);
    editor.setPosition(newPos);

    const currentPos = editor.activeEntity?.position;
    // Cesium wraps position in ConstantPositionProperty
    const actualPos =
      typeof currentPos?.getValue === 'function'
        ? currentPos.getValue({})
        : currentPos;
    expect(actualPos).toEqual(newPos);
  });
});
