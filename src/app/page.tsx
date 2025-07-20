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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-950 dark:to-blue-900 font-sans">
      {/* Hero Section */}
      <section className="w-full max-w-3xl text-center py-24 px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
          TerraMind: The AI-Native Spatial IDE
        </h1>
        <p className="text-lg md:text-2xl text-gray-700 dark:text-gray-200 mb-8">
          Instantly turn natural language into powerful geospatial analysis and interactive maps.<br />
          Powered by Google Earth Engine and next-gen AI.
        </p>
        <a
          href="/app"
          className="inline-block bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg px-8 py-4 rounded-lg shadow-lg hover:from-blue-700 hover:to-cyan-600 transition mb-4"
        >
          Try the Demo
        </a>
        <div className="mt-4 text-gray-500 dark:text-gray-400 text-sm">
          <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold mr-2">Now Open for Investor Demos</span>
        </div>
      </section>

      {/* Product Highlights */}
      <section className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 py-12 px-6">
        <div className="flex flex-col items-center text-center">
          <div className="bg-blue-100 text-blue-700 rounded-full p-4 mb-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20l9-5-9-5-9 5 9 5z" /><path d="M12 12V4m0 0L3 9m9-5l9 5" /></svg>
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">AI Code Generation</h3>
          <p className="text-gray-600 dark:text-gray-300">Generate Python geospatial scripts from plain English. No coding required.</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="bg-cyan-100 text-cyan-700 rounded-full p-4 mb-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2v20" /></svg>
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Google Earth Engine Integration</h3>
          <p className="text-gray-600 dark:text-gray-300">Analyze and visualize global-scale geospatial data in seconds.</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="bg-green-100 text-green-700 rounded-full p-4 mb-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2 4 4 8-8 2 2-10 10z" /></svg>
          </div>
          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Instant Map Results</h3>
          <p className="text-gray-600 dark:text-gray-300">See your results on an interactive map, instantly shareable and embeddable.</p>
        </div>
      </section>

      {/* Why TerraMind? */}
      <section className="w-full max-w-3xl py-12 px-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why TerraMind?</h2>
        <p className="text-gray-700 dark:text-gray-200 text-lg mb-6">
          TerraMind is revolutionizing geospatial analysis for enterprises, governments, and researchers. Our AI-native platform makes advanced spatial analytics accessible to everyone, not just GIS experts.
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-6">
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">10x Faster Insights</h3>
            <p className="text-gray-600 dark:text-gray-300">From question to map in seconds, not days.</p>
          </div>
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="font-semibold text-cyan-700 dark:text-cyan-400 mb-2">No-Code, No Limits</h3>
            <p className="text-gray-600 dark:text-gray-300">Empower your team to run advanced analyses without writing code.</p>
          </div>
        </div>
      </section>

      {/* Team & Vision */}
      <section className="w-full max-w-3xl py-12 px-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Vision</h2>
        <p className="text-gray-700 dark:text-gray-200 text-lg mb-6">
          We believe the future of geospatial intelligence is AI-driven, collaborative, and accessible to all. TerraMind is building the platform to make that future a reality.
        </p>
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400 text-sm">Built by a passionate team of AI, GIS, and cloud experts.</span>
        </div>
      </section>

      {/* Contact/CTA */}
      <section className="w-full max-w-2xl py-12 px-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Interested in Investing or Partnering?</h2>
        <p className="text-gray-700 dark:text-gray-200 mb-6">Contact us for a demo, partnership, or to learn more about our vision for AI-powered geospatial intelligence.</p>
        <a
          href="mailto:founder@terramind.ai"
          className="inline-block bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-lg px-8 py-4 rounded-lg shadow-lg hover:from-blue-700 hover:to-cyan-600 transition"
        >
          Contact the Founders
        </a>
      </section>
    </main>
  );
}

