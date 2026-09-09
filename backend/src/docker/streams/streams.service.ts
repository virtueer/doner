import { Injectable } from "@nestjs/common";
import { DockerClientService } from "../client/docker-client.service";
import { destroyOnAbort, parseLogFrames, parseNdjson } from "./stream.util";

const LOG_TAIL_LINES = 100;

@Injectable()
export class StreamsService {
	constructor(private readonly dockerClient: DockerClientService) {}

	async containerLogs(
		containerId: string,
		signal?: AbortSignal,
	): Promise<AsyncIterable<string>> {
		const stream = await this.dockerClient.docker
			.getContainer(containerId)
			.logs({
				stdout: true,
				stderr: true,
				follow: true,
				tail: LOG_TAIL_LINES,
				timestamps: true,
			});

		destroyOnAbort(stream, signal);
		return parseLogFrames(stream as unknown as AsyncIterable<Buffer>);
	}

	async containerStats(
		containerId: string,
		signal?: AbortSignal,
	): Promise<AsyncIterable<unknown>> {
		const stream = await this.dockerClient.docker
			.getContainer(containerId)
			.stats({ stream: true });

		destroyOnAbort(stream, signal);
		return parseNdjson(stream as unknown as AsyncIterable<Buffer>);
	}

	async events(signal?: AbortSignal): Promise<AsyncIterable<unknown>> {
		const stream = await this.dockerClient.docker.getEvents();

		destroyOnAbort(stream, signal);
		return parseNdjson(stream as unknown as AsyncIterable<Buffer>);
	}
}
