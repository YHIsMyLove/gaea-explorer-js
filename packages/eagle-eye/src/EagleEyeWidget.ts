import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  Entity,
  HeadingPitchRoll,
  ImageryLayer,
  JulianDate,
  Math as CMath,
  SceneMode,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium';

import SyncViewer from '@gaea-explorer/sync-viewer';
import { DomUtil, Widget } from '@gaea-explorer/common';
import { FrustumGraphics } from '@gaea-explorer/graphics-extends';

import { ViewRect } from './ViewRect';
import './styles/eagle-eye.scss';

import type { EagleEyeOptions, EagleEyePosition, SyncEntityViewOptions, SyncFrustumViewOptions } from './typings';

const DEFAULT_WIDTH = 150;
const DEFAULT_HEIGHT = 150;
const DEFAULT_POSITION: EagleEyePosition = 'bottom-right';
const DEFAULT_FLY_DURATION = 0.5;

interface InternalOptions {
  width: number;
  height: number;
  position: EagleEyePosition;
  offset?: { x?: number; y?: number };
  orientation?: { heading?: number; pitch?: number; roll?: number };
  syncOrientation: boolean;
  showViewRect: boolean;
  viewRectColor: Color | string;
  viewRectFillOpacity: number;
  baseLayerPicker: boolean;
  percentageChanged: number;
  flyDuration: number;
  container: Element;
  syncEntityView?: SyncEntityViewOptions;
  syncFrustumView?: SyncFrustumViewOptions;
}

/**
 * 鹰眼小地图组件
 * 使用 SyncViewer 实现双向同步，额外提供视野矩形和点击跳转功能
 */
export class EagleEyeWidget extends Widget {
  private _options: InternalOptions;
  private _eagleViewer: Viewer | null = null;
  private _syncViewer: SyncViewer | null = null;
  private _viewRect: ViewRect | null = null;
  private _eagleHandler: ScreenSpaceEventHandler | null = null;
  private _destroyed = false;

