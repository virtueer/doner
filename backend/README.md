# Backend

NestJS API over the Docker daemon (via `dockerode`). Serves the topology graph,
resource inspection, container lifecycle, file browsing and live log/stat/event
streams consumed by the frontend.

## Layout

```
src/
  common/              SSE helper shared by the streaming endpoints
  docker/
    client/            dockerode handle + pooled alpine helper containers
    topology/          graph endpoint, inspect/delete, and the layout algorithm
      layout/          one module per column: containers, networks, volumes, images
    containers/        start/stop/restart and per-container links
    files/             volume and container file browsing (shared base class)
    streams/           SSE sources for logs, stats and events
    attach/            WebSocket terminal, plus sidecar shell for distroless images
```

Volumes and containers expose the same file API. `DockerFileService` holds the
shared behaviour; the two subclasses only supply a mount root (`/data` vs
`/proc/1/root`) and the kind of helper container to exec in.

## Helper containers

File operations run inside a short-lived `alpine` container that mounts the
target volume, or joins the target container's PID namespace to reach its
filesystem through `/proc/1/root`. They are pooled per target, reused across
requests, and reaped after two minutes idle.

## Commands

```bash
pnpm dev     # watch mode
pnpm build   # compile to dist/
pnpm lint    # biome check --write --unsafe
```

`PORT` overrides the default 3000.
