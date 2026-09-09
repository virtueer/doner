import type {
	ContainerInfo,
	ImageInfo,
	NetworkInspectInfo,
	VolumeInspectInfo,
} from "dockerode";
import type { NodeType } from "../node-type";

export interface GraphInput {
	networks: NetworkInspectInfo[];
	containers: ContainerInfo[];
	volumes: { Volumes: VolumeInspectInfo[] | null };
	images: ImageInfo[];
}

export interface GraphNode {
	id: string;
	type: NodeType;
	data: Record<string, unknown>;
	position: { x: number; y: number };
}

interface GraphEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle: string;
	animated: boolean;
	label?: string;
	style: { stroke: string };
	labelStyle?: { fill: string; fontSize: number };
}

export interface Graph {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

/** Y coordinate of each container node, keyed by container id. */
export type ContainerRows = Map<string, number>;

export const containerNodeId = (id: string) => `cont-${id}`;
export const networkNodeId = (id: string) => `net-${id}`;
export const volumeNodeId = (name: string) => `vol-${name}`;
export const imageNodeId = (id: string) => `img-${id}`;

export function midpoint(values: number[]): number {
	return (Math.min(...values) + Math.max(...values)) / 2;
}
