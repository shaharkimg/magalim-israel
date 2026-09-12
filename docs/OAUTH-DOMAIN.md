# עדכון OAuth אחרי מעבר הדומיין

## הדבר הראשון שצריך להבין, כי הוא הופך את רוב המדריכים ברשת ללא-רלוונטיים

‏Google ו-Facebook **לא מפנים חזרה לאתר שלך**. הם מפנים ל-Supabase.

```
האפליקציה  →  Google/Facebook  →  Supabase  →  האפליקציה
                                    ↑              ↑
                          כתובת קבועה         זו שמשתנה
                          שלא משתנה           עם הדומיין
```

הקוד (`app.js`) קורא:

```js
supabase.auth.signInWithOAuth({
  provider,
  options: { redirectTo: location.origin + location.pathname }
})
```

הדפדפן הולך ל-Google, ו-Google מחזיר אותו ל:

```
https://jkyeaewedkzkacjndumd.supabase.co/auth/v1/callback
```

**רק אז** Supabase מפנה לכתובת שב-`redirectTo` — וזו הכתובת שהשתנתה.

### מה זה אומר בפועל

| | משתנה עם הדומיין? |
|---|---|
| **Supabase** ← Redirect URLs | **כן — וזה מה שישבור התחברות אם לא תעדכן** |
| Google ← Authorized redirect URIs | **לא.** מצביע ל-`supabase.co`, ולא נגעת בו |
| Facebook ← Valid OAuth Redirect URIs | **לא.** אותו דבר |
| Google/Facebook ← קישורי מדיניות פרטיות ותנאים | כן, אבל לא שובר התחברות |

> **תיקון:** ב-README כתבתי קודם שצריך לעדכן redirect URIs ב-Google וב-Facebook.
> זה לא נכון בזרימה הזו. ה-redirect URI מצביע ל-Supabase והוא נשאר כפי שהוא.

---

## 1. Supabase — החלק היחיד שחובה

זה מה שישבור התחברות אם תדלג עליו.

**Dashboard** ← הפרויקט ← **Authentication** ← **URL Configuration**

**Site URL:**
```
https://megalim-israel.co.il
```

**Redirect URLs** — להוסיף, **בלי למחוק את הקיימות**:
```
https://megalim-israel.co.il
https://megalim-israel.co.il/**
```

> **להשאיר גם את `https://magalim-israel.vercel.app` ואת `/**` שלה.**
> קישורי הזמנה (`#/invite/<code>`) שכבר נשלחו לאנשים מפנים לשם. מחיקה שוברת אותם,
> ואת זה תגלה רק כשמישהו יתלונן שההזמנה לא עובדת.

**איך לבדוק:** התחברות עם Google מהדומיין החדש. אם אחרי האישור אצל Google אתה נוחת
על שגיאה או חוזר לכתובת הישנה — הכתובת לא ברשימה.

---

## 2. Google Cloud Console

**ה-redirect URI לא משתנה.** כדאי רק לוודא שהוא שם:

**APIs & Services** ← **Credentials** ← ה-OAuth 2.0 Client ID שלך

**Authorized redirect URIs** חייב להכיל:
```
https://jkyeaewedkzkacjndumd.supabase.co/auth/v1/callback
```

**Authorized JavaScript origins** — האפליקציה לא משתמשת ב-Google JS SDK ולא ב-One Tap,
אלא בהפניה מלאה. השדה הזה לא חלק מהזרימה, ואפשר להשאיר אותו ריק.

### מה כן כדאי לעדכן — מסך ההסכמה

**APIs & Services** ← **OAuth consent screen**

- **App name**: `מגלים`
- **Application home page**: `https://megalim-israel.co.il`
- **Privacy policy link**: `https://megalim-israel.co.il/#/privacy-policy`
- **Terms of service link**: `https://megalim-israel.co.il/#/terms`
- **Authorized domains**: להוסיף `megalim-israel.co.il`

זה מה שמשתמש רואה במסך "המשך עם Google". היום כתוב שם `magalim-israel.vercel.app` —
לא שובר כלום, אבל נראה כמו פרויקט צד ולא כמו מוצר.

> **שתי מלכודות:**
> 1. ‏Google עשויה לדרוש **אימות בעלות על הדומיין** (Search Console) לפני שתקבל אותו
>    כ-Authorized domain.
> 2. שינוי פרטים במסך ההסכמה של אפליקציה שכבר **Published** יכול להחזיר אותה לסבב
>    אימות. אם היא במצב **Testing** — אין בעיה.

---

## 3. Facebook App

**Apps** ← האפליקציה ← **Facebook Login** ← **Settings**

**Valid OAuth Redirect URIs** — גם כאן **לא משתנה**, רק לוודא:
```
https://jkyeaewedkzkacjndumd.supabase.co/auth/v1/callback
```

**Settings** ← **Basic**

- **App Domains**: חייב להכיל `supabase.co` — זה הדומיין של ה-redirect בפועל.
  להוסיף גם `megalim-israel.co.il` אם מופיע שם הדומיין הישן.
- **Privacy Policy URL**: `https://megalim-israel.co.il/#/privacy-policy` — **חובה**
  כדי שהאפליקציה תהיה במצב Live
- **Terms of Service URL**: `https://megalim-israel.co.il/#/terms`
- **Display Name**: `מגלים`

---

## סדר הבדיקה

1. הדומיין חי ומגיש את האתר
2. Supabase ← Redirect URLs מעודכן
3. התחברות עם **Google** מהדומיין החדש — צריכה לחזור מחוברת
4. התחברות עם **Facebook** מהדומיין החדש
5. התחברות עם **אימייל וסיסמה** — מוודא שה-Site URL נכון (קישור אימות המייל משתמש בו)
6. פתיחת קישור הזמנה ישן על `vercel.app` — צריך עדיין לעבוד

אם צעד 3 או 4 נכשל, זה כמעט תמיד Supabase Redirect URLs ולא Google/Facebook.

## בדיקה אוטומטית של הצד הפרוס

```bash
node scripts/check_live.js
```

מריצים **ממחשב עם אינטרנט**. בודק שהאתר עונה, שה-manifest זהה לזה שבריפו ולזה שנארז
ל-TWA, ושה-assetlinks מוגש כ-`application/json` עם שם החבילה הנכון. אלה בדיוק הדברים
שנכשלים בשקט אחרי מעבר דומיין. את ההתחברות עצמה הוא לא בודק — זה דורש דפדפן.
