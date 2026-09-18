-- מאפשר למשתמש לערוך תמונה/הערה בביקור שכבר נכבש (לא היה עד כה policy ל-update על
-- visits בכלל - רק insert+select) - כדי לתמוך בפיצ'ר "הוסיפו תמונה וביקורת" ממסך היעד
-- אחרי הכיבוש. מוגבל לשורה של המשתמש עצמו בדיוק כמו שאר ה-policies בטבלה.

create policy "users can update their own visit"
  on public.visits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
