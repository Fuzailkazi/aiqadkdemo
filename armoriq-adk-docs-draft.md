# Google ADK Integration

ArmorIQ sits between a Google ADK agent and its tools. Every tool call the
agent tries to make gets checked against your policy — allow, hold for human
approval, or block — before it runs, and every decision is attributed to a
real user, not a service account. This page covers the TypeScript SDK.

---

## Before you start

Three things need to exist, or the integration will look broken when it
isn't:

1. **An ArmorIQ API key** — from your console.
2. **A working Google ADK agent** — this page assumes you already have a
   `rootAgent` (an `LlmAgent`) and something that runs it (a `Runner`, or a
   framework like `adk web` that runs one for you). If you don't have that
   yet, build it first — ArmorIQ has nothing to attach to otherwise.
3. **At least one policy configured for your tools**, in the ArmorIQ
   console. **This is the step people skip and then get confused by:**
   ArmorIQ fails closed. If no policy matches a tool, that tool is **blocked
   by default** — including plain reads — with reason `no_matching_policy`.
   If you install this integration and every single call gets denied, this
   is almost certainly why. It is not a sign anything is broken.

---

## Install

```bash
npm install @armoriq/sdk
```

---

## The integration: four lines

```typescript
import { ArmorIQADK } from '@armoriq/sdk/dist/integrations/google_adk';

// Built once, when your process starts.
const armoriq = new ArmorIQADK({ apiKey: process.env.ARMORIQ_API_KEY! });

// Built once per request — binds this turn to a user and what they asked for.
const scope = await armoriq.forUser(userEmail, { goal: userMessage });

// Turns enforcement on for this turn.
scope.install(rootAgent);
try {
  for await (const event of runner.runAsync(/* ... */)) {
    handle(event);
  }
} finally {
  // Turns enforcement off, and ships this turn's record to the console.
  // Both matter — skipping close() leaves the trace unfinished.
  scope.uninstall(rootAgent);
  await scope.close();
}
```

No changes to your tools. No changes to your `LlmAgent` definition. Here's
what each line is actually doing:

- **`new ArmorIQADK({ apiKey })`** — a factory, not a per-request object.
  Build it once and reuse it.
- **`armoriq.forUser(userEmail, { goal })`** — mints a *scope*: one tracked
  stretch of activity, tied to one user. `userEmail` is who every decision
  under this scope gets attributed to. `goal` should be **the user's actual
  message this turn** — it's what every tool call gets checked against, so a
  static placeholder here weakens enforcement rather than being a harmless
  shortcut.
- **`scope.install(rootAgent)`** — attaches three callbacks Google ADK
  already exposes on every agent (`afterModelCallback`, `beforeToolCallback`,
  `afterToolCallback`). This is the entire mechanism — ArmorIQ doesn't wrap
  or rewrite your tools, it occupies hooks that were already there.
- **`scope.uninstall(rootAgent)`** — detaches those callbacks. Required if
  you'll call `install()` again later (e.g. the next user's turn) — without
  it, callbacks from multiple scopes stack on top of each other.
- **`scope.close()`** — finalizes this turn's trace on the ArmorIQ backend.
  Individual allow/hold/block decisions are already sent as they happen, but
  skipping `close()` leaves the overall turn's trace looking permanently
  unfinished.

---

## Verify it's wired up, before touching real policies

You don't need a fully configured policy set to confirm `install()` is
doing something. Run any tool call and check your terminal — if enforcement
is active, you'll see one of:

```
[armoriq] ALLOWED <tool> user=<email>
[armoriq] HELD <tool> user=<email> reason=... — waiting for approval...
[armoriq] BLOCKED <tool> user=<email> action=... reason=...
```

**These are logged automatically** the moment `install()` is active — you
do not need to build your own logging to see basic allow/hold/block
visibility. If a call is blocked with `reason=no_matching_policy`, that
confirms the wiring is correct; you just haven't configured a policy for
that tool yet (see "Before you start").

---

## How it works

One ADK turn looks like: *model responds → maybe wants a tool → tool runs →
maybe model responds again.* `install()` plugs into the three points in that
loop:

| ADK callback | Fires when | What ArmorIQ does there |
|---|---|---|
| `afterModelCallback` | Right after the model responds | Builds a plan from any tool calls it wants to make, mints a signed intent token |
| `beforeToolCallback` | Right before a tool actually runs | Checks it against policy — allow, hold, or block |
| `afterToolCallback` | Right after a tool returns | Records the result for audit |

### What `install`/`uninstall`/`close` actually do, mechanically

`rootAgent` is a plain object with three properties — `afterModelCallback`,
`beforeToolCallback`, `afterToolCallback` — that ADK checks and calls every
turn if something is there. Before you install anything, those three are
empty.

**`install(agent)`** does exactly two things: it remembers whatever was
already in those three properties (usually nothing), then overwrites all
three with its own functions. That's the entire mechanism — no hidden state,
no session object living elsewhere. It's the same kind of thing as
`myObject.someProperty = someFunction`.

