import { useQuery } from "@tanstack/react-query";
import {
	type Edge,
	type Node,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { resolveOverlaps } from "@/lib/layoutUtils";

export function useFlowGraph() {
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const rawDataRef = useRef<{ nodes: any[]; edges: any[] } | null>(null);

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
		refetchInterval: 10000,
	});

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

	return {
		nodes,
		setNodes,
		onNodesChange,
		edges,
		setEdges,
		onEdgesChange,
		isLoading,
		queryError,
		rawDataRef,
	};
}
