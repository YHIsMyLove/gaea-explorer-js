export { FrustumGraphics } from './frustum/FrustumGraphics';
export { FrustumVisualizer } from './frustum/FrustumVisualizer';
export type { FrustumGraphicsConstructorOptions } from './frustum/typings';

// FrustumPrimitive 不对外导出（内部实现）

// Module Augmentation 自动生效
import './typings';
