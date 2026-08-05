import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	addEdge,
	Background,
	Controls,
	type Edge,
	type Node,
	Panel,
	ReactFlow,
	useEdgesState,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { autoLayout, resolveOverlaps } from "@/lib/layoutUtils";
import { toast } from "@/lib/toast";
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
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const { fitView } = useReactFlow();
	const rawDataRef = useRef<{ nodes: any[]; edges: any[] } | null>(null);

	const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
		null,
	);
	const hoverTimeoutRef = useRef<any | null>(null);

	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);

	const [globalEvents, setGlobalEvents] = useState<any[]>([]);
	const [showEvents, setShowEvents] = useState(false);
	const pendingReopenNodeRef = useRef<{
		id: string;
		name: string;
		type: string;
	} | null>(null);

	// Fetch graph data using TanStack Query
	const {
		data: graphData,
		isLoading,
		error: queryError,
	} = useQuery({
		queryKey: ["network-graph"],
		queryFn: async () => {
			const res = await api.get("/api/network-graph");
			return res.data;
		},
		refetchInterval: 10000, // Poll every 10s automatically
	});

	// Sync fetched graphData into ReactFlow nodes/edges state
	useEffect(() => {
		if (!graphData) return;
		rawDataRef.current = graphData;

		setNodes((currentNodes) => {
			const savedStateStr = localStorage.getItem("flow-nodes-state");
			const savedState = savedStateStr ? JSON.parse(savedStateStr) : [];
			const savedNodes = new Map(savedState.map((n: any) => [n.id, n]));

			const existingNodes = new Map(currentNodes.map((n: any) => [n.id, n]));

			const lockedIds = new Set<string>();

			const resolvedNodes = graphData.nodes.map((newNode: any) => {
				const existing =
					existingNodes.get(newNode.id) || savedNodes.get(newNode.id);
				if (existing) {
					lockedIds.add(newNode.id);
					return {
						...newNode,
						position: existing.position,
					};
				}
				return newNode;
			});

			return resolveOverlaps(resolvedNodes, lockedIds);
		});

		setEdges(
			graphData.edges.map((e: any) =>
				e.sourceHandle === "img-out" ? { ...e, hidden: true } : e,
			),
		);
	}, [graphData, setNodes, setEdges]);

	useEffect(() => {
		if (isSearchFocused) {
			try {
				const recent = JSON.parse(
					localStorage.getItem("recent-searches") || "[]",
				);
				setRecentSearches(recent);
			} catch (_e) {}
		}
	}, [isSearchFocused]);

	const matchedNodes = useMemo(() => {
		if (!searchQuery.trim()) {
			return recentSearches
				.map((id) => nodes.find((n) => n.id === id))
				.filter(Boolean) as Node[];
		}
		const q = searchQuery.toLowerCase();
		return nodes.filter((n) =>
			(n.data?.label as string)?.toLowerCase().includes(q),
		);
	}, [nodes, searchQuery, recentSearches]);

	useEffect(() => {
		setSearchSelectedIndex(0);
	}, []);

	const handleSearchSelect = (nodeId: string) => {
		const recent = JSON.parse(localStorage.getItem("recent-searches") || "[]");
		const newRecent = [
			nodeId,
			...recent.filter((id: string) => id !== nodeId),
		].slice(0, 5);
		localStorage.setItem("recent-searches", JSON.stringify(newRecent));
		setRecentSearches(newRecent);

		setSearchQuery("");
		setIsSearchFocused(false);
		setHighlightedNodeId(nodeId);
		setTimeout(() => setHighlightedNodeId(null), 3000);
	};

	const handleSearchKeyDown = (e: React.KeyboardEvent) => {
		if (!isSearchFocused || matchedNodes.length === 0) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSearchSelectedIndex((prev) => (prev + 1) % matchedNodes.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSearchSelectedIndex(
				(prev) => (prev - 1 + matchedNodes.length) % matchedNodes.length,
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const selected = matchedNodes[searchSelectedIndex];
			if (selected) handleSearchSelect(selected.id);
		} else if (e.key === "Escape") {
			setIsSearchFocused(false);
			searchInputRef.current?.blur();
		}
	};

	const onConnect = useCallback(
		(params: any) => setEdges((eds) => addEdge(params, eds)),
		[setEdges],
	);

	const [selectedNode, setSelectedNode] = useState<{
		id: string;
		name: string;
		type: string;
	} | null>(null);

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

	// Global Docker events stream
	useEffect(() => {
		const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
		const es = new EventSource(`${apiUrl}/api/events`);
		es.onmessage = (event) => {
			try {
				const e = JSON.parse(event.data);
				const action = e.Action || e.status;
				const type = e.Type || e.type;

				if (e.Actor?.Attributes?.["doner.internal"] === "true") {
					return;
				}

				setGlobalEvents((prev) => {
					const next = [e, ...prev];
					return next.length > 200 ? next.slice(0, 200) : next;
				});

				if (action === "start" && type === "container") {
					toast(`Container ${e.Actor?.Attributes?.name} started`, "success");
					queryClient.invalidateQueries({ queryKey: ["network-graph"] });
					if (pendingReopenNodeRef.current) {
						const pendingId = pendingReopenNodeRef.current.id.replace(
							"cont-",
							"",
						);
						const eventId = e.id || e.Actor?.ID || "";
						if (
							eventId.startsWith(pendingId) ||
							pendingId.startsWith(eventId)
						) {
							setSelectedNode(pendingReopenNodeRef.current);
							pendingReopenNodeRef.current = null;
						}
					}
				} else if (action === "die" && type === "container") {
					toast(`Container ${e.Actor?.Attributes?.name} stopped`, "error");
					queryClient.invalidateQueries({ queryKey: ["network-graph"] });
				} else if (action === "destroy" && type === "container") {
					toast(`Container ${e.Actor?.Attributes?.name} removed`, "error");
					queryClient.invalidateQueries({ queryKey: ["network-graph"] });
				} else if (action === "destroy" && type === "volume") {
					toast(`Volume ${e.Actor?.Attributes?.name} removed`, "error");
					queryClient.invalidateQueries({ queryKey: ["network-graph"] });
				}
			} catch (_err) {}
		};

		return () => {
			es.close();
		};
	}, [queryClient]);

	// Save nodes positions when they change (only end positions to avoid spam)
	useEffect(() => {
		const saveNodes = setTimeout(() => {
			if (nodes.length > 0) {
				const minimalNodes = nodes.map((n) => ({
					id: n.id,
					position: n.position,
				}));
				localStorage.setItem("flow-nodes-state", JSON.stringify(minimalNodes));
			}
		}, 1000);
		return () => clearTimeout(saveNodes);
	}, [nodes]);

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

	const getConnectedNodes = useCallback(
		(nodeId: string, currentEdges: Edge[]) => {
			const connected = new Set<string>();
			connected.add(nodeId);

			// Use raw data if available to include connections that are hidden from the visual graph (e.g. image edges)
			const allEdges = rawDataRef.current?.edges || currentEdges;

			allEdges.forEach((e: any) => {
				if (e.source === nodeId) connected.add(e.target);
				if (e.target === nodeId) connected.add(e.source);
			});
			return connected;
		},
		[],
	);

	// Apply search and hover highlighting
	const connectedNodes = highlightedNodeId
		? getConnectedNodes(highlightedNodeId, edges)
		: null;

	const filteredNodes = nodes.map((node) => {
		let opacity = 1;

		if (searchQuery.trim()) {
			const label = (node.data?.label as string)?.toLowerCase() || "";
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
				transition: "opacity 0.2s",
			},
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

				{/* Search Bar (Top Left) */}
				<Panel position="top-left" className="m-4">
					<SearchBar
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
						isSearchFocused={isSearchFocused}
						setIsSearchFocused={setIsSearchFocused}
						matchedNodes={matchedNodes}
						handleSearchSelect={handleSearchSelect}
						searchSelectedIndex={searchSelectedIndex}
						searchInputRef={searchInputRef}
						handleSearchKeyDown={handleSearchKeyDown}
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
