// ... existing code ...
// Helper to call the generate-script API
async function generateScript({ userPrompt, previousCode, chatHistory, metadata }: {
  userPrompt: string,
  previousCode?: string,
  chatHistory?: { role: string, content: string }[],
  metadata?: any
}) {
  const res = await fetch('/api/generate-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt, previousCode, chatHistory, metadata })
  });
  if (!res.ok) throw new Error('Failed to generate script');
  const data = await res.json();
  return data.code;
}

// Real Chat Sidebar using OpenAI code generation
function ChatSidebar({ code, setCode }: { code: string, setCode: (val: string) => void }) {
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userPrompt = input.trim();
    if (!userPrompt) return;
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
    setInput('');
    try {
      const codeResult = await generateScript({
        userPrompt,
        previousCode: code,
        chatHistory: [...messages, { role: 'user', content: userPrompt }],
        metadata: { projectType: 'GEE Python' }
      });
      setCode(codeResult);
      setMessages(prev => [...prev, { role: 'assistant', content: codeResult }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (err?.message || 'Failed to generate code') }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-white dark:bg-gray-900 flex flex-col overflow-y-auto border-l border-gray-200 dark:border-gray-700">
      <div className="flex-1 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-100 text-sm mb-2 border-gray-200 dark:border-gray-700">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div
              className={`inline-block px-3 py-2 rounded-lg max-w-[80%] break-words shadow-sm
                ${msg.role === 'user'
                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-700 dark:text-blue-100'
                  : 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100'}
              `}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type a request for code..."
          value={input}
          onChange={e => setInput(e.target.value)}
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

// ... existing code ...
// In TerraMindApp, pass code and setCode to ChatSidebar
// ... existing code ...
            <div className="h-full w-full overflow-y-auto">
-              <ChatSidebar />
+              <ChatSidebar code={code} setCode={setCode} />
            </div>
// ... existing code ...