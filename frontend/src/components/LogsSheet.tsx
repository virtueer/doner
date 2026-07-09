import { useState, useEffect, useRef } from 'react';
import { X, Terminal } from 'lucide-react';

interface LogsSheetProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

export function LogsSheet({ containerId, containerName, onClose }: LogsSheetProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const es = new EventSource(`${apiUrl}/api/container-logs/${containerId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const line = JSON.parse(event.data);
        setLogs((prev) => {
          const updated = [...prev, line];
          return updated.length > 500 ? updated.slice(-500) : updated;
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
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-[480px] h-full bg-card border-l border-border flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{containerName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
          {logs.length === 0 && (
            <div className="text-muted-foreground italic">Waiting for logs...</div>
          )}
          {logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all text-foreground/90">
              {line}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border text-[10px] text-muted-foreground flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Streaming live
        </div>
      </div>
    </div>
  );
}
