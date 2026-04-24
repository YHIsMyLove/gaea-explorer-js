import { Color, Viewer } from 'cesium';
import React, { useEffect, useRef, useState } from 'react';

import { initMap } from '@/utils/initMap';
import {
  UAVLineDrawer,
  EditableUAVLine,
  Editor,
} from '@gaea-explorer/gaea-explorer-js';
import type { HeightFunction, UAVNode } from '@gaea-explorer/gaea-explorer-js';
import './index.less';

interface MapProps {}

const Map: React.FC<MapProps> = () => {
  const viewer = useRef<Viewer>();
  const drawerRef = useRef<UAVLineDrawer>();
  const editorRef = useRef<Editor>();
  const [heightMode, setHeightMode] = useState<'RELATIVE_TO_GROUND' | 'ABSOLUTE'>('RELATIVE_TO_GROUND');
  const [fixedHeight, setFixedHeight] = useState(100);
  const [showDropLines, setShowDropLines] = useState(true);
  const [editingHeight, setEditingHeight] = useState(100);
  const [nodes, setNodes] = useState<UAVNode[]>([]);

  useEffect(() => {
    viewer.current = initMap('cesiumContainer-uav-line', {
      home: [116.3, 39.9, 500000],
    });

    drawerRef.current = new UAVLineDrawer(viewer.current);
    editorRef.current = new Editor(viewer.current);

    return () => {
      drawerRef.current?.destroy();
      editorRef.current?.destroy();
      viewer.current?.destroy();
    };
  }, []);

  // 高度函数示例：阶梯高度
  const stepHeightFn: HeightFunction = (index) => 50 + index * 30;

  // 高度函数示例：递减高度
  const descendHeightFn: HeightFunction = (index, positions) => {
    const total = positions.length;
    return 200 - index * (150 / Math.max(total - 1, 1));
  };

  const startDrawFixed = () => {
    if (!viewer.current) return;

    drawerRef.current?.start({
      height: fixedHeight,
      heightMode,
      showDropLines,
      finalOptions: {
        width: 3,
        material: Color.CYAN,
      },
      dropLineOptions: {
        width: 1,
        material: Color.WHITE.withAlpha(0.6),
      },
      onEnd: (entity, positions, groundPositions) => {
        console.log('航线绘制完成:', {
          entity,
          positions,
          groundPositions,
        });

        // 启用编辑
        editorRef.current?.startEdit(entity, {
          onEditing: (params) => {
            if ('nodes' in params) {
              setNodes(params.nodes as UAVNode[]);
            }
          },
        });
      },
    });
  };

  const startDrawStep = () => {
    if (!viewer.current) return;

    drawerRef.current?.start({
      height: stepHeightFn,
      heightMode: 'RELATIVE_TO_GROUND',
      showDropLines,
      finalOptions: {
        width: 3,
        material: Color.GREEN,
      },
      onEnd: (entity) => {
        editorRef.current?.startEdit(entity);
      },
    });
  };

  const startDrawDescend = () => {
    if (!viewer.current) return;

    drawerRef.current?.start({
      height: descendHeightFn,
      heightMode: 'RELATIVE_TO_GROUND',
      showDropLines,
      finalOptions: {
        width: 3,
        material: Color.ORANGE,
      },
      onEnd: (entity) => {
        editorRef.current?.startEdit(entity);
      },
    });
  };

  const clearAll = () => {
    drawerRef.current?.reset();
    editorRef.current?.stopEdit();
    setNodes([]);
  };

  const setNodeHeight = (index: number, height: number) => {
    const editableShape = editorRef.current?.['_editableShape'];
    if (editableShape instanceof EditableUAVLine) {
      editableShape.setNodeHeight(index, height);
      setNodes(editableShape.nodes);
    }
  };

  return (
    <div id="cesiumContainer-uav-line" className="uav-line-container">
      <div className="uav-line-tools">
        <div className="tool-section">
          <h4>固定高度绘制</h4>
          <div className="tool-row">
            <label>
              高度模式:
              <select value={heightMode} onChange={(e) => setHeightMode(e.target.value as any)}>
                <option value="RELATIVE_TO_GROUND">相对地形</option>
                <option value="ABSOLUTE">绝对高度</option>
              </select>
            </label>
            <label>
              高度(m):
              <input
                type="number"
                value={fixedHeight}
                onChange={(e) => setFixedHeight(Number(e.target.value))}
                style={{ width: 60 }}
              />
            </label>
          </div>
          <div className="tool-row">
            <label>
              <input
                type="checkbox"
                checked={showDropLines}
                onChange={(e) => setShowDropLines(e.target.checked)}
              />
              显示下垂线
            </label>
            <button onClick={startDrawFixed}>开始绘制</button>
          </div>
        </div>

        <div className="tool-section">
          <h4>动态高度绘制</h4>
          <button onClick={startDrawStep}>阶梯高度 (50+30n)</button>
          <button onClick={startDrawDescend}>递减高度 (200→50)</button>
        </div>

        <div className="tool-section">
          <h4>节点高度编辑</h4>
          {nodes.length > 0 ? (
            <div className="node-list">
              {nodes.map((node, i) => (
                <div key={i} className="node-item">
                  <span>节点 {i}: {node.height.toFixed(1)}m</span>
                  <input
                    type="number"
                    value={editingHeight}
                    onChange={(e) => setEditingHeight(Number(e.target.value))}
                    style={{ width: 50 }}
                  />
                  <button onClick={() => setNodeHeight(i, editingHeight)}>设置</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="hint">绘制完成后可编辑节点高度</p>
          )}
        </div>

        <button className="clear-btn" onClick={clearAll}>清除全部</button>
      </div>
    </div>
  );
};

export default Map;