  constructor(viewer: Viewer, options: EagleEyeOptions = {}) {
    const wrapper = DomUtil.createDom(
      'div',
      'cesium-eagle-eye',
      options.container ?? viewer.container,
    );

    super(viewer, wrapper);

    this._options = {
      width: options.width ?? DEFAULT_WIDTH,
      height: options.height ?? DEFAULT_HEIGHT,
      position: options.position ?? DEFAULT_POSITION,
      offset: options.offset,
      orientation: options.orientation,
      syncOrientation: options.syncOrientation ?? !options.orientation,
      showViewRect: options.showViewRect ?? true,
      viewRectColor: options.viewRectColor ?? Color.YELLOW.withAlpha(0.3),
      viewRectFillOpacity: options.viewRectFillOpacity ?? 0.1,
      baseLayerPicker: options.baseLayerPicker ?? false,
      percentageChanged: options.percentageChanged ?? 0.01,
      flyDuration: options.flyDuration ?? DEFAULT_FLY_DURATION,
      container: options.container ?? viewer.container,
      syncEntityView: options.syncEntityView,
      syncFrustumView: options.syncFrustumView,
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
    const eagleContainer = DomUtil.createDom(
      'div',
      'eagle-eye-container',
      this._wrapper,
    );

    const imageryLayers = this._viewer.scene.imageryLayers;

    // 创建鹰眼 Viewer，不设置默认底图（稍后同步）
    this._eagleViewer = new Viewer(eagleContainer, {
      sceneMode: SceneMode.COLUMBUS_VIEW,
      baseLayer: false, // 禁用默认底图
      baseLayerPicker: this._options.baseLayerPicker,
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
    const creditContainer = this._eagleViewer.cesiumWidget.creditContainer;
    if (creditContainer instanceof HTMLElement) {
      creditContainer.style.display = 'none';
    }

    // 同步主视图的所有影像层
    this._syncImageryLayers();

    // 使用 SyncViewer 实现双向同步
    this._syncViewer = new SyncViewer(this._viewer, this._eagleViewer, {
      percentageChanged: this._options.percentageChanged,
    });

    // 创建视野矩形
    if (this._options.showViewRect) {
      this._viewRect = new ViewRect({
        viewer: this._eagleViewer,
        color: this._options.viewRectColor,
        fillOpacity: this._options.viewRectFillOpacity,
      });
    }

    // 鹰眼交互
    this._eagleHandler = new ScreenSpaceEventHandler(
      this._eagleViewer.scene.canvas,
    );

    // 监听主地图相机变化，更新视野矩形和自定义 orientation
    this._viewer.camera.changed.addEventListener(this._onMainCameraChanged);

    // 监听主地图影像层变化，同步到鹰眼
    imageryLayers.layerAdded.addEventListener(this._onLayerAdded);
    imageryLayers.layerRemoved.addEventListener(this._onLayerRemoved);
    imageryLayers.layerMoved.addEventListener(this._onLayerMoved);

    // 注册视角同步监听器
    if (this._options.syncEntityView || this._options.syncFrustumView) {
      this._eagleViewer.scene.preRender.addEventListener(this._syncEntityView);
    }

    this._ready = true;
    this._applyCustomOrientation();
  }

  /** 同步主视图的影像层到鹰眼 */
  private _syncImageryLayers(): void {
    if (!this._eagleViewer) return;

    const mainLayers = this._viewer.scene.imageryLayers;
    const eagleLayers = this._eagleViewer.scene.imageryLayers;

    // 检查主视图是否有可用的影像层
    let hasValidProvider = false;
    for (let i = 0; i < mainLayers.length; i++) {
      if (mainLayers.get(i).imageryProvider) {
        hasValidProvider = true;
        break;
      }
    }

    // 如果主视图还没准备好，延迟重试
    if (!hasValidProvider) {
      setTimeout(() => this._syncImageryLayers(), 100);
      return;
    }

    // 清空鹰眼现有层
    eagleLayers.removeAll();

    // 添加主视图的所有影像层
    for (let i = 0; i < mainLayers.length; i++) {
      const layer = mainLayers.get(i);
      if (layer.imageryProvider) {
        eagleLayers.addImageryProvider(layer.imageryProvider);
      }
    }
  }

  protected _bindEvent(): void {
    if (this._eagleHandler) {
      // 鹰眼点击跳转
      this._eagleHandler.setInputAction(
        this._onEagleClick,
        ScreenSpaceEventType.LEFT_CLICK,
      );
    }
  }

  protected _unbindEvent(): void {
    this._viewer.camera.changed.removeEventListener(this._onMainCameraChanged);

    // 移除影像层监听
    const imageryLayers = this._viewer.scene.imageryLayers;
    imageryLayers.layerAdded.removeEventListener(this._onLayerAdded);
    imageryLayers.layerRemoved.removeEventListener(this._onLayerRemoved);
    imageryLayers.layerMoved.removeEventListener(this._onLayerMoved);

    // 移除视角同步监听器
    if (this._eagleViewer) {
      this._eagleViewer.scene.preRender.removeEventListener(this._syncEntityView);
    }

    if (this._eagleHandler) {
      this._eagleHandler.destroy();
      this._eagleHandler = null;
    }
  }

  private _onMainCameraChanged = (): void => {
    this._updateViewRect();
    if (!this._options.syncOrientation && this._options.orientation) {
      this._applyCustomOrientation();
    }
  };

  private _onEagleClick = (event: { position: Cartesian2 }): void => {
    if (!this._eagleViewer) return;

    const cartesian = this._eagleViewer.scene.camera.pickEllipsoid(
      event.position,
    );
    if (cartesian) {
      this._flyToPosition(cartesian);
    }
  };

  private _flyToPosition(cartesian: Cartesian3): void {
    const cartographic =
      this._viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
    const height = this._viewer.camera.positionCartographic.height;

    this._viewer.camera.flyTo({
      destination: Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        height,
      ),
      duration: this._options.flyDuration,
    });
  }

  private _applyCustomOrientation(): void {
    if (
      !this._eagleViewer ||
      this._options.syncOrientation ||
      !this._options.orientation
    )
      return;

    const heading = CMath.toRadians(this._options.orientation.heading ?? 0);
    const pitch = CMath.toRadians(this._options.orientation.pitch ?? -90);
    const roll = CMath.toRadians(this._options.orientation.roll ?? 0);

    this._eagleViewer.camera.setView({
      destination: this._eagleViewer.camera.position,
      orientation: { heading, pitch, roll },
    });
  }

  private _updateViewRect(): void {
    if (!this._viewRect) return;
    this._viewRect.update(this._viewer.camera.computeViewRectangle());
  }

  private _onLayerAdded = (layer: ImageryLayer): void => {
    if (!this._eagleViewer) return;
    this._eagleViewer.scene.imageryLayers.addImageryProvider(
      layer.imageryProvider,
    );
  };

  private _onLayerRemoved = (layer: ImageryLayer): void => {
    if (!this._eagleViewer) return;
    // 尝试找到并移除对应的层
    const eagleLayers = this._eagleViewer.scene.imageryLayers;
    for (let i = 0; i < eagleLayers.length; i++) {
      const eagleLayer = eagleLayers.get(i);
      if (eagleLayer.imageryProvider === layer.imageryProvider) {
        eagleLayers.remove(eagleLayer);
        break;
      }
    }
  };

  private _onLayerMoved = (): void => {
    if (!this._eagleViewer) return;
    // 同步层的顺序（通过重新排序）
    const mainLayers = this._viewer.scene.imageryLayers;
    const eagleLayers = this._eagleViewer.scene.imageryLayers;
    // 简单处理：保持相同的长度和相对顺序
    // 实际实现可能需要更复杂的逻辑
  };

  /** 上一次同步的位置（用于变更检测） */
  private _lastSyncPosition: Cartesian3 | null = null;

  /** 统一的相机同步方法 */
  private _syncCameraView(
    entity: Entity,
    time: JulianDate,
    heightOffset: number = 0,
  ): boolean {
    if (!this._eagleViewer) return false;

    const position = entity.position?.getValue(time);
    if (!position) return false;

    // 变更检测：位置变化小于阈值时跳过
    if (
      this._lastSyncPosition &&
      Cartesian3.equalsEpsilon(position, this._lastSyncPosition, 0.001)
    ) {
      return false;
    }
    this._lastSyncPosition = Cartesian3.clone(position);

    // 计算目标位置
    const cartographic = Cartographic.fromCartesian(position);
    const targetPosition = Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height + heightOffset,
    );

    // 设置相机位置和朝向
    const orientation = entity.orientation?.getValue(time);
    if (orientation) {
      const hpr = HeadingPitchRoll.fromQuaternion(orientation);
      this._eagleViewer.camera.setView({
        destination: targetPosition,
        orientation: { heading: hpr.heading, pitch: hpr.pitch, roll: hpr.roll },
      });
    } else {
      this._eagleViewer.camera.setView({ destination: targetPosition });
    }

    return true;
  }

  /** 同步 Entity 视角 */
  private _syncEntityView = (): void => {
    // 优先处理 syncFrustumView
    if (this._options.syncFrustumView) {
      this._syncFrustumView();
      return;
    }

    if (!this._eagleViewer || !this._options.syncEntityView) return;

    const { entity, heightOffset = 0 } = this._options.syncEntityView;
    this._syncCameraView(entity, this._eagleViewer.clock.currentTime, heightOffset);
  };

  /** 同步 Frustum 视角 */
  private _syncFrustumView = (): void => {
    if (!this._eagleViewer || !this._options.syncFrustumView) return;

    const { entity } = this._options.syncFrustumView;
    const time = this._eagleViewer.clock.currentTime;

    // 检查 entity 是否有 frustum 属性
    const frustum = entity.frustum;
    if (!(frustum instanceof FrustumGraphics)) return;

    // 同步相机位置
    this._syncCameraView(entity, time, 0);

    // 同步 frustum 参数到相机
    const frustumCamera = this._eagleViewer.camera.frustum;
    if (frustumCamera) {
      const fov = frustum.fov?.getValue(time);
      const near = frustum.near?.getValue(time);
      const far = frustum.far?.getValue(time);

      if ('fov' in frustumCamera && fov !== undefined) {
        frustumCamera.fov = CMath.toRadians(fov);
      }
      if ('near' in frustumCamera && near !== undefined) {
        frustumCamera.near = near;
      }
      if ('far' in frustumCamera && far !== undefined) {
        frustumCamera.far = far;
      }
    }
  };

  get eagleViewer(): Viewer | null {
    return this._eagleViewer;
  }

  get syncEnabled(): boolean {
    return this._syncViewer?.synchronous ?? false;
  }

  set syncEnabled(enabled: boolean) {
    if (this._syncViewer) {
      this._syncViewer.synchronous = enabled;
    }
  }

  destroy(): void {
    if (this._destroyed) return;

    this.enabled = false;

    if (this._syncViewer) {
      this._syncViewer.destroy();
      this._syncViewer = null;
    }

    if (this._viewRect) {
      this._viewRect.destroy();
      this._viewRect = null;
    }

    if (this._eagleViewer && !this._eagleViewer.isDestroyed()) {
      this._eagleViewer.destroy();
      this._eagleViewer = null;
    }

    this._ready = false;
    this._destroyed = true;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }
}
