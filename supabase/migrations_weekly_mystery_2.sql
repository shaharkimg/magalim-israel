-- החידה השבועית, סבב 2: תשובות חלופיות + 8 חידות (18.12.2026 - 5.2.2027).
--
-- אותו מקום מופיע לפעמים כמה פעמים בנתונים ("ראש הנקרה" ו"חוף ראש הנקרה", או מסלול שעובר
-- בבניאס). מי שבחר את הרשומה ה"אחרת" של המקום הנכון לא אמור לקבל "לא נכון". לכן לכל חידה
-- יש רשימה מפורשת של תשובות שמתקבלות. בכוונה לא "כל מקום ברדיוס X": ליד גן השלושה, 600 מטר
-- ממנו, נמצא עין מגדל - מקום אחר לגמרי.
-- התשובה שמוחזרת לפותר היא תמיד הקנונית (landmark_id). בטוח להרצה חוזרת.

alter table public.weekly_mysteries
  add column if not exists alt_landmark_ids text[] not null default '{}';

create or replace function public.guess_mystery(p_mystery_id uuid, p_landmark_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.weekly_mysteries%rowtype;
  v_uid uuid := auth.uid();
  v_guesses int;
  v_rank int;
  v_solved_at timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;
  select * into m from public.weekly_mysteries
    where id = p_mystery_id and release_at <= now() and release_at > now() - interval '7 days';
  if not found then
    return jsonb_build_object('error', 'not_active');
  end if;
  perform pg_advisory_xact_lock(hashtext(m.id::text || ':' || v_uid::text));

  select solved_at into v_solved_at from public.mystery_solves where mystery_id = m.id and user_id = v_uid;
  if v_solved_at is not null then
    select count(*) into v_rank from public.mystery_solves where mystery_id = m.id and solved_at <= v_solved_at;
    return jsonb_build_object('correct', true, 'already', true, 'answer', m.landmark_id, 'rank', v_rank);
  end if;

  select count(*) into v_guesses from public.mystery_guesses where mystery_id = m.id and user_id = v_uid;
  if v_guesses >= 8 then
    return jsonb_build_object('error', 'no_guesses_left', 'guesses_left', 0);
  end if;
  insert into public.mystery_guesses (mystery_id, user_id, landmark_id)
    values (m.id, v_uid, left(coalesce(p_landmark_id, ''), 100));

  if p_landmark_id = m.landmark_id or p_landmark_id = any(m.alt_landmark_ids) then
    insert into public.mystery_solves (mystery_id, user_id) values (m.id, v_uid)
      on conflict do nothing
      returning solved_at into v_solved_at;
    select count(*) into v_rank from public.mystery_solves where mystery_id = m.id and solved_at <= v_solved_at;
    return jsonb_build_object('correct', true, 'answer', m.landmark_id, 'rank', v_rank,
      'my_total_solves', (select count(*) from public.mystery_solves where user_id = v_uid));
  end if;
  return jsonb_build_object('correct', false, 'guesses_left', 8 - v_guesses - 1);
end;
$$;
revoke execute on function public.guess_mystery(uuid, text) from public, anon;
grant execute on function public.guess_mystery(uuid, text) to authenticated;

-- תשובות חלופיות ל-4 החידות של הסבב הראשון (רק יעדים שקיימים, ורק לחידה שעוד לא פורסמה)
update public.weekly_mysteries m
   set alt_landmark_ids = array(select l.id from public.landmarks l where l.id = any(a.alts))
  from (values
    ('roshhanikra',     array['xlsx-117','tiuli-11']),
    ('stalactite-cave', array['tiuli-59']),
    ('einavdat',        array['tiuli-76'])
  ) as a(answer, alts)
 where m.landmark_id = a.answer and m.release_at > now();

-- 8 חידות חדשות. העיגול על המפה: מרכז מוזז אקראית עד 9 ק"מ מהמקום (כמו admin_save_mystery).
-- מוכנסות רק אם היעד קיים, ולא דורסות חידה שכבר נקבעה לאותו שישי.
insert into public.weekly_mysteries (landmark_id, alt_landmark_ids, release_at, riddle, hint, area_lat, area_lon)
select s.answer,
       array(select l2.id from public.landmarks l2 where l2.id = any(s.alts)),
       (s.d + time '08:00') at time zone 'Asia/Jerusalem', s.riddle, s.hint,
       l.lat + (r.dist * cos(r.ang)) / 111.0,
       l.lon + (r.dist * sin(r.ang)) / (111.0 * cos(radians(l.lat)))
from (values
  ('agmon-hula', array['lm-d2f9fc1f','hula'], date '2026-12-18',
   'עשרות אלפי אורחים מאירופה מגיעים לכאן כל חורף, ובבוקר שומעים אותם לפני שרואים אותם. פעם היה כאן אגם שיובש, וחלק ממנו הוצף מחדש.',
   'בעמק בצפון, בין רמת הגולן להרי נפתלי.'),
  ('caesarea', array['tiuli-44'], date '2026-12-25',
   'מלך בנה כאן נמל באמצע הים בלי שום מפרץ טבעי, והקהל ישב בתיאטרון מול השקיעה.',
   'על חוף הים, בין חדרה לזכרון יעקב.'),
  ('tel-dan-reserve', array['tiuli-49'], date '2027-01-01',
   'שער עשוי לבני בוץ עומד כאן כבר כמעט 4,000 שנה, ומעיין שופע מזין את אחד ממקורות הירדן.',
   'בפינה הצפונית ביותר של עמק החולה, ממש ליד הגבול.'),
  ('makhtesh-gadol', array[]::text[], date '2027-01-08',
   'השם שלו אומר שהוא הגדול, אבל יש לו אח גדול ממנו. ממלאים כאן בקבוקים בחול בכל צבעי הקשת.',
   'בנגב, לא רחוק מירוחם.'),
  ('nahalamud', array['xlsx-152','tiuli-48'], date '2027-01-15',
   'הנחל קיבל את שמו מעמוד סלע בודד שעומד לצד השביל, והמים שלו יורדים מהרי הגליל עד לכנרת.',
   'בגליל העליון, בין צפת לכנרת.'),
  ('nahaldavid', array['eingedi','tiuli-32'], date '2027-01-22',
   'מלך צעיר הסתתר כאן פעם, והיום מפל נושא את שמו. היעלים מסתובבים בין המטיילים כאילו המקום שלהם.',
   'על חוף ים המלח, בשמורה מלאה מעיינות.'),
  ('lm-00a8fe51', array['tiuli-277','tiuli-49','tiuli-370'], date '2027-01-29',
   'המפל השוצף ביותר בארץ, ושם המקום הגיע מאל יווני של יערות וחליל.',
   'למרגלות החרמון.'),
  ('masada', array[]::text[], date '2027-02-05',
   'מלך בנה כאן ארמון תלוי על צוק, מעל המקום הנמוך בעולם. עולים בשביל הנחש או ברכבל.',
   'על חוף ים המלח, בין עין גדי לעין בוקק.')
) as s(answer, alts, d, riddle, hint)
join public.landmarks l on l.id = s.answer
-- מתייחס ל-s.d כדי שיחושב לכל שורה בנפרד (תת-שאילתה בלי תלות בשורה עלולה לרוץ פעם אחת)
cross join lateral (select random() * 2 * pi() + 0 * extract(epoch from s.d) as ang, sqrt(random()) * 9 as dist) r
on conflict (release_at) do nothing;
