import { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NetworkNode } from './components/NetworkNode';
import { ContainerNode } from './components/ContainerNode';
import { LogsSheet } from './components/LogsSheet';
import { LogsTerminal } from './components/LogsTerminal';
import { Layout } from 'lucide-react';

const nodeTypes = {
  networkNode: NetworkNode,
  containerNode: ContainerNode,
};

function App() {
  // Check for terminal mode via URL params
  const params = new URLSearchParams(window.location.search);
  const logsParam = params.get('logs');
  const nameParam = params.get('name');
  const isTerminalMode = !!logsParam;

  if (isTerminalMode && logsParam && nameParam) {
    return <LogsTerminal containerId={logsParam} containerName={nameParam} />;
  }

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/network-graph`);
      if (!res.ok) throw new Error('Failed to fetch graph data');
      const data = await res.json();

      setNodes((currentNodes) => {
        const savedStateStr = localStorage.getItem('flow-nodes-state');
        const savedState = savedStateStr ? JSON.parse(savedStateStr) : [];
        const savedNodes = new Map(savedState.map((n: any) => [n.id, n]));

        const existingNodes = new Map(currentNodes.map((n: any) => [n.id, n]));

        return data.nodes.map((newNode: any) => {
          const existing = existingNodes.get(newNode.id) || savedNodes.get(newNode.id);
          if (existing) {
            // Preserve user-modified positions and sizes from memory or localStorage
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
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchGraphData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Persist nodes to localStorage whenever they change (with simple debounce)
  useEffect(() => {
    if (nodes.length === 0) return;
    const timeout = setTimeout(() => {
      const savedState = nodes.map((n: any) => ({
        id: n.id,
        position: n.position,
        style: n.style,
        measured: n.measured
      }));
      localStorage.setItem('flow-nodes-state', JSON.stringify(savedState));
    }, 500);
    return () => clearTimeout(timeout);
  }, [nodes]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const [selectedContainer, setSelectedContainer] = useState<{ id: string; name: string } | null>(null);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'containerNode') {
      // Extract the raw container ID (strip the "cont-" prefix)
      const rawId = node.id.replace('cont-', '');
      setSelectedContainer({ id: rawId, name: node.data.label as string });
    }
  }, []);

  return (
    <div className="w-full h-screen dark bg-background text-foreground flex flex-col">
      <header className="p-2 border-b flex items-center justify-between bg-card z-10">
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold m-0 p-0 tracking-tight">Docker Network Graph</h1>
        </div>
        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-muted-foreground animate-pulse">Updating...</span>}
          <button
            onClick={fetchGraphData}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="flex-1 relative">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-destructive/10 text-destructive border border-destructive px-4 py-2 rounded-md shadow-lg">
            {error}
          </div>
        )}
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
        >
          <Background color="#555" gap={16} />
          <Controls />
        </ReactFlow>
      </main>

      {selectedContainer && (
        <LogsSheet
          containerId={selectedContainer.id}
          containerName={selectedContainer.name}
          onClose={() => setSelectedContainer(null)}
        />
      )}
    </div>
  );
}

export default App;
