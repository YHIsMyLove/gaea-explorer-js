import {
  Cartesian3,
  Cartographic,
  HeadingPitchRoll,
  JulianDate,
  Matrix3,
  Math as CMath,
  Quaternion,
  SceneMode,
  Viewer,
} from 'cesium';
import type { Entity } from 'cesium';

import { DomUtil, Widget } from '@gaea-explorer/common';
import { FrustumGraphics } from '@gaea-explorer/graphics-extends';

import './styles/pov-widget.scss';
import type { POVWidgetOptions, POVWidgetPosition } from './typings';

// 默认尺寸
const DEFAULT_WIDTH = 150;
const DEFAULT_HEIGHT = 150;
const DEFAULT_POSITION: POVWidgetPosition = 'bottom-right';

// 预分配的 scratch 变量，避免热路径中的对象分配
const scratchCartographic = new Cartographic();
const scratchPosition = new Cartesian3();
const scratchHPR = new HeadingPitchRoll();
const scratchOrientMatrix = new Matrix3();
const scratchDirection = new Cartesian3();
const scratchUp = new Cartesian3();
const scratchSmoothedPosition = new Cartesian3();
const scratchSmoothedDirection = new Cartesian3();
const scratchSmoothedUp = new Cartesian3();

// 常量定义（解释原因）
const POSITION_EPSILON = 0.001; // 位置变更检测阈值：约 1mm，足以过滤浮点噪声
const IMAGERY_RETRY_INTERVAL = 100; // 影像层同步重试间隔：平衡首次加载速度与 CPU 占用
const MAX_IMAGERY_RETRIES = 50; // 最大重试次数：约 5 秒后放弃，避免无限循环
const DEFAULT_CAMERA_PITCH = -90; // 默认俯仰角：垂直向下观察地面
const DEFAULT_SMOOTHING = 0.15; // 默认平滑系数：平衡响应速度与流畅度

interface InternalOptions {
  entity: Entity;
  width: number;
  height: number;
  position: POVWidgetPosition;
  offset?: { x: number; y: number };
  heightOffset: number;
  fovSync: boolean;
  smoothing: number;
  container: Element;
}

/**
 * POVWidget - 第一视角同步组件
 *
 * 使用独立 Viewer 实现第一视角同步，原因：
 * 1. 隔离渲染：POV 视角不影响主视图渲染性能
 * 2. 独立 FOV：可同步 entity 的 frustum FOV 而非主相机 FOV
 * 3. 无交互：仅作为视角预览，pointer-events: none
 */
export class POVWidget extends Widget {
  private _options: InternalOptions;
  private _povViewer: Viewer | null = null;
  private _destroyed = false;
  private _lastFov: number = -1;
  private _positionInitialized = false;
  private _orientationWarned = false;
  private _imageryRetryCount = 0;
  private _imageryRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(viewer: Viewer, options: POVWidgetOptions) {
    const wrapper = DomUtil.createDom(
      'div',
      'cesium-pov-widget',
      options.container ?? viewer.container,
    );

    super(viewer, wrapper);

    // 验证 entity 必须有 position
    if (!options.entity.position) {
      console.warn('POVWidget: entity must have a position property');
    }

    this._options = {
      entity: options.entity,
      width: options.width ?? DEFAULT_WIDTH,
      height: options.height ?? DEFAULT_HEIGHT,
      position: options.position ?? DEFAULT_POSITION,
      offset: options.offset,
      heightOffset: options.heightOffset ?? 0,
      fovSync: options.fovSync ?? true,
      smoothing: options.smoothing ?? DEFAULT_SMOOTHING,
      container: options.container ?? viewer.container,
    };

    this._applyStyle();
    this.enabled = true;
  }

  private _applyStyle(): void {
    const { width, height, offset, position } = this._options;
    this._wrapper.style.width = `${width}px`;
    this._wrapper.style.height = `${height}px`;
    this._wrapper.classList.add(position);

    if (offset?.x !== undefined) {
      this._wrapper.style[position.includes('left') ? 'left' : 'right'] =
        `${offset.x}px`;
    }
    if (offset?.y !== undefined) {
      this._wrapper.style[position.includes('top') ? 'top' : 'bottom'] =
        `${offset.y}px`;
    }
  }

