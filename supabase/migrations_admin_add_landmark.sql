-- לוח ניהול: הוספת יעד חדש מתוך האפליקציה (במקום להריץ SQL ידנית ב-Supabase).
-- לטבלת landmarks אין מדיניות insert - כתיבה אפשרית רק דרך הפונקציה הזו (SECURITY DEFINER),
-- שבודקת is_admin *בתוכה*, אותו דפוס כמו get_admin_users_list(). כל השדות מאומתים בשרת
-- (רשימות סגורות לקטגוריה/אזור/קושי, גבולות קואורדינטות של ישראל) - הטופס בלקוח הוא רק נוחות.
-- מחזירה jsonb: {"landmark": {...}} בהצלחה או {"error": "..."} - בלי exception, כדי שהטופס
-- יציג הודעה מדויקת. בטוח להרצה חוזרת.
create or replace function public.admin_add_landmark(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p->>'name', ''));
  v_desc text := btrim(coalesce(p->>'description', ''));
  v_category text := p->>'category';
  v_region text := p->>'region';
  v_difficulty text := coalesce(p->>'difficulty', 'easy');
  v_price text := coalesce(p->>'price_type', 'free');
  v_duration text := nullif(btrim(coalesce(p->>'duration', '')), '');
  v_url text := nullif(btrim(coalesce(p->>'official_url', '')), '');
  v_lat double precision;
  v_lon double precision;
  v_km numeric;
  v_hours numeric;
  v_id text;
  row public.landmarks%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;
  if not coalesce((select pr.is_admin from public.profiles pr where pr.id = auth.uid()), false) then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  begin
    v_lat := (p->>'lat')::double precision;
    v_lon := (p->>'lon')::double precision;
    v_km := coalesce(nullif(p->>'distance_km', '')::numeric, 0);
    v_hours := nullif(p->>'duration_hours', '')::numeric;
  exception when others then
    return jsonb_build_object('error', 'invalid_number');
  end;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    return jsonb_build_object('error', 'invalid_name');
  end if;
  if char_length(v_desc) < 1 or char_length(v_desc) > 600 then
    return jsonb_build_object('error', 'invalid_description');
  end if;
  if v_category is null or v_category not in ('nature','mountains','water','heritage','archaeology',
                                               'viewpoints','religious','parks','reserves','urban') then
    return jsonb_build_object('error', 'invalid_category');
  end if;
  if v_region is null or v_region not in ('north','center','jerusalem','south','deadsea','eilat') then
    return jsonb_build_object('error', 'invalid_region');
  end if;
  if v_difficulty not in ('easy','medium','hard','extreme') then
    return jsonb_build_object('error', 'invalid_difficulty');
  end if;
  if v_price not in ('free','paid') then
    return jsonb_build_object('error', 'invalid_price');
  end if;
  if v_lat is null or v_lon is null or v_lat not between 29 and 34 or v_lon not between 34 and 36 then
    return jsonb_build_object('error', 'invalid_location');
  end if;
  if v_km < 0 or v_km > 200 or (v_hours is not null and (v_hours <= 0 or v_hours > 48)) then
    return jsonb_build_object('error', 'invalid_number');
  end if;
  if v_duration is not null and char_length(v_duration) > 40 then
    return jsonb_build_object('error', 'invalid_duration');
  end if;
  if v_url is not null and (v_url !~* '^https?://[^\s]+$' or char_length(v_url) > 500) then
    return jsonb_build_object('error', 'invalid_url');
  end if;
  if not coalesce((p->>'allow_duplicate_name')::boolean, false)
     and exists (select 1 from public.landmarks l where l.name = v_name) then
    return jsonb_build_object('error', 'name_exists');
  end if;

  v_id := 'adm-' || substr(md5(gen_random_uuid()::text), 1, 10);

  insert into public.landmarks
    (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
     base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
     season, duration_hours, official_url)
  values
    (v_id, v_name, v_desc, v_category, v_difficulty, v_region, v_lat, v_lon,
     coalesce(v_duration, 'שעה'), v_km, 0,
     coalesce((p->>'family_friendly')::boolean, false),
     coalesce((p->>'dog_friendly')::boolean, false),
     coalesce((p->>'accessible')::boolean, false),
     coalesce((p->>'has_water')::boolean, false),
     v_price, null, v_hours, v_url)
  returning * into row;

  return jsonb_build_object('landmark', to_jsonb(row));
end;
$$;

revoke execute on function public.admin_add_landmark(jsonb) from public, anon;
grant execute on function public.admin_add_landmark(jsonb) to authenticated;
