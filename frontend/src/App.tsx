import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NetworkNode } from './components/NetworkNode';
import { ContainerNode } from './components/ContainerNode';
import { VolumeNode } from './components/VolumeNode';
import { NodeDetailsSheet } from './components/NodeDetailsSheet';
import { LogsTerminal } from './components/LogsTerminal';
import { AttachScreen } from './components/AttachScreen';
import { FileBrowser } from './components/FileBrowser';
import { RefreshCw, Sparkles, Search, Box, Network, Database, CheckCircle2, AlertCircle, Info as InfoIcon } from 'lucide-react';
import { toast, subscribeToToasts, type Toast } from './lib/toast';

const nodeTypes = {
  networkNode: NetworkNode,
  containerNode: ContainerNode,
  volumeNode: VolumeNode,
};

/**
 * Auto-layout: places networks on left, containers in middle, volumes on right.
 * Groups containers by their primary network so edges stay short.
 */
function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const networks = nodes.filter((n) => n.type === 'networkNode');
  const containers = nodes.filter((n) => n.type === 'containerNode');
  const volumes = nodes.filter((n) => n.type === 'volumeNode');

  const COL_NETWORK = 0;
  const COL_CONTAINER = 500;
  const COL_VOLUME = 1000;
  const ROW_GAP = 200;
  const GROUP_GAP = 100;

  // Build maps: network -> containers, container -> volumes
  const netToContainers = new Map<string, string[]>();
  const contToVolumes = new Map<string, string[]>();

  edges.forEach((e) => {
    if (e.sourceHandle === 'net-out') {
      const arr = netToContainers.get(e.target) || [];
      arr.push(e.source);
      netToContainers.set(e.target, arr);
    }
    if (e.sourceHandle === 'vol-out') {
      const arr = contToVolumes.get(e.source) || [];
      arr.push(e.target);
      contToVolumes.set(e.source, arr);
    }
  });

  // Order containers grouped by primary network
  const placed = new Set<string>();
  const orderedContainers: Node[] = [];
  const groupRanges: Array<{ netId: string; start: number; end: number }> = [];

  networks.forEach((net) => {
    const connectedIds = netToContainers.get(net.id) || [];
    if (connectedIds.length === 0) return;
    const start = orderedContainers.length;
    connectedIds.forEach((cId) => {
      if (!placed.has(cId)) {
        const node = containers.find((c) => c.id === cId);
        if (node) {
          orderedContainers.push(node);
          placed.add(cId);
        }
      }
    });
    const end = orderedContainers.length - 1;
    if (end >= start) groupRanges.push({ netId: net.id, start, end });
  });
  containers.forEach((c) => {
    if (!placed.has(c.id)) orderedContainers.push(c);
  });

  // Compute Y positions with group gaps
  const containerPositions = new Map<string, { x: number; y: number }>();
  let currentY = 0;
  let prevEnd = -1;

  orderedContainers.forEach((c, i) => {
    const group = groupRanges.find((g) => g.start === i);
    if (group && prevEnd >= 0) currentY += GROUP_GAP;
    containerPositions.set(c.id, { x: COL_CONTAINER, y: currentY });
    currentY += ROW_GAP;
    const endGroup = groupRanges.find((g) => g.end === i);
    if (endGroup) prevEnd = i;
  });

  // Network positions: centered on their container group
  const networkPositions = new Map<string, { x: number; y: number }>();
  let fallbackY = currentY;

  networks.forEach((net) => {
    const group = groupRanges.find((g) => g.netId === net.id);
    if (group) {
      const ys: number[] = [];
      for (let i = group.start; i <= group.end; i++) {
        const pos = containerPositions.get(orderedContainers[i].id);
        if (pos) ys.push(pos.y);
      }
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      networkPositions.set(net.id, { x: COL_NETWORK, y: (minY + maxY) / 2 });
    } else {
      networkPositions.set(net.id, { x: COL_NETWORK, y: fallbackY });
      fallbackY += ROW_GAP;
    }
  });

  // Volume positions: centered on their connected containers
  const placedVols = new Set<string>();
  const volumePositions = new Map<string, { x: number; y: number }>();

  orderedContainers.forEach((cont) => {
    const volIds = contToVolumes.get(cont.id) || [];
    volIds.forEach((vId) => {
      if (!placedVols.has(vId)) placedVols.add(vId);
    });
  });

  const orderedVolumes = [
    ...volumes.filter((v) => placedVols.has(v.id)),
    ...volumes.filter((v) => !placedVols.has(v.id)),
  ];

  orderedVolumes.forEach((vol) => {
    // Find all containers connected to this volume
    const connectedContYs: number[] = [];
    edges.forEach((e) => {
      if (e.sourceHandle === 'vol-out' && e.target === vol.id) {
        const pos = containerPositions.get(e.source);
        if (pos) connectedContYs.push(pos.y);
      }
    });

    if (connectedContYs.length > 0) {
      const minY = Math.min(...connectedContYs);
      const maxY = Math.max(...connectedContYs);
      let targetY = (minY + maxY) / 2;

      // Prevent overlapping
      let overlap = true;
      while (overlap) {
        overlap = false;
        for (const [_, pos] of volumePositions) {
          if (Math.abs(pos.y - targetY) < 100) {
            targetY += 120;
            overlap = true;
            break;
          }
        }
      }
      volumePositions.set(vol.id, { x: COL_VOLUME, y: targetY });
    } else {
      volumePositions.set(vol.id, { x: COL_VOLUME, y: fallbackY });
      fallbackY += ROW_GAP;
    }
  });

  return nodes.map((node) => {
    const pos =
      networkPositions.get(node.id) ||
      containerPositions.get(node.id) ||
      volumePositions.get(node.id) ||
      node.position;
    return { ...node, position: pos };
  });
}

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { fitView, setCenter, getNode } = useReactFlow();
  const rawDataRef = useRef<{ nodes: any[]; edges: any[] } | null>(null);

  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<any | null>(null);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);

  const matchedNodes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return nodes.filter(n => (n.data?.label as string)?.toLowerCase().includes(q));
  }, [nodes, searchQuery]);

  useEffect(() => {
    setSearchSelectedIndex(0);
  }, [matchedNodes]);

  const handleSearchSelect = (nodeId: string) => {
    const node = getNode(nodeId);
    if (node && node.position) {
      setCenter(node.position.x + 150, node.position.y + 100, { zoom: 1.2, duration: 800 });
    }
    setIsSearchFocused(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchFocused || matchedNodes.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchSelectedIndex(prev => (prev + 1) % matchedNodes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchSelectedIndex(prev => (prev - 1 + matchedNodes.length) % matchedNodes.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSelect(matchedNodes[searchSelectedIndex].id);
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
    }
  };

  const getConnectedNodes = useCallback((nodeId: string, currentEdges: Edge[]) => {
    const connected = new Set<string>();
    connected.add(nodeId);
    currentEdges.forEach(e => {
      if (e.source === nodeId) connected.add(e.target);
      if (e.target === nodeId) connected.add(e.source);
    });
    return connected;
  }, []);

  const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHighlightedNodeId(node.id);
    }, 1000);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHighlightedNodeId(null);
  }, []);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/network-graph`);
      if (!res.ok) throw new Error('Failed to fetch graph data');
      const data = await res.json();
      rawDataRef.current = data;

      setNodes((currentNodes) => {
        const savedStateStr = localStorage.getItem('flow-nodes-state');
        const savedState = savedStateStr ? JSON.parse(savedStateStr) : [];
        const savedNodes = new Map(savedState.map((n: any) => [n.id, n]));

        const existingNodes = new Map(currentNodes.map((n: any) => [n.id, n]));

        return data.nodes.map((newNode: any) => {
          const existing = existingNodes.get(newNode.id) || savedNodes.get(newNode.id);
          if (existing) {
            return {
              ...newNode,
              position: existing.position,
            };
          }
          return newNode;
        });
      });
      setEdges(data.edges);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
    const interval = setInterval(fetchGraphData, 10000);

    // Global Docker events stream
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const es = new EventSource(`${apiUrl}/api/events`);
    es.onmessage = (event) => {
      try {
        const e = JSON.parse(event.data);
        const action = e.Action || e.status;
        const type = e.Type || e.type;

        if (e.Actor?.Attributes?.['doner.internal'] === 'true') {
          return;
        }

        if (action === 'start' && type === 'container') {
          toast(`Container ${e.Actor?.Attributes?.name} started`, 'success');
          fetchGraphData();
        } else if (action === 'die' && type === 'container') {
          toast(`Container ${e.Actor?.Attributes?.name} stopped`, 'error');
          fetchGraphData();
        } else if (action === 'create' && type === 'container') {
          toast(`Container ${e.Actor?.Attributes?.name} created`, 'info');
          fetchGraphData();
        } else if (action === 'destroy' && type === 'container') {
          toast(`Container ${e.Actor?.Attributes?.name} deleted`, 'info');
          fetchGraphData();
        }
      } catch (err) { }
    };

    return () => {
      clearInterval(interval);
      es.close();
    };
  }, []);

  // Persist node positions to localStorage (debounced)
  useEffect(() => {
    if (nodes.length === 0) return;
    const timeout = setTimeout(() => {
      const savedState = nodes.map((n: any) => ({
        id: n.id,
        position: n.position,
      }));
      localStorage.setItem('flow-nodes-state', JSON.stringify(savedState));
    }, 500);
    return () => clearTimeout(timeout);
  }, [nodes]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);

  // Click to open NodeDetailsSheet (inspect & logs)
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode({
      id: node.id,
      name: node.data.label as string,
      type: node.type || 'unknown',
    });
  }, []);

  const handleAutoLayout = useCallback(() => {
    setNodes((currentNodes) => {
      const laid = autoLayout(currentNodes, edges);
      localStorage.removeItem('flow-nodes-state');
      return laid;
    });
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [edges, setNodes, fitView]);

  // Apply search and hover highlighting
  const connectedNodes = highlightedNodeId ? getConnectedNodes(highlightedNodeId, edges) : null;

  const filteredNodes = nodes.map((node) => {
    let opacity = 1;

    if (searchQuery.trim()) {
      const label = (node.data?.label as string)?.toLowerCase() || '';
      if (!label.includes(searchQuery.toLowerCase())) {
        opacity = 0.2;
      }
    }

    if (highlightedNodeId && connectedNodes) {
      if (!connectedNodes.has(node.id)) {
        opacity = Math.min(opacity, 0.2);
      } else {
        opacity = 1;
      }
    }

    return {
      ...node,
      style: {
        ...node.style,
        opacity,
        transition: 'opacity 0.2s',
      },
    };
  });

  const filteredEdges = edges.map((edge) => {
    let opacity = 1;
    if (highlightedNodeId) {
      if (edge.source !== highlightedNodeId && edge.target !== highlightedNodeId) {
        opacity = 0.2;
      }
    }
    return {
      ...edge,
      style: { ...edge.style, opacity, transition: 'opacity 0.2s' },
    };
  });

  return (
    <>
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        minZoom={0.05}
        nodeDragThreshold={8}
        selectNodesOnDrag={false}
        nodesFocusable={false}
        edgesFocusable={false}
      >
        <Background color="#555" gap={16} />
        <Controls />

        {/* Search Bar (Top Left) */}
        <Panel position="top-left" className="m-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9 pr-4 py-2 bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm w-64 transition-all"
            />
            {isSearchFocused && matchedNodes.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1 z-50 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                {matchedNodes.map((n, idx) => {
                  let Icon = Box;
                  let iconColor = "text-green-500";
                  let typeLabel = "Container";

                  if (n.type === 'networkNode') {
                    Icon = Network;
                    iconColor = "text-indigo-500";
                    typeLabel = "Network";
                  } else if (n.type === 'volumeNode') {
                    Icon = Database;
                    iconColor = "text-amber-500";
                    typeLabel = "Volume";
                  } else if (n.type === 'containerNode') {
                    Icon = Box;
                    iconColor = n.data?.state === 'running' ? "text-green-500" : "text-slate-400";
                    typeLabel = "Container";
                  }

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleSearchSelect(n.id)}
                      className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${idx === searchSelectedIndex ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-foreground'
                        }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                        <span className="truncate">{n.data?.label as string}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0 ml-2">
                        {typeLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        {/* Floating toolbar top-right */}
        <Panel position="top-right" className="flex items-center gap-2 m-3">
          {loading && (
            <span className="text-xs text-muted-foreground animate-pulse bg-card/80 backdrop-blur-sm px-2 py-1 rounded">
              Updating...
            </span>
          )}
          <button
            onClick={handleAutoLayout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card/90 backdrop-blur-sm text-foreground rounded-lg text-xs font-medium border border-border/50 hover:bg-accent hover:border-primary/50 transition-all shadow-sm"
            title="Auto arrange nodes"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Auto Layout
          </button>
          <button
            onClick={fetchGraphData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card/90 backdrop-blur-sm text-foreground rounded-lg text-xs font-medium border border-border/50 hover:bg-accent hover:border-primary/50 transition-all shadow-sm"
            title="Refresh data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </Panel>

        {/* Error toast */}
        {error && (
          <Panel position="top-center" className="m-3">
            <div className="bg-destructive/10 text-destructive border border-destructive px-4 py-2 rounded-md shadow-lg text-sm">
              {error}
            </div>
          </Panel>
        )}
      </ReactFlow>

      {selectedNode && (
        <NodeDetailsSheet
          nodeId={selectedNode.id}
          nodeName={selectedNode.name}
          nodeType={selectedNode.type}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </>
  );
}

function FileBrowserScreen({ apiPrefix, nodeName, type }: { apiPrefix: string, nodeName: string, type: 'volume' | 'container' }) {
  const [mounts, setMounts] = useState<any[]>([]);

  useEffect(() => {
    if (type !== 'container') return;
    const fetchMounts = async () => {
      try {
        const rawId = apiPrefix.split('/').pop() || '';
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/inspect/containerNode/${rawId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.Mounts) setMounts(json.Mounts);
        }
      } catch (e) { }
    };
    fetchMounts();
  }, [type, apiPrefix]);

  return (
    <div className="w-full h-screen dark text-foreground overflow-hidden flex flex-col bg-[#1e1e1e]">
      <FileBrowser
        apiPrefix={apiPrefix}
        nodeName={nodeName}
        type={type}
        mounts={mounts}
        isFullscreen={true}
      />
    </div>
  );
}

function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => subscribeToToasts(setToasts), []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl text-sm min-w-[280px] animate-in slide-in-from-right-8 fade-in duration-300 border ${t.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500 backdrop-blur-md' :
              t.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500 backdrop-blur-md' :
                'bg-[#2a2a2a]/90 border-white/10 text-white/90 backdrop-blur-md'
            }`}
        >
          {t.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> :
            t.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> :
              <InfoIcon className="h-5 w-5 shrink-0 text-blue-400" />}
          <span className="font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function App() {
  // Check for terminal mode via URL params
  const params = new URLSearchParams(window.location.search);
  const logsParam = params.get('logs');
  const nameParam = params.get('name');
  const attachParam = params.get('attach');
  const shellParam = params.get('shell') || '/bin/sh';
  const sidecarParam = params.get('sidecar') === 'true';
  const isTerminalMode = !!logsParam;
  const isAttachMode = !!attachParam;

  const filesParam = params.get('files');
  const apiPrefixParam = params.get('apiPrefix');
  const typeParam = params.get('type') as 'volume' | 'container';

  if (isTerminalMode && logsParam && nameParam) {
    return <LogsTerminal containerId={logsParam} containerName={nameParam} />;
  }

  if (isAttachMode && attachParam && nameParam) {
    return <AttachScreen containerId={attachParam} containerName={nameParam} shell={shellParam} isSidecar={sidecarParam} />;
  }

  if (filesParam === 'true' && apiPrefixParam && nameParam && typeParam) {
    return <FileBrowserScreen apiPrefix={apiPrefixParam} nodeName={nameParam} type={typeParam} />;
  }

  return (
    <div className="w-full h-screen dark bg-background text-foreground">
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
      <Toaster />
    </div>
  );
}

export default App;
