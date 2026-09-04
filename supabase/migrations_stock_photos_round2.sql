-- תמונות-מקור מ-Wikimedia Commons - סבב שני, בהמשך ישיר לסבב הראשון
-- (migrations_stock_photos_round1.sql) - אותה מתודולוגיה בדיוק: Wikipedia/Commons →
-- אימות רישיון ידני (CC-BY/CC-BY-SA/CC0/PD בלבד) → אימות שהתמונה אכן מתארת את המקום
-- הנכון → thumb ברוחב 960px (מאומת ב-curl מול upload.wikimedia.org לפני המסירה, לא רק
-- בעיון קוד - ראו הערה בסבב הראשון על חסימת-רחבים-שרירותיים של Wikimedia).
--
-- 13 יעדים נוספים לפי base_visits (היעדים הפופולריים הבאים בתור אחרי סבב 1), כולל 2
-- מקרים של שימוש-חוזר מכוון בתמונה שכבר אומתה בסבב הקודם: 'nahaldavid' (נחל דוד) הוא
-- אותו אתר פיזי בדיוק כמו 'eingedi' (מפל דוד בעין גדי - התיאור המקורי בקובץ אכן אומר
-- "David Waterfall"), ו-'tiuli-44' (גן לאומי קיסריה) הוא אותו אתר פיזי כמו 'caesarea' -
-- אין טעם/צורך בחיפוש תמונה נפרדת לאותו מקום ממש תחת שני מזהי-DB שונים.

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/2010-06-18_09-30-17_Israel_Ejn_Gedi_JH_%2852783702009%29.jpg/960px-2010-06-18_09-30-17_Israel_Ejn_Gedi_JH_%2852783702009%29.jpg',
  stock_photo_credit = 'Jan Helebrant, CC0 Public Domain, via Wikimedia Commons'
where id = 'nahaldavid';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Caesarea.JPG/960px-Caesarea.JPG',
  stock_photo_credit = 'אסף.צ, Public Domain, via Wikimedia Commons'
where id = 'tiuli-44';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/131566_nahal_snir_-_hatzbani_PikiWiki_Israel.jpg/960px-131566_nahal_snir_-_hatzbani_PikiWiki_Israel.jpg',
  stock_photo_credit = 'שלמה רודד, PikiWiki Israel, CC BY 2.5, via Wikimedia Commons'
where id = 'tiuli-187';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/EinKaremMar042023.jpg/960px-EinKaremMar042023.jpg',
  stock_photo_credit = 'Hagai Agmon-Snir, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tiuli-91';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/%D7%A9%D7%9B%D7%95%D7%A0%D7%AA_%D7%9E%D7%A9%D7%9B%D7%A0%D7%95%D7%AA_%D7%A9%D7%90%D7%A0%D7%A0%D7%99%D7%9D_%D7%95%D7%98%D7%97%D7%A0%D7%AA_%D7%94%D7%A8%D7%95%D7%97._%D7%A6%D7%95%D7%9C%D7%9D_%D7%9E%D7%9B%D7%99%D7%95%D7%95%D7%9F_%D7%94%D7%A2%D7%99%D7%A8_%D7%94%D7%A2%D7%AA%D7%99%D7%A7%D7%94.jpg/960px-%D7%A9%D7%9B%D7%95%D7%A0%D7%AA_%D7%9E%D7%A9%D7%9B%D7%A0%D7%95%D7%AA_%D7%A9%D7%90%D7%A0%D7%A0%D7%99%D7%9D_%D7%95%D7%98%D7%97%D7%A0%D7%AA_%D7%94%D7%A8%D7%95%D7%97._%D7%A6%D7%95%D7%9C%D7%9D_%D7%9E%D7%9B%D7%99%D7%95%D7%95%D7%9F_%D7%94%D7%A2%D7%99%D7%A8_%D7%94%D7%A2%D7%AA%D7%99%D7%A7%D7%94.jpg',
  stock_photo_credit = 'חמוטל אלבז, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tiuli-138';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Ha-Nevi%27im_Street%2C_Jerusalem%2C_Israel_15.jpg/960px-Ha-Nevi%27im_Street%2C_Jerusalem%2C_Israel_15.jpg',
  stock_photo_credit = 'Hoshvilim, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tiuli-139';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/28_9_13_1240_%D7%94%D7%9E%D7%95%D7%A9%D7%91%D7%94_%D7%94%D7%90%D7%9E%D7%A8%D7%99%D7%A7%D7%90%D7%99%D7%AA%2C_%D7%9E%D7%91%D7%98_%D7%9E%D7%9C%D7%9E%D7%A2%D7%9C%D7%94.JPG/960px-28_9_13_1240_%D7%94%D7%9E%D7%95%D7%A9%D7%91%D7%94_%D7%94%D7%90%D7%9E%D7%A8%D7%99%D7%A7%D7%90%D7%99%D7%AA%2C_%D7%9E%D7%91%D7%98_%D7%9E%D7%9C%D7%9E%D7%A2%D7%9C%D7%94.JPG',
  stock_photo_credit = 'Meireliel, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'tiuli-93';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/PikiWiki_Israel_42342_Architecture_of_Israel.JPG/960px-PikiWiki_Israel_42342_Architecture_of_Israel.JPG',
  stock_photo_credit = 'udi Steinwell, PikiWiki Israel, CC BY 2.5, via Wikimedia Commons'
where id = 'tiuli-280';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Jish-Gush-Halav-709.jpg/960px-Jish-Gush-Halav-709.jpg',
  stock_photo_credit = 'Bukvoed, CC BY 4.0, via Wikimedia Commons'
where id = 'tiuli-92';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/%D7%97%D7%95%D7%A8%D7%A9%D7%AA_%D7%94%D7%90%D7%A8%D7%91%D7%A2%D7%99%D7%9D_%D7%A4%D7%90%D7%A8%D7%A7_%D7%94%D7%9B%D7%A8%D7%9E%D7%9C.jpg/960px-%D7%97%D7%95%D7%A8%D7%A9%D7%AA_%D7%94%D7%90%D7%A8%D7%91%D7%A2%D7%99%D7%9D_%D7%A4%D7%90%D7%A8%D7%A7_%D7%94%D7%9B%D7%A8%D7%9E%D7%9C.jpg',
  stock_photo_credit = 'גלברט אביבה, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tiuli-279';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Einot-tzukim-reserve-badeteich.JPG/960px-Einot-tzukim-reserve-badeteich.JPG',
  stock_photo_credit = 'Mboesch, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'tiuli-45';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/PikiWiki_Israel_29151_Ben_Gurion_Cedar_in_Jerusalem_Forest.JPG/960px-PikiWiki_Israel_29151_Ben_Gurion_Cedar_in_Jerusalem_Forest.JPG',
  stock_photo_credit = 'Hedva Sanderovitz, PikiWiki Israel, CC BY 2.5, via Wikimedia Commons'
where id = 'tiuli-140';
