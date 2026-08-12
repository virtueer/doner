import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import { DockerService } from "../docker/docker.service";

@Controller("api")
export class StreamsController {
	constructor(private readonly dockerService: DockerService) {}

	@Get("container-logs/:id")
	async streamContainerLogs(
		@Param("id") id: string,
		@Res() res: any,
		@Req() req: any,
	) {
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();

		const ac = new AbortController();
		req.on("close", () => ac.abort());

		const logs = await this.dockerService.getContainerLogsStream(id, ac.signal);
		for await (const line of logs) {
			res.write(`data: ${JSON.stringify(line)}\n\n`);
		}
		res.end();
	}

	@Get("container-stats/:id")
	async streamContainerStats(
		@Param("id") id: string,
		@Res() res: any,
		@Req() req: any,
	) {
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();

		const ac = new AbortController();
		req.on("close", () => ac.abort());

		try {
			const stats = await this.dockerService.getContainerStatsStream(
				id,
				ac.signal,
			);
			for await (const data of stats) {
				res.write(`data: ${JSON.stringify(data)}\n\n`);
			}
		} catch (e: any) {
			res.write(`data: {"error": "${e.message}"}\n\n`);
		}
		res.end();
	}

	@Get("events")
	async streamEvents(@Res() res: any, @Req() req: any) {
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders();

		const ac = new AbortController();
		req.on("close", () => ac.abort());

		try {
			const events = await this.dockerService.getEventsStream(ac.signal);
			for await (const event of events) {
				res.write(`data: ${JSON.stringify(event)}\n\n`);
			}
		} catch (e: any) {
			res.write(`data: {"error": "${e.message}"}\n\n`);
		}
		res.end();
	}
}
