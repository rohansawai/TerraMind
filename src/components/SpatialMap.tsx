'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface SpatialMapProps {
  isProcessing: boolean;
  queryResults?: any;
  showCaNvBorderBuffer?: boolean;
  importedLayer?: any;
  geeTileUrl?: string | null;
  bbox?: [number, number, number, number] | null;
}

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export function SpatialMap({ isProcessing, queryResults, showCaNvBorderBuffer, importedLayer, geeTileUrl, bbox }: SpatialMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [savedPolygons, setSavedPolygons] = useState<any[]>([]);

  // Load saved polygons on component mount
  useEffect(() => {
    const saved = localStorage.getItem('terramind-saved-polygons');
    if (saved) {
      try {
        setSavedPolygons(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved polygons:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
      maxZoom: 22,
      minZoom: 2,
      trackResize: true,
      attributionControl: false
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Initialize draw controls
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#088',
            'fill-outline-color': '#088',
            'fill-opacity': 0.1
          }
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#088',
            'line-dasharray': [0.2, 2],
            'line-width': 2
          }
        },
        // Polygon vertices
        {
          id: 'gl-draw-polygon-and-line-vertex-halo-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 12,
            'circle-color': '#FFF'
          }
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#088'
          }
        }
      ]
    });

    // Add draw controls to map
    map.current.addControl(draw.current, 'top-left');

    // Handle map load
    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Handle draw events
    if (draw.current && map.current) {
      map.current.on('draw.update', (e: any) => {
        const data = draw.current?.getAll();
        if (data && data.features.length > 0) {
          console.log('Polygon updated:', data.features[0]);
          // You can emit this to parent component if needed
        }
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Toggle edit mode
  const toggleEditMode = () => {
    if (!draw.current || !map.current) return;
    
    setEditMode(!editMode);
    if (!editMode) {
      // Enter edit mode - add current polygon to draw
      if (queryResults && queryResults.results && queryResults.results.length > 0) {
        const polygon = queryResults.results[0];
        draw.current.add({
          type: 'Feature',
          geometry: polygon.geometry,
          properties: polygon.properties
        });
      }
    } else {
      // Exit edit mode - clear draw
      draw.current.deleteAll();
    }
  };

  // Download edited polygon
  const downloadPolygon = () => {
    if (!draw.current) return;
    
    const data = draw.current.getAll();
    if (data.features.length === 0) {
      alert('No polygon to download');
      return;
    }

    const polygon = data.features[0];
    const geoJSON = {
      type: 'FeatureCollection',
      features: [polygon]
    };

    const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited-polygon.geojson';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save edited polygon
  const savePolygon = () => {
    if (!draw.current) return;
    
    const data = draw.current.getAll();
    if (data.features.length === 0) {
      alert('No polygon to save');
      return;
    }

    const polygon = data.features[0];
    const polygonName = prompt('Enter a name for this polygon:', `Polygon ${new Date().toLocaleDateString()}`);
    
    if (!polygonName) return;

    const savedPolygon = {
      id: Date.now().toString(),
      name: polygonName,
      timestamp: new Date().toISOString(),
      data: polygon,
      originalQuery: queryResults?.originalQuery || 'Unknown'
    };

    const updatedSaved = [...savedPolygons, savedPolygon];
    setSavedPolygons(updatedSaved);
    localStorage.setItem('terramind-saved-polygons', JSON.stringify(updatedSaved));
    
    alert(`Polygon "${polygonName}" saved successfully!`);
  };

  // Load a saved polygon
  const loadPolygon = (savedPolygon: any) => {
    if (!draw.current) return;
    
    // Clear current draw
    draw.current.deleteAll();
    
    // Add the saved polygon
    draw.current.add(savedPolygon.data);
    
    // Enter edit mode
    setEditMode(true);
    
    alert(`Loaded polygon: ${savedPolygon.name}`);
  };

  // Delete a saved polygon
  const deleteSavedPolygon = (id: string) => {
    const updatedSaved = savedPolygons.filter(p => p.id !== id);
    setSavedPolygons(updatedSaved);
    localStorage.setItem('terramind-saved-polygons', JSON.stringify(updatedSaved));
  };

  // Show query results on the map when they change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (!queryResults) return;

    // Remove previous result layers
    if (map.current.getLayer('query-results-lines')) {
      map.current.removeLayer('query-results-lines');
    }
    if (map.current.getLayer('query-results-points')) {
      map.current.removeLayer('query-results-points');
    }
    if (map.current.getLayer('query-results-border')) {
      map.current.removeLayer('query-results-border');
    }
    if (map.current.getLayer('query-results')) {
      map.current.removeLayer('query-results');
    }
    if (map.current.getSource('query-results')) {
      map.current.removeSource('query-results');
    }

    // Handle spatial results from Turf.js
    if (queryResults.results && queryResults.results.length > 0) {
      // Convert results array to GeoJSON format
      const geoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: queryResults.results.map((result: any) => ({
          type: 'Feature',
          geometry: result.geometry,
          properties: result.properties
        }))
      };
      
      map.current.addSource('query-results', {
        type: 'geojson',
        data: geoJSON
      });

      // Add fill layer for polygons
      map.current.addLayer({
        id: 'query-results',
        type: 'fill',
        source: 'query-results',
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': 0.6
        },
        filter: ['==', ['geometry-type'], 'Polygon']
      });

      // Add line layer for borders
      map.current.addLayer({
        id: 'query-results-border',
        type: 'line',
        source: 'query-results',
        paint: {
          'line-color': '#059669',
          'line-width': 2
        },
        filter: ['==', ['geometry-type'], 'Polygon']
      });

      // Add line layer for lines (rivers, etc.)
      map.current.addLayer({
        id: 'query-results-lines',
        type: 'line',
        source: 'query-results',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3
        },
        filter: ['==', ['geometry-type'], 'LineString']
      });

      // Add point layer for points (cities, etc.)
      map.current.addLayer({
        id: 'query-results-points',
        type: 'circle',
        source: 'query-results',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ef4444',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        },
        filter: ['==', ['geometry-type'], 'Point']
      });

      // Fit map to result bounds
      const bounds = new mapboxgl.LngLatBounds();
      geoJSON.features.forEach((feature: any) => {
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates[0].forEach((coord: any) => {
            bounds.extend(coord as [number, number]);
          });
        } else if (feature.geometry.type === 'LineString') {
          feature.geometry.coordinates.forEach((coord: any) => {
            bounds.extend(coord as [number, number]);
          });
        } else if (feature.geometry.type === 'Point') {
          bounds.extend(feature.geometry.coordinates as [number, number]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50 });
      }
    }
  }, [queryResults, mapLoaded]);

  // --- Add raster tile layer for GEE tile URL ---
  useEffect(() => {
    if (!map.current || !mapLoaded) {
      console.log('Map not ready. mapLoaded:', mapLoaded, 'map.current:', !!map.current);
      return;
    }

    console.log('geeTileUrl:', geeTileUrl);
    console.log('bbox:', bbox);

    // Remove previous raster layer/source if they exist
    if (map.current.getLayer('gee-raster')) {
      map.current.removeLayer('gee-raster');
      console.log('Removed previous gee-raster layer');
    }
    if (map.current.getSource('gee-raster')) {
      map.current.removeSource('gee-raster');
      console.log('Removed previous gee-raster source');
    }

    if (geeTileUrl) {
      map.current.addSource('gee-raster', {
        type: 'raster',
        tiles: [geeTileUrl],
        tileSize: 256,
      });
      map.current.addLayer({
        id: 'gee-raster',
        type: 'raster',
        source: 'gee-raster',
        paint: {
          'raster-opacity': 1,
        },
      }); // Add on top
      console.log('Added gee-raster source and layer');

      // Fit to bbox if provided and valid
      if (
        bbox &&
        bbox.length === 4 &&
        bbox.every((v) => typeof v === 'number' && isFinite(v))
      ) {
        const bounds: [[number, number], [number, number]] = [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ];
        map.current.fitBounds(bounds, { padding: 40 });
        console.log('Fitted map to bbox:', bounds);
      }
    }
  }, [geeTileUrl, bbox, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Edit Controls */}
      {queryResults && queryResults.results && queryResults.results.length > 0 && (
        <div className="absolute top-4 left-4 z-20">
          <div className="bg-white rounded-lg shadow-lg p-2 space-y-2">
            <button
              onClick={toggleEditMode}
              className={`w-8 h-8 flex items-center justify-center rounded ${
                editMode 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={editMode ? 'Exit Edit Mode' : 'Edit Polygon'}
            >
              <span className="sr-only">Edit Polygon</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {editMode && (
              <>
                <button
                  onClick={savePolygon}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Save Edited Polygon"
                >
                  <span className="sr-only">Save</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </button>
                <button
                  onClick={downloadPolygon}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Download Edited Polygon"
                >
                  <span className="sr-only">Download</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Saved Polygons Panel */}
      {savedPolygons.length > 0 && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Saved Polygons</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {savedPolygons.map((polygon) => (
                <div key={polygon.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{polygon.name}</p>
                    <p className="text-xs text-gray-500">{new Date(polygon.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => loadPolygon(polygon)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Load Polygon"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteSavedPolygon(polygon.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete Polygon"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map attribution */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white bg-opacity-90 px-2 py-1 rounded">
        © Mapbox © OpenStreetMap contributors
      </div>
    </div>
  );
} 