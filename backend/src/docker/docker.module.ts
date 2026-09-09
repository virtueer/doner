import { Module } from "@nestjs/common";
import { AttachGateway } from "./attach/attach.gateway";
import { AttachService } from "./attach/attach.service";
import { DockerClientService } from "./client/docker-client.service";
import { ContainerController } from "./containers/container.controller";
import { ContainerService } from "./containers/container.service";
import { ContainerLinksService } from "./containers/container-links.service";
import { ContainerFileController } from "./files/container-file.controller";
import { ContainerFileService } from "./files/container-file.service";
import { VolumeFileController } from "./files/volume-file.controller";
import { VolumeFileService } from "./files/volume-file.service";
import { StreamsController } from "./streams/streams.controller";
import { StreamsService } from "./streams/streams.service";
import { GraphService } from "./topology/graph.service";
import { TopologyController } from "./topology/topology.controller";
import { TopologyService } from "./topology/topology.service";

@Module({
	controllers: [
		TopologyController,
		ContainerController,
		StreamsController,
		VolumeFileController,
		ContainerFileController,
	],
	providers: [
		DockerClientService,
		TopologyService,
		GraphService,
		ContainerService,
		ContainerLinksService,
		StreamsService,
		VolumeFileService,
		ContainerFileService,
		AttachService,
		AttachGateway,
	],
})
export class DockerModule {}
