import * as zlib from "node:zlib";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import type { Container } from "dockerode";
import Docker from "dockerode";

@Injectable()
export class DockerService implements OnModuleDestroy {
	private docker: Docker;

	// Track helper containers: Map<targetId, { containerId: string, lastUsed: number, type: 'volume'|'container'|'sidecar' }>
	private activeHelpers: Map<
		string,
		{
			containerId: string;
			lastUsed: number;
			type: "volume" | "container" | "sidecar";
		}
	> = new Map();
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		this.docker = new Docker(); // Defaults to standard socket/pipe

		// Garbage collection for helper containers every 30 seconds
		this.cleanupInterval = setInterval(async () => {
			const now = Date.now();
			for (const [targetId, helper] of this.activeHelpers.entries()) {
				// Idle for > 2 minutes (120,000 ms)
				if (now - helper.lastUsed > 120000) {
					try {
						const container = this.docker.getContainer(helper.containerId);
						await container.stop({ t: 1 }).catch(() => {});
						await container.remove({ force: true }).catch(() => {});
					} catch (_e) {}
					this.activeHelpers.delete(targetId);
				}
			}
		}, 30000);
	}

	async onModuleDestroy() {
		clearInterval(this.cleanupInterval);
		// Cleanup all active helper containers on shutdown
		for (const helper of this.activeHelpers.values()) {
			try {
				const container = this.docker.getContainer(helper.containerId);
				await container.stop({ t: 1 }).catch(() => {});
				await container.remove({ force: true }).catch(() => {});
			} catch (_e) {}
		}
		this.activeHelpers.clear();
	}

	private async getHelperContainer(
		targetId: string,
		type: "volume" | "container" | "sidecar",
		readOnly: boolean = false,
	): Promise<string> {
		const existing = this.activeHelpers.get(targetId);

		if (existing) {
			try {
				const container = this.docker.getContainer(existing.containerId);
				const info = await container.inspect();
				if (info.State.Running) {
					existing.lastUsed = Date.now();
					return existing.containerId;
				}
			} catch (_e) {
				// Container dead or missing, recreate
			}
			this.activeHelpers.delete(targetId);
		}

		// Create new helper container
		const name = `doner-fs-${type}-${targetId.substring(0, 12)}-${Math.random().toString(36).substring(7)}`;
		const options: any = {
			Image: "alpine",
			Cmd: ["sleep", "infinity"],
			name,
			Labels: { "doner.internal": "true" },
			HostConfig: {
				AutoRemove: true,
			},
		};

		if (type === "volume") {
			options.HostConfig.Binds = [`${targetId}:/data${readOnly ? ":ro" : ""}`];
		} else {
			options.HostConfig.PidMode = `container:${targetId}`;
			options.HostConfig.Privileged = true;
		}

		try {
			const container = await this.docker.createContainer(options);
			await container.start();

			this.activeHelpers.set(targetId, {
				containerId: container.id,
				lastUsed: Date.now(),
				type,
			});

			return container.id;
		} catch (err: any) {
			throw new Error(`Failed to create helper container: ${err.message}`);
		}
	}

	async getContainerLogsStream(
		containerId: string,
		signal?: AbortSignal,
	): Promise<AsyncIterable<string>> {
		const container: Container = this.docker.getContainer(containerId);
		const stream = await container.logs({
			stdout: true,
			stderr: true,
			follow: true,
			tail: 100,
			timestamps: true,
		});

		if (signal) {
			signal.addEventListener("abort", () => {
				if (stream && typeof (stream as any).destroy === "function") {
					(stream as any).destroy();
				}
			});
		}

		return (async function* () {
			// Docker raw log stream: each message has an 8-byte header
			// (1 byte stream type + 3 bytes padding + 4 bytes length)
			let dataBuffer = Buffer.alloc(0);

			for await (const chunk of stream as any) {
				dataBuffer = Buffer.concat([dataBuffer, Buffer.from(chunk)]);

				while (dataBuffer.length >= 8) {
					const msgLength = dataBuffer.readUInt32BE(4);
					if (dataBuffer.length < 8 + msgLength) break;

					const message = dataBuffer.slice(8, 8 + msgLength).toString("utf8");
					dataBuffer = dataBuffer.slice(8 + msgLength);

					const lines = message.split("\n");
					for (const line of lines) {
						if (line.trim()) {
							yield line;
						}
					}
				}
			}
		})();
	}

	async inspectContainer(id: string) {
		return this.docker.getContainer(id).inspect();
	}

	async inspectNetwork(id: string) {
		return this.docker.getNetwork(id).inspect();
	}

	async inspectVolume(name: string) {
		return this.docker.getVolume(name).inspect();
	}

	async inspectImage(id: string) {
		return this.docker.getImage(id).inspect();
	}

	async attachToContainer(containerId: string, shell: string) {
		const container = this.docker.getContainer(containerId);

		// Create an exec instance
		const exec = await container.exec({
			AttachStdin: true,
			AttachStdout: true,
			AttachStderr: true,
			Tty: true,
			Cmd: [shell],
		});

		// Start the exec session
		const stream = await exec.start({
			hijack: true,
			stdin: true,
			Tty: true,
		});

		return stream;
	}

	async attachSidecar(targetContainerId: string) {
		const name = `doner-sidecar-${targetContainerId.substring(0, 12)}-${Math.random().toString(36).substring(7)}`;

		const sidecar = await this.docker.createContainer({
			Image: "alpine",
			Cmd: ["sleep", "infinity"],
			name,
			Labels: { "doner.internal": "true", "doner.sidecar": "true" },
			HostConfig: {
				AutoRemove: true,
				Privileged: true,
				PidMode: `container:${targetContainerId}`,
				NetworkMode: `container:${targetContainerId}`,
			},
		});

		await sidecar.start();

		this.activeHelpers.set(sidecar.id, {
			containerId: sidecar.id,
			lastUsed: Date.now(),
			type: "sidecar",
		});

		const script = `#!/bin/sh
TARGET_PID=1

if [ ! -d "/proc/$TARGET_PID" ]; then
    echo "❌ Error: Target PID $TARGET_PID not found."
    exit 1
fi

# 1. PATH Transformation: Prefix target container's PATH paths with /proc/1/root and prepend to current PATH
TARGET_PATH=$(strings /proc/$TARGET_PID/environ | grep '^PATH=' | cut -d= -f2)

if [ -n "$TARGET_PATH" ]; then
    NEW_PATHS=""
    OLD_IFS=$IFS
    IFS=":"
    for path in $TARGET_PATH; do
        if [ -n "$path" ]; then
            NEW_PATHS="$NEW_PATHS/proc/$TARGET_PID/root$path:"
        fi
    done
    IFS=$OLD_IFS
    
    export PATH="\${NEW_PATHS}\${PATH}"
fi

# 2. Other Variables: Import envs that are NOT defined in the current sidecar
for env in $(strings /proc/$TARGET_PID/environ); do
    key=$(echo "$env" | cut -d= -f1)
    val=$(echo "$env" | cut -d= -f2-)
    
    if [ "$key" != "PATH" ] && [ "$key" != "HOSTNAME" ] && [ "$key" != "SHLVL" ]; then
        if ! printenv "$key" >/dev/null 2>&1; then
            export "$key=$val"
        fi
    fi
done

echo "🚀 Sidecar environment ready (Merged target container's PATH and ENV)"

# Drop user into interactive shell with new environment variables
exec sh -i
`;

		const exec = await sidecar.exec({
			AttachStdin: true,
			AttachStdout: true,
			AttachStderr: true,
			Tty: true,
			Cmd: [
				"sh",
				"-c",
				`echo '${Buffer.from(script).toString("base64")}' | base64 -d > /tmp/debug.sh && chmod +x /tmp/debug.sh && exec /tmp/debug.sh`,
			],
		});

		const stream = await exec.start({
			hijack: true,
			stdin: true,
			Tty: true,
		});

		stream.on("data", () => {
			const helper = this.activeHelpers.get(sidecar.id);
			if (helper) helper.lastUsed = Date.now();
		});

		const cleanup = async () => {
			try {
				await sidecar.stop({ t: 1 }).catch(() => {});
				await sidecar.remove({ force: true }).catch(() => {});
			} catch (_e) {}
			this.activeHelpers.delete(sidecar.id);
		};
		stream.on("end", cleanup);
		stream.on("close", cleanup);
		stream.on("error", cleanup);

		return stream;
	}

	async startContainer(id: string) {
		return this.docker.getContainer(id).start();
	}

	async stopContainer(id: string) {
		return this.docker.getContainer(id).stop();
	}

	async restartContainer(id: string) {
		return this.docker.getContainer(id).restart();
	}

	async getContainerStatsStream(
		id: string,
		signal?: AbortSignal,
	): Promise<AsyncIterable<any>> {
		const container = this.docker.getContainer(id);
		const stream = await container.stats({ stream: true });

		if (signal) {
			signal.addEventListener("abort", () => {
				if (stream && typeof (stream as any).destroy === "function") {
					(stream as any).destroy();
				}
			});
		}

		return (async function* () {
			let dataBuffer = "";
			for await (const chunk of stream as any) {
				dataBuffer += chunk.toString("utf8");
				let index = dataBuffer.indexOf("\n");
				while (index !== -1) {
					const line = dataBuffer.substring(0, index);
					dataBuffer = dataBuffer.substring(index + 1);
					if (line.trim()) {
						try {
							yield JSON.parse(line);
						} catch (_e) {
							// ignore parse errors
						}
					}
					index = dataBuffer.indexOf("\n");
				}
			}
		})();
	}

	async getEventsStream(signal?: AbortSignal): Promise<AsyncIterable<any>> {
		const stream = await this.docker.getEvents();
		if (signal) {
			signal.addEventListener("abort", () => {
				if (stream && typeof (stream as any).destroy === "function") {
					(stream as any).destroy();
				}
			});
		}

		return (async function* () {
			let dataBuffer = "";
			for await (const chunk of stream as any) {
				dataBuffer += chunk.toString("utf8");
				let index = dataBuffer.indexOf("\n");
				while (index !== -1) {
					const line = dataBuffer.substring(0, index);
					dataBuffer = dataBuffer.substring(index + 1);
					if (line.trim()) {
						try {
							yield JSON.parse(line);
						} catch (_e) {}
					}
					index = dataBuffer.indexOf("\n");
				}
			}
		})();
	}

	async getNetworkGraph() {
		try {
			const networks = await this.docker.listNetworks();
			const containers = await this.docker.listContainers({ all: true });
			const volumes = await this.docker.listVolumes();
			const images = await this.docker.listImages();

			const nodes: any[] = [];
			const edges: any[] = [];

			// Layout constants
			const COL_IMG = -400;
			const COL_NET = 0;
			const COL_CONT = 420;
			const COL_VOL = 880;
			const ROW_GAP = 140;
			const GROUP_GAP = 60; // extra gap between network groups

			// --- Step 1: Build container -> primary network mapping ---
			const containerPrimaryNet = new Map<string, string>(); // containerId -> networkId
			const netContainerIds = new Map<string, string[]>(); // networkId -> containerIds[]
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

			// Group structure: track where each network's containers start/end
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

			// Add orphan containers (no network)
			containers.forEach((c) => {
				if (!placed.has(c.Id)) orderedContainerIds.push(c.Id);
			});

			// --- Step 3: Compute Y positions for containers with group gaps ---
			const containerYPositions = new Map<string, number>();
			let currentY = 0;
			let prevGroupEnd = -1;

			orderedContainerIds.forEach((cId, idx) => {
				// Check if this is the start of a new group
				const group = networkGroups.find((g) => g.startIdx === idx);
				if (group && prevGroupEnd >= 0) {
					currentY += GROUP_GAP; // extra gap between groups
				}
				containerYPositions.set(cId, currentY);
				currentY += ROW_GAP;

				// Track group end
				const endGroup = networkGroups.find((g) => g.endIdx === idx);
				if (endGroup) prevGroupEnd = idx;
			});

			// --- Step 4: Create container nodes ---
			const networkMap = new Map<string, string>(); // dockerNetworkId -> nodeId
			networks.forEach((net) => {
				networkMap.set(net.Id, `net-${net.Id}`);
			});

			orderedContainerIds.forEach((cId) => {
				const container = containerById.get(cId);
				if (!container) return;

				const containerId = `cont-${container.Id}`;
				const containerName =
					container.Names[0]?.replace("/", "") || container.Id;
				const y = containerYPositions.get(cId) ?? 0;

				// Collect volume mounts
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
					},
					position: { x: COL_CONT, y },
				});

				// Edges: Container -> Network
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

			// --- Step 5: Create network nodes centered on their container groups ---
			const _usedNetY = new Set<number>();

			networks.forEach((net) => {
				const nodeId = `net-${net.Id}`;
				const connectedIds = netContainerIds.get(net.Id) || [];

				// Count containers in this network
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

				// Center network Y on connected containers
				let netY = 0;
				if (connectedIds.length > 0) {
					const ys = connectedIds.map((id) => containerYPositions.get(id) ?? 0);
					const minY = Math.min(...ys);
					const maxY = Math.max(...ys);
					netY = (minY + maxY) / 2;
				} else {
					// Put disconnected networks after the last used Y
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

			// --- Step 6: Create volume nodes aligned to connected containers ---
			const volumeList = volumes.Volumes || [];
			const volumeYUsed: number[] = [];

			volumeList.forEach((vol: any) => {
				const volNodeId = `vol-${vol.Name}`;

				// Find all containers that use this volume
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

				// Position volume at center of its connected containers, or sequentially
				let volY: number;
				if (connectedContainerYs.length > 0) {
					const minY = Math.min(...connectedContainerYs);
					const maxY = Math.max(...connectedContainerYs);
					volY = (minY + maxY) / 2;
				} else {
					volY =
						volumeYUsed.length > 0
							? Math.max(...volumeYUsed) + ROW_GAP
							: currentY;
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

			// Keep track of which images are used by containers to only display those
			const usedImageIds = new Set<string>();
			containers.forEach((c) => {
				if (c.ImageID) usedImageIds.add(c.ImageID);
			});

			imageList.sort((a: any, b: any) => {
				const aUsed = usedImageIds.has(a.Id) ? 1 : 0;
				const bUsed = usedImageIds.has(b.Id) ? 1 : 0;
				return bUsed - aUsed; // Used before unused
			});

			let unusedImgY = 0;

			imageList.forEach((img: any) => {
				// Filter out unused images to reduce clutter, or images with no tags
				if (!usedImageIds.has(img.Id)) {
					const repoTags = img.RepoTags || [];
					if (repoTags.length === 0 || repoTags.includes("<none>:<none>"))
						return;
				}

				const imgNodeId = `img-${img.Id}`;

				// Find connected containers to compute Y position
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

				// Best effort label
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
		} catch (error) {
			console.error("Error fetching docker data", error);
			throw error;
		}
	}
	private async execInContainer(
		containerId: string,
		cmdArray: string[],
	): Promise<string> {
		const container = this.docker.getContainer(containerId);
		const exec = await container.exec({
			Cmd: cmdArray,
			AttachStdout: true,
			AttachStderr: true,
			Tty: true,
		});

		const streamInfo = await exec.start({ Detach: false, Tty: true });

		return new Promise((resolve, reject) => {
			let output = "";
			streamInfo.on("data", (chunk) => {
				output += chunk.toString("utf8");
			});
			streamInfo.on("end", () => {
				resolve(output.replace(/\r/g, ""));
			});
			streamInfo.on("error", (err) => {
				reject(err);
			});
		});
	}

	private async runAlpineCommand(
		volumeName: string,
		cmdArray: string[],
		_readOnly: boolean = true,
	): Promise<string> {
		try {
			// We ignore readOnly here because the persistent helper is mounted rw to support all operations
			const helperId = await this.getHelperContainer(
				volumeName,
				"volume",
				false,
			);
			return await this.execInContainer(helperId, cmdArray);
		} catch (err: any) {
			throw new Error(`Helper exec failed: ${err.message}`);
		}
	}

	private async runAlpineContainerCommand(
		containerId: string,
		cmdArray: string[],
	): Promise<string> {
		try {
			const helperId = await this.getHelperContainer(containerId, "container");
			return await this.execInContainer(helperId, cmdArray);
		} catch (err: any) {
			throw new Error(`Helper exec failed: ${err.message}`);
		}
	}

	async listVolumeFiles(volumeName: string, path: string = "") {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;

		const cmdArray = [
			"sh",
			"-c",
			`find '${fullPath}' -mindepth 1 -maxdepth 1 -exec stat -c '%F|%s|%Y|%n' {} + || true`,
		];

		try {
			const stdout = await this.runAlpineCommand(volumeName, cmdArray);
			if (!stdout.trim()) return [];

			return stdout
				.trim()
				.split("\n")
				.map((line) => {
					const [type, size, mtime, name] = line.split("|");
					if (!name) return null;
					const basename = name.split("/").pop() || "";
					return {
						type:
							type === "directory"
								? "directory"
								: type.includes("link")
									? "symlink"
									: "file",
						size: parseInt(size, 10) || 0,
						mtime: parseInt(mtime, 10) * 1000 || 0,
						name: basename,
						path: safePath ? `${safePath}/${basename}` : basename,
					};
				})
				.filter(Boolean)
				.sort((a: any, b: any) => {
					if (a.type === b.type) return a.name.localeCompare(b.name);
					return a.type === "directory" ? -1 : 1;
				});
		} catch (err: any) {
			throw new Error(`Failed to list directory: ${err.message}`);
		}
	}

	async readVolumeFile(volumeName: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;
		const cmdArray = ["head", "-c", "1048576", fullPath];

		try {
			const stdout = await this.runAlpineCommand(volumeName, cmdArray);
			return stdout;
		} catch (err: any) {
			throw new Error(`Failed to read file: ${err.message}`);
		}
	}

	async writeVolumeFile(volumeName: string, path: string, content: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;
		const base64Content = Buffer.from(content).toString("base64");
		const cmdArray = [
			"sh",
			"-c",
			`echo '${base64Content}' | base64 -d > '${fullPath}'`,
		];

		try {
			await this.runAlpineCommand(volumeName, cmdArray, false);
		} catch (err: any) {
			throw new Error(`Failed to write file: ${err.message}`);
		}
	}

	async deleteVolumeFile(volumeName: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;
		const cmdArray = ["rm", "-rf", fullPath];

		try {
			await this.runAlpineCommand(volumeName, cmdArray, false);
		} catch (err: any) {
			throw new Error(`Failed to delete file: ${err.message}`);
		}
	}

	async copyVolumeFile(volumeName: string, srcPath: string, destPath: string) {
		const safeSrc = srcPath.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const safeDest = destPath
			.replace(/(\.\.\/|\.\.\\)/g, "")
			.replace(/^\/+/, "");
		const fullSrc = `/data/${safeSrc}`;
		const fullDest = `/data/${safeDest}`;
		const cmdArray = ["cp", "-r", fullSrc, fullDest];

		try {
			await this.runAlpineCommand(volumeName, cmdArray, false);
		} catch (err: any) {
			throw new Error(`Failed to copy file: ${err.message}`);
		}
	}

	async createVolumeDirectory(volumeName: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;
		try {
			await this.runAlpineCommand(volumeName, ["mkdir", "-p", fullPath], false);
		} catch (err: any) {
			throw new Error(`Failed to create directory: ${err.message}`);
		}
	}

	async renameVolumeFile(
		volumeName: string,
		srcPath: string,
		destPath: string,
	) {
		const safeSrc = srcPath.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const safeDest = destPath
			.replace(/(\.\.\/|\.\.\\)/g, "")
			.replace(/^\/+/, "");
		try {
			await this.runAlpineCommand(
				volumeName,
				["mv", `/data/${safeSrc}`, `/data/${safeDest}`],
				false,
			);
		} catch (err: any) {
			throw new Error(`Failed to rename: ${err.message}`);
		}
	}

	async listContainerFiles(containerId: string, path: string = "") {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;

		const cmdArray = [
			"sh",
			"-c",
			`find '${fullPath}' -mindepth 1 -maxdepth 1 -exec stat -c '%F|%s|%Y|%n' {} + || true`,
		];

		try {
			const stdout = await this.runAlpineContainerCommand(
				containerId,
				cmdArray,
			);
			if (!stdout.trim()) return [];

			return stdout
				.trim()
				.split("\n")
				.map((line) => {
					const [type, size, mtime, name] = line.split("|");
					if (!name) return null;
					const basename = name.split("/").pop() || "";
					return {
						type:
							type === "directory"
								? "directory"
								: type.includes("link")
									? "symlink"
									: "file",
						size: parseInt(size, 10) || 0,
						mtime: parseInt(mtime, 10) * 1000 || 0,
						name: basename,
						path: safePath ? `${safePath}/${basename}` : basename,
					};
				})
				.filter(Boolean)
				.sort((a: any, b: any) => {
					if (a.type === b.type) return a.name.localeCompare(b.name);
					return a.type === "directory" ? -1 : 1;
				});
		} catch (err: any) {
			throw new Error(`Failed to list container directory: ${err.message}`);
		}
	}

	async readContainerFile(containerId: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;
		const cmdArray = ["head", "-c", "1048576", fullPath];

		try {
			const stdout = await this.runAlpineContainerCommand(
				containerId,
				cmdArray,
			);
			return stdout;
		} catch (err: any) {
			throw new Error(`Failed to read container file: ${err.message}`);
		}
	}

	async writeContainerFile(containerId: string, path: string, content: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;
		const base64Content = Buffer.from(content).toString("base64");
		const cmdArray = [
			"sh",
			"-c",
			`echo '${base64Content}' | base64 -d > '${fullPath}'`,
		];

		try {
			await this.runAlpineContainerCommand(containerId, cmdArray);
		} catch (err: any) {
			throw new Error(`Failed to write file: ${err.message}`);
		}
	}

	async deleteContainerFile(containerId: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;
		const cmdArray = ["rm", "-rf", fullPath];

		try {
			await this.runAlpineContainerCommand(containerId, cmdArray);
		} catch (err: any) {
			throw new Error(`Failed to delete file: ${err.message}`);
		}
	}

	async copyContainerFile(
		containerId: string,
		srcPath: string,
		destPath: string,
	) {
		const safeSrc = srcPath.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const safeDest = destPath
			.replace(/(\.\.\/|\.\.\\)/g, "")
			.replace(/^\/+/, "");
		const fullSrc = `/proc/1/root/${safeSrc}`;
		const fullDest = `/proc/1/root/${safeDest}`;
		const cmdArray = ["cp", "-r", fullSrc, fullDest];

		try {
			await this.runAlpineContainerCommand(containerId, cmdArray);
		} catch (err: any) {
			throw new Error(`Failed to copy file: ${err.message}`);
		}
	}

	async createContainerDirectory(containerId: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;
		try {
			await this.runAlpineContainerCommand(containerId, [
				"mkdir",
				"-p",
				fullPath,
			]);
		} catch (err: any) {
			throw new Error(`Failed to create directory: ${err.message}`);
		}
	}

	async renameContainerFile(
		containerId: string,
		srcPath: string,
		destPath: string,
	) {
		const safeSrc = srcPath.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const safeDest = destPath
			.replace(/(\.\.\/|\.\.\\)/g, "")
			.replace(/^\/+/, "");
		try {
			await this.runAlpineContainerCommand(containerId, [
				"mv",
				`/proc/1/root/${safeSrc}`,
				`/proc/1/root/${safeDest}`,
			]);
		} catch (err: any) {
			throw new Error(`Failed to rename: ${err.message}`);
		}
	}

	async exportVolumeStream(volumeName: string, res: any) {
		try {
			const helperId = await this.getHelperContainer(
				volumeName,
				"volume",
				false,
			);
			const container = this.docker.getContainer(helperId);

			const archiveStream = await container.getArchive({ path: "/data" });
			const gzip = zlib.createGzip();

			archiveStream.pipe(gzip).pipe(res);
		} catch (err: any) {
			throw new Error(`Failed to export volume: ${err.message}`);
		}
	}

	async deleteContainer(id: string, force = false) {
		return this.docker.getContainer(id).remove({ force });
	}

	async deleteImage(id: string, force = false) {
		return this.docker.getImage(id).remove({ force });
	}

	async deleteNetwork(id: string) {
		return this.docker.getNetwork(id).remove();
	}

	async deleteVolume(name: string) {
		return this.docker.getVolume(name).remove();
	}
}
