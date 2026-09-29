/**
 * Weather agent — Google ADK (TypeScript) + ArmorIQ.
 * ArmorIQ integration: https://docs.armoriq.ai/sdk/integrations/google-adk
 */

import 'dotenv/config';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import { LlmAgent, InMemoryRunner, MCPToolset } from '@google/adk';
import { ArmorIQADK } from '@armoriq/sdk/dist/integrations/google_adk.js';

for (const key of ['GOOGLE_API_KEY', 'ARMORIQ_API_KEY', 'USER_EMAIL']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} — copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const USER_EMAIL = process.env.USER_EMAIL!;

const weatherTools = new MCPToolset(
  process.env.WEATHER_MCP_URL
    ? {
      type: 'StreamableHTTPConnectionParams',
      url: process.env.WEATHER_MCP_URL,
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

const rootAgent = new LlmAgent({
  name: 'weather_agent',
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  instruction: 'You are a helpful weather assistant. Use your tools to answer; call them directly, do not ask for confirmation yourself.',
  tools: [weatherTools],
});

const runner = new InMemoryRunner({ agent: rootAgent, appName: 'weather-demo' });
const session = await runner.sessionService.createSession({ appName: 'weather-demo', userId: USER_EMAIL });

const armoriq = new ArmorIQADK({ apiKey: process.env.ARMORIQ_API_KEY!, defaultMcpName: 'weather' });

async function ask(userMessage: string): Promise<void> {
  const request = await armoriq.forUser(USER_EMAIL, { goal: userMessage });

  request.install(rootAgent); // enforce allow/hold/block on every tool call this turn
  try {
    for await (const event of runner.runAsync({ userId: USER_EMAIL, sessionId: session.id, newMessage: { parts: [{ text: userMessage }] } })) {
      printEvent(event);
    }
  } finally {
    request.uninstall(rootAgent); // stop enforcing
    await request.close();        // send this turn's record to ArmorIQ
  }
}

function printEvent(event: unknown): void {
  const e = event as { errorMessage?: string; content?: { parts?: Array<{ text?: string }> } };
  if (e.errorMessage) {
    console.error('Model error:', e.errorMessage);
    return;
  }
  for (const part of e.content?.parts ?? []) {
    if (part.text) console.log(part.text);
  }
}

console.log('Weather agent ready. Type a message, or "exit" to quit.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
while (true) {
  const userMessage = await rl.question('> ');
  if (['exit', 'quit'].includes(userMessage.trim().toLowerCase())) break;
  if (!userMessage.trim()) continue;
  try {
    await ask(userMessage);
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
  console.log();
}
rl.close();
await weatherTools.close();
