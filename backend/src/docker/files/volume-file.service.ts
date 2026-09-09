import * as zlib from "node:zlib";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { Response } from "express";
import { asMessage } from "../../common/sse.util";
import { DockerClientService } from "../client/docker-client.service";
import { DockerFileService } from "./docker-file.service";

const VOLUME_ROOT = "/data";

@Injectable()
export class VolumeFileService extends DockerFileService {
	constructor(dockerClient: DockerClientService) {
		super(dockerClient, VOLUME_ROOT, "volume");
	}

	async exportArchive(volumeName: string, path: string, res: Response) {
		try {
			const helperId = await this.dockerClient.getHelperContainer(
				volumeName,
				"volume",
			);
			const archive = await this.dockerClient.docker
				.getContainer(helperId)
				.getArchive({ path: this.resolve(path) });

			archive.pipe(zlib.createGzip()).pipe(res);
		} catch (error) {
			throw new InternalServerErrorException(
				`Failed to export volume: ${asMessage(error)}`,
			);
		}
	}
}
