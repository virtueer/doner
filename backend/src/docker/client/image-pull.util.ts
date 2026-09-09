import type Docker from "dockerode";
import type { ContainerCreateOptions } from "dockerode";

function isImageMissing(error: unknown): boolean {
	const err = error as { statusCode?: number; message?: string };
	return (
		err?.statusCode === 404 && Boolean(err.message?.includes("No such image"))
	);
}

function pullImage(docker: Docker, image: string): Promise<void> {
	return new Promise((resolve, reject) => {
		docker.pull(image, (pullError: unknown, stream: NodeJS.ReadableStream) => {
			if (pullError) return reject(pullError);
			docker.modem.followProgress(stream, (progressError: unknown) =>
				progressError ? reject(progressError) : resolve(),
			);
		});
	});
}

export async function createContainerPullingIfMissing(
	docker: Docker,
	options: ContainerCreateOptions,
) {
	try {
		return await docker.createContainer(options);
	} catch (error) {
		if (!isImageMissing(error)) throw error;
		await pullImage(docker, options.Image as string);
		return docker.createContainer(options);
	}
}
