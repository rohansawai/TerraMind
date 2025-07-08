'use client';

import { useState, useEffect } from 'react';
import { Layers, Eye, EyeOff, Settings, Download } from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  color: string;
  type: 'fill' | 'line' | 'point';
}

export function LayerPanel() {
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: 'states',
      name: 'US States',
      description: 'Administrative boundaries of US states and territories',
      visible: true,
      color: '#e5e7eb',
      type: 'fill'
    },
    {
      id: 'coastline',
      name: 'Coastlines',
      description: 'Coastal boundaries and shorelines',
      visible: true,
      color: '#3b82f6',
      type: 'line'
    },
    {
      id: 'cities',
      name: 'Cities',
      description: 'Major cities and populated places',
      visible: false,
      color: '#ef4444',
      type: 'point'
    },
    {
      id: 'rivers',
      name: 'Rivers',
      description: 'Major rivers and watercourses',
      visible: false,
      color: '#0ea5e9',
      type: 'line'
    },
    {
      id: 'lakes',
      name: 'Lakes',
      description: 'Lakes and water bodies',
      visible: false,
      color: '#06b6d4',
      type: 'fill'
    }
  ]);

  const toggleLayer = (layerId: string) => {
    setLayers(prev => 
      prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, visible: !layer.visible }
          : layer
      )
    );
  };

  const getVisibleLayersCount = () => {
    return layers.filter(layer => layer.visible).length;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <Layers className="w-5 h-5 mr-2" />
          Data Layers
        </h2>
        <p className="text-sm text-gray-600">
          {getVisibleLayersCount()} of {layers.length} layers visible
        </p>
      </div>

      {/* Layer List */}
      <div className="space-y-3">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: layer.color }}
                ></div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {layer.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {layer.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleLayer(layer.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Layer settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Download layer data"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="capitalize">{layer.type}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                layer.visible 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {layer.visible ? 'Visible' : 'Hidden'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Layer Controls */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setLayers(prev => prev.map(l => ({ ...l, visible: true })))}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Show All
          </button>
          <button
            onClick={() => setLayers(prev => prev.map(l => ({ ...l, visible: false })))}
            className="flex-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Hide All
          </button>
        </div>
      </div>

      {/* Layer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">About These Layers</h3>
        <p className="text-xs text-blue-700">
          All data is sourced from Natural Earth, a public domain map dataset. 
          These layers provide the foundation for spatial analysis and queries.
        </p>
      </div>
    </div>
  );
} 