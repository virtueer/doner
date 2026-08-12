import type { Node } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";

export function useNodeSearch(
	nodes: Node[],
	getNode: (id: string) => Node | undefined,
	setCenter: (x: number, y: number, options?: any) => void,
) {
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);

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

		const node = getNode(nodeId);
		if (node?.position) {
			setCenter(node.position.x + 150, node.position.y + 100, {
				zoom: 1.2,
				duration: 800,
			});
		}
		setIsSearchFocused(false);
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
			handleSearchSelect(matchedNodes[searchSelectedIndex].id);
		} else if (e.key === "Escape") {
			setIsSearchFocused(false);
		}
	};

	return {
		searchQuery,
		setSearchQuery,
		isSearchFocused,
		setIsSearchFocused,
		searchSelectedIndex,
		matchedNodes,
		handleSearchSelect,
		handleSearchKeyDown,
	};
}
