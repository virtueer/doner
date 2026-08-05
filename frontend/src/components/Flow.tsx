import { useQueryClient } from "@tanstack/react-query";
import {
	addEdge,
	Background,
	Controls,
	type Node,
	Panel,
	ReactFlow,
	useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDockerEvents } from "@/hooks/useDockerEvents";
import { useFlowGraph } from "@/hooks/useFlowGraph";
import { useFlowSearchAndHover } from "@/hooks/useFlowSearchAndHover";
import { useFlowShortcuts } from "@/hooks/useFlowShortcuts";
import { autoLayout } from "@/lib/layoutUtils";
import { ContainerNode } from "./ContainerNode";
import { EventsSheet } from "./EventsSheet";
import { FlowToolbar } from "./FlowToolbar";
import { ImageNode } from "./ImageNode";
import { NetworkNode } from "./NetworkNode";
import { NodeDetailsSheet } from "./NodeDetailsSheet";
import { SearchBar } from "./SearchBar";
import { VolumeNode } from "./VolumeNode";

const nodeTypes = {
	networkNode: NetworkNode,
	containerNode: ContainerNode,
	volumeNode: VolumeNode,
	imageNode: ImageNode,
};

export function Flow() {
	const queryClient = useQueryClient();
	const {
		nodes,
		setNodes,
		onNodesChange,
		edges,
		setEdges,
		onEdgesChange,
		isLoading,
		queryError,
		rawDataRef,
	} = useFlowGraph();

	const searchInputRef = useRef<HTMLInputElement>(null);
	const { fitView } = useReactFlow();

	const [showEvents, setShowEvents] = useState(false);
	const [selectedNode, setSelectedNode] = useState<{
		id: string;
		name: string;
		type: string;
	} | null>(null);

	const {
		globalEvents,
		pendingReopenNodeRef,
		selectedNodeFromEvent,
		setSelectedNodeFromEvent,
	} = useDockerEvents();

	useEffect(() => {
		if (selectedNodeFromEvent) {
			setSelectedNode(selectedNodeFromEvent);
			setSelectedNodeFromEvent(null);
		}
	}, [selectedNodeFromEvent, setSelectedNodeFromEvent]);

	useFlowShortcuts(
		nodes,
		selectedNode,
		searchInputRef as React.RefObject<HTMLInputElement>,
	);

	const { filteredNodes, filteredEdges, searchProps, hoverProps } =
		useFlowSearchAndHover(
			nodes,
			edges,
			rawDataRef,
			searchInputRef as React.RefObject<HTMLInputElement>,
		);

	const onConnect = useCallback(
		(params: any) => setEdges((eds) => addEdge(params, eds)),
		[setEdges],
	);

	// Click to open NodeDetailsSheet (inspect & logs)
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

	return (
		<>
			<ReactFlow
				nodes={filteredNodes}
				edges={filteredEdges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onNodeClick={handleNodeClick}
				onNodeMouseEnter={hoverProps.onNodeMouseEnter}
				onNodeMouseLeave={hoverProps.onNodeMouseLeave}
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
				<Panel position="top-left" className="m-4">
					<SearchBar
						searchQuery={searchProps.searchQuery}
						setSearchQuery={searchProps.setSearchQuery}
						isSearchFocused={searchProps.isSearchFocused}
						setIsSearchFocused={searchProps.setIsSearchFocused}
						matchedNodes={searchProps.matchedNodes}
						handleSearchSelect={searchProps.handleSearchSelect}
						searchSelectedIndex={searchProps.searchSelectedIndex}
						searchInputRef={searchInputRef}
						handleSearchKeyDown={searchProps.handleSearchKeyDown}
					/>
				</Panel>

				{/* Floating toolbar top-right */}
				<Panel
					position="top-right"
					className="flex items-center gap-2 m-4 bg-card/95 backdrop-blur-md p-1.5 rounded-xl border border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
				>
					<FlowToolbar
						loading={isLoading}
						handleAutoLayout={handleAutoLayout}
						fetchGraphData={() =>
							queryClient.invalidateQueries({ queryKey: ["network-graph"] })
						}
						setShowEvents={setShowEvents}
					/>
				</Panel>

				{/* Error toast */}
				{queryError && (
					<Panel position="top-center" className="m-3">
						<div className="bg-destructive/10 text-destructive border border-destructive px-4 py-2 rounded-md shadow-lg text-sm">
							{queryError.message}
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
