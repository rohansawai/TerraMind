'use client';

import { useState } from 'react';
import { MapPin, Globe, Zap, BarChart3, Layers, Search, Play, Download } from 'lucide-react';
import { SpatialMap } from '@/components/SpatialMap';
import { LayerPanel } from '@/components/LayerPanel';
import { ResultsPanel } from '@/components/ResultsPanel';

// NLQInput for the Query tab
function NLQInput({ onResults }: { onResults: (results: any) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/nlq-polygon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.polygon) {
        onResults({
          results: [
            {
              geometry: data.polygon.geometry,
              properties: data.polygon.properties || {},
            }
          ]
        });
      } else {
        alert(data.error || 'No results');
      }
    } catch (err) {
      setLoading(false);
      alert('Error processing query');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        className="flex-1 border rounded px-3 py-2 text-gray-900"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Ask a spatial question (e.g. 5 miles border between VA and WV)"
        disabled={loading}
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Ask'}
      </button>
    </form>
  );
}

export default function TerraMind() {
  const [activeTab, setActiveTab] = useState<'query' | 'layers' | 'results'>('query');
  const [queryResults, setQueryResults] = useState<any>(null);
  const [showCaNvBorderBuffer, setShowCaNvBorderBuffer] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TerraMind</h1>
                <p className="text-sm text-gray-500">AI-Native Spatial IDE</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Ready</span>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('query')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'query'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Search className="w-4 h-4 mr-2 inline" />
              Query
            </button>
            <button
              onClick={() => setActiveTab('layers')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'layers'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-4 h-4 mr-2 inline" />
              Layers
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'results'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />
              Results
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'query' && (
              <div className="p-4">
                {/* NLQInput replaces QueryInterface here */}
                <NLQInput onResults={setQueryResults} />
              </div>
            )}
            {activeTab === 'layers' && <LayerPanel />}
            {activeTab === 'results' && <ResultsPanel />}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          <SpatialMap isProcessing={false} queryResults={queryResults} showCaNvBorderBuffer={showCaNvBorderBuffer} />
          {/* Map Controls Overlay (optional) */}
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-white rounded-lg shadow-lg p-2 space-y-2">
              <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                onClick={() => setShowCaNvBorderBuffer(true)}
                title="Show 10-mile buffer around CA-NV border">
                <span className="sr-only">Show CA-NV Border Buffer</span>
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

