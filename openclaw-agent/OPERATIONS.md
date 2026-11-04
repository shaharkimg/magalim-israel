# OPERATIONS — תפעול שוטף

כל הפקודות על השרת כ-root (`ssh root@<IP>`).

## מצב ולוגים
```bash
agent status            # תמונת מצב מלאה (ללא סודות)
agent logs 300          # לוג השירות
agent follow            # לוג חי
journalctl -t openclaw-health -t openclaw-backup --since today
```
- השירות `openclaw-gateway` (systemd user, linger) עולה אוטומטית אחרי reboot ומופעל מחדש אחרי קריסה (`Restart=always`).
- `openclaw-health.timer` כל 10 דקות: אם ה-gateway לא עונה → restart + הודעה אליך ב-Telegram; התראה גם כשהדיסק מעל 90%.
- משימה מתוזמנת שנכשלה → הודעה אליך ב-Telegram (`cron.failureAlert`).

## גיבוי
- אוטומטי: כל יום 03:30 → `/var/backups/openclaw` (ארכיון OpenClaw מאומת + keyring של gog), שמירה 14 יום.
- ידני: `agent backup`.
- Off-site מוצפן (מומלץ): במחשב שלך `age-keygen -o agent-backup.key` (שמור במקום בטוח!), ואז בשרת
  `echo 'AGE_RECIPIENT=age1...' >> /home/openclaw/.openclaw/.env`. מעכשיו נוצר גם `*.age`; העתקה:
  `scp root@<IP>:/var/backups/openclaw/*.age ./`.
- שכבה נוספת: Hetzner Backups (snapshot יומי של השרת).

## שחזור
```bash
ls -1t /var/backups/openclaw/ | head
agent restore /var/backups/openclaw/<file>.tar.gz     # המצב הקודם נשמר בצד, לא נמחק
```
שרת חדש מאפס: צור שרת עם cloud-init → העתק את קבצי הגיבוי ל-`/var/backups/openclaw/` (`chown openclaw`) → `agent restore <file>`. אם הגיבוי מוצפן: `age -d -i agent-backup.key -o x.tar.gz x.tar.gz.age`.

## עדכון (מבוקר, עם rollback)
```bash
npm view openclaw dist-tags          # latest / extended-stable / beta
agent update 2026.11.x               # (או: agent update latest) גיבוי → התקנה → doctor → restart → בדיקה → rollback אם נכשל
agent update "" <git-branch>         # עדכון ה-kit (תצורה/סקריפטים) מהריפו בלבד
```
מומלץ לעדכן פעם בחודש לגרסת `extended-stable`/`latest` אחרי קריאת ה-release notes. עדכוני אבטחה של Ubuntu מותקנים אוטומטית (reboot ב-04:30 רק אם נדרש).

## מודל ועלויות
```bash
agent model opus     # ברירת מחדל: הכי עמיד ל-prompt injection, $4/$20 למיליון טוקנים
agent model sonnet   # ~חצי מחיר, $2/$10
```
הערכה (שימוש אישי, ~30 הודעות ביום + 3 משימות יומיות, עם prompt caching):
| | Opus 5.5 | Sonnet 5.5 |
|---|---|---|
| מודל לחודש (הערכה) | ~$60–90 | ~$30–45 |
| שרת Hetzner CX23 | ~€5–6 | ~€5–6 |
| Hetzner Backups (אופציונלי) | ~€1.2 | ~€1.2 |

ניטור צריכה: Control UI → **Usage** (עלות משוערת לפי session); `agent oc sessions list` (טוקנים לשיחה). לחיוב בפועל מ-Anthropic הוסיפו `ANTHROPIC_ADMIN_KEY` ל-`.env`. **הגדירו Spend limit ב-console.anthropic.com.**
Gemini נבדק כחלופה זולה יותר, אך לפי תיעוד OpenClaw עמידותו ל-prompt injection נמוכה משמעותית — לא מומלץ לסוכן שקורא מיילים. החלפה עתידית אפשרית: `agent oc onboard --auth-choice gemini-api-key ...` ואז `agent model google/<model>`.

## משימות מתוזמנות
- מהצ'אט: "תזכיר לי מחר ב-9 ל..." / "כל יום ב-17:00 ..." (הסוכן מאשר איתך תוכן ותדירות).
- מהשרת: `agent automations`, `agent oc automations disable <id>`, `agent oc automations rm <id>`, `agent oc automations runs <id>`.
- נשמרות ב-SQLite ושורדות restart (נבדק).

## זיכרון
בצ'אט: "מה אתה זוכר עליי?", "תמחק את...". בקבצים: `/home/openclaw/.openclaw/workspace/{USER.md,MEMORY.md,memory/}` או Control UI → Settings → Agents → Files. ה-workspace הוא git repo — היסטוריית שינויים זמינה.

## גישה מהטלפון לממשק הניהול (אופציונלי)
Tailscale (חינם לשימוש אישי): `curl -fsSL https://tailscale.com/install.sh | sh && tailscale up` בשרת, אפליקציית Tailscale ב-Android, ואז SSH דרך ה-tailnet. לא לפתוח את 18789 לאינטרנט.

## תקלות נפוצות
| תסמין | בדיקה |
|---|---|
| הבוט לא עונה | `agent status` → Channels; `agent logs`; האם ה-user id נכון (`agent oc config get channels.telegram.allowFrom`) |
| "Couldn't sign in to the AI service" | מפתח Anthropic שגוי/חסום/חריגה מ-spend limit → `agent secrets anthropic` |
| Google: auth_required / invalid_grant | אפליקציית OAuth במצב Testing (פג אחרי 7 ימים) → Publish app והרץ שוב `agent google ...` |
| אבחון כללי | `agent oc doctor`, `agent oc triage` |
