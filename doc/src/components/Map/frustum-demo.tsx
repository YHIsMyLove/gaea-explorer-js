import {
  Cartesian3,
  Color,
  Entity,
  HeadingPitchRoll,
  JulianDate,
  Math as CMath,
  PolylineGraphics,
  Quaternion,
  SampledPositionProperty,
  SampledProperty,
  Transforms,
  Viewer,
} from 'cesium';
import React, { useEffect, useRef, useState } from 'react';

import {
  EagleEyeWidget,
  FrustumGraphics,
  FrustumVisualizer,
} from '@gaea-explorer/gaea-explorer-js';
import { initMap } from '../../utils/initMap';
import './index.less';
import './frustum/index.less';

/**
 * 无人机飞行路线点（北京本地短距离路线，约20km）
 */
const WAYPOINTS = [
  { lon: 116.39, lat: 39.9, height: 500 },   // 起点：北京市中心
  { lon: 116.42, lat: 39.92, height: 500 },  // 中间点1
  { lon: 116.45, lat: 39.95, height: 500 },  // 中间点2
  { lon: 116.48, lat: 39.98, height: 500 },  // 中间点3
  { lon: 116.5, lat: 40.0, height: 500 },    // 终点：郊区
];

/**
 * 视锥体参数
 */
const FRUSTUM_CONFIG = {
  fov: 60,
  near: 1,
  far: 500,
  aspectRatio: 1.5,
};

/**
 * 动画时长（秒）
 */
const ANIMATION_DURATION = 60;

/**
 * 计算两点之间的航向角
 */
function calculateHeading(start: { lon: number; lat: number }, end: { lon: number; lat: number }): number {
  const startCartographic = { longitude: CMath.toRadians(start.lon), latitude: CMath.toRadians(start.lat) };
  const endCartographic = { longitude: CMath.toRadians(end.lon), latitude: CMath.toRadians(end.lat) };

  const deltaLon = endCartographic.longitude - startCartographic.longitude;
  const y = Math.sin(deltaLon) * Math.cos(endCartographic.latitude);
  const x = Math.cos(startCartographic.latitude) * Math.sin(endCartographic.latitude)
          - Math.sin(startCartographic.latitude) * Math.cos(endCartographic.latitude) * Math.cos(deltaLon);

  let heading = Math.atan2(y, x);
  heading = CMath.toDegrees(heading);
  if (heading < 0) heading += 360;

  return heading;
}

/**
 * 生成路线上的采样点和朝向数据
 */
function generateFlightSamples(
  waypoints: Array<{ lon: number; lat: number; height: number }>,
  duration: number
): {
  positions: Array<{ time: JulianDate; position: Cartesian3 }>;
  orientations: Array<{ time: JulianDate; orientation: Quaternion }>;
} {
  const positions: Array<{ time: JulianDate; position: Cartesian3 }> = [];
  const orientations: Array<{ time: JulianDate; orientation: Quaternion }> = [];

  const segmentCount = waypoints.length - 1;
  const segmentDuration = duration / segmentCount;

  // 起始时间
  const startTime = JulianDate.fromDate(new Date());

  for (let i = 0; i < waypoints.length; i++) {
    const waypoint = waypoints[i];
    const time = JulianDate.addSeconds(startTime, i * segmentDuration, new JulianDate());
    const position = Cartesian3.fromDegrees(waypoint.lon, waypoint.lat, waypoint.height);

    positions.push({ time, position });

    // 计算朝向（朝向下一个点）
    let heading = 0;
    let pitch = -15; // 略微向下观察

    if (i < waypoints.length - 1) {
      heading = calculateHeading(waypoint, waypoints[i + 1]);
    } else {
      // 最后一个点，保持之前的朝向
      heading = calculateHeading(waypoints[i - 1], waypoint);
    }

    const hpr = new HeadingPitchRoll(
      CMath.toRadians(heading),
      CMath.toRadians(pitch),
      0
    );
    const orientation = Transforms.headingPitchRollQuaternion(position, hpr);

    orientations.push({ time, orientation });
  }

  return { positions, orientations };
}

/**
 * 动画控制面板
 */
interface AnimationControlPanelProps {
  isPlaying: boolean;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}

const AnimationControlPanel: React.FC<AnimationControlPanelProps> = ({
  isPlaying,
  progress,
  onPlay,
  onPause,
  onReset,
}) => {
  return (
    <div className="frustum-panel">
      <div className="panel-header">
        <span className="panel-title">无人机飞行控制</span>
      </div>
      <div className="panel-body">
        <div className="group-title">动画进度</div>
        <div className="param-row">
          <label>进度</label>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: '#ddd',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#1890ff',
                  transition: 'width 0.1s'
                }}
              />
            </div>
            <span style={{ marginLeft: '8px', minWidth: '40px' }}>{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="group-title">控制</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            className="reset-btn"
            onClick={isPlaying ? onPause : onPlay}
            style={{ background: isPlaying ? '#ff4d4f' : '#1890ff', color: 'white', borderColor: isPlaying ? '#ff4d4f' : '#1890ff' }}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button className="reset-btn" onClick={onReset}>
            重置
          </button>
        </div>
      </div>
    </div>
  );
};

