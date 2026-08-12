import type { Edge, Node } from "@xyflow/react";
import { useEdgesState, useNodesState } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "../lib/toast";
import { resolveOverlaps } from "../utils/autoLayout";

function areNodesEqual(prev: Node[], next: Node[]): boolean {
	if (prev.length !== next.length) return false;
	for (let i = 0; i < prev.length; i++) {
		const p = prev[i];
		const n = next[i];
		if (p.id !== n.id) return false;
		if (p.position?.x !== n.position?.x || p.position?.y !== n.position?.y)
			return false;
		if (p.data?.state !== n.data?.state) return false;
		if (p.data?.label !== n.data?.label) return false;
		if (p.data?.image !== n.data?.image) return false;
		if (p.data?.isInternal !== n.data?.isInternal) return false;
		if (p.data?.isUsed !== n.data?.isUsed) return false;
	}
	return true;
}

function areEdgesEqual(prev: Edge[], next: Edge[]): boolean {
	if (prev.length !== next.length) return false;
	for (let i = 0; i < prev.length; i++) {
		const p = prev[i];
		const n = next[i];
		if (
			p.id !== n.id ||
			p.source !== n.source ||
			p.target !== n.target ||
			p.hidden !== n.hidden
		)
			return false;
	}
	return true;
}

export function useTopologyData(setSelectedNode: (node: any) => void) {
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [globalEvents, setGlobalEvents] = useState<any[]>([]);
	const [showEvents, setShowEvents] = useState(false);

	const rawDataRef = useRef<{ nodes: any[]; edges: any[] } | null>(null);
	const pendingReopenNodeRef = useRef<{
		id: string;
		name: string;
		type: string;
	} | null>(null);

	const fetchGraphData = useCallback(async () => {
		try {
			setLoading(true);
			const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
			const res = await fetch(`${apiUrl}/api/network-graph`);
			if (!res.ok) throw new Error("Failed to fetch graph data");
			const data = await res.json();
			rawDataRef.current = data;

			setNodes((currentNodes) => {
				const savedStateStr = localStorage.getItem("flow-nodes-state");
				const savedState = savedStateStr ? JSON.parse(savedStateStr) : [];
				const savedNodes = new Map(savedState.map((n: any) => [n.id, n]));
				const existingNodes = new Map(currentNodes.map((n: any) => [n.id, n]));
				const lockedIds = new Set<string>();

				const resolvedNodes = data.nodes.map((newNode: any) => {
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

				const finalNodes = resolveOverlaps(resolvedNodes, lockedIds);
				if (areNodesEqual(currentNodes, finalNodes)) {
					return currentNodes;
				}
				return finalNodes;
			});

			setEdges((currentEdges) => {
				const newEdges = data.edges.map((e: any) =>
					e.sourceHandle === "img-out" ? { ...e, hidden: true } : e,
				);
				if (areEdgesEqual(currentEdges, newEdges)) {
					return currentEdges;
				}
				return newEdges;
			});

			setError(null);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [setNodes, setEdges]);

	useEffect(() => {
		fetchGraphData();
		const interval = setInterval(fetchGraphData, 10000);

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
					fetchGraphData();
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
					fetchGraphData();
				} else if (action === "create" && type === "container") {
					toast(`Container ${e.Actor?.Attributes?.name} created`, "info");
					fetchGraphData();
				} else if (action === "destroy" && type === "container") {
					toast(`Container ${e.Actor?.Attributes?.name} deleted`, "info");
					fetchGraphData();
				}
			} catch (_err) {}
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				fetchGraphData();
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			clearInterval(interval);
			es.close();
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [fetchGraphData, setSelectedNode]);

	// Persist node positions to localStorage (debounced)
	useEffect(() => {
		if (nodes.length === 0) return;
		const timeout = setTimeout(() => {
			const savedState = nodes.map((n: any) => ({
				id: n.id,
				position: n.position,
			}));
			localStorage.setItem("flow-nodes-state", JSON.stringify(savedState));
		}, 500);
		return () => clearTimeout(timeout);
	}, [nodes]);

	return {
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
	};
}
