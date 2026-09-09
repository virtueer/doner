import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import Docker from "dockerode";
import { createContainerPullingIfMissing } from "./image-pull.util";

export type HelperKind = "volume" | "container" | "sidecar";

export interface HelperContainerInfo {
	containerId: string;
	lastUsed: number;
	type: HelperKind;
}

const HELPER_IMAGE = "alpine";
const IDLE_TIMEOUT_MS = 120_000;
const SWEEP_INTERVAL_MS = 30_000;
const STOP_TIMEOUT_SECONDS = 1;

@Injectable()
export class DockerClientService implements OnModuleDestroy {
	readonly docker = new Docker();

	private readonly helpers = new Map<string, HelperContainerInfo>();
	private readonly sweepTimer = setInterval(
		() => this.removeIdleHelpers(),
		SWEEP_INTERVAL_MS,
	);

	async onModuleDestroy() {
		clearInterval(this.sweepTimer);
		await Promise.all(
			[...this.helpers.values()].map((helper) =>
				this.destroyContainer(helper.containerId),
			),
		);
		this.helpers.clear();
	}

	trackHelper(containerId: string, type: HelperKind) {
		this.helpers.set(containerId, {
			containerId,
			lastUsed: Date.now(),
			type,
		});
	}

	touchHelper(containerId: string) {
		const helper = this.helpers.get(containerId);
		if (helper) helper.lastUsed = Date.now();
	}

	async releaseHelper(containerId: string) {
		await this.destroyContainer(containerId);
		this.helpers.delete(containerId);
	}

	async destroyContainer(containerId: string) {
		const container = this.docker.getContainer(containerId);
		await container.stop({ t: STOP_TIMEOUT_SECONDS }).catch(() => {});
		await container.remove({ force: true }).catch(() => {});
	}

	/** Returns a long-lived alpine container with access to the target's filesystem. */
	async getHelperContainer(
		targetId: string,
		type: Exclude<HelperKind, "sidecar">,
	): Promise<string> {
		const running = await this.findRunningHelper(targetId);
		if (running) return running;

		const container = await createContainerPullingIfMissing(this.docker, {
			Image: HELPER_IMAGE,
			Cmd: ["sleep", "infinity"],
			name: helperName(type, targetId),
			Labels: { "doner.internal": "true" },
			HostConfig:
				type === "volume"
					? { AutoRemove: true, Binds: [`${targetId}:/data`] }
					: {
							AutoRemove: true,
							PidMode: `container:${targetId}`,
							Privileged: true,
						},
		});

		await container.start();
		this.helpers.set(targetId, {
			containerId: container.id,
			lastUsed: Date.now(),
			type,
		});
		return container.id;
	}

	async exec(containerId: string, cmd: string[]): Promise<string> {
		const exec = await this.docker.getContainer(containerId).exec({
			Cmd: cmd,
			AttachStdout: true,
			AttachStderr: true,
			Tty: true,
		});
		const stream = await exec.start({ Detach: false, Tty: true });

		return new Promise((resolve, reject) => {
			let output = "";
			stream.on("data", (chunk: Buffer) => {
				output += chunk.toString("utf8");
			});
			stream.on("end", () => resolve(output.replace(/\r/g, "")));
			stream.on("error", reject);
		});
	}

	async execInHelper(
		targetId: string,
		type: Exclude<HelperKind, "sidecar">,
		cmd: string[],
	): Promise<string> {
		const helperId = await this.getHelperContainer(targetId, type);
		return this.exec(helperId, cmd);
	}

	private async findRunningHelper(targetId: string): Promise<string | null> {
		const existing = this.helpers.get(targetId);
		if (!existing) return null;

		try {
			const info = await this.docker
				.getContainer(existing.containerId)
				.inspect();
			if (info.State.Running) {
				existing.lastUsed = Date.now();
				return existing.containerId;
			}
		} catch {
			// Helper died or was removed out from under us; fall through and recreate.
		}

		this.helpers.delete(targetId);
		return null;
	}

	private async removeIdleHelpers() {
		const deadline = Date.now() - IDLE_TIMEOUT_MS;
		for (const [targetId, helper] of this.helpers) {
			if (helper.lastUsed > deadline) continue;
			await this.destroyContainer(helper.containerId);
			this.helpers.delete(targetId);
		}
	}
}

function helperName(type: HelperKind, targetId: string): string {
	const suffix = Math.random().toString(36).slice(2, 8);
	return `doner-fs-${type}-${targetId.slice(0, 12)}-${suffix}`;
}
