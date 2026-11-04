// Unit tests for the owner-only outbound guard policy:  node tests/guard-unit.test.mjs
import { decide } from "../plugins/owner-only-outbound/policy.js";
const owners = { telegram: ["111222333"], whatsapp: ["+972 50-123-4567"] };
const cases = [
  ["telegram", "111222333", true], ["telegram", "telegram:111222333", true], ["telegram", "tg:111222333", true],
  ["telegram", "555666777", false], ["telegram", "-100111222333", false],
  ["whatsapp", "972501234567@s.whatsapp.net", true], ["whatsapp", "+972501234567", true],
  ["whatsapp", "972501234567:3@s.whatsapp.net", true], ["whatsapp", "+972509999999", false],
  ["whatsapp", "120363424282127706@g.us", false],
  ["slack", "111222333", false], ["telegram", "", false], ["telegram", undefined, false], ["whatsapp", "abc", false],
];
let fail = 0;
for (const [ch, to, want] of cases) {
  const got = decide(owners, ch, to).allow;
  if (got !== want) { fail++; console.log(`FAIL ${ch} ${to}: got ${got}, want ${want}`); }
}
if (decide({}, "telegram", "111222333").allow) { fail++; console.log("FAIL: empty owner list must deny"); }
console.log(`guard policy: ${cases.length + 1} cases, ${fail} failures`);
process.exit(fail ? 1 : 0);
