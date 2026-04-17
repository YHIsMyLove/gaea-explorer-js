import {
  Cartesian3,
  Cartographic,
  Color,
  EllipsoidGeodesic,
  Entity,
  JulianDate,
  Math as CMath,
  Matrix3,
  Matrix4,
  PolylineGraphics,
  Quaternion,
  SampledPositionProperty,
  SampledProperty,
  Transforms,
  Viewer,
} from 'cesium';
import React, { useEffect, useRef, useState } from 'react';

import {
  POVWidget,
  FrustumGraphics,
  FrustumVisualizer,
} from '@gaea-explorer/gaea-explorer-js';
import { initMap } from '../../utils/initMap';
import './index.less';
import './frustum/index.less';

/**
 * 视锥体参数
 */
const FRUSTUM_CONFIG = {
  fov: 60,
  near: 1,
  far: 500,
  aspectRatio: 1,
};

/**
 * 无人机飞行路线点（反向路线，从终点飞回起点）
 */
const WAYPOINTS = [
  { lon: 116.5, lat: 40.0, height: 500 },
  { lon: 116.48, lat: 39.98, height: 500 },
  { lon: 116.45, lat: 39.95, height: 500 },
  { lon: 116.42, lat: 39.92, height: 500 },
  { lon: 116.39, lat: 39.9, height: 500 },
];

/**
 * 动画时长（秒）
 */
const ANIMATION_DURATION = 60;

const CAMERA_BEHIND_DISTANCE = 300;
const CAMERA_ABOVE_DISTANCE = 200;

const scratchCameraOrient = new Matrix3();
const scratchForward = new Cartesian3();
const scratchCameraUp = new Cartesian3();
const scratchCameraPos = new Cartesian3();
const scratchOffset = new Cartesian3();

/**
 * 计算视锥体朝向（使用旋转矩阵组合）
 *
 * Cesium FrustumGeometry 默认方向：
 * - 视线方向 = +Z（Up，向上）
 * - 顶边方向 = +Y（North）
 * - 右边方向 = +X（East）
 *
 * 目标方向：
 * - 视线方向 = -Z（Down，垂直向下看向地面）
 * - 顶边方向 = heading（航线方向）
 * - 右边方向 = heading + 90°
 *
 * 变换方法：
 * 1. 绕 Y 轴旋转 180°：视线 Z → -Z（向下），顶边 Y → Y（不变）
 * 2. 绕 Z 轴旋转 heading：调整顶边方向
 *
 * @param position - 视锥体位置
 * @param heading - 航线方向（弧度），顶边将指向此方向
 * @returns Quaternion 朝向
 */
function computeFrustumOrientation(
  position: Cartesian3,
  heading: number,
): Quaternion {
  // 获取 ENU 变换矩阵
  const enu = Transforms.eastNorthUpToFixedFrame(position);
  const rotation = Matrix4.getMatrix3(enu, new Matrix3());

  // 绕 Y 轴旋转 180°（让视线向下）
  // Ry(180°): Z → -Z, X → -X, Y → Y
  const rotateY180 = Matrix3.fromRotationY(Math.PI);
  Matrix3.multiply(rotation, rotateY180, rotation);

  // 绕 Z 轸旋转 heading（调整顶边朝向）
  // 这让视锥体的顶边从 North 变为 heading 方向
  // 视线方向保持 -Z（向下）
  const rotateZHeading = Matrix3.fromRotationZ(heading);
  Matrix3.multiply(rotation, rotateZHeading, rotation);

  return Quaternion.fromRotationMatrix(rotation);
}

/**
 * 生成路线上的采样点和朝向数据
 * heading 动态计算：使用 EllipsoidGeodesic 计算相邻航点之间的航向角
 * 视锥体垂直向下，顶边指向航线方向
 */
