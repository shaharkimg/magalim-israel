# TEST-REPORT — מה נבדק בפועל

סביבת הבדיקה: קונטיינר ענן זמני, Ubuntu 24.04, Node 24.22.1, OpenClaw 2026.10.10, gog 0.47.1, משתמש `openclaw` ללא root.
תאריך: 2026-11-04. בסביבה זו **אין** systemd, Docker, גישה ל-api.telegram.org או ל-Hetzner, ואין מפתחות אמיתיים. לכן מודל ו-Telegram נבדקו מול שרתים מדומים מקומיים (`tests/mock-*.mjs`), שהם אותם נתיבי קוד של OpenClaw עם endpoint אחר.

## ✅ עבר בפועל — חבילה אוטומטית (`tests/run-local-tests.sh`): 29/29
```
owner-only-outbound policy (15 unit cases)
gateway healthy · gateway bound to loopback only · config valid
agent turn returns model reply · runtime timezone is Asia/Jerusalem · no exec/web/browser/message tools exposed
dispatch exec / web_fetch / browser / gateway / sessions_spawn / message is rejected
write outside workspace blocked · memory write inside workspace
bot is polling · stranger message was delivered · stranger does not reach the model · stranger gets no agent reply · owner gets an agent reply
one-shot automation delivered to owner
guard plugin loaded · scheduled delivery to a third party is blocked · guard blocks an ordinary reply to a non-listed recipient
whatsapp: allowlist = owner only · whatsapp: owner in outbound guard
no plaintext secrets in openclaw.json · security audit: 0 critical · .env is mode 600
```

## 🔴→✅ ממצא אבטחה מהותי שנמצא ותוקן (בעקבות הוספת WhatsApp)
**לפני התיקון**, גם עם נעילת הערוצים לבעלים, הסוכן יכל לשלוח הודעות **לכל נמען**:
1. דרך כלי `message` — נבדק: הודעה נשלחה ל-chat id של צד ג' (555666777).
2. דרך משימה מתוזמנת עם `delivery.to` שרירותי — נבדק: המשימה נוצרה והודעה **נמסרה** לצד ג'.
ב-Telegram הסיכון מוגבל (בוט לא יכול לפנות למי שלא פנה אליו), אבל ב-WhatsApp מספר הסוכן יכול לשלוח לכל מספר — כלומר מייל זדוני (prompt injection) יכל לגרום לסוכן לשלוח מידע פרטי לזרים.
**התיקון** (שתי שכבות): חסימת כלי `message` + פלאגין `owner-only-outbound` (hook רשמי `message_sending`) שמבטל כל משלוח לנמען שאינו הבעלים. אחרי התיקון — שני הניסיונות נחסמו (בדיקה עם ראיה בלוג: `blocked outbound telegram -> 555666777`), והבעלים ממשיך לקבל תשובות ותוצאות משימות. נבדק גם ש-`actions.sendMessage:false` **שובר** תשובות רגילות — לכן לא נבחר.

## WhatsApp — מה נבדק ומה לא
- ✅ פלאגין רשמי `@openclaw/whatsapp@2026.10.10` הותקן ונטען; התצורה: allowlist = המספר האישי בלבד, `selfChatMode:false`, קבוצות מבוטלות, אין שיחות/סקרים; ה-guard מכיל את המספר; משימות לדוגמה והתראות כשל מנותבות ל-WhatsApp.
- ⏳ קישור אמיתי (QR) ושיחה אמיתית — דורש את הטלפון של מספר הסוכן ואת השרת (שרתי WhatsApp חסומים בסביבת הבדיקה, וממילא לא נכון לקשר את המספר לקונטיינר זמני).
- ⚠️ בקרת הגישה הנכנסת של WhatsApp לא נבדקה מול שרת מדומה (אין mock לפרוטוקול WhatsApp Web); היא מבוססת על אותו מנגנון allowlist שנבדק ב-Telegram, וה-guard היוצא נבדק.
- ⚠️ ידוע: הודעת המערכת של pairing ב-Telegram (לפני `agent lock`) לא עוברת דרך ה-guard — הודעה קבועה ללא תוכן סוכן.

