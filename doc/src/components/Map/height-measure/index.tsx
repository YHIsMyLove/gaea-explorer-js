import { Cartesian3, CesiumTerrainProvider, Math as CMath } from 'cesium';
import React, { useEffect, useRef, useState } from 'react';

import { initMap } from '@/utils/initMap';
import { HeightMeasure } from '@gaea-explorer/gaea-explorer-js';
import './index.less';

const Map: React.FC = () => {
  const viewerRef = useRef<ReturnType<typeof initMap>>();
  const measureRef = useRef<HeightMeasure>();
  const [active, setActive] = useState(false);

  const toggleMeasure = () => {
    if (!viewerRef.current) return;

    if (active) {
      measureRef.current?.end();
      measureRef.current = undefined;
      setActive(false);
      return;
    }

    measureRef.current = new HeightMeasure(viewerRef.current);
    measureRef.current.start();
    setActive(true);
  };

  const clear = () => {
    measureRef.current?.end();
  };

  useEffect(() => {
    viewerRef.current = initMap('heightMeasureContainer');

    CesiumTerrainProvider.fromIonAssetId(1).then((terrainProvider) => {
      if (viewerRef.current) {
        viewerRef.current.terrainProvider = terrainProvider;
        viewerRef.current.camera.setView({
          destination: Cartesian3.fromDegrees(120, 28, 50000),
          orientation: {
            heading: CMath.toRadians(0),
            pitch: CMath.toRadians(-45),
            roll: CMath.toRadians(0),
          },
        });
      }
    });

    return () => {
      measureRef.current?.destroy();
      measureRef.current = undefined;
      viewerRef.current?.destroy();
    };
  }, []);

  return (
    <div id="heightMeasureContainer" className="height-measure-container">
      <div className="tools">
        <button className={active ? 'active' : ''} onClick={toggleMeasure}>
          {active ? '停止高度测量' : '高度测量'}
        </button>
        <button onClick={clear}>清除</button>
      </div>
    </div>
  );
};

export default Map;
