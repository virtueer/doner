import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

export function InspectSheet({
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        // Extract raw ID (e.g. cont-123 -> 123)
        const rawId = nodeId.replace(/^(cont-|net-|vol-)/, '');
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
  }, [nodeId, nodeType]);

  const rootKeys = data ? Object.keys(data) : [];

  const handleScrollTo = (key: string) => {
    const el = document.getElementById(`json-section-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-3/4 max-w-5xl bg-card border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/95 backdrop-blur z-10 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Inspect: {nodeName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">
              {nodeType.replace('Node', '')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative bg-[#1e1e1e]">
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
              <div className="sticky top-0 z-20 bg-[#1e1e1e]/95 backdrop-blur-md border-b border-white/10 p-3 shrink-0 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
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
                <div className="space-y-6">
                  {rootKeys.map((key) => (
                    <div key={key} id={`json-section-${key}`} className="scroll-mt-24">
                      <h3 className="text-sm font-bold text-emerald-400 font-mono mb-2 border-b border-white/10 pb-1">
                        "{key}":
                      </h3>
                      <pre className="text-xs font-mono text-gray-300 overflow-x-auto bg-black/20 p-4 rounded-lg">
                        {JSON.stringify(data[key], null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