## ✅ עבר בפועל — בדיקות ידניות
| בדיקה | תוצאה |
|---|---|
| התקנת OpenClaw מ-npm הרשמי + onboarding לא אינטראקטיבי | ✅ |
| מסלול מודל אמיתי: CLI → gateway → סוכן → מפתח מה-secret store → **api.anthropic.com** | ✅ התקבל 401 `invalid x-api-key` מ-Anthropic (מפתח בדיקה מכוון), fallback ל-Sonnet הופעל, הודעת שגיאה נשלחה למשתמש |
| המפתח לא מופיע בלוג / בקונפיג | ✅ 0 מופעים (נמצא רק ב-SQLite secret store) |
| Telegram במצב pairing: זר מקבל רק user id + קוד, ללא גישה לסוכן | ✅ |
| Restart: משימות, זיכרון, נעילת Telegram, היסטוריית שיחות נשמרו; הבעלים מקבל תשובה אחרי restart | ✅ |
| משימה מתוזמנת חד-פעמית: status ok, delivered לבעלים | ✅ |
| משימות לדוגמה: התקנה כבויה, אידמפוטנטיות (ללא כפילויות), enable/disable | ✅ |
| gog כשרת MCP: `mcp doctor: ok`, הכלים בקטלוג, אין כלי שליחה, תוצאות עטופות `EXTERNAL_UNTRUSTED_CONTENT`, קריאה ללא OAuth מחזירה "OAuth client credentials missing" | ✅ |
| Scopes ב-URL ההרשאה של Google | ✅ gmail.readonly, gmail.compose, calendar.readonly, userinfo.email, openid |
| גיבוי (`openclaw backup create --verify`) + שחזור מלא (נתון שנכתב אחרי הגיבוי נעלם, המצב הקודם נשמר בצד) | ✅ |
| `openclaw security audit` | ✅ 0 critical (warn יחיד: trustedProxies — לא רלוונטי, אין reverse proxy) |
| shellcheck / bash -n לכל הסקריפטים | ✅ (אזהרות false-positive בלבד) |

## ⏳ ממתין לפעולה שלך (ייבדק מיד לאחר מכן)
| בדיקה | חוסם |
|---|---|
| תשובה אמיתית מ-Claude בעברית | מפתח Anthropic |
| Telegram אמיתי מהטלפון + נעילה ל-user id שלך | יצירת בוט ב-BotFather |
| OAuth + קריאת Gmail/Calendar אמיתיים + יצירת טיוטה | OAuth client + אישור בחשבון Google |
| `deploy/install.sh` על שרת אמיתי (systemd, UFW, fail2ban, reboot) | אישור ויצירת שרת Hetzner (בתשלום) |

## ⚠️ לא ניתן לבדוק בסביבה זו
- `install.sh` מקצה לקצה (אין systemd/Docker; NodeSource ו-GitHub releases חסומים ברשת של הסביבה). הסקריפט עבר בדיקת תחביר ו-shellcheck; כל רכיב בו נבדק בנפרד כאן. בהרצה הראשונה על השרת — `tail /var/log/openclaw-install.log`.
- Reboot אמיתי ו-health check עם systemd.

## ממצאים שתוקנו במהלך הבדיקות
1. `tools.profile` ברירת מחדל היה `full` → הוחלף ב-`messaging` + allowlist מצומצם; נוספו ל-deny גם `subagents`, ו-`browser.enabled: false`.
2. Heartbeat כל 30 דקות כברירת מחדל (עלות + פעולה יזומה ללא אישור) → בוטל (`every: "0m"`).
3. החלה חוזרת של התצורה גרמה ל-"flapping" של ערוץ Telegram ול-restart מיותר → התצורה פוצלה כך שכל ערך נכתב פעם אחת בערכו הסופי.
4. נצפה restart פנימי שנתקע (lock של plugin) → מכוסה ע"י `openclaw-health.timer` שמבצע restart מלא לשירות ומתריע ב-Telegram.
5. `update.sh ""` היה משדרג לגרסה האחרונה בטעות → כעת שומר על הגרסה הנוכחית אלא אם צוין `latest` או גרסה.
6. שרת ה-Telegram המדומה אתחל מספור `update_id`/`message_id` בכל הפעלה → OpenClaw (בצדק) זרק הודעות "כפולות" והבדיקות נכשלו/עברו מסיבות שגויות. תוקן (מספור מונוטוני) ונוספו בדיקות שמוודאות שההודעה אכן הגיעה לבוט.
