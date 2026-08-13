import { Injectable } from "@nestjs/common";
import { ContainerFileService } from "./services/container-file.service";
import { ContainerLinksService } from "./services/container-links.service";
import { DockerAttachService } from "./services/docker-attach.service";
import { DockerClientService } from "./services/docker-client.service";
import { DockerGraphService } from "./services/docker-graph.service";
import { DockerStreamsService } from "./services/docker-streams.service";
import { VolumeFileService } from "./services/volume-file.service";

@Injectable()
export class DockerService {
	constructor(
		public readonly dockerClient: DockerClientService,
		public readonly graphService: DockerGraphService,
		public readonly streamsService: DockerStreamsService,
		public readonly attachService: DockerAttachService,
		public readonly volumeFileService: VolumeFileService,
		public readonly containerFileService: ContainerFileService,
		public readonly linksService: ContainerLinksService,
	) {}

	// --- Stream Generators ---
	getContainerLogsStream(containerId: string, signal?: AbortSignal) {
		return this.streamsService.getContainerLogsStream(containerId, signal);
	}

	getContainerStatsStream(id: string, signal?: AbortSignal) {
		return this.streamsService.getContainerStatsStream(id, signal);
	}

	getEventsStream(signal?: AbortSignal) {
		return this.streamsService.getEventsStream(signal);
	}

	// --- Network Graph Topology ---
	getNetworkGraph() {
		return this.graphService.getNetworkGraph();
	}

	// --- Inspect Operations ---
	inspectContainer(id: string) {
		return this.dockerClient.docker.getContainer(id).inspect();
	}

	inspectNetwork(id: string) {
		return this.dockerClient.docker.getNetwork(id).inspect();
	}

	inspectVolume(name: string) {
		return this.dockerClient.docker.getVolume(name).inspect();
	}

	inspectImage(id: string) {
		return this.dockerClient.docker.getImage(id).inspect();
	}

	getSystemDf() {
		return this.dockerClient.docker.df();
	}

	// --- Container Lifecycle Operations ---
	startContainer(id: string) {
		return this.dockerClient.docker.getContainer(id).start();
	}

	stopContainer(id: string) {
		return this.dockerClient.docker.getContainer(id).stop();
	}

	restartContainer(id: string) {
		return this.dockerClient.docker.getContainer(id).restart();
	}

	deleteContainer(id: string, force = false) {
		return this.dockerClient.docker.getContainer(id).remove({ force });
	}

	deleteImage(id: string, force = false) {
		return this.dockerClient.docker.getImage(id).remove({ force });
	}

	deleteNetwork(id: string) {
		return this.dockerClient.docker.getNetwork(id).remove();
	}

	deleteVolume(name: string) {
		return this.dockerClient.docker.getVolume(name).remove();
	}

	// --- Terminal Attach & Sidecar ---
	attachToContainer(containerId: string, shell: string) {
		return this.attachService.attachToContainer(containerId, shell);
	}

	attachSidecar(
		targetContainerId: string,
		image = "alpine",
		shell = "/bin/sh",
	) {
		return this.attachService.attachSidecar(targetContainerId, image, shell);
	}

	// --- Container Links ---
	getContainerLinks(id: string) {
		return this.linksService.getContainerLinks(id);
	}

	saveContainerLinks(id: string, links: { title: string; url: string }[]) {
		return this.linksService.saveContainerLinks(id, links);
	}

	// --- Volume File Operations ---
	listVolumeFiles(volumeName: string, path = "") {
		return this.volumeFileService.listVolumeFiles(volumeName, path);
	}

	readVolumeFile(volumeName: string, path: string) {
		return this.volumeFileService.readVolumeFile(volumeName, path);
	}

	writeVolumeFile(volumeName: string, path: string, content: string) {
		return this.volumeFileService.writeVolumeFile(volumeName, path, content);
	}

	deleteVolumeFile(volumeName: string, path: string) {
		return this.volumeFileService.deleteVolumeFile(volumeName, path);
	}

	copyVolumeFile(volumeName: string, srcPath: string, destPath: string) {
		return this.volumeFileService.copyVolumeFile(volumeName, srcPath, destPath);
	}

	createVolumeDirectory(volumeName: string, path: string) {
		return this.volumeFileService.createVolumeDirectory(volumeName, path);
	}

	renameVolumeFile(volumeName: string, srcPath: string, destPath: string) {
		return this.volumeFileService.renameVolumeFile(
			volumeName,
			srcPath,
			destPath,
		);
	}

	// --- Container File Operations ---
	listContainerFiles(containerId: string, path = "") {
		return this.containerFileService.listContainerFiles(containerId, path);
	}

	readContainerFile(containerId: string, path: string) {
		return this.containerFileService.readContainerFile(containerId, path);
	}

	writeContainerFile(containerId: string, path: string, content: string) {
		return this.containerFileService.writeContainerFile(
			containerId,
			path,
			content,
		);
	}

	deleteContainerFile(containerId: string, path: string) {
		return this.containerFileService.deleteContainerFile(containerId, path);
	}

	copyContainerFile(containerId: string, srcPath: string, destPath: string) {
		return this.containerFileService.copyContainerFile(
			containerId,
			srcPath,
			destPath,
		);
	}

	createContainerDirectory(containerId: string, path: string) {
		return this.containerFileService.createContainerDirectory(
			containerId,
			path,
		);
	}

	renameContainerFile(containerId: string, srcPath: string, destPath: string) {
		return this.containerFileService.renameContainerFile(
			containerId,
			srcPath,
			destPath,
		);
	}

	// --- Export Streams ---
	exportVolumeStream(volumeName: string, subPath: string, res: any) {
		return this.volumeFileService.exportVolumeStream(volumeName, subPath, res);
	}

	exportContainerStream(containerId: string, subPath: string, res: any) {
		return this.containerFileService.exportContainerStream(
			containerId,
			subPath,
			res,
		);
	}
}
