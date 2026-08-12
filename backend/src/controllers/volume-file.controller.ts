import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { VolumeFileService } from "../docker/services/volume-file.service";

@Controller("api")
export class VolumeFileController {
	constructor(private readonly volumeFileService: VolumeFileService) {}

	@Get("volumes/:name/files")
	async listVolumeFiles(
		@Param("name") name: string,
		@Query("path") path: string,
	) {
		return this.volumeFileService.listVolumeFiles(name, path || "");
	}

	@Get("volumes/:name/files/read")
	async readVolumeFile(
		@Param("name") name: string,
		@Query("path") path: string,
	) {
		const content = await this.volumeFileService.readVolumeFile(name, path);
		return { content };
	}

	@Post("volumes/:name/files/write")
	async writeVolumeFile(
		@Param("name") name: string,
		@Query("path") path: string,
		@Body() body: { content: string },
	) {
		await this.volumeFileService.writeVolumeFile(name, path, body.content);
		return { success: true };
	}

	@Post("volumes/:name/files/copy")
	async copyVolumeFile(
		@Param("name") name: string,
		@Body() body: { srcPath: string; destPath: string },
	) {
		await this.volumeFileService.copyVolumeFile(
			name,
			body.srcPath,
			body.destPath,
		);
		return { success: true };
	}

	@Post("volumes/:name/files/delete")
	async deleteVolumeFile(
		@Param("name") name: string,
		@Query("path") path: string,
	) {
		await this.volumeFileService.deleteVolumeFile(name, path);
		return { success: true };
	}

	@Post("volumes/:name/files/mkdir")
	async createVolumeDirectory(
		@Param("name") name: string,
		@Query("path") path: string,
	) {
		await this.volumeFileService.createVolumeDirectory(name, path);
		return { success: true };
	}

	@Post("volumes/:name/files/rename")
	async renameVolumeFile(
		@Param("name") name: string,
		@Body() body: { srcPath: string; destPath: string },
	) {
		await this.volumeFileService.renameVolumeFile(
			name,
			body.srcPath,
			body.destPath,
		);
		return { success: true };
	}

	@Get("volumes/:name/export")
	async exportVolume(
		@Param("name") name: string,
		@Query("path") reqPath: string,
		@Res() res: any,
	) {
		const targetPath = reqPath || "";
		const filename = targetPath
			? targetPath.split("/").filter(Boolean).pop()
			: name;
		res.setHeader("Content-Type", "application/gzip");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${filename}.tar.gz"`,
		);

		try {
			await this.volumeFileService.exportVolumeStream(name, targetPath, res);
		} catch (err) {
			console.error("Export error:", err);
			if (!res.headersSent) res.status(500).send("Export failed");
		}
	}
}
