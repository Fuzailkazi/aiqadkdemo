# Script — ArmorIQ + Google ADK

Read straight through. `src/agent.ts` on screen the whole time.

---

**Show:**
```typescript
const armoriq = new ArmorIQADK({ apiKey: process.env.ARMORIQ_API_KEY! });
```
**Say:**
> "This sets up ArmorIQ once, when the app starts. Just your API key."

---

**Show:**
```typescript
const request = await armoriq.forUser(USER_EMAIL, { goal: userMessage });
```
**Say:**
> "This line creates a request — who's asking, and what they want. ArmorIQ
> needs that upfront, so every tool call afterward gets checked against it,
> and every decision is attributed to a real person."

---

**Show:**
```typescript
request.install(rootAgent);
```
**Say:**
> "This next line is the important one. Here's what happens every time you
> send a message: Gemini responds — and right after that, ArmorIQ looks at
> what it said. If Gemini wants to call a tool, right before that tool
> runs, ArmorIQ checks it — allow, hold, or block. And right after the tool
> runs, ArmorIQ records what happened.
>
> Google ADK already has those checkpoints built in — before a tool runs,
> and after. This one line just plugs ArmorIQ into them. Nothing about the
> agent or its tools changes."

---

**Show:**
```typescript
request.uninstall(rootAgent);
await request.close();
```
**Say (quick, move on):**
> "And once the message is done, these two just clean up — turn those
> checkpoints back off, and tell ArmorIQ the message is finished."

---

**Say (closing):**
> "That's it. One line, `install`, is what puts ArmorIQ in front of every
> tool call this agent makes."
