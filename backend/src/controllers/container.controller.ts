import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { DockerService } from "../docker/docker.service";

@Controller("api")
export class ContainerController {
	constructor(private readonly dockerService: DockerService) {}

	@Post("containers/:id/start")
	async startContainer(@Param("id") id: string) {
		await this.dockerService.startContainer(id);
		return { success: true };
	}

	@Post("containers/:id/stop")
	async stopContainer(@Param("id") id: string) {
		await this.dockerService.stopContainer(id);
		return { success: true };
	}

	@Post("containers/:id/restart")
	async restartContainer(@Param("id") id: string) {
		await this.dockerService.restartContainer(id);
		return { success: true };
	}

	@Get("containers/:id/links")
	async getContainerLinks(@Param("id") id: string) {
		return this.dockerService.getContainerLinks(id);
	}

	@Post("containers/:id/links")
	async saveContainerLinks(
		@Param("id") id: string,
		@Body() body: { links: { title: string; url: string }[] },
	) {
		await this.dockerService.saveContainerLinks(id, body.links);
		return { success: true };
	}
}
