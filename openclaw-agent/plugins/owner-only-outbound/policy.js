// Pure decision logic for the owner-only outbound guard (no OpenClaw imports; unit-tested).

// "+972 50-123-4567", "972501234567@s.whatsapp.net", "telegram:123", "tg:123" -> digits only
export function normalizeTarget(raw) {
  if (raw === undefined || raw === null) return "";
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/^(telegram|tg|whatsapp|wa):/, "");
  s = s.split("@")[0];       // WhatsApp JID suffix
  s = s.split(":")[0];       // device suffix (972..:12@s.whatsapp.net)
  return s.replace(/[^0-9]/g, "");
}

export function decide(owners, channelId, to) {
  const list = (owners && owners[channelId]) || [];
  const target = normalizeTarget(to);
  if (!target) return { allow: false, reason: "empty-or-malformed-target" };
  if (!list.length) return { allow: false, reason: `no-owner-configured-for-${channelId}` };
  const ok = list.some((o) => normalizeTarget(o) === target);
  return ok ? { allow: true } : { allow: false, reason: "recipient-is-not-the-owner" };
}
