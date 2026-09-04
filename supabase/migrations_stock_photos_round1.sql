-- תמונות-מקור (stock photos) מ-Wikimedia Commons בלבד, לפי בקשת המשתמש "תחפש באינטרנט
-- תמונה מכל מסלול/אתר ותוסיף אותה לפירוט שלו כשפותחים אותו במפה" ובחירתו המפורשת
-- "רק Wikimedia Commons" (לא Google Images/תוצאות-חיפוש כלליות) מטעמי זכויות-יוצרים.
--
-- מתודולוגיה לכל יעד: Wikipedia (עברית/אנגלית) → תמונת-האינפובוקס הראשית (או, כשלא הייתה
-- כזו, קטגוריית-Commons/חיפוש-Commons ישיר) → עמוד-הקובץ ב-Commons → אימות ידני של הרישיון
-- (CC-BY / CC-BY-SA / CC0 / Public Domain בלבד - GFDL-בלבד-ללא-CC נפסל) ואימות שהתמונה
-- אכן מתארת את המקום הנכון (לא ניחוש) → כתובת-thumb ברוחב 960px (במקום ה-original
-- הכבד) → קרדיט מדויק לפי דרישת-הרישיון.
--
-- הערה טכנית חשובה: Wikimedia חוסמת (HTTP 400 "Use thumbnail sizes listed...") בקשת-thumb
-- ברוחב שרירותי שלא הופק כבר בעבר - רק סט מצומצם של רחבים "סטנדרטיים" מותר (960px אומת
-- כתקין על כל 24 הקבצים כאן, גם כשגדול מרוחב ה-original - נחתך אוטומטית). נבדק ב-curl
-- ישירות מול upload.wikimedia.org לפני מסירת הקובץ, לא רק בעיון בקוד.
--
-- סבב ראשון: 24 יעדים מתוך רשימת-הפופולריות המובילה (base_visits הגבוה ביותר). המשך
-- לסבבים נוספים בהתאם לרצון המשתמש - יתר 260 היעדים עדיין נופלים בחזרה לאייקון-קטגוריה
-- (או תמונת-צ'ק-אין קהילתית, אם קיימת) בפירוט שלהם עד שיתווספו.

alter table public.landmarks add column if not exists stock_photo_url text;
alter table public.landmarks add column if not exists stock_photo_credit text;

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Israel-2013-Aerial_21-Masada.jpg/960px-Israel-2013-Aerial_21-Masada.jpg',
  stock_photo_credit = 'Andrew Shiva / Wikipedia, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'masada';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Ein_Bokek_-_Dead_Sea2.jpg/960px-Ein_Bokek_-_Dead_Sea2.jpg',
  stock_photo_credit = 'Tiia Monto, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'deadsea';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Kinneret_cropped.jpg/960px-Kinneret_cropped.jpg',
  stock_photo_credit = 'Zachi Evenor & MathKnight, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'kinneret';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/2010-06-18_09-30-17_Israel_Ejn_Gedi_JH_%2852783702009%29.jpg/960px-2010-06-18_09-30-17_Israel_Ejn_Gedi_JH_%2852783702009%29.jpg',
  stock_photo_credit = 'Jan Helebrant, CC0 Public Domain, via Wikimedia Commons'
where id = 'eingedi';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Rosh_Hanikra_in_summer_2011_%282%29.JPG/960px-Rosh_Hanikra_in_summer_2011_%282%29.JPG',
  stock_photo_credit = 'Chmee2, CC BY 3.0, via Wikimedia Commons'
where id = 'roshhanikra';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Caesarea.JPG/960px-Caesarea.JPG',
  stock_photo_credit = 'אסף.צ, Public Domain, via Wikimedia Commons'
where id = 'caesarea';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Safed1.jpg/960px-Safed1.jpg',
  stock_photo_credit = 'Beny Shlevich (Volland), CC BY-SA 3.0, via Wikimedia Commons'
where id = 'tzfat';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/MakhteshRamonMar262022_01.jpg/960px-MakhteshRamonMar262022_01.jpg',
  stock_photo_credit = 'Hagai Agmon-Snir, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'ramoncrater';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Acre_-_Akko_6_-_the_fishing_port_%286658890981%29.jpg/960px-Acre_-_Akko_6_-_the_fishing_port_%286658890981%29.jpg',
  stock_photo_credit = 'israeltourism, CC BY 2.0, via Wikimedia Commons'
where id = 'akko';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/PikiWiki_Israel_15808_Diving_in_Yam_Sof.jpg/960px-PikiWiki_Israel_15808_Diving_in_Yam_Sof.jpg',
  stock_photo_credit = 'חפי רוקח, PikiWiki Israel, Public Domain, via Wikimedia Commons'
where id = 'coralbeach';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/%D7%A0%D7%97%D7%9C_%D7%9E%D7%A2%D7%A8%D7%95%D7%AA_%D7%9E%D7%9E%D7%A2%D7%95%D7%A3_%D7%94%D7%A6%D7%99%D7%A4%D7%95%D7%A8.jpg/960px-%D7%A0%D7%97%D7%9C_%D7%9E%D7%A2%D7%A8%D7%95%D7%AA_%D7%9E%D7%9E%D7%A2%D7%95%D7%A3_%D7%94%D7%A6%D7%99%D7%A4%D7%95%D7%A8.jpg',
  stock_photo_credit = 'Yitzhak Marmelstein, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'nahalmearot';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Hula-national-reserve-steg-a.JPG/960px-Hula-national-reserve-steg-a.JPG',
  stock_photo_credit = 'Mboesch, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'hula';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/140473_ein_avdat_-_view_from_above_PikiWiki_Israel.jpg/960px-140473_ein_avdat_-_view_from_above_PikiWiki_Israel.jpg',
  stock_photo_credit = 'רוני קניגסברג, PikiWiki Israel, CC BY 2.5, via Wikimedia Commons'
where id = 'einavdat';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/A_view_of_the_important_sites_of_the_ancient_City_of_David_02.jpg/960px-A_view_of_the_important_sites_of_the_ancient_City_of_David_02.jpg',
  stock_photo_credit = 'Daniel Ventura, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'cityofdavid';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Tanur_fall.JPG/960px-Tanur_fall.JPG',
  stock_photo_credit = 'Adiel lo, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'tanur';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/117199_gamla_nature_reserve_golan_heights_PikiWiki_Israel.jpg/960px-117199_gamla_nature_reserve_golan_heights_PikiWiki_Israel.jpg',
  stock_photo_credit = 'זאב שטיין, PikiWiki Israel, CC BY 2.5, via Wikimedia Commons'
where id = 'gamla';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/St_Elias_Church_at_the_Muhraka_Monastery_0651.jpg/960px-St_Elias_Church_at_the_Muhraka_Monastery_0651.jpg',
  stock_photo_credit = 'James Emery, CC BY 2.0, via Wikimedia Commons'
where id = 'muhraka';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Nimrod_Fortress_%D7%9E%D7%91%D7%A6%D7%A8_%D7%A0%D7%9E%D7%A8%D7%95%D7%93.jpg/960px-Nimrod_Fortress_%D7%9E%D7%91%D7%A6%D7%A8_%D7%A0%D7%9E%D7%A8%D7%95%D7%93.jpg',
  stock_photo_credit = 'CarmelH1, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'nimrod';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Amud_stream.JPG/960px-Amud_stream.JPG',
  stock_photo_credit = 'Pacman, Public Domain, via Wikimedia Commons'
where id = 'nahalamud';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Aerial_photograph_of_Avdat%2C_Israel%2C_July_2017.jpg/960px-Aerial_photograph_of_Avdat%2C_Israel%2C_July_2017.jpg',
  stock_photo_credit = 'ZeevStein, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'avdat';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Northern_slope_of_Mount_Meron.jpg/960px-Northern_slope_of_Mount_Meron.jpg',
  stock_photo_credit = 'Lior Golgher, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'meron';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Hermonsnow.jpg/960px-Hermonsnow.jpg',
  stock_photo_credit = 'Almog, Public Domain, via Wikimedia Commons'
where id = 'hermon';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Jordan_and_Saudi_Arabia_from_Mt._Tzfachot%2C_July_2013.jpg/960px-Jordan_and_Saudi_Arabia_from_Mt._Tzfachot%2C_July_2013.jpg',
  stock_photo_credit = 'Jizzygizzyfoshizzyyy, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tzefahot';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/2014-06_East_Jerusalem_090_%2814936890061%29.jpg/960px-2014-06_East_Jerusalem_090_%2814936890061%29.jpg',
  stock_photo_credit = 'Edmund Gall, CC BY-SA 2.0, via Wikimedia Commons'
where id = 'oldcityjlm';
