import React, { useMemo } from 'react';
import { useStore } from '../store';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';

import { MapPin, Clock } from 'lucide-react';

const emptyStyle = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0b0f19' } // Dark background to match our theme
    }
  ]
};

export const Phase4: React.FC = () => {
  const { blocks, routeGeoJSON } = useStore();

  const bounds = useMemo(() => {
    if (!blocks || blocks.length === 0) return null;
    const pois = blocks.filter(b => b.poi).map(b => b.poi!.geometry.coordinates);
    if (pois.length === 0) return null;
    
    const lons = pois.map(p => p[0]);
    const lats = pois.map(p => p[1]);
    
    // Add some padding
    return [
      [Math.min(...lons) - 0.01, Math.min(...lats) - 0.01],
      [Math.max(...lons) + 0.01, Math.max(...lats) + 0.01]
    ];
  }, [blocks]);

  return (
    <div className="phase4-container animate-fade-in">
      {/* Timeline Sidebar */}
      <div className="timeline-sidebar glass-panel custom-scrollbar">
        <h2 className="timeline-header">
          Your Deterministic Itinerary
        </h2>
        
        <div className="timeline">
          {blocks.map((block) => (
            <div key={block.id} className="timeline-item">
              <div className="timeline-icon">
                <Clock size={16} />
              </div>
              <div className="timeline-content">
                <div className="timeline-title-row">
                  <div className="timeline-title">{block.title}</div>
                  <time className="timeline-time">{block.startTime}</time>
                </div>
                <div className="timeline-meta">
                  {block.durationMinutes} mins
                  {block.type === 'poi' && block.poi && (
                    <span className="timeline-badge">
                      {block.poi.properties.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="map-area">
        <Map
          style={{ width: '100%', height: '100%' }}
          initialViewState={{
            longitude: -122.4194,
            latitude: 37.7749,
            zoom: 12,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bounds: bounds as any,
            fitBoundsOptions: { padding: 40 }
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mapStyle={emptyStyle as any}
        >
          {routeGeoJSON && (
            <Source id="route" type="geojson" data={routeGeoJSON}>
              <Layer
                id="route-line"
                type="line"
                paint={{
                  'line-color': '#00d2ff',
                  'line-width': 4,
                  'line-dasharray': [2, 2]
                }}
              />
            </Source>
          )}

          {blocks.filter(b => b.poi).map((b) => (
            <Marker 
              key={b.id} 
              longitude={b.poi!.geometry.coordinates[0]} 
              latitude={b.poi!.geometry.coordinates[1]}
              anchor="bottom"
            >
              <div className="marker-wrapper">
                <div className="marker-tooltip">
                  {b.startTime} - {b.title}
                </div>
                <MapPin className="text-secondary-color" size={32} style={{ color: 'var(--secondary-color)', filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))' }} />
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
};
