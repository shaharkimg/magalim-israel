-- תמונות-מקור מ-Wikimedia Commons - סבב עשירי, בהמשך ישיר לסבבים הקודמים (שהופסקו
-- זמנית להוספת יעדים חדשים). אותה מתודולוגיה בדיוק: אימות רישיון+תוכן ידני, רוחב-thumb
-- מאומת ב-curl. הפעם ממוקד ב-8 מהיעדים החדשים והפופולריים ביותר שנוספו בסבבי-החיפוש
-- האחרונים (לפי base_visits): גן השלושה, יפו העתיקה, פארק הירקון, בית גוברין, חורשת
-- טל, גן לאומי אשקלון, קומראן, ואגמון החולה.
--
-- הערה: תמונת-האינפובוקס המקורית של יפו העתיקה ב-Wikipedia הייתה תצלום היסטורי משנת
-- 1905 (ציבורי-דומיין אך שחור-לבן/היסטורי) - הוחלפה בכוונה בתצלום מודרני וצבעוני של
-- כיכר השעון, לעקביות עם כל שאר היעדים באפליקציה.

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Gan_haShlosha_IL_LowerPool2.JPG/960px-Gan_haShlosha_IL_LowerPool2.JPG',
  stock_photo_credit = 'Grauesel, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'gan-hashlosha';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/121%D7%9B%D7%99%D7%9B%D7%A8_%D7%94%D7%A9%D7%A2%D7%95%D7%9F_%D7%91%D7%99%D7%A4%D7%95_%D7%91%D7%99%D7%95%D7%9D_%D7%97%D7%92.JPG/960px-121%D7%9B%D7%99%D7%9B%D7%A8_%D7%94%D7%A9%D7%A2%D7%95%D7%9F_%D7%91%D7%99%D7%A4%D7%95_%D7%91%D7%99%D7%95%D7%9D_%D7%97%D7%92.JPG',
  stock_photo_credit = 'Avivit Isaacson, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'jaffa-old-city';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/90851_yarkon_park_on_saturday_morning_PikiWiki_Israel.jpg/960px-90851_yarkon_park_on_saturday_morning_PikiWiki_Israel.jpg',
  stock_photo_credit = 'ליזי שאנן, PikiWiki Israel, CC BY 2.5, via Wikimedia Commons'
where id = 'yarkon-park';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Beit_Guvrin_1.JPG/960px-Beit_Guvrin_1.JPG',
  stock_photo_credit = 'Chai, CC BY-SA 3.0, via Wikimedia Commons'
where id = 'beit-guvrin';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Horshat_Tal.jpg/960px-Horshat_Tal.jpg',
  stock_photo_credit = 'יונץ, Public Domain, via Wikimedia Commons'
where id = 'hurshat-tal';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Ashkelon-8999.jpg/960px-Ashkelon-8999.jpg',
  stock_photo_credit = 'Bukvoed, CC BY 3.0, via Wikimedia Commons'
where id = 'ashkelon-national-park';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Kumeran4.jpg',
  stock_photo_credit = 'Tamarah, CC BY-SA 2.5, via Wikimedia Commons'
where id = 'qumran';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Feeding_Common_crane_in_Agamon_Hula_Nature_reserve_%2C_Israel.jpg/960px-Feeding_Common_crane_in_Agamon_Hula_Nature_reserve_%2C_Israel.jpg',
  stock_photo_credit = 'MinoZig, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'agmon-hula';
