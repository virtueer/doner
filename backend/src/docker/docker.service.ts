import { Injectable } from '@nestjs/common';
import Docker from 'dockerode';
import type { Container } from 'dockerode';

@Injectable()
export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker(); // Defaults to standard socket/pipe
  }

  async getContainerLogsStream(containerId: string): Promise<AsyncIterable<string>> {
    const container: Container = this.docker.getContainer(containerId);
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
      tail: 100,
      timestamps: true,
    });

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

  async getNetworkGraph() {
    try {
      const networks = await this.docker.listNetworks();
      const containers = await this.docker.listContainers({ all: true });
      const volumes = await this.docker.listVolumes();

      const nodes: any[] = [];
      const edges: any[] = [];

      // Layout constants
      const NETWORK_START_X = 0;
      const CONTAINER_START_X = 500;
      const VOLUME_START_X = 1000;
      const Y_SPACING = 180;

      // --- Network Nodes (left column) ---
      const networkMap = new Map<string, string>(); // networkId -> nodeId
      networks.forEach((net, index) => {
        const nodeId = `net-${net.Id}`;
        networkMap.set(net.Id, nodeId);

        // Count containers in this network
        let count = 0;
        containers.forEach((container) => {
          if (container.NetworkSettings?.Networks) {
            Object.values(container.NetworkSettings.Networks).forEach((netInfo: any) => {
              if (netInfo.NetworkID === net.Id) count++;
            });
          }
        });

        nodes.push({
          id: nodeId,
          type: 'networkNode',
          data: {
            label: net.Name,
            driver: net.Driver,
            scope: net.Scope,
            count,
          },
          position: { x: NETWORK_START_X, y: index * Y_SPACING },
        });
      });

      // --- Container Nodes (middle column) ---
      containers.forEach((container, index) => {
        const containerId = `cont-${container.Id}`;
        const containerName =
          container.Names[0]?.replace('/', '') || container.Id;

        // Collect volume mounts for this container
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
          position: { x: CONTAINER_START_X, y: index * Y_SPACING },
        });

        // --- Edges: Container <-> Network ---
        if (container.NetworkSettings?.Networks) {
          Object.entries(container.NetworkSettings.Networks).forEach(
            ([netName, netInfo]: [string, any]) => {
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

      // --- Volume Nodes (right column) ---
      const volumeList = volumes.Volumes || [];
      volumeList.forEach((vol: any, index: number) => {
        const volNodeId = `vol-${vol.Name}`;

        nodes.push({
          id: volNodeId,
          type: 'volumeNode',
          data: {
            label: vol.Name,
            driver: vol.Driver,
            mountpoint: vol.Mountpoint,
          },
          position: { x: VOLUME_START_X, y: index * Y_SPACING },
        });

        // --- Edges: Container <-> Volume ---
        containers.forEach((container) => {
          if (container.Mounts) {
            container.Mounts.forEach((mount: any) => {
              if (mount.Type === 'volume' && mount.Name === vol.Name) {
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
      });

      return { nodes, edges };
    } catch (error) {
      console.error('Error fetching docker data', error);
      throw error;
    }
  }
}
