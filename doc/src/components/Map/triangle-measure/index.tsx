import { Cartesian3, CesiumTerrainProvider, Math as CMath } from 'cesium';
import React, { useEffect, useRef, useState } from 'react';

import { initMap } from '@/utils/initMap';
import { TriangleMeasure } from '@gaea-explorer/gaea-explorer-js';
import './index.less';

const Map: React.FC = () => {
  const viewerRef = useRef<ReturnType<typeof initMap>>();
  const measureRef = useRef<TriangleMeasure>();
  const [active, setActive] = useState(false);

  const toggleMeasure = () => {
    if (!viewerRef.current) return;

    if (active) {
      measureRef.current?.end();
      measureRef.current = undefined;
      setActive(false);
      return;
    }

    measureRef.current = new TriangleMeasure(viewerRef.current, {
      units: 'kilometers',
      locale: {
        start: '起点',
        total: '总计',
        area: '面积',
        formatLength: (length, unitedLength) => {
          if (length < 1000) {
            return `${length}米`;
          }
          return `${unitedLength}千米`;
        },
      },
      drawerOptions: {
        tips: {
          init: '点击高处点开始',
          start: '点击斜边终点完成测量',
        },
      },
    });
    measureRef.current.start();
    setActive(true);
  };

  const clear = () => {
    measureRef.current?.end();
  };

  useEffect(() => {
    viewerRef.current = initMap('triangleMeasureContainer');

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
    <div
      id="triangleMeasureContainer"
      className="triangle-measure-container"
    >
      <div className="tools">
        <button className={active ? 'active' : ''} onClick={toggleMeasure}>
          {active ? '停止三角测量' : '三角测量'}
        </button>
        <button onClick={clear}>清除</button>
      </div>
    </div>
  );
};

export default Map;
