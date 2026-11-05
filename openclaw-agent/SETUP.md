# SETUP — התקנה מאפס, בעלות 0 ₪

כל ההתקנה, ההקשחה וההגדרות אוטומטיות. נשארו רק פעולות שדורשות **אותך** (חשבון, סריקת QR, אישור גישה) — מסומנות 👤. סה"כ כ-30–40 דקות, פעם אחת.

## מה עולה כסף? כלום
| רכיב | פתרון | עלות |
|---|---|---|
| שרת 24/7 | Oracle Cloud **Always Free** (ARM, Ubuntu 24.04) | 0 ₪ — כל עוד לא משדרגים ל-Pay As You Go |
| מודל AI | **מנוי Claude הקיים שלך** (Pro/Max) דרך טוקן `setup-token` | 0 ₪ נוסף — נספר במכסת המנוי. חובה: "Extra usage" כבוי |
| חלופה למודל | Google Gemini free tier | 0 ₪ — עם אזהרת פרטיות (ראו למטה) |
| WhatsApp | הסים השני שלך + אפליקציית WhatsApp / WhatsApp Business | 0 ₪ |
| Telegram (אופציונלי) | בוט | 0 ₪ |
| Gmail + Calendar | Google API + פרויקט Google Cloud **ללא חיוב** | 0 ₪ |
| OpenClaw, gog, Claude Code CLI | קוד פתוח / כלי חינמי | 0 ₪ |
| גיבויים | מקומיים בשרת (+ העתק מוצפן אופציונלי) | 0 ₪ |

## שלב 1 👤 — חשבון Oracle Cloud (פעם אחת, ~10 דק')
1. https://www.oracle.com/cloud/free/ → **Start for free**.
2. **Home Region**: מומלץ **Germany Central (Frankfurt)** (יותר זמינות לשרתים החינמיים). אי אפשר לשנות אחר כך.
3. Oracle מבקשת כרטיס אשראי **לאימות זהות בלבד** (חיוב זמני קטן שמבוטל). חשבון Free Tier **לא יכול לחייב** — רק אם תלחץ בעצמך "Upgrade to Pay As You Go". אל תשדרג.

## שלב 2 👤 — יצירת השרת: הדבקה אחת (~2 דק' + ~10 דק' התקנה אוטומטית)
ב-Oracle Console לחץ על אייקון **Cloud Shell** (`>_` למעלה מימין) — טרמינל בדפדפן שכבר מחובר לחשבון שלך — והדבק:
```bash
curl -fsSL https://raw.githubusercontent.com/shaharkimg/magalim-israel/ccr-ce28a98b-d5v973/openclaw-agent/deploy/oci-cloudshell.sh | bash
```
הסקריפט ([`deploy/oci-cloudshell.sh`](deploy/oci-cloudshell.sh)) יוצר לבד, רק משאבי Always Free: רשת + firewall (רק SSH נכנס), שרת `VM.Standard.A1.Flex` **1 OCPU / 4GB** עם Ubuntu 24.04, מפתח SSH (נשמר ב-Cloud Shell), ומפעיל את ההתקנה האוטומטית. אם אין מקום פנוי בשרתים החינמיים ("Out of host capacity") — הוא מנסה את כל אזורי הזמינות במשך 15 דקות; אם עדיין אין, פשוט מריצים שוב מאוחר יותר (הוא ממשיך מאיפה שעצר ולא יוצר כפילויות).

בסוף הוא מדפיס את שתי הפקודות הבאות — מריצים אותן **באותו Cloud Shell** (לא צריך להתקין כלום במחשב):
```bash
ssh -i ~/.ssh/openclaw_agent_ed25519 ubuntu@<IP> 'tail -n 3 /var/log/openclaw-install.log'   # עד OPENCLAW-INSTALL-OK
ssh -t -i ~/.ssh/openclaw_agent_ed25519 ubuntu@<IP> sudo agent setup                           # שלב 4
```
> למה 4GB ולא 24GB: לפי מדיניות Oracle (כפי שמדווחת; הספים השתנו בעבר), שרת חינמי עלול להיעצר אם במשך 7 ימים ה-CPU, הרשת **וגם** הזיכרון נמוכים מ-~20%. הסוכן צורך ~1.2–1.6GB → ב-4GB הזיכרון מעל הסף. אם בכל זאת נעצר: Oracle שולחת מייל, ומפעילים מחדש ב-Console (הנתונים נשמרים).

