"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Search, Play, MessageCircle, FileCode } from "lucide-react";
import MonacoEditor from "@monaco-editor/react";
import { SpatialMap } from "@/components/SpatialMap";
import React from "react";

function ChatTab({ code, setCode, messages, setMessages, context, setContext }: {
  code: string;
  setCode: (val: string) => void;
  messages: { role: string; content: string }[];
  setMessages: React.Dispatch<React.SetStateAction<{ role: string; content: string }[]>>;
  context: string;
  setContext: React.Dispatch<React.SetStateAction<string>>;
}) {
  // Remove local state for messages and context
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userPrompt = input.trim();
    if (!userPrompt) return;
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: userPrompt }]);
    setInput("");
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt,
          previousCode: code,
          chatHistory: [...messages, { role: "user", content: userPrompt }],
          metadata: { projectType: "GEE Python" },
          previousContext: context,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate script");
      const data = await res.json();
      setCode(data.code);
      setContext(data.context || "");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.explanation || "No explanation provided." },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: " + (err?.message || "Failed to generate code") },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm mb-2 border-gray-200 dark:border-gray-700">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-3 ${msg.role === "user" ? "text-right" : "text-left"}`}>
            <div
              className={`inline-block px-3 py-2 rounded-lg max-w-[80%] break-words shadow-sm
                ${msg.role === "user"
                  ? "bg-blue-100 text-blue-900"
                  : "bg-gray-200 text-gray-900"}
              `}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="mb-3 text-left">
            <div className="inline-block px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 animate-pulse">Thinking...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 pb-2 px-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-md">
        <input
          className="flex-1 border rounded px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type a request for code..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-semibold shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function PythonCodeTab({ code, setCode, setGeeTileUrl, setBbox, setImportedLayer }: {
  code: string;
  setCode: (val: string) => void;
  setGeeTileUrl: (url: string | null) => void;
  setBbox: (bbox: [number, number, number, number] | null) => void;
  setImportedLayer: (geojson: any | null) => void;
}) {
  const [output, setOutput] = useState<{ stdout: string; stderr: string; exit_code: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [codeHeight, setCodeHeight] = useState(200); // px
  const [dragging, setDragging] = useState(false);

  // Set default code/output ratio to 70:30 on mount
  React.useEffect(() => {
    const container = document.getElementById('python-code-tab-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      setCodeHeight(Math.floor(rect.height * 0.7));
    }
  }, []);

  // Helper to parse backend output for raster/vector
  function parseBackendOutput(stdout: string) {
    // Try to find a tile URL
    const tileUrlMatch = stdout.match(/Tile URL:\s*(.*)/);
    const bboxMatch = stdout.match(/Bounding box:\s*(\[[\s\S]*?\])/);
    let tileUrl = tileUrlMatch ? tileUrlMatch[1].trim() : null;
    let bbox = null;
    if (bboxMatch) {
      try {
        const arr = JSON.parse(bboxMatch[1]);
        // If it's a polygon (array of arrays), flatten to [minLng, minLat, maxLng, maxLat]
        if (Array.isArray(arr) && Array.isArray(arr[0])) {
          // Remove duplicate last point if present (closed polygon)
          const coords = arr.length > 4 && arr[0][0] === arr[arr.length-1][0] && arr[0][1] === arr[arr.length-1][1]
            ? arr.slice(0, -1)
            : arr;
          const lons = coords.map((pt: any) => pt[0]);
          const lats = coords.map((pt: any) => pt[1]);
          bbox = [
            Math.min(...lons),
            Math.min(...lats),
            Math.max(...lons),
            Math.max(...lats)
          ];
        } else if (Array.isArray(arr) && arr.length === 4) {
          bbox = arr;
        }
      } catch {}
    }
    // Try to find GeoJSON (vector)
    let geojson = null;
    try {
      // Look for a line that is valid JSON and has type FeatureCollection or Feature
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          const parsed = JSON.parse(line);
          if (parsed && (parsed.type === 'FeatureCollection' || parsed.type === 'Feature' || parsed.features)) {
            geojson = parsed;
            break;
          }
        }
      }
    } catch {}
    return { tileUrl, bbox, geojson };
  }

  const handleRun = async () => {
    setIsRunning(true);
    setRunError(null);
    setOutput(null);
    setGeeTileUrl(null);
    setBbox(null);
    setImportedLayer(null);
    try {
      const res = await fetch("http://localhost:8000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setOutput(data);
      // --- Use backend-provided bbox if available ---
      if (data.tile_url) {
        setGeeTileUrl(data.tile_url);
        setBbox(Array.isArray(data.bbox) && data.bbox.length === 4 ? data.bbox : null);
        setImportedLayer(null);
      } else if (data.geojson) {
        setImportedLayer(data.geojson);
        setGeeTileUrl(null);
        setBbox(null);
      }
    } catch (err) {
      setRunError("Failed to run code");
    } finally {
      setIsRunning(false);
    }
  };

  // Draggable splitter handlers
  const onMouseDown = () => {
    setDragging(true);
    document.body.style.cursor = 'row-resize';
  };
  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const container = document.getElementById('python-code-tab-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          let newHeight = e.clientY - rect.top - 48; // 48px for header
          newHeight = Math.max(80, Math.min(newHeight, rect.height - 80));
          setCodeHeight(newHeight);
        }
      }
    };
    const onMouseUp = () => {
      setDragging(false);
      document.body.style.cursor = '';
    };
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  return (
    <div id="python-code-tab-container" className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      {/* Code Section */}
      <div style={{ height: codeHeight }} className="flex flex-col">
        <div className="flex items-center justify-between px-2 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <span className="font-mono text-xs text-gray-700 dark:text-gray-300">script.py</span>
          <button
            className="px-4 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-60"
            onClick={handleRun}
            disabled={isRunning}
          >
            {isRunning ? "Running..." : <><Play className="w-4 h-4 mr-1 inline" />Run</>}
          </button>
        </div>
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto">
          <MonacoEditor
            height="100%"
            width="100%"
            language="python"
            theme={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs-light'}
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>
      {/* Draggable Splitter */}
      <div
        className="h-2 cursor-row-resize bg-gray-200 dark:bg-gray-800 hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors"
        onMouseDown={onMouseDown}
        style={{ zIndex: 10 }}
        title="Drag to resize"
      />
      {/* Output Section */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 min-h-[64px]">
        <div className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">Output</div>
        <div className="flex-1 overflow-y-auto p-3 text-xs font-mono shadow-inner text-gray-900 dark:text-gray-100">
          {output && (
            <div>
              <div><strong>stdout:</strong> <pre className="whitespace-pre-wrap text-green-700 dark:text-green-400">{output.stdout}</pre></div>
              {output.stderr && <div className="text-yellow-700 dark:text-yellow-300"><strong>stderr:</strong> <pre className="whitespace-pre-wrap">{output.stderr}</pre></div>}
              <div><strong>exit code:</strong> {output.exit_code}</div>
            </div>
          )}
          {runError && <div className="text-red-600 dark:text-red-400 mt-2">{runError}</div>}
        </div>
      </div>
    </div>
  );
}

export default function TerraMindApp() {
  const [activeTab, setActiveTab] = useState<'chat' | 'code'>("chat");
  const [code, setCode] = useState<string>("# Write or generate your GEE Python code here\n");
  const [geeTileUrl, setGeeTileUrl] = useState<string | null>(null);
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null);
  const [importedLayer, setImportedLayer] = useState<any>(null);
  // --- Chat state lifted up ---
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [context, setContext] = useState<string>("");
  // --- Sidebar width state for draggable splitter ---
  const [sidebarWidth, setSidebarWidth] = useState(384); // default 384px (w-96)
  const draggingSidebar = useRef(false);

  // Mouse event handlers for sidebar resizing
  const onSidebarDrag = (e: React.MouseEvent) => {
    draggingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
  };
  const onSidebarDragEnd = () => {
    draggingSidebar.current = false;
    document.body.style.cursor = '';
  };
  const onSidebarDragMove = (e: MouseEvent) => {
    if (draggingSidebar.current) {
      // Minimum 240px, maximum 600px
      const newWidth = Math.max(240, Math.min(e.clientX, 600));
      setSidebarWidth(newWidth);
    }
  };
  // Attach/detach listeners
  React.useEffect(() => {
    if (draggingSidebar.current) {
      window.addEventListener('mousemove', onSidebarDragMove);
      window.addEventListener('mouseup', onSidebarDragEnd);
    } else {
      window.removeEventListener('mousemove', onSidebarDragMove);
      window.removeEventListener('mouseup', onSidebarDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onSidebarDragMove);
      window.removeEventListener('mouseup', onSidebarDragEnd);
    };
  }, [draggingSidebar.current]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-4 py-2 flex items-center space-x-3 min-h-0" style={{ minHeight: 0 }}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">TerraMind</h1>
          <span className="ml-3 flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
            <span>Ready</span>
          </span>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col"
          style={{ width: sidebarWidth, minWidth: 240, maxWidth: 600 }}
        >
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-gray-800"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <MessageCircle className="w-4 h-4 mr-2 inline" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "code"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-gray-800"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <FileCode className="w-4 h-4 mr-2 inline" />
              Python Code
            </button>
          </div>
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "chat" && (
              <ChatTab
                code={code}
                setCode={setCode}
                messages={messages}
                setMessages={setMessages}
                context={context}
                setContext={setContext}
              />
            )}
            {activeTab === "code" && (
              <PythonCodeTab
                code={code}
                setCode={setCode}
                setGeeTileUrl={setGeeTileUrl}
                setBbox={setBbox}
                setImportedLayer={setImportedLayer}
              />
            )}
          </div>
        </div>
        {/* Draggable Divider */}
        <div
          className="w-2 cursor-col-resize bg-gray-200 dark:bg-gray-800 hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors"
          onMouseDown={onSidebarDrag}
          style={{ zIndex: 20 }}
          title="Drag to resize sidebar"
        />
        {/* Map Area */}
        <div className="flex-1 relative">
          <SpatialMap
            isProcessing={false}
            importedLayer={importedLayer}
            geeTileUrl={geeTileUrl}
            bbox={bbox}
          />
        </div>
      </div>
    </div>
  );
}