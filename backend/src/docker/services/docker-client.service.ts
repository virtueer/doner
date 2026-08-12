import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import Docker from "dockerode";

export interface HelperContainerInfo {
	containerId: string;
	lastUsed: number;
	type: "volume" | "container" | "sidecar";
}

@Injectable()
export class DockerClientService implements OnModuleDestroy {
	public readonly docker: Docker;
	private activeHelpers: Map<string, HelperContainerInfo> = new Map();
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		this.docker = new Docker();

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
		for (const helper of this.activeHelpers.values()) {
			try {
				const container = this.docker.getContainer(helper.containerId);
				await container.stop({ t: 1 }).catch(() => {});
				await container.remove({ force: true }).catch(() => {});
			} catch (_e) {}
		}
		this.activeHelpers.clear();
	}

	getActiveHelpers() {
		return this.activeHelpers;
	}

	async getHelperContainer(
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
			let container: any;
			try {
				container = await this.docker.createContainer(options);
			} catch (err: any) {
				if (err.statusCode === 404 && err.message.includes("No such image")) {
					await new Promise((resolve, reject) => {
						this.docker.pull("alpine:latest", (pullErr: any, stream: any) => {
							if (pullErr) return reject(pullErr);
							this.docker.modem.followProgress(stream, (followErr: any) => {
								if (followErr) return reject(followErr);
								resolve(true);
							});
						});
					});
					container = await this.docker.createContainer(options);
				} else {
					throw err;
				}
			}
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

	async execInContainer(
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
			streamInfo.on("data", (chunk: Buffer) => {
				output += chunk.toString("utf8");
			});
			streamInfo.on("end", () => {
				resolve(output.replace(/\r/g, ""));
			});
			streamInfo.on("error", (err: Error) => {
				reject(err);
			});
		});
	}

	async runAlpineCommand(
		volumeName: string,
		cmdArray: string[],
		_readOnly: boolean = true,
	): Promise<string> {
		try {
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

	async runAlpineContainerCommand(
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
}
