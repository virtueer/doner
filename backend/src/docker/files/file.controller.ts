import { Body, Get, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import type { DockerFileService } from "./docker-file.service";
import { normalizeRelative } from "./safe-path.util";

interface PathPairBody {
	srcPath: string;
	destPath: string;
}

const OK = { success: true };

/**
 * Route shape shared by volumes and containers; subclasses only bind a prefix
 * and the service that backs it.
 */
export abstract class FileController {
	protected abstract readonly files: DockerFileService;

	@Get("files")
	list(@Param("id") id: string, @Query("path") path?: string) {
		return this.files.list(id, path);
	}

	@Get("files/read")
	async read(@Param("id") id: string, @Query("path") path: string) {
		return { content: await this.files.read(id, path) };
	}

	@Post("files/write")
	async write(
		@Param("id") id: string,
		@Query("path") path: string,
		@Body() body: { content: string },
	) {
		await this.files.write(id, path, body.content);
		return OK;
	}

	@Post("files/copy")
	async copy(@Param("id") id: string, @Body() body: PathPairBody) {
		await this.files.copy(id, body.srcPath, body.destPath);
		return OK;
	}

	@Post("files/delete")
	async remove(@Param("id") id: string, @Query("path") path: string) {
		await this.files.remove(id, path);
		return OK;
	}

	@Post("files/mkdir")
	async makeDirectory(@Param("id") id: string, @Query("path") path: string) {
		await this.files.makeDirectory(id, path);
		return OK;
	}

	@Post("files/rename")
	async rename(@Param("id") id: string, @Body() body: PathPairBody) {
		await this.files.rename(id, body.srcPath, body.destPath);
		return OK;
	}

	@Get("export")
	async exportArchive(
		@Param("id") id: string,
		@Query("path") path: string,
		@Res() res: Response,
	) {
		res.setHeader("Content-Type", "application/gzip");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${archiveName(id, path)}.tar.gz"`,
		);
		await this.files.exportArchive(id, path, res);
	}
}

function archiveName(id: string, path?: string): string {
	return normalizeRelative(path).split("/").filter(Boolean).pop() || id;
}
