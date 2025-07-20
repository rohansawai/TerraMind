"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Search, Play, MessageCircle, FileCode } from "lucide-react";
import MonacoEditor from "@monaco-editor/react";
import { SpatialMap } from "@/components/SpatialMap";

function ChatTab({ code, setCode }: { code: string; setCode: (val: string) => void }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<string>("");
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
      <div className="flex-1 overflow-y-auto border rounded p-2 bg-gray-50 text-gray-700 text-sm mb-2 border-gray-200">
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
            <div className="inline-block px-3 py-2 rounded-lg bg-gray-200 text-gray-900 animate-pulse">Thinking...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 bg-white text-gray-900 border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type a request for code..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
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
      // --- Auto-detect raster or vector ---
      let isRaster = false;
      let isVector = false;
      let tileUrl = null;
      let bbox = null;
      let geojson = null;
      if (data.tile_url) {
        isRaster = true;
        tileUrl = data.tile_url;
        bbox = data.bbox || null;
      } else if (typeof data.stdout === "string") {
        try {
          const parsed = JSON.parse(data.stdout);
          if (parsed && (parsed.type === "FeatureCollection" || parsed.type === "Feature" || parsed.features)) {
            isVector = true;
            geojson = parsed;
          } else if (parsed.tile_url) {
            isRaster = true;
            tileUrl = parsed.tile_url;
            bbox = parsed.bbox || null;
          }
        } catch {
          if (data.stdout.includes("{z}") && data.stdout.includes("{x}") && data.stdout.includes("{y}")) {
            isRaster = true;
            tileUrl = data.stdout.trim();
          }
        }
      }
      if (isRaster) {
        setGeeTileUrl(tileUrl);
        setBbox(bbox);
        setImportedLayer(null);
      } else if (isVector) {
        setImportedLayer(geojson);
        setGeeTileUrl(null);
        setBbox(null);
      }
    } catch (err) {
      setRunError("Failed to run code");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-2 border-b border-gray-200 bg-gray-50">
        <span className="font-mono text-xs text-gray-700">script.py</span>
        <button
          className="px-4 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-60"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? "Running..." : <><Play className="w-4 h-4 mr-1 inline" />Run</>}
        </button>
      </div>
      <div className="flex-1">
        <MonacoEditor
          height="300px"
          width="100%"
          language="python"
          theme="vs-light"
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
      <div className="border-t border-gray-200 bg-gray-50 text-xs font-mono shadow-inner overflow-y-auto p-2" style={{ minHeight: 80 }}>
        {output && (
          <div>
            <div><strong>stdout:</strong> <pre className="whitespace-pre-wrap text-green-700">{output.stdout}</pre></div>
            {output.stderr && <div className="text-yellow-700"><strong>stderr:</strong> <pre className="whitespace-pre-wrap">{output.stderr}</pre></div>}
            <div><strong>exit code:</strong> {output.exit_code}</div>
          </div>
        )}
        {runError && <div className="text-red-600 mt-2">{runError}</div>}
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">TerraMind</h1>
          <span className="ml-3 flex items-center space-x-1 text-xs text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
            <span>Ready</span>
          </span>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <MessageCircle className="w-4 h-4 mr-2 inline" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "code"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <FileCode className="w-4 h-4 mr-2 inline" />
              Python Code
            </button>
          </div>
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "chat" && <ChatTab code={code} setCode={setCode} />}
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