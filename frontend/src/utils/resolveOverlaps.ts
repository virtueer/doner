import type { Node } from "@xyflow/react";

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

	const columnGroups = new Map<number, number[]>();
	newNodes.forEach((n, idx) => {
		if (!n.position) return;
		const colKey = Math.round(n.position.x / 50) * 50;
		const arr = columnGroups.get(colKey) || [];
		arr.push(idx);
		columnGroups.set(colKey, arr);
	});

	for (const [_, indices] of columnGroups) {
		if (indices.length < 2) continue;

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
					currNode.position.y += deficit + 2;
				}
			}
		}
	}

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

					if (dx === 0 && dy === 0) {
						n1.position.y += Math.random() * 20 - 10;
						n2.position.y -= Math.random() * 20 - 10;
						continue;
					}

					const overlapX = minDistX - absDx;
					const overlapY = minDistY - absDy;

					const n1Locked = lockedIds.has(n1.id);
					const n2Locked = lockedIds.has(n2.id);

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
