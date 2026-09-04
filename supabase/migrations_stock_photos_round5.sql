-- תמונות-מקור מ-Wikimedia Commons - סבב חמישי, בהמשך ישיר לסבבים 1-4. אותה מתודולוגיה
-- בדיוק. 7 יעדים, כולל 2 שימושים-חוזרים באתר-פיזי-זהה כבר-מאומת (tiuli-39/hula,
-- tiuli-177/nahalmearot).
--
-- הערה חשובה על tiuli-34 (עמק הבכא / אנדרטת גדוד 77): התמונה הראשונית שנמצאה
-- באינפובוקס של Wikipedia ("Valley of Tears") הייתה תצלום-מלחמה קשה (טנק סורי הרוס עם
-- חבר-צוות הרוג) - נפסלה במפורש כלא-מתאימה לאפליקציית-טיולים. הוחלף בתמונה חלופית
-- שמתעדת את אתר-ההנצחה המודרני עצמו (טקס 40 שנה למלחמת יום הכיפורים באתר), לא את
-- אירועי-הקרב ההיסטוריים.

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Hula-national-reserve-steg-a.JPG/960px-Hula-national-reserve-steg-a.JPG',
  stock_photo_credit = 'Mboesch, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tiuli-39';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/%D7%A0%D7%97%D7%9C_%D7%9E%D7%A2%D7%A8%D7%95%D7%AA_%D7%9E%D7%9E%D7%A2%D7%95%D7%A3_%D7%94%D7%A6%D7%99%D7%A4%D7%95%D7%A8.jpg/960px-%D7%A0%D7%97%D7%9C_%D7%9E%D7%A2%D7%A8%D7%95%D7%AA_%D7%9E%D7%9E%D7%A2%D7%95%D7%A3_%D7%94%D7%A6%D7%99%D7%A4%D7%95%D7%A8.jpg',
  stock_photo_credit = 'Yitzhak Marmelstein, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'tiuli-177';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Bauhaus_Museum_from_Bialik_Sq.JPG/960px-Bauhaus_Museum_from_Bialik_Sq.JPG',
  stock_photo_credit = 'Robinbagon, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'tiuli-84';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Timna_7.JPG/960px-Timna_7.JPG',
  stock_photo_credit = 'Little Savage, Public Domain, via Wikimedia Commons'
where id = 'tiuli-83';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Ruins_of_a_church_in_Shivta_in_the_Negev.jpg/960px-Ruins_of_a_church_in_Shivta_in_the_Negev.jpg',
  stock_photo_credit = 'Ester Inbar, רישיון-שימוש-חופשי-עם-קרדיט, via Wikimedia Commons'
where id = 'tiuli-81';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/88338_gazar_mound_PikiWiki_Israel.jpg/960px-88338_gazar_mound_PikiWiki_Israel.jpg',
  stock_photo_credit = 'זאב שטיין, PikiWiki Israel, CC BY 2.5, via Wikimedia Commons'
where id = 'tiuli-36';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/%D7%A2%D7%9E%D7%A7_%D7%94%D7%91%D7%9B%D7%90_-_40_%D7%A9%D7%A0%D7%94_%D7%9C%D7%9E%D7%9C%D7%97%D7%9E%D7%AA_%D7%99%D7%95%D7%9D_%D7%94%D7%9B%D7%99%D7%A4%D7%95%D7%A8%D7%99%D7%9D_%288%29.JPG/960px-%D7%A2%D7%9E%D7%A7_%D7%94%D7%91%D7%9B%D7%90_-_40_%D7%A9%D7%A0%D7%94_%D7%9C%D7%9E%D7%9C%D7%97%D7%9E%D7%AA_%D7%99%D7%95%D7%9D_%D7%94%D7%9B%D7%99%D7%A4%D7%95%D7%A8%D7%99%D7%9D_%288%29.JPG',
  stock_photo_credit = 'Chenspec, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'tiuli-34';
