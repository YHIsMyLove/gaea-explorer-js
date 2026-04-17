import {
  Cartesian3,
  Color,
  ConstantPositionProperty,
  Entity,
  HeadingPitchRoll,
  JulianDate,
  Math as CMath,
  Transforms,
  Viewer,
} from 'cesium';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  FrustumGraphics,
  FrustumVisualizer,
} from '@gaea-explorer/gaea-explorer-js';
import type { FrustumGraphicsConstructorOptions } from '@gaea-explorer/gaea-explorer-js';
import { initMap } from '../../utils/initMap';
import './index.less';
import './frustum/index.less';

/** 视锥体完整配置（位置+姿态+几何） */
interface FrustumConfig {
  lon: number;
  lat: number;
  height: number;
  heading: number;
  pitch: number;
  fov: number;
  near: number;
  far: number;
  aspectRatio: number;
}

/** 初始配置：北京上空，垂直向下 */
const INITIAL_CONFIG: FrustumConfig = {
  lon: 116.39,
  lat: 39.9,
  height: 1000,
  heading: 0,
  pitch: -90, // 垂直向下
  fov: 45,
  near: 1,
  far: 800,
  aspectRatio: 1.5,
};

/** 参数元数据：范围、步进、标签 */
interface ParamMeta {
  key: keyof FrustumConfig;
  label: string;
  min: number | ((config: FrustumConfig) => number);
  max: number | ((config: FrustumConfig) => number);
  step: number;
}

const POSITION_PARAMS: ParamMeta[] = [
  { key: 'lon', label: '经度', min: -180, max: 180, step: 0.001 },
  { key: 'lat', label: '纬度', min: -90, max: 90, step: 0.001 },
  { key: 'height', label: '高度(m)', min: 100, max: 10000, step: 10 },
];

const ATTITUDE_PARAMS: ParamMeta[] = [
  { key: 'heading', label: '航向(°)', min: 0, max: 360, step: 1 },
  { key: 'pitch', label: '俯仰(°)', min: -90, max: 90, step: 1 },
];

const GEOMETRY_PARAMS: ParamMeta[] = [
  { key: 'fov', label: '视场角(°)', min: 10, max: 120, step: 1 },
  { key: 'near', label: '近裁剪(m)', min: 0.1, max: 100, step: 0.1 },
  { key: 'far', label: '远裁剪(m)', min: (c) => c.near + 1, max: 5000, step: 1 },
  { key: 'aspectRatio', label: '宽高比', min: 0.5, max: 4, step: 0.1 },
];

const scratchDate = new JulianDate();

interface FrustumControlPanelProps {
  config: FrustumConfig;
  onChange: (key: keyof FrustumConfig, value: number) => void;
  onReset: () => void;
}

const FrustumControlPanel: React.FC<FrustumControlPanelProps> = ({
  config,
  onChange,
  onReset,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const renderParamRow = (meta: ParamMeta) => {
    const min = typeof meta.min === 'function' ? meta.min(config) : meta.min;
    const max = typeof meta.max === 'function' ? meta.max(config) : meta.max;
    const value = config[meta.key];

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(meta.key, parseFloat(e.target.value));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        const clamped = Math.max(min, Math.min(max, newValue));
        onChange(meta.key, clamped);
      }
    };

    return (
      <div className="param-row" key={meta.key}>
        <label>{meta.label}</label>
        <input
          type="range"
          min={min}
          max={max}
          step={meta.step}
          value={value}
          onChange={handleSliderChange}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={meta.step}
          value={value}
          onChange={handleInputChange}
        />
      </div>
    );
  };

  return (
    <div className={`frustum-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header">
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '▶' : '◀'}
        </button>
        {!collapsed && <span className="panel-title">视锥体参数</span>}
      </div>
      {!collapsed && (
        <div className="panel-body">
          <div className="group-title">位置</div>
          {POSITION_PARAMS.map(renderParamRow)}
          <div className="group-title">姿态</div>
          {ATTITUDE_PARAMS.map(renderParamRow)}
          <div className="group-title">几何</div>
          {GEOMETRY_PARAMS.map(renderParamRow)}
          <button className="reset-btn" onClick={onReset}>
            重置
          </button>
        </div>
      )}
    </div>
  );
};

const Map: React.FC = () => {
  const viewerRef = useRef<Viewer>();
  const visualizerRef = useRef<FrustumVisualizer>();
  const entityRef = useRef<Entity>();
  const [config, setConfig] = useState<FrustumConfig>(INITIAL_CONFIG);

  // 初始化 Viewer 和 Entity
  useEffect(() => {
    const viewer = initMap('cesiumContainer', {
      home: [116.39, 39.9, 5000],
    });
    viewerRef.current = viewer;

    const position = Cartesian3.fromDegrees(config.lon, config.lat, config.height);

    // 创建视锥体 entity
    const entity = viewer.entities.add({
      position,
      orientation: Transforms.headingPitchRollQuaternion(
        position,
        new HeadingPitchRoll(
          CMath.toRadians(config.heading),
          CMath.toRadians(config.pitch),
          0,
        ),
      ),
      frustum: new FrustumGraphics({
        fov: config.fov,
        near: config.near,
        far: config.far,
        aspectRatio: config.aspectRatio,
        fill: true,
        fillColor: Color.CYAN,
        fillOpacity: 0.3,
        outline: true,
        outlineColor: Color.WHITE,
      }),
    });
    entityRef.current = entity;

    // 创建 FrustumVisualizer 并绑定到渲染循环
    const visualizer = new FrustumVisualizer(viewer.entities, viewer.scene);
    visualizerRef.current = visualizer;

    const onPreRender = () => {
      visualizer.update(JulianDate.now(scratchDate));
    };
    viewer.scene.preRender.addEventListener(onPreRender);

    // 飞到更好的观察角度
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(116.39, 39.87, 4000),
      orientation: {
        heading: CMath.toRadians(10),
        pitch: CMath.toRadians(-25),
        roll: 0,
      },
      duration: 2,
    });

    return () => {
      viewer.scene.preRender.removeEventListener(onPreRender);
      visualizer.destroy();
      viewer.destroy();
    };
  }, []);

  // 实时更新 Entity 属性
  useEffect(() => {
    const entity = entityRef.current;
    if (!entity) return;

    const position = Cartesian3.fromDegrees(config.lon, config.lat, config.height);
    entity.position = new ConstantPositionProperty(position);

    entity.orientation = Transforms.headingPitchRollQuaternion(
      position,
      new HeadingPitchRoll(
        CMath.toRadians(config.heading),
        CMath.toRadians(config.pitch),
        0,
      ),
    );

    if (entity.frustum) {
      entity.frustum.fov = config.fov;
      entity.frustum.near = config.near;
      entity.frustum.far = config.far;
      entity.frustum.aspectRatio = config.aspectRatio;
    }
  }, [config]);

  const handleConfigChange = (key: keyof FrustumConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setConfig(INITIAL_CONFIG);
  };

  return (
    <>
      <FrustumControlPanel
        config={config}
        onChange={handleConfigChange}
        onReset={handleReset}
      />
      <div id="cesiumContainer" />
    </>
  );
};

export default Map;
