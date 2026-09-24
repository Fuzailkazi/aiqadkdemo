/**
 * Weather agent — Google ADK (TypeScript) + ArmorIQ.
 *
 * The only part that matters for the demo is the "ARMORIQ" section below.
 * Everything else exists just to give ArmorIQ something to protect: an
 * agent, and a set of tools for it to call.
 *
 * Try it once it's running:
 *   "What's the weather in Tokyo right now?"    → plain read, allowed
 *   "Save Tokyo as a location called home"       → write, allowed + audited
 *   "Remove all my saved locations"              → HELD, needs approval
 */

import 'dotenv/config';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import { LlmAgent, InMemoryRunner, MCPToolset } from '@google/adk';
import { ArmorIQADK } from '@armoriq/sdk/dist/integrations/google_adk.js';

// ============================================================
// CONFIG — the three things you need to set, in .env
// ============================================================

for (const key of ['GOOGLE_API_KEY', 'ARMORIQ_API_KEY', 'USER_EMAIL']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} — copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

// Every action this agent takes is attributed to this address in the
// ArmorIQ console. In a real app this would come from your login system —
// here it's just an env var since there's no login screen.
const USER_EMAIL = process.env.USER_EMAIL!;

// ============================================================
// THE AGENT — plain Google ADK, nothing ArmorIQ-specific here
// ============================================================
//
// This section just builds a normal ADK agent so ArmorIQ has something to
// sit in front of. You don't need to understand this deeply — it's boilerplate.

// Its tools come from the weather MCP server whose source lives in
// mcp/weather-mcp/ (a clone of github.com/weather-mcp/weather-mcp; build it
// once with `npm run mcp:build`). Two ways to reach it:
//   - WEATHER_MCP_URL set → connect over HTTP to the MCP service
//     (`npm run mcp:http` locally, or the deployed URL). Use this in deployment.
//   - unset → run the local build as a subprocess and talk to it over
//     stdin/stdout. Handy for local dev, nothing to start first.
const weatherTools = new MCPToolset(
  process.env.WEATHER_MCP_URL
    ? { type: 'StreamableHTTPConnectionParams', url: process.env.WEATHER_MCP_URL }
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

// Runs the agent locally and keeps conversation history in memory — fine
// for a demo, not for production (state is lost when the process exits).
const runner = new InMemoryRunner({ agent: rootAgent, appName: 'weather-demo' });
const session = await runner.sessionService.createSession({ appName: 'weather-demo', userId: USER_EMAIL });

// ============================================================
// ARMORIQ — this is the actual integration. Everything above
// this line exists only to give it an agent to protect.
// Copied from https://docs.armoriq.ai/sdk/integrations/google-adk
// ============================================================

// Built once per process.
const armoriq = new ArmorIQADK({ apiKey: process.env.ARMORIQ_API_KEY!, defaultMcpName: 'weather' });

async function ask(userMessage: string): Promise<void> {
  // A fresh scope per request: it binds this turn to a user (USER_EMAIL)
  // and a stated goal (userMessage). That "goal" is what every tool call
  // gets checked against — it's how ArmorIQ knows the difference between
  // "the agent is doing what was asked" and "the agent went off-script."
  //
  // We don't need to handle allow/hold/block ourselves — the SDK already
  // logs each decision to the console (look for "[armoriq] HELD ...",
  // "[armoriq] APPROVED ...", "[armoriq] BLOCKED ...") once install() is
  // active below. The actual approve/deny action happens on the ArmorIQ
  // platform, not in this terminal.
  const scope = await armoriq.forUser(USER_EMAIL, { goal: userMessage });

  // install() attaches ArmorIQ's checks to the agent's tool calls for this
  // one turn; uninstall() removes them again once the turn is done.
  scope.install(rootAgent);
  try {
    for await (const event of runner.runAsync({ userId: USER_EMAIL, sessionId: session.id, newMessage: { parts: [{ text: userMessage }] } })) {
      printEvent(event);
    }
  } finally {
    scope.uninstall(rootAgent);
    // Flushes this turn's audit trail to the ArmorIQ console. Skip this
    // and the request never shows up there.
    await scope.close();
  }
}

// ============================================================
// OUTPUT + CLI — just for running this as a chat loop in a terminal
// ============================================================

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
