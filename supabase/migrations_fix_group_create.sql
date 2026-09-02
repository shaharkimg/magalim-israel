-- FIX — יצירת קבוצה נשברת: createGroup() ב-app.js עושה insert(...).select().single(),
-- וה-select() דורש RLS SELECT תקין על השורה שהוחזרה. ה-policy "members can view their
-- own circles" (is_group_member(id)) דורשת חברות בקבוצה — אבל ברגע ה-INSERT היוצר עדיין
-- לא רשום כחבר (זה קורה בשאילתה הבאה, group_members.insert). התוצאה: "new row violates
-- row-level security policy for table groups" בכל יצירת קבוצה חדשה, לכל משתמש.
-- זה היה מוסתר עד עכשיו רק כי policy ישנה ("groups are publicly readable", using(true))
-- נשארה פעילה בטעות במקביל — עכשיו שהיא הוסרה (ותיקנו את הפרצה), הבאג האמיתי הזה נחשף.
-- הפתרון: היוצר תמיד רואה קבוצה שהוא יצר, גם לפני שהוא רשום ב-group_members.

drop policy if exists "members can view their own circles" on public.groups;
create policy "members can view their own circles"
  on public.groups for select
  using (public.is_group_member(id) or created_by = auth.uid());
