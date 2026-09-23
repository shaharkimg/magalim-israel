-- עין מגדל - מעיין בפארק המעיינות ליד קיבוץ ניר דוד, בעמק המעיינות. המשתמש ביקש להוסיף אותו
-- מדף הנקודה ב-tiuli.com (points-of-interest/600). tiuli.com חסום ב-egress proxy של ה-sandbox,
-- ולכן הקואורדינטות נמסרו ישירות מהמשתמש: 32°30'12"N 35°27'01"E. התיאור מבוסס על מקורות
-- פתוחים (walla/ynet/baliletayel): אחד משני המעיינות (עם עין חומה) שמזינים את נחל הקיבוצים,
-- מים צלולים בגווני טורקיז בטמפרטורה קבועה של כ-24 מעלות, אסור לינה ויש לצאת עד השקיעה.
-- היה ברשימת data/pending_landmarks.csv - הוסר משם.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('ein-migdal', 'עין מגדל',
   'מעיין צלול במיוחד בגווני טורקיז ליד קיבוץ ניר דוד, שממנו יוצא נחל הקיבוצים - מים בטמפרטורה קבועה של כ-24 מעלות כל השנה, רחצה ומסלול-מים קליל בפארק המעיינות.',
   'water', 'easy', 'north', 32.503333, 35.450278, 'שעה', 1, 300, true, false, false, true, 'free',
   null, 1, null)
on conflict (id) do nothing;
