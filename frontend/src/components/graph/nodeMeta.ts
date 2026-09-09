import type { LucideIcon } from "lucide-react";
import { Box, HardDrive, Info, Layers, Network } from "lucide-react";

interface NodeMeta {
	icon: LucideIcon;
	label: string;
	text: string;
}

const NODE_META: Record<string, NodeMeta> = {
	containerNode: { icon: Box, label: "Container", text: "text-container" },
	networkNode: { icon: Network, label: "Network", text: "text-network" },
	volumeNode: { icon: HardDrive, label: "Volume", text: "text-volume" },
	imageNode: { icon: Layers, label: "Image", text: "text-image" },
};

const FALLBACK_META: NodeMeta = {
	icon: Info,
	label: "Node",
	text: "text-idle",
};

export const nodeMeta = (type?: string): NodeMeta =>
	(type && NODE_META[type]) || FALLBACK_META;
