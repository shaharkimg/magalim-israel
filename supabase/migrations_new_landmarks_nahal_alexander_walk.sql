-- מסלול הליכה נחל אלכסנדר - נקודה שהמשתמש שלח מהשטח כ-Plus Code (9W85+V5C מעברות),
-- פוענח מקומית ל-32.367188, 34.907891 (גישה ל-maps.app.goo.gl חסומה ב-sandbox הזה).
-- היעד הקיים "נחל אלכסנדר וגשר הצבים" (tiuli-102, 32.3867, 34.8916) רחוק ~2.7 ק"מ - קטע
-- אחר של הנחל, לכן נוסף כיעד נפרד. הקרוב ביותר במפה הוא תל חפר (~0.6 ק"מ), אתר שונה.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('nahal-alexander-walk', 'מסלול הליכה נחל אלכסנדר', 'מסלול הליכה לאורך נחל אלכסנדר בעמק חפר, סמוך למעברות.', 'water', 'easy', 'center', 32.367188, 34.907891, 'שעה', 3, 5, true, false, false, true, 'free', null, 1, null)
on conflict (id) do nothing;
