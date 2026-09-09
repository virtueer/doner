import * as zlib from "node:zlib";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { Response } from "express";
import { asMessage } from "../../common/sse.util";
import { DockerClientService } from "../client/docker-client.service";
import { DockerFileService } from "./docker-file.service";
import { resolveInsideRoot } from "./safe-path.util";

/** The helper joins the target's PID namespace, exposing its rootfs here. */
const CONTAINER_ROOT = "/proc/1/root";

@Injectable()
export class ContainerFileService extends DockerFileService {
	constructor(dockerClient: DockerClientService) {
		super(dockerClient, CONTAINER_ROOT, "container");
	}

	/** Archives come straight from the target container, so paths are absolute. */
	async exportArchive(containerId: string, path: string, res: Response) {
		try {
			const archive = await this.dockerClient.docker
				.getContainer(containerId)
				.getArchive({ path: resolveInsideRoot("", path) || "/" });

			archive.pipe(zlib.createGzip()).pipe(res);
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to export container path: ${asMessage(error)}`,
			);
		}
	}
}
