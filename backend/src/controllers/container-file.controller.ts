import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { ContainerFileService } from "../docker/services/container-file.service";

@Controller("api")
export class ContainerFileController {
	constructor(private readonly containerFileService: ContainerFileService) {}

	@Get("containers/:id/files")
	async listContainerFiles(
		@Param("id") id: string,
		@Query("path") path: string,
	) {
		return this.containerFileService.listContainerFiles(id, path || "");
	}

	@Get("containers/:id/files/read")
	async readContainerFile(
		@Param("id") id: string,
		@Query("path") path: string,
	) {
		const content = await this.containerFileService.readContainerFile(id, path);
		return { content };
	}

	@Post("containers/:id/files/write")
	async writeContainerFile(
		@Param("id") id: string,
		@Query("path") path: string,
		@Body() body: { content: string },
	) {
		await this.containerFileService.writeContainerFile(id, path, body.content);
		return { success: true };
	}

	@Post("containers/:id/files/copy")
	async copyContainerFile(
		@Param("id") id: string,
		@Body() body: { srcPath: string; destPath: string },
	) {
		await this.containerFileService.copyContainerFile(
			id,
			body.srcPath,
			body.destPath,
		);
		return { success: true };
	}

	@Post("containers/:id/files/delete")
	async deleteContainerFile(
		@Param("id") id: string,
		@Query("path") path: string,
	) {
		await this.containerFileService.deleteContainerFile(id, path);
		return { success: true };
	}

	@Post("containers/:id/files/mkdir")
	async createContainerDirectory(
		@Param("id") id: string,
		@Query("path") path: string,
	) {
		await this.containerFileService.createContainerDirectory(id, path);
		return { success: true };
	}

	@Post("containers/:id/files/rename")
	async renameContainerFile(
		@Param("id") id: string,
		@Body() body: { srcPath: string; destPath: string },
	) {
		await this.containerFileService.renameContainerFile(
			id,
			body.srcPath,
			body.destPath,
		);
		return { success: true };
	}

	@Get("containers/:id/export")
	async exportContainer(
		@Param("id") id: string,
		@Query("path") reqPath: string,
		@Res() res: any,
	) {
		const targetPath = reqPath || "";
		const filename = targetPath
			? targetPath.split("/").filter(Boolean).pop()
			: id;
		res.setHeader("Content-Type", "application/gzip");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${filename}.tar.gz"`,
		);

		try {
			await this.containerFileService.exportContainerStream(
				id,
				targetPath,
				res,
			);
		} catch (err) {
			console.error("Export error:", err);
			if (!res.headersSent) res.status(500).send("Export failed");
		}
	}
}
