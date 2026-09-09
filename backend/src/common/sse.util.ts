import type { Request, Response } from "express";

export async function streamAsSse<T>(
	req: Request,
	res: Response,
	source: (signal: AbortSignal) => Promise<AsyncIterable<T>>,
) {
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.flushHeaders();

	const controller = new AbortController();
	req.on("close", () => controller.abort());

	try {
		for await (const item of await source(controller.signal)) {
			res.write(`data: ${JSON.stringify(item)}\n\n`);
		}
	} catch (error) {
		res.write(`data: ${JSON.stringify({ error: asMessage(error) })}\n\n`);
	}
	res.end();
}

export function asMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
