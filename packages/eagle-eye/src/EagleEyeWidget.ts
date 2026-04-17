import {
  Cartesian2,
  Cartesian3,
  Color,
  Math as CMath,
  Matrix4,
  Rectangle,
  SceneMode,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer,
} from 'cesium';

import { DomUtil, Widget } from '@gaea-explorer/common';

import { ViewRect } from './ViewRect';
import './styles/eagle-eye.scss';

import type { EagleEyeOptions, EagleEyePosition } from './typings';

const DEFAULT_WIDTH = 150;
const DEFAULT_HEIGHT = 150;
const DEFAULT_POSITION: EagleEyePosition = 'bottom-right';
const DEFAULT_PERCENTAGE_CHANGED = 0.01;
const DEFAULT_FLY_DURATION = 0.5;

/**
 * 鹰眼小地图组件
 * 用于同步显示主地图视角位置，支持双向交互
 */
export class EagleEyeWidget extends Widget {
  private _options: EagleEyeOptions;
  private _eagleViewer: Viewer | null = null;
  private _viewRect: ViewRect | null = null;
  private _mainHandler: ScreenSpaceEventHandler;
  private _eagleHandler: ScreenSpaceEventHandler | null = null;
  private _currentOperation: 'main' | 'eagle' = 'main';
  private _originPercentageChanged: number;
  private _syncEnabled = true;
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
      viewRectColor: options.viewRectColor,
      viewRectFillOpacity: options.viewRectFillOpacity,
      baseLayerPicker: options.baseLayerPicker ?? false,
      percentageChanged: options.percentageChanged ?? DEFAULT_PERCENTAGE_CHANGED,
      flyDuration: options.flyDuration ?? DEFAULT_FLY_DURATION,
      container: options.container,
    };

    // 保存原始 percentageChanged
    this._originPercentageChanged = viewer.camera.percentageChanged;

    // 创建主地图交互处理器
    this._mainHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    // 设置样式
    this._applyStyle();

    // 启用组件
    this.enabled = true;
  }

  /**
   * 应用样式
   */
  private _applyStyle(): void {
    const { width, height, offset } = this._options;
    const position = this._options.position ?? DEFAULT_POSITION;
    this._wrapper.style.width = `${width}px`;
    this._wrapper.style.height = `${height}px`;
    this._wrapper.classList.add(position);

    if (offset) {
      const pos = position ?? DEFAULT_POSITION;
      if (offset.x !== undefined) {
        if (pos.includes('left')) {
          this._wrapper.style.left = `${offset.x}px`;
        } else {
          this._wrapper.style.right = `${offset.x}px`;
        }
      }
      if (offset.y !== undefined) {
        if (pos.includes('top')) {
          this._wrapper.style.top = `${offset.y}px`;
        } else {
          this._wrapper.style.bottom = `${offset.y}px`;
        }
      }
    }
  }

  /**
   * 挂载内容
   */
  protected _mountContent(): void {
    // 创建鹰眼 Viewer 容器
    const eagleContainer = DomUtil.createDom('div', 'eagle-eye-container', this._wrapper);

    // 创建鹰眼 Viewer
    this._eagleViewer = new Viewer(eagleContainer, {
      sceneMode: SceneMode.COLUMBUS_VIEW,
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

    // 设置鹰眼相机 percentageChanged
    this._eagleViewer.camera.percentageChanged = this._options.percentageChanged as number;

    // 创建视野矩形
    if (this._options.showViewRect && this._eagleViewer) {
      this._viewRect = new ViewRect({
        viewer: this._eagleViewer,
        color: this._options.viewRectColor as Color | string,
        fillOpacity: this._options.viewRectFillOpacity,
      });
    }

    // 创建鹰眼交互处理器
    if (this._eagleViewer) {
      this._eagleHandler = new ScreenSpaceEventHandler(this._eagleViewer.scene.canvas);
    }

    this._ready = true;

    // 初始同步
    this._syncToEagleEye();
  }

  /**
   * 绑定事件
   */
  protected _bindEvent(): void {
    // 主地图鼠标移动检测
    this._mainHandler.setInputAction(() => {
      this._currentOperation = 'main';
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // 主地图相机变化
    this._viewer.camera.percentageChanged = this._options.percentageChanged as number;
    this._viewer.camera.changed.addEventListener(this._onMainCameraChanged);

    // 鹰眼鼠标移动检测
    if (this._eagleHandler) {
      this._eagleHandler.setInputAction(() => {
        this._currentOperation = 'eagle';
        // 解除鹰眼视角锁定
        if (this._viewer.scene.mode !== SceneMode.MORPHING) {
          this._viewer.scene.camera.lookAtTransform(Matrix4.IDENTITY);
        }
      }, ScreenSpaceEventType.MOUSE_MOVE);

      // 鹰眼点击跳转
      this._eagleHandler.setInputAction(this._onEagleClick, ScreenSpaceEventType.LEFT_CLICK);
    }

    // 鹰眼相机变化（反向同步）
    if (this._eagleViewer) {
      this._eagleViewer.camera.changed.addEventListener(this._onEagleCameraChanged);
    }
  }

  /**
   * 解绑事件
   */
  protected _unbindEvent(): void {
    this._viewer.camera.percentageChanged = this._originPercentageChanged;
    this._viewer.camera.changed.removeEventListener(this._onMainCameraChanged);

    if (this._eagleHandler) {
      this._eagleHandler.destroy();
      this._eagleHandler = null;
    }

    if (this._eagleViewer) {
      this._eagleViewer.camera.changed.removeEventListener(this._onEagleCameraChanged);
    }
  }

  /**
   * 主地图相机变化回调
   */
  private _onMainCameraChanged = (): void => {
    if (this._currentOperation === 'main' && this._syncEnabled) {
      this._syncToEagleEye();
    }
  };

  /**
   * 鹰眼相机变化回调
   */
  private _onEagleCameraChanged = (): void => {
    if (this._currentOperation === 'eagle' && this._syncEnabled) {
      this._syncToMain();
    }
  };

  /**
   * 鹰眼点击回调
   */
  private _onEagleClick = (event: { position: Cartesian2 }): void => {
    if (!this._eagleViewer) return;

    const position = this._eagleViewer.scene.pick(event.position);
    if (!position) {
      // 点击空白区域，使用 pickEllipsoid 获取地球位置
      const cartesian = this._eagleViewer.scene.camera.pickEllipsoid(event.position);
      if (cartesian) {
        this._flyToPosition(cartesian);
      }
    }
  };

  /**
   * 飞行到指定位置
   */
  private _flyToPosition(cartesian: Cartesian3): void {
    const cartographic = this._viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
    const height = this._viewer.camera.positionCartographic.height;

    this._viewer.camera.flyTo({
      destination: Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height),
      duration: this._options.flyDuration as number,
    });
  }

  /**
   * 同步主地图视角到鹰眼
   */
  private _syncToEagleEye(): void {
    if (!this._eagleViewer || !this._syncEnabled) return;

    const viewPoint = this._getViewPoint(this._viewer);
    const orientation = this._getEagleOrientation(viewPoint.orientation);

    if (this._viewer.scene.mode !== SceneMode.SCENE3D && viewPoint.worldPosition) {
      this._eagleViewer.scene.camera.lookAt(
        viewPoint.worldPosition,
        new Cartesian3(0, 0, viewPoint.height),
      );
    } else {
      this._eagleViewer.scene.camera.setView({
        destination: viewPoint.destination,
        orientation: orientation,
      });
    }

    // 更新视野矩形
    this._updateViewRect();
  }

  /**
   * 同步鹰眼视角到主地图
   */
  private _syncToMain(): void {
    if (!this._eagleViewer || !this._syncEnabled) return;

    const viewPoint = this._getViewPoint(this._eagleViewer);

    if (this._eagleViewer.scene.mode !== SceneMode.SCENE3D && viewPoint.worldPosition) {
      this._viewer.scene.camera.lookAt(
        viewPoint.worldPosition,
        new Cartesian3(0, 0, viewPoint.height),
      );
    } else {
      this._viewer.scene.camera.setView({
        destination: viewPoint.destination,
        orientation: viewPoint.orientation,
      });
    }
  }

  /**
   * 获取鹰眼朝向
   */
  private _getEagleOrientation(mainOrientation: { heading: number; pitch: number; roll: number }): { heading: number; pitch: number; roll: number } {
    if (this._options.orientation) {
      return {
        heading: CMath.toRadians(this._options.orientation.heading ?? CMath.toDegrees(mainOrientation.heading)),
        pitch: CMath.toRadians(this._options.orientation.pitch ?? CMath.toDegrees(mainOrientation.pitch)),
        roll: CMath.toRadians(this._options.orientation.roll ?? CMath.toDegrees(mainOrientation.roll)),
      };
    }

    if (this._options.syncOrientation) {
      return mainOrientation;
    }

    // 默认俯视
    return {
      heading: 0,
      pitch: CMath.toRadians(-90),
      roll: 0,
    };
  }

  /**
   * 获取视角信息
   */
  private _getViewPoint(viewer: Viewer): {
    worldPosition: Cartesian3 | undefined;
    height: number;
    destination: Cartesian3;
    orientation: { heading: number; pitch: number; roll: number };
  } {
    const camera = viewer.camera;
    const viewCenter = new Cartesian2(
      Math.floor(viewer.canvas.clientWidth / 2),
      Math.floor(viewer.canvas.clientHeight / 2),
    );
    const worldPosition = viewer.scene.camera.pickEllipsoid(viewCenter);

    return {
      worldPosition,
      height: camera.positionCartographic.height,
      destination: camera.position.clone(),
      orientation: {
        heading: camera.heading,
        pitch: camera.pitch,
        roll: camera.roll,
      },
    };
  }

  /**
   * 更新视野矩形
   */
  private _updateViewRect(): void {
    if (!this._viewRect || !this._options.showViewRect) return;

    const rectangle = this._computeViewRectangle();
    this._viewRect.update(rectangle);
  }

  /**
   * 计算视野矩形
   */
  private _computeViewRectangle(): Rectangle | undefined {
    return this._viewer.camera.computeViewRectangle();
  }

  /**
   * 设置同步状态
   */
  set syncEnabled(enabled: boolean) {
    this._syncEnabled = enabled;
  }

  get syncEnabled(): boolean {
    return this._syncEnabled;
  }

  /**
   * 获取鹰眼 Viewer
   */
  get eagleViewer(): Viewer | null {
    return this._eagleViewer;
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this._destroyed) return;

    this.enabled = false;

    // 销毁视野矩形
    if (this._viewRect) {
      this._viewRect.destroy();
      this._viewRect = null;
    }

    // 销毁鹰眼 Viewer
    if (this._eagleViewer && !this._eagleViewer.isDestroyed()) {
      this._eagleViewer.destroy();
      this._eagleViewer = null;
    }

    // 销毁主地图处理器
    if (this._mainHandler && !this._mainHandler.isDestroyed()) {
      this._mainHandler.destroy();
    }

    this._ready = false;
    this._destroyed = true;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }
}