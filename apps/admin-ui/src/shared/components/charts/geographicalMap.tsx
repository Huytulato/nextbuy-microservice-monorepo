'use client'
import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface MapMarker {
  name: string;
  coordinates: [number, number];
  value: number;
}

interface GeographicalMapProps {
  markers?: MapMarker[];
}

const GeographicalMap: React.FC<GeographicalMapProps> = ({ markers = [] }) => {
  return (
    <div className="w-full h-[300px] bg-white rounded-lg">
      <ComposableMap projectionConfig={{ scale: 147 }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#e5e7eb"
                stroke="#d1d5db"
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: '#9ca3af' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>
        {markers.map((marker, index) => (
          <Marker key={index} coordinates={marker.coordinates}>
            <circle r={8} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
            <text
              textAnchor="middle"
              y={-15}
              style={{ fontFamily: 'system-ui', fill: '#374151', fontSize: '12px' }}
            >
              {marker.name}
            </text>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
};

export default GeographicalMap;
