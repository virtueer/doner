import { Controller, Get, Post, Param, Res, Req, Query, Body } from '@nestjs/common';
import { DockerService } from './docker/docker.service';

@Controller('api')
export class AppController {
  constructor(private readonly dockerService: DockerService) {}

  @Get('network-graph')
  async getNetworkGraph() {
    return this.dockerService.getNetworkGraph();
  }

  @Get('container-logs/:id')
  async streamContainerLogs(@Param('id') id: string, @Res() res: any, @Req() req: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const ac = new AbortController();
    req.on('close', () => ac.abort());

    const logs = await this.dockerService.getContainerLogsStream(id, ac.signal);
    for await (const line of logs) {
      res.write(`data: ${JSON.stringify(line)}\n\n`);
    }
    res.end();
  }

  @Get('container-stats/:id')
  async streamContainerStats(@Param('id') id: string, @Res() res: any, @Req() req: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const ac = new AbortController();
    req.on('close', () => ac.abort());

    try {
      const stats = await this.dockerService.getContainerStatsStream(id, ac.signal);
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
  async inspectNode(@Param('type') type: string, @Param('id') id: string) {
    if (type === 'containerNode') return this.dockerService.inspectContainer(id);
    if (type === 'networkNode') return this.dockerService.inspectNetwork(id);
    if (type === 'volumeNode') return this.dockerService.inspectVolume(id);
    throw new Error('Invalid node type');
  }

  @Get('volumes/:name/files')
  async listVolumeFiles(@Param('name') name: string, @Query('path') path: string) {
    return this.dockerService.listVolumeFiles(name, path || '');
  }
  @Get('volumes/:name/files/read')
  async readVolumeFile(@Param('name') name: string, @Query('path') path: string) {
    const content = await this.dockerService.readVolumeFile(name, path);
    return { content };
  }

  @Post('volumes/:name/files/write')
  async writeVolumeFile(
    @Param('name') name: string,
    @Query('path') path: string,
    @Body() body: { content: string }
  ) {
    await this.dockerService.writeVolumeFile(name, path, body.content);
    return { success: true };
  }

  @Post('volumes/:name/files/copy')
  async copyVolumeFile(
    @Param('name') name: string,
    @Body() body: { srcPath: string, destPath: string }
  ) {
    await this.dockerService.copyVolumeFile(name, body.srcPath, body.destPath);
    return { success: true };
  }

  @Post('volumes/:name/files/delete')
  async deleteVolumeFile(
    @Param('name') name: string,
    @Query('path') path: string
  ) {
    await this.dockerService.deleteVolumeFile(name, path);
    return { success: true };
  }

  @Get('containers/:id/files')
  async listContainerFiles(@Param('id') id: string, @Query('path') path: string) {
    return this.dockerService.listContainerFiles(id, path || '');
  }

  @Get('containers/:id/files/read')
  async readContainerFile(@Param('id') id: string, @Query('path') path: string) {
    const content = await this.dockerService.readContainerFile(id, path);
    return { content };
  }

  @Post('containers/:id/files/write')
  async writeContainerFile(
    @Param('id') id: string,
    @Query('path') path: string,
    @Body() body: { content: string }
  ) {
    await this.dockerService.writeContainerFile(id, path, body.content);
    return { success: true };
  }

  @Post('containers/:id/files/copy')
  async copyContainerFile(
    @Param('id') id: string,
    @Body() body: { srcPath: string, destPath: string }
  ) {
    await this.dockerService.copyContainerFile(id, body.srcPath, body.destPath);
    return { success: true };
  }

  @Post('containers/:id/files/delete')
  async deleteContainerFile(
    @Param('id') id: string,
    @Query('path') path: string
  ) {
    await this.dockerService.deleteContainerFile(id, path);
    return { success: true };
  }

  @Get('volumes/:name/export')
  async exportVolume(@Param('name') name: string, @Res() res: any) {
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.tar.gz"`);
    
    try {
      await this.dockerService.exportVolumeStream(name, res);
    } catch (err) {
      console.error('Export error:', err);
      if (!res.headersSent) res.status(500).send('Export failed');
    }
  }
}
