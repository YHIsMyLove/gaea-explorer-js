import { Viewer } from 'cesium';
import React, { useEffect } from 'react';
import { GeoJsonRenderConfig } from '@gaea-explorer/gaea-explorer-js';

import { initMap, PUBLIC_BASE } from '@/utils/initMap';
import { addGeojsonByDataSource, addGeojsonByPrimitive } from './bubble-auto';

const config: GeoJsonRenderConfig = {
  type: 'point',
  style: {
    sprite: {
      url: `${PUBLIC_BASE}sprite/sprite@2x.png`,
    },
    type: 'bubble',
    config: {
      field: 'MAG',
      'fill-type': 'multi',
      'section-type': 'average',
      'section-num': 10,
      'label-size': [10, 40],
      'circle-stroke-width': 1,
      'circle-stroke-color': 'white',
      colors: [
        '#313695',
        '#4575b4',
        '#74add1',
        '#abd9e9',
        '#e0f3f8',
        '#ffffbf',
        '#fee090',
        '#fdae61',
        '#f46d43',
        '#d73027',
        '#a50026',
      ],
      'label-type': 'icon',
      'icon-image': 'aerialway',
    },
  },
};

let viewer: Viewer;
const Map: React.FC = () => {
  useEffect(() => {
    viewer = initMap('cesiumContainer3');
    addGeojsonByPrimitive(viewer, `${PUBLIC_BASE}earthquack.geojson`, config);

    return () => {
      viewer?.destroy();
    };
  }, []);

  return <div id="cesiumContainer3" />;
};

export default Map;
