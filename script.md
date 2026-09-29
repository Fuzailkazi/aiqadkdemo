# Talking points — ArmorIQ + Google ADK

Don't read word for word. Hit these points, in your own words, with
`src/agent.ts` on screen.

1. **One-time setup:** you create ArmorIQ once, with your API key.

2. **Per message:** you tell it who's asking, and what they're asking for.

3. **`install()` — this is the important line, spend most of your time here.**

   Every Google ADK agent already has two built-in moments in its own
   code — a spot that runs **right before** it uses a tool, and a spot that
   runs **right after**. Normally both are empty; nothing happens there.

   `install()` fills those two spots in:
   - **Before** a tool runs, ArmorIQ checks it — allow it, hold it for
     approval, or block it.
   - **After** a tool runs, ArmorIQ records what happened.

   That's the whole integration. Nothing about the agent or its tools
   changes — ArmorIQ is just sitting in two spots that were already there,
   waiting to be used.

4. **`uninstall()` / `close()` — quick, move past this fast:**
   "And once the message is done, these two just clean up — turn those two
   spots back off, and tell ArmorIQ the message is finished." One breath,
   then move on. No need to explain further.

5. **Close:** "That's it. One line, `install()`, is what puts ArmorIQ in
   front of every tool call this agent makes."
