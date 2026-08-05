import { type Edge, type Node } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useFlowSearchAndHover(
	nodes: Node[],
	edges: Edge[],
	rawDataRef: React.MutableRefObject<any>,
	searchInputRef: React.RefObject<HTMLInputElement>,
) {
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
		null,
	);
	const hoverTimeoutRef = useRef<any | null>(null);

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

	return {
		filteredNodes,
		filteredEdges,
		searchProps: {
			searchQuery,
			setSearchQuery,
			isSearchFocused,
			setIsSearchFocused,
			matchedNodes,
			handleSearchSelect,
			searchSelectedIndex,
			handleSearchKeyDown,
		},
		hoverProps: {
			onNodeMouseEnter,
			onNodeMouseLeave,
		},
	};
}
