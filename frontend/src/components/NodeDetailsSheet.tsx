import { useState, useEffect, useRef } from 'react';
import { X, Search, Terminal, ExternalLink, Info, Play } from 'lucide-react';
import { renderAnsiLine } from '@/lib/ansi';
import { AttachTerminal } from './AttachTerminal';

// --- Sub-component for Logs Streaming ---
function ContainerLogs({ containerId, containerName }: { containerId: string; containerName: string }) {
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const es = new EventSource(`${apiUrl}/api/container-logs/${containerId}`);
    eventSourceRef.current = es;

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
          return updated.length > 500 ? updated.slice(-500) : updated;
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
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const openTerminalTab = () => {
    const url = `${window.location.origin}?logs=${encodeURIComponent(containerId)}&name=${encodeURIComponent(containerName)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] relative">
      <div className="absolute top-2 right-4 z-10">
        <button
          onClick={openTerminalTab}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Open in new tab
        </button>
      </div>
      <div className="px-4 py-2 text-green-700 text-xs border-b border-green-900/20 font-mono">
        $ docker logs -f {containerName}
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        {logs.length === 0 && (
          <div className="text-green-800 italic">Waiting for logs...</div>
        )}
        {logs.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all text-green-400/90">
            {renderAnsiLine(line)}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
      <div className="p-2 border-t border-white/5 text-[10px] text-green-500/50 flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        Streaming live
      </div>
    </div>
  );
}

// --- Main Unified Sheet ---
export function NodeDetailsSheet({
  nodeId,
  nodeName,
  nodeType,
  onClose,
}: {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inspect' | 'logs' | 'attach'>('inspect');
  const [attachShell, setAttachShell] = useState('/bin/sh');
  const [isAttached, setIsAttached] = useState(false);

  const rawId = nodeId.replace(/^(cont-|net-|vol-)/, '');
  const isContainer = nodeType === 'containerNode';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/inspect/${nodeType}/${rawId}`);
        if (!res.ok) throw new Error('Failed to fetch inspect data');
        const json = await res.json();
        
        if (json.error) {
          throw new Error(json.error);
        }
        
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [nodeId, nodeType, rawId]);

  const rootKeys = data ? Object.keys(data) : [];

  const handleScrollTo = (key: string) => {
    const el = document.getElementById(`json-section-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper to extract short info based on type
  const renderShortInfo = () => {
    if (!data) return null;
    if (isContainer) {
      return (
        <div className="flex flex-wrap gap-4 text-xs mt-2 text-muted-foreground">
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">ID:</span> {data.Id?.substring(0, 12)}</div>
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">Image:</span> {data.Config?.Image}</div>
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">State:</span> 
            <span className={data.State?.Running ? 'text-green-500' : 'text-red-500'}>
              {data.State?.Status}
            </span>
          </div>
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">Created:</span> {new Date(data.Created).toLocaleString()}</div>
        </div>
      );
    } else if (nodeType === 'networkNode') {
      return (
        <div className="flex flex-wrap gap-4 text-xs mt-2 text-muted-foreground">
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">ID:</span> {data.Id?.substring(0, 12)}</div>
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">Driver:</span> {data.Driver}</div>
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">Scope:</span> {data.Scope}</div>
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">Subnet:</span> {data.IPAM?.Config?.[0]?.Subnet || 'N/A'}</div>
        </div>
      );
    } else if (nodeType === 'volumeNode') {
      return (
        <div className="flex flex-wrap gap-4 text-xs mt-2 text-muted-foreground">
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">Driver:</span> {data.Driver}</div>
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">Mountpoint:</span> <span className="truncate max-w-[200px]" title={data.Mountpoint}>{data.Mountpoint}</span></div>
          <div className="flex items-center gap-1"><span className="font-semibold text-foreground/80">Created:</span> {new Date(data.CreatedAt).toLocaleString()}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-3/4 max-w-5xl bg-card border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header Section */}
        <div className="px-6 py-4 border-b border-border bg-card/95 backdrop-blur z-10 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                {nodeName}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider ml-2 align-middle">
                  {nodeType.replace('Node', '')}
                </span>
              </h2>
              {loading ? (
                <div className="h-4 w-64 bg-white/5 animate-pulse rounded mt-2" />
              ) : (
                renderShortInfo()
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b border-white/5">
            <button
              onClick={() => setActiveTab('inspect')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'inspect' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Search className="h-4 w-4" />
                Inspect
              </div>
            </button>
            {isContainer && (
              <>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'logs' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Terminal className="h-4 w-4" />
                    Logs
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('attach')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'attach' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Play className="h-4 w-4" />
                    Attach
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-[#1e1e1e]">
          {activeTab === 'inspect' && (
            <>
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-muted-foreground animate-pulse">Loading inspect data...</span>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center text-destructive">
                  {error}
                </div>
              ) : (
                <>
                  {/* Sticky Badges Header */}
                  <div className="sticky top-0 z-20 bg-[#1e1e1e]/95 backdrop-blur-md border-b border-white/10 p-3 shrink-0 flex flex-wrap gap-2 max-h-32 overflow-y-auto shadow-md">
                    {rootKeys.map((key) => (
                      <button
                        key={key}
                        onClick={() => handleScrollTo(key)}
                        className="px-2.5 py-1 text-xs font-mono rounded-md bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        {key}
                      </button>
                    ))}
                  </div>

                  {/* JSON Content */}
                  <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <pre className="text-xs font-mono text-gray-300 overflow-x-auto bg-black/20 p-4 rounded-lg m-0">
                      {`{\n`}
                      {rootKeys.map((key, index) => {
                        const str = JSON.stringify({ [key]: data[key] }, null, 2);
                        // Extract inner content without the outer braces
                        const inner = str.substring(2, str.length - 2);
                        return (
                          <span key={key} id={`json-section-${key}`} className="scroll-mt-32 block">
                            {inner}{index < rootKeys.length - 1 ? ',' : ''}
                          </span>
                        );
                      })}
                      {`}`}
                    </pre>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'logs' && isContainer && (
            <ContainerLogs containerId={rawId} containerName={nodeName} />
          )}

          {activeTab === 'attach' && isContainer && (
            <div className="flex flex-col h-full bg-[#0c0c0c] relative">
              <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-green-900/30">
                <div className="flex items-center gap-4">
                  <select
                    value={attachShell}
                    onChange={(e) => setAttachShell(e.target.value)}
                    disabled={isAttached}
                    className="bg-[#2a2a2a] text-xs text-white px-2 py-1 rounded border border-white/10 outline-none"
                  >
                    <option value="/bin/sh">/bin/sh</option>
                    <option value="/bin/bash">/bin/bash</option>
                  </select>
                  {!isAttached ? (
                    <button
                      onClick={() => setIsAttached(true)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                    >
                      Connect
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsAttached(false)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}?attach=${encodeURIComponent(rawId)}&shell=${encodeURIComponent(attachShell)}&name=${encodeURIComponent(nodeName)}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in new tab
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {isAttached ? (
                  <AttachTerminal 
                    containerId={rawId} 
                    shell={attachShell} 
                    onDisconnect={() => setIsAttached(false)} 
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Select a shell and click Connect to start an interactive session.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
