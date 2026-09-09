import type { ContainerInfo, NetworkInspectInfo } from "dockerode";
import { GROUP_GAP, ROW_GAP } from "./constants";
import type { ContainerRows } from "./types";

interface NetworkGroup {
	startIndex: number;
	endIndex: number;
}

export interface ContainerOrder {
	orderedIds: string[];
	/** Container ids whose *first* network is the keyed network. */
	byPrimaryNetwork: Map<string, string[]>;
	groups: NetworkGroup[];
}

function primaryNetworkId(container: ContainerInfo): string | undefined {
	const networks = Object.values(container.NetworkSettings?.Networks ?? {});
	return networks[0]?.NetworkID;
}

/** Groups containers under the network they attach to first, keeping edges short. */
export function orderContainers(
	networks: NetworkInspectInfo[],
	containers: ContainerInfo[],
): ContainerOrder {
	const byPrimaryNetwork = new Map<string, string[]>(
		networks.map((network) => [network.Id, []]),
	);

	for (const container of containers) {
		const networkId = primaryNetworkId(container);
		if (networkId) byPrimaryNetwork.get(networkId)?.push(container.Id);
	}

	const orderedIds: string[] = [];
	const groups: NetworkGroup[] = [];
	const placed = new Set<string>();

	for (const network of networks) {
		const memberIds = byPrimaryNetwork.get(network.Id) ?? [];
		if (memberIds.length === 0) continue;

		const startIndex = orderedIds.length;
		for (const id of memberIds) {
			if (placed.has(id)) continue;
			orderedIds.push(id);
			placed.add(id);
		}

		if (orderedIds.length > startIndex) {
			groups.push({ startIndex, endIndex: orderedIds.length - 1 });
		}
	}

	for (const container of containers) {
		if (!placed.has(container.Id)) orderedIds.push(container.Id);
	}

	return { orderedIds, byPrimaryNetwork, groups };
}

/** Stacks containers vertically, leaving a wider gap between network groups. */
export function placeContainerRows({ orderedIds, groups }: ContainerOrder): {
	rows: ContainerRows;
	nextY: number;
} {
	const rows: ContainerRows = new Map();
	let y = 0;
	let sawGroupEnd = false;

	orderedIds.forEach((id, index) => {
		if (sawGroupEnd && groups.some((group) => group.startIndex === index)) {
			y += GROUP_GAP;
		}

		rows.set(id, y);
		y += ROW_GAP;

		if (groups.some((group) => group.endIndex === index)) sawGroupEnd = true;
	});

	return { rows, nextY: y };
}
