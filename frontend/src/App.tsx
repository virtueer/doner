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
 * Sorts containers so those sharing a network are grouped vertically.
 */
function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const networks = nodes.filter((n) => n.type === 'networkNode');
  const containers = nodes.filter((n) => n.type === 'containerNode');
  const volumes = nodes.filter((n) => n.type === 'volumeNode');

  const COL_NETWORK = 0;
  const COL_CONTAINER = 500;
  const COL_VOLUME = 1050;
  const Y_GAP = 200;

  // Build a map: networkNodeId -> list of containerNodeIds connected to it
  const netToContainers = new Map<string, string[]>();
  edges.forEach((e) => {
    if (e.sourceHandle === 'net-out') {
      // source=container, target=network
      const arr = netToContainers.get(e.target) || [];
      arr.push(e.source);
      netToContainers.set(e.target, arr);
    }
  });

  // Build a map: containerNodeId -> list of volumeNodeIds connected to it
  const contToVolumes = new Map<string, string[]>();
  edges.forEach((e) => {
    if (e.sourceHandle === 'vol-out') {
      const arr = contToVolumes.get(e.source) || [];
      arr.push(e.target);
      contToVolumes.set(e.source, arr);
    }
  });

  // Sort containers: group by their primary network
  const placed = new Set<string>();
  const orderedContainers: Node[] = [];

  networks.forEach((net) => {
    const connectedIds = netToContainers.get(net.id) || [];
    connectedIds.forEach((cId) => {
      if (!placed.has(cId)) {
        const node = containers.find((c) => c.id === cId);
        if (node) {
          orderedContainers.push(node);
          placed.add(cId);
        }
      }
    });
  });
  // Add remaining unconnected containers
  containers.forEach((c) => {
    if (!placed.has(c.id)) orderedContainers.push(c);
  });

  // Sort volumes: group by their connected container order
  const placedVols = new Set<string>();
  const orderedVolumes: Node[] = [];
  orderedContainers.forEach((cont) => {
    const volIds = contToVolumes.get(cont.id) || [];
    volIds.forEach((vId) => {
      if (!placedVols.has(vId)) {
        const vol = volumes.find((v) => v.id === vId);
        if (vol) {
          orderedVolumes.push(vol);
          placedVols.add(vId);
        }
      }
    });
  });
  volumes.forEach((v) => {
    if (!placedVols.has(v.id)) orderedVolumes.push(v);
  });

  // Assign positions
  // Networks: center them vertically relative to their connected containers
  const containerPositions = new Map<string, { x: number; y: number }>();
  orderedContainers.forEach((c, i) => {
    containerPositions.set(c.id, { x: COL_CONTAINER, y: i * Y_GAP });
  });

  const volumePositions = new Map<string, { x: number; y: number }>();
  orderedVolumes.forEach((v, i) => {
    volumePositions.set(v.id, { x: COL_VOLUME, y: i * Y_GAP });
  });

  // Position networks at the vertical center of their connected containers
  const networkPositions = new Map<string, { x: number; y: number }>();
  let nextNetY = 0;
  networks.forEach((net) => {
    const connectedIds = netToContainers.get(net.id) || [];
    if (connectedIds.length > 0) {
      const ys = connectedIds
        .map((id) => containerPositions.get(id)?.y ?? 0);
      const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
      networkPositions.set(net.id, { x: COL_NETWORK, y: avgY });
    } else {
      networkPositions.set(net.id, { x: COL_NETWORK, y: nextNetY });
    }
    nextNetY = (networkPositions.get(net.id)?.y ?? 0) + Y_GAP;
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
              style: {
                ...newNode.style,
                width: existing.style?.width ?? newNode.style?.width,
                height: existing.style?.height ?? newNode.style?.height,
              },
              measured: existing.measured ?? newNode.measured,
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
        style: n.style,
        measured: n.measured,
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

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'containerNode') {
      const rawId = node.id.replace('cont-', '');
      setSelectedContainer({ id: rawId, name: node.data.label as string });
    }
  }, []);

  const handleAutoLayout = useCallback(() => {
    setNodes((currentNodes) => {
      const laid = autoLayout(currentNodes, edges);
      // Clear saved positions so they don't override
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
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        minZoom={0.05}
        nodeDragThreshold={5}
        selectNodesOnDrag={false}
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
