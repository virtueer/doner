import type { ContainerInfo, VolumeInspectInfo } from "dockerode";
import { NodeType } from "../node-type";
import {
	COLUMN,
	EDGE_COLOR,
	EDGE_LABEL_COLOR,
	EDGE_LABEL_FONT_SIZE,
	ROW_GAP,
} from "./constants";
import {
	type ContainerRows,
	containerNodeId,
	type Graph,
	midpoint,
	volumeNodeId,
} from "./types";

/** Centres each volume beside its mounting containers; unused ones stack below. */
export function buildVolumeLayer(
	volumes: VolumeInspectInfo[],
	containers: ContainerInfo[],
	rows: ContainerRows,
	startY: number,
): Graph {
	const nodes: Graph["nodes"] = [];
	const edges: Graph["edges"] = [];
	const usedYs: number[] = [];

	for (const volume of volumes) {
		const nodeId = volumeNodeId(volume.Name);
		const mountedYs: number[] = [];

		for (const container of containers) {
			const mounts = (container.Mounts ?? []).filter(
				(mount) => mount.Type === "volume" && mount.Name === volume.Name,
			);

			for (const mount of mounts) {
				const y = rows.get(container.Id);
				if (y !== undefined) mountedYs.push(y);

				edges.push({
					id: `edge-${containerNodeId(container.Id)}-${nodeId}`,
					source: containerNodeId(container.Id),
					sourceHandle: "vol-out",
					target: nodeId,
					animated: container.State === "running",
					label: mount.Destination || undefined,
					style: { stroke: EDGE_COLOR.volume },
					labelStyle: {
						fill: EDGE_LABEL_COLOR.volume,
						fontSize: EDGE_LABEL_FONT_SIZE,
					},
				});
			}
		}

		const y =
			mountedYs.length > 0
				? midpoint(mountedYs)
				: usedYs.length > 0
					? Math.max(...usedYs) + ROW_GAP
					: startY;
		usedYs.push(y);

		nodes.push({
			id: nodeId,
			type: NodeType.Volume,
			data: {
				label: volume.Name,
				driver: volume.Driver,
				mountpoint: volume.Mountpoint,
				isUsed: mountedYs.length > 0,
			},
			position: { x: COLUMN.volume, y },
		});
	}

	return { nodes, edges };
}
