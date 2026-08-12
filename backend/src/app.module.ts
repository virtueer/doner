import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ContainerController } from "./controllers/container.controller";
import { ContainerFileController } from "./controllers/container-file.controller";
import { StreamsController } from "./controllers/streams.controller";
import { TopologyController } from "./controllers/topology.controller";
import { VolumeFileController } from "./controllers/volume-file.controller";
import { DockerGateway } from "./docker/docker.gateway";
import { DockerService } from "./docker/docker.service";
import { ContainerFileService } from "./docker/services/container-file.service";
import { ContainerLinksService } from "./docker/services/container-links.service";
import { DockerAttachService } from "./docker/services/docker-attach.service";
import { DockerClientService } from "./docker/services/docker-client.service";
import { DockerGraphService } from "./docker/services/docker-graph.service";
import { DockerStreamsService } from "./docker/services/docker-streams.service";
import { VolumeFileService } from "./docker/services/volume-file.service";

@Module({
	imports: [],
	controllers: [
		AppController,
		TopologyController,
		ContainerController,
		StreamsController,
		VolumeFileController,
		ContainerFileController,
	],
	providers: [
		AppService,
		DockerClientService,
		ContainerLinksService,
		DockerStreamsService,
		DockerGraphService,
		DockerAttachService,
		VolumeFileService,
		ContainerFileService,
		DockerService,
		DockerGateway,
	],
})
export class AppModule {}