  protected _mountContent(): void {
    const povContainer = DomUtil.createDom(
      'div',
      'pov-viewer-container',
      this._wrapper,
    );

    // 创建 POV Viewer（3D 模式，禁用所有控件）
    this._povViewer = new Viewer(povContainer, {
      sceneMode: SceneMode.SCENE3D,
      baseLayer: false, // 禁用默认底图，稍后同步
      baseLayerPicker: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
    });

    // 隐藏 Cesium Ion credit
    const creditContainer = this._povViewer.cesiumWidget.creditContainer;
    if (creditContainer instanceof HTMLElement) {
      creditContainer.style.display = 'none';
    }

    // 同步主视图的影像层
    this._syncImageryLayers();

    // 同步时钟
    this._syncClock();

    // 注册视角同步监听器
    this._povViewer.scene.preRender.addEventListener(this._syncPOV);

    this._ready = true;
  }

  /** 同步主视图的影像层到 POV */
  private _syncImageryLayers(): void {
    if (!this._povViewer || this._destroyed) return;

    const mainLayers = this._viewer.scene.imageryLayers;
    const povLayers = this._povViewer.scene.imageryLayers;

    // 检查主视图是否有可用的影像层
    let hasValidProvider = false;
    for (let i = 0; i < mainLayers.length; i++) {
      if (mainLayers.get(i).imageryProvider) {
        hasValidProvider = true;
        break;
      }
    }

    // 如果主视图还没准备好，延迟重试（带限制）
    if (!hasValidProvider) {
      if (this._imageryRetryCount < MAX_IMAGERY_RETRIES) {
        this._imageryRetryCount++;
        this._imageryRetryTimeout = setTimeout(
          () => this._syncImageryLayers(),
          IMAGERY_RETRY_INTERVAL,
        );
      }
      return;
    }

    // 清空 POV 现有层
    povLayers.removeAll();

    // 添加主视图的所有影像层
    for (let i = 0; i < mainLayers.length; i++) {
      const layer = mainLayers.get(i);
      if (layer.imageryProvider) {
        povLayers.addImageryProvider(layer.imageryProvider);
      }
    }
  }

  /** 同步 POV 时钟到主视图时钟 */
  private _syncClock(): void {
    if (!this._povViewer) return;

    this._povViewer.clock.startTime = this._viewer.clock.startTime.clone();
    this._povViewer.clock.currentTime = this._viewer.clock.currentTime.clone();
    this._povViewer.clock.clockRange = this._viewer.clock.clockRange;
    this._povViewer.clock.clockStep = this._viewer.clock.clockStep;
    this._povViewer.clock.multiplier = this._viewer.clock.multiplier;

    // 监听主视图时钟变化
    this._viewer.clock.onTick.addEventListener(this._onClockTick);
  }

  /** 时钟同步回调 */
  private _onClockTick = (): void => {
    if (!this._povViewer) return;
    JulianDate.clone(
      this._viewer.clock.currentTime,
      this._povViewer.clock.currentTime,
    );
  };

