-- תמונות-מקור מ-Wikimedia Commons - סבב שלישי, בהמשך ישיר לסבבים 1-2. אותה מתודולוגיה
-- בדיוק (רישיון+תוכן מאומתים ידנית, רוחב-thumb מאומת ב-curl). 9 יעדים נוספים, כולל 2
-- שימושים-חוזרים נוספים באתר-פיזי-זהה כבר-מאומת (tiuli-42/hermon, tiuli-89/tzfat).
--
-- הערה: 'tiuli-371' (סרטבה) - הקובץ המקורי קטן במיוחד (900x675) ו-thumb ברוחב 900px
-- נחסם ע"י Wikimedia (רק 330px ו-original מותרים לקובץ הזה) - נעשה שימוש בקישור
-- ל-original ישירות (בלי /thumb/), שאומת עובד ב-curl (200, image/jpeg, 334KB - קובץ קטן
-- ואין סיכון-עומס בהגשתו כמו שיש לתמונות-original גדולות בהרבה בשאר הסבבים).

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Hermonsnow.jpg/960px-Hermonsnow.jpg',
  stock_photo_credit = 'Almog, Public Domain, via Wikimedia Commons'
where id = 'tiuli-42';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Safed1.jpg/960px-Safed1.jpg',
  stock_photo_credit = 'Beny Shlevich (Volland), CC BY-SA 3.0, via Wikimedia Commons'
where id = 'tiuli-89';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Banias_Spring_Cliff_Pan%27s_Cave.JPG/960px-Banias_Spring_Cliff_Pan%27s_Cave.JPG',
  stock_photo_credit = 'gugganij, CC BY-SA 2.5, via Wikimedia Commons'
where id = 'tiuli-277';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/2013-Aerial-Mount_of_Olives.jpg/960px-2013-Aerial-Mount_of_Olives.jpg',
  stock_photo_credit = 'Andrew Shiva / Wikipedia, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tiuli-135';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Itzhak_Molcho_square_in_Rehavia.jpg/960px-Itzhak_Molcho_square_in_Rehavia.jpg',
  stock_photo_credit = 'Avi1111 dr. avishai teicher, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tiuli-137';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/123382_jerusalem_nachlaot_neighborhood_PikiWiki_Israel.jpg/960px-123382_jerusalem_nachlaot_neighborhood_PikiWiki_Israel.jpg',
  stock_photo_credit = 'ישראל פרקר, PikiWiki Israel, CC BY 2.5, via Wikimedia Commons'
where id = 'tiuli-134';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/PikiWiki_Israel_56796_tel_yodfat.jpg/960px-PikiWiki_Israel_56796_tel_yodfat.jpg',
  stock_photo_credit = 'דר'' אבישי טייכר, PikiWiki Israel, CC BY 2.5, via Wikimedia Commons'
where id = 'tiuli-40';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Tel_ej-Judeideh_%28Tel_Goded%29_looming_in_distance.jpg/960px-Tel_ej-Judeideh_%28Tel_Goded%29_looming_in_distance.jpg',
  stock_photo_credit = 'Davidbena, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tiuli-324';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/8/88/Sartaba3.jpg',
  stock_photo_credit = 'Tamarah, CC BY 3.0, via Wikimedia Commons'
where id = 'tiuli-371';
