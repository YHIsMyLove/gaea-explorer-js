import { ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from 'cesium';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { initMap } from '@/utils/initMap';
import { Drawer, Editor, StartOption } from 'gaea-explorer-js';
import './index.less';

const DRAW_OPERATIONS: {
  type: StartOption['type'];
  label: string;
}[] = [
  { type: 'POINT', label: '点' },
  { type: 'POLYLINE', label: '线' },
  { type: 'POLYGON', label: '多边形' },
  { type: 'CIRCLE', label: '圆形' },
  { type: 'RECTANGLE', label: '矩形' },
];

const Map: React.FC = () => {
  const viewer = useRef<Viewer>();
  const drawerTool = useRef<Drawer>();
  const editorTool = useRef<Editor>();
  const selectHandler = useRef<ScreenSpaceEventHandler>();
  const [isEditing, setIsEditing] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    viewer.current = initMap('cesiumContainer');
    drawerTool.current = new Drawer(viewer.current, {
      tips: {
        init: '点击绘制',
        start: '左键添加点，右键移除点，双击结束绘制',
      },
    });
    editorTool.current = new Editor(viewer.current);

    return () => {
      selectHandler.current?.destroy();
      editorTool.current?.destroy();
      drawerTool.current?.destroy();
      editorTool.current = undefined;
      drawerTool.current = undefined;
      viewer.current?.destroy();
      viewer.current = undefined;
    };
  }, []);

  const resetEditorState = useCallback(() => {
    editorTool.current?.stopEdit();
    setIsEditing(false);
  }, []);

  const exitSelectMode = useCallback(() => {
    selectHandler.current?.destroy();
    selectHandler.current = undefined;
    setIsSelectMode(false);
    if (viewer.current) {
      viewer.current.canvas.style.cursor = 'default';
    }
  }, []);

  const startDraw = useCallback(
    (type: StartOption['type']) => {
      exitSelectMode();
      drawerTool.current?.reset();
      resetEditorState();

      drawerTool.current?.start({
        type,
        onEnd: (entity) => {
          editorTool.current?.startEdit(entity, {
            onEditStart: () => {
              setIsEditing(true);
            },
            onEditEnd: () => {
              setIsEditing(false);
            },
          });
        },
      });
    },
    [resetEditorState, exitSelectMode],
  );

  const enterSelectMode = useCallback(() => {
    const v = viewer.current;
    if (!v) return;

    drawerTool.current?.pause();
    resetEditorState();

    setIsSelectMode(true);
    v.canvas.style.cursor = 'pointer';

    const handler = new ScreenSpaceEventHandler(v.scene.canvas);
    handler.setInputAction((click: { position: any }) => {
      const picked = v.scene.pick(click.position);
      const entity = picked?.id;
      if (entity && v.entities.contains(entity)) {
        editorTool.current?.startEdit(entity, {
          onEditStart: () => {
            setIsEditing(true);
          },
          onEditEnd: () => {
            setIsEditing(false);
          },
        });
        exitSelectMode();
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    selectHandler.current = handler;
  }, [resetEditorState, exitSelectMode]);

  const clear = useCallback(() => {
    exitSelectMode();
    resetEditorState();
    drawerTool.current?.reset();
  }, [resetEditorState, exitSelectMode]);

  return (
    <div id="cesiumContainer">
      <div className="draw-tools">
        {DRAW_OPERATIONS.map((op) => (
          <button key={op.type} onClick={() => startDraw(op.type)}>
            {op.label}
          </button>
        ))}
        <button
          onClick={enterSelectMode}
          disabled={isSelectMode || isEditing}
          className={isSelectMode ? 'active' : ''}
        >
          编辑
        </button>
        {isEditing && <button onClick={resetEditorState}>完成编辑</button>}
        <button onClick={clear}>清除</button>
      </div>
    </div>
  );
};

export default Map;
