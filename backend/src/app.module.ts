import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DockerService } from './docker/docker.service';
import { DockerGateway } from './docker/docker.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, DockerService, DockerGateway],
})
export class AppModule {}
