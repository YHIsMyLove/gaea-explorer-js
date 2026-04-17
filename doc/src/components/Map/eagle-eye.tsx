import { Viewer } from 'cesium';
import React, { useEffect, useRef } from 'react';
import { EagleEyeWidget } from '@gaea-explorer/gaea-explorer-js';

import { initMap } from '../../utils/initMap';
import './index.less';

interface MapProps {}

let viewer: Viewer;
const Map: React.FC<MapProps> = () => {
  const eagleEyeRef = useRef<EagleEyeWidget>();

  useEffect(() => {
    viewer = initMap('cesiumContainer');

    // 创建鹰眼小地图
    eagleEyeRef.current = new EagleEyeWidget(viewer, {
      width: 200,
      height: 150,
      position: 'bottom-right',
      offset: { x: 10, y: 10 },
      showViewRect: true,
      flyDuration: 0.5,
    });

    return () => {
      eagleEyeRef.current?.destroy();
      viewer?.destroy();
    };
  }, []);

  return <div id="cesiumContainer" />;
};

export default Map;