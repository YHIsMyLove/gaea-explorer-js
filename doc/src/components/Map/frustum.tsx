import {
  Cartesian3,
  Color,
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

const Map: React.FC = () => {
  const viewerRef = useRef<Viewer>();
  const visualizerRef = useRef<FrustumVisualizer>();
  const configRef = useRef<FrustumConfig>(INITIAL_CONFIG);

  useEffect(() => {
    const viewer = initMap('cesiumContainer', {
      home: [116.39, 39.9, 5000],
    });
    viewerRef.current = viewer;

    const config = configRef.current;
    const position = Cartesian3.fromDegrees(config.lon, config.lat, config.height);

    // 创建视锥体 entity
    viewer.entities.add({
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

  return <div id="cesiumContainer" />;
};

export default Map;
