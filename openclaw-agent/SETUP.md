# SETUP — התקנה מאפס

כל ההתקנה, ההקשחה וההגדרות אוטומטיות. הפעולות שמסומנות 👤 דורשות אותך (חשבון, תשלום, OAuth). הכול ביחד כ-20–30 דקות.

## שלב 1 👤 — שרת (Hetzner Cloud, בתשלום, ~€5–6 לחודש)
1. https://console.hetzner.cloud → פרויקט חדש → **Add Server**.
2. Location: Falkenstein / Nuremberg / Helsinki. Image: **Ubuntu 24.04**. Type: **CX23** (2 vCPU, 4GB) או **CAX11** (ARM) — שניהם נתמכים.
3. **SSH key**: הוסיפו את המפתח הציבורי שלכם (`~/.ssh/id_ed25519.pub`; אם אין: `ssh-keygen -t ed25519`). חובה — סיסמאות SSH מבוטלות.
4. **Firewall**: צרו firewall עם כלל נכנס יחיד: TCP 22 (רצוי רק מכתובת ה-IP שלכם). שום פורט אחר.
5. **Cloud config**: הדביקו את כל התוכן של [`deploy/cloud-init.yaml`](deploy/cloud-init.yaml).
6. (מומלץ) סמנו **Backups** (+20% מחיר השרת) — snapshot יומי של כל הדיסק.
7. Create. לאחר ~8 דקות: `ssh root@<IP>` ואז `tail -n 30 /var/log/openclaw-install.log` — אמור להסתיים ב-`OPENCLAW-INSTALL-OK`.

ההתקנה האוטומטית: אזור זמן, עדכוני אבטחה, UFW, fail2ban, הקשחת SSH, Node 24, OpenClaw, gog (עם אימות SHA-256), משתמש `openclaw` ללא root, תצורה מוקשחת, שירות systemd עם הפעלה מחדש אוטומטית, גיבוי יומי ו-health check.

## שלב 2 👤 — מפתח Anthropic
1. https://console.anthropic.com → Billing: הגדירו **Monthly spend limit** (למשל $50).
2. API Keys → Create Key בשם `openclaw-agent`.
3. בשרת: `agent secrets anthropic` → הדביקו (הקלט מוסתר; נשמר ב-secret store של OpenClaw, לא בקבצים ולא בלוג).

## שלב 3 👤 — בוט Telegram
1. ב-Telegram: חפשו **@BotFather** (בדקו שהשם מדויק) → `/newbot` → שם (למשל "העוזר שלי") → username שמסתיים ב-`bot`.
2. מומלץ: `/setjoingroups` → Disable.
3. בשרת: `agent secrets telegram` → הדביקו את ה-token.
4. שלחו לבוט הודעה כלשהי. הוא יענה עם `Your Telegram user id: <מספר>` (בשלב זה זר לא מקבל גישה לסוכן).
5. בשרת: `agent lock <המספר>` — מעכשיו רק אתם. (גם התראות כישלון של משימות יגיעו אליכם.)
6. שלחו "שלום" — הסוכן עונה בעברית.

## שלב 4 👤 — Gmail + Calendar (OAuth)
### 4א. OAuth Client (פעם אחת, חינם)
1. https://console.cloud.google.com → פרויקט חדש `openclaw-agent`.
2. APIs & Services → Library → הפעילו **Gmail API** ו-**Google Calendar API**.
3. OAuth consent screen (Google Auth Platform): External, שם האפליקציה, המייל שלכם; ב-**Audience → Test users** הוסיפו את חשבון ה-Gmail שלכם.
   - הערה: באפליקציה במצב Testing, Google מפקיעה את ההרשאה כל 7 ימים. כדי להימנע: Audience → **Publish app** (לשימוש אישי אין צורך באימות Google; תופיע אזהרת "unverified app" שאותה מאשרים).
4. Clients → Create client → **Desktop app** → Download JSON.
### 4ב. חיבור
```bash
scp client_secret_*.json root@<IP>:/root/cs.json
ssh root@<IP> agent google you@gmail.com /root/cs.json
```
הסקריפט מדפיס קישור → פותחים בדפדפן, מאשרים (קריאת מייל, ניהול טיוטות, קריאת יומן) → הדפדפן יגיע לכתובת `http://127.0.0.1:...` שלא נטענת — **זה תקין**. מעתיקים את הכתובת המלאה מסרגל הכתובות ומדביקים בטרמינל (לא בצ'אט). הסקריפט מאמת קריאת Gmail ו-Calendar ומחבר את הכלים לסוכן. קובץ ה-client נמחק לאחר השימוש.

## שלב 5 👤 — אישור משימות מתוזמנות
```bash
agent templates                          # מתקין 3 משימות לדוגמה — כבויות
agent automations                        # צפייה
agent templates --enable morning-agenda  # 08:00 כל יום: סדר יום
agent templates --enable inbox-replies   # 17:00 א'-ה': מיילים שממתינים לתשובה + משימות ומועדים
agent templates --enable weekly-summary  # 09:00 ביום א': סיכום שבועי
```
אפשר גם פשוט לבקש מהסוכן ב-Telegram ("כל בוקר ב-8 תשלח לי...") — הוא יציג את התוכן ויבקש אישור.

## שלב 6 (אופציונלי) — ממשק ניהול
מהמחשב: `./scripts/tunnel.sh <IP>` → http://127.0.0.1:18789/ . בכניסה ראשונה: `agent dashboard` (קישור עם token), ואז `agent devices list` / `agent devices approve <id>`.
מהטלפון (Android): Termius / JuiceSSH עם Port Forwarding מקומי 18789 → 127.0.0.1:18789, או Tailscale (ראו OPERATIONS.md).

## בדיקה סופית
`agent status` — אמור להראות: Connectivity ok, telegram running, google ok, 0 critical בביקורת האבטחה, גיבוי אחרון.
