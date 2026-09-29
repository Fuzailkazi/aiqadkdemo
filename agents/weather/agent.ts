
import 'dotenv/config';
import * as path from 'node:path';
import { LlmAgent, MCPToolset } from '@google/adk';
import { ArmorIQADK } from '@armoriq/sdk/dist/integrations/google_adk.js';

for (const key of ['GOOGLE_API_KEY', 'ARMORIQ_API_KEY', 'USER_EMAIL']) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} — copy .env.example to .env and fill it in.`);
  }
}
const USER_EMAIL = process.env.USER_EMAIL!;

// WEATHER_MCP_URL set → the MCP service over HTTP (npm run mcp:http, or deployed).
// Unset → run the local build in mcp/weather-mcp/ over stdio.
const weatherTools = new MCPToolset(
  process.env.WEATHER_MCP_URL
    ? {
      type: 'StreamableHTTPConnectionParams',
      url: process.env.WEATHER_MCP_URL,
      // Deployed MCP (mcp/weather-mcp/serve.mjs) rejects calls without this token.
      ...(process.env.WEATHER_MCP_TOKEN && {
        transportOptions: { requestInit: { headers: { Authorization: `Bearer ${process.env.WEATHER_MCP_TOKEN}` } } },
      }),
    }
    : {
      type: 'StdioConnectionParams',
      serverParams: {
        command: 'node',
        args: [path.resolve('mcp/weather-mcp/dist/index.js')],
        env: { ...process.env, ENABLED_TOOLS: 'standard' },
      },
    },
);

export const rootAgent = new LlmAgent({
  name: 'weather_agent',
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  instruction: 'You are a helpful weather assistant. Use your tools to answer; call them directly, do not ask for confirmation yourself.',
  tools: [weatherTools],
});

const armoriq = new ArmorIQADK({ apiKey: process.env.ARMORIQ_API_KEY!, defaultMcpName: 'weather' });
const scope = await armoriq.forUser(USER_EMAIL, { goal: 'adk-web-devtools-session' });
scope.install(rootAgent);
