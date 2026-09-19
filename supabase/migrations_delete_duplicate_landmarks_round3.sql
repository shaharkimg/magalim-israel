-- הפארק האקולוגי בהוד השרון היה כפול: hod-hasharon-eco-park (המיקום הנכון, אומת מול
-- TomTom - 83 מ' מהמקום האמיתי) מול lm-599d38fe (2.83 ק"מ ממנו, שם כמעט-זהה בלי "ה"
-- הידיעה) - זו השורה שהמשתמש מצא ידנית באפליקציה החיה, לא הייתה בשום migration
-- שמור בריפו (כנראה הוזנה ישירות ל-DB דרך צינור-ייבוא נפרד).
--
-- לבדוק לפני מחיקה בפועל - visits/wishlist קיימים על lm-599d38fe:
-- select count(*) from public.visits where landmark_id = 'lm-599d38fe';

delete from public.landmarks where id = 'lm-599d38fe';
