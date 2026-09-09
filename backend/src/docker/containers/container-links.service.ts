import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";

export interface ContainerLink {
	title: string;
	url: string;
}

type LinksByContainer = Record<string, ContainerLink[]>;

const LINKS_FILE = path.join(process.cwd(), "data", "container-links.json");

@Injectable()
export class ContainerLinksService {
	async get(containerId: string): Promise<ContainerLink[]> {
		const all = await this.readAll();
		return all[containerId] ?? [];
	}

	async save(containerId: string, links: ContainerLink[]): Promise<void> {
		const all = await this.readAll();
		all[containerId] = links;

		await fs.mkdir(path.dirname(LINKS_FILE), { recursive: true });
		await fs.writeFile(LINKS_FILE, JSON.stringify(all, null, 2), "utf8");
	}

	private async readAll(): Promise<LinksByContainer> {
		try {
			return JSON.parse(await fs.readFile(LINKS_FILE, "utf8"));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
			throw error;
		}
	}
}
