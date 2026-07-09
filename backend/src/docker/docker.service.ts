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

      const nodes: any[] = [];
      const edges: any[] = [];

      // Map to track which container belongs to which primary network
      const containerPrimaryNet = new Map<string, string>();

      // Pre-calculate containers for each network to determine sizes
      const networkContainers = new Map<string, any[]>();
      networks.forEach(net => networkContainers.set(net.Id, []));

      containers.forEach(container => {
        if (container.NetworkSettings && container.NetworkSettings.Networks) {
          const netNames = Object.keys(container.NetworkSettings.Networks);
          if (netNames.length > 0) {
            const firstNetInfo = container.NetworkSettings.Networks[netNames[0]];
            const primaryNetId = firstNetInfo.NetworkID;
            containerPrimaryNet.set(container.Id, primaryNetId);

            if (networkContainers.has(primaryNetId)) {
              networkContainers.get(primaryNetId)?.push(container);
            }
          }
        }
      });

      let currentNetworkY = 0;

      networks.forEach((net) => {
        const netConts = networkContainers.get(net.Id) || [];
        const count = netConts.length;

        // Grid layout inside the network
        const cols = Math.min(Math.max(1, count), 3); // max 3 columns
        const rows = Math.ceil(count / 3) || 1;

        const netWidth = cols * 360 + 80;
        const netHeight = rows * 200 + 120;

        nodes.push({
          id: `net-${net.Id}`,
          type: 'networkNode',
          data: { label: net.Name, driver: net.Driver, scope: net.Scope, count },
          position: { x: 0, y: currentNetworkY },
          style: { width: netWidth, height: netHeight },
        });

        currentNetworkY += netHeight + 100; // 100px gap between networks
      });

      // Add Container Nodes
      containers.forEach((container) => {
        const containerId = `cont-${container.Id}`;
        const containerName = container.Names[0]?.replace('/', '') || container.Id;
        const primaryNetId = containerPrimaryNet.get(container.Id);

        let position = { x: 0, y: 0 };
        let parentId = undefined;

        if (primaryNetId) {
          parentId = `net-${primaryNetId}`;
          const netConts = networkContainers.get(primaryNetId);
          const index = netConts!.findIndex(c => c.Id === container.Id);
          const col = index % 3;
          const row = Math.floor(index / 3);
          position = { x: col * 350 + 40, y: row * 160 + 80 };
        } else {
          // If no network, put it somewhere outside
          position = { x: -400, y: currentNetworkY };
          currentNetworkY += 150;
        }

        nodes.push({
          id: containerId,
          type: 'containerNode',
          data: { label: containerName, state: container.State, image: container.Image },
          position,
          parentId,
          extent: parentId ? 'parent' : undefined,
        });

        // Add edges for secondary networks (if any)
        if (container.NetworkSettings && container.NetworkSettings.Networks) {
          Object.keys(container.NetworkSettings.Networks).forEach((netName) => {
            const netInfo = container.NetworkSettings.Networks[netName];
            if (netInfo.NetworkID !== primaryNetId) {
              const targetNet = networks.find(n => n.Id === netInfo.NetworkID);
              if (targetNet) {
                edges.push({
                  id: `edge-${containerId}-net-${targetNet.Id}`,
                  source: containerId,
                  target: `net-${targetNet.Id}`,
                  animated: container.State === 'running',
                });
              }
            }
          });
        }
      });

      return { nodes, edges };
    } catch (error) {
      console.error('Error fetching docker data', error);
      throw error;
    }
  }
}
