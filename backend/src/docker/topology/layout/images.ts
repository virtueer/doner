import type { ContainerInfo, ImageInfo } from "dockerode";
import { NodeType } from "../node-type";
import { COLUMN, EDGE_COLOR, ROW_GAP } from "./constants";
import {
	type ContainerRows,
	containerNodeId,
	type Graph,
	imageNodeId,
	midpoint,
} from "./types";

const UNTAGGED = "<none>:<none>";

function isDangling(image: ImageInfo): boolean {
	const tags = image.RepoTags ?? [];
	return tags.length === 0 || tags.includes(UNTAGGED);
}

function imageLabel(image: ImageInfo): string {
	if (!isDangling(image)) return (image.RepoTags as string[])[0];
	return image.Id.replace("sha256:", "").slice(0, 12);
}

/** Places images left of the containers that run them; unused ones get their own column. */
export function buildImageLayer(
	images: ImageInfo[],
	containers: ContainerInfo[],
	rows: ContainerRows,
): Graph {
	const nodes: Graph["nodes"] = [];
	const edges: Graph["edges"] = [];

	const usedIds = new Set(
		containers.map((container) => container.ImageID).filter(Boolean),
	);
	const ordered = [...images].sort(
		(a, b) => Number(usedIds.has(b.Id)) - Number(usedIds.has(a.Id)),
	);

	let unusedY = 0;

	for (const image of ordered) {
		const isUsed = usedIds.has(image.Id);
		if (!isUsed && isDangling(image)) continue;

		const nodeId = imageNodeId(image.Id);
		const runningYs: number[] = [];

		for (const container of containers) {
			if (container.ImageID !== image.Id) continue;

			const y = rows.get(container.Id);
			if (y !== undefined) runningYs.push(y);

			edges.push({
				id: `edge-${nodeId}-${containerNodeId(container.Id)}`,
				source: nodeId,
				sourceHandle: "img-out",
				target: containerNodeId(container.Id),
				animated: false,
				style: { stroke: EDGE_COLOR.image },
			});
		}

		const position =
			runningYs.length > 0
				? { x: COLUMN.image, y: midpoint(runningYs) }
				: { x: COLUMN.unusedImage, y: unusedY };
		if (runningYs.length === 0) unusedY += ROW_GAP;

		nodes.push({
			id: nodeId,
			type: NodeType.Image,
			data: {
				label: imageLabel(image),
				size: image.Size,
				created: image.Created,
				isUsed,
			},
			position,
		});
	}

	return { nodes, edges };
}
