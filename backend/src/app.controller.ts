import { Controller, Get, Post, Param, Res } from '@nestjs/common';
import { DockerService } from './docker/docker.service';

@Controller('api')
export class AppController {
  constructor(private readonly dockerService: DockerService) {}

  @Get('network-graph')
  async getNetworkGraph() {
    return this.dockerService.getNetworkGraph();
  }

  @Get('container-logs/:id')
  async streamContainerLogs(@Param('id') id: string, @Res() res: any) {
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

  @Get('container-stats/:id')
  async streamContainerStats(@Param('id') id: string, @Res() res: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const stats = await this.dockerService.getContainerStatsStream(id);
      for await (const data of stats) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    } catch (e: any) {
      res.write(`data: {"error": "${e.message}"}\n\n`);
    }
    res.end();
  }

  @Post('containers/:id/start')
  async startContainer(@Param('id') id: string) {
    await this.dockerService.startContainer(id);
    return { success: true };
  }

  @Post('containers/:id/stop')
  async stopContainer(@Param('id') id: string) {
    await this.dockerService.stopContainer(id);
    return { success: true };
  }

  @Post('containers/:id/restart')
  async restartContainer(@Param('id') id: string) {
    await this.dockerService.restartContainer(id);
    return { success: true };
  }

  @Get('inspect/:type/:id')
  async inspectEntity(@Param('type') type: string, @Param('id') id: string) {
    try {
      if (type === 'containerNode') {
        return await this.dockerService.inspectContainer(id);
      } else if (type === 'networkNode') {
        return await this.dockerService.inspectNetwork(id);
      } else if (type === 'volumeNode') {
        return await this.dockerService.inspectVolume(id);
      }
      return { error: 'Unknown entity type' };
    } catch (e: any) {
      return { error: e.message || 'Error inspecting entity' };
    }
  }
}