<details><summary>חלופה ידנית (בלי Cloud Shell)</summary>

☰ → **Compute → Instances → Create instance**: Image **Canonical Ubuntu 24.04** · Shape **Ampere `VM.Standard.A1.Flex`, 1 OCPU, 4 GB** · Networking ברירת מחדל (public IPv4) · SSH keys: "Generate a key pair for me" → Save private key · **Show advanced options → Management → Cloud-init script**: הדבק את [`deploy/cloud-init.yaml`](deploy/cloud-init.yaml) · Create. ואז מהמחשב: `ssh -i ~/Downloads/ssh-key-*.key ubuntu@<IP>`.
</details>

ההתקנה האוטומטית: אזור זמן, עדכוני אבטחה, firewall (של Oracle: רק SSH נכנס), fail2ban, הקשחת SSH, Node 24, OpenClaw, gog, Claude Code CLI, משתמש `openclaw` ללא root, תצורה מוקשחת + guard, שירות systemd עם הפעלה מחדש אוטומטית, גיבוי יומי ו-health check.

## שלב 3 👤 — OAuth client של Google (פעם אחת, ~5 דק', חינם, ללא כרטיס)
1. https://console.cloud.google.com → פרויקט חדש `openclaw-agent` (**אין צורך** להפעיל Billing).
2. APIs & Services → Library → הפעל **Gmail API** ו-**Google Calendar API**.
3. Google Auth Platform → Branding/Audience: External, שם אפליקציה, המייל שלך → **Audience → Publish app** (אחרת Google מנתקת כל 7 ימים; לשימוש אישי לא נדרש אימות — תופיע אזהרת "unverified app" שמאשרים).
4. Clients → Create client → **Desktop app** → **Download JSON**. תצטרך להדביק את תוכנו בשלב הבא.

## שלב 4 👤 — `sudo agent setup` (הכול בפקודה אחת)
מ-Cloud Shell: `ssh -t -i ~/.ssh/openclaw_agent_ed25519 ubuntu@<IP> sudo agent setup` (או מכל טרמינל שמחובר לשרת: `sudo agent setup`). האשף עובר שלב-שלב (אפשר לדלג על כל שלב ולחזור אליו):

1. **מודל AI — מנוי Claude**. לפני כן: claude.ai → Settings → Usage/Billing → ודא ש-**Extra usage כבוי** (כך לעולם אין חיוב נוסף).
   יופיע קישור → פתח בדפדפן שמחובר ל-claude.ai → Authorize → העתק את הקוד שמוצג → הדבק בטרמינל. הטוקן נקלט אוטומטית (תוקף שנה, הרשאה למודל בלבד).
   - אין לך מנוי Pro/Max? בחר **Gemini**: https://aistudio.google.com/apikey → Create API key → הדבק. ⚠️ ב-free tier Google רשאית להשתמש בתוכן (כולל תוכן מיילים שהסוכן קורא) לשיפור מוצרים, ובודקים אנושיים עשויים לקרוא אותו.
2. **WhatsApp** — המספר האישי שלך, ואז סריקת QR מהטלפון של מספר הסוכן (פירוט למטה).
3. **Telegram** — אופציונלי, אפשר לדלג.
4. **Google** — המייל שלך + הדבקת תוכן קובץ ה-JSON משלב 3 → קישור → אישור בדפדפן → הדבקת הכתובת שהדפדפן הגיע אליה (`http://127.0.0.1/...` שלא נטענת — זה תקין).
5. **משימות מתוזמנות** — האשף מציג כל משימה (תוכן + שעה) ושואל אם להפעיל.

