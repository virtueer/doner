import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { DockerService } from './docker.service';
import * as http from 'http';

@WebSocketGateway({ path: '/api/attach' })
export class DockerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private dockerService: DockerService) { }

  async handleConnection(client: WebSocket, request: http.IncomingMessage) {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      const containerId = url.searchParams.get('containerId');
      const shell = url.searchParams.get('shell') || '/bin/sh';

      if (!containerId) {
        client.send('Error: containerId is required\r\n');
        client.close();
        return;
      }

      // We need dockerService to expose the raw docker instance or an attach method.
      // Assuming dockerService.getDocker() is available, or we just add the logic here.
      // Let's call a method on dockerService that returns the exec stream.
      const stream = await this.dockerService.attachToContainer(containerId, shell);

      // Pipe docker output to websocket
      stream.on('data', (chunk) => {
        client.send(chunk.toString('utf-8'));
      });

      // Receive from websocket and write to docker stdin
      client.on('message', (message) => {
        stream.write(message.toString());
      });

      // Handle close
      client.on('close', () => {
        stream.end();
      });

      stream.on('end', () => {
        client.close();
      });

    } catch (error: any) {
      client.send(`Error: ${error.message}\r\n`);
      client.close();
    }
  }

  handleDisconnect(client: WebSocket) {
    // handled in close event listener above
  }
}
