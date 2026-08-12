import {
	addEdge,
	Background,
	Controls,
	Panel,
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import "@xyflow/react/dist/style.css";
import type { Edge, Node } from "@xyflow/react";
import { AppHeader } from "./components/AppHeader";
import { AttachScreen } from "./components/AttachScreen";
import { ContainerNode } from "./components/ContainerNode";
import { EventsSheet } from "./components/EventsSheet";
import { FileBrowserScreen } from "./components/FileBrowserScreen";
import { ImageNode } from "./components/ImageNode";
import { LogsTerminal } from "./components/LogsTerminal";
import { NetworkNode } from "./components/NetworkNode";
import { NodeDetailsSheet } from "./components/NodeDetailsSheet";
import { ToastContainer } from "./components/ToastContainer";
import { VolumeNode } from "./components/VolumeNode";
import { useNodeSearch } from "./hooks/useNodeSearch";
import { useTopologyData } from "./hooks/useTopologyData";
import { autoLayout } from "./utils/autoLayout";

const nodeTypes = {
	networkNode: NetworkNode,
	containerNode: ContainerNode,
	volumeNode: VolumeNode,
	imageNode: ImageNode,
};

function Flow() {
	const [selectedNode, setSelectedNode] = useState<{
		id: string;
		name: string;
		type: string;
	} | null>(null);

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

	const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
		null,
	);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const hoverTimeoutRef = useRef<any | null>(null);
	const { fitView, setCenter, getNode } = useReactFlow();

	const {
		searchQuery,
		setSearchQuery,
		isSearchFocused,
		setIsSearchFocused,
		searchSelectedIndex,
		matchedNodes,
		handleSearchSelect,
		handleSearchKeyDown,
	} = useNodeSearch(nodes, getNode, setCenter);

	const getConnectedNodes = useCallback(
		(nodeId: string, currentEdges: Edge[]) => {
			const connected = new Set<string>();
			connected.add(nodeId);
			const allEdges = rawDataRef.current?.edges || currentEdges;
			allEdges.forEach((e: any) => {
				if (e.source === nodeId) connected.add(e.target);
				if (e.target === nodeId) connected.add(e.source);
			});
			return connected;
		},
		[rawDataRef],
	);

	const onNodeMouseEnter = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = setTimeout(() => {
				setHighlightedNodeId(node.id);
			}, 1000);
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

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "f") {
				if (!selectedNode) {
					e.preventDefault();
					searchInputRef.current?.focus();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [selectedNode]);

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

	const connectedNodes = highlightedNodeId
		? getConnectedNodes(highlightedNodeId, edges)
		: null;

	const filteredNodes = nodes.map((node) => {
		let opacity = 1;
		if (searchQuery.trim()) {
			const label = (node.data?.label as string)?.toLowerCase() || "";
			if (!label.includes(searchQuery.toLowerCase())) opacity = 0.2;
		}
		if (highlightedNodeId && connectedNodes) {
			if (!connectedNodes.has(node.id)) opacity = Math.min(opacity, 0.2);
			else opacity = 1;
		}
		return {
			...node,
			style: { ...node.style, opacity, transition: "opacity 0.2s" },
		};
	});

	const filteredEdges = edges.map((edge) => {
		let opacity = 1;
		if (highlightedNodeId) {
			if (
				edge.source !== highlightedNodeId &&
				edge.target !== highlightedNodeId
			) {
				opacity = 0.2;
			}
		}
		return {
			...edge,
			style: { ...edge.style, opacity, transition: "opacity 0.2s" },
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

				<AppHeader
					searchInputRef={searchInputRef}
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					isSearchFocused={isSearchFocused}
					setIsSearchFocused={setIsSearchFocused}
					matchedNodes={matchedNodes}
					searchSelectedIndex={searchSelectedIndex}
					handleSearchKeyDown={handleSearchKeyDown}
					handleSearchSelect={handleSearchSelect}
					loading={loading}
					handleAutoLayout={handleAutoLayout}
					fetchGraphData={fetchGraphData}
					setShowEvents={setShowEvents}
				/>

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

function App() {
	const params = new URLSearchParams(window.location.search);
	const logsParam = params.get("logs");
	const nameParam = params.get("name");
	const attachParam = params.get("attach");
	const shellParam = params.get("shell") || "/bin/sh";
	const sidecarParam = params.get("sidecar") === "true";
	const filesParam = params.get("files");
	const apiPrefixParam = params.get("apiPrefix");
	const typeParam = params.get("type") as "volume" | "container";

	if (logsParam && nameParam) {
		return <LogsTerminal containerId={logsParam} containerName={nameParam} />;
	}

	if (attachParam && nameParam) {
		return (
			<AttachScreen
				containerId={attachParam}
				containerName={nameParam}
				shell={shellParam}
				isSidecar={sidecarParam}
			/>
		);
	}

	if (filesParam === "true" && apiPrefixParam && nameParam && typeParam) {
		return (
			<FileBrowserScreen
				apiPrefix={apiPrefixParam}
				nodeName={nameParam}
				type={typeParam}
			/>
		);
	}

	return (
		<div className="w-full h-screen dark bg-background text-foreground">
			<ReactFlowProvider>
				<Flow />
			</ReactFlowProvider>
			<ToastContainer />
		</div>
	);
}

export default App;
