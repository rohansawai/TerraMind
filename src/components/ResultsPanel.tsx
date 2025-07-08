'use client';

import { useState } from 'react';
import { BarChart3, Download, Share2, Filter, Calendar, MapPin } from 'lucide-react';

interface QueryResult {
  id: string;
  query: string;
  timestamp: string;
  method: 'template' | 'ai';
  confidence: number;
  operation: string;
  features: number;
  area?: number;
}

export function ResultsPanel() {
  const [results] = useState<QueryResult[]>([
    {
      id: '1',
      query: 'coastline within 15 miles of California',
      timestamp: '2024-01-15T10:30:00Z',
      method: 'template',
      confidence: 0.95,
      operation: 'BUFFER',
      features: 12,
      area: 245.6
    },
    {
      id: '2',
      query: 'cities within 50 miles of San Francisco',
      timestamp: '2024-01-15T10:25:00Z',
      method: 'ai',
      confidence: 0.87,
      operation: 'WITHIN',
      features: 8
    },
    {
      id: '3',
      query: 'states that border Texas',
      timestamp: '2024-01-15T10:20:00Z',
      method: 'template',
      confidence: 0.95,
      operation: 'TOUCHES',
      features: 4
    }
  ]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getMethodColor = (method: string) => {
    return method === 'template' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Query Results
        </h2>
        <p className="text-sm text-gray-600">
          {results.length} queries executed
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{results.length}</div>
          <div className="text-sm text-blue-700">Total Queries</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {(results.reduce((sum, r) => sum + r.confidence, 0) / results.length * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-green-700">Avg Confidence</div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Recent Queries</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
            <Filter className="w-4 h-4 mr-1" />
            Filter
          </button>
        </div>

        {results.map((result) => (
          <div
            key={result.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {result.query}
                </h4>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatTimestamp(result.timestamp)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getMethodColor(result.method)}`}>
                    {result.method.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Confidence:</span>
                <span className={`ml-1 font-medium ${getConfidenceColor(result.confidence)}`}>
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Operation:</span>
                <span className="ml-1 font-medium text-gray-900">{result.operation}</span>
              </div>
              <div>
                <span className="text-gray-500">Features:</span>
                <span className="ml-1 font-medium text-gray-900">{result.features}</span>
              </div>
            </div>

            {result.area && (
              <div className="mt-2 text-xs text-gray-500">
                <span>Area: {result.area} sq miles</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Export Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Export Results</h3>
        <div className="space-y-2">
          <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
            <Download className="w-4 h-4 mr-2" />
            Export All as GeoJSON
          </button>
          <button className="w-full px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Export Analytics Report
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Quick Actions</h3>
        <div className="space-y-2">
          <button className="w-full text-left text-sm text-blue-700 hover:text-blue-900 p-2 rounded hover:bg-blue-100 transition-colors">
            <MapPin className="w-4 h-4 mr-2 inline" />
            View on Map
          </button>
          <button className="w-full text-left text-sm text-blue-700 hover:text-blue-900 p-2 rounded hover:bg-blue-100 transition-colors">
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            Analyze Results
          </button>
        </div>
      </div>
    </div>
  );
} 