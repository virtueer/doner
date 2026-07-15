import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DockerGateway } from "./docker/docker.gateway";
import { DockerService } from "./docker/docker.service";

@Module({
	imports: [],
	controllers: [AppController],
	providers: [AppService, DockerService, DockerGateway],
})
export class AppModule {}
