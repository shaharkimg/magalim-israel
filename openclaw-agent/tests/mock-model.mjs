// Local OpenAI-compatible mock model used ONLY for offline pipeline tests.
// It never calls a real LLM. It records which tools the gateway exposed to the
// model (so tests can assert the security policy) and can emit scripted tool calls.
//
//   node tests/mock-model.mjs [port] [logFile]
//
// Triggers inside the last user message:
//   TEST_WRITE:<path>   -> calls the `write` tool with that path (then replies)
//   anything else       -> replies "MOCK-OK: <message>"
import http from "node:http";
import fs from "node:fs";

const port = Number(process.argv[2] || 18999);
const logFile = process.argv[3] || "/tmp/mock-model.log";
const log = (o) => fs.appendFileSync(logFile, JSON.stringify({ t: new Date().toISOString(), ...o }) + "\n");

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => c.text || "").join("");
  return "";
}

function decide(body) {
  const msgs = body.messages || [];
  const tools = (body.tools || []).map((t) => t.function?.name || t.name);
  const userMsgs = msgs.filter((m) => m.role === "user");
  const lastUser = [...userMsgs].reverse().find((m) => /TEST_|^[^\n]/.test(textOf(m.content)) && !/OpenClaw runtime context/.test(textOf(m.content))) || userMsgs[userMsgs.length - 1];
  const lastMsg = msgs[msgs.length - 1];
  const userText = textOf(lastUser?.content);
  const tzSeen = JSON.stringify(msgs).includes("Asia/Jerusalem");
  log({ kind: "request", tools, tzSeen, lastRole: lastMsg?.role, userText: userText.slice(-200) });

  if (lastMsg?.role === "tool") {
    return { text: `MOCK-TOOL-RESULT: ${textOf(lastMsg.content).slice(0, 2000)}` };
  }
  const sm = userText.match(/TEST_SEARCH:(\S+)/);
  if (sm) {
    const t = (body.tools || []).find((x) => (x.function?.name || x.name) === "tool_search");
    const props = Object.keys(t?.function?.parameters?.properties || {});
    log({ kind: "search_schema", props });
    return { tool: { name: "tool_search", args: { [props.find((k) => /query|q/i.test(k)) || "query"]: sm[1] } } };
  }
  const dm = userText.match(/TEST_DISPATCH:([\w-]+)(?::(\{.*\}))?/);
  if (dm) {
    const t = (body.tools || []).find((x) => (x.function?.name || x.name) === "dispatch_action");
    if (!t) return { text: "MOCK: dispatch_action not available" };
    const props = t.function?.parameters?.properties || {};
    log({ kind: "dispatch_schema", props: Object.keys(props) });
    const nameKey = props.id ? "id" : (Object.keys(props).find((k) => /tool|name|action/i.test(k)) || "tool");
    const argsKey = Object.keys(props).find((k) => /arg|input|param/i.test(k)) || "args";
    const args = { [nameKey]: dm[1], [argsKey]: dm[2] ? JSON.parse(dm[2]) : { command: "id; cat /etc/passwd" } };
    log({ kind: "tool_call", name: "dispatch_action", args });
    return { tool: { name: "dispatch_action", args } };
  }
  const m = userText.match(/TEST_WRITE:(\S+)/);
  if (m) {
    const writeTool = (body.tools || []).find((t) => (t.function?.name || t.name) === "write");
    if (!writeTool) return { text: "MOCK: write tool not available" };
    const props = Object.keys(writeTool.function?.parameters?.properties || {});
    const pathKey = props.find((k) => /path|file/i.test(k)) || "path";
    const contentKey = props.find((k) => /content|text/i.test(k)) || "content";
    log({ kind: "tool_call", name: "write", props });
    return { tool: { name: "write", args: { [pathKey]: m[1], [contentKey]: "- Prefer morning meetings (mock test)\n" } } };
  }
  return { text: `MOCK-OK: ${userText.slice(-120)}` };
}

function sendSSE(res, id, model, d) {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  const chunk = (delta, finish = null) =>
    res.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`);
  if (d.tool) {
    chunk({ role: "assistant", tool_calls: [{ index: 0, id: "call_" + id, type: "function", function: { name: d.tool.name, arguments: JSON.stringify(d.tool.args) } }] });
    chunk({}, "tool_calls");
  } else {
    chunk({ role: "assistant", content: d.text });
    chunk({}, "stop");
  }
  res.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } })}\n\n`);
  res.end("data: [DONE]\n\n");
}

http
  .createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (req.method === "GET" && req.url.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-1", object: "model" }] }));
      }
      if (!req.url.endsWith("/chat/completions")) {
        res.writeHead(404);
        return res.end();
      }
      const body = JSON.parse(raw || "{}");
      const d = decide(body);
      const id = Math.random().toString(36).slice(2, 10);
      if (body.stream) return sendSSE(res, id, body.model, d);
      const message = d.tool
        ? { role: "assistant", content: null, tool_calls: [{ id: "call_" + id, type: "function", function: { name: d.tool.name, arguments: JSON.stringify(d.tool.args) } }] }
        : { role: "assistant", content: d.text };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id, object: "chat.completion", model: body.model, choices: [{ index: 0, message, finish_reason: d.tool ? "tool_calls" : "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }));
    });
  })
  .listen(port, "127.0.0.1", () => log({ kind: "listening", port }));
