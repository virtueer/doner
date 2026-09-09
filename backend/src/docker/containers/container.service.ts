import { Injectable } from "@nestjs/common";
import { DockerClientService } from "../client/docker-client.service";

@Injectable()
export class ContainerService {
	constructor(private readonly dockerClient: DockerClientService) {}

	start(id: string) {
		return this.dockerClient.docker.getContainer(id).start();
	}

	stop(id: string) {
		return this.dockerClient.docker.getContainer(id).stop();
	}

	restart(id: string) {
		return this.dockerClient.docker.getContainer(id).restart();
	}
}
