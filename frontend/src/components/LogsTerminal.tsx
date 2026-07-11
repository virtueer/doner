import { useEffect, useRef, useState } from 'react';
import { renderAnsiLine } from '@/lib/ansi';

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
      let line: string;
      try {
        const parsed = JSON.parse(event.data);
        line = typeof parsed === 'string' ? parsed : String(parsed ?? '');
      } catch {
        line = event.data ?? '';
      }
      if (line) {
        setLogs((prev) => {
          const updated = [...prev, line];
          return updated.length > 2000 ? updated.slice(-2000) : updated;
        });
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
      {/* Prompt */}
      <div className="px-4 py-2 text-green-700 text-xs border-b border-green-900/20 font-bold">
        $ docker logs -f {containerName}
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-auto p-4">
        {logs.length === 0 && (
          <div className="text-green-800 italic">Waiting for logs...</div>
        )}
        {logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all leading-relaxed text-green-400/90">
            {renderAnsiLine(line)}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
