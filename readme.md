# Docker Network Visualizer

Visualize your Docker networks and containers as an interactive graph. See which containers belong to which networks and how they're connected — all in real time.

## Architecture

```
┌─────────────┐         ┌──────────────┐
│   Frontend   │  HTTP   │   Backend    │
│  React Flow  │◄────────│  NestJS API  │
│   Vite +     │         │  + dockerode │
│  shadcn/ui   │         └──────┬───────┘
└─────────────┘                 │
                        Docker socket
```

- **Backend** — NestJS API that queries the Docker daemon and builds a graph of networks and containers
- **Frontend** — React app using React Flow to render the interactive graph with auto-refresh every 10 seconds

## Prerequisites

- [Node.js](https://nodejs.org) >= 22
- [pnpm](https://pnpm.io) (via corepack)
- [Docker](https://docker.com) (running, with socket accessible)

## Quick Start

```bash
# Install dependencies for all workspaces
pnpm install:all

# Start both backend (port 3000) and frontend (port 5173)
pnpm start
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Development

```bash
# Backend only (watch mode)
cd backend && pnpm dev

# Frontend only (Vite dev server)
cd frontend && pnpm dev
```

## API

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| GET    | `/api/network-graph`  | Returns nodes and edges  |

**Response:**

```json
{
  "nodes": [
    {
      "id": "net-abc123",
      "type": "networkNode",
      "data": { "label": "bridge", "driver": "bridge", "scope": "local", "count": 3 },
      "position": { "x": 0, "y": 0 },
      "style": { "width": 560, "height": 320 }
    },
    {
      "id": "cont-xyz789",
      "type": "containerNode",
      "data": { "label": "my-container", "state": "running", "image": "nginx:latest" },
      "position": { "x": 40, "y": 80 },
      "parentId": "net-abc123",
      "extent": "parent"
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "cont-xyz789", "target": "net-abc123", "animated": true }
  ]
}
```

## Deployment

Both services include Dockerfiles and docker-compose configs for containerized deployment.

### Docker Compose

```bash
# Backend (mounts Docker socket for inspection)
cd backend && docker compose up --build -d

# Frontend (served via Nginx)
cd frontend && docker compose up --build -d
```

### CI/CD

Push-based deployment via [Woodpecker CI](.woodpecker/push.yaml):

- Changes to `frontend/**` → rebuilds and deploys the frontend container
- Changes to `backend/**` → rebuilds and deploys the backend container
- Pipeline status is reported to an n8n webhook

## Tech Stack

| Layer    | Technologies |
|----------|-------------|
| Backend  | NestJS, TypeScript, dockerode |
| Frontend | React 19, Vite, React Flow, Tailwind CSS v4, shadcn/ui, Lucide icons |
| Package  | pnpm workspaces |
| Deploy   | Docker, Nginx, Woodpecker CI |

## License

UNLICENSED
