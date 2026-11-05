// Owner-only outbound guard for a single-owner personal agent.
// Every outbound channel delivery (agent replies, scheduled-task announcements,
// message-tool sends) passes the `message_sending` hook. Anything addressed to a
// recipient that is not in the owner list for that channel is cancelled.
// Fails CLOSED: unknown channel, empty owner list, malformed target or any
// internal error -> cancel.
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { decide, normalizeTarget } from "./policy.js";

const ID = "owner-only-outbound";

export default definePluginEntry({
  id: ID,
  name: "Owner-only outbound guard",
  description: "Cancels outbound messages to anyone but the owner.",
  register(api) {
    const cfg = api.pluginConfig || {};
    const owners = cfg.owners || {};
    const logOnly = cfg.logOnly === true;
    const log = api.logger || console;
    api.on("message_sending", (event, ctx) => {
      try {
        const channelId = ctx?.channelId || "";
        const d = decide(owners, channelId, event?.to);
        if (d.allow) return undefined;
        log.warn?.(`[${ID}] blocked outbound ${channelId} -> ${normalizeTarget(event?.to) || "?"} (${d.reason})`);
        if (logOnly) return undefined;
        return { cancel: true, cancelReason: `${ID}: ${d.reason}` };
      } catch (err) {
        try { log.error?.(`[${ID}] guard error, cancelling: ${err?.message || err}`); } catch {}
        return { cancel: true, cancelReason: `${ID}: guard-error` };
      }
    });
  },
});