function generateFlightSamples(
  waypoints: Array<{ lon: number; lat: number; height: number }>,
  duration: number,
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
    const time = JulianDate.addSeconds(
      startTime,
      i * segmentDuration,
      new JulianDate(),
    );
    const position = Cartesian3.fromDegrees(
      waypoint.lon,
      waypoint.lat,
      waypoint.height,
    );

    positions.push({ time, position });

    // 动态计算 heading：视锥体顶边指向航线方向
    // 使用 EllipsoidGeodesic 计算相邻航点之间的航向角
    let heading: number;
    if (waypoints.length === 1) {
      // 单个航点：无法计算航向，使用默认 heading=0（顶边指向 North）
      heading = 0;
    } else if (i < waypoints.length - 1) {
      // 非最后一个点：使用当前点到下一个点的方向
      const nextWaypoint = waypoints[i + 1];
      const startCartographic = Cartographic.fromDegrees(
        waypoint.lon,
        waypoint.lat,
      );
      const endCartographic = Cartographic.fromDegrees(
        nextWaypoint.lon,
        nextWaypoint.lat,
      );
      const geodesic = new EllipsoidGeodesic(
        startCartographic,
        endCartographic,
      );
      heading = geodesic.startHeading; // 弧度值
    } else {
      // 最后一个点：使用前一段的航向（保持最后一段的方向）
      const prevWaypoint = waypoints[i - 1];
      const prevCartographic = Cartographic.fromDegrees(
        prevWaypoint.lon,
        prevWaypoint.lat,
      );
      const currentCartographic = Cartographic.fromDegrees(
        waypoint.lon,
        waypoint.lat,
      );
      const geodesic = new EllipsoidGeodesic(
        prevCartographic,
        currentCartographic,
      );
      heading = geodesic.endHeading; // 弧度值
    }

    // 使用旋转矩阵计算朝向（视线垂直向下，顶边指向航线方向）
    const orientation = computeFrustumOrientation(position, heading);
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
  tracking: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onTrackingChange: () => void;
  onProgressChange: (progress: number) => void;
}

