import { Injectable } from "@nestjs/common";
import { DockerClientService } from "../client/docker-client.service";
import { NodeType } from "./node-type";

@Injectable()
export class TopologyService {
	constructor(private readonly dockerClient: DockerClientService) {}

	systemDf() {
		return this.dockerClient.docker.df();
	}

	inspect(type: NodeType, id: string) {
		const docker = this.dockerClient.docker;
		switch (type) {
			case NodeType.Container:
				return docker.getContainer(id).inspect();
			case NodeType.Network:
				return docker.getNetwork(id).inspect();
			case NodeType.Volume:
				return docker.getVolume(id).inspect();
			case NodeType.Image:
				return docker.getImage(id).inspect();
		}
	}

	remove(type: NodeType, id: string, force: boolean) {
		const docker = this.dockerClient.docker;
		switch (type) {
			case NodeType.Container:
				return docker.getContainer(id).remove({ force });
			case NodeType.Network:
				return docker.getNetwork(id).remove();
			case NodeType.Volume:
				return docker.getVolume(id).remove();
			case NodeType.Image:
				return docker.getImage(id).remove({ force });
		}
	}
}
