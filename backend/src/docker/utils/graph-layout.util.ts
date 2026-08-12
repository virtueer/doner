export interface GraphBuildInput {
	networks: any[];
	containers: any[];
	volumes: any;
	images: any[];
}

export function buildGraphLayout(input: GraphBuildInput) {
	const { networks, containers, volumes, images } = input;
	const nodes: any[] = [];
	const edges: any[] = [];

	// Layout constants
	const COL_IMG = -400;
	const COL_NET = 0;
	const COL_CONT = 420;
	const COL_VOL = 880;
	const ROW_GAP = 140;
	const GROUP_GAP = 60;

	// --- Step 1: Build container -> primary network mapping ---
	const containerPrimaryNet = new Map<string, string>();
	const netContainerIds = new Map<string, string[]>();
	networks.forEach((net) => {
		netContainerIds.set(net.Id, []);
	});

	containers.forEach((container) => {
		if (container.NetworkSettings?.Networks) {
			const netEntries = Object.entries(container.NetworkSettings.Networks);
			if (netEntries.length > 0) {
				const [, firstNetInfo] = netEntries[0] as [string, any];
				const primaryNetId = firstNetInfo.NetworkID;
				containerPrimaryNet.set(container.Id, primaryNetId);
				netContainerIds.get(primaryNetId)?.push(container.Id);
			}
		}
	});

	// --- Step 2: Order containers grouped by primary network ---
	const containerById = new Map(containers.map((c) => [c.Id, c]));
	const orderedContainerIds: string[] = [];
	const placed = new Set<string>();

	const networkGroups: Array<{
		netId: string;
		startIdx: number;
		endIdx: number;
	}> = [];

	networks.forEach((net) => {
		const connectedIds = netContainerIds.get(net.Id) || [];
		if (connectedIds.length === 0) return;
		const startIdx = orderedContainerIds.length;
		connectedIds.forEach((cId) => {
			if (!placed.has(cId)) {
				orderedContainerIds.push(cId);
				placed.add(cId);
			}
		});
		const endIdx = orderedContainerIds.length - 1;
		if (endIdx >= startIdx) {
			networkGroups.push({ netId: net.Id, startIdx, endIdx });
		}
	});

	containers.forEach((c) => {
		if (!placed.has(c.Id)) orderedContainerIds.push(c.Id);
	});

	// --- Step 3: Compute Y positions for containers ---
	const containerYPositions = new Map<string, number>();
	let currentY = 0;
	let prevGroupEnd = -1;

	orderedContainerIds.forEach((cId, idx) => {
		const group = networkGroups.find((g) => g.startIdx === idx);
		if (group && prevGroupEnd >= 0) {
			currentY += GROUP_GAP;
		}
		containerYPositions.set(cId, currentY);
		currentY += ROW_GAP;

		const endGroup = networkGroups.find((g) => g.endIdx === idx);
		if (endGroup) prevGroupEnd = idx;
	});

	// --- Step 4: Create container nodes ---
	const networkMap = new Map<string, string>();
	networks.forEach((net) => {
		networkMap.set(net.Id, `net-${net.Id}`);
	});

	orderedContainerIds.forEach((cId) => {
		const container = containerById.get(cId);
		if (!container) return;

		const containerId = `cont-${container.Id}`;
		const containerName = container.Names[0]?.replace("/", "") || container.Id;
		const y = containerYPositions.get(cId) ?? 0;

		const mountNames: string[] = [];
		if (container.Mounts) {
			container.Mounts.forEach((mount: any) => {
				if (mount.Type === "volume" && mount.Name) {
					mountNames.push(mount.Name);
				}
			});
		}

		nodes.push({
			id: containerId,
			type: "containerNode",
			data: {
				label: containerName,
				state: container.State,
				image: container.Image,
				mounts: mountNames,
				isInternal: container.Labels?.["doner.internal"] === "true",
			},
			position: { x: COL_CONT, y },
		});

		if (container.NetworkSettings?.Networks) {
			Object.entries(container.NetworkSettings.Networks).forEach(
				([, netInfo]: [string, any]) => {
					const netNodeId = networkMap.get(netInfo.NetworkID);
					if (netNodeId) {
						const ip = netInfo.IPAddress || "";
						edges.push({
							id: `edge-${containerId}-${netNodeId}`,
							source: containerId,
							sourceHandle: "net-out",
							target: netNodeId,
							animated: container.State === "running",
							label: ip || undefined,
							style: { stroke: "#6366f1" },
							labelStyle: { fill: "#a5b4fc", fontSize: 10 },
						});
					}
				},
			);
		}
	});

	// --- Step 5: Create network nodes ---
	networks.forEach((net) => {
		const nodeId = `net-${net.Id}`;
		const connectedIds = netContainerIds.get(net.Id) || [];

		let count = 0;
		containers.forEach((container) => {
			if (container.NetworkSettings?.Networks) {
				Object.values(container.NetworkSettings.Networks).forEach(
					(netInfo: any) => {
						if (netInfo.NetworkID === net.Id) count++;
					},
				);
			}
		});

		let netY = 0;
		if (connectedIds.length > 0) {
			const ys = connectedIds.map((id) => containerYPositions.get(id) ?? 0);
			const minY = Math.min(...ys);
			const maxY = Math.max(...ys);
			netY = (minY + maxY) / 2;
		} else {
			netY = currentY;
			currentY += ROW_GAP;
		}

		nodes.push({
			id: nodeId,
			type: "networkNode",
			data: {
				label: net.Name,
				driver: net.Driver,
				scope: net.Scope,
				count,
			},
			position: { x: COL_NET, y: netY },
		});
	});

	// --- Step 6: Create volume nodes ---
	const volumeList = volumes.Volumes || [];
	const volumeYUsed: number[] = [];

	volumeList.forEach((vol: any) => {
		const volNodeId = `vol-${vol.Name}`;
		const connectedContainerYs: number[] = [];

		containers.forEach((container) => {
			if (container.Mounts) {
				container.Mounts.forEach((mount: any) => {
					if (mount.Type === "volume" && mount.Name === vol.Name) {
						const y = containerYPositions.get(container.Id);
						if (y !== undefined) connectedContainerYs.push(y);

						const containerId = `cont-${container.Id}`;
						edges.push({
							id: `edge-${containerId}-${volNodeId}`,
							source: containerId,
							sourceHandle: "vol-out",
							target: volNodeId,
							animated: container.State === "running",
							style: { stroke: "#f59e0b" },
							label: mount.Destination || undefined,
							labelStyle: { fill: "#fcd34d", fontSize: 10 },
						});
					}
				});
			}
		});

		let volY: number;
		if (connectedContainerYs.length > 0) {
			const minY = Math.min(...connectedContainerYs);
			const maxY = Math.max(...connectedContainerYs);
			volY = (minY + maxY) / 2;
		} else {
			volY =
				volumeYUsed.length > 0 ? Math.max(...volumeYUsed) + ROW_GAP : currentY;
		}
		volumeYUsed.push(volY);

		nodes.push({
			id: volNodeId,
			type: "volumeNode",
			data: {
				label: vol.Name,
				driver: vol.Driver,
				mountpoint: vol.Mountpoint,
				isUsed: connectedContainerYs.length > 0,
			},
			position: { x: COL_VOL, y: volY },
		});
	});

	// --- Step 7: Create image nodes ---
	const imageList = images || [];
	const usedImageIds = new Set<string>();
	containers.forEach((c) => {
		if (c.ImageID) usedImageIds.add(c.ImageID);
	});

	imageList.sort((a: any, b: any) => {
		const aUsed = usedImageIds.has(a.Id) ? 1 : 0;
		const bUsed = usedImageIds.has(b.Id) ? 1 : 0;
		return bUsed - aUsed;
	});

	let unusedImgY = 0;

	imageList.forEach((img: any) => {
		if (!usedImageIds.has(img.Id)) {
			const repoTags = img.RepoTags || [];
			if (repoTags.length === 0 || repoTags.includes("<none>:<none>")) return;
		}

		const imgNodeId = `img-${img.Id}`;
		const connectedContainerYs: number[] = [];

		containers.forEach((container) => {
			if (container.ImageID === img.Id) {
				const y = containerYPositions.get(container.Id);
				if (y !== undefined) connectedContainerYs.push(y);

				const containerId = `cont-${container.Id}`;
				edges.push({
					id: `edge-${imgNodeId}-${containerId}`,
					source: imgNodeId,
					sourceHandle: "img-out",
					target: containerId,
					animated: false,
					style: { stroke: "#ec4899" },
				});
			}
		});

		let imgY: number;
		let imgX = COL_IMG;

		if (connectedContainerYs.length > 0) {
			const minY = Math.min(...connectedContainerYs);
			const maxY = Math.max(...connectedContainerYs);
			imgY = (minY + maxY) / 2;
		} else {
			imgX = COL_IMG - 320;
			imgY = unusedImgY;
			unusedImgY += ROW_GAP;
		}

		const repoTags = img.RepoTags || [];
		const label =
			repoTags.length > 0 && !repoTags.includes("<none>:<none>")
				? repoTags[0]
				: img.Id.replace("sha256:", "").substring(0, 12);

		nodes.push({
			id: imgNodeId,
			type: "imageNode",
			data: {
				label: label,
				size: img.Size,
				created: img.Created,
				isUsed: usedImageIds.has(img.Id),
			},
			position: { x: imgX, y: imgY },
		});
	});

	return { nodes, edges };
}