const AnimationControlPanel: React.FC<AnimationControlPanelProps> = ({
  isPlaying,
  progress,
  tracking,
  onPlay,
  onPause,
  onReset,
  onTrackingChange,
  onProgressChange,
}) => {
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = e.currentTarget;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    onProgressChange(Math.max(0, Math.min(100, newProgress)));
  };

  return (
    <div className="frustum-panel">
      <div className="panel-header">
        <span className="panel-title">无人机飞行控制</span>
      </div>
      <div className="panel-body">
        <div className="group-title">动画进度</div>
        <div className="param-row">
          <label>进度</label>
          <div className="progress-bar-container">
            <div
              className="progress-bar-track"
              onClick={handleProgressClick}
              style={{ cursor: 'pointer' }}
            >
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="group-title">控制</div>
        <div className="control-buttons">
          <button
            className={`reset-btn ${isPlaying ? 'pause-btn' : 'play-btn'}`}
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button className="reset-btn" onClick={onReset}>
            重置
          </button>
        </div>

        <div className="group-title">视角</div>
        <div className="control-buttons">
          <button
            className={`reset-btn ${tracking ? 'pause-btn' : 'play-btn'}`}
            onClick={onTrackingChange}
          >
            {tracking ? '解锁相机' : '追踪相机'}
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
  const povRef = useRef<POVWidget>();
  const polylineRef = useRef<Entity>();

  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [tracking, setTracking] = useState(true);

  const startTimeRef = useRef<JulianDate>();
  const endTimeRef = useRef<JulianDate>();
  const isPlayingRef = useRef(isPlaying);
  const trackingRef = useRef(tracking);
  const lastProgressRef = useRef(0);

  // 同步 ref 和 state
  isPlayingRef.current = isPlaying;
  trackingRef.current = tracking;

  useEffect(() => {
    const viewer = initMap('cesiumContainer', {
      home: [116.45, 39.95, 5000],
    });
    viewerRef.current = viewer;

    // 绘制飞行路线 polyline
    const polylinePositions = WAYPOINTS.map((wp) =>
      Cartesian3.fromDegrees(wp.lon, wp.lat, wp.height),
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
    const { positions, orientations } = generateFlightSamples(
      WAYPOINTS,
      ANIMATION_DURATION,
    );

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

    // 创建 SampledProperty for orientation（视锥体朝向）
    // 使用旋转矩阵组合：视线垂直向下，顶边指向航线方向
    const sampledOrientation = new SampledProperty(Quaternion);
    orientations.forEach(({ time, orientation }) => {
      sampledOrientation.addSample(time, orientation);
    });

    // 创建视锥体 Entity
    // 视锥体朝向由 entity.orientation 控制（视线垂直向下，顶边指向航线方向）
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

    // 创建 POVWidget，同步视锥体视角
    povRef.current = new POVWidget(viewer, {
      entity: frustumEntity,
      width: 200,
      height: 150,
      position: 'bottom-right',
      offset: { x: 10, y: 10 },
      fovSync: true,
    });

    // 更新 visualizer
    const scratchDate = new JulianDate();
    const onPreRender = () => {
      const currentTime = viewer.clock.currentTime;
      visualizer.update(JulianDate.clone(currentTime, scratchDate));

      // 相机追踪：锁定到视锥体后方，朝向移动方向
      if (trackingRef.current && entityRef.current) {
        const entity = entityRef.current;
        const pos = entity.position?.getValue(currentTime);
        const orient = entity.orientation?.getValue(currentTime);

        if (pos && orient) {
          const mat = Matrix3.fromQuaternion(orient, scratchCameraOrient);
          // 实体局部 +Y = 航向方向（移动方向）
          const forward = Matrix3.multiplyByVector(
            mat,
            Cartesian3.UNIT_Y,
            scratchForward,
          );
          Cartesian3.normalize(forward, forward);
          // 实体局部 +Z = 向下（经 Ry(180°)），取反得到向上
          const down = Matrix3.multiplyByVector(
            mat,
            Cartesian3.UNIT_Z,
            scratchCameraUp,
          );
          Cartesian3.negate(down, scratchCameraUp);
          Cartesian3.normalize(scratchCameraUp, scratchCameraUp);

          const cameraPos = Cartesian3.clone(pos, scratchCameraPos);
          Cartesian3.multiplyByScalar(forward, -CAMERA_BEHIND_DISTANCE, scratchOffset);
          Cartesian3.add(cameraPos, scratchOffset, cameraPos);
          Cartesian3.multiplyByScalar(scratchCameraUp, CAMERA_ABOVE_DISTANCE, scratchOffset);
          Cartesian3.add(cameraPos, scratchOffset, cameraPos);

          viewer.camera.setView({
            destination: cameraPos,
            orientation: { direction: forward, up: scratchCameraUp },
          });
        }
      }

      // 更新进度（仅当变化超过1%时更新，避免频繁 React re-render）
      const startTime = startTimeRef.current!;
      const endTime = endTimeRef.current!;

      const totalSeconds = JulianDate.secondsDifference(endTime, startTime);
      const elapsedSeconds = JulianDate.secondsDifference(
        currentTime,
        startTime,
      );

      const progressPercent = Math.max(
        0,
        Math.min(100, (elapsedSeconds / totalSeconds) * 100),
      );
      if (Math.abs(progressPercent - lastProgressRef.current) > 1) {
        lastProgressRef.current = progressPercent;
        setProgress(progressPercent);
      }

      // 循环播放（使用 ref 避免 stale closure）
      if (elapsedSeconds >= totalSeconds && isPlayingRef.current) {
        JulianDate.clone(startTime, viewer.clock.currentTime);
      }
    };
    viewer.scene.preRender.addEventListener(onPreRender);

    return () => {
      viewer.scene.preRender.removeEventListener(onPreRender);
      povRef.current?.destroy();
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
      JulianDate.clone(
        startTimeRef.current,
        viewerRef.current.clock.currentTime,
      );
      lastProgressRef.current = 0;
      setProgress(0);
      setIsPlaying(true);
    }
  };

  const handleTrackingToggle = () => setTracking((prev) => !prev);

  const handleProgressChange = (newProgress: number) => {
    if (viewerRef.current && startTimeRef.current && endTimeRef.current) {
      const startTime = startTimeRef.current;
      const endTime = endTimeRef.current;
      const totalSeconds = JulianDate.secondsDifference(endTime, startTime);
      const targetSeconds = (newProgress / 100) * totalSeconds;

      const newTime = JulianDate.addSeconds(
        startTime,
        targetSeconds,
        new JulianDate(),
      );
      JulianDate.clone(newTime, viewerRef.current.clock.currentTime);
      lastProgressRef.current = newProgress;
      setProgress(newProgress);
    }
  };

  return (
    <div id="cesiumContainer">
      <AnimationControlPanel
        isPlaying={isPlaying}
        progress={progress}
        tracking={tracking}
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        onTrackingChange={handleTrackingToggle}
        onProgressChange={handleProgressChange}
      />
    </div>
  );
};

export default Map;
