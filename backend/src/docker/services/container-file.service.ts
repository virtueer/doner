import * as zlib from "node:zlib";
import { Injectable } from "@nestjs/common";
import { DockerClientService } from "./docker-client.service";

@Injectable()
export class ContainerFileService {
	constructor(private readonly dockerClient: DockerClientService) {}

	async listContainerFiles(containerId: string, path = "") {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;

		const cmdArray = [
			"sh",
			"-c",
			`find '${fullPath}' -mindepth 1 -maxdepth 1 -exec stat -c '%F|%s|%Y|%n' {} + || true`,
		];

		try {
			const stdout = await this.dockerClient.runAlpineContainerCommand(
				containerId,
				cmdArray,
			);
			if (!stdout.trim()) return [];

			return stdout
				.trim()
				.split("\n")
				.map((line) => {
					const [type, size, mtime, name] = line.split("|");
					if (!name) return null;
					const basename = name.split("/").pop() || "";
					return {
						type:
							type === "directory"
								? "directory"
								: type.includes("link")
									? "symlink"
									: "file",
						size: parseInt(size, 10) || 0,
						mtime: parseInt(mtime, 10) * 1000 || 0,
						name: basename,
						path: safePath ? `${safePath}/${basename}` : basename,
					};
				})
				.filter(Boolean)
				.sort((a: any, b: any) => {
					if (a.type === b.type) return a.name.localeCompare(b.name);
					return a.type === "directory" ? -1 : 1;
				});
		} catch (err: any) {
			throw new Error(`Failed to list container directory: ${err.message}`);
		}
	}

	async readContainerFile(containerId: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;
		const cmdArray = ["head", "-c", "1048576", fullPath];

		try {
			return await this.dockerClient.runAlpineContainerCommand(
				containerId,
				cmdArray,
			);
		} catch (err: any) {
			throw new Error(`Failed to read container file: ${err.message}`);
		}
	}

	async writeContainerFile(containerId: string, path: string, content: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;
		const base64Content = Buffer.from(content).toString("base64");
		const cmdArray = [
			"sh",
			"-c",
			`echo '${base64Content}' | base64 -d > '${fullPath}'`,
		];

		try {
			await this.dockerClient.runAlpineContainerCommand(containerId, cmdArray);
		} catch (err: any) {
			throw new Error(`Failed to write file: ${err.message}`);
		}
	}

	async deleteContainerFile(containerId: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;
		const cmdArray = ["rm", "-rf", fullPath];

		try {
			await this.dockerClient.runAlpineContainerCommand(containerId, cmdArray);
		} catch (err: any) {
			throw new Error(`Failed to delete file: ${err.message}`);
		}
	}

	async copyContainerFile(
		containerId: string,
		srcPath: string,
		destPath: string,
	) {
		const safeSrc = srcPath.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const safeDest = destPath
			.replace(/(\.\.\/|\.\.\\)/g, "")
			.replace(/^\/+/, "");
		const fullSrc = `/proc/1/root/${safeSrc}`;
		const fullDest = `/proc/1/root/${safeDest}`;
		const cmdArray = ["cp", "-r", fullSrc, fullDest];

		try {
			await this.dockerClient.runAlpineContainerCommand(containerId, cmdArray);
		} catch (err: any) {
			throw new Error(`Failed to copy file: ${err.message}`);
		}
	}

	async createContainerDirectory(containerId: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/proc/1/root/${safePath}`;
		try {
			await this.dockerClient.runAlpineContainerCommand(containerId, [
				"mkdir",
				"-p",
				fullPath,
			]);
		} catch (err: any) {
			throw new Error(`Failed to create directory: ${err.message}`);
		}
	}

	async renameContainerFile(
		containerId: string,
		srcPath: string,
		destPath: string,
	) {
		const safeSrc = srcPath.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const safeDest = destPath
			.replace(/(\.\.\/|\.\.\\)/g, "")
			.replace(/^\/+/, "");
		try {
			await this.dockerClient.runAlpineContainerCommand(containerId, [
				"mv",
				`/proc/1/root/${safeSrc}`,
				`/proc/1/root/${safeDest}`,
			]);
		} catch (err: any) {
			throw new Error(`Failed to rename: ${err.message}`);
		}
	}

	async exportContainerStream(containerId: string, subPath: string, res: any) {
		try {
			const container = this.dockerClient.docker.getContainer(containerId);
			const safePath = subPath.replace(/(\.\.\/|\.\.\\)/g, "");
			const fullPath = safePath.startsWith("/") ? safePath : `/${safePath}`;

			const archiveStream = await container.getArchive({ path: fullPath });
			const gzip = zlib.createGzip();

			archiveStream.pipe(gzip).pipe(res);
		} catch (err: any) {
			throw new Error(`Failed to export container path: ${err.message}`);
		}
	}
}
