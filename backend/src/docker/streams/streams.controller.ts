import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { streamAsSse } from "../../common/sse.util";
import { StreamsService } from "./streams.service";

@Controller("api")
export class StreamsController {
	constructor(private readonly streams: StreamsService) {}

	@Get("container-logs/:id")
	streamLogs(
		@Param("id") id: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		return streamAsSse(req, res, (signal) =>
			this.streams.containerLogs(id, signal),
		);
	}

	@Get("container-stats/:id")
	streamStats(
		@Param("id") id: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		return streamAsSse(req, res, (signal) =>
			this.streams.containerStats(id, signal),
		);
	}

	@Get("events")
	streamEvents(@Req() req: Request, @Res() res: Response) {
		return streamAsSse(req, res, (signal) => this.streams.events(signal));
	}
}