בסוף תקבל בוואטסאפ: "✅ העוזר האישי שלך מחובר ופעיל".

### פירוט: WhatsApp — הסוכן על המספר השני שלך
המבנה: **סים 2 = מספר הסוכן**, **סים 1 = המספר האישי שלך**. אתה כותב מהוואטסאפ האישי לצ'אט עם מספר הסוכן, והוא עונה. רק המספר האישי שלך מורשה; הסוכן גם לא יכול לשלוח הודעה לאף מספר אחר (נאכף בשרת).

1. **הפעל WhatsApp על מספר הסוכן (סים 2)** באחת הדרכים:
   - טלפון נוסף עם סים 2 ו-WhatsApp רגיל; או
   - בטלפון Dual-SIM: אפליקציית **WhatsApp Business** (חינם) רשומה על סים 2 לצד WhatsApp הרגיל שלך על סים 1; או
   - WhatsApp ב-Android: ⋮ → Settings → **Add account** (חשבון שני באותה אפליקציה).
   מומלץ: שם פרופיל כמו "העוזר שלי". שמור את מספר הסוכן באנשי הקשר בטלפון האישי.
2. באשף (או `sudo agent whatsapp 050-1234567`) ← **המספר האישי שלך** (סים 1), לא מספר הסוכן.
3. יוצג QR בטרמינל (הגדל את חלון הטרמינל). בטלפון של **מספר הסוכן**: WhatsApp → ⋮ / Settings → **Linked devices → Link a device** → סרוק.

חשוב לדעת:
- השרת מחובר כ"מכשיר מקושר" (WhatsApp Web) של מספר הסוכן. הטלפון של מספר הסוכן צריך להתחבר לאינטרנט מדי פעם (לפחות פעם בשבוע-שבועיים), אחרת WhatsApp מנתק את המכשיר המקושר → `sudo agent whatsapp --relink`.
- זה חיבור לא-רשמי (WhatsApp Web, ספריית Baileys), כמו בכל עוזר AI אישי מבוסס וואטסאפ. Meta עלולה לחסום מספר שמזוהה כאוטומטי. לכן הסוכן על **המספר השני** — המספר האישי שלך לא בסיכון.
- התראות, תוצאות משימות מתוזמנות והתראות תקלה יישלחו אליך בוואטסאפ (לשינוי: `sudo agent channel telegram`).

### פירוט: Telegram (אופציונלי, אפשר במקביל)
1. ב-Telegram: **@BotFather** (בדוק שהשם מדויק) → `/newbot` → שם → username שמסתיים ב-`bot`. מומלץ: `/setjoingroups` → Disable.
2. `sudo agent secrets telegram` → הדבק את ה-token.
3. שלח לבוט הודעה. הוא יחזיר הודעת מערכת עם `Your Telegram user id: <מספר>` (גם ב-`sudo agent pairing`).
4. `sudo agent lock <המספר>`.

## שלב 5 (אופציונלי) — ממשק ניהול
מהמחשב: `./scripts/tunnel.sh ubuntu@<IP>` (או `ssh -i <key> -N -L 18789:127.0.0.1:18789 ubuntu@<IP>`) → http://127.0.0.1:18789/ . בכניסה ראשונה: `sudo agent dashboard`, ואז `sudo agent devices list` / `sudo agent devices approve <id>`.

## בדיקה סופית
`sudo agent status` — Connectivity ok, WhatsApp linked/running, google ok, 0 critical בביקורת האבטחה, גיבוי אחרון.

## חלופה בתשלום (לא נדרשת)
אם Oracle לא זמינה: כל VPS עם Ubuntu 24.04 ו-4GB RAM (למשל Hetzner CX23, ~€5–6 לחודש) — אותו `cloud-init.yaml`, משתמש `root` במקום `ubuntu`. ואם תעדיף חיוב לפי שימוש במקום המנוי: `sudo agent ai apikey`.
