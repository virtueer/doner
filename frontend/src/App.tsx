import {
	addEdge,
	Background,
	Controls,
	Panel,
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@xyflow/react/dist/style.css";
import type { Node } from "@xyflow/react";
import { AttachScreen } from "./components/AttachScreen";
import { FileBrowserScreen } from "./components/FileBrowserScreen";
import { AppHeader } from "./components/graph/AppHeader";
import { ContainerNode } from "./components/graph/ContainerNode";
import { EventsSheet } from "./components/graph/EventsSheet";
import { ImageNode } from "./components/graph/ImageNode";
import { NetworkNode } from "./components/graph/NetworkNode";
import { VolumeNode } from "./components/graph/VolumeNode";
import { LogViewer } from "./components/log-viewer/LogViewer";
import { NodeDetailsSheet } from "./components/NodeDetailsSheet";
import { ToastContainer } from "./components/ToastContainer";
import { useNodeSearch } from "./hooks/useNodeSearch";
import { useTopologyData } from "./hooks/useTopologyData";
import { autoLayout } from "./lib/layout/autoLayout";

const nodeTypes = {
	networkNode: NetworkNode,
	containerNode: ContainerNode,
	volumeNode: VolumeNode,
	imageNode: ImageNode,
};

const DIMMED = 0.2;
const HOVER_DELAY = 1000;

interface SelectedNode {
	id: string;
	name: string;
	type: string;
}

function Flow() {
	const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
	const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
		null,
	);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { fitView, setCenter, getNode } = useReactFlow();

	const {
		nodes,
		setNodes,
		onNodesChange,
		edges,
		setEdges,
		onEdgesChange,
		loading,
		error,
		globalEvents,
		showEvents,
		setShowEvents,
		rawDataRef,
		pendingReopenNodeRef,
		fetchGraphData,
	} = useTopologyData(setSelectedNode);

	const search = useNodeSearch(nodes, getNode, setCenter);

	const onNodeMouseEnter = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = setTimeout(
				() => setHighlightedNodeId(node.id),
				HOVER_DELAY,
			);
		},
		[],
	);

	const onNodeMouseLeave = useCallback(() => {
		if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
		setHighlightedNodeId(null);
	}, []);

	const onConnect = useCallback(
		(params: any) => setEdges((eds) => addEdge(params, eds)),
		[setEdges],
	);

	const handleNodeClick = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			setSelectedNode({
				id: node.id,
				name: node.data.label as string,
				type: node.type || "unknown",
			});
		},
		[],
	);

	const handleAutoLayout = useCallback(() => {
		setNodes((currentNodes) => {
			const laid = autoLayout(currentNodes, edges);
			localStorage.removeItem("flow-nodes-state");
			return laid;
		});
		setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
	}, [edges, setNodes, fitView]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "f" && !selectedNode) {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [selectedNode]);

	const connectedNodes = useMemo(() => {
		if (!highlightedNodeId) return null;
		const connected = new Set<string>([highlightedNodeId]);
		for (const e of rawDataRef.current?.edges || edges) {
			if (e.source === highlightedNodeId) connected.add(e.target);
			if (e.target === highlightedNodeId) connected.add(e.source);
		}
		return connected;
	}, [highlightedNodeId, edges, rawDataRef]);

	const filteredNodes = useMemo(() => {
		const query = search.searchQuery.trim().toLowerCase();
		if (!query && !highlightedNodeId) return nodes;

		return nodes.map((node) => {
			let opacity = 1;
			if (query) {
				const label = (node.data?.label as string)?.toLowerCase() || "";
				if (!label.includes(query)) opacity = DIMMED;
			}
			if (connectedNodes) {
				opacity = connectedNodes.has(node.id) ? 1 : Math.min(opacity, DIMMED);
			}
			if (node.style?.opacity === opacity) return node;
			return {
				...node,
				style: { ...node.style, opacity, transition: "opacity 0.2s" },
			};
		});
	}, [nodes, search.searchQuery, highlightedNodeId, connectedNodes]);

	const filteredEdges = useMemo(() => {
		if (!highlightedNodeId) return edges;
		return edges.map((edge) => {
			const opacity =
				edge.source === highlightedNodeId || edge.target === highlightedNodeId
					? 1
					: DIMMED;
			if (edge.style?.opacity === opacity) return edge;
			return {
				...edge,
				style: { ...edge.style, opacity, transition: "opacity 0.2s" },
			};
		});
	}, [edges, highlightedNodeId]);

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
				<Background color="var(--border)" gap={16} />
				<Controls />

				<AppHeader
					searchInputRef={searchInputRef}
					loading={loading}
					handleAutoLayout={handleAutoLayout}
					fetchGraphData={fetchGraphData}
					setShowEvents={setShowEvents}
					{...search}
				/>

				{error && (
					<Panel position="top-center" className="m-3">
						<div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive shadow-lg">
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
					onOpenNode={(id, name, type) => setSelectedNode({ id, name, type })}
					onAutoReopenRequest={(id, name, type) => {
						pendingReopenNodeRef.current = { id, name, type };
					}}
				/>
			)}

			{showEvents && (
				<EventsSheet
					events={globalEvents}
					onClose={() => setShowEvents(false)}
				/>
			)}
		</>
	);
}

export default function App() {
	const params = new URLSearchParams(window.location.search);
	const name = params.get("name");
	const logs = params.get("logs");
	const attach = params.get("attach");
	const files = params.get("files");
	const apiPrefix = params.get("apiPrefix");
	const type = params.get("type") as "volume" | "container";

	if (logs && name) {
		return (
			<LogViewer
				containerId={logs}
				containerName={name}
				maxLines={2000}
				documentTitle={`${name} — Logs`}
				className="h-screen"
			/>
		);
	}

	if (attach && name) {
		return (
			<AttachScreen
				containerId={attach}
				containerName={name}
				shell={params.get("shell") || "/bin/sh"}
				isSidecar={params.get("sidecar") === "true"}
				sidecarImage={params.get("sidecarImage") || "alpine"}
			/>
		);
	}

	if (files === "true" && apiPrefix && name && type) {
		return (
			<FileBrowserScreen apiPrefix={apiPrefix} nodeName={name} type={type} />
		);
	}

	return (
		<div className="h-screen w-full">
			<ReactFlowProvider>
				<Flow />
			</ReactFlowProvider>
			<ToastContainer />
		</div>
	);
}