  /** 同步视角到 Entity（每帧执行） */
  private _syncPOV = (): void => {
    if (!this._povViewer || this._destroyed) return;

    const entity = this._options.entity;
    if (!entity.position) return;

    const time = this._viewer.clock.currentTime;

    // 获取 Entity 位置
    const position = entity.position.getValue(time);
    if (!position) return;

    // 获取 Entity 朝向
    const orientation = entity.orientation?.getValue(time);

    // 计算相机目标位置
    Cartographic.fromCartesian(position, undefined, scratchCartographic);
    const targetHeight =
      scratchCartographic.height + this._options.heightOffset;
    Cartesian3.fromRadians(
      scratchCartographic.longitude,
      scratchCartographic.latitude,
      targetHeight,
      undefined,
      scratchPosition,
    );

    const camera = this._povViewer.camera;

    if (orientation) {
      // 使用 entity orientation 计算目标视线方向和上方方向
      const orientMatrix = Matrix3.fromQuaternion(
        orientation,
        scratchOrientMatrix,
      );
      const targetDir = Matrix3.multiplyByVector(
        orientMatrix,
        Cartesian3.UNIT_Z,
        scratchDirection,
      );
      const targetUp = Matrix3.multiplyByVector(
        orientMatrix,
        Cartesian3.UNIT_Y,
        scratchUp,
      );

      // 首帧直接跳转，后续帧 lerp 平滑跟随
      if (!this._positionInitialized) {
        this._positionInitialized = true;
        camera.setView({
          destination: scratchPosition,
          orientation: { direction: targetDir, up: targetUp },
        });
      } else {
        const t = this._options.smoothing;
        Cartesian3.lerp(
          camera.position,
          scratchPosition,
          t,
          scratchSmoothedPosition,
        );
        Cartesian3.lerp(
          camera.direction,
          targetDir,
          t,
          scratchSmoothedDirection,
        );
        Cartesian3.normalize(
          scratchSmoothedDirection,
          scratchSmoothedDirection,
        );
        Cartesian3.lerp(camera.up, targetUp, t, scratchSmoothedUp);
        Cartesian3.normalize(scratchSmoothedUp, scratchSmoothedUp);

        camera.setView({
          destination: scratchSmoothedPosition,
          orientation: {
            direction: scratchSmoothedDirection,
            up: scratchSmoothedUp,
          },
        });
      }
    } else {
      if (!this._orientationWarned) {
        console.warn(
          'POVWidget: entity has no orientation, using default pitch (-90°, looking down). ' +
            'This may cause incorrect camera view if entity has intended orientation.',
        );
        this._orientationWarned = true;
      }

      if (!this._positionInitialized) {
        this._positionInitialized = true;
        camera.setView({
          destination: scratchPosition,
          orientation: {
            heading: 0,
            pitch: CMath.toRadians(DEFAULT_CAMERA_PITCH),
            roll: 0,
          },
        });
      } else {
        const t = this._options.smoothing;
        Cartesian3.lerp(
          camera.position,
          scratchPosition,
          t,
          scratchSmoothedPosition,
        );
        camera.setView({
          destination: scratchSmoothedPosition,
          orientation: {
            heading: 0,
            pitch: CMath.toRadians(DEFAULT_CAMERA_PITCH),
            roll: 0,
          },
        });
      }
    }

    // FOV 同步（仅当 entity 有 frustum 属性且 fovSync=true）
    if (this._options.fovSync && entity.frustum instanceof FrustumGraphics) {
      const frustum = entity.frustum;
      const fov = frustum.fov?.getValue(time);
      if (fov !== undefined) {
        const cameraFrustum = this._povViewer.camera.frustum;
        if ('fov' in cameraFrustum) {
          const fovRad = CMath.toRadians(fov);
          if (this._lastFov !== fovRad) {
            cameraFrustum.fov = fovRad;
            this._lastFov = fovRad;
          }
        }
      }
    }
  };

  protected _unbindEvent(): void {
    // 取消待执行的 imagery 重试
    if (this._imageryRetryTimeout) {
      clearTimeout(this._imageryRetryTimeout);
      this._imageryRetryTimeout = null;
    }

    // 移除时钟监听
    this._viewer.clock.onTick.removeEventListener(this._onClockTick);

    // 移除视角同步监听
    if (this._povViewer) {
      this._povViewer.scene.preRender.removeEventListener(this._syncPOV);
    }
  }

  destroy(): void {
    if (this._destroyed) return;

    this.enabled = false;

    // 清理 timeout（额外保障，_unbindEvent 已处理）
    if (this._imageryRetryTimeout) {
      clearTimeout(this._imageryRetryTimeout);
      this._imageryRetryTimeout = null;
    }

    if (this._povViewer && !this._povViewer.isDestroyed()) {
      this._povViewer.destroy();
      this._povViewer = null;
    }

    this._ready = false;
    this._destroyed = true;
  }

  get povViewer(): Viewer | null {
    return this._povViewer;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }
}
