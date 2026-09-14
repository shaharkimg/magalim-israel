-- תיקון: עד עכשיו לא הייתה שום מדיניות DELETE על groups, כלומר קבוצה שנוצרה בטעות
-- נשארה לנצח - לא ניתן היה למחוק אותה לא מהאפליקציה ולא דרך ה-API, גם לא ע"י מי
-- שיצר אותה. התגלה בזמן ניקוי נתוני בדיקה: הקבוצה פשוט לא נמחקה, בלי שגיאה.
--
-- group_members ו-group_destination_votes כבר מוגדרות on delete cascade על group_id,
-- אז מחיקת הקבוצה מנקה את החברויות וההצבעות מאליה - אין צורך בלוגיקת ניקוי בלקוח.
--
-- ההרשאה ניתנת ליוצר בלבד (created_by). זו פעולה הרסנית שמשפיעה על כל חברי הקבוצה,
-- ולכן היא לא נפתחת לכל חבר - חבר שרוצה לצאת כבר יכול למחוק את שורת החברות שלו
-- ("users can leave groups", schema.sql).

drop policy if exists "group owners can delete their group" on public.groups;
create policy "group owners can delete their group"
  on public.groups for delete
  using (created_by = auth.uid());
