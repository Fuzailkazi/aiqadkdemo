# Running this MCP for the ArmorIQ demo

This folder is a clone of [weather-mcp/weather-mcp](https://github.com/weather-mcp/weather-mcp)
(MIT, v1.31.3). Everything upstream is untouched; this file is the only addition.

## Build

```bash
npm run mcp:build        # from the project root (npm ci + tsc in this folder)
```

## Run locally over HTTP

```bash
npm run mcp:http         # from the project root → http://localhost:8080/mcp
curl localhost:8080/healthz   # → ok
```

Then in the project's `.env`:

```
WEATHER_MCP_URL=http://localhost:8080/mcp
```

Leave `WEATHER_MCP_URL` unset and the agent spawns this same build over stdio
instead (`node mcp/weather-mcp/dist/index.js`) — nothing to start first.

## Deploy (Render)

Deployed as the private service `weather-mcp` defined in the project root's
`render.yaml` (native Node runtime, no Docker). Render builds it with
`npm ci && npm run build` in this folder and serves it through supergateway
on Render's private network; the agent service gets its address automatically.

Note: saved locations live in `~/.weather-mcp/locations.json` on the
service's disk, so they reset whenever it restarts or redeploys.
