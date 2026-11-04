# סוכן AI אישי מבוסס OpenClaw

סוכן אישי בעברית שזמין 24/7 דרך **WhatsApp** (על מספר נפרד — הסים השני) ו/או Telegram, קורא Gmail (ומכין טיוטות), קורא Google Calendar, זוכר העדפות ומריץ משימות מתוזמנות — על שרת Linux קטן ומאובטח.

| רכיב | מימוש |
|---|---|
| מנוע הסוכן | [OpenClaw](https://github.com/openclaw/openclaw) `2026.10.10` (חבילת npm רשמית), Node.js 24 |
| מודל | Anthropic Claude Opus 5.5 (גיבוי: Sonnet 5.5) — החלפה בפקודה אחת |
| ערוצים | **WhatsApp**: הסוכן על המספר השני (מכשיר מקושר), עונה רק למספר האישי שלך · **Telegram** (אופציונלי): נעול ל-user id שלך. אין פורט פתוח |
| שליחה יוצאת | פלאגין `owner-only-outbound`: כל הודעה שאינה מיועדת לבעלים נחסמת בשרת |
| Gmail + Calendar | [gogcli](https://github.com/openclaw/gogcli) `0.47.1` כשרת MCP טיפוסי — קריאה + טיוטות במייל, קריאה ביומן, **ללא שליחה** |
| זיכרון | קבצי Markdown ב-workspace (`USER.md`, `MEMORY.md`, `memory/*.md`) + חיפוש זיכרון + איחוד לילי |
| תזמון | Automations מובנה של OpenClaw, אזור זמן `Asia/Jerusalem`, נשמר ב-SQLite |
| ממשק ניהול | Control UI המובנה (127.0.0.1:18789) דרך SSH tunnel |
| שרת | Ubuntu 24.04 ב-Hetzner Cloud, systemd, UFW, fail2ban, עדכוני אבטחה אוטומטיים |

## איך מדברים עם הסוכן
מהוואטסאפ האישי שלך פותחים צ'אט עם מספר הסוכן (או את הבוט ב-Telegram) וכותבים בעברית, למשל:
- "מה יש לי היום ביומן?" / "יש התנגשויות השבוע?" / "תציע 3 חלונות פנויים לפגישה של שעה ביום ה'"
- "אילו מיילים מחכים לתשובה ממני?" / "סכם את השרשור עם דני על החוזה"
- "תכין טיוטת תשובה למייל האחרון מרונית, בסגנון שלי" (נוצרת טיוטה ב-Gmail — לא נשלחת)
- "תזכיר לי מחר ב-10:00 לבדוק אם ענו לי על ההצעה"
- "כל בוקר ב-08:00 שלח לי את הפגישות של היום" (הסוכן יציג את התוכן והתדירות ויבקש אישור)
- "זכור שאני מעדיף פגישות בבוקר" / "מה אתה זוכר עליי?" / "תמחק את ההעדפה על הפגישות"

פקודות מובנות (WhatsApp ו-Telegram): `/new` (שיחה חדשה), `/status`, `/models`.

## ניהול (על השרת, כ-root)
```
agent status          # מצב מלא: gateway, ערוצים, Google, משימות, אבטחה, גיבויים, שגיאות
agent logs | follow   # לוגים
agent automations     # משימות מתוזמנות
agent templates       # התקנת משימות לדוגמה (כבויות) ; agent templates --enable morning-agenda
agent model sonnet    # החלפת מודל (opus | sonnet | haiku)
agent backup | restore <file> | update [version]
```
ממשק ניהול גרפי: `scripts/tunnel.sh <server-ip>` מהמחשב → http://127.0.0.1:18789/

## מסמכים
- [SETUP.md](SETUP.md) — התקנה מאפס (כולל מה שרק אתה יכול לבצע)
- [SECURITY.md](SECURITY.md) — מודל האבטחה וההגדרות
- [OPERATIONS.md](OPERATIONS.md) — עדכונים, גיבוי, שחזור, עלויות, תקלות
- [TEST-REPORT.md](TEST-REPORT.md) — מה נבדק בפועל ומה ממתין

## מבנה התיקייה
```
config/      openclaw.base.json5 (תצורה מוקשחת) + patches שמופעלים רק כשהסוד קיים
workspace/   AGENTS.md (כללים), SOUL.md (אישיות), USER.md, MEMORY.md, IDENTITY.md
deploy/      cloud-init.yaml, install.sh, systemd/ (גיבוי יומי, health check)
scripts/     agent (פקודת ניהול), set-secrets, whatsapp-setup, telegram-lock, google-auth, backup, restore, update, status, tunnel
plugins/     owner-only-outbound — חוסם שליחה לכל מי שאינו הבעלים
automations/ install-templates.sh — משימות לדוגמה, נוצרות כבויות
tests/       mock-model.mjs, mock-telegram.mjs, guard-unit.test.mjs, run-local-tests.sh — בדיקות ללא מפתחות
```
תחזוקה עם Claude Code: פתחו את הריפו, בקשו שינוי (למשל "הוסף משימה מתוזמנת" או "שנה הרשאות"), ואז על השרת: `agent update "" <branch>`.
