import { Viewer } from 'cesium';
import React, { useEffect, useRef } from 'react';
import { POVWidget } from '@gaea-explorer/gaea-explorer-js';

import { initMap } from '../../utils/initMap';
import './index.less';

interface MapProps {}

let viewer: Viewer;
const Map: React.FC<MapProps> = () => {
  const uavRef = useRef<POVWidget>();

  useEffect(() => {
    viewer = initMap('cesiumContainer');

    uavRef.current = new POVWidget(viewer, {
      width: 200,
      height: 150,
      position: 'bottom-right',
      offset: { x: 10, y: 10 },
    });

    return () => {
      uavRef.current?.destroy();
      viewer?.destroy();
    };
  }, []);

  return <div id="cesiumContainer" />;
};

export default Map;
