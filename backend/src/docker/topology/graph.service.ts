import { Injectable } from "@nestjs/common";
import { DockerClientService } from "../client/docker-client.service";
import { buildGraph } from "./layout/build-graph";

@Injectable()
export class GraphService {
	constructor(private readonly dockerClient: DockerClientService) {}

	async build() {
		const docker = this.dockerClient.docker;
		const [networks, containers, volumes, images] = await Promise.all([
			docker.listNetworks(),
			docker.listContainers({ all: true }),
			docker.listVolumes(),
			docker.listImages(),
		]);

		return buildGraph({ networks, containers, volumes, images });
	}
}
