# Feedback: docs.armoriq.ai/sdk/integrations/google-adk

Every item below is something that actually caused a real bug, a wrong guess, or
lost time while building a reference agent against this exact page — not
speculative nitpicking. Confirmed by re-fetching the live page and cross-checking
against the installed `@armoriq/sdk` package's actual source/types.

---

## 1. `scope.close()` is missing from the minimal example — but required

**What's there now:** the page's own code sample ends with:
```typescript
} finally {
  scope.uninstall(rootAgent);
}
```

**The problem:** copying this exactly (which is the entire point of a docs
sample) gives you an incomplete integration. `close()` finalizes the plan
trace for that turn; skip it and the trace is left "stranded in-flight" per
the SDK's own source comment. Someone following the docs precisely has no way
to know this step exists — it has to be discovered by reading the shipped
`.d.ts`/compiled source, which most integrators won't do.

**Suggested fix:** add it to the sample directly:
```typescript
} finally {
  scope.uninstall(rootAgent);
  await scope.close(); // flushes this turn's trace — required, not optional
}
```

---

## 2. `onEvent` isn't documented at all

**Confirmed absent** from the page (checked explicitly). But it's a real,
typed option on `forUser()`:
```typescript
forUser(userEmail: string, opts?: { goal?: string; onEvent?: OnEvent })
```

**The problem:** without docs, the only way to know it exists is to read the
`.d.ts`. Worse, the *values* it fires (`'hold' | 'approved' | 'block' | 'error'`)
aren't documented anywhere either — I initially guessed `'held'` / `'blocked'`
based on a different, unrelated type (`EnforceResult.action`), shipped that
code, and it silently never fired because the guessed strings didn't match
reality.

**Suggested fix:** a short table:

| `kind` | Fires when |
|---|---|
| `hold` | A tool call is paused pending approval |
| `approved` | A held call was approved and will proceed |
| `block` | A tool call was denied outright |
| `error` | Enforcement itself failed (fails closed) |

---

## 3. The built-in console logging isn't mentioned — leads to redundant code

**The problem:** `install()` makes the SDK log every decision on its own —
`[armoriq] HELD ...`, `[armoriq] APPROVED ...`, `[armoriq] BLOCKED ...` — with
zero extra code. This is genuinely useful and completely undocumented. Not
knowing it existed, I wrote a custom `onEvent` handler to reproduce exactly
this behavior (badly, per point 2), before finding the console.info calls
directly in the source.

**Suggested fix:** one line under "How it works": *"Every allow/hold/block
decision is also logged to the console automatically once `install()` is
active — you don't need to build your own logging for basic visibility."*

---

## 4. No mention of default-deny behavior — this was the single biggest blocker

**The problem:** an org/agent with no policy configured for a given
service gets **every tool call blocked**, including plain reads, with reason
`no_matching_policy`. Nothing on this page (or anywhere I could find) says
"if you haven't set up a policy yet, everything is denied by default." I lost
real time debugging this as if the MCP server itself were broken — it wasn't;
ArmorIQ was blocking the call before it ever reached the tool, and there was
no signal on this page that "no policy" is even a state that produces this
symptom.

**Suggested fix:** an explicit callout, ideally near the top:

> **Before you test this:** ArmorIQ fails closed. If no policy matches a
> tool, that tool is blocked by default (`reason: "no_matching_policy"`),
> even for read-only actions. Set up at least one policy for your MCP's
> tools before expecting any call to succeed.

---

## 5. No guidance for runtimes that don't give you a request loop to wrap

**The problem:** the only documented pattern assumes you own the loop that
calls `runner.runAsync(...)` — fine for a CLI or your own server, but breaks
completely for anything where a framework owns the runner internally (Google's
own `adk web` dev server is a concrete example: it manages sessions and calls
`rootAgent` itself, giving you no `finally` block to hook).

For that shape, ADK exposes `beforeAgentCallback` / `afterAgentCallback` on
the agent config itself — which fire once per turn and carry `context.userId`
/ `context.userContent`, letting you replicate the exact per-request
`install`/`uninstall`/`close` pattern without owning the loop:

```typescript
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
    scope.uninstall(rootAgent);
    await scope.close();
  },
});
```

I had to find `beforeAgentCallback`/`afterAgentCallback` myself by reading
ADK's own type definitions — nothing on this page suggested an alternative
existed for this exact, common shape.

**Suggested fix:** a second example under a heading like "Using a runtime
that owns the agent loop (e.g. `adk web`, a hosted server)" with the pattern
above.

---

## 6. Casing inconsistency between prose and the TypeScript sample

**The problem:** the page's prose describes parameters in snake_case
(`api_key`, `default_mcp_name`, `for_user()`) even in sections that are
clearly TypeScript-relevant, while the actual TS code sample uses camelCase
(`apiKey`, `forUser`). There's no explicit "Python uses X, TypeScript uses Y"
callout — a reader skimming prose and then writing TS can end up typing
`default_mcp_name` into a TypeScript options object and get a silent
type-widening bug (TS objects don't error on unknown keys the way you'd hope
in every config shape) rather than an obvious failure.

**Suggested fix:** either dual-column naming everywhere a parameter is
named, or an explicit note: *"Prose below uses Python's snake_case; the
TypeScript SDK uses camelCase for the same options (`api_key` → `apiKey`,
`default_mcp_name` → `defaultMcpName`)."*

---

## 7. (Minor, arguably out of scope) No note about `@modelcontextprotocol/sdk`

Not an ArmorIQ issue directly, but since this page is likely many
integrators' first time combining Google ADK with MCP tools: `@google/adk`'s
`MCPToolset` requires `@modelcontextprotocol/sdk` as an optional peer
dependency that isn't installed automatically. It fails at runtime, not
install time, with a message that doesn't make clear this only matters if
you're using MCP tools. A one-line footnote (*"Using MCP-backed tools with
ADK also requires `npm install @modelcontextprotocol/sdk`"*) would save
anyone whose weather/GitHub/Stripe MCP example throws this on first run.

---

## Priority, if only fixing a few

1. **#1 (`close()`)** and **#4 (default-deny)** — both caused a broken
   integration or a debugging session that looked like the wrong system was
   at fault. Highest impact, smallest fix.
2. **#2/#3 (`onEvent` + built-in logging)** — caused wrong code to be
   written and shipped silently.
3. **#5 (runtime-owns-the-loop pattern)** — affects anyone not writing a
   bespoke CLI, which is likely a large share of real integrations.
