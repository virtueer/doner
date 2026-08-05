import { type Node } from "@xyflow/react";
import { useEffect } from "react";

export function useFlowShortcuts(
	nodes: Node[],
	selectedNode: any,
	searchInputRef: React.RefObject<HTMLInputElement>,
) {
	// Save nodes positions when they change
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

	// Search shortcut
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
	}, [selectedNode, searchInputRef]);
}
