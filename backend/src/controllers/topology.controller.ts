import { Controller, Delete, Get, Param, Query } from "@nestjs/common";
import { DockerService } from "../docker/docker.service";

@Controller("api")
export class TopologyController {
	constructor(private readonly dockerService: DockerService) {}

	@Get("network-graph")
	async getNetworkGraph() {
		return this.dockerService.getNetworkGraph();
	}

	@Get("system/df")
	async getSystemDf() {
		return this.dockerService.getSystemDf();
	}

	@Get("inspect/:type/:id")
	async inspectNode(@Param("type") type: string, @Param("id") id: string) {
		if (type === "containerNode")
			return this.dockerService.inspectContainer(id);
		if (type === "networkNode") return this.dockerService.inspectNetwork(id);
		if (type === "volumeNode") return this.dockerService.inspectVolume(id);
		if (type === "imageNode") return this.dockerService.inspectImage(id);
		throw new Error("Invalid node type");
	}

	@Delete("delete/:type/:id")
	async deleteNode(
		@Param("type") type: string,
		@Param("id") id: string,
		@Query("force") force?: string,
	) {
		const isForce = force === "true";
		if (type === "containerNode") {
			await this.dockerService.deleteContainer(id, isForce);
		} else if (type === "networkNode") {
			await this.dockerService.deleteNetwork(id);
		} else if (type === "volumeNode") {
			await this.dockerService.deleteVolume(id);
		} else if (type === "imageNode") {
			await this.dockerService.deleteImage(id, isForce);
		} else {
			throw new Error("Invalid node type");
		}
		return { success: true };
	}
}
