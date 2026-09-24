# Weather agent — ArmorIQ demo

A minimal Google ADK (TypeScript) agent, wired to a public weather MCP
server, with ArmorIQ enforcing every tool call.

The whole point of this repo is `src/agent.ts`'s **ArmorIQ** section,
which is copied line-for-line from the official docs:
https://docs.armoriq.ai/sdk/integrations/google-adk

```typescript
import { ArmorIQADK } from '@armoriq/sdk/dist/integrations/google_adk';

// Once per process
const armoriq = new ArmorIQADK({ apiKey: process.env.ARMORIQ_API_KEY! });

// Per-request
const scope = await armoriq.forUser('alice@example.com', { goal: userMessage });
scope.install(rootAgent);
try {
  for await (const event of runner.runAsync(...)) {
    handle(event);
  }
} finally {
  scope.uninstall(rootAgent);
}
```

That's the entire integration, and the code in this repo matches it
exactly. Everything else in the file is just enough ADK to have a real
`rootAgent` and `runner` to hand it — the agent's tools come from a public
weather MCP server, so there's no tool code to write either.

> One addition beyond the doc snippet: `await scope.close()` in the
> `finally` block. It's not in the docs example but is required to flush
> this turn's audit trail — skip it and the request never shows up in the
> ArmorIQ console.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `GOOGLE_API_KEY` — free at https://aistudio.google.com/apikey, no billing account
- `ARMORIQ_API_KEY` — from your ArmorIQ console
- `USER_EMAIL` — your own email; every action gets attributed to it in the console

Before recording, pre-warm the weather MCP so the first run isn't a slow
`npx` download live on camera:

```bash
npx -y @dangahagan/weather-mcp@latest --help
```

Then, in the ArmorIQ console, set a policy that puts
`weather / remove_saved_location` on **hold**, requiring approval. That's
the moment the demo hinges on.

## Run

```bash
npm start
```

## What to show

1. **A plain read — nothing happens.**
   > What's the weather in Tokyo right now?

   Answers normally. ArmorIQ is active but has nothing to gate.

2. **A write — allowed, but audited.**
   > Save Tokyo as a location called home

   Goes through, but now there's an audit record in the console
   attributed to whatever email you set as `USER_EMAIL`.

3. **The held call — the actual demo.**
   > Remove all my saved locations

   The SDK logs the decision to the terminal on its own — no custom code
   needed:
   ```
   [armoriq] HELD weather_remove_saved_location user=you@example.com reason=... — waiting for approval...
   ```
   Switch to the ArmorIQ console — that's where the actual approve/deny
   happens — approve the delegation, and watch the terminal print:
   ```
   [armoriq] APPROVED weather_remove_saved_location user=you@example.com
   ```
   before the call finishes.

## Notes

- The weather MCP (`@dangahagan/weather-mcp`,
  github.com/weather-mcp/weather-mcp) needs no API keys and runs as a
  local subprocess over stdio — nothing to deploy.
- `ENABLED_TOOLS=standard` turns on the saved-location tools; the default
  `basic` preset doesn't include them.
- The MCP toolset is given the prefix `weather`, so tool names arrive as
  `weather_get_forecast`, `weather_remove_saved_location`, etc. — that's
  what makes the ArmorIQ audit log read as `weather / remove_saved_location`
  instead of a bare, unscoped verb.
