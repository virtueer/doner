import type * as http from "node:http";
import {
	type OnGatewayConnection,
	type OnGatewayDisconnect,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import type { Server, WebSocket } from "ws";
import { DockerService } from "./docker.service";

@WebSocketGateway({ path: "/api/attach" })
export class DockerGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	constructor(private dockerService: DockerService) {}

	async handleConnection(client: WebSocket, request: http.IncomingMessage) {
		let isAlive = true;
		client.on("pong", () => {
			isAlive = true;
		});

		const pingInterval = setInterval(() => {
			if (isAlive === false) {
				clearInterval(pingInterval);
				return client.terminate();
			}
			isAlive = false;
			client.ping();
		}, 15000);

		client.on("close", () => {
			clearInterval(pingInterval);
		});

		try {
			const url = new URL(
				request.url || "/",
				`http://${request.headers.host || "localhost"}`,
			);
			const containerId = url.searchParams.get("containerId");
			const shell = url.searchParams.get("shell") || "/bin/sh";

			if (!containerId) {
				client.send("Error: containerId is required\r\n");
				client.close();
				return;
			}

			const isSidecar = url.searchParams.get("sidecar") === "true";
			const sidecarImage = url.searchParams.get("sidecarImage") || "alpine";

			let stream: any;
			if (isSidecar) {
				stream = await this.dockerService.attachSidecar(
					containerId,
					sidecarImage,
					shell,
				);
			} else {
				stream = await this.dockerService.attachToContainer(containerId, shell);
			}

			// Pipe docker output to websocket
			stream.on("data", (chunk: any) => {
				client.send(chunk.toString("utf-8"));
			});

			// Receive from websocket and write to docker stdin
			client.on("message", (message) => {
				stream.write(message.toString());
			});

			// Handle close
			client.on("close", () => {
				stream.end();
			});

			stream.on("end", () => {
				client.close();
			});
		} catch (error: any) {
			client.send(`Error: ${error.message}\r\n`);
			client.close();
		}
	}

	handleDisconnect(_client: WebSocket) {
		// handled in close event listener above
	}
}
