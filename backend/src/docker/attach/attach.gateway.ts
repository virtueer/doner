import type { IncomingMessage } from "node:http";
import { type OnGatewayConnection, WebSocketGateway } from "@nestjs/websockets";
import type { WebSocket } from "ws";
import { asMessage } from "../../common/sse.util";
import { AttachService } from "./attach.service";

const HEARTBEAT_INTERVAL_MS = 15_000;

@WebSocketGateway({ path: "/api/attach" })
export class AttachGateway implements OnGatewayConnection {
	constructor(private readonly attach: AttachService) {}

	async handleConnection(client: WebSocket, request: IncomingMessage) {
		keepAlive(client);

		const params = new URL(
			request.url ?? "/",
			`http://${request.headers.host ?? "localhost"}`,
		).searchParams;

		const containerId = params.get("containerId");
		if (!containerId) {
			client.send("Error: containerId is required\r\n");
			client.close();
			return;
		}

		const shell = params.get("shell") || "/bin/sh";

		try {
			const stream =
				params.get("sidecar") === "true"
					? await this.attach.attachSidecar(
							containerId,
							params.get("sidecarImage") || "alpine",
							shell,
						)
					: await this.attach.attach(containerId, shell);

			stream.on("data", (chunk: Buffer) => client.send(chunk.toString("utf8")));
			stream.on("end", () => client.close());

			client.on("message", (message) => stream.write(message.toString()));
			client.on("close", () => stream.end());
		} catch (error) {
			client.send(`Error: ${asMessage(error)}\r\n`);
			client.close();
		}
	}
}

function keepAlive(client: WebSocket) {
	let alive = true;
	client.on("pong", () => {
		alive = true;
	});

	const timer = setInterval(() => {
		if (!alive) {
			clearInterval(timer);
			return client.terminate();
		}
		alive = false;
		client.ping();
	}, HEARTBEAT_INTERVAL_MS);

	client.on("close", () => clearInterval(timer));
}
