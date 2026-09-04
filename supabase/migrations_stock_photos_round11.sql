-- תמונות-מקור מ-Wikimedia Commons - סבב 11, ממשיך את השלמת התמונות ליעדים החדשים.
-- אותה מתודולוגיה בדיוק. 4 יעדים נוספים.

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/%D7%94%D7%90%D7%92%D7%9D_%D7%94%D7%90%D7%A7%D7%95%D7%9C%D7%95%D7%92%D7%99_%D7%91%D7%A4%D7%90%D7%A8%D7%A7_%D7%90%D7%A8%D7%99%D7%90%D7%9C_%D7%A9%D7%A8%D7%95%D7%9F.jpg/960px-%D7%94%D7%90%D7%92%D7%9D_%D7%94%D7%90%D7%A7%D7%95%D7%9C%D7%95%D7%92%D7%99_%D7%91%D7%A4%D7%90%D7%A8%D7%A7_%D7%90%D7%A8%D7%99%D7%90%D7%9C_%D7%A9%D7%A8%D7%95%D7%9F.jpg',
  stock_photo_credit = 'היידן, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'ariel-sharon-park';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Maayan_harod.jpg/960px-Maayan_harod.jpg',
  stock_photo_credit = 'Almog, Public Domain, via Wikimedia Commons'
where id = 'maayan-harod';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Avshalom_Cave_%28Sorek_Cave%29_-_Stalactite_Cave_Nature_Reserve_P1120702_%287139474717%29.jpg/960px-Avshalom_Cave_%28Sorek_Cave%29_-_Stalactite_Cave_Nature_Reserve_P1120702_%287139474717%29.jpg',
  stock_photo_credit = 'Ricardo Tulio Gandelman, CC BY 2.0, via Wikimedia Commons'
where id = 'stalactite-cave';

update public.landmarks set
  stock_photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/%D7%97%D7%95%D7%A8%D7%91%D7%95%D7%AA_%D7%9C%D7%99%D7%A4%D7%AA%D7%90_-_%D7%9C%D7%99%D7%93_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D.jpg/960px-%D7%97%D7%95%D7%A8%D7%91%D7%95%D7%AA_%D7%9C%D7%99%D7%A4%D7%AA%D7%90_-_%D7%9C%D7%99%D7%93_%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D.jpg',
  stock_photo_credit = 'ZeevStein, CC BY-SA 4.0, via Wikimedia Commons'
where id = 'lifta';
