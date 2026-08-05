import { type Edge, type Node } from "@xyflow/react";

/**
 * Returns approximate [width, height] for a given node type.
 */
export function getNodeDimensions(type?: string): [number, number] {
	switch (type) {
		case "containerNode":
			return [310, 120];
		case "networkNode":
			return [280, 100];
		case "volumeNode":
			return [260, 110];
		case "imageNode":
			return [250, 130];
		default:
			return [280, 120];
	}
}

/**
 * Resolves overlaps by pushing nodes apart along the Y axis within the same column,
 * and checking actual per-node-type dimensions for cross-column overlaps.
 */
export function resolveOverlaps(
	nodes: Node[],
	lockedIds: Set<string> = new Set(),
): Node[] {
	const PADDING = 30;

	const newNodes = [...nodes].map((n) => ({
		...n,
		position: { ...n.position },
	}));

	// Group nodes by their column (x position rounded to nearest 50px)
	// This way nodes in the same column are sorted and spaced properly
	const columnGroups = new Map<number, number[]>();
	newNodes.forEach((n, idx) => {
		if (!n.position) return;
		const colKey = Math.round(n.position.x / 50) * 50;
		const arr = columnGroups.get(colKey) || [];
		arr.push(idx);
		columnGroups.set(colKey, arr);
	});

	// First pass: within each column, sort by Y and enforce minimum vertical spacing
	for (const [_, indices] of columnGroups) {
		if (indices.length < 2) continue;

		// Sort by current Y position
		indices.sort((a, b) => newNodes[a].position.y - newNodes[b].position.y);

		for (let i = 1; i < indices.length; i++) {
			const prevNode = newNodes[indices[i - 1]];
			const currNode = newNodes[indices[i]];
			const [, prevH] = getNodeDimensions(prevNode.type);
			const minDist = prevH + PADDING;
			const gap = currNode.position.y - prevNode.position.y;

			if (gap < minDist) {
				const deficit = minDist - gap;
				const prevLocked = lockedIds.has(prevNode.id);
				const currLocked = lockedIds.has(currNode.id);

				if (!currLocked && !prevLocked) {
					currNode.position.y += deficit / 2 + 1;
					prevNode.position.y -= deficit / 2 + 1;
				} else if (!currLocked) {
					currNode.position.y += deficit + 2;
				} else if (!prevLocked) {
					prevNode.position.y -= deficit + 2;
				} else {
					// Both locked — force curr down
					currNode.position.y += deficit + 2;
				}
			}
		}
	}

	// Second pass: general pairwise overlap resolution for cross-column overlaps
	let moved = true;
	let iterations = 0;
	const MAX_ITERATIONS = 100;

	while (moved && iterations < MAX_ITERATIONS) {
		moved = false;
		for (let i = 0; i < newNodes.length; i++) {
			for (let j = i + 1; j < newNodes.length; j++) {
				const n1 = newNodes[i];
				const n2 = newNodes[j];
				if (!n1.position || !n2.position) continue;

				const [w1, h1] = getNodeDimensions(n1.type);
				const [w2, h2] = getNodeDimensions(n2.type);

				const dx = n1.position.x - n2.position.x;
				const dy = n1.position.y - n2.position.y;
				const absDx = Math.abs(dx);
				const absDy = Math.abs(dy);

				const minDistX = (w1 + w2) / 2 + PADDING;
				const minDistY = (h1 + h2) / 2 + PADDING;

				if (absDx < minDistX && absDy < minDistY) {
					moved = true;

					// Small random nudge if perfectly overlapping
					if (dx === 0 && dy === 0) {
						n1.position.y += Math.random() * 20 - 10;
						n2.position.y -= Math.random() * 20 - 10;
						continue;
					}

					const overlapX = minDistX - absDx;
					const overlapY = minDistY - absDy;

					const n1Locked = lockedIds.has(n1.id);
					const n2Locked = lockedIds.has(n2.id);

					// Push along the axis of smallest overlap
					if (overlapX < overlapY) {
						const pushX = overlapX / 2 + 4;
						const sign = dx > 0 ? 1 : -1;

						if (!n1Locked && !n2Locked) {
							n1.position.x += pushX * sign;
							n2.position.x -= pushX * sign;
						} else if (!n1Locked) {
							n1.position.x += pushX * 2 * sign;
						} else if (!n2Locked) {
							n2.position.x -= pushX * 2 * sign;
						}
					} else {
						const pushY = overlapY / 2 + 4;
						const sign = dy > 0 ? 1 : -1;

						if (!n1Locked && !n2Locked) {
							n1.position.y += pushY * sign;
							n2.position.y -= pushY * sign;
						} else if (!n1Locked) {
							n1.position.y += pushY * 2 * sign;
						} else if (!n2Locked) {
							n2.position.y -= pushY * 2 * sign;
						}
					}
				}
			}
		}
		iterations++;
	}

	return newNodes;
}

/**
 * Auto-layout: places networks on left, containers in middle, volumes on right.
 * Groups containers by their primary network so edges stay short.
 */
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

	// Build maps: network -> containers, container -> volumes, image -> containers
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

	// Order containers grouped by primary network
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

	// Compute Y positions with group gaps
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

	// Network positions: centered on their container group
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

	// Volume positions: centered on their connected containers
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
		// Find all containers connected to this volume
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

			// Prevent overlapping (now also handled by resolveOverlaps but good for initial)
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

	// Image positions: centered on their connected containers
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
		// Unused image
		imagePositions.set(img.id, { x: COL_IMAGE - 320, y: unusedImgY });
		unusedImgY += ROW_GAP;
	});

	// Collect all tentative positions
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
