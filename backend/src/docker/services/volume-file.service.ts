import * as zlib from "node:zlib";
import { Injectable } from "@nestjs/common";
import { DockerClientService } from "./docker-client.service";

@Injectable()
export class VolumeFileService {
	constructor(private readonly dockerClient: DockerClientService) {}

	async listVolumeFiles(volumeName: string, path = "") {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;

		const cmdArray = [
			"sh",
			"-c",
			`find '${fullPath}' -mindepth 1 -maxdepth 1 -exec stat -c '%F|%s|%Y|%n' {} + || true`,
		];

		try {
			const stdout = await this.dockerClient.runAlpineCommand(
				volumeName,
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
			throw new Error(`Failed to list directory: ${err.message}`);
		}
	}

	async readVolumeFile(volumeName: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;
		const cmdArray = ["head", "-c", "1048576", fullPath];

		try {
			return await this.dockerClient.runAlpineCommand(volumeName, cmdArray);
		} catch (err: any) {
			throw new Error(`Failed to read file: ${err.message}`);
		}
	}

	async writeVolumeFile(volumeName: string, path: string, content: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;
		const base64Content = Buffer.from(content).toString("base64");
		const cmdArray = [
			"sh",
			"-c",
			`echo '${base64Content}' | base64 -d > '${fullPath}'`,
		];

		try {
			await this.dockerClient.runAlpineCommand(volumeName, cmdArray, false);
		} catch (err: any) {
			throw new Error(`Failed to write file: ${err.message}`);
		}
	}

	async deleteVolumeFile(volumeName: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;
		const cmdArray = ["rm", "-rf", fullPath];

		try {
			await this.dockerClient.runAlpineCommand(volumeName, cmdArray, false);
		} catch (err: any) {
			throw new Error(`Failed to delete file: ${err.message}`);
		}
	}

	async copyVolumeFile(volumeName: string, srcPath: string, destPath: string) {
		const safeSrc = srcPath.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const safeDest = destPath
			.replace(/(\.\.\/|\.\.\\)/g, "")
			.replace(/^\/+/, "");
		const fullSrc = `/data/${safeSrc}`;
		const fullDest = `/data/${safeDest}`;
		const cmdArray = ["cp", "-r", fullSrc, fullDest];

		try {
			await this.dockerClient.runAlpineCommand(volumeName, cmdArray, false);
		} catch (err: any) {
			throw new Error(`Failed to copy file: ${err.message}`);
		}
	}

	async createVolumeDirectory(volumeName: string, path: string) {
		const safePath = path.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const fullPath = `/data/${safePath}`;
		try {
			await this.dockerClient.runAlpineCommand(
				volumeName,
				["mkdir", "-p", fullPath],
				false,
			);
		} catch (err: any) {
			throw new Error(`Failed to create directory: ${err.message}`);
		}
	}

	async renameVolumeFile(
		volumeName: string,
		srcPath: string,
		destPath: string,
	) {
		const safeSrc = srcPath.replace(/(\.\.\/|\.\.\\)/g, "").replace(/^\/+/, "");
		const safeDest = destPath
			.replace(/(\.\.\/|\.\.\\)/g, "")
			.replace(/^\/+/, "");
		try {
			await this.dockerClient.runAlpineCommand(
				volumeName,
				["mv", `/data/${safeSrc}`, `/data/${safeDest}`],
				false,
			);
		} catch (err: any) {
			throw new Error(`Failed to rename: ${err.message}`);
		}
	}

	async exportVolumeStream(volumeName: string, subPath: string, res: any) {
		try {
			const helperId = await this.dockerClient.getHelperContainer(
				volumeName,
				"volume",
				false,
			);
			const container = this.dockerClient.docker.getContainer(helperId);

			const safePath = subPath
				.replace(/(\.\.\/|\.\.\\)/g, "")
				.replace(/^\/+/, "");
			const fullPath = safePath ? `/data/${safePath}` : "/data";

			const archiveStream = await container.getArchive({ path: fullPath });
			const gzip = zlib.createGzip();

			archiveStream.pipe(gzip).pipe(res);
		} catch (err: any) {
			throw new Error(`Failed to export volume: ${err.message}`);
		}
	}
}
