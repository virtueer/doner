import { InternalServerErrorException } from "@nestjs/common";
import type { Response } from "express";
import { asMessage } from "../../common/sse.util";
import type { DockerClientService } from "../client/docker-client.service";
import { normalizeRelative, resolveInsideRoot } from "./safe-path.util";
import { shellCommand } from "./shell.util";

const READ_LIMIT_BYTES = 1_048_576;

export interface FileEntry {
	type: "directory" | "symlink" | "file";
	size: number;
	mtime: number;
	name: string;
	path: string;
}

// -H follows the starting point only: a container root is /proc/<pid>/root,
// a symlink, while entries inside must still report as symlinks.
const LIST_SCRIPT =
	'find -H "$1" -mindepth 1 -maxdepth 1 -exec stat -c "%F|%s|%Y|%n" {} + || true';
const WRITE_SCRIPT = 'echo "$1" | base64 -d > "$2"';

/**
 * Shared file operations for anything reachable through an alpine helper
 * container. Subclasses supply the mount root and the helper kind.
 */
export abstract class DockerFileService {
	constructor(
		protected readonly dockerClient: DockerClientService,
		private readonly root: string,
		private readonly helperKind: "volume" | "container",
	) {}

	async list(targetId: string, path = ""): Promise<FileEntry[]> {
		const stdout = await this.run(
			"List directory",
			targetId,
			shellCommand(LIST_SCRIPT, this.resolve(path)),
		);
		return parseStatLines(stdout, normalizeRelative(path));
	}

	read(targetId: string, path: string): Promise<string> {
		return this.run("Read file", targetId, [
			"head",
			"-c",
			String(READ_LIMIT_BYTES),
			this.resolve(path),
		]);
	}

	async write(targetId: string, path: string, content: string): Promise<void> {
		const encoded = Buffer.from(content).toString("base64");
		await this.run(
			"Write file",
			targetId,
			shellCommand(WRITE_SCRIPT, encoded, this.resolve(path)),
		);
	}

	async remove(targetId: string, path: string): Promise<void> {
		await this.run("Delete", targetId, ["rm", "-rf", this.resolve(path)]);
	}

	async copy(targetId: string, from: string, to: string): Promise<void> {
		await this.run("Copy", targetId, [
			"cp",
			"-r",
			this.resolve(from),
			this.resolve(to),
		]);
	}

	async makeDirectory(targetId: string, path: string): Promise<void> {
		await this.run("Create directory", targetId, [
			"mkdir",
			"-p",
			this.resolve(path),
		]);
	}

	async rename(targetId: string, from: string, to: string): Promise<void> {
		await this.run("Rename", targetId, [
			"mv",
			this.resolve(from),
			this.resolve(to),
		]);
	}

	abstract exportArchive(
		targetId: string,
		path: string,
		res: Response,
	): Promise<void>;

	protected resolve(path: string): string {
		return resolveInsideRoot(this.root, path);
	}

	private async run(action: string, targetId: string, cmd: string[]) {
		try {
			return await this.dockerClient.execInHelper(
				targetId,
				this.helperKind,
				cmd,
			);
		} catch (error) {
			throw new InternalServerErrorException(
				`${action} failed: ${asMessage(error)}`,
			);
		}
	}
}

function parseStatLines(stdout: string, parentPath: string): FileEntry[] {
	if (!stdout.trim()) return [];

	return stdout
		.trim()
		.split("\n")
		.flatMap((line): FileEntry[] => {
			const [type, size, mtime, fullName] = line.split("|");
			const name = fullName?.split("/").pop();
			if (!name) return [];

			return [
				{
					type: toEntryType(type),
					size: parseInt(size, 10) || 0,
					mtime: parseInt(mtime, 10) * 1000 || 0,
					name,
					path: parentPath ? `${parentPath}/${name}` : name,
				},
			];
		})
		.sort(
			(a, b) =>
				directoryRank(a) - directoryRank(b) || a.name.localeCompare(b.name),
		);
}

function directoryRank(entry: FileEntry): number {
	return entry.type === "directory" ? 0 : 1;
}

function toEntryType(statType: string): FileEntry["type"] {
	if (statType === "directory") return "directory";
	return statType.includes("link") ? "symlink" : "file";
}
