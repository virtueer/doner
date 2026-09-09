import { orderContainers, placeContainerRows } from "./container-rows";
import { buildContainerLayer } from "./containers";
import { buildImageLayer } from "./images";
import { buildNetworkLayer } from "./networks";
import type { Graph, GraphInput } from "./types";
import { buildVolumeLayer } from "./volumes";

/**
 * Lays the topology out in columns — images, networks, containers, volumes —
 * with every column vertically aligned to the containers it connects to.
 */
export function buildGraph({
	networks,
	containers,
	volumes,
	images,
}: GraphInput): Graph {
	const order = orderContainers(networks, containers);
	const { rows, nextY } = placeContainerRows(order);

	const networkIds = new Set(networks.map((network) => network.Id));
	const containerLayer = buildContainerLayer(containers, rows, networkIds);
	const networkLayer = buildNetworkLayer(
		networks,
		containers,
		rows,
		order.byPrimaryNetwork,
		nextY,
	);
	const volumeLayer = buildVolumeLayer(
		volumes.Volumes ?? [],
		containers,
		rows,
		networkLayer.nextY,
	);
	const imageLayer = buildImageLayer(images, containers, rows);

	return {
		nodes: [
			...containerLayer.nodes,
			...networkLayer.nodes,
			...volumeLayer.nodes,
			...imageLayer.nodes,
		],
		edges: [...containerLayer.edges, ...volumeLayer.edges, ...imageLayer.edges],
	};
}
