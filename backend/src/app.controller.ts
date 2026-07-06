import { Controller, Get } from '@nestjs/common';
import { DockerService } from './docker/docker.service';

@Controller('api')
export class AppController {
  constructor(private readonly dockerService: DockerService) {}

  @Get('network-graph')
  async getNetworkGraph() {
    return this.dockerService.getNetworkGraph();
  }
}
