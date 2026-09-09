import type { Edge, Node } from "@xyflow/react";
import { resolveOverlaps } from "./overlaps";

export function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
	const images = nodes.filter((n) => n.type === "imageNode");
	const networks = nodes.filter((n) => n.type === "networkNode");
	const containers = nodes.filter((n) => n.type === "containerNode");
	const volumes = nodes.filter((n) => n.type === "volumeNode");

	const COL_IMAGE = -400;
	const COL_NETWORK = 0;
	const COL_CONTAINER = 420;
	const COL_VOLUME = 880;
	const ROW_GAP = 160;
	const GROUP_GAP = 60;

	const netToContainers = new Map<string, string[]>();
	const contToVolumes = new Map<string, string[]>();
	const imgToContainers = new Map<string, string[]>();

	edges.forEach((e) => {
		if (e.sourceHandle === "net-out") {
			const arr = netToContainers.get(e.target) || [];
			arr.push(e.source);
			netToContainers.set(e.target, arr);
		}
		if (e.sourceHandle === "vol-out") {
			const arr = contToVolumes.get(e.source) || [];
			arr.push(e.target);
			contToVolumes.set(e.source, arr);
		}
		if (e.sourceHandle === "img-out") {
			const arr = imgToContainers.get(e.source) || [];
			arr.push(e.target);
			imgToContainers.set(e.source, arr);
		}
	});

	const placed = new Set<string>();
	const orderedContainers: Node[] = [];
	const groupRanges: Array<{ netId: string; start: number; end: number }> = [];

	networks.forEach((net) => {
		const connectedIds = netToContainers.get(net.id) || [];
		if (connectedIds.length === 0) return;
		const start = orderedContainers.length;
		connectedIds.forEach((cId) => {
			if (!placed.has(cId)) {
				const node = containers.find((c) => c.id === cId);
				if (node) {
					orderedContainers.push(node);
					placed.add(cId);
				}
			}
		});
		const end = orderedContainers.length - 1;
		if (end >= start) groupRanges.push({ netId: net.id, start, end });
	});
	containers.forEach((c) => {
		if (!placed.has(c.id)) orderedContainers.push(c);
	});

	const containerPositions = new Map<string, { x: number; y: number }>();
	let currentY = 0;
	let prevEnd = -1;

	orderedContainers.forEach((c, i) => {
		const group = groupRanges.find((g) => g.start === i);
		if (group && prevEnd >= 0) currentY += GROUP_GAP;
		containerPositions.set(c.id, { x: COL_CONTAINER, y: currentY });
		currentY += ROW_GAP;
		const endGroup = groupRanges.find((g) => g.end === i);
		if (endGroup) prevEnd = i;
	});

	const networkPositions = new Map<string, { x: number; y: number }>();
	let fallbackY = currentY;

	networks.forEach((net) => {
		const group = groupRanges.find((g) => g.netId === net.id);
		if (group) {
			const ys: number[] = [];
			for (let i = group.start; i <= group.end; i++) {
				const pos = containerPositions.get(orderedContainers[i].id);
				if (pos) ys.push(pos.y);
			}
			const minY = Math.min(...ys);
			const maxY = Math.max(...ys);
			networkPositions.set(net.id, { x: COL_NETWORK, y: (minY + maxY) / 2 });
		} else {
			networkPositions.set(net.id, { x: COL_NETWORK, y: fallbackY });
			fallbackY += ROW_GAP;
		}
	});

	const placedVols = new Set<string>();
	const volumePositions = new Map<string, { x: number; y: number }>();

	orderedContainers.forEach((cont) => {
		const volIds = contToVolumes.get(cont.id) || [];
		volIds.forEach((vId) => {
			if (!placedVols.has(vId)) placedVols.add(vId);
		});
	});

	const orderedVolumes = [
		...volumes.filter((v) => placedVols.has(v.id)),
		...volumes.filter((v) => !placedVols.has(v.id)),
	];

	orderedVolumes.forEach((vol) => {
		const connectedContYs: number[] = [];
		edges.forEach((e) => {
			if (e.sourceHandle === "vol-out" && e.target === vol.id) {
				const pos = containerPositions.get(e.source);
				if (pos) connectedContYs.push(pos.y);
			}
		});

		if (connectedContYs.length > 0) {
			const minY = Math.min(...connectedContYs);
			const maxY = Math.max(...connectedContYs);
			let targetY = (minY + maxY) / 2;

			let overlap = true;
			while (overlap) {
				overlap = false;
				for (const [_, pos] of volumePositions) {
					if (Math.abs(pos.y - targetY) < 100) {
						targetY += 120;
						overlap = true;
						break;
					}
				}
			}
			volumePositions.set(vol.id, { x: COL_VOLUME, y: targetY });
		} else {
			volumePositions.set(vol.id, { x: COL_VOLUME, y: fallbackY });
			fallbackY += ROW_GAP;
		}
	});

	const imagePositions = new Map<string, { x: number; y: number }>();

	images.sort((a, b) => {
		const aUsed = (imgToContainers.get(a.id) || []).length > 0 ? 1 : 0;
		const bUsed = (imgToContainers.get(b.id) || []).length > 0 ? 1 : 0;
		return bUsed - aUsed;
	});

	let unusedImgY = 0;

	images.forEach((img) => {
		const connectedIds = imgToContainers.get(img.id) || [];
		if (connectedIds.length > 0) {
			const ys = connectedIds
				.map((cId) => containerPositions.get(cId)?.y)
				.filter((y) => y !== undefined) as number[];
			if (ys.length > 0) {
				const minY = Math.min(...ys);
				const maxY = Math.max(...ys);
				imagePositions.set(img.id, { x: COL_IMAGE, y: (minY + maxY) / 2 });
				return;
			}
		}
		imagePositions.set(img.id, { x: COL_IMAGE - 320, y: unusedImgY });
		unusedImgY += ROW_GAP;
	});

	const posArray = nodes.map((node) => {
		const pos =
			imagePositions.get(node.id) ||
			networkPositions.get(node.id) ||
			containerPositions.get(node.id) ||
			volumePositions.get(node.id) ||
			node.position;
		return { ...node, position: pos };
	});

	return resolveOverlaps(posArray);
}
