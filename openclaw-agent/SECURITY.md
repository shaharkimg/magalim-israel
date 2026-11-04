# SECURITY — מודל אבטחה

מערכת לאדם אחד (גבול אמון יחיד). העיקרון: גם אם המודל "שוכנע" על ידי תוכן זדוני, אין לו יכולת טכנית לגרום נזק חמור.

## שכבות הגנה

| # | דרישה | מימוש | נבדק |
|---|---|---|---|
| 1 | הרשאות מינימליות | פרופיל `messaging` + רק `read/write/edit` (בתוך ה-workspace בלבד), זיכרון, automations. **אין shell (exec), אין web, אין browser, אין gateway/plugins, אין sub-agents.** | ✅ ניסיון להפעיל exec/web_fetch/browser/gateway נדחה; כתיבה מחוץ ל-workspace נחסמה |
| 2 | אימות זהות (נכנס) | **WhatsApp**: `dmPolicy: allowlist` = המספר האישי שלך בלבד, `selfChatMode: false`, קבוצות מבוטלות. **Telegram**: allowlist עם ה-user id המספרי; לפני הנעילה `pairing` (זר מקבל רק הודעת מערכת עם ה-id שלו, ללא גישה לסוכן) | ✅ Telegram (מול Bot API מדומה); WhatsApp — תצורה נבדקה, קישור אמיתי ממתין |
| 2א | **שליחה רק לבעלים (יוצא)** | שתי שכבות: (1) כלי `message` חסום — לסוכן אין יכולת "לשלוח הודעה לכל מספר"; (2) פלאגין `owner-only-outbound` (hook רשמי `message_sending`) מבטל **כל** משלוח בערוץ לנמען שאינו הבעלים — כולל תשובות ותוצאות משימות מתוזמנות. Fail-closed: אין בעלים מוגדר / שגיאה → חסימה. הקוד ב-`plugins/owner-only-outbound/`, בבעלות root | ✅ נבדק: ניסיון הדלפה דרך משימה מתוזמנת לצד ג' נחסם (לפני התיקון — **עבר**, ראו TEST-REPORT) |
| 3 | ממשק ניהול | מאזין רק ב-127.0.0.1:18789, token auth + אישור מכשיר; גישה רק ב-SSH tunnel. הפורט לא פתוח ב-UFW ולא ב-Hetzner Firewall | ✅ (loopback) |
| 4 | הצפנה בתעבורה | Telegram/Anthropic/Google ב-HTTPS; WhatsApp — הצפנת קצה-לקצה של WhatsApp (Signal protocol); ניהול דרך SSH | — |
| 5 | סודות מחוץ לקוד | API key ו-bot token ב-secret store של OpenClaw (write-only, SQLite); סיסמת keyring של gog ב-`~/.openclaw/.env` (600); refresh token של Google מוצפן ב-keyring של gog. בקונפיג נשמרות רק הפניות (`source: store` / `${VAR}`) | ✅ המפתח לא הופיע בשום לוג/קונפיג |
| 6 | סודות לא ב-Git | הריפו **ציבורי** — אין בו שום סוד או מידע אישי; `.gitignore` חוסם `.env`, `client_secret*.json`, גיבויים | ✅ |
| 7 | ללא root | השירות רץ כמשתמש `openclaw` (systemd user unit). התוכנה וה-kit בבעלות root — הסוכן לא יכול לשנות אותם | — |
| 8 | גיבוי מאובטח | `/var/backups/openclaw` (700), ארכיון מאומת; העתק off-site מוצפן ב-`age` אם הוגדר `AGE_RECIPIENT` | ✅ גיבוי + שחזור |
| 9 | הגבלת פקודות מערכת | `tools.exec.mode: deny` + `group:runtime` ב-deny + `elevated: false` | ✅ |
| 10 | הפרדת הוראות/תוכן | תוצאות Gmail/Calendar עטופות `EXTERNAL_UNTRUSTED_CONTENT` (OpenClaw) + `--wrap-untrusted` (gog) + כללים מפורשים ב-`AGENTS.md` | ✅ העטיפה נראתה בפועל |
| 11 | Prompt Injection | שילוב: מודל חזק (Opus — עמידות גבוהה), אין כלים מסוכנים, אין שליחת מייל, אין web | — |
| 12 | רישום פעולות | `logging.audit` (ledger של runs/tools/messages), journald (חודש, עד 500MB) | — |
| 13 | אישור לפני שינוי | **שליחת מייל לא קיימת טכנית**: gog רץ עם `--gmail-no-send` וללא `--allow-gmail-send`; הכלים החשופים: search/get/thread/labels/drafts בלבד (רשימה סגורה גם ב-`~/.config/gogcli/config.json`). יומן: scope `calendar.readonly` | ✅ חיפוש "send" בקטלוג לא החזיר כלי שליחה |

## WhatsApp — סיכונים ידועים
- **חיבור לא-רשמי**: OpenClaw מתחבר כ-WhatsApp Web (Baileys). זה נוגד את תנאי השימוש של WhatsApp לאוטומציה, ו-Meta עלולה לחסום את **מספר הסוכן**. לכן הסוכן על הסים השני — המספר האישי שלך לא מחובר לשרת ולא בסיכון.
- **פרטי ההתחברות** של מספר הסוכן נשמרים ב-`~/.openclaw/credentials/whatsapp/` (רק המשתמש `openclaw`; נכללים בגיבוי). מי שמשיג אותם יכול לשלוח הודעות בשם מספר הסוכן — לא בשם המספר האישי שלך. ביטול מיידי: בטלפון של מספר הסוכן → Linked devices → Log out.
- **פלאגין רשמי**: `@openclaw/whatsapp` מאותו ריפו ובאותה גרסה כמו OpenClaw (מקובע), ומתעדכן רק דרך `agent update`.
- ידוע: הודעת המערכת של pairing ב-Telegram (לפני `agent lock`) אינה עוברת דרך ה-guard. זו הודעה קבועה ללא תוכן של הסוכן; ב-WhatsApp אין שלב pairing (נעול מראש למספר שלך).

## Scopes של Google (אומת ב-URL ההרשאה)
`gmail.readonly`, `gmail.compose` (ליצירת טיוטות), `calendar.readonly`, `userinfo.email`, `openid`.
> `gmail.compose` מאפשר ברמת Google גם שליחה. החסימה נאכפת ב-gog (`--gmail-no-send`, רשימת כלים סגורה) ובכך שלסוכן אין shell להריץ gog בעצמו. אם תרצה אפס סיכון — הרץ את `google-auth.sh` בלי `--extra-scopes` (קריאה בלבד, ללא טיוטות).

## הרחבת הרשאות בעתיד (רק במכוון)
- יצירת אירועים ביומן: הוספת scope `calendar.events` + כלי כתיבה של gog + כלל אישור ב-AGENTS.md.
- שליחת מייל: `--allow-gmail-send` + אישור exec/approval ב-Telegram. לא מומלץ בשלב זה.
- web_search: הסרה מ-`deny` (מגדיל משטח prompt injection).

## תגובה לאירוע
1. עצירה מיידית של הסוכן: `agent oc gateway stop --force` (או `runuser -u openclaw -- systemctl --user stop openclaw-gateway`).
2. החלפת סודות: WhatsApp → בטלפון של מספר הסוכן: Linked devices → Log out; BotFather → `/revoke`; Anthropic → מחיקת key; Google → https://myaccount.google.com/permissions → הסרת הגישה. ואז `agent secrets` / `agent whatsapp --relink`.
3. `agent audit`, `agent logs 1000`, `agent oc security audit --deep`.
