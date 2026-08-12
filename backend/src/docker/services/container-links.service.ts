import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";

export interface ContainerLink {
	title: string;
	url: string;
}

@Injectable()
export class ContainerLinksService {
	private readonly linksFilePath = path.join(
		process.cwd(),
		"data",
		"container-links.json",
	);

	constructor() {
		fs.mkdir(path.dirname(this.linksFilePath), { recursive: true }).catch(
			() => {},
		);
	}

	private async readLinksFile(): Promise<Record<string, ContainerLink[]>> {
		try {
			const data = await fs.readFile(this.linksFilePath, "utf8");
			return JSON.parse(data);
		} catch (err: any) {
			if (err.code === "ENOENT") return {};
			throw err;
		}
	}

	async getContainerLinks(id: string): Promise<ContainerLink[]> {
		const linksData = await this.readLinksFile();
		return linksData[id] || [];
	}

	async saveContainerLinks(id: string, links: ContainerLink[]): Promise<void> {
		const linksData = await this.readLinksFile();
		linksData[id] = links;
		await fs
			.mkdir(path.dirname(this.linksFilePath), { recursive: true })
			.catch(() => {});
		await fs.writeFile(
			this.linksFilePath,
			JSON.stringify(linksData, null, 2),
			"utf8",
		);
	}
}
