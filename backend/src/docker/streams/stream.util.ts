/** Docker multiplexes stdout/stderr behind an 8-byte frame header. */
const FRAME_HEADER_SIZE = 8;
const PAYLOAD_LENGTH_OFFSET = 4;

export function destroyOnAbort(stream: unknown, signal?: AbortSignal) {
	signal?.addEventListener("abort", () => {
		(stream as { destroy?: () => void })?.destroy?.();
	});
}

export async function* parseNdjson(
	stream: AsyncIterable<Buffer>,
): AsyncGenerator<unknown> {
	let buffer = "";

	for await (const chunk of stream) {
		buffer += chunk.toString("utf8");

		let newline = buffer.indexOf("\n");
		while (newline !== -1) {
			const line = buffer.slice(0, newline).trim();
			buffer = buffer.slice(newline + 1);
			if (line) {
				try {
					yield JSON.parse(line);
				} catch {
					// Docker occasionally emits keep-alive noise between records.
				}
			}
			newline = buffer.indexOf("\n");
		}
	}
}

export async function* parseLogFrames(
	stream: AsyncIterable<Buffer>,
): AsyncGenerator<string> {
	let buffer = Buffer.alloc(0);

	for await (const chunk of stream) {
		buffer = Buffer.concat([buffer, Buffer.from(chunk)]);

		while (buffer.length >= FRAME_HEADER_SIZE) {
			const payloadLength = buffer.readUInt32BE(PAYLOAD_LENGTH_OFFSET);
			if (buffer.length < FRAME_HEADER_SIZE + payloadLength) break;

			const payload = buffer
				.subarray(FRAME_HEADER_SIZE, FRAME_HEADER_SIZE + payloadLength)
				.toString("utf8");
			buffer = buffer.subarray(FRAME_HEADER_SIZE + payloadLength);

			for (const line of payload.split("\n")) {
				if (line.trim()) yield line;
			}
		}
	}
}
