import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Terminal, ExternalLink, Info, Play, Folder, FileText, Download, ArrowLeft } from 'lucide-react';
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
    </div>
  );
}

// --- Sub-component for Volume Files ---
function VolumeBrowser({ volumeName }: { volumeName: string }) {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewFile, setViewFile] = useState<string | null>(null);
  const [viewFilePath, setViewFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchFiles = useCallback(async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      setViewFile(null);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/volumes/${encodeURIComponent(volumeName)}/files?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data);
      setCurrentPath(path);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [volumeName]);

  useEffect(() => {
    fetchFiles('/');
  }, [fetchFiles]);

  const handleFileClick = async (file: any) => {
    if (file.type === 'directory') {
      fetchFiles(file.path);
    } else {
      // Read file
      try {
        setFileLoading(true);
        setViewFile(file.name);
        setViewFilePath(file.path);
        setIsEditing(false);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/volumes/${encodeURIComponent(volumeName)}/files/read?path=${encodeURIComponent(file.path)}`);
        if (!res.ok) throw new Error('Failed to read file');
        const data = await res.json();
        setFileContent(data.content);
        setEditContent(data.content);
      } catch (err: any) {
        setFileContent(`Error: ${err.message}`);
      } finally {
        setFileLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!viewFilePath) return;
    try {
      setSaving(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/volumes/${encodeURIComponent(volumeName)}/files/write?path=${encodeURIComponent(viewFilePath)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error('Failed to write file');
      setFileContent(editContent);
      setIsEditing(false);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (currentPath === '/') return;
    const parts = currentPath.replace(/\/$/, '').split('/');
    parts.pop();
    fetchFiles(parts.length > 0 ? parts.join('/') : '/');
  };

  const handleExport = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.open(`${apiUrl}/api/volumes/${encodeURIComponent(volumeName)}/export`, '_blank');
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] relative">
      <div className="flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-white/5">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={handleBack}
            disabled={currentPath === '/'}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent text-white/80 shrink-0 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center text-xs text-white/70 font-mono truncate">
            {volumeName}:{currentPath.startsWith('/') ? currentPath : '/' + currentPath}
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium rounded-md transition-colors border border-blue-500/20 shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {viewFile ? (
          <div className="absolute inset-0 flex flex-col bg-[#1e1e1e] z-10">
            <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between shrink-0">
              <span className="text-sm font-mono text-white/90 truncate">{viewFile}</span>
              <div className="flex items-center gap-2">
                {!fileLoading && !isEditing && (
                  <button onClick={() => setIsEditing(true)} className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80 transition-colors">
                    Edit
                  </button>
                )}
                {isEditing && (
                  <>
                    <button onClick={() => { setIsEditing(false); setEditContent(fileContent); }} disabled={saving} className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white/80 transition-colors disabled:opacity-50">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                )}
                <button onClick={() => { setViewFile(null); setViewFilePath(null); }} className="p-1 hover:bg-white/10 rounded text-white/70 ml-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col">
              {fileLoading ? (
                <div className="text-white/50 text-sm animate-pulse">Loading content...</div>
              ) : isEditing ? (
                <textarea
                  className="flex-1 w-full bg-[#121212] border border-white/10 rounded p-3 text-xs font-mono text-green-400 focus:outline-none focus:border-blue-500/50 resize-none"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                  {fileContent || <span className="text-white/30 italic">Empty file</span>}
                </pre>
              )}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="p-4 text-white/50 text-sm animate-pulse">Loading directory...</div>
        ) : error ? (
          <div className="p-4 text-red-400 text-sm">{error}</div>
        ) : files.length === 0 ? (
          <div className="p-4 text-white/40 text-sm italic">Empty directory</div>
        ) : (
          <div className="overflow-y-auto h-full p-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/40 font-medium">
                  <th className="pb-2 font-normal pl-2">Name</th>
                  <th className="pb-2 font-normal w-24">Size</th>
                  <th className="pb-2 font-normal w-32">Modified</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => (
                  <tr
                    key={i}
                    onClick={() => handleFileClick(f)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <td className="py-2 pl-2">
                      <div className="flex items-center gap-2">
                        {f.type === 'directory' ? (
                          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-sm text-white/90 truncate group-hover:text-blue-400 transition-colors">
                          {f.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-xs text-white/50 font-mono">
                      {f.type === 'file' ? formatBytes(f.size) : '--'}
                    </td>
                    <td className="py-2 text-xs text-white/50">
                      {new Date(f.mtime).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  const [activeTab, setActiveTab] = useState<'inspect' | 'logs' | 'attach' | 'files'>('inspect');
  const [attachShell, setAttachShell] = useState('/bin/sh');
  const [isAttached, setIsAttached] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const handleDisconnect = useCallback(() => setIsAttached(false), []);

  const rawId = nodeId.replace(/^(cont-|net-|vol-)/, '');
  const isContainer = nodeType === 'containerNode';
  const isVolume = nodeType === 'volumeNode';

  useEffect(() => {
    if (!isContainer) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const es = new EventSource(`${apiUrl}/api/container-stats/${rawId}`);

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (!parsed.error) {
          setStats(parsed);
        }
      } catch (e) { }
    };

    return () => {
      es.close();
    };
  }, [rawId, isContainer]);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${apiUrl}/api/containers/${rawId}/${action}`, { method: 'POST' });
    } catch (err) {
      console.error(`Failed to ${action} container:`, err);
    }
  };

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

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const renderStatsInfo = () => {
    if (!stats) return null;

    let cpuPercent = 0.0;
    const cpuDelta = stats.cpu_stats?.cpu_usage?.total_usage - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats?.system_cpu_usage - (stats.precpu_stats?.system_cpu_usage || 0);

    if (systemDelta > 0.0 && cpuDelta > 0.0) {
      const cpus = stats.cpu_stats?.online_cpus || stats.cpu_stats?.cpu_usage?.percpu_usage?.length || 1;
      cpuPercent = (cpuDelta / systemDelta) * cpus * 100.0;
    }

    const memUsage = stats.memory_stats?.usage || 0;
    const memLimit = stats.memory_stats?.limit || 0;
    const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100.0 : 0.0;

    return (
      <div className="flex items-center gap-4 text-xs mt-3 bg-black/20 p-2 rounded-md border border-white/5 w-fit">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-semibold text-foreground/80">CPU:</span>
          <span className="font-mono text-blue-400">{cpuPercent.toFixed(2)}%</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div
          className="flex items-center gap-1.5 cursor-help"
          title={`Usage: ${formatBytes(memUsage)} / Limit: ${formatBytes(memLimit)}`}
        >
          <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="font-semibold text-foreground/80">RAM:</span>
          <span className="font-mono text-purple-400">{memPercent.toFixed(2)}%</span>
        </div>
      </div>
    );
  };

  // Helper to extract short info based on type
  const renderShortInfo = () => {
    if (!data) return null;
    if (isContainer) {
      return (
        <div className="flex flex-col">
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
          {renderStatsInfo()}
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
      <div className="fixed inset-y-0 right-0 z-50 w-3/4 max-w-5xl bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
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
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              {isContainer && (
                <div className="flex items-center gap-2 mr-4 border-r border-border/20 pr-4">
                  <button onClick={() => handleAction('start')} className="px-3 py-1.5 text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20 rounded-md transition-colors shadow-sm">Start</button>
                  <button onClick={() => handleAction('stop')} className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-colors shadow-sm">Stop</button>
                  <button onClick={() => handleAction('restart')} className="px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 rounded-md transition-colors shadow-sm">Restart</button>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b border-white/5">
            <button
              onClick={() => setActiveTab('inspect')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inspect' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
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
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Terminal className="h-4 w-4" />
                    Logs
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('attach')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attach' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Play className="h-4 w-4" />
                    Attach
                  </div>
                </button>
              </>
            )}
            {isVolume && (
              <button
                onClick={() => setActiveTab('files')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'files' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <Folder className="h-4 w-4" />
                  Files
                </div>
              </button>
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
                    {rootKeys.map((key) => {
                      let badgeColor = "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10";
                      if (key === 'Mounts') badgeColor = "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200";
                      else if (key === 'Config') badgeColor = "bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200";
                      else if (key === 'NetworkSettings') badgeColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200";

                      return (
                        <button
                          key={key}
                          onClick={() => handleScrollTo(key)}
                          className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors ${badgeColor}`}
                        >
                          {key}
                        </button>
                      );
                    })}
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
              <div className="flex-1 min-h-0 overflow-hidden">
                {isAttached ? (
                  <AttachTerminal
                    containerId={rawId}
                    shell={attachShell}
                    onDisconnect={handleDisconnect}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Select a shell and click Connect to start an interactive session.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'files' && isVolume && (
            <VolumeBrowser volumeName={data?.Name || rawId} />
          )}
        </div>
      </div>
    </>
  );
}
