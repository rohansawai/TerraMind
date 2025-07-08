'use client';

import { useState } from 'react';
import { Search, Play, Sparkles, Lightbulb, Copy, Download } from 'lucide-react';

interface QueryInterfaceProps {
  onProcessingChange: (processing: boolean) => void;
  onResultsChange?: (results: any) => void;
}

const EXAMPLE_QUERIES = [
  "coastline within 15 miles of California",
  "states that border Texas",
];

export function QueryInterface({ onProcessingChange, onResultsChange }: QueryInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsProcessing(true);
    setError(null);
    onProcessingChange(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process query');
      }

      setResults(data);
      if (onResultsChange) onResultsChange(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
      onProcessingChange(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Spatial Query</h2>
        <p className="text-sm text-gray-600">
          Ask questions about geographic data in natural language
        </p>
      </div>

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Natural Language Query
          </label>
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., coastline within 15 miles of California"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              rows={3}
              disabled={isProcessing}
            />
            <div className="absolute top-3 right-3">
              <Sparkles className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isProcessing || !query.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Execute Query</span>
            </>
          )}
        </button>
      </form>

      {/* Example Queries */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
          Example Queries
        </h3>
        <div className="space-y-2">
          {EXAMPLE_QUERIES.map((example, index) => (
            <button
              key={index}
              onClick={() => setQuery(example)}
              className="block w-full text-left text-sm text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-green-800">Query Results</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(results.sql)}
                className="text-green-600 hover:text-green-800"
                title="Copy SQL"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => {/* TODO: Download GeoJSON */}}
                className="text-green-600 hover:text-green-800"
                title="Download Results"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-green-700">Method:</span>
              <span className="text-xs text-green-600 ml-2 capitalize">{results.method}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-green-700">Confidence:</span>
              <span className="text-xs text-green-600 ml-2">{(results.confidence * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-xs font-medium text-green-700">Operation:</span>
              <span className="text-xs text-green-600 ml-2">{results.operation}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-green-700">Explanation:</span>
              <p className="text-xs text-green-600 mt-1">{results.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">Error</h3>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
} 