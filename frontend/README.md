# Frontend

React app that renders the Docker topology and the panels that open from it —
inspect, logs, terminal, file browser. Talks to the backend over REST, three
Server-Sent Event streams, and one WebSocket.

## Layout

```
src/
  components/
    graph/         React Flow canvas: node types, header, events sheet
    node-details/  the sheet that opens on a node — header, tabs, short info
    file-browser/  listing, context menu, Monaco editor, file operations
    log-viewer/    log stream rendering, shared by the tab and the full page
    common/        dialog, resizable sheet, select, open-in-new-tab
    ui/            shadcn components (Base UI primitives)
  hooks/           topology polling, node search, log stream, sheet resizing
  lib/             API client, log highlighting, ANSI, layout algorithm
```

`App.tsx` picks a screen from the query string: `?logs=`, `?attach=` and
`?files=` render a single full-page view, anything else renders the graph. That
is what the "Open in new tab" buttons link to.

## Node colours

The four node types share one card (`graph/GraphNode.tsx`) and differ only by
accent — `container`, `internal`, `network`, `volume`, `image`, `idle`. Each is
a CSS variable in `index.css`, so `bg-volume/10` and `text-network` work
anywhere. Prefer those tokens over literal colours.

## Commands

```bash
pnpm dev     # Vite dev server on :5173
pnpm build   # tsc -b && vite build
pnpm lint    # biome check --write --unsafe
```

`VITE_API_URL` sets the backend origin at build time (default
`http://localhost:3000`). It is read once in `lib/api.ts`, which also derives
the WebSocket URL.
