import { Injectable } from '@nestjs/common';
import Docker from 'dockerode';
import type { Container } from 'dockerode';
import * as stream from 'stream';
import * as zlib from 'zlib';

@Injectable()
export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker(); // Defaults to standard socket/pipe
  }

  async getContainerLogsStream(containerId: string, signal?: AbortSignal): Promise<AsyncIterable<string>> {
    const container: Container = this.docker.getContainer(containerId);
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
      tail: 100,
      timestamps: true,
    });

    if (signal) {
      signal.addEventListener('abort', () => {
        if (stream && typeof (stream as any).destroy === 'function') {
          (stream as any).destroy();
        }
      });
    }

    return (async function* () {
      // Docker raw log stream: each message has an 8-byte header
      // (1 byte stream type + 3 bytes padding + 4 bytes length)
      let dataBuffer = Buffer.alloc(0);

      for await (const chunk of stream as any) {
        dataBuffer = Buffer.concat([dataBuffer, Buffer.from(chunk)]);

        while (dataBuffer.length >= 8) {
          const msgLength = dataBuffer.readUInt32BE(4);
          if (dataBuffer.length < 8 + msgLength) break;

          const message = dataBuffer.slice(8, 8 + msgLength).toString('utf8');
          dataBuffer = dataBuffer.slice(8 + msgLength);

          const lines = message.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              // Strip ANSI escape sequences
              yield line.replace(/\x1b\[[0-9;]*m/g, '');
            }
          }
        }
      }
    })();
  }

  async inspectContainer(id: string) {
    return this.docker.getContainer(id).inspect();
  }

  async inspectNetwork(id: string) {
    return this.docker.getNetwork(id).inspect();
  }

  async inspectVolume(name: string) {
    return this.docker.getVolume(name).inspect();
  }

  async attachToContainer(containerId: string, shell: string) {
    const container = this.docker.getContainer(containerId);
    
    // Create an exec instance
    const exec = await container.exec({
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: [shell],
    });

    // Start the exec session
    const stream = await exec.start({
      hijack: true,
      stdin: true,
      Tty: true,
    });

    return stream;
  }

  async startContainer(id: string) {
    return this.docker.getContainer(id).start();
  }

  async stopContainer(id: string) {
    return this.docker.getContainer(id).stop();
  }

  async restartContainer(id: string) {
    return this.docker.getContainer(id).restart();
  }

  async getContainerStatsStream(id: string, signal?: AbortSignal): Promise<AsyncIterable<any>> {
    const container = this.docker.getContainer(id);
    const stream = await container.stats({ stream: true });
    
    if (signal) {
      signal.addEventListener('abort', () => {
        if (stream && typeof (stream as any).destroy === 'function') {
          (stream as any).destroy();
        }
      });
    }
    
    return (async function* () {
      let dataBuffer = '';
      for await (const chunk of stream as any) {
        dataBuffer += chunk.toString('utf8');
        let index = dataBuffer.indexOf('\n');
        while (index !== -1) {
          const line = dataBuffer.substring(0, index);
          dataBuffer = dataBuffer.substring(index + 1);
          if (line.trim()) {
            try {
              yield JSON.parse(line);
            } catch (e) {
              // ignore parse errors
            }
          }
          index = dataBuffer.indexOf('\n');
        }
      }
    })();
  }

  async getNetworkGraph() {
    try {
      const networks = await this.docker.listNetworks();
      const containers = await this.docker.listContainers({ all: true });
      const volumes = await this.docker.listVolumes();

      const nodes: any[] = [];
      const edges: any[] = [];

      // Layout constants
      const COL_NET = 0;
      const COL_CONT = 420;
      const COL_VOL = 880;
      const ROW_GAP = 140;
      const GROUP_GAP = 60; // extra gap between network groups

      // --- Step 1: Build container -> primary network mapping ---
      const containerPrimaryNet = new Map<string, string>(); // containerId -> networkId
      const netContainerIds = new Map<string, string[]>(); // networkId -> containerIds[]
      networks.forEach((net) => netContainerIds.set(net.Id, []));

      containers.forEach((container) => {
        if (container.NetworkSettings?.Networks) {
          const netEntries = Object.entries(container.NetworkSettings.Networks);
          if (netEntries.length > 0) {
            const [, firstNetInfo] = netEntries[0] as [string, any];
            const primaryNetId = firstNetInfo.NetworkID;
            containerPrimaryNet.set(container.Id, primaryNetId);
            netContainerIds.get(primaryNetId)?.push(container.Id);
          }
        }
      });

      // --- Step 2: Order containers grouped by primary network ---
      const containerById = new Map(containers.map((c) => [c.Id, c]));
      const orderedContainerIds: string[] = [];
      const placed = new Set<string>();

      // Group structure: track where each network's containers start/end
      const networkGroups: Array<{
        netId: string;
        startIdx: number;
        endIdx: number;
      }> = [];

      networks.forEach((net) => {
        const connectedIds = netContainerIds.get(net.Id) || [];
        if (connectedIds.length === 0) return;
        const startIdx = orderedContainerIds.length;
        connectedIds.forEach((cId) => {
          if (!placed.has(cId)) {
            orderedContainerIds.push(cId);
            placed.add(cId);
          }
        });
        const endIdx = orderedContainerIds.length - 1;
        if (endIdx >= startIdx) {
          networkGroups.push({ netId: net.Id, startIdx, endIdx });
        }
      });

      // Add orphan containers (no network)
      containers.forEach((c) => {
        if (!placed.has(c.Id)) orderedContainerIds.push(c.Id);
      });

      // --- Step 3: Compute Y positions for containers with group gaps ---
      const containerYPositions = new Map<string, number>();
      let currentY = 0;
      let prevGroupEnd = -1;

      orderedContainerIds.forEach((cId, idx) => {
        // Check if this is the start of a new group
        const group = networkGroups.find((g) => g.startIdx === idx);
        if (group && prevGroupEnd >= 0) {
          currentY += GROUP_GAP; // extra gap between groups
        }
        containerYPositions.set(cId, currentY);
        currentY += ROW_GAP;

        // Track group end
        const endGroup = networkGroups.find((g) => g.endIdx === idx);
        if (endGroup) prevGroupEnd = idx;
      });

      // --- Step 4: Create container nodes ---
      const networkMap = new Map<string, string>(); // dockerNetworkId -> nodeId
      networks.forEach((net) => {
        networkMap.set(net.Id, `net-${net.Id}`);
      });

      orderedContainerIds.forEach((cId) => {
        const container = containerById.get(cId);
        if (!container) return;

        const containerId = `cont-${container.Id}`;
        const containerName =
          container.Names[0]?.replace('/', '') || container.Id;
        const y = containerYPositions.get(cId) ?? 0;

        // Collect volume mounts
        const mountNames: string[] = [];
        if (container.Mounts) {
          container.Mounts.forEach((mount: any) => {
            if (mount.Type === 'volume' && mount.Name) {
              mountNames.push(mount.Name);
            }
          });
        }

        nodes.push({
          id: containerId,
          type: 'containerNode',
          data: {
            label: containerName,
            state: container.State,
            image: container.Image,
            mounts: mountNames,
          },
          position: { x: COL_CONT, y },
        });

        // Edges: Container -> Network
        if (container.NetworkSettings?.Networks) {
          Object.entries(container.NetworkSettings.Networks).forEach(
            ([, netInfo]: [string, any]) => {
              const netNodeId = networkMap.get(netInfo.NetworkID);
              if (netNodeId) {
                const ip = netInfo.IPAddress || '';
                edges.push({
                  id: `edge-${containerId}-${netNodeId}`,
                  source: containerId,
                  sourceHandle: 'net-out',
                  target: netNodeId,
                  animated: container.State === 'running',
                  label: ip || undefined,
                  style: { stroke: '#6366f1' },
                  labelStyle: { fill: '#a5b4fc', fontSize: 10 },
                });
              }
            },
          );
        }
      });

      // --- Step 5: Create network nodes centered on their container groups ---
      const usedNetY = new Set<number>();

      networks.forEach((net) => {
        const nodeId = `net-${net.Id}`;
        const connectedIds = netContainerIds.get(net.Id) || [];

        // Count containers in this network
        let count = 0;
        containers.forEach((container) => {
          if (container.NetworkSettings?.Networks) {
            Object.values(container.NetworkSettings.Networks).forEach(
              (netInfo: any) => {
                if (netInfo.NetworkID === net.Id) count++;
              },
            );
          }
        });

        // Center network Y on connected containers
        let netY = 0;
        if (connectedIds.length > 0) {
          const ys = connectedIds.map(
            (id) => containerYPositions.get(id) ?? 0,
          );
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          netY = (minY + maxY) / 2;
        } else {
          // Put disconnected networks after the last used Y
          netY = currentY;
          currentY += ROW_GAP;
        }

        nodes.push({
          id: nodeId,
          type: 'networkNode',
          data: {
            label: net.Name,
            driver: net.Driver,
            scope: net.Scope,
            count,
          },
          position: { x: COL_NET, y: netY },
        });
      });

      // --- Step 6: Create volume nodes aligned to connected containers ---
      const volumeList = volumes.Volumes || [];
      const volumeYUsed: number[] = [];

      volumeList.forEach((vol: any) => {
        const volNodeId = `vol-${vol.Name}`;

        // Find all containers that use this volume
        const connectedContainerYs: number[] = [];
        containers.forEach((container) => {
          if (container.Mounts) {
            container.Mounts.forEach((mount: any) => {
              if (mount.Type === 'volume' && mount.Name === vol.Name) {
                const y = containerYPositions.get(container.Id);
                if (y !== undefined) connectedContainerYs.push(y);

                const containerId = `cont-${container.Id}`;
                edges.push({
                  id: `edge-${containerId}-${volNodeId}`,
                  source: containerId,
                  sourceHandle: 'vol-out',
                  target: volNodeId,
                  animated: container.State === 'running',
                  style: { stroke: '#f59e0b' },
                  label: mount.Destination || undefined,
                  labelStyle: { fill: '#fcd34d', fontSize: 10 },
                });
              }
            });
          }
        });

        // Position volume at center of its connected containers, or sequentially
        let volY: number;
        if (connectedContainerYs.length > 0) {
          const minY = Math.min(...connectedContainerYs);
          const maxY = Math.max(...connectedContainerYs);
          volY = (minY + maxY) / 2;
        } else {
          volY = volumeYUsed.length > 0
            ? Math.max(...volumeYUsed) + ROW_GAP
            : currentY;
        }
        volumeYUsed.push(volY);

        nodes.push({
          id: volNodeId,
          type: 'volumeNode',
          data: {
            label: vol.Name,
            driver: vol.Driver,
            mountpoint: vol.Mountpoint,
          },
          position: { x: COL_VOL, y: volY },
        });
      });

      return { nodes, edges };
    } catch (error) {
      console.error('Error fetching docker data', error);
      throw error;
    }
  }
  private async runAlpineCommand(volumeName: string, cmdArray: string[], readOnly: boolean = true): Promise<string> {
    let output = '';
    const outStream = new stream.Writable({
      write(chunk, encoding, callback) {
        output += chunk.toString();
        callback();
      }
    });

    try {
      await this.docker.run('alpine', cmdArray, outStream, {
        Tty: true,
        HostConfig: {
          Binds: [`${volumeName}:/data${readOnly ? ':ro' : ''}`],
          AutoRemove: true
        }
      });
      return output.replace(/\r/g, '');
    } catch (err: any) {
      throw new Error(`Docker run failed: ${err.message}`);
    }
  }

  private async runAlpineContainerCommand(containerId: string, cmdArray: string[]): Promise<string> {
    let output = '';
    const outStream = new stream.Writable({
      write(chunk, encoding, callback) {
        output += chunk.toString();
        callback();
      }
    });

    try {
      await this.docker.run('alpine', cmdArray, outStream, {
        Tty: true,
        HostConfig: {
          PidMode: `container:${containerId}`,
          Privileged: true,
          AutoRemove: true
        }
      });
      return output.replace(/\r/g, '');
    } catch (err: any) {
      throw new Error(`Docker run on container failed: ${err.message}`);
    }
  }

  async listVolumeFiles(volumeName: string, path: string = '') {
    const safePath = path.replace(/(\.\.\/|\.\.\\)/g, '').replace(/^\/+/, '');
    const fullPath = `/data/${safePath}`;
    
    const cmdArray = ['sh', '-c', `find '${fullPath}' -mindepth 1 -maxdepth 1 -exec stat -c '%F|%s|%Y|%n' {} + || true`];
    
    try {
      const stdout = await this.runAlpineCommand(volumeName, cmdArray);
      if (!stdout.trim()) return [];
      
      return stdout.trim().split('\n').map(line => {
        const [type, size, mtime, name] = line.split('|');
        if (!name) return null;
        const basename = name.split('/').pop() || '';
        return {
          type: type === 'directory' ? 'directory' : 'file',
          size: parseInt(size, 10) || 0,
          mtime: parseInt(mtime, 10) * 1000 || 0,
          name: basename,
          path: safePath ? `${safePath}/${basename}` : basename,
        };
      }).filter(Boolean).sort((a: any, b: any) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
    } catch (err: any) {
      throw new Error(`Failed to list directory: ${err.message}`);
    }
  }

  async readVolumeFile(volumeName: string, path: string) {
    const safePath = path.replace(/(\.\.\/|\.\.\\)/g, '').replace(/^\/+/, '');
    const fullPath = `/data/${safePath}`;
    const cmdArray = ['head', '-c', '1048576', fullPath];
    
    try {
      const stdout = await this.runAlpineCommand(volumeName, cmdArray);
      return stdout;
    } catch (err: any) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }

  async writeVolumeFile(volumeName: string, path: string, content: string) {
    const safePath = path.replace(/(\.\.\/|\.\.\\)/g, '').replace(/^\/+/, '');
    const fullPath = `/data/${safePath}`;
    const base64Content = Buffer.from(content).toString('base64');
    const cmdArray = ['sh', '-c', `echo '${base64Content}' | base64 -d > '${fullPath}'`];
    
    try {
      await this.runAlpineCommand(volumeName, cmdArray, false);
    } catch (err: any) {
      throw new Error(`Failed to write file: ${err.message}`);
    }
  }

  async listContainerFiles(containerId: string, path: string = '') {
    const safePath = path.replace(/(\.\.\/|\.\.\\)/g, '').replace(/^\/+/, '');
    const fullPath = `/proc/1/root/${safePath}`;
    
    const cmdArray = ['sh', '-c', `find '${fullPath}' -mindepth 1 -maxdepth 1 -exec stat -c '%F|%s|%Y|%n' {} + || true`];
    
    try {
      const stdout = await this.runAlpineContainerCommand(containerId, cmdArray);
      if (!stdout.trim()) return [];
      
      return stdout.trim().split('\n').map(line => {
        const [type, size, mtime, name] = line.split('|');
        if (!name) return null;
        const basename = name.split('/').pop() || '';
        return {
          type: type === 'directory' ? 'directory' : 'file',
          size: parseInt(size, 10) || 0,
          mtime: parseInt(mtime, 10) * 1000 || 0,
          name: basename,
          path: safePath ? `${safePath}/${basename}` : basename,
        };
      }).filter(Boolean).sort((a: any, b: any) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
    } catch (err: any) {
      throw new Error(`Failed to list container directory: ${err.message}`);
    }
  }

  async readContainerFile(containerId: string, path: string) {
    const safePath = path.replace(/(\.\.\/|\.\.\\)/g, '').replace(/^\/+/, '');
    const fullPath = `/proc/1/root/${safePath}`;
    const cmdArray = ['head', '-c', '1048576', fullPath];
    
    try {
      const stdout = await this.runAlpineContainerCommand(containerId, cmdArray);
      return stdout;
    } catch (err: any) {
      throw new Error(`Failed to read container file: ${err.message}`);
    }
  }

  async writeContainerFile(containerId: string, path: string, content: string) {
    const safePath = path.replace(/(\.\.\/|\.\.\\)/g, '').replace(/^\/+/, '');
    const fullPath = `/proc/1/root/${safePath}`;
    const base64Content = Buffer.from(content).toString('base64');
    const cmdArray = ['sh', '-c', `echo '${base64Content}' | base64 -d > '${fullPath}'`];
    
    try {
      await this.runAlpineContainerCommand(containerId, cmdArray);
    } catch (err: any) {
      throw new Error(`Failed to write container file: ${err.message}`);
    }
  }

  async exportVolumeStream(volumeName: string, res: any) {
    const container = await this.docker.createContainer({
      Image: 'alpine',
      Cmd: ['sleep', '3600'],
      HostConfig: {
        Binds: [`${volumeName}:/data:ro`],
        AutoRemove: true
      }
    });
    
    await container.start();
    
    const archiveStream = await container.getArchive({ path: '/data' });
    const gzip = zlib.createGzip();
    
    archiveStream.pipe(gzip).pipe(res);
    
    const cleanup = () => {
      container.stop().catch(() => {});
    };
    
    archiveStream.on('end', cleanup);
    archiveStream.on('error', cleanup);
    res.on('close', cleanup);
  }
}
