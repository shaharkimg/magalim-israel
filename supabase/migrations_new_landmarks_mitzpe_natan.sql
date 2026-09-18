-- מצפה נתן - נקודת תצפית עם נדנדת עץ מפורסמת בגבעות המזרחיות של מודיעין, לזכרו של סרן
-- נתן כהן ז"ל שנפל במבצע "צוק איתן". קואורדינטות פוענחו מ-Plus Code שהמשתמש שלח
-- (V2CF+RV8, מודיעין מכבים רעות) - לא מקור-בלוג, כי כל אתרי הטיולים הרלוונטיים חסומים
-- ב-sandbox הזה (baliletayel/amudanan/modiin4u/familytrips/nelech/waze/nominatim - כולם
-- נחסמו ב-egress proxy). מרחק ~2.6 ק"מ מהמרכז הגיאומטרי המשוער של מודיעין, בכיוון
-- דרום-מזרח לעבר הגדר/כביש 443 - תואם את התיאור שנמצא בחיפוש (הגבעות המזרחיות, נגישות
-- הליכה מכיכר השוטר, ~1.5 ק"מ כל כיוון).

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('mitzpe-natan', 'מצפה נתן', 'נקודת תצפית בגבעות המזרחיות של מודיעין עם נדנדת עץ מפורסמת הפונה לעמק איילון והרי יהודה, לזכרו של סרן נתן כהן ז"ל.', 'viewpoints', 'easy', 'center', 31.872037, 35.024703, 'שעה', 3, 5, true, false, false, false, 'free', null, 1, null)
on conflict (id) do nothing;