const Map: React.FC = () => {
  const viewerRef = useRef<Viewer>();
  const visualizerRef = useRef<FrustumVisualizer>();
  const entityRef = useRef<Entity>();
  const eagleEyeRef = useRef<EagleEyeWidget>();
  const polylineRef = useRef<Entity>();

  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const startTimeRef = useRef<JulianDate>();
  const endTimeRef = useRef<JulianDate>();

  useEffect(() => {
    const viewer = initMap('cesiumContainer', {
      home: [116.45, 39.95, 5000],
    });
    viewerRef.current = viewer;

    // 绘制飞行路线 polyline
    const polylinePositions = WAYPOINTS.map(wp =>
      Cartesian3.fromDegrees(wp.lon, wp.lat, wp.height)
    );

    polylineRef.current = viewer.entities.add({
      name: 'flight-route',
      polyline: new PolylineGraphics({
        positions: polylinePositions,
        width: 3,
        material: Color.YELLOW.withAlpha(0.8),
        clampToGround: false,
      }),
    });

    // 生成采样数据
    const { positions, orientations } = generateFlightSamples(WAYPOINTS, ANIMATION_DURATION);

    // 设置起始和结束时间
    startTimeRef.current = positions[0].time.clone();
    endTimeRef.current = positions[positions.length - 1].time.clone();

    // 设置 viewer 时钟
    viewer.clock.startTime = startTimeRef.current.clone();
    viewer.clock.currentTime = startTimeRef.current.clone();
    viewer.clock.endTime = endTimeRef.current.clone();
    viewer.clock.clockRange = 0; // UNCLAMPED
    viewer.clock.multiplier = 1;
    viewer.shouldAnimate = true;

    // 创建 SampledPositionProperty
    const sampledPosition = new SampledPositionProperty();
    positions.forEach(({ time, position }) => {
      sampledPosition.addSample(time, position);
    });

    // 创建 SampledProperty for orientation
    const sampledOrientation = new SampledProperty(Quaternion);
    orientations.forEach(({ time, orientation }) => {
      sampledOrientation.addSample(time, orientation);
    });

    // 创建视锥体 Entity
    const frustumEntity = viewer.entities.add({
      name: 'drone-frustum',
      position: sampledPosition,
      orientation: sampledOrientation,
      frustum: new FrustumGraphics({
        fov: FRUSTUM_CONFIG.fov,
        near: FRUSTUM_CONFIG.near,
        far: FRUSTUM_CONFIG.far,
        aspectRatio: FRUSTUM_CONFIG.aspectRatio,
        fill: true,
        fillColor: Color.CYAN,
        fillOpacity: 0.2,
        outline: true,
        outlineColor: Color.WHITE,
      }),
    });
    entityRef.current = frustumEntity;

    // 创建 FrustumVisualizer
    const visualizer = new FrustumVisualizer(viewer.entities, viewer.scene);
    visualizerRef.current = visualizer;

    // 创建鹰眼，使用 syncFrustumView 同步视锥体视角
    eagleEyeRef.current = new EagleEyeWidget(viewer, {
      width: 200,
      height: 150,
      position: 'bottom-right',
      offset: { x: 10, y: 10 },
      showViewRect: false,
      syncFrustumView: {
        entity: frustumEntity,
      },
    });

    // 更新 visualizer
    const scratchDate = new JulianDate();
    const onPreRender = () => {
      visualizer.update(JulianDate.now(scratchDate));

      // 更新进度
      const currentTime = viewer.clock.currentTime;
      const startTime = startTimeRef.current!;
      const endTime = endTimeRef.current!;

      const totalSeconds = JulianDate.secondsDifference(endTime, startTime);
      const elapsedSeconds = JulianDate.secondsDifference(currentTime, startTime);

      const progressPercent = Math.max(0, Math.min(100, (elapsedSeconds / totalSeconds) * 100));
      setProgress(progressPercent);

      // 循环播放
      if (elapsedSeconds >= totalSeconds && isPlaying) {
        viewer.clock.currentTime = startTime.clone();
      }
    };
    viewer.scene.preRender.addEventListener(onPreRender);

    // 飞到初始视角
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(116.39, 39.85, 2000),
      orientation: {
        heading: CMath.toRadians(0),
        pitch: CMath.toRadians(-30),
        roll: 0,
      },
      duration: 2,
    });

    return () => {
      viewer.scene.preRender.removeEventListener(onPreRender);
      eagleEyeRef.current?.destroy();
      visualizer.destroy();
      viewer.destroy();
    };
  }, []);

  // 控制播放状态
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.shouldAnimate = isPlaying;
    }
  }, [isPlaying]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    if (viewerRef.current && startTimeRef.current) {
      viewerRef.current.clock.currentTime = startTimeRef.current.clone();
      setProgress(0);
      setIsPlaying(true);
    }
  };

  return (
    <div id="cesiumContainer">
      <AnimationControlPanel
        isPlaying={isPlaying}
        progress={progress}
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
      />
    </div>
  );
};

export default Map;