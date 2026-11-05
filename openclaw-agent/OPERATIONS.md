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

## WhatsApp
- מצב: `agent status` (סעיף Channels) או `agent oc channels status --probe`.
- הטלפון של **מספר הסוכן** צריך להתחבר לאינטרנט מדי פעם; אם WhatsApp ניתק את המכשיר המקושר (או החלפת טלפון): `agent whatsapp --relink` וסריקת QR מחדש.
- החלפת המספר האישי המורשה: `agent whatsapp <מספר-חדש>` (גם מעדכן את ה-guard).
- לאן נשלחות התראות ותוצאות משימות: `agent channel whatsapp` / `agent channel telegram`.
- ניתוק מיידי: בטלפון של מספר הסוכן → Linked devices → Log out (או `agent oc channels logout --channel whatsapp`).
- הודעות קוליות נכנסות: דורשות ספק תמלול (לא מוגדר כרגע).

## גיבוי
- אוטומטי: כל יום 03:30 → `/var/backups/openclaw` (ארכיון OpenClaw מאומת + keyring של gog), שמירה 14 יום.
- ידני: `agent backup`.
- Off-site מוצפן (מומלץ): במחשב שלך `age-keygen -o agent-backup.key` (שמור במקום בטוח!), ואז בשרת
  `echo 'AGE_RECIPIENT=age1...' >> /home/openclaw/.openclaw/.env`. מעכשיו נוצר גם `*.age`; העתקה:
  `scp root@<IP>:/var/backups/openclaw/*.age ./`.
- שכבה נוספת: ב-Oracle Console → Boot volume → Backups. Always Free כולל מספר מוגבל של גיבויי volume — ודא בעמוד ה-Always Free של Oracle שהגיבוי מסומן Always Free לפני שמפעילים.

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

## מודל ועלויות — 0 ₪
| רכיב | עלות | מה לוודא |
|---|---|---|
| מודל — מנוי Claude (`agent ai claude`) | 0 ₪ נוסף | claude.ai → Settings → Usage: **Extra usage כבוי**. השימוש נספר במכסת המנוי שלך (משותף עם השימוש שלך ב-Claude). הגעת למכסה → הסוכן יענה שוב כשהמכסה תתאפס |
| שרת Oracle Always Free | 0 ₪ | לא לשדרג ל-Pay As You Go; לשמור 1 OCPU / 4GB |
| Google APIs, WhatsApp, Telegram, OpenClaw, gog | 0 ₪ | — |

- הטוקן של המנוי בתוקף שנה (נשמר תאריך ב-`.env` כ-`AI_TOKEN_CREATED`). חידוש: `sudo agent ai claude`.
- הגבלת צריכה: `sudo agent model sonnet` חוסך ממכסת המנוי (Opus צורך יותר); המשימות המתוזמנות כבויות עד שאתה מאשר.
- ניטור: Control UI → **Usage** (מכסות המנוי וצריכה לפי שיחה); `sudo agent oc sessions list`.
- מדיניות Anthropic: OpenClaw מציין שהשימוש במנוי דרך `setup-token` "נתמך" ושצוות Anthropic אישר אותו, אך Anthropic יכולה לשנות זאת. אם ייחסם — הסוכן פשוט יפסיק לענות (לא ייווצר חיוב). חלופות: `sudo agent ai gemini` (חינם, אזהרת פרטיות) או `sudo agent ai apikey` (בתשלום לפי שימוש).
- Oracle: אם שרת חינמי נעצר ("reclaimed") — Oracle שולחת מייל; מפעילים אותו מחדש מה-Console (Instance → Start). הנתונים נשמרים.

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
