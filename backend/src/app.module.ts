import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DockerService } from './docker/docker.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, DockerService],
})
export class AppModule {}
