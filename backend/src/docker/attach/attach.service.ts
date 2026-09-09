import type { Duplex } from "node:stream";
import { Injectable } from "@nestjs/common";
import { DockerClientService } from "../client/docker-client.service";
import { createContainerPullingIfMissing } from "../client/image-pull.util";
import { shellCommand } from "../files/shell.util";
import { buildSidecarScript } from "./sidecar-script";

const TTY_EXEC = {
	AttachStdin: true,
	AttachStdout: true,
	AttachStderr: true,
	Tty: true,
} as const;

const START_TTY = { hijack: true, stdin: true, Tty: true } as const;

const BOOTSTRAP_SCRIPT =
	'echo "$1" | base64 -d > /tmp/debug.sh && chmod +x /tmp/debug.sh && exec /tmp/debug.sh';

@Injectable()
export class AttachService {
	constructor(private readonly dockerClient: DockerClientService) {}

	async attach(containerId: string, shell: string): Promise<Duplex> {
		const exec = await this.dockerClient.docker
			.getContainer(containerId)
			.exec({ ...TTY_EXEC, Cmd: [shell] });

		return exec.start(START_TTY);
	}

	/** Runs a throwaway container in the target's namespaces for debugging distroless images. */
	async attachSidecar(
		targetContainerId: string,
		image: string,
		shell: string,
	): Promise<Duplex> {
		const sidecar = await createContainerPullingIfMissing(
			this.dockerClient.docker,
			{
				Image: image,
				Cmd: ["sleep", "infinity"],
				name: sidecarName(targetContainerId),
				Labels: { "doner.internal": "true", "doner.sidecar": "true" },
				HostConfig: {
					AutoRemove: true,
					Privileged: true,
					PidMode: `container:${targetContainerId}`,
					NetworkMode: `container:${targetContainerId}`,
				},
			},
		);

		await sidecar.start();
		this.dockerClient.trackHelper(sidecar.id, "sidecar");

		const script = Buffer.from(buildSidecarScript(image, shell)).toString(
			"base64",
		);
		const exec = await sidecar.exec({
			...TTY_EXEC,
			Cmd: shellCommand(BOOTSTRAP_SCRIPT, script),
		});
		const stream = await exec.start(START_TTY);

		stream.on("data", () => this.dockerClient.touchHelper(sidecar.id));

		const release = () => void this.dockerClient.releaseHelper(sidecar.id);
		stream.on("end", release);
		stream.on("close", release);
		stream.on("error", release);

		return stream;
	}
}

function sidecarName(targetContainerId: string): string {
	const suffix = Math.random().toString(36).slice(2, 8);
	return `doner-sidecar-${targetContainerId.slice(0, 12)}-${suffix}`;
}
