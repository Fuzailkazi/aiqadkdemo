// Public entry point for deploying this MCP as an internet-facing web service
// (e.g. Render's free plan, which has no private networking).
//
// The weather server only speaks stdio, so supergateway turns it into
// Streamable HTTP on an internal port (MCP_INNER_PORT, never exposed by the
// platform — only $PORT is routed publicly). This script sits in front on $PORT
// and lets a request through only if it carries
//   Authorization: Bearer $MCP_AUTH_TOKEN
// Without that check anyone who found the URL could call the tools directly
// and skip the agent (and ArmorIQ) entirely. /healthz stays open so the
// platform's health check works.
//
// Not used for local dev — `npm run mcp:http` from the project root serves
// the same server without a token.

import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const INNER_PORT = Number(process.env.MCP_INNER_PORT || 8081);
const TOKEN = process.env.MCP_AUTH_TOKEN;

if (!TOKEN) {
  console.error('MCP_AUTH_TOKEN is not set; refusing to serve a public MCP without auth.');
  process.exit(1);
}

// Compare fixed-length digests so the check takes the same time whatever the input.
const expected = createHash('sha256').update(`Bearer ${TOKEN}`).digest();
function authorized(header) {
  if (typeof header !== 'string') return false;
  return timingSafeEqual(createHash('sha256').update(header).digest(), expected);
}

const gateway = spawn(
  join(here, 'node_modules', '.bin', 'supergateway'),
  [
    '--stdio', `node ${join(here, 'dist', 'index.js')}`,
    '--outputTransport', 'streamableHttp',
    '--streamableHttpPath', '/mcp',
    '--stateful',
    '--sessionTimeout', '300000',
    '--healthEndpoint', '/healthz',
    '--port', String(INNER_PORT),
  ],
  { stdio: 'inherit' },
);
gateway.on('exit', (code, signal) => {
  console.error(`supergateway exited (${signal ?? code}); shutting down.`);
  process.exit(code ?? 1);
});
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => gateway.kill(sig));
}

const server = http.createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  if (path !== '/healthz' && !authorized(req.headers.authorization)) {
    res.writeHead(401, { 'content-type': 'text/plain', 'www-authenticate': 'Bearer' });
    res.end('Unauthorized');
    return;
  }

  const headers = { ...req.headers };
  delete headers.authorization; // the inner server doesn't need it
  const upstream = http.request(
    { host: '127.0.0.1', port: INNER_PORT, method: req.method, path: req.url, headers },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res); // streams SSE responses through unbuffered
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('MCP server unavailable');
  });
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
});

server.listen(PORT, () => console.error(`Authenticated MCP gateway on :${PORT} → 127.0.0.1:${INNER_PORT}`));
