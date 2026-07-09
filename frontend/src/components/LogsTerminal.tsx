import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';

interface LogsTerminalProps {
  containerId: string;
  containerName: string;
}

export function LogsTerminal({ containerId, containerName }: LogsTerminalProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${containerName} — Logs`;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const es = new EventSource(`${apiUrl}/api/container-logs/${containerId}`);

    es.onmessage = (event) => {
      try {
        const line = JSON.parse(event.data);
        setLogs((prev) => {
          const updated = [...prev, line];
          return updated.length > 2000 ? updated.slice(-2000) : updated;
        });
      } catch {
        setLogs((prev) => [...prev, event.data]);
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [containerId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [logs]);

  return (
    <div className="h-screen w-screen bg-[#0c0c0c] text-green-400 flex flex-col font-mono text-sm">
      {/* Terminal bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-green-900/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-300 font-semibold">{containerName}</span>
          <span className="text-xs text-green-700">— logs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-600">streaming</span>
        </div>
      </div>

      {/* Prompt */}
      <div className="px-4 py-2 text-green-700 text-xs border-b border-green-900/20">
        $ docker logs -f {containerName}
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-auto p-4">
        {logs.length === 0 && (
          <div className="text-green-800 italic">Waiting for logs...</div>
        )}
        {logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all leading-relaxed text-green-400/90">
            {line}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
