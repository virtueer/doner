import type { ContainerInfo } from "dockerode";
import { NodeType } from "../node-type";
import {
	COLUMN,
	EDGE_COLOR,
	EDGE_LABEL_COLOR,
	EDGE_LABEL_FONT_SIZE,
} from "./constants";
import {
	type ContainerRows,
	containerNodeId,
	type Graph,
	networkNodeId,
} from "./types";

function volumeMountNames(container: ContainerInfo): string[] {
	return (container.Mounts ?? [])
		.filter((mount) => mount.Type === "volume" && mount.Name)
		.map((mount) => mount.Name as string);
}

export function buildContainerLayer(
	containers: ContainerInfo[],
	rows: ContainerRows,
	knownNetworkIds: Set<string>,
): Graph {
	const nodes: Graph["nodes"] = [];
	const edges: Graph["edges"] = [];
	const byId = new Map(
		containers.map((container) => [container.Id, container]),
	);

	for (const [id, y] of rows) {
		const container = byId.get(id);
		if (!container) continue;

		const nodeId = containerNodeId(container.Id);
		nodes.push({
			id: nodeId,
			type: NodeType.Container,
			data: {
				label: container.Names[0]?.replace("/", "") || container.Id,
				state: container.State,
				image: container.Image,
				mounts: volumeMountNames(container),
				isInternal: container.Labels?.["doner.internal"] === "true",
			},
			position: { x: COLUMN.container, y },
		});

		for (const network of Object.values(
			container.NetworkSettings?.Networks ?? {},
		)) {
			if (!knownNetworkIds.has(network.NetworkID)) continue;

			edges.push({
				id: `edge-${nodeId}-${networkNodeId(network.NetworkID)}`,
				source: nodeId,
				sourceHandle: "net-out",
				target: networkNodeId(network.NetworkID),
				animated: container.State === "running",
				label: network.IPAddress || undefined,
				style: { stroke: EDGE_COLOR.network },
				labelStyle: {
					fill: EDGE_LABEL_COLOR.network,
					fontSize: EDGE_LABEL_FONT_SIZE,
				},
			});
		}
	}

	return { nodes, edges };
}
