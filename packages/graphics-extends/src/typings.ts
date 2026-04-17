import type { FrustumGraphics } from './frustum/FrustumGraphics';
import type { FrustumGraphicsConstructorOptions } from './frustum/typings';

declare module 'cesium' {
  /**
   * 扩展 Entity 类型，添加 frustum 属性
   */
  interface Entity {
    frustum?: FrustumGraphics;
  }

  /**
   * 扩展 Entity 构造选项
   */
  interface EntityConstructorOptions {
    frustum?: FrustumGraphics | FrustumGraphicsConstructorOptions;
  }
}
