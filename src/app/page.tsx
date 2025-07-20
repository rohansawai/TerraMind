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

export default function LandingPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%)',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '48px 32px',
        maxWidth: 480,
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>
          TerraMind
        </h1>
        <p style={{ fontSize: 18, color: '#334155', marginBottom: 32 }}>
          The AI-Native Spatial IDE.<br />
          Query, analyze, and visualize geospatial data with natural language.
        </p>
        <a
          href="/app"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)',
            color: 'white',
            fontWeight: 600,
            fontSize: 18,
            padding: '16px 40px',
            borderRadius: 8,
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
            transition: 'background 0.2s',
          }}
        >
          Launch App
        </a>
      </div>
      <footer style={{ marginTop: 48, color: '#64748b', fontSize: 14 }}>
        &copy; {new Date().getFullYear()} TerraMind. All rights reserved.
      </footer>
    </main>
  );
}

