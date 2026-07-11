import { useState, useEffect, useCallback, useRef } from 'react';
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
import { LogsSheet } from './components/LogsSheet';
import { LogsTerminal } from './components/LogsTerminal';
import { RefreshCw, Sparkles } from 'lucide-react';

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
  const COL_CONTAINER = 420;
  const COL_VOLUME = 880;
  const ROW_GAP = 140;
  const GROUP_GAP = 60;

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
      volumePositions.set(vol.id, { x: COL_VOLUME, y: (minY + maxY) / 2 });
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
  const { fitView } = useReactFlow();
  const rawDataRef = useRef<{ nodes: any[]; edges: any[] } | null>(null);

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
    return () => clearInterval(interval);
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

  const [selectedContainer, setSelectedContainer] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Double-click to open logs — prevents accidental opens when panning
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'containerNode') {
      const rawId = node.id.replace('cont-', '');
      setSelectedContainer({ id: rawId, name: node.data.label as string });
    }
  }, []);

  const handleAutoLayout = useCallback(() => {
    setNodes((currentNodes) => {
      const laid = autoLayout(currentNodes, edges);
      localStorage.removeItem('flow-nodes-state');
      return laid;
    });
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [edges, setNodes, fitView]);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
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

      {selectedContainer && (
        <LogsSheet
          containerId={selectedContainer.id}
          containerName={selectedContainer.name}
          onClose={() => setSelectedContainer(null)}
        />
      )}
    </>
  );
}

function App() {
  // Check for terminal mode via URL params
  const params = new URLSearchParams(window.location.search);
  const logsParam = params.get('logs');
  const nameParam = params.get('name');
  const isTerminalMode = !!logsParam;

  if (isTerminalMode && logsParam && nameParam) {
    return <LogsTerminal containerId={logsParam} containerName={nameParam} />;
  }

  return (
    <div className="w-full h-screen dark bg-background text-foreground">
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
}

export default App;
