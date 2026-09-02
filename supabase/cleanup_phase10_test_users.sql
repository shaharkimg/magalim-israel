-- ניקוי נתוני בדיקת Phase 10 (משתמשי A/B/C). מחיקה מ-auth.users גוררת cascade לכל מקום
-- שמפנה ל-profiles(id) — profiles/visits/friendships/group_members/groups(created_by)/notifications.
delete from auth.users
where email in ('magalim.testera@gmail.com', 'magalim.testerb@gmail.com', 'magalim.testerc@gmail.com');