**`uninstall(agent)`** does the reverse: it writes back whatever `install()`
remembered, restoring the agent to how it was before. `install`/`uninstall`
are a matched pair for this reason — one overwrites, the other restores.

**`close()` is unrelated to both of these.** It never touches `rootAgent` or
its properties at all. It's a network call telling ArmorIQ's backend "this
turn's record is finished, finalize it." `install`/`uninstall` are about
your local agent object; `close()` is about ArmorIQ's remote record of the
turn. They're typically called one after another at the end of a request,
but they are not steps of the same operation.

---

## Observing decisions from your own code

Pass `onEvent` to `forUser()` if you want to react to a decision yourself
(e.g. show a "waiting for approval" state in a UI) instead of relying on the
console logs above:

```typescript
const scope = await armoriq.forUser(userEmail, {
  goal: userMessage,
  onEvent: (kind, payload) => {
    // kind is one of: 'hold' | 'approved' | 'block' | 'error'
    console.log(kind, payload.tool, payload.reason);
  },
});
```

| `kind` | Fires when |
|---|---|
| `hold` | A tool call is paused pending human approval |
| `approved` | A held call was approved and will now proceed |
| `block` | A tool call was denied outright |
| `error` | Enforcement itself failed (fails closed — the tool does not run) |

---

## Using this where you don't own the request loop

The pattern above assumes your own code calls `runner.runAsync(...)` in a
loop you control. Some setups don't give you that — for example, Google's
`adk web` dev server manages its own runner and calls your agent directly,
with no `finally` block available to you.

For that shape, use ADK's own `beforeAgentCallback` / `afterAgentCallback`
on the agent config — these fire once per turn regardless of who's driving
the loop, and carry `context.userId` / `context.userContent`:

```typescript
const activeScopes = new Map<string, ArmorIQADKBundle>();

export const rootAgent = new LlmAgent({
  // ...
  beforeAgentCallback: async (context) => {
    const scope = await armoriq.forUser(context.userId, {
      goal: context.userContent?.parts?.[0]?.text ?? '',
    });
    scope.install(rootAgent);
    activeScopes.set(context.invocationId, scope);
  },
  afterAgentCallback: async (context) => {
    const scope = activeScopes.get(context.invocationId);
    if (!scope) return;
    activeScopes.delete(context.invocationId);
    scope.uninstall(rootAgent);
    await scope.close();
  },
});
```

This gives you the same per-request `install`/`uninstall`/`close` guarantees
as the manual pattern, without needing to own the loop yourself.

---

## Configuration reference

| Option | Default | What it does |
|---|---|---|
| `apiKey` | — (required) | Your ArmorIQ API key |
| `backendEndpoint` | production | Override the control-plane URL |
| `iapEndpoint` | production | Override the IAP URL |
| `proxyEndpoint` | production | Override the proxy URL |
| `useProduction` | `true` | Set `false` for local dev endpoints |
| `defaultMcpName` | — | Fallback service name for tools that can't be auto-mapped from their name |
| `toolNameParser` | built-in | Custom `toolName -> { mcp, action }` mapper |
| `validitySeconds` | `300` | How long a turn's intent token stays valid |
| `mode` | `'sdk'` | `'sdk'` \| `'proxy'` \| `'local'` — see "SDK mode vs proxy mode" below |
| `approvalWaitSeconds` | — | How long to wait for a human to approve a held call before failing closed |
| `approvalPollInterval` | — | Seconds between polls while a call is held |

---

## SDK mode vs proxy mode

By default (`mode: 'sdk'`), your own code still executes tools directly —
ArmorIQ only decides allow/hold/block before that happens. In `'proxy'` mode,
tool execution itself routes through ArmorIQ's proxy (`scope`'s underlying
session exposes `dispatch()` for this). Most integrations should start with
the default `'sdk'` mode; reach for proxy mode when you need enforcement to
hold even for callers that aren't running this SDK.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every tool call is blocked, `reason: no_matching_policy` | No policy configured yet for this service/tool | Add a policy in the ArmorIQ console. See "Before you start." |
| A held call never resolves | No one has approved the delegation in the console | Approve it there, or check `approvalWaitSeconds` isn't too short |
| Nothing appears in the console for a turn | `scope.close()` was never called | Add it to your `finally` block |
| `onEvent` never fires the value you expected | Comparing against a string not in the `kind` table above | Recheck against the real values: `hold`, `approved`, `block`, `error` |
| Using MCP-backed tools with ADK and it throws about `@modelcontextprotocol/sdk` | ADK's `MCPToolset` needs it as a peer dependency | `npm install @modelcontextprotocol/sdk` |

---

## Full example

A complete FastAPI + ADK reference agent, wired to GitHub and Stripe MCPs:
[`sdk-adk-test-agent-py`](https://github.com/armoriq/sdk-adk-test-agent-py).
