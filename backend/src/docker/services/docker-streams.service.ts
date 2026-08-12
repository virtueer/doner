import { Injectable } from "@nestjs/common";
import type { Container } from "dockerode";
import { DockerClientService } from "./docker-client.service";

@Injectable()
export class DockerStreamsService {
	constructor(private readonly dockerClient: DockerClientService) {}

	async getContainerLogsStream(
		containerId: string,
		signal?: AbortSignal,
	): Promise<AsyncIterable<string>> {
		const container: Container =
			this.dockerClient.docker.getContainer(containerId);
		const stream = await container.logs({
			stdout: true,
			stderr: true,
			follow: true,
			tail: 100,
			timestamps: true,
		});

		if (signal) {
			signal.addEventListener("abort", () => {
				if (stream && typeof (stream as any).destroy === "function") {
					(stream as any).destroy();
				}
			});
		}

		return (async function* () {
			let dataBuffer = Buffer.alloc(0);

			for await (const chunk of stream as any) {
				dataBuffer = Buffer.concat([dataBuffer, Buffer.from(chunk)]);

				while (dataBuffer.length >= 8) {
					const msgLength = dataBuffer.readUInt32BE(4);
					if (dataBuffer.length < 8 + msgLength) break;

					const message = dataBuffer.slice(8, 8 + msgLength).toString("utf8");
					dataBuffer = dataBuffer.slice(8 + msgLength);

					const lines = message.split("\n");
					for (const line of lines) {
						if (line.trim()) {
							yield line;
						}
					}
				}
			}
		})();
	}

	async getContainerStatsStream(
		id: string,
		signal?: AbortSignal,
	): Promise<AsyncIterable<any>> {
		const container = this.dockerClient.docker.getContainer(id);
		const stream = await container.stats({ stream: true });

		if (signal) {
			signal.addEventListener("abort", () => {
				if (stream && typeof (stream as any).destroy === "function") {
					(stream as any).destroy();
				}
			});
		}

		return (async function* () {
			let dataBuffer = "";
			for await (const chunk of stream as any) {
				dataBuffer += chunk.toString("utf8");
				let index = dataBuffer.indexOf("\n");
				while (index !== -1) {
					const line = dataBuffer.substring(0, index);
					dataBuffer = dataBuffer.substring(index + 1);
					if (line.trim()) {
						try {
							yield JSON.parse(line);
						} catch (_e) {}
					}
					index = dataBuffer.indexOf("\n");
				}
			}
		})();
	}

	async getEventsStream(signal?: AbortSignal): Promise<AsyncIterable<any>> {
		const stream = await this.dockerClient.docker.getEvents();
		if (signal) {
			signal.addEventListener("abort", () => {
				if (stream && typeof (stream as any).destroy === "function") {
					(stream as any).destroy();
				}
			});
		}

		return (async function* () {
			let dataBuffer = "";
			for await (const chunk of stream as any) {
				dataBuffer += chunk.toString("utf8");
				let index = dataBuffer.indexOf("\n");
				while (index !== -1) {
					const line = dataBuffer.substring(0, index);
					dataBuffer = dataBuffer.substring(index + 1);
					if (line.trim()) {
						try {
							yield JSON.parse(line);
						} catch (_e) {}
					}
					index = dataBuffer.indexOf("\n");
				}
			}
		})();
	}
}
