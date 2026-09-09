import type { ContainerInfo, NetworkInspectInfo } from "dockerode";
import { NodeType } from "../node-type";
import { COLUMN, ROW_GAP } from "./constants";
import {
	type ContainerRows,
	type GraphNode,
	midpoint,
	networkNodeId,
} from "./types";

function attachedContainerCount(
	containers: ContainerInfo[],
	networkId: string,
): number {
	return containers.filter((container) =>
		Object.values(container.NetworkSettings?.Networks ?? {}).some(
			(network) => network.NetworkID === networkId,
		),
	).length;
}

/** Centres each network beside the containers it owns; strays stack below. */
export function buildNetworkLayer(
	networks: NetworkInspectInfo[],
	containers: ContainerInfo[],
	rows: ContainerRows,
	byPrimaryNetwork: Map<string, string[]>,
	startY: number,
): { nodes: GraphNode[]; nextY: number } {
	const nodes: GraphNode[] = [];
	let nextY = startY;

	for (const network of networks) {
		const memberYs = (byPrimaryNetwork.get(network.Id) ?? [])
			.map((id) => rows.get(id))
			.filter((y): y is number => y !== undefined);

		let y: number;
		if (memberYs.length > 0) {
			y = midpoint(memberYs);
		} else {
			y = nextY;
			nextY += ROW_GAP;
		}

		nodes.push({
			id: networkNodeId(network.Id),
			type: NodeType.Network,
			data: {
				label: network.Name,
				driver: network.Driver,
				scope: network.Scope,
				count: attachedContainerCount(containers, network.Id),
			},
			position: { x: COLUMN.network, y },
		});
	}

	return { nodes, nextY };
}
