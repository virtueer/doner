import { Controller, Get, Param } from '@nestjs/common';
import { DockerService } from './docker/docker.service';

@Controller('api')
export class AppController {
  constructor(private readonly dockerService: DockerService) {}

  @Get('network-graph')
  async getNetworkGraph() {
    return this.dockerService.getNetworkGraph();
  }

  @Get('container-logs/:id')
  async streamContainerLogs(@Param('id') id: string, res: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const logs = await this.dockerService.getContainerLogsStream(id);
    for await (const line of logs) {
      res.write(`data: ${JSON.stringify(line)}\n\n`);
    }
    res.end();
  }
}
