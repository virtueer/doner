import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ContainerService } from "./container.service";
import {
	type ContainerLink,
	ContainerLinksService,
} from "./container-links.service";

const OK = { success: true };

@Controller("api/containers/:id")
export class ContainerController {
	constructor(
		private readonly containers: ContainerService,
		private readonly links: ContainerLinksService,
	) {}

	@Post("start")
	async start(@Param("id") id: string) {
		await this.containers.start(id);
		return OK;
	}

	@Post("stop")
	async stop(@Param("id") id: string) {
		await this.containers.stop(id);
		return OK;
	}

	@Post("restart")
	async restart(@Param("id") id: string) {
		await this.containers.restart(id);
		return OK;
	}

	@Get("links")
	getLinks(@Param("id") id: string) {
		return this.links.get(id);
	}

	@Post("links")
	async saveLinks(
		@Param("id") id: string,
		@Body() body: { links: ContainerLink[] },
	) {
		await this.links.save(id, body.links);
		return OK;
	}
}
