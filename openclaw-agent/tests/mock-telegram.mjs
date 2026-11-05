// Minimal local Telegram Bot API mock used ONLY for offline access-control tests.
// Point channels.telegram.apiRoot at it. Inject inbound DMs with:
//   curl -s localhost:18998/__inject -d '{"fromId":111,"text":"hi"}'
// Read what the bot sent with:  curl -s localhost:18998/__sent
import http from "node:http";

const port = Number(process.argv[2] || 18998);
// Monotonic across restarts: OpenClaw persists its getUpdates offset.
let updateId = Math.floor(Date.now() / 1000);
let delivered = 0;
// Also monotonic across restarts: OpenClaw de-duplicates inbound (chat, message_id).
let messageId = Math.floor(Date.now() / 100) % 2_000_000_000;
const queue = [];
const sent = [];
const calls = {};

function reply(res, result) {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, result }));
}

function parseBody(req, raw) {
  const ct = req.headers["content-type"] || "";
  if (ct.includes("application/json")) return JSON.parse(raw || "{}");
  if (ct.includes("x-www-form-urlencoded")) return Object.fromEntries(new URLSearchParams(raw));
  try { return JSON.parse(raw || "{}"); } catch { return { raw: raw.slice(0, 500) }; }
}

http
  .createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      if (url.pathname === "/__inject") {
        const { fromId, text } = JSON.parse(raw);
        queue.push({
          update_id: ++updateId,
          message: {
            message_id: ++messageId,
            date: Math.floor(Date.now() / 1000),
            chat: { id: fromId, type: "private", first_name: "T" + fromId },
            from: { id: fromId, is_bot: false, first_name: "T" + fromId, language_code: "he" },
            text,
          },
        });
        return reply(res, { queued: queue.length });
      }
      if (url.pathname === "/__sent") return reply(res, { sent, calls, delivered });
      const m = url.pathname.match(/^\/bot[^/]+\/(\w+)$/);
      if (!m) { res.writeHead(404); return res.end(); }
      const method = m[1];
      calls[method] = (calls[method] || 0) + 1;
      const body = parseBody(req, raw);
      switch (method) {
        case "getMe":
          return reply(res, { id: 999000, is_bot: true, first_name: "TestBot", username: "test_mock_bot", can_join_groups: false, can_read_all_group_messages: false, supports_inline_queries: false });
        case "getUpdates": {
          const offset = Number(body.offset || url.searchParams.get("offset") || 0);
          while (queue.length && queue[0].update_id < offset) queue.shift();
          if (queue.length) { delivered += queue.length; return reply(res, queue.splice(0, queue.length)); }
          return setTimeout(() => reply(res, []), 1000);
        }
        case "sendMessage":
        case "editMessageText":
          sent.push({ method, chat_id: body.chat_id, text: body.text });
          return reply(res, { message_id: ++messageId, date: Math.floor(Date.now() / 1000), chat: { id: Number(body.chat_id), type: "private" }, text: body.text });
        case "getWebhookInfo":
          return reply(res, { url: "", has_custom_certificate: false, pending_update_count: 0 });
        default:
          return reply(res, true);
      }
    });
  })
  .listen(port, "127.0.0.1");
