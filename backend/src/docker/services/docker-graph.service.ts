import { Injectable } from "@nestjs/common";
import { buildGraphLayout } from "../utils/graph-layout.util";
import { DockerClientService } from "./docker-client.service";

@Injectable()
export class DockerGraphService {
	constructor(private readonly dockerClient: DockerClientService) {}

	async getNetworkGraph() {
		try {
			const docker = this.dockerClient.docker;
			const [networks, containers, volumes, images] = await Promise.all([
				docker.listNetworks(),
				docker.listContainers({ all: true }),
				docker.listVolumes(),
				docker.listImages(),
			]);

			return buildGraphLayout({ networks, containers, volumes, images });
		} catch (error) {
			console.error("Error fetching docker data", error);
			throw error;
		}
	}
}
