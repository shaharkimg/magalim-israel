import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, VAPID_PUBLIC_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// גרסת האפליקציה - יש לעדכן יחד עם ה-?v= בתג ה-script ב-index.html בכל דיפלוי, לצורך זיהוי גרסה ישנה בדפדפן
const APP_VERSION = "20260919a1";
// הדומיין הרשמי. מוטבע על תמונת-השיתוף שהאפליקציה מייצרת, ולכן הוא לא רק קונפיגורציה -
// הוא מה שכל מי שרואה צילום כיבוש משותף יקליד. scripts/check_twa.js מוודא שהוא זהה
// ל-host שב-twa-manifest.json, כדי שאריזת-האנדרואיד לא תצביע למקום אחר מהמיתוג.
const SITE_HOST = "megalim-israel.co.il";
// רישום Service Worker - app-shell בלבד, network-first (ראו sw.js). Fire-and-forget,
// לא חוסם את טעינת הנתונים ב-bootPublic(). CACHE_VERSION בתוך sw.js חייב להתעדכן יחד
// עם APP_VERSION הזה בכל דיפלוי.
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
/* ============ INSTALL UX (App Essentials Phase 0D, Round 3) ============ */
// לא מבקשים התקנה מיד - רק אחרי שימוש אמיתי (סעיף 18 בבקשה), ולא שוב אחרי דחייה/התקנה.
let deferredInstallPrompt = null;
function isStandaloneDisplay(){
  try{ return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true; }catch(e){ return false; }
}
function isIOSSafariNotStandalone(){
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  return isIOS && !isStandaloneDisplay();
}
function bumpVisitCount(){
  try{
    const n = Number(localStorage.getItem("magalim-visit-count")||"0")+1;
    localStorage.setItem("magalim-visit-count", String(n));
    return n;
  }catch(e){ return 0; }
}
function shouldOfferInstall(){
  try{
    if(isStandaloneDisplay()) return false;
    if(localStorage.getItem("magalim-install-dismissed")) return false;
    return Number(localStorage.getItem("magalim-visit-count")||"0") >= 2;
  }catch(e){ return false; }
}
function maybeShowInstallBanner(){
  const el = $("installBanner");
  if(!el || el.dataset.shown) return;
  if(!shouldOfferInstall()) return;
  if(!deferredInstallPrompt && !isIOSSafariNotStandalone()) return;
  el.dataset.shown = "1";
  $("installBannerText").textContent = deferredInstallPrompt
    ? "אוהבים לטייל עם מגלים? הוסיפו אותה למסך הבית לגישה מהירה."
    : 'אוהבים לטייל עם מגלים? הקישו על כפתור השיתוף ואז "הוסף למסך הבית".';
  $("installBannerActionBtn").classList.toggle("hidden", !deferredInstallPrompt);
  el.classList.remove("hidden");
}
// כפתור התקנה קבוע בהגדרות (בנוסף לבאנר החד-פעמי למעלה) - כדי שמי שדחה את הבאנר פעם
// אחת (magalim-install-dismissed נשמר לצמיתות) עדיין יוכל להתקין ביוזמתו מתי שירצה.
function updateSettingsInstallRow(){
  const row = $("installAppRow");
  if(!row) return;
  row.classList.toggle("hidden", isStandaloneDisplay() || (!deferredInstallPrompt && !isIOSSafariNotStandalone()));
}
window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  deferredInstallPrompt = e;
  maybeShowInstallBanner();
  updateSettingsInstallRow();
});
window.addEventListener("appinstalled", ()=>{
  deferredInstallPrompt = null;
  try{ localStorage.setItem("magalim-install-dismissed","1"); }catch(e){}
  $("installBanner")?.classList.add("hidden");
  updateSettingsInstallRow();
  track("install_prompt_accepted");
});
// העדפת ערכת-נושא ידנית (הגדרות) - ה-CSS כבר תומך ב-:root[data-theme] מהשדרוג הוויזואלי,
// כאן רק קוראים/כותבים אותה. "system" = בלי override, עוקב אחרי prefers-color-scheme כרגיל.
const THEME_KEY = "magalim-theme";
let themePref = "system";
try{ themePref = localStorage.getItem(THEME_KEY) || "system"; }catch(e){}
function applyTheme(theme){
  if(theme==="system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}
function setTheme(theme){
  themePref = theme;
  applyTheme(theme);
  try{ localStorage.setItem(THEME_KEY, theme); }catch(e){}
  document.querySelectorAll("#themeSeg button").forEach(b=> b.classList.toggle("active", b.dataset.theme===theme));
}
applyTheme(themePref);
// App Essentials Phase 0F, Round 3 - כפיית הפחתת-אנימציות ידנית, בנוסף ל-prefers-reduced-motion
// של המכשיר (שתמיד מכובד ממילא דרך ה-media query הקיים ב-CSS/JS). ברירת מחדל: כבוי (עוקב אחרי
// המכשיר בלבד), בדיוק כמו "system" ב-theme.
const REDUCE_MOTION_KEY = "magalim-reduce-motion";
let reduceMotionPref = false;
try{ reduceMotionPref = localStorage.getItem(REDUCE_MOTION_KEY)==="1"; }catch(e){}
function applyReduceMotion(on){
  if(on) document.documentElement.setAttribute("data-motion","reduce");
  else document.documentElement.removeAttribute("data-motion");
}
function setReduceMotion(on){
  reduceMotionPref = on;
  applyReduceMotion(on);
  try{ localStorage.setItem(REDUCE_MOTION_KEY, on?"1":"0"); }catch(e){}
  const t = $("reduceMotionToggle"); if(t) t.checked = on;
}
function prefersReducedMotion(){
  if(reduceMotionPref) return true;
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
applyReduceMotion(reduceMotionPref);

/* ============ STATIC APP DATA ============ */
const CATEGORIES = {
  nature:{label:"טבע ונופים",color:"var(--cat-nature)",icon:"nature"},
  mountains:{label:"מסלולי הרים",color:"var(--cat-mountains)",icon:"mountains"},
  water:{label:"מים",color:"var(--cat-water)",icon:"water"},
  heritage:{label:"מורשת והיסטוריה",color:"var(--cat-heritage)",icon:"heritage"},
  archaeology:{label:"ארכיאולוגיה",color:"var(--cat-archaeology)",icon:"archaeology"},
  viewpoints:{label:"תצפיות",color:"var(--cat-viewpoints)",icon:"viewpoints"},
  religious:{label:"אתרים דתיים",color:"var(--cat-religious)",icon:"religious"},
  parks:{label:"פארקים לאומיים",color:"var(--cat-parks)",icon:"parks"},
  reserves:{label:"שמורות טבע",color:"var(--cat-reserves)",icon:"reserves"},
  urban:{label:"אתרים אורבניים",color:"var(--cat-urban)",icon:"urban"},
};
const REGIONS = { north:"צפון", center:"מרכז", jerusalem:"ירושלים", south:"דרום", deadsea:"ים המלח", eilat:"אילת" };
// Gamification Overhaul - מיפוי-קושי חדש (easy/medium/challenging/hard, 10/20/35/50 נקודות,
// אימוג'י-צבע) בלי לגעת ב-landmarks.difficulty בפועל (עדיין easy/medium/hard/extreme - טקסט
// חופשי בלי check-constraint, ראו schema.sql). אותו סדר-אורדינלי בדיוק כמו הסולם הישן שהוחלף
// (easy<medium<hard<extreme): hard הישן (3-שי) -> "מאתגר" החדש, extreme הישן (4-שי, הכי הרבה
// נקודות) -> "קשה" החדש. קונפיג-JS טהור, אפס מיגרציית-DB.
const DIFF_TIERS = [
  { key:"easy", dbValue:"easy", label:"קל", xp:10, color:"var(--success)" },
  { key:"medium", dbValue:"medium", label:"בינוני", xp:20, color:"var(--teal)" },
  { key:"challenging", dbValue:"hard", label:"מאתגר", xp:35, color:"var(--warn)" },
  { key:"hard", dbValue:"extreme", label:"קשה", xp:50, color:"var(--danger)" },
];
const DIFF_TIER_BY_DB = Object.fromEntries(DIFF_TIERS.map(t=>[t.dbValue,t]));

/* ============ ניקוד: מאמץ × קושי ============ */
// עד כה הניקוד נגזר מדרגת-הקושי בלבד, כך שתצפית של רבע שעה ומסלול של חמש שעות באותה
// דרגת-קושי היו שווים בדיוק. עכשיו הבסיס הוא סוג-המאמץ (כמה באמת הולכים), והקושי רק
// מכפיל אותו. כך "מקום שבאים לבקר בו" שווה פחות ממסלול, ומסלול קצר שווה פחות מארוך.
const EFFORT_TIERS = {
  visit: { key:"visit", label:"ביקור",       hint:"מגיעים, מסתכלים, מצטלמים", xp:10 },
  walk:  { key:"walk",  label:"טיול קצר",    hint:"עד כשעתיים הליכה",         xp:22 },
  hike:  { key:"hike",  label:"מסלול",       hint:"כשעתיים וחצי עד ארבע וחצי", xp:38 },
  trek:  { key:"trek",  label:"מסלול ארוך",  hint:"חמש שעות ומעלה",           xp:58 },
};
const DIFF_XP_MULTIPLIER = { easy:1, medium:1.1, hard:1.25, extreme:1.4 };
// קטגוריות שבהן המקום עצמו הוא היעד ולא ההליכה אליו (תצפית, אתר מורשת, מעיין בצד הדרך)
const VISIT_FIRST_CATEGORIES = new Set(["viewpoints","religious","urban","heritage","archaeology"]);
function effortClassFor(l){
  const hours = l.durationHours != null ? l.durationHours : estimateHours(l);
  const km = l.distanceKm != null ? l.distanceKm : 0;
  // מעט מאוד הליכה = ביקור, גם אם שוהים במקום זמן מה (חוף, תצפית, אתר עתיקות)
  if(km <= 1.5 && (hours <= 1.5 || VISIT_FIRST_CATEGORIES.has(l.category))) return EFFORT_TIERS.visit;
  if(hours < 2.5) return EFFORT_TIERS.walk;
  if(hours < 4.5) return EFFORT_TIERS.hike;
  return EFFORT_TIERS.trek;
}
// הניקוד שיוענק על כיבוש ראשון של היעד. מעוגל ל-5 הקרוב כדי שהמספרים יישארו "עגולים"
// בממשק (10/20/40/60/80) ולא 41.8.
// עמודת landmarks.points הוסרה מהסכמה (migrations_drop_landmarks_points.sql): היא החזיקה
// 10/25/50/100 שנגזרו מדרגת-הקושי בלבד - בדיוק העיוות שהחישוב הזה בא לתקן.
function pointsForLandmark(l){
  const base = effortClassFor(l).xp;
  const mult = DIFF_XP_MULTIPLIER[l.difficulty] != null ? DIFF_XP_MULTIPLIER[l.difficulty] : 1;
  return Math.max(5, Math.round(base*mult/5)*5);
}
function tierForDb(rawDifficulty){ return DIFF_TIER_BY_DB[rawDifficulty] || DIFF_TIERS[0]; }
// dict בצורת {dbValue:{label}} - לשימוש ב-buildChips/צ'יפים ידניים שממפתחים data-id=dbValue
// (מסנן/wizard/העדפות) בלי לשבור את ה-id הגולמי שנשלח ל-filters/DB - רק התווית משתנה.
// buildChips כבר יודע לצייר נקודת-צבע אמיתית (v.color -> .sw) בדיוק בשביל המקרה הזה -
// היה מיותר לגמרי להטביע אימוג'י-עיגול צבעוני בתוך הטקסט במקום להשתמש במנגנון הקיים.
const DIFF_CHIPS_DICT = Object.fromEntries(DIFF_TIERS.map(t=>[t.dbValue,{label:t.label, color:t.color}]));
// אותה נקודת-צבע לשימוש מחוץ ל-chip (טקסט מוטבע בכרטיסים/רשימות) - בלי אימוג'י.
function tierDotHtml(tier){ return '<span class="tier-dot" style="background:'+tier.color+'"></span>'; }
// שם-אזור בצורת "עם ה' הידיעה" לתגי חוקר/מומחה (חלק מהאזורים שמות פרטיים - ירושלים/אילת/ים
// המלח - לא לוקחים ה' הידיעה בעברית, אז אי אפשר פשוט לשרשר "ה"+שם לכל האזורים).
const REGION_THE = { north:"הצפון", center:"המרכז", jerusalem:"ירושלים", south:"הדרום", deadsea:"ים המלח", eilat:"אילת" };
// מרחיבים את מערכת ה-BADGES הקיימת (לא בונים מנגנון נפרד) - 3 דרגות × 6 אזורים, לפי אחוז
// מגילוי האזור (לא מספר קבוע) כי גודל האזורים שונה מאוד זה מזה.
function regionTierBadges(){
  const tiers = [
    { suffix:"bronze", pct:0.25, label:r=>"מתחיל ב"+REGIONS[r] },
    { suffix:"silver", pct:0.6, label:r=>"חוקר "+REGION_THE[r] },
    { suffix:"gold", pct:1, label:r=>"מומחה "+REGION_THE[r] },
  ];
  const out = [];
  Object.keys(REGIONS).forEach(r=>{
    tiers.forEach(t=>{
      out.push({
        id:"region_"+r+"_"+t.suffix, label:t.label(r),
        target:()=> Math.max(1, Math.ceil(regionCount(r)*t.pct)),
        current:v=> Math.min(regionVisited(v,r), Math.max(1, Math.ceil(regionCount(r)*t.pct))),
      });
    });
  });
  return out;
}
const BADGES = [
  {id:"first",label:"צעד ראשון",target:()=>1,current:v=>Math.min(v.length,1)},
  {id:"milestone3",label:"3 יעדים",target:()=>3,current:v=>Math.min(v.length,3)},
  {id:"seven",label:"צועד השבעה",target:()=>7,current:v=>Math.min(v.length,7)},
  {id:"milestone10",label:"10 יעדים",target:()=>10,current:v=>Math.min(v.length,10)},
  {id:"milestone25",label:"25 יעדים",target:()=>25,current:v=>Math.min(v.length,25)},
  {id:"milestone50",label:"50 יעדים",target:()=>50,current:v=>Math.min(v.length,50)},
  {id:"region1",label:"כובש אזור ראשון",target:v=>bestRegionProgress(v).total,current:v=>bestRegionProgress(v).done},
  {id:"water5",label:"כובש נחלים",target:()=>5,current:v=>Math.min(countCat(v,"water"),5)},
  {id:"hist5",label:"היסטוריון",target:()=>5,current:v=>Math.min(countCat(v,"archaeology")+countCat(v,"heritage"),5)},
  {id:"north",label:"אלוף הצפון",target:()=>Math.min(15,regionCount("north")),current:v=>Math.min(regionVisited(v,"north"),15)},
  {id:"desert",label:"רץ המדבר",target:()=>Math.min(10,regionCount("south")+regionCount("eilat")),current:v=>Math.min(regionVisited(v,"south")+regionVisited(v,"eilat"),10)},
  {id:"extreme",label:"מטפס ותיק",target:()=>2,current:v=>Math.min(countDiff(v,"extreme"),2)},
  {id:"all",label:"כל הארץ",target:()=>LANDMARKS.length||259,current:v=>v.length},
  ...regionTierBadges(),
];
// אוספים קיוריטד - כמו BADGES, כל אחד הוא פילטר על LANDMARKS הקיימים (לא רשימת-ID ידנית).
// icon כאן הוא שם-גליף (STAMP_GLYPHS) או "ui:<name>" (UI_ICON_PATHS) - לא אימוג'י.
// שני המילונים מציירים באותה שפה (viewBox 24, קו 1.8), אז ערבוב ביניהם עקבי חזותית.
const COLLECTIONS = [
  { id:"water", label:"צייד המים", icon:"drop", description:"נחלים, מעיינות ובריכות טבעיות בכל רחבי הארץ.", filter:l=> l.category==="water"||l.hasWater },
  { id:"heritage", label:"עתיקות ומורשת", icon:"amphora", description:"אתרי ארכיאולוגיה ומורשת שמספרים את סיפור הארץ.", filter:l=> l.category==="archaeology"||l.category==="heritage" },
  { id:"mountains", label:"מסלולי הרים", icon:"peaks", description:"מסלולי הרים וטיפוס לעבר הפסגות הכי מרשימות בישראל.", filter:l=> l.category==="mountains" },
  { id:"nature", label:"טבע ונופים", icon:"leaf", description:"נופים פתוחים וטבע ירוק לאורך ולרוחב הארץ.", filter:l=> l.category==="nature" },
  { id:"desertsea", label:"מדבר וים המלח", icon:"dunes", description:"מדבר יהודה, הנגב, הערבה וים המלח.", filter:l=> l.region==="south"||l.region==="deadsea"||l.region==="eilat" },
  { id:"reserves", label:"שמורות ופארקים לאומיים", icon:"pine", description:"שמורות טבע ופארקים לאומיים מוגנים.", filter:l=> l.category==="reserves"||l.category==="parks" },
  { id:"family", label:"מושלם למשפחות", icon:"ui:family", description:"יעדים שמתאימים לטיול עם ילדים.", filter:l=> !!l.familyFriendly },
  { id:"accessible", label:"פתוח לכולם", icon:"ui:wheelchair", description:"יעדים נגישים לכיסא גלגלים ולעגלות.", filter:l=> !!l.accessible },
];
function collectionIconHtml(c, size){
  return c.icon.startsWith("ui:") ? uiIcon(c.icon.slice(3), size) : stampGlyph(c.icon, size);
}
function collectionLandmarks(c){ return LANDMARKS.filter(c.filter); }
function collectionProgress(c, visits){
  visits = visits || myVisits;
  const total = collectionLandmarks(c);
  const visitedIds = new Set(visits.map(v=>v.landmark_id));
  return { done: total.filter(l=>visitedIds.has(l.id)).length, total: total.length };
}
function countCat(visited,cat){return visited.filter(v=>lmById[v.landmark_id]&&lmById[v.landmark_id].category===cat).length;}
function countDiff(visited,d){return visited.filter(v=>lmById[v.landmark_id]&&lmById[v.landmark_id].difficulty===d).length;}
function regionCount(r){ return LANDMARKS.filter(l=>l.region===r).length; }
function regionVisited(visited,r){ return visited.filter(v=>lmById[v.landmark_id]&&lmById[v.landmark_id].region===r).length; }
function bestRegionProgress(visits){
  visits = visits || myVisits;
  let best = null;
  Object.keys(REGIONS).forEach(r=>{
    const total = regionCount(r);
    if(!total) return;
    const done = regionVisited(visits, r);
    const ratio = done/total, bestRatio = best ? best.done/best.total : -1;
    if(!best || ratio>bestRatio || (ratio===bestRatio && total<best.total)) best = { done, total };
  });
  return best || { done:0, total:1 };
}

/* ============ FOG OF WAR — גיאומטריית אזורים + גילוי ============ */
// אין קובץ גבולות רשמי לאזורים האלה (חלוקה פנימית של האפליקציה, לא מנהלית) - הפתרון
// הוא לגזור צורה מתוך קואורדינטות היעדים עצמם (convex hull + buffer קל), לא לצייר ידנית.
function regionDiscoveryPct(r, visits){
  visits = visits || myVisits;
  const total = regionCount(r);
  return total ? regionVisited(visits, r) / total : 0;
}
function convexHull(points){
  const pts = points.slice().sort((a,b)=> a[0]-b[0] || a[1]-b[1]);
  const cross = (o,a,b)=> (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const lower = [];
  for(const p of pts){
    while(lower.length>=2 && cross(lower[lower.length-2],lower[lower.length-1],p)<=0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for(let i=pts.length-1;i>=0;i--){
    const p = pts[i];
    while(upper.length>=2 && cross(upper[upper.length-2],upper[upper.length-1],p)<=0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}
function bufferHull(hull, deg){
  if(!hull.length) return hull;
  const cLat = hull.reduce((s,p)=>s+p[0],0)/hull.length;
  const cLon = hull.reduce((s,p)=>s+p[1],0)/hull.length;
  return hull.map(([lat,lon])=>{
    const dLat=lat-cLat, dLon=lon-cLon;
    const len = Math.hypot(dLat,dLon) || 1;
    return [lat + dLat/len*deg, lon + dLon/len*deg];
  });
}
let regionHullsCache = null;
function computeRegionHulls(){
  if(regionHullsCache) return regionHullsCache;
  const hulls = {};
  Object.keys(REGIONS).forEach(r=>{
    const pts = LANDMARKS.filter(l=>l.region===r).map(l=>[l.lat,l.lon]);
    hulls[r] = pts.length>=3 ? bufferHull(convexHull(pts), 0.06) : null;
  });
  regionHullsCache = hulls;
  return hulls;
}
let fogLayers = {};
// הנקודה הקודמת הייתה עיגול ירוק-כהה קטן (‎#146F67, אותה משפחת-צבעים של המפה ושל
// סיכות-היעדים) בלי שום סימן-היכר - קל מאוד לפספס אותה, ובוודאי מעל צמחייה. עכשיו:
// כחול, הקונבנציה שמוכרת מכל אפליקציית-מפות ולא מתנגשת עם צבעי-הקושי של הסיכות,
// טבעת לבנה, והילה בגודל שגיאת-המדידה שהמכשיר עצמו דיווח עליה - כלומר היא מציגה
// כמה המיקום מדויק במקום להעמיד פנים שהוא נקודתי. ב-pane ייעודי מעל הסיכות והערפל,
// אחרת היא נקברת מתחתיהם בדיוק כמו שקרה לכפתורי-המפה.
function renderUserLocation(){
  if(!leafletMap) return;
  [userLocMarker, userLocHalo].forEach(layer=>{ if(layer) leafletMap.removeLayer(layer); });
  userLocMarker = userLocHalo = null;
  if(!userLoc) return;
  if(userLoc.manual || userLoc.approx){
    // מיקום שלא נמדד על-ידי המכשיר נראה אחרת מכוונה: ענבר ולא כחול, כדי שלא ייראה
    // כאילו אותר בפועל. למקורב-לפי-רשת יש גם הילה רחבה, כי הוא באמת עשוי להיות
    // רחוק כמה עשרות קילומטרים - הצגתו כנקודה חדה הייתה שקר ויזואלי.
    if(userLoc.approx){
      userLocHalo = L.circle([userLoc.lat,userLoc.lon], {
        radius: userLoc.accuracy || APPROX_RADIUS_M, stroke:false, fillColor:"#9E6F2E",
        fillOpacity:0.12, interactive:false, pane:USER_LOC_PANE,
      }).addTo(leafletMap);
    }
    userLocMarker = L.circleMarker([userLoc.lat,userLoc.lon], {
      radius:8, color:"#fff", weight:3, fillColor:"#9E6F2E", fillOpacity:1,
      interactive:false, pane:USER_LOC_PANE,
    }).addTo(leafletMap);
    return;
  }
  if(userLoc.accuracy > 0 && isFreshFix(userLoc)){
    // רק למדידה טרייה. הילת-דיוק סביב מיקום ישן מציגה ודאות שאין לה כיסוי
    userLocHalo = L.circle([userLoc.lat,userLoc.lon], {
      radius: Math.min(userLoc.accuracy, 2000), stroke:false, fillColor:"#1A73E8",
      fillOpacity:0.15, interactive:false, pane:USER_LOC_PANE,
    }).addTo(leafletMap);
  }
  const fresh = isFreshFix(userLoc);
  userLocMarker = L.circleMarker([userLoc.lat,userLoc.lon], {
    radius:8, color:"#fff", weight:3,
    fillColor: fresh ? "#1A73E8" : "#8A9187", fillOpacity: fresh ? 1 : .75,
    dashArray: fresh ? null : "3 3",
    interactive:false, className: fresh ? "user-loc-dot" : "user-loc-dot stale", pane:USER_LOC_PANE,
  }).addTo(leafletMap);
}
function renderFogOfWar(){
  if(!leafletMap) return;
  const hulls = computeRegionHulls();
  Object.keys(REGIONS).forEach(r=>{
    const hull = hulls[r];
    if(!hull || hull.length<3) return;
    const opacity = session ? Math.max(0, 0.14*(1-regionDiscoveryPct(r))) : 0;
    if(!fogLayers[r]){
      fogLayers[r] = L.polygon(hull, {
        stroke:false, fillColor:"#8a9187", fillOpacity:opacity,
        interactive:false, className:"fog-region",
      }).addTo(leafletMap);
    } else {
      fogLayers[r].setStyle({ fillOpacity: opacity });
    }
  });
}

/* ============ CHALLENGES ============ */
const CHALLENGES = [
  {id:"icons25", title:"25 המקומות שכל ישראלי חייב לראות", icon:"trophy", color:"var(--cat-heritage)", target:25, match:l=>!l.id.startsWith("tiuli-"), reward:"תג ייחודי בפרופיל"},
  {id:"water10", title:"אתגר המים — 10 יעדי מים", icon:"drop", color:"var(--cat-water)", target:10, match:l=>l.category==="water"||l.hasWater, reward:"תג ייחודי בפרופיל"},
  {id:"jlm8", title:"שבילי ירושלים", icon:"landmark", color:"var(--cat-religious)", target:8, match:l=>l.region==="jerusalem", reward:"תג ייחודי בפרופיל"},
  {id:"desert6", title:"חודש במדבר", icon:"dunes", color:"var(--cat-mountains)", target:6, match:l=>["south","eilat","deadsea"].includes(l.region), reward:"תג ייחודי בפרופיל"},
  {id:"peaks10", title:"כובשי הפסגות — 10 מסלולי הרים", icon:"peaks", color:"var(--cat-mountains)", target:10, match:l=>l.category==="mountains", reward:"תג ייחודי בפרופיל"},
  {id:"reserves8", title:"שומרי הטבע — 8 שמורות", icon:"pine", color:"var(--cat-reserves)", target:8, match:l=>l.category==="reserves", reward:"תג ייחודי בפרופיל"},
  {id:"center12", title:"גלו את המרכז — 12 יעדים", icon:"cityscape", color:"var(--cat-urban)", target:12, match:l=>l.region==="center", reward:"תג ייחודי בפרופיל"},
];
function challengeProgress(ch){
  const matched = myVisits.filter(v=> lmById[v.landmark_id] && ch.match(lmById[v.landmark_id]));
  return { current: Math.min(matched.length, ch.target), remaining: LANDMARKS.filter(l=>ch.match(l) && !myVisits.some(v=>v.landmark_id===l.id)) };
}
// Gamification Overhaul - עקומת 20-הרמות + 4 פונקציות-utility בשם מדויק לפי המפרט. מקור-אמת
// יחיד לכל מערכת-הרמות באפליקציה (מחליף את עקומת-6-הרמות הישנה ואת totalPoints(), שהוסרו).
const LEVELS_V2 = [
  { min:0, name:"יוצאים לדרך" },
  { min:50, name:"מתחילים לטייל" },
  { min:120, name:"צועדים קדימה" },
  { min:220, name:"מגלי שבילים" },
  { min:350, name:"מטיילים מנוסים" },
  { min:520, name:"חוקרי טבע" },
  { min:730, name:"מגלי הארץ" },
  { min:980, name:"כובשי שבילים" },
  { min:1270, name:"חוקרי מרחבים" },
  { min:1600, name:"מטיילי ישראל" },
  { min:1980, name:"מומחי שבילים" },
  { min:2410, name:"רודפי נופים" },
  { min:2890, name:"חוקרי ישראל" },
  { min:3420, name:"ותיקי השבילים" },
  { min:4000, name:"אדוני השטח" },
  { min:4640, name:"מגלי אופקים" },
  { min:5340, name:"מומחי הארץ" },
  { min:6100, name:"אלופי השבילים" },
  { min:6920, name:"אגדות מטיילות" },
  { min:7800, name:"אגדת ישראל" },
];
// מוצא את אינדקס-הרמה הנכון גם כשה-XP מדלג על כמה ספים בבת-אחת (הלולאה יורדת מלמעלה,
// לא +1 נאיבי מלמטה) - עונה במפורש על דרישת "עדכון-XP שחוצה כמה ספים בבת-אחת".
function getLevelFromXP(totalXPValue){
  let i = LEVELS_V2.length-1;
  while(i>0 && totalXPValue<LEVELS_V2[i].min) i--;
  return i;
}
function getCurrentLevelProgress(totalXPValue){
  const index = getLevelFromXP(totalXPValue);
  const level = LEVELS_V2[index], next = LEVELS_V2[index+1] || null;
  return {
    index, level, next,
    xpIntoLevel: totalXPValue-level.min,
    xpForLevel: next ? next.min-level.min : 0,
    isMax: !next,
  };
}
function getXPToNextLevel(totalXPValue){
  const p = getCurrentLevelProgress(totalXPValue);
  return p.next ? p.next.min-totalXPValue : 0;
}
function getLevelProgressPercentage(totalXPValue){
  const p = getCurrentLevelProgress(totalXPValue);
  return p.isMax ? 100 : Math.round((p.xpIntoLevel/p.xpForLevel)*100);
}

function catIconSvg(cat,size){
  size=size||24;
  const paths={
    nature:'<path d="M12 3 4 15h5l-3 6h12l-3-6h5L12 3Z"/>',
    mountains:'<path d="M2 19 9 6l4 7 2-3 7 9H2Z"/>',
    water:'<path d="M12 2c3 4.5 6 8 6 12a6 6 0 1 1-12 0c0-4 3-7.5 6-12Z"/>',
    heritage:'<path d="M4 21h16M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',
    archaeology:'<path d="M4 8h16l-2 3H6L4 8Zm3 3v10h10V11M10 15v3M14 15v3"/>',
    viewpoints:'<circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    religious:'<path d="M12 2v20M6 8h12M4 14h16"/>',
    parks:'<path d="M12 2 5 13h4l-4 8h14l-4-8h4L12 2Z"/>',
    reserves:'<path d="M12 3c-3 3-6 6-6 10a6 6 0 0 0 12 0c0-4-3-7-6-10Z"/>',
    urban:'<path d="M4 21V7l5-4 5 4v14M14 21v-9l5-3v12M8 10h2M8 14h2"/>',
  };
  const stroke = ["heritage","archaeology","viewpoints","religious","urban"].includes(cat);
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="'+(stroke?"none":"currentColor")+'" stroke="'+(stroke?"currentColor":"none")+'" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">'+paths[cat]+"</svg>";
}

/* ============ UI ICON SET ============ */
// משפחת-אייקונים אחת לכל הממשק (stroke, viewBox 24, stroke-width 1.8) - אותה שפה ויזואלית
// כמו האייקונים שכבר מוטמעים ב-index.html (ניווט תחתון/הגדרות/חיפוש). מחליף emoji ששימשו
// כאייקוני-ממשק; emoji נשארים רק היכן שהם חלק מהתוכן/gamification (תגים, חגיגות).
const UI_ICON_PATHS = {
  difficulty:'<path d="M7 4h6l1 7 4 3.5V20H6v-4l1-3V4Z"/><path d="M6 17h12"/>',
  duration:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  water:'<path d="M12 3.5c2.6 3.9 5 6.9 5 10a5 5 0 0 1-10 0c0-3.1 2.4-6.1 5-10Z"/>',
  points:'<path d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5L10 13l-5.5-2L10 9l2-5.5Z"/>',
  region:'<path d="M12 21s6.5-5.6 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10.6" r="2.3"/>',
  family:'<circle cx="8.5" cy="8" r="2.6"/><circle cx="16" cy="9.5" r="2"/><path d="M4 19c.6-3 2.4-4.6 4.5-4.6S12.4 16 13 19M14 19c.4-2.2 1.6-3.4 3-3.4S19.6 16.8 20 19"/>',
  dog:'<path d="M5 10V6l3 2h8l3-2v4a4 4 0 0 1-1.5 3.1V19h-11v-5.9A4 4 0 0 1 5 10Z"/><path d="M10 15h4"/>',
  heart:'<path d="M12 19.5S4.5 14.8 4.5 9.9A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7.5 1.9c0 4.9-7.5 9.6-7.5 9.6Z"/>',
  check:'<path d="M5 12.5 10 17.5 19 7"/>',
  trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4.5v1.5A3 3 0 0 0 7 10M17 6h2.5v1.5A3 3 0 0 1 17 10M10 14v3h4v-3M8 20h8"/>',
  compass:'<circle cx="12" cy="12" r="8.5"/><path d="m15 9-1.6 4.4L9 15l1.6-4.4L15 9Z"/>',
  flame:'<path d="M12 3.5c3.5 3.5 5.5 6 5.5 9.2a5.5 5.5 0 0 1-11 0c0-1.6.6-2.9 1.8-4.2.4 1.2 1 1.9 1.9 2.1-.3-2.5.3-4.7 1.8-7.1Z"/>',
  wheelchair:'<circle cx="15.5" cy="5.3" r="1.6"/><path d="M14.3 8 15 12h4.3M9.7 12H15"/><circle cx="10.3" cy="16.3" r="4"/><path d="M10.3 12.3v4l3.5 2.3"/>',
  block:'<circle cx="12" cy="12" r="8.5"/><path d="M6.5 6.5 17.5 17.5"/>',
  gift:'<rect x="4.5" y="10" width="15" height="10" rx="1.5"/><path d="M4.5 10h15M12 10v10"/><path d="M12 10c-1.5-4-6-4.5-6-2s2.5 2 6 2ZM12 10c1.5-4 6-4.5 6-2s-2.5 2-6 2Z"/>',
  car:'<path d="M5 16v-3l1.8-3.8h10.4L19 13v3"/><path d="M5 16h14M7 16v1.8M17 16v1.8"/><circle cx="8" cy="16" r="1.3"/><circle cx="16" cy="16" r="1.3"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
  moon:'<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10Z"/>',
  device:'<rect x="7" y="3.5" width="10" height="17" rx="2"/><path d="M10.5 17.5h3"/>',
  camera:'<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2L9 4.5h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"/><circle cx="12" cy="13" r="3.5"/>',
  refresh:'<path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5M19.5 12a7.5 7.5 0 0 1-12.6 5.5"/><path d="M17 3.5v3.5h-3.5M7 20.5V17h3.5"/>',
  eye:'<path d="M3 12s3.3-6.5 9-6.5S21 12 21 12s-3.3 6.5-9 6.5S3 12 3 12Z"/><circle cx="12" cy="12" r="2.6"/>',
  warning:'<path d="M12 3.5 21 19.5H3L12 3.5Z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="16.8" r=".1" stroke-width="2.4"/>',
  leaf:'<path d="M5 19c0-8.5 5-13.5 14-14.5-1 9-6 14-14 14.5Z"/><path d="M6.3 17.7 13 11"/>',
};
/* ============ STAMPS ============ */
// חותמות המסע. משפחת-איור אחת בדיוק כמו UI_ICON_PATHS (viewBox 24, קו 1.8, פינות
// עגולות) - במקום אימוג'ים, שלא מתיישרים זה עם זה, משתנים בין מערכות הפעלה, ולא
// יכולים לקבל צבע לפי מצב החותמת.
const STAMP_GLYPHS = {
  footprint:'<path d="M9 4.5c1.6 0 2.5 1.6 2.5 3.8 0 2-.6 3-.6 4.4 0 1.2.6 1.8.6 3 0 1.4-.9 2.3-2.5 2.3S6.5 17.1 6.5 15.7c0-1.2.6-1.8.6-3 0-1.4-.6-2.4-.6-4.4C6.5 6.1 7.4 4.5 9 4.5Z"/><path d="M16.5 8.5c1.1 0 1.8 1.1 1.8 2.6 0 1.4-.4 2-.4 3 0 .8.4 1.2.4 2 0 1-.7 1.6-1.8 1.6s-1.8-.6-1.8-1.6c0-.8.4-1.2.4-2 0-1-.4-1.6-.4-3 0-1.5.7-2.6 1.8-2.6Z"/>',
  trail:'<path d="M5 19c3.5 0 3.5-4 7-4s3.5-4 7-4"/><circle cx="5" cy="19" r="1.4"/><circle cx="12" cy="15" r="1.4"/><circle cx="19" cy="11" r="1.4"/>',
  boot:'<path d="M7 4h3.5v7.5c0 1 .6 1.6 1.6 2l4.4 1.7c1.3.5 2 1.4 2 2.6V20H7V4Z"/><path d="M7 16.5h11.5"/>',
  medal:'<circle cx="12" cy="14.5" r="5"/><path d="M9 9.6 7 3.5h10l-2 6.1"/><path d="m12 12.4.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3.9-1.9Z"/>',
  peaks:'<path d="M3 18.5 9 8l3.5 5.5L15 9.5l6 9H3Z"/><path d="m9 8 1.8 3.1"/>',
  gem:'<path d="M7 4h10l4 5.5L12 20 3 9.5 7 4Z"/><path d="M3 9.5h18M9 4l-2 5.5L12 20l5-10.5L15 4"/>',
  flag:'<path d="M6.5 21V3.5"/><path d="M6.5 5h10l-2 3.4 2 3.4h-10"/>',
  drop:'<path d="M12 3.5c2.6 3.9 5 6.9 5 10a5 5 0 0 1-10 0c0-3.1 2.4-6.1 5-10Z"/><path d="M9.8 13.4c0 1.4.9 2.4 2.2 2.6"/>',
  amphora:'<path d="M9 4h6M10 4c0 2-2.5 2.5-2.5 5.5S9 14 9 16.5V20h6v-3.5c0-2.5 1.5-4 1.5-7S14 6 14 4"/><path d="M8.5 11h7"/>',
  compassRose:'<circle cx="12" cy="12" r="8.5"/><path d="m15 9-1.6 4.4L9 15l1.6-4.4L15 9Z"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"/>',
  dunes:'<path d="M3 17c2.5-3.5 4.3-5 6-5s2.6 1.2 4 1.2S15.6 11 17 11s2.6 1.5 4 4"/><path d="M3 20h18"/><circle cx="8" cy="6.5" r="2.5"/>',
  summit:'<path d="M12 3.5 21 19H3l9-15.5Z"/><path d="m8.4 12.8 2.1 1.7 1.5-1.2 1.5 1.2 2.1-1.7"/>',
  wreath:'<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4.5v1.5A3 3 0 0 0 7 10M17 6h2.5v1.5A3 3 0 0 1 17 10M10 14v3h4v-3M8 20h8"/>',
  seal:'<path d="M12 3.5 14 8l4.8.5-3.6 3.3 1 4.7-4.2-2.4-4.2 2.4 1-4.7L5.2 8.5 10 8l2-4.5Z"/><path d="M8.5 20h7"/>',
  lock:'<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  // דרגות (LEVELS_V2) משתמשות באותה משפחת-גליפים - לא סט אייקונים נפרד.
  seedling:'<path d="M12 20v-7"/><path d="M12 13c0-3-2-5-5-5 0 3 2 5 5 5Z"/><path d="M12 13c0-3 2-5 5-5 0 3-2 5-5 5Z"/><path d="M7.5 20h9"/>',
  tent:'<path d="M4 19 12 5l8 14Z"/><path d="M9.2 19 12 11.5l2.8 7.5"/><path d="M4 19h16"/>',
  leaf:'<path d="M5 19c0-8.5 5-13.5 14-14.5-1 9-6 14-14 14.5Z"/><path d="M6.3 17.7 13 11"/>',
  mapOutline:'<path d="M4 6.3 9 5l6 2 5-1.7v13.4L15 20l-6-2-5 1.7V6.3Z"/><path d="M9 5v13M15 7v13"/>',
  eagle:'<path d="M12 6.5c-2.3 1.4-5.5 2.7-8 2.3 1.7 2 4.2 2.9 6.3 2.3-1 2-2.7 3.8-2.9 5.9 2-1 3.8-3 4.6-5 .8 2 2.6 4 4.6 5-.2-2.1-1.9-3.9-2.9-5.9 2.1.6 4.6-.3 6.3-2.3-2.5.4-5.7-.9-8-2.3Z"/>',
  star6:'<path d="M12 3 20 17H4Z"/><path d="M12 21 4 7h16Z"/>',
  sunrise:'<path d="M3.5 17.5h17"/><path d="M6 17.5a6 6 0 0 1 12 0"/><path d="M12 5.5v3M6.8 10.3l1.7 1.7M17.2 10.3l-1.7 1.7"/>',
  crown:'<path d="m4 17-1-9 5 4 4-6 4 6 5-4-1 9Z"/><path d="M4 17h16"/>',
  star5:'<path d="m12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 20.1l1.4-6.3L3 9.5l6.4-.6Z"/>',
  trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4.5v1.5A3 3 0 0 0 7 10M17 6h2.5v1.5A3 3 0 0 1 17 10M10 14v3h4v-3M8 20h8"/>',
  pine:'<path d="M12 3 17.5 11H6.5Z"/><path d="M12 7.5 18.5 16H5.5Z"/><path d="M11 16h2v4h-2Z"/>',
  landmark:'<path d="M8 11a4 4 0 0 1 8 0v1H8Z"/><path d="M5.5 20v-9h13v9"/><path d="M10 20v-5h4v5"/>',
  cityscape:'<path d="M4 20V10h4v10M10 20V6h4v14M16 20v-8h4v8"/><path d="M3 20h18"/>',
};
// אינדקס ברמה -> שם גליף. עוקב אחרי הדפוס שכבר קיים באימוג'ים המקוריים (8 גליפים-בסיס
// חוזרים בשתי מחזוריות + 3 גליפי-שיא ייחודיים) - לא ממציא רצף חדש, רק מתרגם אותו לקו.
const LEVEL_GLYPH_SEQUENCE = [
  "seedling","tent","footprint","compassRose","boot","leaf","mapOutline","peaks","eagle","star6",
  "compassRose","sunrise","mapOutline","boot","peaks","eagle","star6","trophy","crown","star5",
];
function levelGlyphName(index){ return LEVEL_GLYPH_SEQUENCE[index] || "seal"; }
function stampGlyph(name, size){
  const d = STAMP_GLYPHS[name] || STAMP_GLYPHS.seal;
  size = size || 26;
  return '<svg class="stamp-ic" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+d+'</svg>';
}
// כל חותמת והגליף שלה. חותמות-האזור (region_<r>_<tier>) חולקות גליף אחד, והדרגה
// מסומנת בצבע הטבעת (ארד/כסף/זהב) - לא בגליף נפרד לכל אחת מ-18 האפשרויות.
const BADGE_GLYPHS = {
  first:"footprint", milestone3:"trail", seven:"boot", milestone10:"medal",
  milestone25:"peaks", milestone50:"gem", region1:"flag", water5:"drop",
  hist5:"amphora", north:"compassRose", desert:"dunes", extreme:"summit", all:"wreath",
};
function badgeGlyphName(id){
  if(BADGE_GLYPHS[id]) return BADGE_GLYPHS[id];
  if(id.startsWith("region_")) return "seal";
  return "seal";
}
function badgeMetal(id){
  const m = id.match(/^region_.+_(bronze|silver|gold)$/);
  return m ? m[1] : null;
}
function uiIcon(name, size){
  const d = UI_ICON_PATHS[name];
  if(!d) return "";
  size = size || 16;
  return '<svg class="ui-ic" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+d+'</svg>';
}

/* ============ SHARED EMPTY STATE ============ */
// מצב-ריק אחד לכל האפליקציה (§12): אייקון עדין, כותרת קצרה, משפט מעודד ו-CTA אחד -
// במקום שורות טקסט מופרדות ב-<br> שהיו משוכפלות בכל מסך.
function emptyStateHtml(o){
  return '<div class="empty-state">'
    + (o.icon ? '<div class="empty-icon">'+o.icon+'</div>' : "")
    + '<div class="empty-title">'+o.title+'</div>'
    + (o.sub ? '<div class="empty-sub">'+o.sub+'</div>' : "")
    + (o.ctaLabel ? '<button class="btn btn-primary empty-cta" id="'+o.ctaId+'" type="button">'+o.ctaLabel+'</button>' : "")
    + '</div>';
}

/* ============ SHARED PLACE CARD ============ */
// רכיב-כרטיס אחד לכל המקומות שבהם מוצג יעד ברשימה (חיפוש / רשימת-משאלות / כבשתי /
// היסטוריה / פאנל-צד בדסקטופ) - במקום 5 העתקים כמעט-זהים של אותו markup.
// התמונה היא האלמנט המרכזי, והמידע המשני מוצג כאייקונים קטנים ולא כטקסט ארוך.
function placeMetaHtml(l, opts){
  opts = opts || {};
  const tier = tierForDb(l.difficulty);
  const bits = [];
  if(opts.region !== false) bits.push('<span class="place-meta-item">'+uiIcon("region",13)+REGIONS[l.region]+'</span>');
  bits.push('<span class="place-meta-item">'+uiIcon("difficulty",13)+tier.label+'</span>');
  if(l.duration) bits.push('<span class="place-meta-item">'+uiIcon("duration",13)+l.duration+'</span>');
  if(l.hasWater) bits.push('<span class="place-meta-item">'+uiIcon("water",13)+'מים</span>');
  return '<div class="place-meta">'+bits.join("")+'</div>';
}
/* ============ HAPTICS ============ */
// משוב מישושי רק ברגעים שבהם באמת קרה משהו: צ'ק-אין מוצלח, תג חדש, עליית רמה. לא על
// כל לחיצה - רטט שמגיע כל הזמן מפסיק לסמן משהו והופך למטרד. שני דפוסים קצרים בלבד:
// success לאישור, milestone למשהו שנפתח. אם המכשיר לא תומך (iOS Safari לא תומך
// ב-Vibration API כלל) הכל ממשיך כרגיל - הרטט לעולם לא נושא מידע שאין גם על המסך.
const HAPTICS_KEY = "magalim-haptics-v1";
const HAPTIC_PATTERNS = { success: 18, milestone: [14, 55, 26] };
function hapticsEnabled(){
  try{ return localStorage.getItem(HAPTICS_KEY) !== "off"; }catch(e){ return true; }
}
function setHapticsEnabled(on){
  try{ localStorage.setItem(HAPTICS_KEY, on ? "on" : "off"); }catch(e){}
}
function haptic(kind){
  if(!hapticsEnabled()) return;
  const pattern = HAPTIC_PATTERNS[kind];
  if(!pattern || !navigator.vibrate) return;
  try{ navigator.vibrate(pattern); }catch(e){}
}
// גלילה אופקית מעל המפה (שורת-הסינון) ומעל תוכן רגיל (קרוסלת-הגילוי) יושבת פיזית
// מעל אלמנט אחר (המפה) בלי אף רמז חזותי שיש עוד תוכן לגלול אליו - הצ'יפ האחרון
// פשוט נעצר בשפת המסך. .scroll-fade מדהה את הקצוות; זו הפונקציה שמחליטה איזה קצה
// באמת דוהה, לפי כמה עוד יש לגלול - לא דהייה קבועה שנשארת גם כשאין בכלל לאן לגלול.
function syncScrollFade(el){
  if(!el) return;
  const max = el.scrollWidth - el.clientWidth;
  if(max <= 1){ el.classList.add("no-fade-left","no-fade-right"); return; }
  // scrollLeft=0 הוא תמיד "תחילת" הגלילה (הפריט הראשון קריאה, ימני ב-RTL) בכל
  // הדפדפנים המודרניים, וגדל בשלילה לכיוון הפריט האחרון - זה נכון גם ב-RTL,
  // אין צורך לבדוק כיווניות בנפרד.
  el.classList.toggle("no-fade-right", el.scrollLeft >= -1);
  el.classList.toggle("no-fade-left", el.scrollLeft <= -(max-1));
}
// מאזין פעם אחת בלבד לכל אלמנט (לא בכל רינדור-מחדש של תוכן, כמו discoveryCarousel
// שמתעדכן בכל תזוזה במפה - זה היה עורם מאזין כפול על כל תזוזה).
function wireScrollFade(el){
  if(!el) return;
  el.addEventListener("scroll", ()=>syncScrollFade(el), { passive:true });
  window.addEventListener("resize", ()=>syncScrollFade(el));
  syncScrollFade(el);
}
function greetingForNow(){
  const h = new Date().getHours();
  if(h < 5) return "לילה טוב";
  if(h < 12) return "בוקר טוב";
  if(h < 16) return "צהריים טובים";
  if(h < 19) return "אחר צהריים טובים";
  return "ערב טוב";
}
// Placeholder אחיד לכל כרטיס בלי תמונה (ראו .photo-fallback ב-index.html): גרדיאנט בצבע
// הקטגוריה + קווי-גובה + אייקון, במקום ריבוע צבע שטוח שהיה נראה כמו נתון חסר.
function photoFallbackHtml(l, size){
  const cat = CATEGORIES[l.category];
  return '<div class="photo-fallback" style="--ph-color:'+cat.color+'">'+catIconSvg(cat.icon, size||28)+'</div>';
}
// points: מספר להצגה כ"+40", או null כדי להסתיר. done:true מציג "נכבש" במקום ניקוד עתידי.
function placeCardHtml(l, opts){
  opts = opts || {};
  const thumb = opts.thumb || (opts.photo
    ? '<img src="'+opts.photo+'" loading="lazy" decoding="async" alt="'+l.name+'">'
    : photoFallbackHtml(l, 30));
  const meta = opts.metaHtml != null ? opts.metaHtml : placeMetaHtml(l, opts);
  const pts = opts.points == null ? pointsForLandmark(l) : opts.points;
  const ptsHtml = opts.hidePoints ? "" : (opts.done
    ? '<div class="place-pts done">'+uiIcon("check",13)+pts.toLocaleString()+'</div>'
    : '<div class="place-pts">+'+pts.toLocaleString()+'</div>');
  const wished = myWishlist.includes(l.id);
  const wishBtn = opts.hideWish ? "" :
    '<button type="button" class="card-wish'+(wished?" active":"")+'" data-lm="'+l.id+'"'
    + ' aria-pressed="'+(wished?"true":"false")+'" aria-label="'+(wished?"הסר מרשימת המשאלות":"הוסף לרשימת המשאלות")+'">'
    + uiIcon("heart",17)+'</button>';
  return '<div class="mini-card place-card" data-id="'+l.id+'" role="button" tabindex="0" aria-label="'+l.name+'">'
    + '<div class="mini-thumb">'+thumb+'</div>'
    + '<div class="mini-info"><div class="name">'+l.name+'</div>'
    + meta
    + (opts.extra||"")
    + '</div>'
    + '<div class="card-side">'+ptsHtml+wishBtn+'</div>'
    + '</div>';
}
// מאזין-על אחד לכל כפתורי ה-favorite שבכרטיסים (§5). capture:true כדי שהלחיצה על הלב
// לא תיפול גם על onclick של הכרטיס עצמו (שמנווט ליעד) - בלי לגעת בשום wiring קיים.
document.addEventListener("click", (e)=>{
  const btn = e.target.closest(".card-wish");
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const id = btn.dataset.lm;
  const run = async ()=>{
    btn.disabled = true;
    const justAdded = await toggleWishlist(id);
    btn.disabled = false;
    btn.classList.toggle("active", justAdded);
    btn.setAttribute("aria-pressed", justAdded ? "true" : "false");
    btn.setAttribute("aria-label", justAdded ? "הסר מרשימת המשאלות" : "הוסף לרשימת המשאלות");
    if(justAdded){
      btn.classList.remove("wish-pop"); void btn.offsetWidth; btn.classList.add("wish-pop");
    }
  };
  if(!requireAuth("רוצה לשמור את המקום לפעם הבאה? צרו חשבון בחינם", run)) return;
  run();
}, true);

/* ============ RUNTIME STATE ============ */
let session = null, myProfile = null;
let LANDMARKS = [], lmById = {};
let visitCounts = {};
let myVisits = [];       // {id?, landmark_id, visited_at, photo_url, points_awarded, pending?}
let myWishlist = [];     // [landmark_id,...]
let followingSet = new Set();
let myTravelStatus = null;
let myGroups = [], activeGroupId = null, pendingGroupSwitch = false;
let boardTab = "leaders";
// userLoc היה בזיכרון בלבד: כל רענון מחק אותו, והנקודה נעלמה מהמפה עד שהמשתמש לחץ
// שוב על כפתור המיקום. שומרים את האחרון עם חותמת-זמן ומשחזרים אותו אם הוא עדיין טרי,
// כדי שהנקודה תהיה שם מיד עם פתיחת המפה. אימות-הקרבה של צ'ק-אין לא נוגע בזה - הוא
// לוקח מדידה טרייה משלו (preciseOnly) ולא מסתמך על הערך השמור.
const LAST_LOC_KEY = "magalim-last-loc";
const LAST_LOC_MAX_AGE = 24*3600*1000;
function restoreLastLoc(){
  try{
    const saved = JSON.parse(localStorage.getItem(LAST_LOC_KEY) || "null");
    if(!saved || typeof saved.lat!=="number" || typeof saved.lon!=="number") return null;
    if(Date.now() - (saved.at||0) > LAST_LOC_MAX_AGE) return null;
    return { lat:saved.lat, lon:saved.lon, accuracy:saved.accuracy, at:saved.at,
             manual:!!saved.manual, approx:!!saved.approx };
  }catch(e){ return null; }
}
function saveLastLoc(){
  if(!userLoc) return;
  if(!userLoc.at) userLoc.at = Date.now();
  try{ localStorage.setItem(LAST_LOC_KEY, JSON.stringify(userLoc)); }catch(e){}
}
// מיקום שנשמר מהפעם הקודמת הוא נקודת-פתיחה סבירה, אבל הוא לא "המיקום שלך עכשיו".
// אחרי חמש דקות הוא כבר עלול להיות במרחק נסיעה שלם, ולכן הוא מצויר אחרת - אפור
// ומקווקו במקום כחול מלא - עד שמגיעה מדידה טרייה שמחליפה אותו.
const LOCATION_FRESH_MS = 5*60*1000;
function isFreshFix(loc){ return !!(loc && loc.at && Date.now()-loc.at < LOCATION_FRESH_MS); }
let userLoc = restoreLastLoc();
function defaultFilters(){ return { cats:[], diffs:[], regions:[], maxDist:400, duration:null, season:null, family:false, dog:false, water:false, accessible:false, free:false, customIds:null, customLabel:null }; }
let filters = defaultFilters();
let prevBadgeSet = new Set();
// badge_id -> unlocked_at. נטען ב-loadMyConquestsAndBonuses, ריק כשאין חיבור/טבלה.
let myBadgeDates = {};
// חותמות שנפתחו בסשן הזה - מקבלות הדגשה + אנימציית הטבעה בפעם הראשונה שהן מוצגות.
let freshStamps = new Set();
let lbPeriod="week";
let profileListTab="visited";
const PENDING_KEY = "magalim-pending-checkins-v1";

// App Essentials Phase 0F, Round 5 - לוגינג שגיאות-קליינט אמיתי: window.onerror/
// unhandledrejection נכתבים ל-client_errors (fire-and-forget, לא חוסם כלום). דה-דופ לפי
// חתימת-שגיאה בתוך sessionStorage כדי לא להציף בלולאת-שגיאות חוזרת, מוגבל ל-20 דיווחים
// לסשן. אם הטבלה עוד לא קיימת (migration טרם רצה) - נכשל בשקט כרגיל כל טבלה חדשה בשיחה הזו.
let clientErrorCount = 0;
function reportClientError(message, stack, url){
  if(clientErrorCount>=20) return;
  const sig = String(message||"").slice(0,200);
  if(!sig) return;
  let seen = [];
  try{ seen = JSON.parse(sessionStorage.getItem("magalim-reported-errors")||"[]"); }catch(e){}
  if(seen.includes(sig)) return;
  seen.push(sig);
  try{ sessionStorage.setItem("magalim-reported-errors", JSON.stringify(seen.slice(-30))); }catch(e){}
  clientErrorCount++;
  supabase.from("client_errors").insert({
    user_id: session ? session.user.id : null,
    message: sig,
    stack: stack ? String(stack).slice(0,4000) : null,
    url: url || location.href,
  }).then(()=>{}, ()=>{});
}
window.addEventListener("error", e=>{
  reportClientError(e.message, e.error && e.error.stack, location.href);
});
window.addEventListener("unhandledrejection", e=>{
  const reason = e.reason;
  reportClientError(reason && reason.message ? reason.message : String(reason), reason && reason.stack, location.href);
});

// App Essentials Phase 0F, Round 6 - תשתית אנליטיקס אמיתית: track() כותב ל-analytics_events
// (fire-and-forget, graceful אם migration טרם רצה). session_id נוצר פעם אחת ונשמר ל-sessionStorage
// (לא מזהה-משתמש - רק לקבץ אירועים מאותה טעינת-דף). מוחל רק על סט מצומצם ואמיתי של אירועים
// שכבר קורים בפועל באפליקציה, לא רשימה תיאורטית.
function getAnalyticsSessionId(){
  let sid = null;
  try{ sid = sessionStorage.getItem("magalim-session-id"); }catch(e){}
  if(!sid){
    sid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random().toString(36).slice(2));
    try{ sessionStorage.setItem("magalim-session-id", sid); }catch(e){}
  }
  return sid;
}
function track(eventName, payload){
  supabase.from("analytics_events").insert({
    user_id: session ? session.user.id : null,
    session_id: getAnalyticsSessionId(),
    event_name: eventName,
    payload: payload || {},
  }).then(()=>{}, ()=>{});
}

/* ============ HELPERS ============ */
function $(id){ return document.getElementById(id); }

/* ============ נגישות לקורא מסך ============ */
// זו אפליקציית עמוד-אחד: החלפת מסך או הודעת שגיאה מחליפות DOM בלי טעינת עמוד,
// וקורא מסך לא מבחין בזה בכלל. הזרקת טקסט לאזור aria-live היא הדרך היחידה
// לספר למשתמש עיוור שמשהו קרה.
const VIEW_TITLES = { home:"בית", map:"מפה", saved:"מקומות שמורים", board:"המסע שלנו", profile:"פרופיל" };
let announceTimer = null;
function announce(message, urgent){
  const el = $(urgent ? "srAlert" : "srAnnouncer");
  if(!el || !message) return;
  // ריקון לפני הכתיבה: אותה הודעה פעמיים ברצף לא תוכרז שוב אם הטקסט לא השתנה
  el.textContent = "";
  clearTimeout(announceTimer);
  announceTimer = setTimeout(()=>{ el.textContent = message; }, 60);
}
// בלי העברת פוקוס הקורא נשאר על הכפתור שנלחץ וממשיך להקריא את המסך הקודם,
// שכבר אינו מוצג. preventScroll כי resetViewScroll כבר מטפל בגלילה.
function focusView(view){
  const el = $("view-" + view);
  if(el) el.focus({ preventScroll:true });
}
function toast(msg, action){
  const el = $("toast");
  el.innerHTML = `<span style="flex:1;">${msg}</span>`;
  if(action){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.style.cssText = "background:none;border:none;color:inherit;font-weight:800;text-decoration:underline;cursor:pointer;flex:none;padding:0;font-size:inherit;font-family:inherit;";
    btn.onclick = ()=>{ el.classList.remove("show"); clearTimeout(toast._t); action.onClick(); };
    el.appendChild(btn);
  }
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.classList.remove("show"), action ? 4500 : 3400);
  // ה-toast הוא ערוץ המשוב המרכזי, והוא ויזואלי בלבד. מוכרז דרך announce ולא
  // דרך aria-live על האלמנט עצמו, שאחרת שתי הכתיבות (הטקסט ואז כפתור הפעולה)
  // מוכרזות פעמיים. el.textContent מפשיט את ה-HTML שיכול להגיע ב-msg.
  announce(el.textContent + (action ? ". " + action.label : ""));
}
async function submitFeedback(type, textareaEl){
  const message = textareaEl.value.trim();
  if(!message){ toast("נא לכתוב כמה מילים לפני השליחה"); return; }
  try{
    const { error } = await supabase.from("feedback_submissions").insert({
      user_id: session ? session.user.id : null, type, message,
    });
    if(error) throw error;
    textareaEl.value = "";
    textareaEl.closest("div").classList.add("hidden");
    toast(type==="bug" ? "✓ תודה, הדיווח נשלח" : "✓ תודה על הרעיון!");
  }catch(err){
    console.error(err);
    toast("לא הצלחנו לשלוח כרגע. נסה שוב.");
  }
}
async function renderLocationPermStatus(){
  const el = $("locationPermStatus"); if(!el) return;
  // תמיד, לא רק במסלול שבו navigator.permissions קיים - אחרת הכפתור נשאר מוסתר
  // בדיוק בדפדפנים שבהם המיקום הידני הכי נחוץ
  const clearBtn = $("locationClearManualBtn");
  if(clearBtn) clearBtn.classList.toggle("hidden", !(userLoc && (userLoc.manual || userLoc.approx)));
  const liveToggle = $("liveTrackingToggle");
  if(liveToggle) liveToggle.checked = wantsLiveLocation();
  if(!navigator.permissions || !navigator.permissions.query){
    el.textContent = "לא ניתן לבדוק את מצב ההרשאה בדפדפן הזה.";
    el.style.color = "var(--text-muted)";
    return;
  }
  try{
    const status = await navigator.permissions.query({ name:"geolocation" });
    const labels = {
      granted: "✓ הרשאה פעילה",
      prompt: "עדיין לא התבקשה — תתבקשו כשתשתמשו בתכונה שדורשת מיקום",
      denied: "✕ חסומה — כדי לאפשר, יש לשנות את הרשאת המיקום עבור האתר בהגדרות הדפדפן/מכשיר",
    };
    el.textContent = labels[status.state] || status.state;
    el.style.color = status.state==="denied" ? "var(--danger)" : status.state==="granted" ? "var(--success)" : "var(--text-muted)";
    const help = $("locationDeniedHelp");
    if(help){
      // code 1 בזמן ש"ההרשאה עוד לא נשאלה" = החסימה היא מתחת לדפדפן, לא באתר
      const osBlocked = status.state==="prompt" && lastGeoError && lastGeoError.code===1;
      help.classList.toggle("hidden", !(status.state==="denied" || osBlocked));
      if(status.state==="denied") help.innerHTML = deniedHelpHtml();
      else if(osBlocked){
        help.innerHTML = osBlockHelpHtml();
        const openBtn = $("openInBrowserBtn");
        if(openBtn) openBtn.onclick = openInPlainBrowser;
      }
    }
  }catch(e){
    el.textContent = "לא ניתן לבדוק את מצב ההרשאה בדפדפן הזה.";
    el.style.color = "var(--text-muted)";
  }
}
// ‏getCurrentPosition עם enableHighAccuracy נופל בקלות ל-timeout על אנדרואיד בתוך מבנים:
// ה-GPS מנסה לנעול לוויינים ונכשל, גם כשהרשת/Wi-Fi היו נותנות מיקום טוב בהרבה ממספיק
// כדי לסמן נקודה על מפה. 8 שניות היו קצרות מדי, וכל שלושת מסלולי-האיתור הציגו את אותה
// הודעה ("יש לאשר גישה למיקום") לכל סוגי הכישלון - כלומר שלחו את המשתמש להגדרות
// הדפדפן גם כשההרשאה הייתה תקינה לגמרי והבעיה הייתה קליטה. עכשיו: ניסיון מדויק, ואם
// נגמר הזמן ניסיון שני גס ומהיר לפני שמוותרים, והודעה לפי סוג הכישלון בפועל.
const GEO_MESSAGES = {
  1: 'הגישה למיקום חסומה — יש לאפשר "מיקום" עבור האתר בהגדרות הדפדפן ולנסות שוב',
  2: "לא הצלחנו לקבל מיקום מהמכשיר — בדקו ששירותי המיקום (GPS) פעילים",
  3: "לוקח יותר מדי זמן לאתר מיקום — נסו שוב בחוץ או ליד חלון",
};
function geoErrorMessage(err){
  return (err && GEO_MESSAGES[err.code]) || "לא הצלחנו לאתר מיקום כרגע";
}
// נשמר כדי שמסך-האבחון יוכל להראות מה באמת קרה בפעם האחרונה. בלי זה כל מה שיש הוא
// "לא עובד", ואין דרך לדעת אם הדפדפן סירב, ה-GPS לא נעל, או שבכלל לא נשאלה שאלה.
let lastGeoError = null, lastGeoFix = null;
function noteGeoError(err){ lastGeoError = { code: err && err.code, message: err && err.message, at: Date.now() }; }
function noteGeoFix(pos){ lastGeoFix = { accuracy: pos.coords.accuracy, at: Date.now() }; }
// onOk מקבל את ה-position המקורי; userLoc מתעדכן כאן, כדי ששלושת המסלולים לא יעשו
// את זה כל אחד בדרכו. opts.preciseOnly מוותר על ניסיון-הגיבוי הגס ועל מיקום מהקאש -
// לאימות-קרבה של צ'ק-אין (1500 מ') מיקום גס או ישן הוא לא ראיה טובה מספיק.
function locateUser(onOk, onFail, opts){
  opts = opts || {};
  if(!navigator.geolocation){ onFail({ code:2 }); return; }
  const accept = pos=>{
    noteGeoFix(pos);
    userLoc = { lat:pos.coords.latitude, lon:pos.coords.longitude, accuracy:pos.coords.accuracy, at:Date.now() };
    saveLastLoc();
    onOk(pos);
  };
  const reject = err=>{ noteGeoError(err); onFail(err); };
  navigator.geolocation.getCurrentPosition(accept, err=>{
    if(opts.preciseOnly || err.code!==3){ reject(err); return; }
    navigator.geolocation.getCurrentPosition(accept, reject,
      { enableHighAccuracy:false, timeout:10000, maximumAge:300000 });
  }, { enableHighAccuracy:true, timeout:opts.preciseOnly?15000:12000, maximumAge:opts.preciseOnly?0:60000 });
}

// מעקב-מיקום חי. עד עכשיו היה כאן רק getCurrentPosition חד-פעמי: המשתמש היה צריך
// לדעת שקיים כפתור-כוונת בפינת המפה, ללחוץ עליו, ולחזור וללחוץ אחרי כל תזוזה - אחרת
// הנקודה נשארה קפואה במקום שבו הוא היה כשלחץ. עכשיו watchPosition מעדכן אותה ברציפות
// כל עוד המפה פתוחה.
//
// המעקב נעצר ביציאה מהמפה וכשהלשונית מוסתרת (watchPosition עם enableHighAccuracy מדליק
// את ה-GPS ומרוקן סוללה), וחוזר מעצמו בכניסה הבאה. ההעדפה נשמרת, וכשההרשאה כבר ניתנה
// המעקב מתחיל לבד - בלי לבקש הרשאה מחדש ובלי לחכות ללחיצה.
const LOC_WATCH_KEY = "magalim-loc-live";
let locWatchId = null;
let locTrackingOn = false;
function wantsLiveLocation(){
  try{ return localStorage.getItem(LOC_WATCH_KEY) === "1"; }catch(e){ return false; }
}
function setWantsLiveLocation(on){
  try{ localStorage.setItem(LOC_WATCH_KEY, on ? "1" : "0"); }catch(e){}
}
// כפתור-הכוונת הוא אייקון בלי תווית בפינה; title/aria-label לא נראים במגע, ומשתמש
// שחיפש "איפה מציגים את המיקום שלי" פשוט לא מצא אותו. בועה חד-פעמית מצביעה עליו
// כשההרשאה עוד לא ניתנה. לא מבקשים הרשאה מעצמנו בטעינה - זה חייב לבוא מלחיצה.
const LOC_HINT_KEY = "magalim-loc-hint";
function dismissLocateHint(){
  const el = $("locateHint"); if(el) el.classList.add("hidden");
  try{ localStorage.setItem(LOC_HINT_KEY, "1"); }catch(e){}
}
async function maybeShowLocateHint(){
  const el = $("locateHint"); if(!el || !navigator.geolocation) return;
  let seen = false;
  try{ seen = localStorage.getItem(LOC_HINT_KEY) === "1"; }catch(e){}
  if(seen || locTrackingOn || userLoc) return;
  if(navigator.permissions && navigator.permissions.query){
    try{
      const status = await navigator.permissions.query({ name:"geolocation" });
      if(status.state !== "prompt") return;
    }catch(e){}
  }
  el.classList.remove("hidden");
}
function setLocateBtnState(state){
  const btn = $("locateBtn"); if(!btn) return;
  btn.classList.toggle("busy", state==="locating");
  btn.classList.toggle("live", state==="live");
  const label = state==="live" ? "המיקום שלי — מעקב פעיל, לחצו למרכוז ורענון"
    : state==="locating" ? "מאתר מיקום..." : "הצג את המיקום שלי";
  btn.setAttribute("aria-label", label);
  btn.setAttribute("aria-pressed", String(state==="live"));
  btn.title = label;
}
function startLocationWatch(opts){
  opts = opts || {};
  if(!navigator.geolocation) return;
  locTrackingOn = true;
  if(locWatchId!=null) return;
  let firstFix = true;
  setLocateBtnState(userLoc ? "live" : "locating");
  locWatchId = navigator.geolocation.watchPosition(pos=>{
    noteGeoFix(pos);
    userLoc = { lat:pos.coords.latitude, lon:pos.coords.longitude, accuracy:pos.coords.accuracy, at:Date.now() };
    saveLastLoc();
    renderUserLocation();
    setLocateBtnState("live");
    if(firstFix){
      firstFix = false;
      if(opts.recenter && leafletMap) leafletMap.setView([userLoc.lat, userLoc.lon], Math.max(leafletMap.getZoom(), 12));
      if(opts.announce) toast("המיקום שלך מוצג על המפה");
      $("distHint").textContent = "המיקום שלך אותר — ניתן לסנן לפי מרחק נסיעה";
      syncFilterUI();
    }
  }, err=>{
    noteGeoError(err);
    // timeout/unavailable הם רעש רגיל תוך כדי מעקב - ה-watch ממשיך לנסות. רק סירוב
    // הרשאה הוא סופי, ורק אז מכבים ומודיעים.
    if(err.code===1){
      stopLocationWatch();
      setWantsLiveLocation(false);
      locTrackingOn = false;
      setLocateBtnState("off");
      explainGeoFailure(err).then(msg=> toast(msg, { label:"מה לעשות?", onClick:()=> openSettingsAtLocation() }));
    } else if(opts.announce && firstFix){
      firstFix = false;
      setLocateBtnState(userLoc ? "live" : "off");
      toast(geoErrorMessage(err));
    }
  }, { enableHighAccuracy:true, timeout:20000, maximumAge:5000 });
}
function stopLocationWatch(){
  if(locWatchId!=null){ navigator.geolocation.clearWatch(locWatchId); locWatchId = null; }
}
// נקרא בכל כניסה למפה: ממשיך מעקב שהמשתמש כבר ביקש, או מתחיל לבד אם ההרשאה כבר
// ניתנה בעבר (אין טעם להמתין ללחיצה על משהו שכבר אושר).
async function resumeLocationTracking(){
  if(!navigator.geolocation || locWatchId!=null) return;
  if(wantsLiveLocation()){ startLocationWatch(); return; }
  if(!navigator.permissions || !navigator.permissions.query) return;
  try{
    const status = await navigator.permissions.query({ name:"geolocation" });
    if(status.state === "granted"){ setWantsLiveLocation(true); startLocationWatch(); }
  }catch(e){}
}
// באג שדווח: הכפתור היה מתג, והמעקב מתחיל מעצמו בכניסה למפה - כך שהלחיצה הראשונה
// על "המיקום שלי" דווקא כיבתה אותו ("מעקב המיקום כובה"). גרוע מזה, הכיבוי גם ביטל
// את ההעדפה, כך שהמעקב לא חזר יותר, והנקודה נתקעה על המדידה הישנה שהוצגה בפתיחה.
// שני הסימפטומים היו תקלה אחת. עכשיו הכפתור עושה מה שכפתור-מיקום עושה בכל אפליקציית
// מפות: מאתר ומרכז. כיבוי המעקב עבר למתג ייעודי בהגדרות, שם הוא פעולה מכוונת.
function recenterOnUser(){
  if(!userLoc || !leafletMap) return;
  leafletMap.setView([userLoc.lat, userLoc.lon], Math.max(leafletMap.getZoom(), 12));
}
function handleLocateTap(){
  setWantsLiveLocation(true);
  if(!locTrackingOn || locWatchId==null){
    startLocationWatch({ recenter:true, announce:true });
    return;
  }
  // המעקב כבר רץ: מרכזים מיד על מה שיש, ובמקביל מבקשים מדידה טרייה - כי מה שמוצג
  // עשוי להיות המדידה ששוחזרה מהפעם הקודמת ולא המיקום הנוכחי
  recenterOnUser();
  setLocateBtnState("locating");
  locateUser(()=>{
    renderUserLocation();
    recenterOnUser();
    setLocateBtnState("live");
  }, err=>{
    setLocateBtnState(userLoc ? "live" : "off");
    explainGeoFailure(err).then(msg=> toast(msg, { label:"מה לעשות?", onClick:()=> openSettingsAtLocation() }));
  });
}
function setLiveTracking(on){
  setWantsLiveLocation(on);
  if(on){ startLocationWatch({ announce:true }); return; }
  stopLocationWatch();
  locTrackingOn = false;
  setLocateBtnState(userLoc ? "off" : "off");
  toast("מעקב המיקום כובה — הנקודה לא תתעדכן עד שתדליקו שוב");
}
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden) stopLocationWatch();
  else if(locTrackingOn && currentView==="map") startLocationWatch();
});

// ---- אבחון מיקום + מיקום ידני ----
//
// אין דרך לאפליקציית-web לעקוף את הרשאת-המיקום של הדפדפן ולאשר מיקום "מבפנים" -
// ההרשאה נאכפת על-ידי הדפדפן ומערכת-ההפעלה, וכל כפתור באפליקציה יכול לכל היותר
// לפתוח את אותה בקשה עצמה. מה שכן אפשר, וזה מה שיש כאן:
//   1. להראות בדיוק מה מצב ההרשאה ומה הייתה השגיאה האחרונה, במקום לנחש
//   2. לתת הוראות-שחזור מדויקות כשההרשאה חסומה (אז הדפדפן כבר לא ישאל שוב לבד)
//   3. לאפשר לסמן מיקום ידנית על המפה, כדי שמי שה-GPS שלו לא עובד עדיין יוכל
//      להשתמש בסינון לפי מרחק וב"מה עושים היום". מיקום ידני מסומן ככזה ולעולם אינו
//      מתקבל כאימות-קרבה לצ'ק-אין - שם נדרשת מדידה טרייה מהמכשיר.
function inIframe(){ try{ return window.self !== window.top; }catch(e){ return true; } }
async function geoPermissionState(){
  if(!navigator.permissions || !navigator.permissions.query) return "unknown";
  try{ return (await navigator.permissions.query({ name:"geolocation" })).state; }
  catch(e){ return "unknown"; }
}
function ago(ts){
  if(!ts) return "—";
  const sec = Math.round((Date.now()-ts)/1000);
  return sec < 60 ? `לפני ${sec} שנ׳` : `לפני ${Math.round(sec/60)} דק׳`;
}
async function geoDiagnostics(){
  const lines = [
    "APP_VERSION: " + APP_VERSION,
    "secureContext: " + (window.isSecureContext ? "yes" : "NO (geolocation is blocked)"),
    "protocol: " + location.protocol,
    "geolocation API: " + (navigator.geolocation ? "present" : "MISSING"),
    "permission: " + await geoPermissionState(),
    "in iframe: " + (inIframe() ? "YES (needs allow=\"geolocation\")" : "no"),
    "display-mode: " + (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches ? "standalone (installed)" : "browser"),
    "online: " + (navigator.onLine ? "yes" : "no"),
    "live watch: " + (locWatchId!=null ? "running" : locTrackingOn ? "wanted, not running" : "off"),
    "userLoc: " + (userLoc ? `${userLoc.lat.toFixed(4)}, ${userLoc.lon.toFixed(4)} ${userLoc.manual ? "(manual)" : userLoc.approx ? "(network, approx)" : `±${Math.round(userLoc.accuracy||0)}m (gps)`}` : "none"),
    "last fix: " + (lastGeoFix ? `${ago(lastGeoFix.at)} ±${Math.round(lastGeoFix.accuracy||0)}m` : "never"),
    "last error: " + (lastGeoError ? `code ${lastGeoError.code} (${lastGeoError.message||""}) ${ago(lastGeoError.at)}` : "none"),
    "userAgent: " + navigator.userAgent,
  ];
  return lines.join("\n");
}
async function showLocationDiagnostics(){
  const box = $("locationDiag");
  box.textContent = await geoDiagnostics();
  box.classList.remove("hidden");
  $("locationCopyBtn").classList.remove("hidden");
}
function runLocationTest(){
  const box = $("locationDiag");
  box.classList.remove("hidden");
  $("locationCopyBtn").classList.remove("hidden");
  box.textContent = "בודק... (עד 15 שניות)";
  const started = Date.now();
  locateUser(pos=>{
    box.textContent = `OK after ${Date.now()-started}ms\n`
      + `lat ${pos.coords.latitude.toFixed(5)}, lon ${pos.coords.longitude.toFixed(5)}\n`
      + `accuracy ±${Math.round(pos.coords.accuracy)}m`;
    renderUserLocation();
    renderLocationPermStatus();
    toast("המיקום אותר — הנקודה מוצגת על המפה");
  }, async err=>{
    box.textContent = `FAILED after ${Date.now()-started}ms\ncode ${err && err.code} — ${await explainGeoFailure(err)}\n\n`
      + await geoDiagnostics();
    renderLocationPermStatus();
  });
}
// חתימה שראינו בפועל: getCurrentPosition נכשל תוך 5 מילישניות עם code 1
// ("User denied Geolocation") בזמן שה-Permissions API מדווח שההרשאה לאתר עדיין
// "prompt". כלומר אף אחד לא שאל את המשתמש - הדפדפן לא הספיק להציג בקשה, כי הבקשה
// נחסמה מתחתיו: הרשאת-המיקום של מערכת-ההפעלה לאפליקציה (או שירותי-המיקום של המכשיר
// עצמו) כבויה. זה נפוץ במיוחד באפליקציה מותקנת (WebAPK), שמקבלת חבילת-אנדרואיד
// משלה ועם זה הרשאות-ריצה משלה - נפרדות מאלה של הדפדפן.
//
// זה משנה את התשובה לגמרי: ההודעה "אפשרו מיקום לאתר בהגדרות הדפדפן" שולחת את
// המשתמש למקום שבו אין מה לתקן.
async function geoBlockScope(){
  const state = await geoPermissionState();
  if(state === "denied") return "site";
  if(state === "prompt") return "os";
  return "unknown";
}
async function explainGeoFailure(err){
  if(!err || err.code !== 1) return geoErrorMessage(err);
  return (await geoBlockScope()) === "os"
    ? "המכשיר חוסם מיקום עבור האפליקציה — צריך לאשר בהגדרות המכשיר, לא בדפדפן"
    : geoErrorMessage(err);
}
function osBlockHelpHtml(){
  const installed = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  const appName = installed ? "מגלים" : "הדפדפן (Chrome)";
  return '<strong>הבקשה נחסמה מתחת לדפדפן, לא באתר.</strong> הדפדפן דיווח שההרשאה לאתר '
    + 'עדיין לא נשאלה, ובכל זאת הבקשה נדחתה מיד — כלומר שירותי-המיקום של המכשיר כבויים, '
    + 'או שהרשאת המיקום של האפליקציה עצמה לא ניתנה. כך מתקנים:'
    + "<ol>"
    + "<li>הגדרות המכשיר ← מיקום — לוודא שהוא דולק</li>"
    + `<li>הגדרות המכשיר ← אפליקציות ← <b>${appName}</b> ← הרשאות ← מיקום ← "אפשר"</li>`
    + (installed ? "<li>האפליקציה המותקנת מקבלת הרשאות-אנדרואיד משלה, נפרדות מאלה של Chrome — לכן צריך לאשר אותה בנפרד</li>"
                 : "")
    + "<li>לחזור לכאן וללחוץ שוב על \u0022בדיקת מיקום\u0022</li>"
    + "</ol>"
    + (installed ? '<b>בדיקה מהירה:</b> פתחו את האתר ב-Chrome רגיל (לא מהאייקון המותקן). '
                 + 'אם שם המיקום עובד — הבעיה היא בהרשאת-האנדרואיד של האפליקציה המותקנת.'
                 + '<div class="loc-actions"><button type="button" class="btn btn-outline btn-sm" id="openInBrowserBtn">פתיחה בדפדפן</button></div>' : "")
    + 'ובינתיים, אפשר לאתר לפי הרשת או לסמן ידנית על המפה, בכפתורים שלמעלה.';
}
function deniedHelpHtml(){
  const android = /Android/i.test(navigator.userAgent);
  const steps = android
    ? ["בשורת הכתובת של הדפדפן, לחצו על האייקון שמשמאל לכתובת (מנעול או סמל הגדרות)",
       'בחרו "הרשאות" או "Permissions", ואז "מיקום"',
       'שנו ל"אפשר" / "Allow"',
       "ודאו ששירותי המיקום של המכשיר דולקים (הגדרות ← מיקום)",
       "חזרו לכאן ולחצו על \u0022בדיקת מיקום\u0022"]
    : ["לחצו על אייקון המנעול/ההגדרות בשורת הכתובת",
       'שנו את הרשאת "מיקום" ל"אפשר"',
       "רעננו את הדף ולחצו על \u0022בדיקת מיקום\u0022"];
  return '<strong>הרשאת המיקום חסומה, ולכן הדפדפן כבר לא ישאל שוב מעצמו.</strong>'
    + ' אפליקציית-web לא יכולה לעקוף את זה מבפנים - ההרשאה נאכפת על-ידי הדפדפן. כך מחזירים אותה:'
    + "<ol>" + steps.map(x=>`<li>${x}</li>`).join("") + "</ol>"
    + 'אם אתם מעדיפים לא לאשר, אפשר לסמן מיקום ידנית על המפה בכפתור שלמעלה.';
}
// מהאפליקציה המותקנת, window.open עם _blank מוציא את הכתובת לדפדפן החיצוני. זו גם
// הבדיקה המפלה וגם מעקף מיידי: אם החסימה היא בהרשאת-האנדרואיד של האפליקציה המותקנת
// (חבילה נפרדת עם הרשאות-ריצה משלה), ב-Chrome עצמו המיקום עשוי לעבוד בלי שום שינוי
// בהגדרות. את ההרשאה עצמה שום קוד בדף לא יכול להעניק - היא נאכפת מחוץ לדפדפן.
function openInPlainBrowser(){
  window.open(location.origin + location.pathname + "#/map", "_blank", "noopener");
}
// קיצור מההודעה אל ההסבר המלא - בלעדיו המשתמש מקבל שורה אחת בלי מה לעשות איתה
function openSettingsAtLocation(){
  openSheet("settingsSheet","settingsScrim");
  renderLocationPermStatus();
  setTimeout(()=>{ const el = $("locationPermStatus"); if(el && el.scrollIntoView) el.scrollIntoView({ block:"start", behavior:"smooth" }); }, 80);
}
// --- מיקום מקורב לפי הרשת ---
//
// למה זה קיים בכלל: הדפדפן חושף בדיוק ממשק-מיקום אחד, navigator.geolocation, והוא
// זה שחסום. שילוש לפי Wi-Fi/אנטנות סלולריות אינו נגיש בנפרד - הוא מסופק דרך אותו
// ממשק עצמו. כלומר כשההרשאה חסומה, לא נשאר בדפדפן שום מקור-מיקום. מה שכן אפשר הוא
// לשאול שירות חיצוני "מאיפה הבקשה הזו הגיעה" לפי כתובת ה-IP.
//
// זה מקורב: ברמת עיר, ועל רשת סלולרית הוא עלול להצביע על שער-היציאה של המפעיל ולא
// על המשתמש - לפעמים עשרות קילומטרים משם. מספיק לסינון "יעדים עד 50 ק\"מ" ולהערכת
// זמן-נסיעה, לא מספיק ליותר מזה.
//
// יזום על-ידי המשתמש בלבד, לעולם לא אוטומטי: הבקשה חושפת את כתובת ה-IP לשירות
// החיצוני, וזו לא החלטה שנכון לקבל בשבילו בשקט. לשני הספקים יש CORS ואין צורך
// במפתח; אם הראשון נופל מנסים את השני, ואם שניהם נופלים נשארים עם הסימון הידני.
const IP_LOCATION_PROVIDERS = [
  { url:"https://ipwho.is/", parse: d => (d && d.success!==false && d.latitude!=null) ? { lat:d.latitude, lon:d.longitude, city:d.city } : null },
  { url:"https://ipapi.co/json/", parse: d => (d && !d.error && d.latitude!=null) ? { lat:d.latitude, lon:d.longitude, city:d.city } : null },
];
const APPROX_RADIUS_M = 15000;  // רדיוס-אי-ודאות מוצג. לא מדידה - הערכה שמרנית לרמת-עיר
async function fetchApproxLocation(){
  for(const provider of IP_LOCATION_PROVIDERS){
    try{
      const ctrl = new AbortController();
      const t = setTimeout(()=> ctrl.abort(), 6000);
      const res = await fetch(provider.url, { signal: ctrl.signal, cache:"no-store" });
      clearTimeout(t);
      if(!res.ok) continue;
      const parsed = provider.parse(await res.json());
      if(parsed) return parsed;
    }catch(e){ /* ספק נפל - ננסה את הבא */ }
  }
  return null;
}
async function useApproxLocation(){
  const btn = $("locationApproxBtn");
  setBtnLoading(btn, true, "מאתר...");
  const found = await fetchApproxLocation();
  setBtnLoading(btn, false);
  if(!found){
    toast("לא הצלחנו לאתר גם לפי הרשת — אפשר לסמן ידנית על המפה");
    return;
  }
  userLoc = { lat:found.lat, lon:found.lon, approx:true, accuracy:APPROX_RADIUS_M, at:Date.now() };
  saveLastLoc();
  renderUserLocation();
  syncFilterUI();
  $("distHint").textContent = "מיקום מקורב לפי הרשת — ניתן לסנן לפי מרחק נסיעה";
  renderLocationPermStatus();
  toast(found.city ? `מיקום מקורב נקבע (${found.city}). לצ׳ק-אין עדיין נדרש GPS אמיתי.`
                   : "מיקום מקורב נקבע. לצ׳ק-אין עדיין נדרש GPS אמיתי.");
}
// --- מיקום ידני ---
let pickingLocation = false;
function startManualLocationPick(){
  pickingLocation = true;
  $("mapWrap").classList.add("picking-location");
  $("manualLocBar").classList.remove("hidden");
  closeSheet("settingsSheet","settingsScrim");
  navigate("#/map");
}
function cancelManualLocationPick(){
  pickingLocation = false;
  const wrap = $("mapWrap"); if(wrap) wrap.classList.remove("picking-location");
  const bar = $("manualLocBar"); if(bar) bar.classList.add("hidden");
}
function setManualLocation(lat, lon){
  cancelManualLocationPick();
  userLoc = { lat, lon, manual:true, at:Date.now() };
  saveLastLoc();
  renderUserLocation();
  syncFilterUI();
  $("distHint").textContent = "מיקום ידני נקבע — ניתן לסנן לפי מרחק נסיעה";
  renderLocationPermStatus();
  toast("המיקום הידני נקבע. לצ׳ק-אין עדיין נדרש GPS אמיתי.");
}
function clearManualLocation(){
  if(!userLoc || !(userLoc.manual || userLoc.approx)) return;
  userLoc = null;
  try{ localStorage.removeItem(LAST_LOC_KEY); }catch(e){}
  renderUserLocation();
  renderLocationPermStatus();
  toast("המיקום הידני נמחק");
}

let retryHandlers = {}, retryHandlerSeq = 0;
function errorStateHtml(message, retryFn){
  const id = "r"+(retryHandlerSeq++);
  retryHandlers[id] = retryFn;
  return `<div class="empty-state"><div class="empty-title">${message}</div><button class="btn btn-outline empty-cta" data-retry="${id}" type="button">נסו שוב</button></div>`;
}
document.addEventListener("click", e=>{
  const btn = e.target.closest("[data-retry]");
  if(btn && retryHandlers[btn.dataset.retry]) retryHandlers[btn.dataset.retry]();
});
let reportSheetState = { reason:null, onSubmit:null };
function openReportSheet(title, reasons, onSubmit){
  reportSheetState = { reason:null, onSubmit };
  $("reportSheetTitle").textContent = title;
  $("reportMessageText").value = "";
  $("reportReasonChips").innerHTML = reasons.map(r=>`<button type="button" class="chip" data-reason="${r.id}">${r.label}</button>`).join("");
  $("reportReasonChips").querySelectorAll(".chip").forEach(chip=>{
    chip.onclick = ()=>{
      reportSheetState.reason = chip.dataset.reason;
      $("reportReasonChips").querySelectorAll(".chip").forEach(c=> c.classList.toggle("active", c===chip));
    };
  });
  openSheet("reportSheet","reportScrim");
}
const USER_REPORT_REASONS = [
  { id:"behavior", label:"התנהגות לא הולמת" },
  { id:"content", label:"תוכן פוגעני" },
  { id:"spam", label:"ספאם" },
  { id:"impersonation", label:"התחזות" },
  { id:"other", label:"אחר" },
];
const PLACE_REPORT_REASONS = [
  { id:"closed", label:"המקום סגור" },
  { id:"location", label:"המיקום במפה לא מדויק" },
  { id:"hours", label:"שעות פתיחה שגויות" },
  { id:"price", label:"מחיר לא נכון" },
  { id:"access", label:"המסלול/הגישה השתנו" },
  { id:"photo", label:"התמונה אינה נכונה" },
  { id:"other", label:"מידע אחר" },
];
let confirmResolve = null;
function confirmAction({ title, message, confirmLabel="אישור", cancelLabel="ביטול", destructive=false }){
  return new Promise(resolve=>{
    confirmResolve = resolve;
    $("confirmTitle").textContent = title;
    $("confirmMessage").textContent = message;
    $("confirmOkBtn").textContent = confirmLabel;
    $("confirmOkBtn").className = "btn btn-block "+(destructive ? "btn-danger" : "btn-primary");
    $("confirmCancelBtn").textContent = cancelLabel;
    openSheet("confirmSheet","confirmScrim", ()=>{
      closeSheet("confirmSheet","confirmScrim");
      const r = confirmResolve; confirmResolve = null; r && r(false);
    });
  });
}
function animateXpCount(el, target){
  if(!el) return;
  const start = performance.now();
  const dur = 650;
  function tick(now){
    const t = Math.min(1, (now-start)/dur);
    const val = Math.round(target*(1-Math.pow(1-t,3)));
    el.textContent = "+"+val.toLocaleString()+" נקודות";
    if(t<1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
// steps: [{photoUrl, icon, title, xp, sub, region, confetti}] - מוצגים ברצף אחד, קליק מקדם/סוגר.
// זה מחליף את הרצף הקודם של celebrate()+toast()ים מדורגים נפרדים לכל תג/רמה - עכשיו הכל
// באותו overlay אחד, קצר ואפשר לדלג עליו בהקשה בכל שלב.
function celebrate(steps){
  if(!steps || !steps.length) return;
  const overlay = $("celebrateOverlay");
  const card = $("celebrateCard");
  const reducedMotion = prefersReducedMotion();
  let i = 0;
  clearTimeout(celebrate._t);
  const dismiss = ()=>{
    clearTimeout(celebrate._t);
    overlay.classList.remove("show");
    setTimeout(()=> overlay.classList.add("hidden"), 220);
    overlay.onclick = null;
  };
  const renderStep = ()=>{
    const s = steps[i];
    // stampId מרנדר את החותמת עצמה נחתמת - אותו רכיב בדיוק שמופיע באוסף החותמות,
    // כדי שהרגע שבו זוכים בה נראה כמו הפריט שנוסף לאוסף ולא כמו אייקון אחר לגמרי.
    const hero = s.photoUrl
      ? `<div class="celebrate-hero"><img src="${s.photoUrl}" alt=""></div>`
      : s.stampId
        ? `<div class="celebrate-stamp${s.metal?" metal-"+s.metal:""}"><div class="stamp-face">${stampGlyph(badgeGlyphName(s.stampId), 44)}</div></div>`
        : s.levelIndex!=null
          ? `<div class="celebrate-level"><div class="stamp-face">${stampGlyph(levelGlyphName(s.levelIndex), 44)}</div></div>`
          : s.icon ? `<div class="celebrate-icon"><div class="stamp-face">${uiIcon(s.icon,44)}</div></div>` : "";
    const actionsHtml = s.actions
      ? `<div class="celebrate-actions">${s.actions.map((a,ai)=>`<button class="btn ${a.primary?"btn-primary":"btn-outline"}" data-action-i="${ai}">${a.label}</button>`).join("")}</div>`
      : "";
    // Gamification Overhaul, Phase 3 - שדות חדשים ואופציונליים (subtitle/tag/totalLine/
    // progress) על אותו celebrate() הקיים - לא מודל חדש. subtitle/tag משמשים גם לשם-היעד+
    // תג-קושי בכרטיס-הכיבוש הראשי וגם לרמה+שם-רמה בכרטיס עליית-הרמה (אותם primitives, שני
    // הקשרים). progress מרנדר פס-התקדמות-לרמה-הבאה בדיוק כמו בפרופיל (reuse .bar/.bar>i).
    const progressHtml = s.progress ? `
      <div class="celebrate-progress">
        <div class="celebrate-progress-top"><span class="lvl">${s.progress.levelLabel}</span><span class="num">${s.progress.isMax ? "רמה מקסימלית" : s.progress.current.toLocaleString()+" / "+s.progress.total.toLocaleString()}</span></div>
        <div class="bar"><i style="width:${s.progress.pct}%"></i></div>
        <div class="celebrate-progress-hint">${s.progress.hint}</div>
      </div>` : "";
    const tapHint = (!s.actions && i===steps.length-1) ? `<div class="celebrate-tap-hint">געו כדי להמשיך לגלות</div>` : "";
    card.innerHTML = hero
      + `<h2>${s.title}</h2>`
      + (s.subtitle ? `<div class="celebrate-subtitle">${s.subtitle}</div>` : "")
      + (s.tag ? `<div class="celebrate-tag">${s.tag}</div>` : "")
      + (s.xp!=null ? `<div class="celebrate-xp" id="celebrateXpNum">+0 נקודות</div>` : "")
      + (s.sub ? `<div class="celebrate-bonus">${s.sub}</div>` : "")
      + (s.totalLine ? `<div class="celebrate-total">${s.totalLine}</div>` : "")
      + (s.region ? `<div class="celebrate-region">${s.region}</div>` : "")
      + progressHtml
      + actionsHtml
      + tapHint;
    if(s.xp!=null) animateXpCount($("celebrateXpNum"), s.xp);
    if(s.haptic) haptic(s.haptic);
    if(s.confetti && !reducedMotion && window.confetti){
      window.confetti({ particleCount:60, spread:65, origin:{y:0.35}, scalar:0.9, ticks:150 });
    }
    if(s.actions){
      card.querySelectorAll("[data-action-i]").forEach(btn=>{
        btn.onclick = (e)=>{ e.stopPropagation(); s.actions[Number(btn.dataset.actionI)].onClick(); dismiss(); };
      });
    }
    clearTimeout(celebrate._t);
    celebrate._t = setTimeout(advance, s.actions ? 5000 : 1900);
  };
  const advance = ()=>{
    i++;
    if(i>=steps.length){ dismiss(); return; }
    renderStep();
  };
  overlay.classList.remove("hidden");
  overlay.offsetHeight; // force reflow so the class below actually transitions
  overlay.classList.add("show");
  overlay.onclick = advance;
  renderStep();
}
async function shareLink(url, title, text){
  if(navigator.share){
    try{ await navigator.share({ title, text, url }); track("share_used"); return; }catch(e){ if(e.name==="AbortError") return; }
  }
  try{ await navigator.clipboard.writeText(url); toast("הקישור הועתק — אפשר להדביק ולשלוח!"); track("share_used"); }
  catch(e){ toast("הקישור: "+url); }
}
function haversine(lat1,lon1,lat2,lon2){
  const R=6371, toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
// הערכת זמן נסיעה גסה ממרחק אווירי - קבוע מהירות ממוצע מוצהר כמשוער, לא נתון אמיתי מ-API ניווט
const EST_DRIVE_KMH = 55;
function estimateDriveMinutes(km){ return Math.max(1, Math.round(km/EST_DRIVE_KMH*60)); }
function kmForDriveMinutes(min){ return Math.round(min/60*EST_DRIVE_KMH); }

/* ============ WAZE NAVIGATION (shared) ============ */
// אותו מקור קואורדינטות בדיוק כמו ה-marker במפה (L.marker([l.lat,l.lon]) ב-renderMap) -
// כל קורא כאן מקבל landmark מ-lmById, כך שאין אפשרות לסטייה בין הסמן לניווט.
// אייקון ה-Waze הרשמי (simple-icons, monochrome via currentColor - לא הכחול של Waze עצמו,
// כדי שהכפתור יישאר בשפה הגרפית של האפליקציה ולא "ישתלט" ויזואלית).
const WAZE_ICON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M13.218 0C9.915 0 6.835 1.49 4.723 4.148c-1.515 1.913-2.31 4.272-2.31 6.706v1.739c0 .894-.62 1.738-1.862 1.813-.298.025-.547.224-.547.522-.05.82.82 2.31 2.012 3.502.82.844 1.788 1.515 2.832 2.036a3 3 0 0 0 2.955 3.528 2.966 2.966 0 0 0 2.931-2.385h2.509c.323 1.689 2.086 2.856 3.974 2.21 1.64-.546 2.36-2.409 1.763-3.924a12.84 12.84 0 0 0 1.838-1.465 10.73 10.73 0 0 0 3.18-7.65c0-2.882-1.118-5.589-3.155-7.625A10.899 10.899 0 0 0 13.218 0zm0 1.217c2.558 0 4.967.994 6.78 2.807a9.525 9.525 0 0 1 2.807 6.78A9.526 9.526 0 0 1 20 17.585a9.647 9.647 0 0 1-6.78 2.807h-2.46a3.008 3.008 0 0 0-2.93-2.41 3.03 3.03 0 0 0-2.534 1.367v.024a8.945 8.945 0 0 1-2.41-1.788c-.844-.844-1.316-1.614-1.515-2.11a2.858 2.858 0 0 0 1.441-.846 2.959 2.959 0 0 0 .795-2.036v-1.789c0-2.11.696-4.197 2.012-5.861 1.863-2.385 4.62-3.726 7.6-3.726zm-2.41 5.986a1.192 1.192 0 0 0-1.191 1.192 1.192 1.192 0 0 0 1.192 1.193A1.192 1.192 0 0 0 12 8.395a1.192 1.192 0 0 0-1.192-1.192zm7.204 0a1.192 1.192 0 0 0-1.192 1.192 1.192 1.192 0 0 0 1.192 1.193 1.192 1.192 0 0 0 1.192-1.193 1.192 1.192 0 0 0-1.192-1.192zm-7.377 4.769a.596.596 0 0 0-.546.845 4.813 4.813 0 0 0 4.346 2.757 4.77 4.77 0 0 0 4.347-2.757.596.596 0 0 0-.547-.845h-.025a.561.561 0 0 0-.521.348 3.59 3.59 0 0 1-3.254 2.061 3.591 3.591 0 0 1-3.254-2.061.64.64 0 0 0-.546-.348z"/></svg>';
function openWazeNavigation(latitude, longitude, destinationName){
  window.open(`https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`, "_blank", "noopener");
}
function wireWazeButton(btn, l){
  if(!btn || !l) return;
  const label = "נווט ל"+l.name+" באמצעות Waze";
  btn.innerHTML = WAZE_ICON_SVG;
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.onclick = (e)=>{ e.stopPropagation(); track("navigation_started", { landmark_id: l.id }); openWazeNavigation(l.lat, l.lon, l.name); };
}
function friendlyAuthError(msg){
  if(!msg) return "משהו השתבש. נסו שוב.";
  if(/Invalid login credentials/i.test(msg)) return "אימייל או סיסמה שגויים.";
  if(/User already registered/i.test(msg)) return "כבר יש חשבון עם האימייל הזה — נסו להתחבר.";
  if(/Password should be at least/i.test(msg)) return "הסיסמה חייבת להכיל לפחות 6 תווים.";
  if(/Unable to validate email/i.test(msg)) return "כתובת האימייל לא תקינה.";
  if(/registration_disabled/i.test(msg)) return "ההרשמה סגורה כרגע.";
  if(/registration_full/i.test(msg)) return "הגענו כרגע למכסת המשתמשים של גרסת הבטא. נסו שוב מאוחר יותר.";
  if(/invite_required/i.test(msg)) return "כרגע אפשר להירשם רק עם קישור הזמנה תקף.";
  if(/provider is not enabled/i.test(msg)) return "ההתחברות עם השירות הזה עוד לא זמינה. נסו עם אימייל וסיסמה.";
  return msg;
}

/* ============ AUTH ============ */
let authMode = "login";
$("tabLogin").onclick = ()=>{ setAuthMode("login"); showAuthTabs(); };
$("tabSignup").onclick = async ()=>{
  setAuthMode("signup");
  showAuthTabs();
  if(sessionStorage.getItem("pendingInviteCode")) return; // יש קישור הזמנה בהמתנה — מדלגים על הבדיקה, ה-trigger באמת יאמת את זה
  const gate = await checkRegistrationGate();
  if(!gate.open) showWaitlistView(gate.reason);
};

/* ============ WAITLIST (Phase 8) ============ */
async function checkRegistrationGate(){
  try{
    const { data, error } = await supabase.rpc("get_registration_status");
    if(error || !data) return { open:true };
    if(!data.registration_enabled) return { open:false, reason:"disabled" };
    if(data.is_full) return { open:false, reason:"full" };
    if(data.invite_only) return { open:false, reason:"invite_only" };
    return { open:true };
  }catch(err){ return { open:true }; }
}
const WAITLIST_COPY = {
  full: { title:"הגענו כרגע למכסת המשתמשים של גרסת הבטא", sub:"אנחנו פותחים מקומות חדשים בהדרגה כדי לוודא שהחוויה נשארת מהירה ואיכותית.\nרוצים שנעדכן אתכם כשייפתח מקום?" },
  disabled: { title:"ההרשמה סגורה כרגע", sub:"אנחנו עדיין לא פתוחים לציבור הרחב.\nרוצים שנעדכן אתכם כשההרשמה תיפתח?" },
  invite_only: { title:"ההרשמה כרגע פתוחה רק בהזמנה", sub:"בשלב הזה אפשר להצטרף רק עם קישור הזמנה מחבר.\nרוצים שנעדכן אתכם כשההרשמה תיפתח לכולם?" },
};
function showWaitlistView(reason){
  const copy = WAITLIST_COPY[reason] || WAITLIST_COPY.full;
  $("waitlistTitle").textContent = copy.title;
  $("waitlistSub").textContent = copy.sub;
  $("waitlistError").classList.remove("show");
  $("waitlistNote").classList.remove("show");
  showAuthView("waitlist");
}
function showAuthTabs(){
  $("oauthRow").classList.remove("hidden");
  $("oauthDivider").classList.remove("hidden");
  $("authForm").classList.remove("hidden");
  showAuthView("form");
}
/* ============ AUTH VIEWS (§1-§5) ============ */
// שכבת-תצוגה בלבד מעל מנגנון ה-auth הקיים: אותו authMode, אותו authForm, אותם handlers
// של Google/Facebook/שחזור-סיסמה/רשימת-המתנה. רק הניווט בין המסכים הוא חדש.
const AUTH_VIEWS = { welcome:"authViewWelcome", form:"authViewForm", reset:"resetPasswordForm", waitlist:"waitlistView" };
let authView = "form";
function showAuthView(name){
  authView = name;
  Object.entries(AUTH_VIEWS).forEach(([k,id])=> $(id).classList.toggle("hidden", k!==name));
  // "חזרה" רלוונטי רק כשהגענו לטופס ממסך ה-Welcome
  $("authBackBtn").classList.toggle("hidden", name!=="form" || !authCameFromWelcome);
}
let authCameFromWelcome = false;
function setAuthMode(mode){
  authMode = mode;
  const signup = mode==="signup";
  $("authTitle").textContent = signup ? "יוצאים לדרך" : "טוב לראות אתכם שוב";
  $("authIntroText").textContent = authGateMessage || (signup ? "צרו חשבון והתחילו לגלות את ישראל" : "התחברו כדי להמשיך במסע");
  $("authSubmit").textContent = signup ? "יצירת חשבון" : "התחברות";
  $("nameField").classList.toggle("hidden", !signup);
  $("forgotPasswordLink").classList.toggle("hidden", signup);
  $("oauthDividerText").textContent = signup ? "או המשיכו עם" : "או התחברו עם";
  $("authSwitchText").textContent = signup ? "כבר יש לכם חשבון?" : "עדיין אין לכם חשבון?";
  $("authSwitchBtn").textContent = signup ? "התחברו" : "הירשמו";
  $("authPassword").setAttribute("autocomplete", signup ? "new-password" : "current-password");
  $("tabLogin").classList.toggle("active", !signup);
  $("tabSignup").classList.toggle("active", signup);
  clearAuthErrors();
}
function clearAuthErrors(){
  $("authError").classList.remove("show");
  $("authNote").classList.remove("show");
  ["authName","authEmail","authPassword"].forEach(id=>{
    $(id).classList.remove("invalid");
    const err = $(id+"Err"); if(err) err.classList.remove("show");
  });
}
function setFieldError(id, message){
  const field = $(id), err = $(id+"Err");
  field.classList.add("invalid");
  field.setAttribute("aria-invalid","true");
  if(err){ err.innerHTML = uiIcon("flame",13)+"<span>"+message+"</span>"; err.classList.add("show"); }
}
// ולידציה בצד הלקוח רק למה שאפשר לבדוק בוודאות. דרישת הסיסמה נלקחת מה-minlength שכבר
// מוגדר בשדה (6) - לא ממציאים כללים שהשרת לא אוכף.
function validateAuthForm(){
  clearAuthErrors();
  let ok = true;
  const name = $("authName").value.trim();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  if(authMode==="signup" && !name){ setFieldError("authName","צריך שם כדי שנדע איך לפנות אליכם"); ok = false; }
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setFieldError("authEmail","כתובת האימייל לא נראית תקינה"); ok = false; }
  const minLen = Number($("authPassword").getAttribute("minlength")) || 6;
  if(!password || password.length < minLen){ setFieldError("authPassword","הסיסמה צריכה להכיל לפחות "+minLen+" תווים"); ok = false; }
  if(!ok){ const first = document.querySelector(".text-input.invalid"); if(first) first.focus(); }
  return ok;
}
function setBtnLoading(btn, loading, label){
  if(!btn) return;
  if(loading){ btn.dataset.label = btn.textContent; btn.textContent = label || btn.textContent; btn.classList.add("is-loading"); btn.disabled = true; }
  else { if(btn.dataset.label) btn.textContent = btn.dataset.label; btn.classList.remove("is-loading"); btn.disabled = false; }
}
const EYE_OPEN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3.2"/></svg>';
const EYE_OFF = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l16 16"/><path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.4 4.1M6.4 7.9A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5"/></svg>';
function wireAuthViews(){
  $("authPasswordEye").innerHTML = EYE_OPEN;
  $("authPasswordEye").onclick = ()=>{
    const input = $("authPassword");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    $("authPasswordEye").innerHTML = show ? EYE_OFF : EYE_OPEN;
    $("authPasswordEye").setAttribute("aria-pressed", show ? "true" : "false");
    $("authPasswordEye").setAttribute("aria-label", show ? "הסתרת הסיסמה" : "הצגת הסיסמה");
  };
  $("welcomeStartBtn").onclick = ()=>{ authCameFromWelcome = true; $("tabSignup").click(); };
  $("welcomeLoginBtn").onclick = ()=>{ authCameFromWelcome = true; setAuthMode("login"); showAuthTabs(); };
  // מצב אורח נשמר בכוונה: כל האפליקציה בנויה סביב requireAuth, והמפה/הבית ניתנים לגלישה
  // בלי חשבון. הבחירה נזכרת כדי שלא נחסום את אותו משתמש שוב בכל פתיחה.
  $("welcomeGuestBtn").onclick = ()=>{
    try{ localStorage.setItem(GUEST_CHOICE_KEY, "1"); }catch(e){}
    closeAuthSheet();
  };
  $("authBackBtn").onclick = ()=>{ authCameFromWelcome = false; showAuthView("welcome"); };
  $("authSwitchBtn").onclick = ()=>{
    if(authMode==="signup"){ setAuthMode("login"); showAuthTabs(); }
    else $("tabSignup").click();
  };
  ["authName","authEmail","authPassword"].forEach(id=>{
    $(id).addEventListener("input", ()=>{
      $(id).classList.remove("invalid");
      $(id).removeAttribute("aria-invalid");
      const err = $(id+"Err"); if(err) err.classList.remove("show");
    });
  });
}
const GUEST_CHOICE_KEY = "magalim-guest-choice-v1";
const DEFAULT_PROFILE_NAME = "מטייל/ת חדש/ה";
// §7 - אם אחרי הרשמה (בעיקר דרך Google/Facebook) לא קיבלנו שם אמיתי, מבקשים אותו פעם אחת
// דרך מסך עריכת-הפרופיל הקיים, במקום להשאיר "מטייל/ת חדש/ה" כשם התצוגה לנצח.
let namePromptShown = false;
function maybePromptForName(){
  if(namePromptShown || !session || !myProfile) return;
  if(myProfile.name && myProfile.name !== DEFAULT_PROFILE_NAME) return;
  namePromptShown = true;
  openEditProfile();
  toast("איך לקרוא לכם? הוסיפו שם כדי שחברים יזהו אתכם");
}
// מבקשים מיקום והתראות פעם אחת, בהתחברות הראשונה למכשיר הזה - כדי שמי שלא מגיע
// לבד להגדרות עדיין ייהנה מהתכונות. דגל ב-localStorage (לא namePromptShown-style,
// כי זה צריך לשרוד רענון עמוד) מבטיח שזה קורה פעם אחת בלבד לנצח, בין אם המשתמש
// אישר, דחה, או פשוט התעלם מהדיאלוג - ההפעלה הידנית מההגדרות תמיד נשארת זמינה.
const PERMISSIONS_PROMPT_KEY = "magalim-permissions-prompted-v1";
async function maybePromptForPermissionsOnLogin(){
  if(!session) return;
  try{ if(localStorage.getItem(PERMISSIONS_PROMPT_KEY)) return; }catch(e){}
  try{ localStorage.setItem(PERMISSIONS_PROMPT_KEY, "1"); }catch(e){}
  if(navigator.geolocation){
    await new Promise(resolve=> locateUser(resolve, resolve));
  }
  if(pushSupported() && Notification.permission==="default"){
    await enablePush();
  }
}
// מסך הפתיחה מוצג רק אחרי שידוע שאין session (§8), ורק למי שלא בחר כבר להמשיך כאורח.
function maybeShowWelcome(){
  if(session) return;
  try{ if(localStorage.getItem(GUEST_CHOICE_KEY)) return; }catch(e){}
  if(sessionStorage.getItem("pendingInviteCode")) return;  // הזמנה מטפלת בעצמה (§9)
  authGateMessage = null;
  authCameFromWelcome = false;
  setAuthMode("signup");
  $("authCloseBtn").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
  showAuthView("welcome");
}
async function signInWithOAuth(provider){
  $("authError").classList.remove("show");
  // בלי try/catch דחייה של signInWithOAuth נבלעת והכפתור נראה כאילו הוא לא מגיב
  try{
    const { error } = await supabase.auth.signInWithOAuth({ provider, options:{ redirectTo: location.origin + location.pathname } });
    if(error) throw error;
  }catch(err){
    $("authError").textContent = friendlyAuthError(err && err.message);
    $("authError").classList.add("show");
  }
}
$("googleAuthBtn").onclick = ()=> signInWithOAuth("google");
$("facebookAuthBtn").onclick = ()=> signInWithOAuth("facebook");
$("waitlistBackBtn").onclick = ()=> $("tabLogin").click();
$("waitlistView").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email = $("waitlistEmail").value.trim();
  $("waitlistError").classList.remove("show");
  if(!email){ $("waitlistError").textContent = "הזינו כתובת אימייל."; $("waitlistError").classList.add("show"); return; }
  $("waitlistSubmitBtn").disabled = true;
  try{
    const { error } = await supabase.from("waitlist").insert({ email });
    if(error){
      if(error.code==="23505"){ $("waitlistNote").textContent = "כבר נרשמתם לרשימת ההמתנה עם המייל הזה!"; $("waitlistNote").classList.add("show"); }
      else throw error;
    } else {
      $("waitlistNote").textContent = "נרשמתם לרשימת ההמתנה! נעדכן אתכם כשייפתח מקום.";
      $("waitlistNote").classList.add("show");
      $("waitlistEmail").value = "";
    }
  }catch(err){
    $("waitlistError").textContent = "משהו השתבש. נסו שוב.";
    $("waitlistError").classList.add("show");
  }finally{
    $("waitlistSubmitBtn").disabled = false;
  }
});

$("authForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const name = $("authName").value.trim();
  if(!validateAuthForm()) return;
  setBtnLoading($("authSubmit"), true, authMode==="signup" ? "יוצרים חשבון..." : "מתחברים...");
  try{
    if(authMode==="signup"){
      const pendingCode = sessionStorage.getItem("pendingInviteCode");
      const meta = { name: name || DEFAULT_PROFILE_NAME };
      if(pendingCode) meta.invite_code = pendingCode;
      const { data, error } = await supabase.auth.signUp({ email, password, options:{ data: meta } });
      if(error) throw error;
      track("signup_completed");
      if(!data.session){
        $("authNote").textContent = "נרשמת בהצלחה! בדקו את תיבת המייל ואשרו את ההרשמה כדי להתחבר.";
        $("authNote").classList.add("show");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if(error) throw error;
    }
  }catch(err){
    const msg = err.message||"";
    if(/registration_disabled/i.test(msg)){ showWaitlistView("disabled"); }
    else if(/registration_full/i.test(msg)){ showWaitlistView("full"); }
    else if(/invite_required/i.test(msg)){ showWaitlistView("invite_only"); }
    else{
      $("authError").textContent = friendlyAuthError(msg);
      $("authError").classList.add("show");
    }
  }finally{
    setBtnLoading($("authSubmit"), false);
  }
});

$("signOutBtn").onclick = async ()=>{
  try{ localStorage.removeItem(GUEST_CHOICE_KEY); }catch(e){}
  namePromptShown = false;
  await supabase.auth.signOut();
  maybeShowWelcome();
};
$("authCloseBtn").onclick = ()=> closeAuthSheet();

$("forgotPasswordLink").onclick = async ()=>{
  const email = $("authEmail").value.trim();
  if(!email){ $("authError").textContent = "הזינו קודם את כתובת האימייל שלכם למעלה."; $("authError").classList.add("show"); return; }
  $("forgotPasswordLink").disabled = true;
  try{
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if(error) throw error;
    $("authError").classList.remove("show");
    $("authNote").textContent = "שלחנו לכם מייל עם קישור לאיפוס הסיסמה.";
    $("authNote").classList.add("show");
  }catch(err){
    $("authError").textContent = friendlyAuthError(err.message);
    $("authError").classList.add("show");
  }finally{
    $("forgotPasswordLink").disabled = false;
  }
};

$("resetPasswordForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const password = $("resetPassword").value;
  $("resetError").classList.remove("show");
  $("resetSubmit").disabled = true;
  try{
    const { error } = await supabase.auth.updateUser({ password });
    if(error) throw error;
    toast("הסיסמה עודכנה בהצלחה!");
    $("resetPasswordForm").classList.add("hidden");
    $("authForm").classList.remove("hidden");
    $("authCloseBtn").classList.remove("hidden");
    closeAuthSheet();
    bootUserData();
  }catch(err){
    $("resetError").textContent = friendlyAuthError(err.message);
    $("resetError").classList.add("show");
  }finally{
    $("resetSubmit").disabled = false;
  }
});

let authGateMessage = null;
let pendingAuthAction = null;
// דגל שמאפשר לכפתור "אחורה" הפיזי/דפדפן לסגור את מסך ה-auth במקום לנווט/לצאת מהאפליקציה
// (פער שנמצא ב-audit של Phase 0D - openAuthSheet לא היה מוסיף history entry בכלל).
let authSheetHistoryPushed = false;
function openAuthSheet(message, onSuccess){
  authGateMessage = message || null;
  pendingAuthAction = onSuccess || null;
  $("authCloseBtn").classList.remove("hidden");
  $("authScreen").classList.remove("hidden");
  authCameFromWelcome = false;
  setAuthMode(authMode==="signup" ? "signup" : "login");
  showAuthTabs();
  if(!authSheetHistoryPushed){
    authSheetHistoryPushed = true;
    history.pushState({magalimAuthSheet:true}, "", location.hash || "#/home");
  }
}
function closeAuthSheet(){
  $("authScreen").classList.add("hidden");
  authGateMessage = null;
  if(authSheetHistoryPushed){
    authSheetHistoryPushed = false;
    history.back();
  }
}
function requireAuth(message, onSuccess){
  if(session) return true;
  openAuthSheet(message, onSuccess);
  return false;
}

supabase.auth.onAuthStateChange((event, newSession)=>{
  const hadNoSession = !session;
  const hadSession = !hadNoSession;
  session = newSession;
  if(event==="PASSWORD_RECOVERY"){
    $("authScreen").classList.remove("hidden");
    $("authCloseBtn").classList.add("hidden");
    showAuthView("reset");
    return;
  }
  if(session) closeAuthSheet();
  // באג-אמת שדווח: לחיצה על "התנתקות" (בתוך settingsSheet) כן מבצעת סיין-אאוט בפועל, אבל
  // ה-sheet עצמו נשאר פתוח מעל התוכן (עכשיו כ-guest) כי שום קוד לא סגר sheets בזמן
  // sign-out - נראה למשתמש כאילו "הכפתור לא עובד". סוגרים כל sheet פתוח בכל מעבר
  // session->guest, לא רק settingsSheet ספציפית (אותו דפוס בדיוק כמו openSheet עצמו).
  if(hadSession && !session){
    [...openSheetStack].forEach(s=>{ if(s.onEscape) s.onEscape(); else closeSheet(s.sheetId, s.scrimId); });
  }
  bootUserData().then(()=>{
    if(session && hadNoSession && pendingAuthAction){
      const action = pendingAuthAction;
      pendingAuthAction = null;
      action();
    }
    const pendingCode = sessionStorage.getItem("pendingInviteCode");
    if(session && pendingCode) handleInviteCode(pendingCode);
    if(session){ maybePromptForName(); maybePromptForPermissionsOnLogin(); }
    else if(booted) maybeShowWelcome();
  });
});

/* ============ ROUTER (lightweight hash-based) ============ */
let navStack = [];
function navigate(hash, push){
  if(push===undefined) push = true;
  if(push){ navStack.push(location.hash || "#/home"); history.pushState({magalim:true}, "", hash); }
  else history.replaceState({magalim:true}, "", hash);
  applyRoute();
}
function goBack(){ navigate(navStack.pop() || "#/home", false); }
function goToDestination(id){ navigate("#/destination/"+encodeURIComponent(id)); }
// מקלדת מובייל: כשמקלידים לתוך שדה בתוך sheet, מוודאים שהוא (וה-CTA שמתחתיו) נשארים
// בתצוגה כשהמקלדת נפתחת ומצמצמת את הגובה הזמין - 100dvh כבר עוזר חלקית, זו תוספת קלה.
document.addEventListener("focusin", (e)=>{
  const el = e.target;
  if(!el.matches || !el.matches("input, textarea")) return;
  if(!el.closest(".sheet")) return;
  setTimeout(()=> el.scrollIntoView({block:"center", behavior:"smooth"}), 250);
});
window.addEventListener("popstate", ()=>{
  if(authSheetHistoryPushed && !$("authScreen").classList.contains("hidden")){
    authSheetHistoryPushed = false;
    $("authScreen").classList.add("hidden");
    authGateMessage = null;
    return;
  }
  applyRoute();
});

let currentView = null;
// מעבר בין מסכים מחזיר את מסך-היעד למצב ההתחלתי שלו: גלילה לראש, טאב-משנה ברירת-מחדל,
// ובלי שאריות מהמסך הקודם (כרטיס-תצוגה שנשאר פתוח על המפה). בלי זה חזרה לטאב מציגה
// את אמצע המסך מהפעם הקודמת, או טאב-משנה שהמשתמש כבר לא זוכר שבחר.
function setProfileListTab(tab){
  profileListTab = tab;
  document.querySelectorAll(".tab-row [data-list]").forEach(b=>
    b.classList.toggle("active", b.dataset.list===tab));
}
function setBoardPeriod(period){
  lbPeriod = period;
  $("periodSeg").querySelectorAll("button").forEach(b=>
    b.classList.toggle("active", b.dataset.period===period));
}
function resetViewScroll(view){
  const root = $("view-"+view);
  if(!root) return;
  root.scrollTop = 0;
  root.querySelectorAll(".scroll-area").forEach(a=>{ a.scrollTop = 0; });
}
function switchView(view, opts){
  opts = opts || {};
  // "feed" הוא בקשה מפורשת לטאב מסוים - היא גוברת על האיפוס
  let explicitBoardTab = null;
  if(view==="feed"){ view = "board"; explicitBoardTab = "feed"; }
  if(!["home","map","saved","board","profile"].includes(view)) view = "home";
  const changed = view !== currentView;
  // ה-GPS נכבה ביציאה מהמפה בכל מקרה, גם ב-keepState: אין לו צרכן מחוץ למפה, והוא
  // מרוקן סוללה ברקע. ההעדפה נשמרת, כך שהוא חוזר מעצמו בכניסה הבאה.
  if(changed && currentView==="map") stopLocationWatch();
  if(changed && !opts.keepState){
    if(currentView==="map") closePreview();
    if(view==="board" && !explicitBoardTab) boardTab = "leaders";
    if(view==="board") setBoardPeriod("week");
    if(view==="profile") setProfileListTab("visited");
    // סינוני-המפה לא מתאפסים כאן בכוונה: הם בחירה מכוונת של המשתמש, וכפתור
    // "הצג את היעדים שנותרו" באתגרים מגדיר filters.customIds ואז קורא ל-
    // navigate("#/map") - איפוס כאן היה מוחק לו את התוכן לפני שהמפה בכלל מצטיירת.
  }
  if(explicitBoardTab) boardTab = explicitBoardTab;
  currentView = view;
  document.querySelectorAll(".nav-btn").forEach(b=>{
    const on = b.dataset.view===view;
    b.classList.toggle("active", on);
    // הצבע לבדו לא מספיק - aria-current הוא מה שמכריז "נבחר" לקורא מסך
    if(on) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current");
  });
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  $("view-"+view).classList.add("active");
  if(view==="map") setTimeout(()=>{
    // אחרי invalidateSize, אחרת המפה עוד לא יודעת את הגודל האמיתי שלה ו-fitBounds
    // יחשב זום שגוי
    if(leafletMap) leafletMap.invalidateSize();
    if(changed && !opts.keepState){
      if(keepMapFraming) keepMapFraming = false;
      else fitIsrael();
    }
    renderMap();
    resumeLocationTracking();
    maybeShowLocateHint();
  },0);
  if(view==="board") switchBoardTab(boardTab);
  if(view==="profile") renderProfile();
  if(view==="home") renderHome();
  if(view==="saved") renderSaved();
  if(changed) resetViewScroll(view);
  if(changed){
    focusView(view);
    announce(VIEW_TITLES[view] || view);
  }
}
function switchBoardTab(tab){
  boardTab = tab;
  document.querySelectorAll("#boardTabs button").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab));
  $("boardPanelLeaders").classList.toggle("hidden", tab!=="leaders");
  $("boardPanelGroup").classList.toggle("hidden", tab!=="group");
  $("boardPanelFeed").classList.toggle("hidden", tab!=="feed");
  $("boardPanelAchievements").classList.toggle("hidden", tab!=="achievements");
  if(tab==="leaders") renderBoard();
  else if(tab==="group") renderGroupPanel();
  else if(tab==="feed") renderFeed();
  else if(tab==="achievements") renderAchievementsPanel();
}
// תגים+אוספים אישיים - הועברו מטאב "פרופיל" לטאב חדש "הישגים" בתוך "המסע שלנו" (לבקשת
// המשתמש), נשארים תלויים ב-myVisits/BADGES/COLLECTIONS הגלובליים בדיוק כמו קודם.
const STAMP_RING_C = 163.4; // 2πr, r=26 - חייב להתאים ל-r ב-stampHtml למטה
function stampHtml(b, state){
  const cur = b.current(myVisits), tgt = b.target(myVisits);
  const pct = tgt ? Math.min(100, Math.round(cur/tgt*100)) : 0;
  const metal = badgeMetal(b.id);
  const earned = state === "earned";
  const date = myBadgeDates[b.id];
  const fresh = earned && freshStamps.has(b.id);
  // טבעת-התקדמות רק למי שבדרך: לחותמת נעולה-לגמרי (0%) היא רק רעש, ולחותמת שהושגה
  // היא כבר לא אומרת כלום.
  const ring = (!earned && pct > 0)
    ? `<svg class="stamp-ring" viewBox="0 0 60 60" aria-hidden="true"><circle class="stamp-ring-fill" cx="30" cy="30" r="26"
         style="stroke-dashoffset:${(STAMP_RING_C*(1-pct/100)).toFixed(1)}"/></svg>`
    : "";
  const foot = earned
    ? `<div class="stamp-date">${date ? new Date(date).toLocaleDateString("he-IL",{month:"short",year:"2-digit"}) : "הושגה"}</div>`
    : `<div class="stamp-progress"><bdi dir="ltr">${cur} / ${tgt}</bdi></div>`;
  const aria = earned
    ? b.label + " — הושגה" + (date ? " ב-"+new Date(date).toLocaleDateString("he-IL") : "")
    : b.label + " — " + cur + " מתוך " + tgt;
  return `<div class="stamp${earned?" is-earned":""}${fresh?" is-fresh":""}${metal?" metal-"+metal:""}" role="listitem" aria-label="${aria}">
    <div class="stamp-disc">${ring}<div class="stamp-face">${stampGlyph(badgeGlyphName(b.id), 26)}</div>
      ${earned ? "" : `<span class="stamp-lock" aria-hidden="true">${stampGlyph("lock",11)}</span>`}</div>
    <div class="stamp-label">${b.label}</div>
    ${foot}
  </div>`;
}
function renderAchievementsPanel(){
  if(!session) return;
  const unlockedIds = new Set(unlockedBadges().map(b=>b.id));
  const earned = BADGES.filter(b=>unlockedIds.has(b.id));
  const rest = BADGES.filter(b=>!unlockedIds.has(b.id));
  // היררכיה במקום גריד אחיד: קודם מה שכמעט הושג (הכי מניע), אחר כך מה שנפתח לאחרונה,
  // ורק אז השאר. חותמת שטרם התחילה (0%) אף פעם לא "קרובה להשלמה".
  const close = rest
    .map(b=>{ const t=b.target(myVisits); return { b, pct: t ? b.current(myVisits)/t : 0 }; })
    .filter(x=> x.pct > 0 && x.pct < 1)
    .sort((a,b)=> b.pct - a.pct)
    .slice(0,3)
    .map(x=>x.b);
  const closeIds = new Set(close.map(b=>b.id));
  const recent = earned
    .filter(b=> myBadgeDates[b.id])
    .sort((a,b)=> new Date(myBadgeDates[b.id]) - new Date(myBadgeDates[a.id]))
    .slice(0,3);
  const recentIds = new Set(recent.map(b=>b.id));
  const others = BADGES.filter(b=> !closeIds.has(b.id) && !recentIds.has(b.id));
  const section = (title, list, cls)=> list.length
    ? `<div class="stamp-section${cls?" "+cls:""}"><div class="stamp-section-head">${title}</div>
       <div class="stamp-grid" role="list">${list.map(b=>stampHtml(b, unlockedIds.has(b.id)?"earned":"locked")).join("")}</div></div>`
    : "";
  $("badgeGrid").innerHTML =
      section("קרובות להשלמה", close, "is-close")
    + section("הושגו לאחרונה", recent)
    + section(earned.length||close.length ? "כל החותמות" : "החותמות שלכם", others);
  freshStamps.clear();
  renderCollections();
}
const SIMPLE_OVERLAY_ROUTES = { "#/about":"aboutScreen", "#/terms":"termsScreen", "#/privacy-policy":"privacyPolicyScreen", "#/help":"helpScreen", "#/notifications":"notificationsScreen" };
const SIMPLE_OVERLAY_IDS = Object.values(SIMPLE_OVERLAY_ROUTES);
function applyRoute(){
  if(!booted) return;
  const hash = location.hash || "#/home";
  const destMatch = hash.match(/^#\/destination\/(.+)$/);
  if(destMatch){
    const id = decodeURIComponent(destMatch[1]);
    switchView("map");
    if(lmById[id]) openDetail(id); else closeSheet("detailSheet","detailScrim");
    return;
  }
  const inviteMatch = hash.match(/^#\/invite\/(.+)$/);
  if(inviteMatch){
    switchView("map");
    handleInviteCode(decodeURIComponent(inviteMatch[1]));
    return;
  }
  const collectionMatch = hash.match(/^#\/collection\/(.+)$/);
  if(collectionMatch){
    const cid = decodeURIComponent(collectionMatch[1]);
    switchView("profile");
    if(COLLECTIONS.some(c=>c.id===cid)) openCollectionSheet(cid); else navigate("#/profile", false);
    return;
  }
  if(hash==="#/admin"){
    switchView("map");
    openAdmin();
    return;
  }
  if(hash==="#/settings/profile"){
    switchView("profile");
    openEditProfile();
    return;
  }
  if(SIMPLE_OVERLAY_ROUTES[hash]){
    switchView("map");
    SIMPLE_OVERLAY_IDS.forEach(id=> $(id).classList.add("hidden"));
    $(SIMPLE_OVERLAY_ROUTES[hash]).classList.remove("hidden");
    if(SIMPLE_OVERLAY_ROUTES[hash]==="aboutScreen") $("aboutVersionText").textContent = APP_VERSION;
    if(SIMPLE_OVERLAY_ROUTES[hash]==="notificationsScreen") renderNotifications();
    return;
  }
  $("adminScreen").classList.add("hidden");
  $("editProfileScreen").classList.add("hidden");
  SIMPLE_OVERLAY_IDS.forEach(id=> $(id).classList.add("hidden"));
  closeSheet("detailSheet","detailScrim");
  closeSheet("inviteSheet","inviteScrim");
  closePreview();
  const view = hash.replace(/^#\//,"").split("/")[0] || "home";
  switchView(view);
}

/* ============ BOOT / DATA LOAD ============ */
let booted = false, publicBootPromise = null;
async function bootPublic(){
  track("session_started", {});
  try{
    // .select() לבד נחתך אוטומטית ב-1000 שורות ע"י PostgREST - יש לדפדף במפורש כדי לקבל
    // את כל היעדים גם אחרי שחצינו את ה-1000 (התגלה בפועל כשמספר היעדים עבר 1000).
    const lms = [];
    const PAGE = 1000;
    for(let from=0; ; from+=PAGE){
      const { data: page, error: lmErr } = await supabase.from("landmarks").select("*").order("name").range(from, from+PAGE-1);
      if(lmErr) throw lmErr;
      lms.push(...page);
      if(page.length < PAGE) break;
    }
    LANDMARKS = lms.map(l=>({ id:l.id, name:l.name, desc:l.description, category:l.category, difficulty:l.difficulty, region:l.region, lat:l.lat, lon:l.lon, duration:l.duration, distanceKm:l.distance_km, baseVisits:l.base_visits,
      familyFriendly:!!l.family_friendly, dogFriendly:!!l.dog_friendly, accessible:!!l.accessible, hasWater:!!l.has_water, priceType:l.price_type||"free", season:l.season||null, durationHours:l.duration_hours!=null?Number(l.duration_hours):null,
      officialUrl:l.official_url||null, stockPhotoUrl:l.stock_photo_url||null, stockPhotoCredit:l.stock_photo_credit||null }));
    lmById = Object.fromEntries(LANDMARKS.map(l=>[l.id,l]));
    await loadVisitCounts();
    loadLandmarkPhotos().then(()=>{
      renderMap();
      // אם תמונות-הקהילה נטענות לפני שה-boot הסתיים (רשת מהירה) - לא פותחים כאן: applyRoute()
      // (רץ מיד אחרי booted=true, למטה) יפתח את ה-sheet פעם אחת, כשה-chrome כבר גלוי במלואו,
      // עם התמונה כבר זמינה. פתיחה כאן *לפני* ש-topbar/bottomNav/view-map גלויים היא בדיוק
      // הבאג-אמת שדווח ממחשב: ה-sheet מקבל מיקום absolute שגוי (יחסית ל-app-shell עוד לפני
      // שהיא הפכה גלויה/פעילה), ופתיחה חוזרת מ-applyRoute() לא מתקנת את זה כי ה-class "open"
      // כבר קיים (אין re-trigger לאנימציה/למיקום-מחדש).
      if(!booted) return;
      const m = location.hash.match(/^#\/destination\/(.+)$/);
      if(m && lmById[decodeURIComponent(m[1])]) openDetail(decodeURIComponent(m[1]));
    }).catch(()=>{});
    buildChips("catChips", CATEGORIES, "cats");
    buildChips("diffChips", DIFF_CHIPS_DICT, "diffs", "teal");
    buildChips("regionChips", REGIONS, "regions", "teal");
    $("loadingScreen").classList.add("hidden");
    $("topbar").classList.remove("hidden");
    $("bottomNav").classList.remove("hidden");
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("hidden"));
    $("view-home").classList.add("active");   // applyRoute() מיד אחר כך יחליף לפי ה-hash אם צריך
    wireStaticUI();
    subscribeRealtime();
    booted = true;
    syncFilterUI();
    updateOnlineStatus();
    refreshHeader();
    // לפני applyRoute: הכתובת עוד מכילה את השגיאה, ו-applyRoute ינקה אותה לנתיב
    const redirectError = readAuthRedirectError();
    applyRoute();
    if(redirectError) showAuthRedirectError(redirectError);
    initOnboarding();
    if(!session) maybeShowWelcome();
    setTimeout(checkForNewVersion, 60000);
    bumpVisitCount();
    setTimeout(maybeShowInstallBanner, 8000);
  }catch(err){
    console.error(err);
    toast("שגיאה בטעינת הנתונים: "+(err.message||err));
    $("loadingScreen").classList.add("hidden");
  }
}
async function bootUserData(){
  await publicBootPromise;
  if(!session){
    myProfile = null; myVisits = []; myWishlist = []; followingSet = new Set(); myGroups = []; activeGroupId = null;
    myConquests = []; myBonusGrants = [];
    if(!activeTrip){ activeTrip = loadActiveTrip(); if(activeTrip) minimiseTrip(); }
    refreshHeader(); renderMap(); renderProfile(); renderHome(); renderSaved(); renderBoard(); renderFeed(); renderGroupPanel(); renderFriendsTravelBanner();
    return;
  }
  try{
    await loadMyProfile();
    await Promise.all([ loadMyVisits(), loadMyWishlist(), loadFollowing(), loadMyGroups(), loadMyTravelStatus(), loadMyConquestsAndBonuses() ]);
    prevBadgeSet = new Set(unlockedBadges().map(b=>b.id));
    flushPendingQueue();
    syncPushSubscription();
    await handleInviteLinks();
    updateGroupBarVisibility();
    refreshHeader();
    renderMap(); renderProfile(); renderHome(); renderSaved(); renderBoard(); renderFeed(); renderGroupPanel(); renderFriendsTravelBanner();
    // Gamification Overhaul, Phase 5 - אם המשתמש נכנס דרך deep-link ישיר ל-#/destination/<id>
    // (openDetail כבר רץ פעם אחת ב-bootPublic, לפני ש-myVisits/myConquests נטענו), מרעננים
    // אותו עכשיו כדי שמצב-נכבש/XP יוצג נכון - אותו דפוס-race בדיוק כמו ה-refresh הקיים
    // ל-landmarkPhotos, רק שכאן מכוסה גם visitedEntry/conquestEntry לא רק תמונה.
    const detailMatch = location.hash.match(/^#\/destination\/(.+)$/);
    if(detailMatch && lmById[decodeURIComponent(detailMatch[1])]) openDetail(decodeURIComponent(detailMatch[1]));
    if(pendingGroupSwitch){
      pendingGroupSwitch = false;
      boardTab = "group";
      navigate("#/board");
    }
  }catch(err){
    console.error(err);
    toast("שגיאה בטעינת הנתונים האישיים: "+(err.message||err));
  }
}

/* ============ ONBOARDING (פעם אחת, ניתן לדלג) ============ */
const ONBOARDING_KEY = "onboarding_done_v1";
let onboardingStep = 0;
function initOnboarding(){
  if(localStorage.getItem(ONBOARDING_KEY)) return;
  onboardingStep = 0;
  updateOnboardingStep();
  $("onboardingScreen").classList.remove("hidden");
}
function updateOnboardingStep(){
  document.querySelectorAll(".onboarding-slide").forEach(s=> s.classList.toggle("active", Number(s.dataset.step)===onboardingStep));
  document.querySelectorAll("#onboardingDots .dot").forEach((d,i)=> d.classList.toggle("active", i===onboardingStep));
  $("onboardingNext").textContent = onboardingStep>=2 ? "בואו נתחיל" : "הבא";
}
function closeOnboarding(){
  localStorage.setItem(ONBOARDING_KEY, "1");
  $("onboardingScreen").classList.add("hidden");
}

async function loadMyProfile(){
  const uid = session.user.id;
  let { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  if(error) throw error;
  if(!data){
    const meta = session.user.user_metadata || {};
    const name = meta.name || meta.full_name || meta.preferred_username
      || (meta.email ? String(meta.email).split("@")[0] : "") || DEFAULT_PROFILE_NAME;
    const { data: created, error: upErr } = await supabase.from("profiles").insert({ id: uid, name }).select().single();
    if(upErr) throw upErr;
    data = created;
  }
  myProfile = data;
}
async function loadMyVisits(){
  const { data, error } = await supabase.from("visits").select("*").eq("user_id", session.user.id);
  if(error) throw error;
  myVisits = data;
}
async function loadMyWishlist(){
  const { data, error } = await supabase.from("wishlist").select("landmark_id").eq("user_id", session.user.id);
  if(error) throw error;
  myWishlist = data.map(r=>r.landmark_id);
}
async function loadFollowing(){
  const { data, error } = await supabase.from("follows").select("followee_id").eq("follower_id", session.user.id);
  if(error) throw error;
  followingSet = new Set(data.map(r=>r.followee_id));
}
async function loadMyTravelStatus(){
  try{
    const { data, error } = await supabase.from("travel_status").select("region,sharing_enabled,travel_until").eq("user_id", session.user.id).maybeSingle();
    if(error) throw error;
    myTravelStatus = data;
  }catch(err){ myTravelStatus = null; }
}
async function loadVisitCounts(){
  const { data, error } = await supabase.rpc("get_landmark_visit_counts");
  if(!error && data){
    visitCounts = {};
    data.forEach(r=> visitCounts[r.landmark_id] = Number(r.visit_count));
    return;
  }
  try{
    const { data: raw, error: rawErr } = await supabase.from("visits").select("landmark_id");
    if(rawErr) throw rawErr;
    visitCounts = {};
    raw.forEach(r=>{ visitCounts[r.landmark_id] = (visitCounts[r.landmark_id]||0)+1; });
  }catch(e){ visitCounts = {}; }
}
let landmarkPhotos = {};
async function loadLandmarkPhotos(){
  const { data: agg, error: aggErr } = await supabase.rpc("get_landmark_photos");
  if(!aggErr && agg){
    landmarkPhotos = {};
    agg.forEach(r=>{ landmarkPhotos[r.landmark_id] = r.photo_url; });
  } else {
    const { data, error } = await supabase.from("visits").select("landmark_id,photo_url,visited_at").not("photo_url","is",null).order("visited_at",{ascending:false}).limit(500);
    if(error) throw error;
    landmarkPhotos = {};
    data.forEach(r=>{ if(!landmarkPhotos[r.landmark_id]) landmarkPhotos[r.landmark_id] = r.photo_url; });
  }
  LANDMARKS.forEach(l=>{ if(!landmarkPhotos[l.id] && l.stockPhotoUrl) landmarkPhotos[l.id] = l.stockPhotoUrl; });
}
async function loadMyGroups(){
  const { data, error } = await supabase.from("group_members").select("group_id, groups(id,name,created_by)").eq("user_id", session.user.id);
  if(error){ console.warn("groups feature unavailable:", error.message); myGroups = []; return; }
  myGroups = data.filter(r=>r.groups).map(r=>({ id:r.groups.id, name:r.groups.name, createdBy:r.groups.created_by }));
  if(!activeGroupId || !myGroups.some(g=>g.id===activeGroupId)) activeGroupId = myGroups[0] ? myGroups[0].id : null;
  populateGroupSelect();
}
function populateGroupSelect(){
  const sel = $("groupSelect");
  sel.innerHTML = myGroups.map(g=>`<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("");
  if(activeGroupId) sel.value = activeGroupId;
}
function updateGroupBarVisibility(){
  const hasGroups = myGroups.length>0;
  $("groupBar").classList.toggle("hidden", !hasGroups);
  $("groupEmpty").classList.toggle("hidden", hasGroups);
  $("groupContent").classList.toggle("hidden", !hasGroups || !activeGroupId);
  // מחיקת קבוצה מוצגת רק ליוצר שלה - זו פעולה שמוחקת את הקבוצה לכל החברים, ולכן
  // היא לא נפתחת לכל חבר. ה-RLS אוכף את אותו כלל בצד השרת (migrations_group_delete).
  const active = myGroups.find(g=>g.id===activeGroupId);
  const isOwner = Boolean(active && session && active.createdBy === session.user.id);
  $("groupDeleteBtn").classList.toggle("hidden", !isOwner);
}
async function deleteActiveGroup(){
  const g = myGroups.find(x=>x.id===activeGroupId);
  if(!g) return;
  const ok = await confirmAction({
    title: "למחוק את הקבוצה?",
    message: `"${g.name}" תימחק לכל החברים בה, יחד עם הפעילות הקבוצתית וההצבעות. לא ניתן לשחזר.`,
    confirmLabel: "מחק את הקבוצה",
    destructive: true,
  });
  if(!ok) return;
  const { error } = await supabase.from("groups").delete().eq("id", g.id);
  if(error){
    console.error(error);
    toast("לא הצלחנו למחוק את הקבוצה");
    return;
  }
  myGroups = myGroups.filter(x=>x.id!==g.id);
  activeGroupId = myGroups[0] ? myGroups[0].id : null;
  populateGroupSelect(); updateGroupBarVisibility(); renderGroupPanel();
  toast("הקבוצה נמחקה");
}
async function createGroup(){
  const name = prompt("איך לקרוא לקבוצה?");
  if(!name || !name.trim()) return;
  const { data, error } = await supabase.from("groups").insert({ name:name.trim(), created_by:session.user.id }).select().single();
  if(error){ toast("שגיאה ביצירת הקבוצה"); return; }
  let { error: joinErr } = await supabase.from("group_members").insert({ group_id:data.id, user_id:session.user.id, role:"owner" });
  if(joinErr && /role/i.test(joinErr.message||"")){
    ({ error: joinErr } = await supabase.from("group_members").insert({ group_id:data.id, user_id:session.user.id }));
  }
  if(joinErr){ toast("שגיאה בהצטרפות לקבוצה"); return; }
  myGroups.push({ id:data.id, name:data.name, createdBy:session.user.id });
  activeGroupId = data.id;
  populateGroupSelect(); updateGroupBarVisibility();
  toast('הקבוצה "'+escapeHtml(data.name)+'" נוצרה!');
  renderGroupPanel();
}
// כשסבב OAuth נכשל, הספק ו-Supabase מחזירים את הסיבה בכתובת עצמה - לפעמים ב-query
// ולפעמים ב-hash - והאפליקציה פשוט התעלמה ממנה ועלתה כרגיל. מבחוץ זה נראה כמו
// "ההתחברות לא עובדת", בלי שום רמז, בזמן שהסיבה המדויקת הייתה כתובה בשורת הכתובת.
// גרוע מזה: hash של שגיאה (#error=...) נכנס לראוטר כאילו היה נתיב.
const OAUTH_ERROR_HINTS = {
  access_denied: "הביטול הגיע מהספק — אם לא ביטלתם בעצמכם, בדקו שהאפליקציה במצב Live אצלו",
  redirect_uri_mismatch: "כתובת ההחזרה אצל הספק לא תואמת. היא צריכה להצביע ל-Supabase, לא לאתר",
  invalid_request: "בקשה שגויה לספק — לרוב הגדרה חסרה במסך ההסכמה",
  unauthorized_client: "הספק לא מאשר את האפליקציה — בדקו שהיא Published/Live ולא במצב בדיקה",
  server_error: "הספק אישר, אבל השלב מול Supabase נכשל — לרוב Redirect URLs שלא כוללת את הכתובת הזו",
};
function readAuthRedirectError(){
  const fromQuery = new URLSearchParams(location.search);
  const fromHash = new URLSearchParams((location.hash || "").replace(/^#\/?/, ""));
  const code = fromQuery.get("error") || fromHash.get("error");
  if(!code) return null;
  const raw = fromQuery.get("error_description") || fromHash.get("error_description") || "";
  const desc = decodeURIComponent(raw.replace(/\+/g, " "));
  // מנקים את הכתובת, אחרת רענון מציג את השגיאה שוב וה-hash ממשיך להתפרש כנתיב
  history.replaceState({magalim:true}, "", location.pathname + "#/home");
  return { code, desc, hint: OAUTH_ERROR_HINTS[code] || null };
}
function showAuthRedirectError(err){
  if(!err) return;
  const parts = [err.hint || "ההתחברות לא הושלמה", err.desc, "(" + err.code + ")"].filter(Boolean);
  openAuthSheet(parts.join(" — "));
  console.error("OAuth redirect error:", err);
}
async function handleInviteLinks(){
  const params = new URLSearchParams(location.search);
  const refId = params.get("ref");
  const groupId = params.get("group");
  let changed = false;
  if(refId && refId!==session.user.id && !followingSet.has(refId)){
    const { error } = await supabase.from("follows").insert({ follower_id:session.user.id, followee_id:refId });
    if(!error){ followingSet.add(refId); toast("התחלת לעקוב אחרי החבר שהזמין אותך!"); changed = true; }
  }
  if(groupId){ await joinGroupFromLink(groupId); changed = true; pendingGroupSwitch = true; }
  if(changed || refId || groupId) history.replaceState({magalim:true}, "", location.pathname + location.hash);
}
async function joinGroupFromLink(groupId){
  const already = myGroups.some(g=>g.id===groupId);
  if(already) return;
  let g = null;
  const { data: preview, error: rpcErr } = await supabase.rpc("get_group_preview", { gid: groupId });
  if(!rpcErr && preview && preview[0]) g = preview[0];
  else {
    const { data: legacy } = await supabase.from("groups").select("id,name").eq("id", groupId).maybeSingle();
    g = legacy || null;
  }
  if(!g) return;
  let { error } = await supabase.from("group_members").insert({ group_id:groupId, user_id:session.user.id, role:"member" });
  if(error && /role/i.test(error.message||"")){
    ({ error } = await supabase.from("group_members").insert({ group_id:groupId, user_id:session.user.id }));
  }
  if(error) return;
  myGroups.push({ id:g.id, name:g.name });
  activeGroupId = g.id;
  populateGroupSelect();
  toast('הצטרפת לקבוצה "'+escapeHtml(g.name)+'"!');
}

/* ============ INVITE CODES (Phase 5) ============ */
function generateInviteCode(){
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // בלי 0/O/1/I כדי למנוע בלבול בהעתקה ידנית
  let code = "";
  for(let i=0;i<8;i++) code += alphabet[Math.floor(Math.random()*alphabet.length)];
  return code;
}
async function getInviteQuota(){
  const [{ data: settings }, { data: profile }, { count }] = await Promise.all([
    supabase.from("app_settings").select("default_invites_per_user").eq("id",1).maybeSingle(),
    supabase.from("profiles").select("bonus_invites").eq("id",session.user.id).maybeSingle(),
    supabase.from("invites").select("id",{count:"exact",head:true}).eq("created_by",session.user.id),
  ]);
  const limit = (settings?.default_invites_per_user ?? 3) + (profile?.bonus_invites ?? 0);
  const used = count || 0;
  return { limit, used, remaining: Math.max(0, limit-used) };
}
async function getOrCreateInvite(type, circleId){
  let q = supabase.from("invites").select("code,expires_at,max_uses,uses").eq("created_by", session.user.id).eq("invite_type", type).eq("is_active", true);
  q = type==="circle" ? q.eq("circle_id", circleId) : q.is("circle_id", null);
  const { data: existing, error: selErr } = await q.order("created_at",{ascending:false}).limit(1);
  if(selErr) throw selErr;
  const row = existing && existing[0];
  const stillValid = row && (!row.expires_at || new Date(row.expires_at) > new Date()) && (row.max_uses==null || row.uses < row.max_uses);
  if(stillValid) return row.code;
  let quota = null;
  try{ quota = await getInviteQuota(); }catch(err){ quota = null; }
  if(quota && quota.remaining<=0){
    const quotaErr = new Error("נוצלו כל ההזמנות שלך לשלב הבטא.");
    quotaErr.code = "quota_exceeded";
    throw quotaErr;
  }
  for(let attempt=0; attempt<5; attempt++){
    const code = generateInviteCode();
    const { data, error } = await supabase.from("invites").insert({ code, created_by:session.user.id, invite_type:type, circle_id: type==="circle"?circleId:null }).select("code").single();
    if(!error) return data.code;
    if(error.code !== "23505") throw error;
  }
  throw new Error("לא ניתן ליצור קישור הזמנה כרגע");
}
function inviteErrorMessage(code){
  if(code==="invite_expired") return "קישור ההזמנה הזה כבר לא בתוקף.";
  if(code==="invite_maxed") return "קישור ההזמנה הזה כבר נוצל במלואו.";
  if(code==="own_invite") return "זו ההזמנה שלך :)";
  return "קישור ההזמנה לא נמצא או שאינו תקין.";
}
async function handleInviteCode(code){
  if(!session){
    sessionStorage.setItem("pendingInviteCode", code);
    openAuthSheet("הוזמנת! צרו חשבון כדי להמשיך");
    $("tabSignup").click();
    return;
  }
  sessionStorage.removeItem("pendingInviteCode");
  const { data, error } = await supabase.rpc("get_invite_preview", { p_code: code });
  if(error || !data || !data.ok){ toast(inviteErrorMessage(data && data.error)); return; }
  openInvitePreview(code, data);
}
function openInvitePreview(code, data){
  const actionText = data.invite_type==="circle" ? `הצטרפות למעגל "${escapeHtml(data.circle_name||'')}"` : "הצטרפות כחברים";
  const inviterName = escapeHtml(data.inviter_name||'מטייל/ת');
  $("inviteBody").innerHTML = `
    <div class="invite-hero">
      <div class="invite-mark"><img src="./logo.png" alt=""></div>
      <h2 class="invite-title">${inviterName} הזמינ/ה אותך למסע</h2>
      <p class="invite-sub">תגלו מקומות, תצברו נקודות ותראו מי מכיר את ישראל טוב יותר.</p>
      <div class="invite-preview">
        <div class="invite-preview-item">${uiIcon("region",16)}<b>${LANDMARKS.length||''}</b> מקומות בישראל</div>
        <div class="invite-preview-item">${uiIcon("points",16)}נקודות על כל כיבוש</div>
        <div class="invite-preview-item">${uiIcon("trophy",16)}תגים והישגים</div>
      </div>
      <p class="invite-action-note">${actionText}</p>
    </div>
    <button class="btn btn-primary btn-block" id="inviteAcceptBtn">הצטרפו למסע</button>
    <button class="btn btn-ghost btn-block" id="inviteDismissBtn" style="margin-top:var(--space-2);">לא עכשיו</button>
  `;
  $("inviteAcceptBtn").onclick = async ()=>{
    $("inviteAcceptBtn").disabled = true;
    const { data: result, error } = await supabase.rpc("redeem_invite", { p_code: code });
    if(error || !result || !result.ok){
      toast(inviteErrorMessage(result && result.error));
      closeSheet("inviteSheet","inviteScrim");
      return;
    }
    closeSheet("inviteSheet","inviteScrim");
    toast(data.invite_type==="circle" ? "הצטרפת למעגל!" : "עכשיו אתם חברים!");
    await bootUserData();
    navigate(data.invite_type==="circle" ? "#/board" : "#/profile");
  };
  $("inviteDismissBtn").onclick = ()=>{ closeSheet("inviteSheet","inviteScrim"); navigate("#/map"); };
  openSheet("inviteSheet","inviteScrim");
}

/* ============ ADMIN DASHBOARD (Phase 7) ============ */
async function openAdmin(){
  if(!session || !myProfile || !myProfile.is_admin){
    toast("אין לך הרשאה לצפות בעמוד הזה.");
    navigate("#/map", false);
    return;
  }
  $("adminScreen").classList.remove("hidden");
  await renderAdminDashboard();
}
function closeAdmin(){
  $("adminScreen").classList.add("hidden");
  navigate("#/map");
}
const ADMIN_STAT_LABELS = {
  total_users:"סה\"כ משתמשים", active_users:"משתמשים פעילים", new_users_week:"חדשים השבוע",
  total_circles:"מעגלים", total_checkins:"צ'ק-אינים", total_invites:"הזמנות שנוצרו",
};
// App Essentials Phase 0F, Round 6 - שמות האירועים הממשיים ש-track() כותב בפועל (לא רשימה
// תיאורטית) - signup_completed/checkin_completed/search_used/share_used/install_prompt_accepted.
const EVENT_STAT_LABELS = {
  signup_completed:"הרשמות", checkin_completed:"צ'ק-אינים (אירוע)", search_used:"חיפושים",
  share_used:"שיתופים", install_prompt_accepted:"התקנות PWA",
};
async function renderAdminDashboard(){
  const statsEl = $("adminStats");
  statsEl.innerHTML = skeletonRows(3);
  const { data: stats, error: statsErr } = await supabase.rpc("get_admin_stats");
  if(statsErr || !stats){
    statsEl.innerHTML = errorStateHtml("שגיאה בטעינת נתוני הלוח.", renderAdminDashboard);
  } else {
    statsEl.innerHTML = Object.entries(ADMIN_STAT_LABELS).map(([key,label])=>
      `<div class="stat-box"><div class="v">${(stats[key]??0).toLocaleString()}</div><div class="l">${label}</div></div>`
    ).join("");
  }
  const eventStatsEl = $("adminEventStats");
  const { data: eventStats, error: eventStatsErr } = await supabase.rpc("get_event_counts");
  if(eventStatsErr || !eventStats){
    eventStatsEl.innerHTML = '<div class="empty-state" style="font-size:14px;">אין עדיין נתוני אירועים (יתכן שהתכונה עדיין לא מופעלת).</div>';
  } else {
    eventStatsEl.innerHTML = Object.entries(EVENT_STAT_LABELS).map(([key,label])=>
      `<div class="stat-box"><div class="v">${(eventStats[key]??0).toLocaleString()}</div><div class="l">${label}</div></div>`
    ).join("");
  }
  const { data: settings } = await supabase.from("app_settings").select("*").eq("id",1).maybeSingle();
  if(settings){
    $("admRegEnabled").checked = !!settings.registration_enabled;
    $("admInviteOnly").checked = !!settings.invite_only;
    $("admMaxUsers").value = settings.max_users ?? "";
    $("admDefaultInvites").value = settings.default_invites_per_user ?? 3;
  }
  await renderAdminUsersList();
}
async function renderAdminUsersList(){
  const listEl = $("adminUsersList");
  if(!listEl) return;
  listEl.innerHTML = skeletonRows(4);
  const { data: users, error } = await supabase.rpc("get_admin_users_list", { p_limit: 100 });
  if(error || !users){
    listEl.innerHTML = errorStateHtml("שגיאה בטעינת רשימת המשתמשים.", renderAdminUsersList);
    return;
  }
  if(!users.length){
    listEl.innerHTML = '<div class="empty-state">אין עדיין משתמשים רשומים.</div>';
    return;
  }
  listEl.innerHTML = users.map(u=>{
    const name = escapeHtml((u.name || "מטייל/ת").trim());
    const email = escapeHtml(u.email||"");
    const statusBadge = u.account_status && u.account_status!=="active"
      ? `<span class="admin-badge suspended">${escapeHtml(u.account_status)}</span>` : "";
    const adminBadge = u.is_admin ? `<span class="admin-badge">מנהל</span>` : "";
    return `<div class="admin-user-row">
      <div class="lb-avatar" style="background:${stringColor(name)}">${name.charAt(0)||"א"}</div>
      <div class="admin-user-info">
        <div class="admin-user-name">${name}${adminBadge}${statusBadge}</div>
        <div class="admin-user-sub">${email} · ${timeAgo(u.created_at)}</div>
      </div>
    </div>`;
  }).join("");
}
async function saveAdminSettings(){
  $("admSaveBtn").disabled = true;
  $("admSaveNote").classList.remove("show");
  const maxUsersVal = $("admMaxUsers").value.trim();
  const { error } = await supabase.from("app_settings").update({
    registration_enabled: $("admRegEnabled").checked,
    invite_only: $("admInviteOnly").checked,
    max_users: maxUsersVal==="" ? null : Number(maxUsersVal),
    default_invites_per_user: Number($("admDefaultInvites").value) || 0,
    updated_at: new Date().toISOString(),
  }).eq("id",1);
  $("admSaveBtn").disabled = false;
  $("admSaveNote").textContent = error ? "שגיאה בשמירת ההגדרות." : "ההגדרות נשמרו.";
  $("admSaveNote").classList.add("show");
}

function subscribeRealtime(){
  supabase.channel("public:visits-live")
    .on("postgres_changes", { event:"INSERT", schema:"public", table:"visits" }, ()=>{
      loadVisitCounts().then(renderMap);
      renderFeed(); renderBoard(); renderGroupPanel();
    })
    .subscribe();
  supabase.channel("public:likes-live")
    .on("postgres_changes", { event:"*", schema:"public", table:"likes" }, ()=> renderFeed())
    .subscribe();
}

/* ============ MAP (Leaflet + OpenStreetMap) ============ */
const ISRAEL_CENTER = [31.55, 34.95], DEFAULT_ZOOM = 8;
let leafletMap = null, clusterGroup = null, userLocMarker = null, userLocHalo = null;
const USER_LOC_PANE = "userLocPane";

const DURATION_BUCKETS = {
  short:h=>h<=1, medium:h=>h>1&&h<=3, half:h=>h>3&&h<=6, full:h=>h>6,
};
function filteredLandmarks(){
  return LANDMARKS.filter(l=>{
    if(filters.customIds && !filters.customIds.has(l.id)) return false;
    if(filters.cats.length && !filters.cats.includes(l.category)) return false;
    if(filters.diffs.length && !filters.diffs.includes(l.difficulty)) return false;
    if(filters.regions.length && !filters.regions.includes(l.region)) return false;
    if(userLoc && filters.maxDist<400){
      const d = haversine(userLoc.lat,userLoc.lon,l.lat,l.lon);
      if(d>filters.maxDist) return false;
    }
    if(filters.duration){
      const h = l.durationHours!=null ? l.durationHours : estimateHours(l);
      if(!DURATION_BUCKETS[filters.duration](h)) return false;
    }
    if(filters.season && l.season!==filters.season) return false;
    if(filters.family && !l.familyFriendly) return false;
    if(filters.dog && !l.dogFriendly) return false;
    if(filters.water && !l.hasWater) return false;
    if(filters.accessible && !l.accessible) return false;
    if(filters.free && l.priceType!=="free") return false;
    return true;
  });
}
function estimateHours(l){ return l.distanceKm ? l.distanceKm/3.2 : 1.5; }
function activeFilterCount(){
  return filters.cats.length + filters.diffs.length + filters.regions.length
    + (filters.maxDist<400?1:0) + (filters.duration?1:0) + (filters.season?1:0)
    + (filters.family?1:0) + (filters.dog?1:0) + (filters.water?1:0)
    + (filters.accessible?1:0) + (filters.free?1:0);
}
function updateFilterBadge(list){
  const badge = $("filterCountBadge");
  if(!badge) return;
  if(filters.customLabel){
    badge.textContent = filters.customLabel+" · "+list.length;
    badge.classList.remove("hidden");
    return;
  }
  const n = activeFilterCount();
  if(n>0){ badge.textContent = "· "+n; badge.classList.remove("hidden"); }
  else badge.classList.add("hidden");
}
function updateApplyCTA(){
  const n = filteredLandmarks().length;
  $("applyFilters").textContent = n===0 ? "הצג מקומות" : n===1 ? "הצג מקום אחד" : "הצג "+n+" מקומות";
}

/* ============ "מה עושים היום?" WIZARD ============ */
const DURATION_LABEL = { short:"עד שעה", medium:"1–3 שעות", half:"חצי יום", full:"יום מלא" };
let wizState = { duration:null, difficulty:null, company:null, maxDist:400, water:false, accessible:false, free:false, loc:null };
function wizardMatches(){
  let strictness = ["water","accessible","free","duration","difficulty"]; // relax in this order if too few results
  let dropped = [];
  let results = [];
  for(let attempt=0; attempt<=strictness.length; attempt++){
    results = LANDMARKS.filter(l=>{
      if(wizState.loc && wizState.maxDist<400){
        if(haversine(wizState.loc.lat,wizState.loc.lon,l.lat,l.lon) > wizState.maxDist) return false;
      }
      if(wizState.company==="family" && !l.familyFriendly) return false;
      if(!dropped.includes("difficulty") && wizState.difficulty && l.difficulty!==wizState.difficulty) return false;
      if(!dropped.includes("duration") && wizState.duration){
        const h = l.durationHours!=null ? l.durationHours : estimateHours(l);
        if(!DURATION_BUCKETS[wizState.duration](h)) return false;
      }
      if(!dropped.includes("water") && wizState.water && !(l.category==="water"||l.hasWater)) return false;
      if(!dropped.includes("accessible") && wizState.accessible && !l.accessible) return false;
      if(!dropped.includes("free") && wizState.free && l.priceType!=="free") return false;
      return true;
    });
    if(results.length>=3 || attempt===strictness.length) break;
    dropped.push(strictness[attempt]);
  }
  if(wizState.loc){
    results = results.map(l=>({ l, dist: haversine(wizState.loc.lat,wizState.loc.lon,l.lat,l.lon) })).sort((a,b)=>a.dist-b.dist).map(x=>x.l);
  } else {
    results = results.slice().sort((a,b)=>(b.baseVisits||0)-(a.baseVisits||0));
  }
  return { results: results.slice(0,3), relaxed: dropped };
}
function wizExplain(l){
  const parts = [];
  if(wizState.loc){
    const km = haversine(wizState.loc.lat,wizState.loc.lon,l.lat,l.lon);
    const mins = Math.round(km/55*60/5)*5;
    parts.push(km<1 ? "ממש לידך" : `כ-${mins<5?5:mins} דק' נסיעה ממך`);
  }
  const tier = tierForDb(l.difficulty);
  parts.push(tierDotHtml(tier)+tier.label);
  if(l.category==="water"||l.hasWater) parts.push("יש מים");
  if(l.accessible) parts.push("נגיש");
  if(l.priceType==="free") parts.push("חינם");
  parts.push("מתאים ל"+(l.duration||DURATION_LABEL[wizState.duration]||""));
  return parts.join(" · ");
}
// המלצה אישית: מחזירה {landmark, matchPct, reasons[]}.
// שלושה תיקונים מהותיים לגרסה הקודמת:
//   1. עבדה רק למשתמש מחובר עם היסטוריית ביקורים - כלומר בדיוק למי שכבר בפנים, ולא
//      למשתמש חדש או אורח, שהם הקהל שהכי צריך "היעד הבא שלך". עכשיו יש fallback
//      שמבוסס על קרבה, התאמה למשפחות, נגישות ופופולריות.
//   2. הניקוד כלל Math.random(), כך שההמלצה התחלפה בכל רינדור. עכשיו הזרע יציב
//      לפי משתמש+יום, כך ש"היעד הבא שלך" נשאר אותו יעד לאורך היום.
//   3. לא היה אחוז-התאמה. עכשיו יש, והוא מחושב מהאותות האמיתיים - ומוצג רק כשיש
//      מספיק אותות כדי שהמספר יהיה אמיתי (ראו MIN_SIGNALS_FOR_PCT).
const MIN_SIGNALS_FOR_PCT = 2;
function stableSeed(str){
  let h = 0;
  for(let i=0;i<str.length;i++) h = (h*31 + str.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}
function recommendationCandidates(){
  const visitedIds = new Set(myVisits.map(v=>v.landmark_id));
  return LANDMARKS.filter(l=>!visitedIds.has(l.id));
}
// מחזירה earned/applicable בנפרד: אחוז-ההתאמה הוא "כמה מהקריטריונים הרלוונטיים למשתמש
// הזה המקום באמת עונה עליהם", ולא ציון גולמי חלקי מקסימום תיאורטי שאף מקום לא מגיע אליו
// (בגרסה הראשונה זה נתן 60% כמעט תמיד - כלומר מספר חסר-משמעות).
function scoreLandmarkFor(l, profile, seedSalt){
  let earned = 0, applicable = 0, signals = 0;
  const reasons = [];
  const add = (weight, matched, reason)=>{
    applicable += weight;
    if(matched){ earned += weight; signals++; if(reason) reasons.push(reason); }
  };
  if(userLoc){
    const km = haversine(userLoc.lat,userLoc.lon,l.lat,l.lon);
    const near = km < 40;
    applicable += 30;
    earned += Math.max(0, 30-km);
    if(near){ signals++; reasons.push(km<1 ? "ממש לידך" : "כ-"+estimateDriveMinutes(km)+" דק' נסיעה ממך"); }
  }
  if(profile.preferredDiff) add(18, l.difficulty===profile.preferredDiff, "ברמת הקושי שאתם הכי אוהבים");
  else add(10, l.difficulty==="easy", "מסלול קל");
  if(profile.waterShare>0.4) add(14, l.category==="water"||l.hasWater, "יש שם מים, בדיוק כמו שאתם אוהבים");
  else if(!profile.hasHistory) add(8, l.category==="water"||l.hasWater, "יש מים");
  if(profile.familyShare>0.5) add(12, l.familyFriendly, "מתאים למשפחה");
  else if(!profile.hasHistory) add(7, l.familyFriendly, "מתאים למשפחות");
  if(profile.hasHistory) add(10, regionDiscoveryPct(l.region)<0.3, "אזור שכמעט לא גיליתם");
  else add(8, !!l.baseVisits && l.baseVisits>3000, "אחד האהובים על המטיילים");
  const tieBreak = stableSeed(l.id + "|" + seedSalt) * 4;   // שובר-שוויון יציב, לא אקראי
  return { l, score: earned + tieBreak, earned, applicable, reasons, signals };
}
function travelProfile(){
  const visitedLandmarks = myVisits.map(v=>lmById[v.landmark_id]).filter(Boolean);
  if(!visitedLandmarks.length) return { hasHistory:false, preferredDiff:null, waterShare:0, familyShare:0 };
  const diffCounts = {};
  visitedLandmarks.forEach(l=>{ diffCounts[l.difficulty] = (diffCounts[l.difficulty]||0)+1; });
  return {
    hasHistory: true,
    preferredDiff: Object.keys(diffCounts).sort((a,b)=>diffCounts[b]-diffCounts[a])[0] || null,
    waterShare: visitedLandmarks.filter(l=>l.category==="water"||l.hasWater).length/visitedLandmarks.length,
    familyShare: visitedLandmarks.filter(l=>l.familyFriendly).length/visitedLandmarks.length,
  };
}
function recommendationSeed(extra){
  const day = new Date().toISOString().slice(0,10);
  return (session ? session.user.id.slice(0,8) : "guest") + "|" + day + (extra ? "|"+extra : "");
}
function recommendDestination(opts){
  opts = opts || {};
  const candidates = recommendationCandidates().filter(l=> !opts.excludeId || l.id!==opts.excludeId);
  if(!candidates.length) return null;
  const profile = travelProfile();
  const salt = recommendationSeed(opts.salt);
  let best = null;
  candidates.forEach(l=>{
    const scored = scoreLandmarkFor(l, profile, salt);
    if(!best || scored.score > best.score) best = scored;
  });
  if(!best) return null;
  const pct = best.applicable > 0 ? Math.round(best.earned/best.applicable*100) : 0;
  return {
    landmark: best.l,
    reasons: best.reasons.slice(0,4),
    // מוצג רק כשבאמת יש על מה לבסס אותו - אחרת null, ולא מספר שנשמע מדויק אבל אינו
    matchPct: (best.signals >= MIN_SIGNALS_FOR_PCT && pct >= 50) ? Math.min(99, pct) : null,
  };
}
function getRecommendedDestination(){
  const rec = recommendDestination();
  if(!rec) return null;
  return { landmark: rec.landmark, reason: rec.reasons.slice(0,2).join(" · ") || tierForDb(rec.landmark.difficulty).label };
}
/* ============ TRIP MODE (§14) ============ */
// מסך-טיול מינימלי לשימוש בחוץ: מעט טקסט, ארבע מטרות-מגע גדולות, בלי ניווט מסיח.
// המצב נשמר ב-localStorage כדי שסגירת הדפדפן/רענון באמצע טיול לא יאבד אותו.
const TRIP_KEY = "magalim-active-trip-v1";
let activeTrip = null, tripTimer = null;
function loadActiveTrip(){
  try{
    const raw = JSON.parse(localStorage.getItem(TRIP_KEY)||"null");
    // טיול נשכח (מעל 12 שעות) לא נשאר תקוע על המסך לנצח
    if(raw && Date.now()-raw.startedAt < 12*3600*1000 && lmById[raw.landmarkId]) return raw;
  }catch(e){}
  return null;
}
function saveActiveTrip(){
  try{
    if(activeTrip) localStorage.setItem(TRIP_KEY, JSON.stringify(activeTrip));
    else localStorage.removeItem(TRIP_KEY);
  }catch(e){}
}
function tripElapsedText(){
  if(!activeTrip) return "";
  const mins = Math.max(0, Math.round((Date.now()-activeTrip.startedAt)/60000));
  if(mins < 1) return "יצאתם ממש עכשיו";
  if(mins < 60) return "התחלתם לפני "+mins+" דק׳";
  const h = Math.floor(mins/60), m = mins%60;
  return "התחלתם לפני "+h+" שע׳"+(m?" ו-"+m+" דק׳":"");
}
function startTrip(landmarkId){
  if(!lmById[landmarkId]) return;
  activeTrip = { landmarkId, startedAt: Date.now() };
  saveActiveTrip();
  track("trip_started", { landmark_id: landmarkId });
  closeSheet("detailSheet","detailScrim");
  renderTripMode();
}
function endTrip(silent){
  if(!activeTrip) return;
  if(!silent) track("trip_ended", { landmark_id: activeTrip.landmarkId,
    minutes: Math.round((Date.now()-activeTrip.startedAt)/60000) });
  activeTrip = null;
  saveActiveTrip();
  renderTripMode();
}
function renderTripMode(){
  const el = $("tripMode"), resume = $("tripResume");
  if(!el) return;
  if(tripTimer){ clearInterval(tripTimer); tripTimer = null; }
  if(!activeTrip){ el.classList.add("hidden"); resume.classList.add("hidden"); return; }
  const l = lmById[activeTrip.landmarkId];
  if(!l){ endTrip(true); return; }
  $("tripName").textContent = l.name;
  $("tripElapsed").textContent = tripElapsedText();
  $("tripCheckinIc").innerHTML = uiIcon("trophy",26);
  $("tripNavIc").innerHTML = uiIcon("region",24);
  $("tripInfoIc").innerHTML = uiIcon("duration",24);
  el.classList.remove("hidden");
  resume.classList.add("hidden");
  tripTimer = setInterval(()=>{
    if(!activeTrip || el.classList.contains("hidden")) return;
    $("tripElapsed").textContent = tripElapsedText();
  }, 30000);
}
function minimiseTrip(){
  if(!activeTrip) return;
  const l = lmById[activeTrip.landmarkId];
  $("tripMode").classList.add("hidden");
  $("tripResume").innerHTML = uiIcon("compass",17)+"<span>חזרה לטיול ב"+(l?l.name:"")+"</span>";
  $("tripResume").classList.remove("hidden");
}
function wireTripMode(){
  const l = ()=> activeTrip ? lmById[activeTrip.landmarkId] : null;
  $("tripEndBtn").onclick = ()=> endTrip();
  $("tripResume").onclick = ()=> renderTripMode();
  $("tripCheckinBtn").onclick = ()=>{
    const lm = l(); if(!lm) return;
    minimiseTrip();
    openDetail(lm.id);
    setTimeout(()=>{ const b = $("checkinBtn"); if(b && !b.disabled) b.click(); }, 350);
  };
  $("tripNavBtn").onclick = ()=>{ const lm = l(); if(lm) openWazeNavigation(lm.lat, lm.lon, lm.name); };
  $("tripInfoBtn").onclick = ()=>{ const lm = l(); if(!lm) return; minimiseTrip(); openDetail(lm.id); };
}

/* ============ TIME-BOXED CHALLENGE (§9) ============ */
// אתגר חודשי מחושב מהנתונים האמיתיים (myVisits.visited_at) - בלי טבלה חדשה ובלי נתונים
// מומצאים. היעד קבוע (5 מקומות חדשים בחודש) והדחיפות אמיתית: ימים שנותרו בחודש.
const MONTHLY_CHALLENGE_TARGET = 5;
const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
function monthlyChallenge(){
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const done = myVisits.filter(v=>{ const d=new Date(v.visited_at); return d>=monthStart && d<=now; }).length;
  const daysLeft = Math.max(0, Math.ceil((monthEnd-now)/86400000));
  return { target:MONTHLY_CHALLENGE_TARGET, done:Math.min(done,MONTHLY_CHALLENGE_TARGET), daysLeft,
           monthName:HE_MONTHS[now.getMonth()], pct:Math.min(100,Math.round(done/MONTHLY_CHALLENGE_TARGET*100)),
           complete: done>=MONTHLY_CHALLENGE_TARGET };
}
function monthlyChallengeHtml(){
  const c = monthlyChallenge();
  const days = c.daysLeft===0 ? "היום האחרון" : (c.daysLeft===1 ? "נשאר יום אחד" : "נשארו "+c.daysLeft+" ימים");
  return `<div class="challenge-strip${c.complete?" done":""}">
    <div class="challenge-strip-head"><div class="challenge-strip-title">אתגר ${c.monthName}</div>
      <div class="challenge-strip-days">${c.complete ? "הושלם!" : days}</div></div>
    <div class="challenge-strip-sub">${c.complete ? "השלמתם את האתגר החודשי — כל הכבוד" : "לגלות "+c.target+" מקומות חדשים"}</div>
    <div class="bar"><i style="width:${c.pct}%"></i></div>
    <div class="challenge-strip-foot"><span class="ltr">${c.done}/${c.target}</span></div>
  </div>`;
}

/* ============ WEEKEND PLANNER (§12) ============ */
function isWeekendWindow(){ const d=new Date().getDay(); return d===4||d===5||d===6; }
const WEEKEND_PICKS = [
  { key:"water", label:"מקום מים", icon:"water",      match:l=> l.category==="water" || l.hasWater },
  { key:"trail", label:"מסלול",    icon:"difficulty", match:l=> ["nature","mountains","parks","reserves"].includes(l.category) },
  { key:"view",  label:"תצפית",    icon:"region",     match:l=> l.category==="viewpoints" },
];
function weekendIdeas(){
  const visitedIds = new Set(myVisits.map(v=>v.landmark_id));
  const profile = travelProfile();
  const salt = recommendationSeed("weekend");
  const used = new Set();
  return WEEKEND_PICKS.map(pick=>{
    const pool = LANDMARKS.filter(l=> !visitedIds.has(l.id) && !used.has(l.id) && pick.match(l));
    if(!pool.length) return null;
    let best = null;
    pool.forEach(l=>{ const sc = scoreLandmarkFor(l, profile, salt); if(!best || sc.score>best.score) best = sc; });
    if(!best) return null;
    used.add(best.l.id);
    return { pick, landmark: best.l };
  }).filter(Boolean);
}

/* ============ HOME (§1,§2,§9,§10,§12) ============ */
function landmarkPhotoStyle(l){
  const url = landmarkPhotos[l.id] || l.stockPhotoUrl;
  const cat = CATEGORIES[l.category];
  return url ? `background-image:url('${url}')`
             : `background:linear-gradient(135deg, ${cat.color}, color-mix(in srgb, ${cat.color} 60%, #000 15%))`;
}
function whyRowsHtml(reasons){
  if(!reasons || !reasons.length) return "";
  return '<div class="next-goal-why"><div class="next-goal-why-title">למה בחרנו לכם את זה?</div>'
    + reasons.map(r=>`<div class="why-row">${uiIcon("check",15)}<span>${r}</span></div>`).join("")
    + '</div>';
}
function nextGoalCardHtml(rec){
  const l = rec.landmark;
  const hasPhoto = !!(landmarkPhotos[l.id] || l.stockPhotoUrl);
  return `<div class="next-goal" data-id="${l.id}">
    <div class="next-goal-photo" style="${hasPhoto ? landmarkPhotoStyle(l) : ""}">
      ${hasPhoto ? "" : photoFallbackHtml(l, 56)}
      ${rec.matchPct ? `<span class="match">${rec.matchPct}% התאמה</span>` : ""}
      <span class="pts"><bdi dir="ltr">+${pointsForLandmark(l)}</bdi></span>
      <div class="next-goal-overlay">
        <div class="next-goal-name">${l.name}</div>
        <div class="place-meta">
          <span class="place-meta-item">${uiIcon("region",13)}${REGIONS[l.region]}</span>
          <span class="place-meta-item">${uiIcon("difficulty",13)}${tierForDb(l.difficulty).label}</span>
          ${l.duration ? `<span class="place-meta-item">${uiIcon("duration",13)}${l.duration}</span>` : ""}
          ${l.hasWater ? `<span class="place-meta-item">${uiIcon("water",13)}מים</span>` : ""}
        </div>
      </div>
    </div>
    <div class="next-goal-body">
      ${whyRowsHtml(rec.reasons)}
      <div class="next-goal-actions">
        <button class="btn btn-primary" data-go="${l.id}">יאללה, יוצאים</button>
        <button class="btn btn-outline btn-sm" id="homeMoreOptions">עוד אפשרויות</button>
      </div>
    </div>
  </div>`;
}
/* ============ WEEKLY CHALLENGE ============ */
// אתגר אחד קצר לשבוע, זהה לכל המשתמשים ומתחלף לבד לפי מספר-השבוע - בלי טבלה חדשה
// ובלי תזמון בשרת. ההתקדמות נספרת מביקורים אמיתיים של השבוע הנוכחי, והפרס ניתן דרך
// מנגנון-הבונוסים הקיים (xp_bonus_grants, מפתח ייחודי user+type+source) כך שהוא באמת
// מתווסף ל-totalXP ולא יכול להינתן פעמיים. כשיהיה backend לאתגרים, רק CHALLENGES
// ו-currentChallenge() צריכים להתחלף - כל השאר כבר מדבר בממשק הזה.
const WEEKLY_CHALLENGE_XP = 50;
// ה"פרס" הוא רק מה שבאמת ניתן: בונוס XP דרך xp_bonus_grants. לא מבטיחים כאן חותמת או
// תג - אין ישות כזו שנוצרת בסוף האתגר, והבטחה שלא מתממשת גרועה מאין-פרס.
const WEEKLY_CHALLENGES = [
  { id:"water", task:"בקרו השבוע במקום חדש שיש בו מים", match:l=>l.hasWater,
    filter:f=>{ f.water = true; } },
  { id:"family", task:"צאו השבוע לטיול שמתאים לילדים", match:l=>l.familyFriendly,
    filter:f=>{ f.family = true; } },
  { id:"easy", task:"השלימו השבוע מסלול קל אחד", match:l=>l.difficulty==="easy",
    filter:f=>{ f.diffs = ["easy"]; } },
  { id:"north", task:"גלו השבוע מקום חדש בצפון", match:l=>l.region==="north",
    filter:f=>{ f.regions = ["north"]; } },
  { id:"south", task:"גלו השבוע מקום חדש בדרום", match:l=>l.region==="south",
    filter:f=>{ f.regions = ["south"]; } },
  { id:"accessible", task:"בקרו השבוע במקום נגיש לעגלות ולכיסא גלגלים", match:l=>l.accessible,
    filter:f=>{ f.accessible = true; } },
];
// שבוע ישראלי: ראשון עד שבת. מפתח יציב לשבוע ("2026-W38") שמשמש גם כ-source_id של הבונוס.
function weekStart(d){
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  s.setHours(0,0,0,0);
  return s;
}
function currentWeekKey(){
  const s = weekStart(new Date());
  const yearStart = new Date(s.getFullYear(), 0, 1);
  const week = Math.floor((s - weekStart(yearStart)) / 604800000) + 1;
  return s.getFullYear() + "-W" + String(week).padStart(2, "0");
}
function currentWeeklyChallenge(){
  const s = weekStart(new Date());
  const index = Math.floor(s.getTime() / 604800000) % WEEKLY_CHALLENGES.length;
  return WEEKLY_CHALLENGES[index];
}
function challengeVisitsThisWeek(ch){
  const from = weekStart(new Date()).getTime();
  return myVisits.filter(v=>{
    const l = lmById[v.landmark_id];
    return l && ch.match(l) && new Date(v.visited_at).getTime() >= from;
  }).length;
}
function challengeDaysLeft(){
  const end = weekStart(new Date()).getTime() + 604800000;
  return Math.max(1, Math.ceil((end - Date.now()) / 86400000));
}
function renderWeeklyChallenge(){
  const el = $("homeWeeklyChallenge");
  if(!el) return;
  const ch = currentWeeklyChallenge();
  const done = Math.min(1, challengeVisitsThisWeek(ch));
  const days = challengeDaysLeft();
  el.innerHTML = `<div class="weekly-chal${done?" is-done":""}">
    <div class="weekly-chal-top">
      <div class="weekly-chal-task">${ch.task}</div>
      <div class="weekly-chal-left">${days===1?"נותר יום אחרון":"נותרו "+days+" ימים"}</div>
    </div>
    <div class="weekly-chal-progress">
      <div class="bar"><i style="width:${done*100}%"></i></div>
      <span class="weekly-chal-count"><bdi dir="ltr">${done} / 1</bdi></span>
    </div>
    <div class="weekly-chal-reward">${done ? "הושלם! קיבלתם " : "הצ׳ק-אין הראשון שעונה על האתגר מזכה ב"}<b>+${WEEKLY_CHALLENGE_XP} נקודות</b>${done ? " בנוסף לנקודות הצ׳ק-אין" : ""}</div>
    ${done ? "" : `<button class="btn btn-outline btn-sm" id="challengeShowBtn">הצגת מקומות מתאימים</button>`}
  </div>`;
  const btn = $("challengeShowBtn");
  if(btn) btn.onclick = ()=>{
    Object.assign(filters, defaultFilters());
    ch.filter(filters);
    syncFilterUI(); syncQuickChips();
    navigate("#/map");
    renderMap();
  };
}
function renderHome(){
  if(!$("homeNextGoal") || !LANDMARKS.length) return;
  const discPct = LANDMARKS.length ? Math.round(myVisits.length/LANDMARKS.length*100) : 0;
  $("homeRingPct").textContent = discPct+"%";
  $("homeRing").style.strokeDashoffset = (213.6*(1-discPct/100)).toFixed(1);
  const firstName = myProfile && myProfile.name ? myProfile.name.trim().split(" ")[0] : null;
  $("homeHeadGreet").textContent = greetingForNow() + (firstName ? ", "+firstName : "");
  renderWeeklyChallenge();
  $("homeGreet").textContent = firstName ? firstName+", המסע שלך בישראל" : "המסע שלך בישראל";
  $("homeHeroSub").textContent = myVisits.length
    ? myVisits.length+" מקומות נכבשו · "+(LANDMARKS.length-myVisits.length)+" מחכים לכם"
    : "המקום הראשון שלכם מחכה ממש מעבר לפינה";

  const rec = recommendDestination();
  const goalEl = $("homeNextGoal");
  if(rec){
    goalEl.innerHTML = nextGoalCardHtml(rec);
    goalEl.querySelector("[data-go]").onclick = (e)=>{ e.stopPropagation();
      track("next_destination_clicked", { landmark_id: rec.landmark.id, match_pct: rec.matchPct||0 });
      goToDestination(rec.landmark.id); };
    goalEl.querySelector(".next-goal").onclick = ()=> goToDestination(rec.landmark.id);
    $("homeMoreOptions").onclick = (e)=>{ e.stopPropagation(); openTodaySheet(); };
    track("recommendation_generated", { source:"home", match_pct: rec.matchPct||0 });
  } else {
    goalEl.innerHTML = emptyStateHtml({ icon: uiIcon("compass",26), title:"כבשתם הכול!",
      sub:"גיליתם את כל המקומות שיש לנו כרגע. עוד יעדים בדרך.", ctaId:"homeEmptyCta", ctaLabel:"למפה" });
    const cta = $("homeEmptyCta"); if(cta) cta.onclick = ()=> navigate("#/map");
  }

  const daily = recommendDestination({ salt:"daily", excludeId: rec ? rec.landmark.id : null });
  const dailyEl = $("homeDaily");
  $("homeDailyHead").classList.toggle("hidden", !daily);
  if(daily){
    const l = daily.landmark;
    const hasPhoto = !!(landmarkPhotos[l.id] || l.stockPhotoUrl);
    dailyEl.innerHTML = `<div class="daily-card" data-id="${l.id}">
      <div class="daily-thumb" style="${hasPhoto?landmarkPhotoStyle(l):""}">${hasPhoto?"":photoFallbackHtml(l,26)}</div>
      <div class="daily-body"><div class="daily-kicker">מצאנו לכם מקום שאולי לא הכרתם</div>
        <div class="daily-name">${l.name}</div>
        <div class="place-meta"><span class="place-meta-item">${uiIcon("region",13)}${REGIONS[l.region]}</span>
          <span class="place-meta-item">${uiIcon("difficulty",13)}${tierForDb(l.difficulty).label}</span></div></div>
      <div class="place-pts">+${pointsForLandmark(l)}</div></div>`;
    dailyEl.querySelector(".daily-card").onclick = ()=> goToDestination(l.id);
  } else dailyEl.innerHTML = "";

  // אתגר חודשי + מתכנן סופ״ש - שני מנועי-חזרה מבוססי-זמן (§9, §12)
  $("homeChallenge").innerHTML = session ? monthlyChallengeHtml() : "";
  const ideas = isWeekendWindow() ? weekendIdeas() : [];
  $("homeWeekendHead").classList.toggle("hidden", !ideas.length);
  $("homeWeekend").innerHTML = ideas.map(({pick,landmark})=>
    `<button class="weekend-idea" data-id="${landmark.id}" type="button">
       <span class="weekend-idea-ic">${uiIcon(pick.icon,17)}</span>
       <span class="weekend-idea-body"><span class="weekend-idea-kind">${pick.label}</span>
         <span class="weekend-idea-name">${landmark.name}</span></span>
       <span class="place-pts">+${pointsForLandmark(landmark)}</span></button>`).join("");
  $("homeWeekend").querySelectorAll("[data-id]").forEach(b=> b.onclick = ()=> goToDestination(b.dataset.id));
  if(ideas.length) track("weekend_planner_shown", { ideas: ideas.length });

  // "כמעט שם" - open loop אמיתי מתוך התקדמות האזורים הקיימת (§10)
  const almostEl = $("homeAlmost");
  const almost = Object.keys(REGIONS).map(r=>{
    const all = LANDMARKS.filter(l=>l.region===r);
    const done = all.filter(l=> myVisits.some(v=>v.landmark_id===l.id)).length;
    return { r, done, total: all.length, left: all.length-done };
  }).filter(x=> x.total>0 && x.left>0 && x.done>0).sort((a,b)=>a.left-b.left)[0];
  if(almost && almost.left<=3){
    almostEl.innerHTML = `<div class="almost-card" id="homeAlmostCard">${uiIcon("trophy",20)}
      <div class="almost-text">נשאר${almost.left===1?"":"ו"} <b>${almost.left===1?"מקום אחד":almost.left+" מקומות"}</b> כדי להשלים את ${REGIONS[almost.r]}</div>
      ${uiIcon("compass",18)}</div>`;
    $("homeAlmostCard").onclick = ()=> navigate("#/map");
  } else almostEl.innerHTML = "";
}

function wizIntroWhyText(l){
  const tier = tierForDb(l.difficulty);
  const parts = [tierDotHtml(tier)+tier.label];
  if(l.category==="water"||l.hasWater) parts.push("יש מים");
  if(l.accessible) parts.push("נגיש");
  if(l.priceType==="free") parts.push("חינם");
  if(userLoc) parts.push("כ-"+estimateDriveMinutes(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))+" דק' נסיעה");
  return parts.join(" · ");
}
function wizIntroDismissKey(){ return "magalim-wiz-intro-"+(session ? session.user.id : "guest"); }
function renderWizIntro(){
  const introEl = $("wizIntro");
  const actionsEl = $("todaySheetActions");
  if(!introEl) return false;
  const today = new Date().toDateString();
  let dismissed = false;
  try{ dismissed = localStorage.getItem(wizIntroDismissKey())===today; }catch(e){}
  const rec = !dismissed ? getRecommendedDestination() : null;
  if(!rec){
    introEl.classList.add("hidden");
    $("wizForm").classList.remove("hidden");
    $("wizResults").classList.add("hidden");
    if(actionsEl) actionsEl.classList.remove("hidden");
    $("wizFindBtn").classList.remove("hidden");
    $("wizBackBtn").classList.add("hidden");
    return false;
  }
  const l = rec.landmark;
  const cat = CATEGORIES[l.category];
  const photoUrl = landmarkPhotos[l.id];
  introEl.classList.remove("hidden");
  $("wizForm").classList.add("hidden");
  $("wizResults").classList.add("hidden");
  if(actionsEl) actionsEl.classList.add("hidden");
  introEl.innerHTML = `
    <p class="wiz-intro-greet">לאן ממשיכים?</p>
    <div class="wiz-intro-card">
      <div class="wiz-intro-hero" style="${photoUrl?`background-image:url('${photoUrl}')`:`background:${cat.color}`}">${photoUrl?"":catIconSvg(cat.icon,32)}</div>
      <div class="wiz-intro-body">
        <div class="wiz-intro-name">${l.name}</div>
        <div class="wiz-intro-sub">${rec.reason}</div>
        <button class="wiz-intro-why" id="wizIntroWhy" type="button">למה דווקא זה?</button>
        <div class="wiz-intro-reason hidden" id="wizIntroReason">${wizIntroWhyText(l)}</div>
      </div>
    </div>
    <div class="wiz-intro-actions">
      <button class="btn btn-outline" id="wizIntroOther" type="button">תציע לי משהו אחר</button>
      <button class="btn btn-primary" id="wizIntroGo" type="button">נראה מעולה</button>
    </div>`;
  $("wizIntroGo").onclick = ()=>{ closeSheet("todaySheet","todayScrim"); goToDestination(l.id); };
  $("wizIntroOther").onclick = ()=>{
    try{ localStorage.setItem(wizIntroDismissKey(), today); }catch(e){}
    introEl.classList.add("hidden");
    $("wizForm").classList.remove("hidden");
    if(actionsEl) actionsEl.classList.remove("hidden");
  };
  $("wizIntroWhy").onclick = ()=> $("wizIntroReason").classList.toggle("hidden");
  return true;
}
function openTodaySheet(){
  track("discovery_started", {});
  openSheet("todaySheet","todayScrim");
  renderWizIntro();
}
function renderWizardResults(){
  const { results, relaxed } = wizardMatches();
  $("wizForm").classList.add("hidden");
  $("wizResults").classList.remove("hidden");
  $("wizBackBtn").classList.remove("hidden");
  $("wizFindBtn").classList.add("hidden");
  if(!results.length){
    $("wizResults").innerHTML = emptyStateHtml({ icon: uiIcon("compass",26), title: "לא מצאנו התאמה מדויקת",
      sub: "נסו להרחיב את המרחק או לשחרר קריטריון." });
    return;
  }
  let note = "";
  if(relaxed.length){
    const labels = { water:"מים", duration:"משך הזמן", difficulty:"רמת הקושי", accessible:"נגישות", free:"חינם" };
    note = `<div class="wiz-relaxed-note">לא מצאנו התאמה מלאה, אז הרחבנו את החיפוש (בלי דרישת ${relaxed.map(r=>labels[r]).join(", ")})</div>`;
  }
  const scored = results.map(l=>({ l, pct: wizMatchScore(l) }));
  const tagLabels = assignWizLabels(scored);
  $("wizResults").innerHTML = `<h3 style="margin:4px 0 12px;">מצאנו לך ${results.length} טיולים להיום</h3>${note}` +
    scored.map((s,i)=>{
      const l = s.l;
      const cat = CATEGORIES[l.category];
      const tag = tagLabels[i] ? `<div class="wiz-match-tag">${tagLabels[i]}</div>` : "";
      const pctChip = s.pct!=null ? `<div class="wiz-match-pct">${s.pct}% התאמה</div>` : "";
      return `<div class="mini-card wiz-result-card" data-id="${l.id}" role="button" tabindex="0" aria-label="${l.name}">
        <div class="mini-thumb">${photoFallbackHtml(l, 28)}</div>
        <div class="mini-info">${tag}<div class="name">${l.name}</div><div class="sub">${wizExplain(l)}</div>${pctChip}</div>
      </div>`;
    }).join("");
  $("wizResults").querySelectorAll(".wiz-result-card").forEach(el=>{
    const go = ()=>{ closeSheet("todaySheet","todayScrim"); goToDestination(el.dataset.id); };
    el.onclick = go;
    el.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } };
  });
}
function wizMatchScore(l){
  const criteria = [];
  if(wizState.difficulty) criteria.push(l.difficulty===wizState.difficulty);
  if(wizState.duration){
    const h = l.durationHours!=null ? l.durationHours : estimateHours(l);
    criteria.push(!!DURATION_BUCKETS[wizState.duration](h));
  }
  if(wizState.water) criteria.push(l.category==="water"||l.hasWater);
  if(wizState.accessible) criteria.push(!!l.accessible);
  if(wizState.free) criteria.push(l.priceType==="free");
  if(wizState.company==="family") criteria.push(!!l.familyFriendly);
  if(!criteria.length) return null;
  return Math.round(criteria.filter(Boolean).length/criteria.length*100);
}
function assignWizLabels(scored){
  const labels = {};
  const n = scored.length;
  if(!n) return labels;
  let bestIdx = 0;
  for(let i=1;i<n;i++){ if((scored[i].pct??-1) > (scored[bestIdx].pct??-1)) bestIdx=i; }
  labels[bestIdx] = uiIcon("points",13)+" הכי מתאים";
  if(n>1){
    let closestIdx = -1;
    if(wizState.loc){
      let minDist = Infinity;
      scored.forEach((s,i)=>{
        if(labels[i]) return;
        const d = haversine(wizState.loc.lat,wizState.loc.lon,s.l.lat,s.l.lon);
        if(d<minDist){ minDist=d; closestIdx=i; }
      });
    }
    if(closestIdx>=0) labels[closestIdx] = uiIcon("region",13)+" הכי קרוב";
    let adventureIdx = -1, maxPts = -1;
    scored.forEach((s,i)=>{
      if(labels[i]) return;
      const pts = pointsForLandmark(s.l);
      if(pts>maxPts){ maxPts=pts; adventureIdx=i; }
    });
    if(adventureIdx>=0) labels[adventureIdx] = uiIcon("compass",13)+" יותר הרפתקני";
  }
  return labels;
}

let israelBounds = null;
// המסגור ההתחלתי של המפה: כל הארץ. משמש גם בטעינה הראשונה, גם בכפתור "אפס זום"
// וגם בכל כניסה מחדש למסך המפה, כדי שלשלושתם תהיה בדיוק אותה תוצאה.
function fitIsrael(){
  if(!leafletMap) return;
  if(israelBounds) leafletMap.fitBounds(israelBounds, { padding:[28,28] });
  else leafletMap.setView(ISRAEL_CENTER, DEFAULT_ZOOM);
}
// מסלול-כניסה שמביא מסגור משלו (אתגר/אוסף שעושה fitBounds ליעדים שנותרו) מסמן את
// הדגל לפני navigate, כדי שהאיפוס לא ימחק את המסגור שלו. נצרך פעם אחת.
let keepMapFraming = false;
function initLeafletMap(){
  leafletMap = L.map("mapSvg", { zoomControl:false, attributionControl:true, minZoom:6, maxZoom:17 })
    .setView(ISRAEL_CENTER, DEFAULT_ZOOM);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(leafletMap);
  // מעל markerPane (600) ו-overlayPane (400), מתחת ל-popupPane (700). נוצר מיד עם
  // המפה, לפני כל שכבה, כדי ש-renderUserLocation לעולם לא יבקש pane שעוד לא קיים.
  leafletMap.createPane(USER_LOC_PANE).style.zIndex = 655;
  clusterGroup = L.markerClusterGroup({ maxClusterRadius:55, spiderfyOnMaxZoom:true, showCoverageOnHover:false });
  leafletMap.addLayer(clusterGroup);
  leafletMap.on("click", (e)=>{
    if(pickingLocation){ setManualLocation(e.latlng.lat, e.latlng.lng); return; }
    closePreview();
  });
  let moveDebounce = null;
  leafletMap.on("moveend", ()=>{ clearTimeout(moveDebounce); moveDebounce = setTimeout(renderDiscoveryCarousel, 150); });
  leafletMap.on("zoomend", syncPinLabels);
  syncPinLabels();
  if(LANDMARKS.length){
    israelBounds = L.latLngBounds(LANDMARKS.map(l=>[l.lat,l.lon]));
    fitIsrael();
  }
  renderFogOfWar();
}

// שם ליד כל סיכה בכל רמות הזום הפך את המפה לקיר טקסט - בתצוגת "כל הארץ" התוויות
// נחתכות זו בזו ומסתירות את הסיכות עצמן. מציגים אותן רק כשהזום מספיק קרוב כדי שהן
// לא יתנגשו; הסיכה הנבחרת והסיכה שזה עתה בוצע בה צ'ק-אין מסומנות תמיד (CSS).
const PIN_LABEL_MIN_ZOOM = 11;
function syncPinLabels(){
  if(!leafletMap) return;
  const wrap = document.querySelector(".map-wrap");
  if(wrap) wrap.classList.toggle("labels-on", leafletMap.getZoom() >= PIN_LABEL_MIN_ZOOM);
}
let previewId = null;
let justCheckedInId = null;
function openPreview(id){
  const l = lmById[id]; if(!l) return;
  previewId = id;
  const cat = CATEGORIES[l.category];
  const wished = myWishlist.includes(id);
  const photoUrl = landmarkPhotos[id];
  $("destPreviewHero").innerHTML = photoUrl
    ? '<img src="'+photoUrl+'" alt="'+l.name+'">'
    : photoFallbackHtml(l, 34);
  $("destPreviewName").textContent = l.name;
  const distText = userLoc ? Math.round(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))+' ק"מ ממך · ' : "";
  const previewTier = tierForDb(l.difficulty);
  $("destPreviewFacts").innerHTML = (distText ? '<span class="place-meta-item">'+distText.replace(/ · $/,"")+'</span>' : "")
    + '<span class="place-meta-item">'+uiIcon("difficulty",13)+previewTier.label+'</span>'
    + (l.duration ? '<span class="place-meta-item">'+uiIcon("duration",13)+l.duration+'</span>' : "")
    + '<span class="place-pts">+'+previewTier.xp+'</span>';
  $("destPreviewWish").innerHTML = uiIcon("heart",17);
  $("destPreviewWish").classList.toggle("active", !!wished);
  wireWazeButton($("destPreviewNav"), l);
  $("destPreview").classList.add("open");
  renderMap();
}
function closePreview(){
  $("diffLegendPopover").classList.add("hidden");
  $("diffLegendBtn").setAttribute("aria-expanded", "false");
  if(!previewId) return;
  previewId = null;
  $("destPreview").classList.remove("open");
  renderMap();
}
function renderMap(){
  if(!leafletMap) return;
  clusterGroup.clearLayers();
  const list = filteredLandmarks();
  updateFilterBadge(list);
  if(previewId && !list.some(l=>l.id===previewId)){ previewId = null; $("destPreview").classList.remove("open"); }
  list.forEach(l=>{
    const visited = myVisits.some(v=>v.landmark_id===l.id);
    const wished = myWishlist.includes(l.id);
    const selected = l.id===previewId;
    const justIn = l.id===justCheckedInId;
    const cat = CATEGORIES[l.category];
    // Gamification Overhaul, Phase 4 - צבע-הפין לפי קושי (לא קטגוריה), האייקון הפנימי נשאר
    // קטגוריה ללא שינוי - דרישה מפורשת ("לעולם לא להחליף אייקון/קטגוריה"). ראו legend חדש
    // ב-map-controls להסבר-נגיש (טקסט+צבע, לא צבע-בלבד).
    const icon = L.divIcon({
      className: "lm-divicon",
      html: '<div class="lm-pin-wrap">'
        + '<div class="lm-pin'+(visited?" visited":"")+(selected?" selected":"")+(justIn?" pulse":"")+'" style="--pin-color:'+tierForDb(l.difficulty).color+'">'
        + (wished?'<span class="lm-pin-star">★</span>':"")
        + (visited?'<span class="check">✓</span>':'<span class="lm-pin-icon">'+catIconSvg(cat.icon,12)+'</span>')
        + '</div><div class="lm-pin-label">'+l.name+'</div></div>',
      iconSize:[24,24], iconAnchor:[12,30], popupAnchor:[0,-28],
    });
    const marker = L.marker([l.lat,l.lon], { icon, riseOnHover:true });
    marker.on("click", (e)=>{ L.DomEvent.stopPropagation(e); openPreview(l.id); });
    clusterGroup.addLayer(marker);
  });
  renderUserLocation();
  renderFogOfWar();
  renderDiscoveryCarousel();
}

// הפס התחתון של המפה (קרוסלת-הגילוי או כרטיס-התצוגה) פרוס לרוחב מלא ומעל כפתורי-
// המפה ב-z-index, כך שכפתור "המיקום שלי", איפוס-הזום והמקרא נקברו מתחתיו ולחיצה
// עליהם נחתה בפועל על כרטיס-יעד. מרימים אותם בדיוק מעל מה שמוצג כרגע - לפי הגובה
// האמיתי שלו, כי הקרוסלה משנה גובה בין כרטיסים למצב "אין יעדים באזור", ובדסקטופ
// שני הפסים בכלל מוסתרים (offsetHeight אפס) והכפתורים חוזרים למקומם.
const MAP_OVERLAY_INSET = 12;  // ה-bottom של הפס התחתון
const MAP_CTL_GAP = 8;         // רווח בין הפס לכפתורים
function syncMapControlsOffset(){
  const wrap = $("mapWrap"); if(!wrap) return;
  const preview = $("destPreview"), section = $("discoverySection");
  let h = 0;
  if(preview.classList.contains("open")) h = preview.offsetHeight;
  else if(!section.classList.contains("hidden")) h = section.offsetHeight;
  wrap.style.setProperty("--map-ctl-bottom", h ? (h + MAP_OVERLAY_INSET + MAP_CTL_GAP) + "px" : "");
}
function renderDiscoveryCarousel(){
  fillDiscoveryCarousel();
  syncMapControlsOffset();
  if($("mapListSheet").classList.contains("open")) renderMapList();
}
// אותם יעדים שבקרוסלה, כרשימה מלאה. הקרוסלה היא ההצצה; זו התצוגה שאפשר לגלול בה.
let discoveryList = [];
function renderMapList(){
  const el = $("mapListBody");
  if(!el) return;
  $("mapListTitle").textContent = discoveryList.length
    ? discoveryList.length + " יעדים באזור המוצג"
    : "אין יעדים באזור המוצג";
  el.innerHTML = discoveryList.length
    ? discoveryList.map(l=> placeCardHtml(l)).join("")
    : emptyStateHtml({ icon: uiIcon("compass",26), title:"אין יעדים באזור המוצג",
        sub:"הזיזו את המפה או הרחיבו את הסינון כדי לראות עוד." });
  el.querySelectorAll(".mini-card").forEach(card=> card.onclick = ()=>{
    closeMapList();
    goToDestination(card.dataset.id);
  });
  wireMiniCardKeydown(el);
}
function openMapList(){
  renderMapList();
  openSheet("mapListSheet","mapListScrim", closeMapList);
}
function closeMapList(){
  closeSheet("mapListSheet","mapListScrim");
}
function fillDiscoveryCarousel(){
  if(!leafletMap) return;
  renderMapSidePanel();
  const section = $("discoverySection");
  const el = $("discoveryCarousel");
  section.classList.toggle("hidden", !!previewId);
  if(previewId) return;
  const bounds = leafletMap.getBounds();
  const center = leafletMap.getCenter();
  const list = filteredLandmarks()
    .filter(l=> bounds.contains([l.lat,l.lon]))
    .sort((a,b)=> haversine(center.lat,center.lng,a.lat,a.lon) - haversine(center.lat,center.lng,b.lat,b.lon))
    .slice(0,30);
  discoveryList = list;
  const headText = $("discoveryHeadingText");
  if(headText) headText.textContent = list.length ? list.length+" יעדים באזור המוצג" : "אין יעדים באזור המוצג";
  if(!list.length){
    el.innerHTML = '<div class="discovery-empty">אין יעדים באזור המוצג — נסו לזוז במפה או לרענן את הסינון.</div>';
    syncScrollFade(el);
    return;
  }
  el.innerHTML = list.map(l=>{
    const cat = CATEGORIES[l.category];
    const photoUrl = landmarkPhotos[l.id];
    const thumb = photoUrl
      ? '<img src="'+photoUrl+'" loading="lazy" decoding="async" alt="'+l.name+'">'
      : photoFallbackHtml(l, 26);
    const tier = tierForDb(l.difficulty);
    return '<div class="discovery-card" data-id="'+l.id+'" role="button" tabindex="0" aria-label="'+l.name+'">'
      + '<div class="discovery-card-thumb">'+thumb+'<span class="discovery-card-pts"><bdi dir="ltr">+'+pointsForLandmark(l)+'</bdi></span></div>'
      + '<div class="discovery-card-name">'+l.name+'</div>'
      + '<div class="discovery-card-facts">'+uiIcon("difficulty",12)+tier.label+(l.duration?'<span class="dot-sep"></span>'+uiIcon("duration",12)+l.duration:"")+'</div>'
      + '</div>';
  }).join("");
  el.querySelectorAll(".discovery-card").forEach(card=>{
    const go = ()=>{
      const l = lmById[card.dataset.id];
      if(!l) return;
      leafletMap.panTo([l.lat,l.lon]);
      openPreview(l.id);
    };
    card.onclick = go;
    card.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } };
  });
  syncScrollFade(el);
}

function renderMapSidePanel(){
  const panel = $("mapSidePanel");
  if(!panel || !leafletMap) return;
  if(previewId && lmById[previewId]){
    const l = lmById[previewId];
    const cat = CATEGORIES[l.category];
    const wished = myWishlist.includes(l.id);
    const photoUrl = landmarkPhotos[l.id];
    const panelConquest = myConquests.find(c=>c.landmark_id===l.id);
    panel.innerHTML = `
      <div class="lm-hero${photoUrl?" has-photo":""}" style="height:150px;${photoUrl?"":`background:linear-gradient(135deg, ${cat.color}, color-mix(in srgb, ${cat.color} 60%, #000 15%))`}">
        ${photoUrl ? `<img src="${photoUrl}" alt="${l.name}">` : catIconSvg(cat.icon,90).replace('<svg ','<svg style="color:#fff" ')}
      </div>
      <div class="lm-title-row"><div><h2>${l.name}</h2>
        <div class="lm-region">${REGIONS[l.region]} · <span class="cat-tag" style="background:${cat.color}">${catIconSvg(cat.icon,12)} ${cat.label}</span></div>
      </div></div>
      <div class="lm-stats">
        <div class="lm-stat"><div class="v">${tierDotHtml(tierForDb(l.difficulty))}${tierForDb(l.difficulty).label}</div><div class="l">קושי</div></div>
        ${l.duration ? `<div class="lm-stat"><div class="v">${l.duration}</div><div class="l">זמן משוער</div></div>` : ""}
        ${l.distanceKm!=null ? `<div class="lm-stat"><div class="v">${l.distanceKm} ק"מ</div><div class="l">הליכה</div></div>` : ""}
        <div class="lm-stat"><div class="v">${panelConquest ? '<span class="ltr">✓ '+panelConquest.xp_awarded.toLocaleString()+'</span>' : '<span class="ltr">+'+pointsForLandmark(l)+'</span>'}</div><div class="l">${panelConquest ? "נכבש" : effortClassFor(l).label}</div></div>
      </div>
      <p class="lm-desc">${l.desc}</p>
      <div class="lm-actions">
        <button class="icon-btn waze-btn" id="panelWazeBtn"></button>
        <button class="btn btn-outline${wished?" is-wished":""}" id="panelWishBtn">${uiIcon("heart",16)}${wished?"ברשימת המשאלות":"רוצה להגיע"}</button>
        <button class="btn btn-primary" id="panelDetailBtn">פרטים מלאים</button>
      </div>
    `;
    wireWazeButton($("panelWazeBtn"), l);
    $("panelWishBtn").onclick = ()=>{
      const run = async ()=>{
        const justAdded = await toggleWishlist(l.id);
        renderMapSidePanel();
        if(justAdded) $("panelWishBtn").classList.add("wish-pop");
      };
      if(!requireAuth("רוצה לשמור את המקום לפעם הבאה? צרו חשבון בחינם", run)) return;
      run();
    };
    $("panelDetailBtn").onclick = ()=> goToDestination(l.id);
  } else {
    const bounds = leafletMap.getBounds();
    const list = filteredLandmarks().filter(l=>bounds.contains([l.lat,l.lon])).slice(0,40);
    panel.innerHTML = '<div class="side-panel-head"><h3>יעדים באזור</h3></div><div class="side-list">' + list.map(l=>{
      return placeCardHtml(l, { photo: landmarkPhotos[l.id], region:false });
    }).join("") + '</div>';
    panel.querySelectorAll(".mini-card").forEach(card=>{
      const go = ()=>{
        const l = lmById[card.dataset.id];
        if(!l) return;
        leafletMap.panTo([l.lat,l.lon]);
        openPreview(l.id);
      };
      card.onclick = go;
      card.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } };
    });
  }
}

function wireStaticUI(){
  wireTripMode();
  wireAuthViews();
  initLeafletMap();
  document.querySelectorAll(".scroll-fade").forEach(wireScrollFade);
  $("onboardingSkip").onclick = closeOnboarding;
  $("onboardingNext").onclick = ()=>{
    if(onboardingStep<2){ onboardingStep++; updateOnboardingStep(); } else { closeOnboarding(); }
  };
  $("zoomIn").onclick=()=> leafletMap.zoomIn();
  $("zoomOut").onclick=()=> leafletMap.zoomOut();
  $("zoomReset").onclick = fitIsrael;
  // Gamification Overhaul, Phase 4 - מקרא-קושי: תוכן סטטי מ-DIFF_TIERS (טקסט+נקודת-צבע
  // אמיתית, לא אימוג'י ולא צבע-בלבד), נבנה פעם אחת. נסגר אוטומטית עם closePreview (אותה
  // קריאה שכבר קיימת על לחיצה על המפה) כדי לא להישאר פתוח ולחסום תוך כדי שימוש רגיל במפה.
  $("diffLegendPopover").innerHTML =
    '<div class="legend-title">צבע הסיכה — רמת קושי</div>'
    + DIFF_TIERS.map(t=>`<div class="diff-legend-row">${tierDotHtml(t)} ${t.label}</div>`).join("")
    + '<div class="legend-title legend-title-gap">ניקוד — לפי המאמץ</div>'
    + Object.values(EFFORT_TIERS).map(t=>
        `<div class="diff-legend-row"><span class="legend-pts">+${t.xp}</span> ${t.label} <span class="legend-hint">${t.hint}</span></div>`
      ).join("");
  $("diffLegendBtn").onclick = (e)=>{
    e.stopPropagation();
    const open = $("diffLegendPopover").classList.toggle("hidden")===false;
    $("diffLegendBtn").setAttribute("aria-expanded", String(open));
  };
  $("locateBtn").onclick=()=>{
    if(!navigator.geolocation){ toast("המכשיר לא תומך באיתור מיקום"); return; }
    dismissLocateHint();
    handleLocateTap();
  };
  $("locateHintBtn").onclick = ()=>{ dismissLocateHint(); $("locateBtn").click(); };
  $("locateHintClose").onclick = (e)=>{ e.stopPropagation(); dismissLocateHint(); };
  $("locationTestBtn").onclick = runLocationTest;
  $("locationManualBtn").onclick = startManualLocationPick;
  $("locationApproxBtn").onclick = useApproxLocation;
  $("liveTrackingToggle").onchange = (e)=> setLiveTracking(e.target.checked);
  $("locationClearManualBtn").onclick = clearManualLocation;
  $("manualLocCancel").onclick = cancelManualLocationPick;
  $("locationCopyBtn").onclick = async ()=>{
    try{ await navigator.clipboard.writeText($("locationDiag").textContent); toast("הדוח הועתק"); }
    catch(e){ toast("לא הצלחנו להעתיק — אפשר לסמן ולהעתיק ידנית"); }
  };
  $("openFilters").onclick=()=>{ syncFilterUI(); openSheet("filterSheet","filterScrim"); };
  $("openFilters").onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); syncFilterUI(); openSheet("filterSheet","filterScrim"); } };
  $("closeFilters").onclick=()=>closeSheet("filterSheet","filterScrim");
  $("filterScrim").onclick=()=>closeSheet("filterSheet","filterScrim");
  $("clearFilters").onclick=()=>{ filters=defaultFilters(); syncFilterUI(); syncQuickChips(); renderMap(); };
  $("applyFilters").onclick=()=>{ renderMap(); closeSheet("filterSheet","filterScrim"); syncFilterUI(); syncQuickChips(); };
  $("destPreview").onclick = ()=> previewId && goToDestination(previewId);
  $("destPreview").onkeydown = e=>{ if((e.key==="Enter"||e.key===" ") && previewId){ e.preventDefault(); goToDestination(previewId); } };
  $("destPreviewWish").onclick = (e)=>{
    e.stopPropagation();
    if(!previewId) return;
    const id = previewId;
    const run = async ()=>{
      const justAdded = await toggleWishlist(id);
      $("destPreviewWish").classList.toggle("active", justAdded);
      if(justAdded){
        $("destPreviewWish").classList.remove("wish-pop");
        void $("destPreviewWish").offsetWidth;
        $("destPreviewWish").classList.add("wish-pop");
      }
      renderProfile();
    };
    if(!requireAuth("רוצה לשמור את המקום לפעם הבאה? צרו חשבון בחינם", run)) return;
    run();
  };
  wireSingleSelectChips("durationChips", "duration");
  wireSingleSelectChips("seasonChips", "season");
  // אותם אייקונים בדיוק כמו amenityChips() בדף הפרטים (לא אימוג'י בכפתור סינון
  // ואייקון-קו בכרטיס - שני עיצובים לאותו מושג).
  const AMENITY_FILTER_CHIPS = [
    ["family","family","מתאים למשפחות"], ["dog","dog","אפשר עם כלב"], ["water","water","יש מים"],
    ["accessible","wheelchair","נגיש"], ["free",null,"חינם"],
  ];
  $("amenityChips").innerHTML = AMENITY_FILTER_CHIPS.map(([id,icon,label])=>
    '<button class="chip" data-id="'+id+'">'+(icon?uiIcon(icon,14):"")+label+'</button>').join("");
  wireBooleanChips("amenityChips", { family:"family", dog:"dog", water:"water", accessible:"accessible", free:"free" });
  document.querySelectorAll(".quick-chip-row .quick-chip").forEach(chip=>{
    chip.onclick = ()=>{
      const key = chip.dataset.quick;
      if(key==="near"){
        if(!userLoc){ $("locateBtn").click(); }
        filters.maxDist = filters.maxDist<400 ? 400 : 15;
      } else if(key==="water") filters.water = !filters.water;
      else if(key==="easy") filters.diffs = filters.diffs.includes("easy") ? filters.diffs.filter(x=>x!=="easy") : [...filters.diffs, "easy"];
      else if(key==="short") filters.duration = filters.duration==="short" ? null : "short";
      else if(key==="north") filters.regions = filters.regions.includes("north") ? filters.regions.filter(x=>x!=="north") : [...filters.regions, "north"];
      else if(key==="family") filters.family = !filters.family;
      else if(key==="accessible") filters.accessible = !filters.accessible;
      else if(key==="free") filters.free = !filters.free;
      renderMap(); syncFilterUI(); syncQuickChips();
      // אותה שורת-צ'יפים קיימת גם במסך הבית: שם הכוונה היא "תראה לי את אלה", אז עוברים
      // למפה עם הסינון שכבר הוחל (במפה עצמה נשארים במקום).
      if(!location.hash || location.hash==="#/home") navigate("#/map");
    };
  });
  $("openMapList").onclick = openMapList;
  $("closeMapList").onclick = closeMapList;
  $("mapListScrim").onclick = closeMapList;
  $("shareMapBtn").onclick = ()=> shareMyMap();
  Object.entries(DIFF_CHIPS_DICT).forEach(([id,d])=>{
    const chip = document.createElement("button");
    chip.className = "chip teal"; chip.dataset.id = id; chip.textContent = d.label;
    $("wizDifficulty").appendChild(chip);
  });
  Object.entries(DIFF_CHIPS_DICT).forEach(([id,d])=>{
    const chip = document.createElement("button");
    chip.className = "chip teal"; chip.dataset.id = id; chip.textContent = d.label;
    $("prefDifficulty").appendChild(chip);
  });
  document.querySelectorAll("#wizDuration .chip, #wizDifficulty .chip, #wizCompany .chip").forEach(chip=>{
    const key = chip.closest("#wizDuration") ? "duration" : chip.closest("#wizDifficulty") ? "difficulty" : "company";
    chip.onclick = ()=>{
      wizState[key] = wizState[key]===chip.dataset.id ? null : chip.dataset.id;
      chip.parentElement.querySelectorAll(".chip").forEach(c=>c.classList.toggle("active", c.dataset.id===wizState[key]));
    };
  });
  $("wizWaterChip").onclick = ()=>{ wizState.water = !wizState.water; $("wizWaterChip").classList.toggle("active", wizState.water); };
  $("wizAccessibleChip").onclick = ()=>{ wizState.accessible = !wizState.accessible; $("wizAccessibleChip").classList.toggle("active", wizState.accessible); };
  $("wizFreeChip").onclick = ()=>{ wizState.free = !wizState.free; $("wizFreeChip").classList.toggle("active", wizState.free); };
  $("wizDistRange").oninput = e=>{ wizState.maxDist = Number(e.target.value); $("wizDistVal").textContent = wizState.maxDist>=400?"ללא הגבלה":wizState.maxDist+' ק"מ'; };
  $("wizLocateBtn").onclick = ()=>{
    if(!navigator.geolocation){ toast("המכשיר לא תומך באיתור מיקום"); return; }
    $("wizLocStatus").innerHTML = '<span class="ic">'+uiIcon("compass",19)+'</span> מאתר מיקום...';
    locateUser(()=>{
      wizState.loc = userLoc;
      $("wizLocStatus").className = "checkin-status ok";
      $("wizLocStatus").innerHTML = '<span class="ic">✓</span> המיקום אותר בהצלחה';
    }, err=>{
      $("wizLocStatus").className = "checkin-status bad";
      $("wizLocStatus").innerHTML = '<span class="ic">✕</span> ' + escapeHtml(geoErrorMessage(err)) + ' — עדיין אפשר לחפש בלי זה';
    });
  };
  $("wizFindBtn").onclick = ()=> renderWizardResults();
  $("wizBackBtn").onclick = ()=>{
    $("wizForm").classList.remove("hidden");
    $("wizResults").classList.add("hidden");
    $("wizBackBtn").classList.add("hidden");
    $("wizFindBtn").classList.remove("hidden");
  };
  $("openTodayWizard").onclick = openTodaySheet;
  $("welcomeFindBtn").onclick = ()=> { navigate("#/map"); openTodaySheet(); };
  $("nextLevelCta").onclick = ()=> { navigate("#/map"); openTodaySheet(); };
  $("closeToday").onclick = ()=> closeSheet("todaySheet","todayScrim");
  $("todayScrim").onclick = ()=> closeSheet("todaySheet","todayScrim");
  $("closeRegionSheet").onclick = ()=> closeSheet("regionSheet","regionScrim");
  $("regionScrim").onclick = ()=> closeSheet("regionSheet","regionScrim");
  $("openSettingsBtn").onclick = ()=>{
    openSheet("settingsSheet","settingsScrim");
    updateSettingsInstallRow();
    renderBlockedUsers();
    renderLocationPermStatus();
    const av = (myProfile && myProfile.activity_visibility) || "friends_groups";
    document.querySelectorAll("#activityVisibilitySeg button").forEach(b=> b.classList.toggle("active", b.dataset.val===av));
    const np = (myProfile && myProfile.notification_prefs) || { enabled:true, friends:true, groups:true };
    $("notifEnabledToggle").checked = np.enabled!==false;
    $("notifFriendsToggle").checked = np.friends!==false;
    $("notifGroupsToggle").checked = np.groups!==false;
    $("notifCategoryToggles").classList.toggle("hidden", np.enabled===false);
    refreshPushRow();
  };
  async function saveNotificationPrefs(){
    const prefs = {
      enabled: $("notifEnabledToggle").checked,
      friends: $("notifFriendsToggle").checked,
      groups: $("notifGroupsToggle").checked,
    };
    $("notifCategoryToggles").classList.toggle("hidden", !prefs.enabled);
    try{
      const { error } = await supabase.from("profiles").update({ notification_prefs: prefs }).eq("id", session.user.id);
      if(error) throw error;
      myProfile.notification_prefs = prefs;
      toast("✓ ההעדפה נשמרה");
    }catch(err){
      console.error(err);
      toast("לא ניתן לעדכן כרגע (יתכן שהתכונה עדיין לא מופעלת)");
    }
  }
  $("notifEnabledToggle").onchange = saveNotificationPrefs;
  $("notifFriendsToggle").onchange = saveNotificationPrefs;
  $("notifGroupsToggle").onchange = saveNotificationPrefs;
  $("pushToggle").onchange = async (e)=>{
    e.target.disabled = true;
    if(e.target.checked) await enablePush(); else await disablePush();
    await refreshPushRow();
  };
  $("closeSettingsSheet").onclick = ()=> closeSheet("settingsSheet","settingsScrim");
  $("settingsScrim").onclick = ()=> closeSheet("settingsSheet","settingsScrim");
  $("closeCheckinSheet").onclick = ()=> closeSheet("checkinSheet","checkinScrim");
  $("checkinScrim").onclick = ()=> closeSheet("checkinSheet","checkinScrim");
  $("closeReviewSheet").onclick = ()=> closeSheet("reviewSheet","reviewScrim");
  $("reviewScrim").onclick = ()=> closeSheet("reviewSheet","reviewScrim");
  $("saveReviewBtn").onclick = ()=> saveReview();
  $("closeReportSheet").onclick = ()=> closeSheet("reportSheet","reportScrim");
  $("reportScrim").onclick = ()=> closeSheet("reportSheet","reportScrim");
  $("reportSubmitBtn").onclick = async ()=>{
    if(!reportSheetState.reason){ toast("בחרו סיבה לפני השליחה"); return; }
    const btn = $("reportSubmitBtn"); btn.disabled = true;
    try{
      await reportSheetState.onSubmit(reportSheetState.reason, $("reportMessageText").value.trim());
      closeSheet("reportSheet","reportScrim");
      toast("✓ תודה, הדיווח נשלח");
    }catch(err){
      console.error(err);
      toast("לא הצלחנו לשלוח את הדיווח. נסה שוב.");
    }finally{
      btn.disabled = false;
    }
  };
  $("confirmOkBtn").onclick = ()=>{ closeSheet("confirmSheet","confirmScrim"); const r=confirmResolve; confirmResolve=null; r && r(true); };
  $("confirmCancelBtn").onclick = ()=>{ closeSheet("confirmSheet","confirmScrim"); const r=confirmResolve; confirmResolve=null; r && r(false); };
  $("confirmScrim").onclick = ()=>{ closeSheet("confirmSheet","confirmScrim"); const r=confirmResolve; confirmResolve=null; r && r(false); };
  document.querySelectorAll("#activityVisibilitySeg button").forEach(b=>{
    b.onclick = async ()=>{
      document.querySelectorAll("#activityVisibilitySeg button").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      try{
        const { error } = await supabase.from("profiles").update({ activity_visibility: b.dataset.val }).eq("id", session.user.id);
        if(error) throw error;
        myProfile.activity_visibility = b.dataset.val;
        toast("✓ ההעדפה נשמרה");
      }catch(err){
        console.error(err);
        toast("לא ניתן לעדכן כרגע (יתכן שהתכונה עדיין לא מופעלת)");
      }
    };
  });
  document.querySelectorAll("#themeSeg button").forEach(b=>{
    b.classList.toggle("active", b.dataset.theme===themePref);
    b.onclick = ()=> setTheme(b.dataset.theme);
  });
  $("reduceMotionToggle").checked = reduceMotionPref;
  $("reduceMotionToggle").onchange = e=> setReduceMotion(e.target.checked);
  $("headerLoginBtn").onclick = ()=> openAuthSheet();
  $("boardGuestBtn").onclick = ()=> openAuthSheet();
  $("profileGuestBtn").onclick = ()=> openAuthSheet();
  $("distRange").oninput = e=>{ filters.maxDist=Number(e.target.value); updateDistVal(); syncDistQuickChips(); updateApplyCTA(); };
  document.querySelectorAll("#distQuickChips .chip").forEach(chip=>{
    chip.onclick = ()=>{
      const min = Number(chip.dataset.min);
      if(min>0 && !userLoc){ $("locateBtn").click(); }
      filters.maxDist = min>0 ? kmForDriveMinutes(min) : 400;
      updateDistVal(); syncDistQuickChips(); renderMap(); syncQuickChips(); updateApplyCTA();
    };
  });
  $("detailScrim").onclick=()=> goBack();
  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.onclick=()=> navigate("#/"+btn.dataset.view);
  });
  // מקפיץ את הפוקוס אל המסך הפעיל, כדי לא לעבור בטאב על הכותרת בכל מסך מחדש
  $("skipToContent").onclick=(e)=>{ e.preventDefault(); focusView(currentView); };
  document.querySelectorAll(".tab-row [data-list]").forEach(btn=>{
    btn.onclick=()=>{
      setProfileListTab(btn.dataset.list); renderProfile();
    };
  });
  $("editNameBtn").onclick = ()=> navigate("#/settings/profile");
  $("editProfileLinkBtn").onclick = ()=>{ closeSheet("settingsSheet","settingsScrim"); navigate("#/settings/profile"); };
  $("editProfileCloseBtn").onclick = closeEditProfile;
  $("settingsAboutBtn").onclick = ()=>{ closeSheet("settingsSheet","settingsScrim"); navigate("#/about"); };
  $("aboutCloseBtn").onclick = goBack;
  $("aboutTermsBtn").onclick = ()=> navigate("#/terms");
  $("aboutPrivacyBtn").onclick = ()=> navigate("#/privacy-policy");
  $("termsCloseBtn").onclick = goBack;
  $("privacyPolicyCloseBtn").onclick = goBack;
  $("settingsHelpBtn").onclick = ()=>{ closeSheet("settingsSheet","settingsScrim"); navigate("#/help"); };
  $("installBannerActionBtn").onclick = async ()=>{
    if(!deferredInstallPrompt) return;
    $("installBanner").classList.add("hidden");
    deferredInstallPrompt.prompt();
    try{ await deferredInstallPrompt.userChoice; }catch(e){}
    deferredInstallPrompt = null;
  };
  $("installBannerDismissBtn").onclick = ()=>{
    $("installBanner").classList.add("hidden");
    try{ localStorage.setItem("magalim-install-dismissed","1"); }catch(e){}
  };
  $("settingsInstallBtn").onclick = async ()=>{
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      try{ await deferredInstallPrompt.userChoice; }catch(e){}
      deferredInstallPrompt = null;
      updateSettingsInstallRow();
    } else if(isIOSSafariNotStandalone()){
      toast('הקישו על כפתור השיתוף ואז "הוסף למסך הבית"');
    }
  };
  $("notifBellBtn").onclick = ()=> navigate("#/notifications");
  $("notificationsCloseBtn").onclick = goBack;
  $("openSearchBtn").onclick = openSearchSheet;
  $("homeSearchBtn").onclick = openSearchSheet;
  // מכשיר בלי Vibration API (כל ה-iPhone, למשל) - מציגים מצב אמיתי במקום מתג שלא עושה כלום
  const hapticsToggle = $("hapticsToggle");
  if(!navigator.vibrate){
    hapticsToggle.checked = false;
    hapticsToggle.disabled = true;
    $("hapticsStatusText").textContent = "המכשיר הזה לא תומך ברטט מתוך הדפדפן.";
  } else {
    hapticsToggle.checked = hapticsEnabled();
    hapticsToggle.onchange = ()=>{
      setHapticsEnabled(hapticsToggle.checked);
      if(hapticsToggle.checked) haptic("success");
    };
  }
  $("closeSearchSheet").onclick = ()=> closeSheet("searchSheet","searchScrim");
  $("searchScrim").onclick = ()=> closeSheet("searchSheet","searchScrim");
  let searchInputDebounce = null;
  $("searchInput").oninput = ()=>{
    clearTimeout(searchInputDebounce);
    searchInputDebounce = setTimeout(()=>{
      const q = $("searchInput").value;
      if(q.trim()) renderSearchResults(q); else renderSearchDefault();
    }, 150);
  };
  $("helpCloseBtn").onclick = goBack;
  $("reportProblemToggle").onclick = ()=> $("reportProblemForm").classList.toggle("hidden");
  $("sendIdeaToggle").onclick = ()=> $("sendIdeaForm").classList.toggle("hidden");
  $("reportProblemSubmit").onclick = ()=> submitFeedback("bug", $("reportProblemText"));
  $("sendIdeaSubmit").onclick = ()=> submitFeedback("idea", $("sendIdeaText"));
  $("changeAvatarBtn").onclick = ()=> $("avatarInput").click();
  $("avatarInput").onchange = e=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      const img = new Image();
      img.onload = ()=>{
        const maxW=240, scale=Math.min(1,maxW/img.width);
        const c = document.createElement("canvas");
        c.width = img.width*scale; c.height = img.height*scale;
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        c.toBlob(blob=>{
          editAvatarPhoto = { blob, dataUrl: c.toDataURL("image/jpeg",0.85) };
          $("editAvatarPreview").innerHTML = `<img src="${editAvatarPhoto.dataUrl}" alt="תמונת פרופיל">`;
        }, "image/jpeg", 0.85);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  wireMultiChips("prefCompany", ()=>editPrefs.company);
  wireMultiChips("prefInterests", ()=>editPrefs.interests);
  wireMultiChips("prefAmenities", ()=>editPrefs.amenities);
  wireSingleChip("prefDifficulty", "difficulty");
  wireSingleChip("prefDuration", "duration");
  wireSingleChip("prefDistance", "distance");
  $("saveProfileBtn").onclick = saveProfile;
  $("sharingToggle").onchange = e=> setSharingEnabled(e.target.checked);
  document.querySelectorAll("#travelRegionChips .chip").forEach(chip=>{
    chip.onclick = ()=>{
      document.querySelectorAll("#travelRegionChips .chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active");
    };
  });
  $("setTravelingBtn").onclick = ()=>{
    const active = document.querySelector("#travelRegionChips .chip.active");
    if(!active){ toast("בחרו אזור קודם"); return; }
    setTravelingToday(active.dataset.region);
  };
  $("revokeSharingBtn").onclick = revokeSharing;
  $("adminCloseBtn").onclick = closeAdmin;
  $("admSaveBtn").onclick = saveAdminSettings;
  $("adminLinkBtn").onclick = ()=> navigate("#/admin");
  $("deleteAccountBtn").onclick = async ()=>{
    const ok = await confirmAction({
      title: "למחוק את החשבון?",
      message: 'הפעולה תמחק לצמיתות את החשבון ואת כל המידע האישי המשויך אליו — פרופיל, ביקורים, רשימת משאלות, חברים וקבוצות שיצרתם. אי אפשר לבטל את זה.',
      confirmLabel: "מחק את החשבון", destructive: true,
    });
    if(!ok) return;
    try{
      const { error } = await supabase.rpc("delete_my_account");
      if(error) throw error;
      closeSheet("settingsSheet","settingsScrim");
      await supabase.auth.signOut();
      toast("החשבון נמחק");
      navigate("#/map");
    }catch(err){
      console.error(err);
      toast("לא הצלחנו למחוק את החשבון כרגע. נסה שוב.");
    }
  };
  $("markAllReadBtn").onclick = async ()=>{ await markAllNotificationsRead(); renderNotifications(); };
  document.querySelectorAll("#boardTabs button").forEach(b=> b.onclick = ()=> switchBoardTab(b.dataset.tab));
  $("periodSeg").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    setBoardPeriod(b.dataset.period); renderBoard();
  });
  $("inviteBtn").onclick = async ()=>{
    let url;
    try{
      const code = await getOrCreateInvite("friend", null);
      url = `${location.origin}${location.pathname}#/invite/${code}`;
    }catch(err){
      if(err.code==="quota_exceeded"){ toast(err.message); return; }
      url = `${location.origin}${location.pathname}?ref=${session.user.id}`;
    }
    shareLink(url, "מגלים", "בוא/י תצטרף/י אליי לכבוש יעדים בישראל באפליקציית מגלים את ישראל!");
  };
  $("groupSelect").onchange = e=>{ activeGroupId = e.target.value; updateGroupBarVisibility(); renderGroupPanel(); };
  $("groupNewBtn").onclick = createGroup;
  $("groupDeleteBtn").onclick = deleteActiveGroup;
  $("groupCreateBtn").onclick = createGroup;
  $("groupInviteBtn").onclick = async ()=>{
    if(!activeGroupId){ toast("צור קבוצה קודם"); return; }
    const g = myGroups.find(g=>g.id===activeGroupId);
    let url;
    try{
      const code = await getOrCreateInvite("circle", activeGroupId);
      url = `${location.origin}${location.pathname}#/invite/${code}`;
    }catch(err){
      if(err.code==="quota_exceeded"){ toast(err.message); return; }
      url = `${location.origin}${location.pathname}?group=${activeGroupId}`;
    }
    shareLink(url, "מגלים", `הצטרפ/י לקבוצה "${g?g.name:''}" באפליקציית מגלים!`);
  };
  window.addEventListener("online", ()=>{ updateOnlineStatus(); flushPendingQueue(); });
  window.addEventListener("offline", updateOnlineStatus);
  $("updateBannerBtn").onclick = ()=> location.reload(true);
  document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") checkForNewVersion(); });
  setInterval(checkForNewVersion, 5*60*1000);
}

function buildChips(container, dict, filterKey, extraClass){
  const el = $(container);
  el.innerHTML = Object.entries(dict).map(([id,v])=>{
    const label = typeof v==="string"?v:v.label;
    const color = v && v.color ? '<span class="sw" style="background:'+v.color+'"></span>' : "";
    return '<button class="chip'+(extraClass?" "+extraClass:"")+'" data-id="'+id+'">'+color+label+"</button>";
  }).join("");
  el.querySelectorAll(".chip").forEach(chip=>{
    chip.onclick=()=>{
      const id = chip.getAttribute("data-id");
      const arr = filters[filterKey];
      const idx = arr.indexOf(id);
      if(idx>=0){arr.splice(idx,1); chip.classList.remove("active");} else {arr.push(id); chip.classList.add("active");}
      updateApplyCTA();
    };
  });
}
function wireSingleSelectChips(containerId, filterKey){
  document.querySelectorAll("#"+containerId+" .chip").forEach(chip=>{
    chip.onclick = ()=>{
      const id = chip.dataset.id;
      filters[filterKey] = filters[filterKey]===id ? null : id;
      document.querySelectorAll("#"+containerId+" .chip").forEach(c=>c.classList.toggle("active", c.dataset.id===filters[filterKey]));
      updateApplyCTA();
    };
  });
}
function wireBooleanChips(containerId, keyMap){
  document.querySelectorAll("#"+containerId+" .chip").forEach(chip=>{
    const key = keyMap[chip.dataset.id];
    chip.onclick = ()=>{ filters[key] = !filters[key]; chip.classList.toggle("active", filters[key]); updateApplyCTA(); };
  });
}
function syncQuickChips(){
  document.querySelectorAll(".quick-chip-row .quick-chip").forEach(chip=>{
    const key = chip.dataset.quick;
    let active = false;
    if(key==="near") active = filters.maxDist<400;
    else if(key==="water") active = filters.water;
    else if(key==="easy") active = filters.diffs.includes("easy");
    else if(key==="short") active = filters.duration==="short";
    else if(key==="north") active = filters.regions.includes("north");
    else if(key==="family") active = filters.family;
    else if(key==="accessible") active = filters.accessible;
    else if(key==="free") active = filters.free;
    chip.classList.toggle("active", active);
  });
}
function syncFilterUI(){
  document.querySelectorAll("#catChips .chip").forEach(c=>c.classList.toggle("active", filters.cats.includes(c.dataset.id)));
  document.querySelectorAll("#diffChips .chip").forEach(c=>c.classList.toggle("active", filters.diffs.includes(c.dataset.id)));
  document.querySelectorAll("#regionChips .chip").forEach(c=>c.classList.toggle("active", filters.regions.includes(c.dataset.id)));
  document.querySelectorAll("#durationChips .chip").forEach(c=>c.classList.toggle("active", c.dataset.id===filters.duration));
  document.querySelectorAll("#seasonChips .chip").forEach(c=>c.classList.toggle("active", c.dataset.id===filters.season));
  const amenityKeyMap = { family:"family", dog:"dog", water:"water", accessible:"accessible", free:"free" };
  document.querySelectorAll("#amenityChips .chip").forEach(c=>c.classList.toggle("active", !!filters[amenityKeyMap[c.dataset.id]]));
  $("distRange").value = filters.maxDist;
  updateDistVal();
  syncDistQuickChips();
  updateApplyCTA();
  syncQuickChips();
}
function updateDistVal(){
  $("distVal").textContent = filters.maxDist>=400 ? "ללא הגבלה" : filters.maxDist+' ק"מ · כ-'+estimateDriveMinutes(filters.maxDist)+' דק׳ נסיעה (משוער)';
}
function syncDistQuickChips(){
  document.querySelectorAll("#distQuickChips .chip").forEach(chip=>{
    const min = Number(chip.dataset.min);
    const active = min===0 ? filters.maxDist>=400 : Math.abs(filters.maxDist - kmForDriveMinutes(min)) <= 2;
    chip.classList.toggle("active", active);
  });
}
function skeletonRows(n){
  return Array.from({length:n}).map(()=>`<div class="lb-row skel-row"><div class="skel skel-circle" style="width:22px;height:16px;"></div><div class="skel skel-circle" style="width:38px;height:38px;"></div><div class="skel skel-line" style="flex:1;"></div><div class="skel skel-line" style="width:40px;"></div></div>`).join("");
}
function skeletonNotifRows(n){
  return Array.from({length:n}).map(()=>`<div class="notif-row"><div class="skel skel-circle" style="width:36px;height:36px;"></div><div style="flex:1"><div class="skel skel-line" style="width:70%;margin-bottom:6px;"></div><div class="skel skel-line" style="width:30%;height:9px;"></div></div></div>`).join("");
}
function skeletonCards(n){
  return Array.from({length:n}).map(()=>`<div class="feed-card skel-card">
    <div class="feed-head"><div class="skel skel-circle" style="width:34px;height:34px;"></div><div style="flex:1"><div class="skel skel-line" style="width:40%;margin-bottom:6px;"></div><div class="skel skel-line" style="width:65%;height:9px;"></div></div></div>
    <div class="skel skel-block" style="height:150px;margin:10px 12px 12px;border-radius:12px;"></div>
  </div>`).join("");
}
function setGuestGate(prefix, isGuest){
  $(prefix+"GuestGate").classList.toggle("hidden", !isGuest);
  $(prefix+"RealContent").classList.toggle("hidden", isGuest);
}
// App Essentials Phase 0F, Round 3 - ניהול focus: פותח מזיז focus לתוך ה-sheet (כפתור-סגירה או
// ראשון-בר-פוקוס), סוגר מחזיר אותו לאלמנט שהפעיל את הפתיחה - כדי שמשתמש מקלדת/קורא-מסך לא
// "יברח" ל-scroll/ילדים מאחורי ה-scrim. onEscape אופציונלי: sheets עם ניקוי-state ייעודי
// (כמו confirmSheet שצריך לפתור promise) מעבירים callback משלהם במקום סגירה גנרית.
let sheetFocusReturnEl = null;
let openSheetStack = [];
function openSheet(sheetId, scrimId, onEscape){
  // באג-אמת שדווח ממכשיר פיזי: sheet חדש (למשל תצוגת-הזמנה שנפתחת מקישור) שנפתח בזמן ש-sheet
  // אחר (למשל הגדרות) כבר פתוח, השאיר את שניהם "open" בו-זמנית - נראה כמו שני מסכים דלוקים
  // אחד מעל השני. סוגרים כל sheet אחר לפני פתיחת החדש; קוראים ל-onEscape שלו אם יש (כמו
  // confirmSheet שצריך לפתור promise תלוי) כדי לא להשאיר state תקוע.
  [...openSheetStack].forEach(s=>{
    if(s.sheetId===sheetId) return;
    if(s.onEscape) s.onEscape(); else closeSheet(s.sheetId, s.scrimId);
  });
  sheetFocusReturnEl = document.activeElement;
  $(sheetId).classList.add("open"); $(scrimId).classList.add("open");
  openSheetStack.push({ sheetId, scrimId, onEscape });
  const sheetEl = $(sheetId);
  const target = sheetEl.querySelector(".sheet-close") || sheetEl.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if(target) setTimeout(()=> target.focus(), 60);
}
function closeSheet(sheetId, scrimId){
  $(sheetId).classList.remove("open"); $(scrimId).classList.remove("open");
  openSheetStack = openSheetStack.filter(s=> s.sheetId!==sheetId);
  if(sheetFocusReturnEl && typeof sheetFocusReturnEl.focus==="function" && document.contains(sheetFocusReturnEl)){
    sheetFocusReturnEl.focus();
  }
  sheetFocusReturnEl = null;
}
document.addEventListener("keydown", e=>{
  if(e.key!=="Escape") return;
  if($("photoLightbox").classList.contains("show")){ closePhotoLightbox(); return; }
  const top = openSheetStack[openSheetStack.length-1];
  if(!top) return;
  if(top.onEscape) top.onEscape();
  else closeSheet(top.sheetId, top.scrimId);
});
// גרירה-למטה-לסגירה: גנרית לכל ה-sheets (לא רק עמוד-יעד) דרך ה-sheet-handle שכבר קיים בכולם -
// אותו דפוס בדיוק כמו Escape (openSheetStack, כולל onEscape ל-sheets עם ניקוי-state ייעודי כמו
// confirmSheet). מבוטל דרך transform מוטבע-inline בזמן הגרירה בלבד; ברגע שהוא מוסר (touchend)
// חוזרים לחלוטין למנגנון ה-CSS class-based הקיים (transform:translateY(100%)/(0)) - לא נבנה
// מנגנון-אנימציה מקביל.
// snap-sheets (§6): גובה ה-sheet נעצר באחת משלוש מדרגות במקום להיות קבוע. אותו handler
// של הגרירה משרת גם אותם - גרירה למעלה מגדילה את הגובה, גרירה למטה מקטינה ובסוף סוגרת.
const SHEET_SNAPS = { collapsed:0.42, mid:0.68, full:0.92 };
function sheetContainerHeight(sheetEl){
  return (sheetEl.offsetParent || document.documentElement).clientHeight || window.innerHeight;
}
function setSheetSnap(sheetEl, name){
  if(!sheetEl || !sheetEl.classList.contains("snap-sheet")) return;
  sheetEl.classList.remove("snap-collapsed","snap-mid","snap-full");
  sheetEl.classList.add("snap-"+name);
  sheetEl.style.height = "";
  const scrim = $("detailScrim");
  if(scrim) scrim.classList.toggle("soft", name !== "full");
}
(function wireSheetSwipeToClose(){
  let drag = null;
  document.addEventListener("touchstart", e=>{
    const handle = e.target.closest(".sheet-handle");
    const sheetEl = handle && handle.closest(".sheet");
    if(!sheetEl || !sheetEl.classList.contains("open")) return;
    drag = { sheetEl, startY: e.touches[0].clientY, dy: 0,
             height: sheetEl.getBoundingClientRect().height,
             snap: sheetEl.classList.contains("snap-sheet") };
    if(drag.snap) sheetEl.classList.add("dragging"); else sheetEl.style.transition = "none";
  }, {passive:true});
  document.addEventListener("touchmove", e=>{
    if(!drag) return;
    const raw = e.touches[0].clientY - drag.startY;
    if(drag.snap){
      const containerH = sheetContainerHeight(drag.sheetEl);
      const maxH = containerH*SHEET_SNAPS.full;
      const wanted = drag.height - raw;            // גרירה למעלה (raw שלילי) מגדילה
      if(wanted <= maxH){
        drag.dy = Math.max(0, raw);
        drag.sheetEl.style.height = Math.max(60, wanted)+"px";
        drag.sheetEl.style.transform = "";
      }
      return;
    }
    drag.dy = Math.max(0, raw);
    drag.sheetEl.style.transform = `translateY(${drag.dy}px)`;
  }, {passive:true});
  document.addEventListener("touchend", ()=>{
    if(!drag) return;
    const { sheetEl, dy, height, snap } = drag;
    drag = null;
    const closeIt = ()=>{
      const entry = openSheetStack.find(s=> s.sheetId===sheetEl.id);
      if(entry){ if(entry.onEscape) entry.onEscape(); else closeSheet(entry.sheetId, entry.scrimId); }
    };
    if(snap){
      sheetEl.classList.remove("dragging");
      const containerH = sheetContainerHeight(sheetEl);
      const frac = sheetEl.getBoundingClientRect().height / containerH;
      sheetEl.style.height = "";
      if(frac < SHEET_SNAPS.collapsed*0.72){ closeIt(); return; }
      const nearest = Object.keys(SHEET_SNAPS).reduce((best,k)=>
        Math.abs(SHEET_SNAPS[k]-frac) < Math.abs(SHEET_SNAPS[best]-frac) ? k : best, "mid");
      setSheetSnap(sheetEl, nearest);
      return;
    }
    sheetEl.style.transition = ""; sheetEl.style.transform = "";
    if(dy > Math.min(110, height*0.28)) closeIt();
  }, {passive:true});
})();

/* ============ LANDMARK DETAIL & CHECK-IN ============ */
let activeCheckinPhoto = null, demoMode = false;
let reportState = { water:null, crowding:null, parking:null };
const SEASON_LABEL = { spring:"אביב", summer:"קיץ", autumn:"סתיו", winter:"חורף" };
// אייקון+טקסט (לא אימוג'י) לכל "חשוב לדעת" - אותם UI_ICON_PATHS שכבר משמשים בשאר
// האפליקציה. "בתשלום/חינם" ו"עונה מומלצת" נשארים טקסט-בלבד בכוונה: לא לכל תג צריך
// אייקון, וסמל-שקל/לוח-שנה גנרי לא מוסיף מידע שהמילה עצמה לא כבר נותנת.
function amenityChips(l){
  const chips = [];
  if(l.familyFriendly) chips.push(uiIcon("family",14)+" מתאים למשפחות");
  if(l.dogFriendly) chips.push(uiIcon("dog",14)+" אפשר עם כלב");
  if(l.hasWater) chips.push(uiIcon("water",14)+" יש מים");
  if(l.accessible) chips.push(uiIcon("wheelchair",14)+" נגיש");
  chips.push(l.priceType==="paid" ? "בתשלום" : "חינם");
  if(l.season) chips.push("עונה מומלצת: "+SEASON_LABEL[l.season]);
  return chips;
}
let pendingWishlistRemovals = {};
function refreshOpenDetailIfShowing(id){
  if(location.hash === "#/destination/"+encodeURIComponent(id)) openDetail(id);
}
async function toggleWishlist(id){
  track("destination_saved", { landmark_id: id, saved: !myWishlist.includes(id) });
  let justAdded = false;
  if(myWishlist.includes(id)){
    myWishlist = myWishlist.filter(x=>x!==id);
    renderMap();
    pendingWishlistRemovals[id] = setTimeout(async ()=>{
      delete pendingWishlistRemovals[id];
      await supabase.from("wishlist").delete().eq("user_id",session.user.id).eq("landmark_id",id);
    }, 4000);
    toast("הוסר מהשמורים", { label:"ביטול", onClick: async ()=>{
      const stillPending = !!pendingWishlistRemovals[id];
      if(stillPending){ clearTimeout(pendingWishlistRemovals[id]); delete pendingWishlistRemovals[id]; }
      if(!myWishlist.includes(id)){ myWishlist.push(id); renderMap(); renderProfile(); renderSaved(); refreshOpenDetailIfShowing(id); }
      if(!stillPending){
        // ה-timer כבר ירה וה-DELETE כבר בוצע בפועל - הביטול חייב להכניס את השורה מחדש,
        // לא רק לשחזר state מקומי (אחרת המסך יראה "שמור" בזמן שב-DB זה כבר נמחק).
        const { error } = await supabase.from("wishlist").insert({ user_id:session.user.id, landmark_id:id });
        if(error){ myWishlist = myWishlist.filter(x=>x!==id); renderMap(); renderProfile(); renderSaved(); refreshOpenDetailIfShowing(id); toast("לא הצלחנו לבטל. נסה שוב."); }
      }
    }});
  } else if(pendingWishlistRemovals[id]){
    // הוסר ואז נוסף שוב לפני שה-timer ירה - השורה ב-DB מעולם לא נמחקה בפועל, רק מבטלים
    clearTimeout(pendingWishlistRemovals[id]);
    delete pendingWishlistRemovals[id];
    myWishlist.push(id);
    renderMap();
  } else {
    const { error } = await supabase.from("wishlist").insert({ user_id:session.user.id, landmark_id:id });
    if(!error){ myWishlist.push(id); justAdded = true; }
    renderMap();
  }
  return justAdded;
}
function openDetail(id){
  closePreview();
  const l = lmById[id];
  if(l) addRecentlyViewed(id);
  const visitedEntry = myVisits.find(v=>v.landmark_id===id);
  const conquestEntry = myConquests.find(c=>c.landmark_id===id);
  const wished = myWishlist.includes(id);
  const cat = CATEGORIES[l.category];
  const totalVisits = l.baseVisits + (visitCounts[id]||0);
  const amenities = amenityChips(l);
  const photoUrl = landmarkPhotos[id];
  $("detailBody").innerHTML = `
    <div class="lm-hero${photoUrl?" has-photo":""}">
      ${photoUrl ? `<img src="${photoUrl}" alt="${l.name}" loading="eager">` : photoFallbackHtml(l, 84)}
      <span class="badge-count">${totalVisits.toLocaleString()} כובשים</span>
      ${photoUrl && photoUrl===l.stockPhotoUrl && l.stockPhotoCredit ? `<span class="lm-photo-credit">${escapeHtml(l.stockPhotoCredit)}</span>` : ""}
    </div>
    <div class="lm-title-row"><div><h2>${l.name}</h2>
      <div class="lm-region">${REGIONS[l.region]} · <span class="cat-tag" style="background:${cat.color}">${catIconSvg(cat.icon,12)} ${cat.label}</span></div>
      ${userLoc ? `<div class="lm-from-you">${uiIcon("region",13)} ${Math.round(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))} ק"מ ממך · כ-${estimateDriveMinutes(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))} דק׳ נסיעה (משוער)</div>` : ""}
    </div></div>
    <p class="lm-desc" data-stage="mid">${l.desc}</p>
    <div class="lm-stats" data-stage="mid">
      <div class="lm-stat"><div class="v">${tierDotHtml(tierForDb(l.difficulty))}${tierForDb(l.difficulty).label}</div><div class="l">קושי</div></div>
      ${l.duration ? `<div class="lm-stat"><div class="v">${l.duration}</div><div class="l">זמן משוער</div></div>` : ""}
      ${l.distanceKm!=null ? `<div class="lm-stat"><div class="v">${l.distanceKm} ק"מ</div><div class="l">הליכה</div></div>` : ""}
      <div class="lm-stat"><div class="v">${conquestEntry ? '<span class="ltr">✓ '+conquestEntry.xp_awarded.toLocaleString()+'</span>' : '<span class="ltr">+'+pointsForLandmark(l)+'</span>'}</div><div class="l">${conquestEntry ? "נכבש" : effortClassFor(l).label}</div></div>
    </div>
    <div class="lm-important-head" data-stage="full">${uiIcon("warning",15)} חשוב לדעת לפני שיוצאים</div>
    <div class="amenity-row" data-stage="full">${amenities.map(a=>`<span class="amenity-chip">${a}</span>`).join("")}</div>
    <div id="fieldReportsBox" data-stage="full"></div>
    <div id="photoGalleryBox" data-stage="full"></div>
    ${l.officialUrl ? `<a href="${l.officialUrl}" target="_blank" rel="noopener noreferrer" class="lm-official-link" data-stage="full">מידע נוסף באתר הרשמי</a>` : ""}
    ${visitedEntry ? `<div class="checkin-status ok"><span class="ic">✓</span> כבשת את היעד הזה ב-${new Date(visitedEntry.visited_at).toLocaleDateString('he-IL')}${visitedEntry.pending?' · ממתין לסנכרון':''}</div>` : ""}
    <div class="lm-actions">
      <button class="icon-btn waze-btn" id="detailWazeBtn"></button>
      <button class="icon-btn" id="detailShareBtn" aria-label="שיתוף" title="שיתוף">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="2.6" stroke="currentColor" stroke-width="1.7"/><circle cx="6" cy="12" r="2.6" stroke="currentColor" stroke-width="1.7"/><circle cx="18" cy="19" r="2.6" stroke="currentColor" stroke-width="1.7"/><path d="M8.2 10.6 15.8 6.4M8.2 13.4l7.6 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
      </button>
      <button class="btn btn-outline${wished?" is-wished":""}" id="wishBtn">${uiIcon("heart",16)}${wished?"ברשימת המשאלות":"רוצה להגיע"}</button>
      <button class="btn btn-primary" id="checkinBtn" ${visitedEntry?"disabled":""}>${visitedEntry?"✓ כבשתי":uiIcon("trophy",16)+" כבשתי"}</button>
    </div>
    <div class="detail-cta">
      ${visitedEntry
        ? (visitedEntry.pending
          ? `<button class="btn btn-secondary btn-block" id="detailNavBtn">נווטו למקום</button>`
          : `<button class="btn btn-secondary btn-block" id="detailReviewBtn">${uiIcon("camera",16)} ${visitedEntry.photo_url||visitedEntry.note ? "עריכת התמונה והביקורת שלכם" : "הוספת תמונה וביקורת"}</button>`)
        : `<button class="btn btn-secondary btn-block" id="startTripBtn">יוצאים לדרך</button>`}
    </div>
    <button type="button" id="reportPlaceInfoBtn" data-stage="full" style="display:block;margin:16px auto 4px;background:none;border:none;color:var(--text-muted);font-size:13.5px;text-decoration:underline;cursor:pointer;">מצאת מידע לא נכון? דווח על טעות</button>
  `;
  wireWazeButton($("detailWazeBtn"), l);
  const startTripBtn = $("startTripBtn");
  if(startTripBtn) startTripBtn.onclick = ()=> startTrip(l.id);
  // ליעד שכבר נכבש אין "יוצאים לדרך" - שם ה-CTA הדביק הוא ניווט. אותה פעולה בדיוק כמו
  // כפתור-האייקון למעלה, אבל בלי wireWazeButton שדורס את התווית באייקון בלבד.
  const detailNavBtn = $("detailNavBtn");
  if(detailNavBtn) detailNavBtn.onclick = (e)=>{
    e.stopPropagation();
    track("navigation_started", { landmark_id: l.id });
    openWazeNavigation(l.lat, l.lon, l.name);
  };
  $("detailShareBtn").onclick = ()=>{
    const url = `${location.origin}${location.pathname}#/destination/${encodeURIComponent(id)}`;
    shareLink(url, l.name, `${l.name} — גלו את זה באפליקציית מגלים!`);
  };
  $("reportPlaceInfoBtn").onclick = ()=>{
    openReportSheet("דיווח על "+l.name, PLACE_REPORT_REASONS, async (reason, message)=>{
      const { error } = await supabase.from("place_corrections").insert({
        landmark_id: id, user_id: session ? session.user.id : null, reason, message: message||null,
      });
      if(error) throw error;
    });
  };
  const toggleWish = async ()=>{
    $("wishBtn").disabled = true;
    const justAdded = await toggleWishlist(id);
    openDetail(id); renderProfile();
    if(justAdded) $("wishBtn").classList.add("wish-pop");
  };
  $("wishBtn").onclick = ()=>{
    if(!requireAuth("רוצה לשמור את המקום לפעם הבאה? צרו חשבון בחינם", toggleWish)) return;
    toggleWish();
  };
  if(!visitedEntry) $("checkinBtn").onclick=()=>{
    if(!requireAuth("כדי לסמן שכבשת את המקום, צרו חשבון בחינם", ()=>startCheckin(l))) return;
    startCheckin(l);
  };
  const reviewBtn = $("detailReviewBtn");
  if(reviewBtn) reviewBtn.onclick = ()=> openReviewSheet(l, visitedEntry);
  setSheetSnap($("detailSheet"), "mid");
  openSheet("detailSheet","detailScrim");
  track("destination_viewed", { landmark_id: id, points: pointsForLandmark(l) });
  renderFieldReports(id, l);
  renderPhotoGallery(id);
}

// גלריית תמונות-קהילה ליעד - כל תמונה שמשתמש משתף (בצ'ק-אין או בעריכת ביקורת בדיעבד)
// מצטרפת לכאן, לא רק הופכת ל-hero הבודד של landmarkPhotos. אותו דפוס כמו
// renderFieldReports - נכשל בשקט (יעד בלי תמונות הוא מצב תקין, לא שגיאה).
async function renderPhotoGallery(id){
  const box = $("photoGalleryBox");
  if(!box) return;
  try{
    const { data, error } = await supabase.rpc("get_landmark_photo_gallery", { p_landmark_id:id, p_limit:24 });
    if(error) throw error;
    if(!box.isConnected) return;
    const photos = (data||[]).filter(r=>r.photo_url);
    if(!photos.length){ box.innerHTML = ""; return; }
    box.innerHTML = `<div class="photo-gallery">
      <div class="photo-gallery-title">${uiIcon("camera",13)} תמונות מהמטיילים (${photos.length})</div>
      <div class="photo-gallery-strip">` +
      photos.map(p=>`<button type="button" class="photo-gallery-thumb" data-src="${p.photo_url}"><img src="${p.photo_url}" loading="lazy" alt=""></button>`).join("") +
      `</div></div>`;
    box.querySelectorAll(".photo-gallery-thumb").forEach(btn=>{
      btn.onclick = ()=> openPhotoLightbox(btn.dataset.src);
    });
  }catch(err){
    box.innerHTML = "";
  }
}
function openPhotoLightbox(src){
  $("photoLightboxImg").src = src;
  $("photoLightbox").classList.remove("hidden");
  requestAnimationFrame(()=> $("photoLightbox").classList.add("show"));
}
function closePhotoLightbox(){
  $("photoLightbox").classList.remove("show");
  setTimeout(()=> $("photoLightbox").classList.add("hidden"), 200);
}
$("photoLightboxClose").onclick = closePhotoLightbox;
$("photoLightbox").onclick = e=>{ if(e.target.id==="photoLightbox") closePhotoLightbox(); };

// אייקון אחד לכל קטגוריה (לא לכל ערך בתוכה) - בדיוק כמו amenityChips. קודם היו אימוג'ים
// על כל ערך שגם שימשו בפועל כתחליף-לכותרת-הקבוצה (המשתמש היה מזהה "זו שורת החניה"
// לפי ה-🅿️, לא לפי טקסט) - עכשיו הכותרת עצמה נושאת את האייקון, והערכים טקסט נקי.
const FIELD_REPORT_LABELS = {
  water: { flowing:"יש מים", low:"מעט מים", dry:"יבש" },
  crowding: { quiet:"שקט", moderate:"בינוני", crowded:"עמוס" },
  parking: { available:"יש מקום", limited:"מוגבל", full:"מלא" },
};
const FIELD_REPORT_TITLES = { water:"מצב מים", crowding:"עומס", parking:"חניה" };
const FIELD_REPORT_ICONS = { water:"water", crowding:"family", parking:"car" };
async function renderFieldReports(id, l){
  const box = $("fieldReportsBox");
  if(!box) return;
  try{
    const { data, error } = await supabase.from("field_reports").select("water_level,crowding,parking,created_at").eq("landmark_id", id).order("created_at",{ascending:false}).limit(30);
    if(error) throw error;
    if(!box.isConnected) return;
    const latest = {};
    for(const row of (data||[])){
      if(row.water_level && !latest.water) latest.water = { val:row.water_level, at:row.created_at };
      if(row.crowding && !latest.crowding) latest.crowding = { val:row.crowding, at:row.created_at };
      if(row.parking && !latest.parking) latest.parking = { val:row.parking, at:row.created_at };
    }
    const keys = Object.keys(latest);
    if(!keys.length){ box.innerHTML = ""; return; }
    box.innerHTML = `<div class="field-reports"><div class="field-reports-title">דיווחים מהשטח</div>` +
      keys.map(key=>{
        const r = latest[key];
        const ageDays = (Date.now()-new Date(r.at).getTime())/86400000;
        const stale = ageDays>14;
        return `<div class="field-report-row${stale?" stale":""}">
          <span>${uiIcon(FIELD_REPORT_ICONS[key],13)} ${FIELD_REPORT_TITLES[key]}: ${FIELD_REPORT_LABELS[key][r.val]}</span>
          <span class="field-report-time">${timeAgo(r.at)}${stale?" · ייתכן שהמצב השתנה":""}</span>
        </div>`;
      }).join("") + `</div>`;
  }catch(err){
    box.innerHTML = "";
  }
}

function fieldReportChips(l){
  const groups = [];
  if(l.hasWater || l.category==="water") groups.push("water");
  groups.push("crowding","parking");
  return `<label class="field-label" style="margin-top:10px;">איך המצב בשטח עכשיו? (אופציונלי)</label>` +
    groups.map(key=>`<div class="report-group">
      <div class="report-group-title">${uiIcon(FIELD_REPORT_ICONS[key],13)} ${FIELD_REPORT_TITLES[key]}</div>
      <div class="chip-row report-chip-row" id="report_${key}">` +
      Object.entries(FIELD_REPORT_LABELS[key]).map(([val,label])=>`<button type="button" class="chip teal" data-report="${key}" data-val="${val}">${label}</button>`).join("") +
      `</div></div>`).join("");
}
function wireFieldReportChips(){
  document.querySelectorAll(".report-chip-row .chip").forEach(chip=>{
    chip.onclick = ()=>{
      const { report, val } = chip.dataset;
      reportState[report] = reportState[report]===val ? null : val;
      document.querySelectorAll(`.chip[data-report="${report}"]`).forEach(c=>c.classList.toggle("active", c.dataset.val===reportState[report]));
    };
  });
}
function startCheckin(l){
  // הצ׳ק-אין נפתח כ-sheet נפרד משלו (לא כהרחבה בתוך עמוד-היעד הארוך) - כדי שכפתור-האישור
  // יהיה מיד גלוי במסך משלו, בלי שהמשתמש יצטרך לגלול קודם דרך כל תוכן עמוד-היעד. openSheet
  // הקיים כבר סוגר את detailSheet אוטומטית (מנגנון "sheet חדש סוגר sheets אחרים").
  $("checkinSheetTitle").textContent = l.name;
  openSheet("checkinSheet","checkinScrim");
  activeCheckinPhoto = null;
  reportState = { water:null, crowding:null, parking:null };
  $("checkinFlow").innerHTML = `
    <div class="checkin-status" id="gpsStatus"><span class="ic">${uiIcon("compass",19)}</span> מאתר מיקום GPS...</div>
    <div id="photoStep" class="hidden">
      <button class="btn btn-primary btn-block" id="confirmCheckin">${uiIcon("trophy",16)} אשר צ'ק-אין וקבל נקודות</button>
      <div class="checkin-extras-divider">תוספות אופציונליות (לא נדרש כדי לקבל נקודות)</div>
      <div class="photo-drop" id="photoDrop">${uiIcon("camera",17)} הוסיפו תמונה מהמקום (אופציונלי)</div>
      <input type="file" accept="image/*" capture="environment" id="photoInput">
      <img class="photo-preview hidden" id="photoPreview">
      <label class="field-label" style="margin-top:6px;">הערה קצרה לחברים (אופציונלי)</label>
      <input class="text-input" id="checkinNote" maxlength="120" placeholder="לדוגמה: יש מים עכשיו, המסלול מעולה!">
      ${fieldReportChips(l)}
    </div>
    <button type="button" id="checkinReportProblemBtn" style="display:block;margin:16px auto 4px;background:none;border:none;color:var(--text-muted);font-size:13.5px;text-decoration:underline;cursor:pointer;">נתקלתם בבעיה באפליקציה? דווחו לנו</button>`;
  $("checkinReportProblemBtn").onclick = ()=>{
    closeSheet("checkinSheet","checkinScrim");
    navigate("#/help");
    $("reportProblemForm").classList.remove("hidden");
    $("reportProblemText").focus();
  };
  $("photoDrop").onclick=()=>$("photoInput").click();
  wireFieldReportChips();
  $("photoInput").onchange = e=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      const img = new Image();
      img.onload = ()=>{
        const maxW=320, scale=Math.min(1,maxW/img.width);
        const c = document.createElement("canvas");
        c.width = img.width*scale; c.height = img.height*scale;
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        c.toBlob(blob=>{
          activeCheckinPhoto = { blob, dataUrl: c.toDataURL("image/jpeg",0.7) };
          $("photoPreview").src = activeCheckinPhoto.dataUrl;
          $("photoPreview").classList.remove("hidden");
          $("photoDrop").classList.add("hidden");
          $("confirmCheckin").disabled=false;
        }, "image/jpeg", 0.7);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  $("confirmCheckin").onclick=()=>confirmCheckin(l);
  runGpsCheck(l);
}
function runGpsCheck(l){
  const statusEl = $("gpsStatus"), photoStep = $("photoStep");
  if(demoMode){
    statusEl.className="checkin-status ok";
    statusEl.innerHTML = '<span class="ic">✓</span> מצב הדגמה פעיל — דילוג על בדיקת המרחק בפועל';
    photoStep.classList.remove("hidden"); return;
  }
  if(!navigator.geolocation){ statusEl.className="checkin-status bad"; statusEl.innerHTML='<span class="ic">✕</span> המכשיר לא תומך באיתור מיקום'; return; }
  locateUser(pos=>{
    const d = haversine(pos.coords.latitude,pos.coords.longitude,l.lat,l.lon)*1000;
    if(d<=1500){
      statusEl.className="checkin-status ok";
      statusEl.innerHTML = '<span class="ic">✓</span> אומת! את/ה במרחק '+Math.round(d)+' מטר מהיעד';
      photoStep.classList.remove("hidden");
    } else {
      statusEl.className="checkin-status bad";
      statusEl.innerHTML = '<span class="ic">✕</span> את/ה במרחק '+(d/1000).toFixed(1)+' ק"מ מהיעד — יש להגיע עד 1.5 ק"מ כדי לבצע צ׳ק-אין';
      photoStep.classList.add("hidden");
    }
  }, err=>{
    statusEl.className="checkin-status bad";
    statusEl.innerHTML = '<span class="ic">✕</span> ' + escapeHtml(geoErrorMessage(err));
  }, { preciseOnly:true });
}

// Gamification Overhaul, Phase 2 - מענק XP אטומי ואידמפוטנטי: בסיס-כיבוש-ראשון דרך
// landmark_conquests (PK על user_id+landmark_id - insert-on-conflict-do-nothing ברמת ה-DB,
// לא רק דגל-בזיכרון, כך שדאבל-קליק/רענון/race לא יכולים להעניק פעמיים) + כל בונוסי-החד-פעם
// דרך xp_bonus_grants (unique על user_id+bonus_type+source_id). נצרך גם מ-confirmCheckin
// (אונליין) וגם מ-flushPendingQueue (סנכרון-אופליין) - לוגיקה אחת בלבד, לא משוכפלת.
// מחזיר {baseXP, bonuses:[{type,label,xp}], totalGranted, isFirstConquest} - כל השדות
// מבוססים על מה שבאמת נכנס ל-DB (data.length אחרי upsert-ignoreDuplicates), לא ניחוש.
async function grantConquestAndBonuses(l){
  const conquestXp = pointsForLandmark(l);
  const result = { baseXP:0, bonuses:[], totalGranted:0, isFirstConquest:false };
  const { data: conquestRows, error: cErr } = await supabase.from("landmark_conquests")
    .upsert({ user_id:session.user.id, landmark_id:l.id, xp_awarded:conquestXp, difficulty_at_conquest:l.difficulty },
      { onConflict:"user_id,landmark_id", ignoreDuplicates:true })
    .select();
  if(cErr){ console.warn("landmark_conquests לא זמינה עדיין (יתכן שה-migration טרם רץ):", cErr.message||cErr); return result; }
  if(!conquestRows || !conquestRows.length) return result; // ביקור חוזר - 0 XP, לא בונוסים
  result.isFirstConquest = true;
  result.baseXP = conquestXp;
  result.totalGranted = conquestXp;
  const prevConquests = myConquests.slice();
  myConquests.push(conquestRows[0]);

  const grantBonus = async (bonusType, sourceId, xp, label)=>{
    const { data, error } = await supabase.from("xp_bonus_grants")
      .upsert({ user_id:session.user.id, bonus_type:bonusType, source_id:sourceId||"", xp_awarded:xp },
        { onConflict:"user_id,bonus_type,source_id", ignoreDuplicates:true })
      .select();
    if(error){ console.warn("xp_bonus_grants לא זמינה עדיין:", error.message||error); return; }
    if(data && data.length){
      myBonusGrants.push(data[0]);
      result.bonuses.push({ type:bonusType, label, xp });
      result.totalGranted += xp;
    }
  };

  // אתגר השבוע: אותו מנגנון-בונוס הקיים, עם מפתח-שבוע כ-source_id - כך שהפרס ניתן
  // פעם אחת בשבוע לכל היותר, גם אם כובשים כמה מקומות שעונים על האתגר.
  const weekly = currentWeeklyChallenge();
  if(weekly.match(l)) await grantBonus("weekly_challenge", currentWeekKey(), WEEKLY_CHALLENGE_XP, "אתגר השבוע הושלם!");
  if(prevConquests.length===0) await grantBonus("first_destination", "", 10, "יעד ראשון!");
  const hadRegionBefore = prevConquests.some(c=> lmById[c.landmark_id] && lmById[c.landmark_id].region===l.region);
  if(!hadRegionBefore) await grantBonus("new_region", l.region, 5, "אזור חדש!");
  const hadCatBefore = prevConquests.some(c=> lmById[c.landmark_id] && lmById[c.landmark_id].category===l.category);
  if(!hadCatBefore) await grantBonus("new_category", l.category, 5, "קטגוריה חדשה!");

  // אבני-דרך אזוריות - 25/50/75/100%, מבוסס יעדים-ייחודיים-שנכבשו (landmark_conquests), לא
  // visits (שיכולים לכלול ביקורים חוזרים) - תומך גם בקפיצה מעל כמה ספים בבת-אחת באזור קטן.
  const regionTotal = regionCount(l.region);
  if(regionTotal){
    const beforeCount = prevConquests.filter(c=> lmById[c.landmark_id] && lmById[c.landmark_id].region===l.region).length;
    const afterCount = beforeCount+1;
    const milestones = [[0.25,"region_25",10],[0.5,"region_50",20],[0.75,"region_75",30],[1,"region_100",50]];
    for(const [pct,type,xp] of milestones){
      if(beforeCount/regionTotal<pct && afterCount/regionTotal>=pct){
        // אותו שם-אבן-דרך בדיוק כמו ב"המסע שלי" (regionMilestoneLabel) - לא ניסוח נפרד לחגיגה
        await grantBonus(type, l.region, xp, regionMilestoneLabel(Math.round(pct*100), l.region)+"!");
      }
    }
  }

  // השלמת-אוסף - כל אוסף שהיעד הזה חבר בו ושעכשיו הושלם לראשונה (reuse COLLECTIONS/collectionLandmarks הקיימים)
  const conqueredIds = new Set(myConquests.map(c=>c.landmark_id));
  for(const col of COLLECTIONS){
    if(!col.filter(l)) continue;
    const members = collectionLandmarks(col);
    if(members.length && members.every(m=>conqueredIds.has(m.id))){
      await grantBonus("collection_complete", col.id, 20, "אוסף הושלם: "+col.label+"!");
    }
  }
  return result;
}
async function submitFieldReport(landmarkId){
  if(!reportState.water && !reportState.crowding && !reportState.parking) return;
  try{
    const { error } = await supabase.from("field_reports").insert({
      landmark_id: landmarkId, user_id: session.user.id,
      water_level: reportState.water, crowding: reportState.crowding, parking: reportState.parking,
    });
    if(error) throw error;
  }catch(err){ console.warn("דיווח שטח לא נשמר (יתכן שהטבלה עדיין לא נוצרה):", err.message||err); }
}

async function confirmCheckin(l){
  const prevTotalXP = totalXP();
  const optimisticXp = pointsForLandmark(l);
  const note = ($("checkinNote")?.value || "").trim().slice(0,120) || null;
  if(!navigator.onLine){
    // אופליין - אין גישה ל-DB כדי להריץ את מנגנון-הדה-דופ האמיתי, אז שומרים בתור עם הערכה
    // אופטימית בלבד (בסיס-קושי, בלי בונוסים) לתצוגה מקומית; המענק האמיתי (כולל בונוסים)
    // מתבצע ב-flushPendingQueue כשמתחברים מחדש - שם totalXP() מתעדכן לערך הנכון.
    const pending = { landmarkId:l.id, dataUrl:activeCheckinPhoto?activeCheckinPhoto.dataUrl:null, note, ts:new Date().toISOString() };
    const queue = JSON.parse(localStorage.getItem(PENDING_KEY)||"[]");
    queue.push(pending); localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
    myVisits.push({ landmark_id:l.id, visited_at:pending.ts, photo_url:pending.dataUrl, points_awarded:optimisticXp, note, pending:true });
    refreshHeader(); closeSheet("checkinSheet","checkinScrim");
    toast("נשמר במצב אופליין — יסונכרן כשהחיבור יחזור");
    renderMap(); renderProfile(); return;
  }
  const btn = $("confirmCheckin"); if(btn){ btn.disabled=true; btn.textContent="שומר..."; }
  try{
    let photoUrl = null;
    if(activeCheckinPhoto){
      const path = `${session.user.id}/${l.id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("checkin-photos").upload(path, activeCheckinPhoto.blob, { contentType:"image/jpeg" });
      if(upErr) throw upErr;
      photoUrl = supabase.storage.from("checkin-photos").getPublicUrl(path).data.publicUrl;
    }
    const grant = await grantConquestAndBonuses(l);
    let { data, error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:l.id, photo_url:photoUrl, points_awarded:grant.totalGranted, note }).select().single();
    if(error && /note/i.test(error.message||"")){
      ({ data, error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:l.id, photo_url:photoUrl, points_awarded:grant.totalGranted }).select().single());
    }
    if(error) throw error;
    myVisits.push(data);
    if(activeTrip && activeTrip.landmarkId===l.id) endTrip(true);
    track("checkin_completed", { landmark_id: l.id });
    submitFieldReport(l.id);
    refreshHeader(); closeSheet("checkinSheet","checkinScrim");
    if(!grant.isFirstConquest){
      // ביקור חוזר (למשל דאבל-קליק/race/סנכרון-כפול) - נרשם בהיסטוריה, בלי XP נוסף ובלי חגיגה
      toast("היעד הזה כבר נכבש בעבר — לא הוענקו נקודות נוספות");
      renderProfile(); renderBoard(); renderFeed();
      return;
    }
    const newBadges = checkNewBadges();
    if(newBadges.length){
      supabase.from("user_badges").insert(newBadges.map(b=>({ user_id:session.user.id, badge_id:b.id }))).then(()=>{});
    }
    const newTotalXP = totalXP();
    const prevLevelIndex = getLevelFromXP(prevTotalXP);
    const newLevelIndex = getLevelFromXP(newTotalXP);
    const leveledUpTo = newLevelIndex>prevLevelIndex ? LEVELS_V2[newLevelIndex] : null;
    const regionLabel = REGIONS[l.region];
    const regionInfo = regionLabel ? regionLabel+" — "+regionVisited(myVisits,l.region)+"/"+regionCount(l.region) : null;
    const bonusLines = grant.bonuses.map(b=>"+"+b.xp+" נקודות — "+b.label);
    // Gamification Overhaul, Phase 3 - פס-התקדמות-לרמה-הבאה בתוך כרטיס-החגיגה הראשי (reuse
    // getCurrentLevelProgress/getLevelProgressPercentage/getXPToNextLevel מ-Phase 1, אותם
    // utility functions שכבר משמשים את הפרופיל - לא לוגיקה נפרדת).
    const lvlProgress = getCurrentLevelProgress(newTotalXP);
    const levelField = {
      levelLabel: stampGlyph(levelGlyphName(lvlProgress.index),15)+" רמה "+(lvlProgress.index+1)+" — "+lvlProgress.level.name,
      current: lvlProgress.xpIntoLevel, total: lvlProgress.xpForLevel,
      pct: getLevelProgressPercentage(newTotalXP), isMax: lvlProgress.isMax,
      hint: lvlProgress.isMax ? stampGlyph("trophy",13)+" הגעתם לרמה הגבוהה ביותר!" : "עוד "+getXPToNextLevel(newTotalXP).toLocaleString()+" נקודות לרמה הבאה",
    };
    const steps = [{
      photoUrl: photoUrl || landmarkPhotos[l.id] || null,
      title: "עוד מקום נכבש!",
      subtitle: l.name,
      tag: tierDotHtml(tierForDb(l.difficulty))+tierForDb(l.difficulty).label,
      xp: grant.baseXP,
      sub: bonusLines.length ? bonusLines.join(" · ") : null,
      totalLine: grant.bonuses.length ? "סה\"כ +"+grant.totalGranted.toLocaleString()+" נקודות" : null,
      region: regionInfo,
      progress: levelField,
      confetti: true,
      haptic: "success",
    }];
    newBadges.forEach(b=> steps.push({
      stampId: b.id, metal: badgeMetal(b.id),
      title: "חותמת חדשה", subtitle: b.label,
      confetti: false, haptic: "milestone",
    }));
    if(leveledUpTo){
      steps.push({
        levelIndex: newLevelIndex,
        title: "עליתם רמה!",
        subtitle: "רמה "+(newLevelIndex+1),
        tag: leveledUpTo.name,
        confetti: true,
        haptic: "milestone",
      });
    }
    // Next Adventure - הצעת המשך מיידית מהיעד שזה עתה נכבש, לא מהמיקום החי (עובד גם ב-demo mode)
    const visitedIds = new Set(myVisits.map(v=>v.landmark_id));
    let nextPlace = null, nextDist = Infinity;
    LANDMARKS.forEach(cand=>{
      if(visitedIds.has(cand.id) || cand.id===l.id) return;
      const d = haversine(l.lat,l.lon,cand.lat,cand.lon);
      if(d<=15 && d<nextDist){ nextDist=d; nextPlace=cand; }
    });
    // §6 - צ׳ק-אין תמיד נגמר ביעד הבא, אף פעם לא ב-dead end. אם אין מקום קרוב (עד 15 ק"מ),
    // נופלים להמלצה האישית במקום לסיים ב"געו כדי להמשיך".
    let nextStep = nextPlace
      ? { place: nextPlace, title:"כבר באזור? יש עוד מקום קרוב",
          sub: nextPlace.name+" · כ-"+estimateDriveMinutes(nextDist)+" דק' נסיעה" }
      : null;
    if(!nextStep){
      const rec = recommendDestination({ excludeId: l.id });
      if(rec) nextStep = { place: rec.landmark, title:"היעד הבא שלכם",
        sub: rec.landmark.name + (rec.reasons.length ? " · "+rec.reasons[0] : "") };
    }
    if(nextStep){
      const np = nextStep.place;
      steps.push({
        icon:"compass",
        title: nextStep.title,
        sub: nextStep.sub,
        actions: [
          { label:"קחו אותי לשם", primary:true, onClick:()=> goToDestination(np.id) },
          { label:"שמור לפעם הבאה", onClick:()=>{ if(!myWishlist.includes(np.id)) toggleWishlist(np.id).then(()=>renderProfile()); } },
        ],
      });
    }
    celebrate(steps);
    justCheckedInId = l.id;
    loadVisitCounts().then(()=>{
      renderMap();
      setTimeout(()=>{ justCheckedInId=null; }, 1200);
    });
    renderProfile(); renderBoard(); renderFeed();
  }catch(err){
    console.error(err);
    toast("שגיאה בשמירת הצ'ק-אין: "+(err.message||err));
  }finally{
    if(btn){ btn.disabled=false; btn.textContent="אשר צ'ק-אין"; }
  }
}

// תמונה+ביקורת אחרי כיבוש (לא רק בזמן ה-checkin עצמו) - אותו רכיב-תמונה/עיבוד בדיוק כמו
// ב-startCheckin (input+FileReader+canvas-resize ל-320px/jpeg 0.7), רק שכאן זו עריכה ל-
// שורת visits קיימת (update) ולא יצירה חדשה (insert) - אין GPS/נקודות/חגיגה, זו רק
// מטא-דאטה. reviewSheet נפתח מ-openDetail כשיש visitedEntry.
let activeReviewPhoto = null, reviewTargetLandmark = null, reviewTargetVisit = null;
function openReviewSheet(l, visitedEntry){
  reviewTargetLandmark = l; reviewTargetVisit = visitedEntry; activeReviewPhoto = null;
  $("reviewSheetTitle").textContent = l.name;
  $("reviewNoteText").value = visitedEntry.note || "";
  const drop = $("reviewPhotoDrop"), preview = $("reviewPhotoPreview");
  if(visitedEntry.photo_url){
    preview.src = visitedEntry.photo_url; preview.classList.remove("hidden");
    drop.innerHTML = uiIcon("camera",17)+" החליפו תמונה"; drop.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
    drop.innerHTML = uiIcon("camera",17)+" הוסיפו תמונה מהמקום"; drop.classList.remove("hidden");
  }
  $("saveReviewBtn").disabled = false; $("saveReviewBtn").textContent = "שמירה";
  openSheet("reviewSheet","reviewScrim");
  drop.onclick = ()=> $("reviewPhotoInput").click();
  $("reviewPhotoInput").value = "";
  $("reviewPhotoInput").onchange = e=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      const img = new Image();
      img.onload = ()=>{
        const maxW=320, scale=Math.min(1,maxW/img.width);
        const c = document.createElement("canvas");
        c.width = img.width*scale; c.height = img.height*scale;
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        c.toBlob(blob=>{
          activeReviewPhoto = { blob, dataUrl: c.toDataURL("image/jpeg",0.7) };
          preview.src = activeReviewPhoto.dataUrl;
          preview.classList.remove("hidden");
          drop.innerHTML = uiIcon("camera",17)+" החליפו תמונה";
        }, "image/jpeg", 0.7);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
}
async function saveReview(){
  const l = reviewTargetLandmark, visitedEntry = reviewTargetVisit;
  if(!l || !visitedEntry) return;
  const btn = $("saveReviewBtn"); btn.disabled = true; btn.textContent = "שומר...";
  try{
    let photoUrl = visitedEntry.photo_url || null;
    if(activeReviewPhoto){
      const path = `${session.user.id}/${l.id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("checkin-photos").upload(path, activeReviewPhoto.blob, { contentType:"image/jpeg" });
      if(upErr) throw upErr;
      photoUrl = supabase.storage.from("checkin-photos").getPublicUrl(path).data.publicUrl;
    }
    const note = ($("reviewNoteText").value || "").trim().slice(0,300) || null;
    const { error } = await supabase.from("visits").update({ photo_url: photoUrl, note }).eq("id", visitedEntry.id);
    if(error) throw error;
    visitedEntry.photo_url = photoUrl; visitedEntry.note = note;
    if(photoUrl) landmarkPhotos[l.id] = photoUrl;
    closeSheet("reviewSheet","reviewScrim");
    toast("הביקורת נשמרה, תודה!");
    renderProfile(); renderFeed();
    if(photoUrl) renderPhotoGallery(l.id);
  }catch(err){
    console.error(err);
    toast("שגיאה בשמירת הביקורת: "+(err.message||err));
  }finally{
    btn.disabled = false; btn.textContent = "שמירה";
  }
}

async function flushPendingQueue(){
  const queue = JSON.parse(localStorage.getItem(PENDING_KEY)||"[]");
  if(!queue.length || !navigator.onLine || !session) return;
  const remaining = [];
  for(const item of queue){
    try{
      const l = lmById[item.landmarkId];
      let photoUrl = null;
      if(item.dataUrl){
        const blob = await (await fetch(item.dataUrl)).blob();
        const path = `${session.user.id}/${item.landmarkId}-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("checkin-photos").upload(path, blob, { contentType:"image/jpeg" });
        if(!upErr) photoUrl = supabase.storage.from("checkin-photos").getPublicUrl(path).data.publicUrl;
      }
      // מענק-XP אמיתי מתבצע כאן, לא בזמן ההוספה-לתור (ראו grantConquestAndBonuses) - כך
      // שדה-דופ/בונוסים מחושבים נכון מול המצב האמיתי בזמן הסנכרון. l חסר = היעד נמחק בין
      // הצ'ק-אין האופליין לסנכרון (edge case) - נרשם עם 0 נקודות בלי קריסה.
      const grant = l ? await grantConquestAndBonuses(l) : { totalGranted:0 };
      let { error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:item.landmarkId, photo_url:photoUrl, points_awarded:grant.totalGranted, note:item.note||null });
      if(error && /note/i.test(error.message||"")){
        ({ error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:item.landmarkId, photo_url:photoUrl, points_awarded:grant.totalGranted }));
      }
      if(error) throw error;
      myVisits = myVisits.filter(v=>!(v.pending && v.landmark_id===item.landmarkId));
      toast("סונכרן צ'ק-אין: "+(l?l.name:item.landmarkId));
    }catch(err){ remaining.push(item); }
  }
  localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  await loadMyVisits(); loadVisitCounts().then(renderMap);
  refreshHeader(); renderProfile(); renderBoard(); renderFeed();
}

/* ============ BADGES / STREAK ============ */
function unlockedBadges(){ return BADGES.filter(b=>b.current(myVisits)>=b.target(myVisits)); }
function checkNewBadges(){
  const now = unlockedBadges();
  const newOnes = now.filter(b=>!prevBadgeSet.has(b.id));
  prevBadgeSet = new Set(now.map(b=>b.id));
  // מסומנות כ"חדשות" עד הפעם הראשונה שמסך-החותמות מצייר אותן (renderAchievementsPanel
  // מנקה את הסט), כדי שאנימציית ההטבעה תרוץ כשרואים אותן - לא בזמן שהמסך סגור.
  newOnes.forEach(b=> freshStamps.add(b.id));
  // התאריך מגיע מה-DB רק בטעינה הבאה; בינתיים מציגים את הזמן האמיתי של עכשיו
  newOnes.forEach(b=>{ if(!myBadgeDates[b.id]) myBadgeDates[b.id] = new Date().toISOString(); });
  return newOnes;
}
function isoWeekKey(d){
  const date = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day = (date.getUTCDay()+6)%7;
  date.setUTCDate(date.getUTCDate()-day+3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(),0,4));
  const week = 1+Math.round(((date-firstThu)/86400000-3+((firstThu.getUTCDay()+6)%7))/7);
  return date.getUTCFullYear()+"-W"+week;
}
function streakFromVisits(visits){
  if(!visits.length) return 0;
  const weeks = new Set(visits.map(v=>isoWeekKey(new Date(v.visited_at))));
  let cursor = new Date(), streak=0;
  while(weeks.has(isoWeekKey(cursor))){ streak++; cursor.setDate(cursor.getDate()-7); }
  return streak;
}
function computeStreak(){ return streakFromVisits(myVisits); }

// Gamification Overhaul - טעינת שתי הטבלאות החדשות + totalXP() - מקור-האמת היחיד ל-XP-כולל
// בכל האפליקציה (header/פרופיל/כרטיס-שיתוף/ליברבורד). מחליף את totalPoints() הישן (סכום
// visits.points_awarded), שהיה מערבב נתונים היסטוריים בסולם-הישן עם נתונים חדשים בסולם-החדש.
let myConquests = [];   // שורות landmark_conquests של המשתמש הנוכחי
let myBonusGrants = []; // שורות xp_bonus_grants של המשתמש הנוכחי
async function loadMyConquestsAndBonuses(){
  try{
    const { data, error } = await supabase.from("landmark_conquests").select("*").eq("user_id", session.user.id);
    if(error) throw error;
    myConquests = data || [];
  }catch(err){ myConquests = []; }
  try{
    const { data, error } = await supabase.from("xp_bonus_grants").select("*").eq("user_id", session.user.id);
    if(error) throw error;
    myBonusGrants = data || [];
  }catch(err){ myBonusGrants = []; }
  // תאריכי-הזכייה בחותמות. הנעילה עצמה מחושבת תמיד מ-myVisits (unlockedBadges), אז אם
  // הטבלה חסרה החותמות עדיין נכונות - רק בלי תאריך ובלי "הושגו לאחרונה".
  try{
    const { data, error } = await supabase.from("user_badges").select("badge_id,unlocked_at").eq("user_id", session.user.id);
    if(error) throw error;
    myBadgeDates = Object.fromEntries((data||[]).map(r=>[r.badge_id, r.unlocked_at]));
  }catch(err){ myBadgeDates = {}; }
}
function totalXP(){
  return myConquests.reduce((s,c)=>s+(c.xp_awarded||0),0) + myBonusGrants.reduce((s,b)=>s+(b.xp_awarded||0),0);
}

/* ============ HEADER ============ */
function refreshHeader(){
  $("headerPoints").classList.toggle("hidden", !session);
  $("headerLoginBtn").classList.toggle("hidden", !!session);
  $("notifBellBtn").classList.toggle("hidden", !session);
  if(session){
    $("pointsVal").textContent = totalXP().toLocaleString();
    $("streakVal").textContent = computeStreak();
  }
  // בכוונה לא מציגים "0%"/"0 מתוך" למשתמש שעוד לא ביקר בשום מקום - נשאר רק ה-welcome-banner
  // החיובי (renderProfile). ה-badge הזה מופיע רק אחרי הביקור הראשון.
  const pct = (session && LANDMARKS.length && myVisits.length>0) ? Math.round(myVisits.length/LANDMARKS.length*100) : null;
  const discEl = $("discoveryPct");
  if(discEl){
    discEl.classList.toggle("hidden", pct==null);
    if(pct!=null) discEl.textContent = `גיליתם ${pct}% מהארץ — ${myVisits.length} מתוך ${LANDMARKS.length} יעדים`;
  }
}

/* ============ PERSONAL MAP / SHARE CARD (canvas) ============ */
const SHARE_LON_MIN=34.2, SHARE_LON_MAX=35.9, SHARE_LAT_MIN=29.45, SHARE_LAT_MAX=33.35;
const SHARE_OUTLINE = [
  [33.09,35.11],[33.15,35.30],[33.25,35.55],[33.32,35.78],[33.13,35.82],
  [32.87,35.78],[32.72,35.75],[32.45,35.65],[32.45,35.60],[32.20,35.58],
  [31.85,35.55],[31.53,35.52],[31.30,35.45],[31.10,35.42],[30.95,35.40],
  [30.60,35.30],[30.20,35.15],[29.90,35.05],[29.55,34.97],[29.50,34.85],
  [29.55,34.70],[30.10,34.45],[30.85,34.35],[31.10,34.28],[31.22,34.24],
  [31.45,34.35],[31.80,34.62],[32.05,34.77],[32.35,34.87],[32.50,34.90],
  [32.60,34.93],[32.83,34.97],[32.93,35.07],[33.02,35.10],[33.09,35.11],
];
function getCssVar(name, fallback){ const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; }
function fitIsraelTransform(w, h, padFrac){
  const pad = Math.min(w,h)*(padFrac==null?0.1:padFrac);
  const availW = w-pad*2, availH = h-pad*2;
  const lonRange = SHARE_LON_MAX-SHARE_LON_MIN, latRange = SHARE_LAT_MAX-SHARE_LAT_MIN;
  const scale = Math.min(availW/lonRange, availH/latRange);
  const mapW = lonRange*scale, mapH = latRange*scale;
  const offX = (w-mapW)/2, offY = (h-mapH)/2;
  return (lat,lon)=> [ offX + (lon-SHARE_LON_MIN)*scale, offY + (SHARE_LAT_MAX-lat)*scale ];
}
function paintIsraelMap(ctx, w, h, { padFrac, landColor, outlineColor, dotVisited, dotOther, waterColor, bgColor } = {}){
  if(bgColor){ ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h); } else ctx.clearRect(0,0,w,h);
  const project = fitIsraelTransform(w, h, padFrac);
  ctx.beginPath();
  SHARE_OUTLINE.forEach(([la,lo],i)=>{ const [x,y]=project(la,lo); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.closePath();
  ctx.fillStyle = landColor || getCssVar("--map-land","#EEE9DA");
  ctx.fill();
  ctx.lineWidth = Math.max(1, w/300);
  ctx.strokeStyle = outlineColor || getCssVar("--map-outline","#C9BF9E");
  ctx.stroke();
  // ערפל לפי אזור - אותה גיאומטריה בדיוק כמו שכבת ה-Fog of War על ה-Leaflet map (Phase 1),
  // מוקרנת דרך אותה fitIsraelTransform - כך שגם כרטיס השיתוף (generateShareCard) מקבל את זה בחינם.
  const hulls = computeRegionHulls();
  Object.keys(REGIONS).forEach(r=>{
    const hull = hulls[r];
    if(!hull || hull.length<3) return;
    const opacity = Math.max(0, 0.18*(1-regionDiscoveryPct(r)));
    if(opacity<=0) return;
    ctx.beginPath();
    hull.forEach(([la,lo],i)=>{ const [x,y]=project(la,lo); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.closePath();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = "#8a9187";
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  const visitedSet = new Set(myVisits.map(v=>v.landmark_id));
  const r = Math.max(2, w/130);
  LANDMARKS.forEach(l=>{
    const [x,y] = project(l.lat,l.lon);
    const visited = visitedSet.has(l.id);
    ctx.beginPath();
    ctx.arc(x,y, visited?r*1.5:r*0.75, 0, Math.PI*2);
    ctx.globalAlpha = visited?1:0.4;
    ctx.fillStyle = visited ? (dotVisited || getCssVar("--accent-strong","#145C3C")) : (dotOther || outlineColor || getCssVar("--map-outline","#C9BF9E"));
    ctx.fill();
    if(visited){ ctx.lineWidth = Math.max(0.6, w/500); ctx.strokeStyle = "#fff"; ctx.stroke(); }
  });
  ctx.globalAlpha = 1;
}
function drawPersonalMap(canvas){
  if(!canvas) return;
  paintIsraelMap(canvas.getContext("2d"), canvas.width, canvas.height, {});
}
// Gamification Overhaul, Phase 6 - שם אבן-הדרך הנוכחית באזור, לפי 25/50/75/100% (מפרש
// נפרד מ-3 דרגות-התג הקיימות ב-BADGES, שם 25/60/100 - כדי לא לבלבל בין "תג שנפתח" לבין
// "תווית-התקדמות בפרופיל", ראו plan). null אם עוד לא הגיעו ל-25%.
// אותה שפת-חותמות בדיוק כמו region tier badges (regionTierBadges) - גליף+צבע-דרגה,
// לא אימוג'י. שני הצרכנים (שורת התקדמות-אזור ושורת-בונוס בחגיגת ה-Check-in) מציגים
// HTML, אז מותר להטביע כאן span צבוע במקום טקסט בלבד.
function regionMilestoneLabel(pct, r){
  const metalIcon = m=>'<span class="milestone-ic" style="color:var(--metal-'+m+')">'+stampGlyph("seal",13)+'</span>';
  if(pct>=100) return uiIcon("trophy",13)+" אלוף "+REGION_THE[r];
  if(pct>=75) return metalIcon("gold")+" מומחה "+REGION_THE[r];
  if(pct>=50) return metalIcon("silver")+" חוקר "+REGION_THE[r];
  if(pct>=25) return metalIcon("bronze")+" מגלה "+REGION_THE[r];
  return null;
}
function renderRegionProgress(){
  const el = $("regionProgressList");
  if(!el) return;
  el.innerHTML = Object.keys(REGIONS).map(r=>{
    const total = regionCount(r), done = regionVisited(myVisits, r);
    const pct = total ? Math.round(done/total*100) : 0;
    const milestone = regionMilestoneLabel(pct, r);
    const nudge = done>=total ? "" : `<div class="region-row-nudge">עוד ${total-done} להשלמת ${REGIONS[r]}</div>`;
    return `<div class="region-row" data-region="${r}">
      <div class="region-row-head"><span class="name">${REGIONS[r]}</span><span class="count">${done} מתוך ${total} · ${pct}%</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      ${milestone ? `<div class="region-row-milestone">${milestone}</div>` : ""}
      ${nudge}
    </div>`;
  }).join("");
  el.querySelectorAll(".region-row").forEach(row=> row.onclick = ()=> openRegionSheet(row.dataset.region));
}
function renderPlaceListSheet(title, list, subtitle){
  $("regionSheetTitle").textContent = title;
  const visitedIds = new Set(myVisits.map(v=>v.landmark_id));
  const subtitleHtml = subtitle ? `<p class="region-sheet-subtitle">${escapeHtml(subtitle)}</p>` : "";
  $("regionSheetBody").innerHTML = subtitleHtml + list.map(l=>{
    const cat = CATEGORIES[l.category];
    if(visitedIds.has(l.id)){
      const photoUrl = landmarkPhotos[l.id];
      const thumb = photoUrl ? `<img src="${photoUrl}" loading="lazy" decoding="async" alt="${l.name}">` : catIconSvg(cat.icon,20);
      return `<div class="region-place-row visited" data-goto="${l.id}" role="button" tabindex="0" aria-label="${l.name}"><div class="thumb">${thumb}</div><div class="info"><div class="name">${l.name}</div><div class="sub">${tierDotHtml(tierForDb(l.difficulty))}${tierForDb(l.difficulty).label} · ${cat.label}</div></div></div>`;
    }
    return `<div class="region-place-row locked"><div class="thumb mystery">?</div><div class="info"><div class="name">מקום שעוד לא גילית</div><div class="sub">${tierDotHtml(tierForDb(l.difficulty))}${tierForDb(l.difficulty).label} · ${cat.label}</div></div></div>`;
  }).join("");
  $("regionSheetBody").querySelectorAll("[data-goto]").forEach(elm=>{
    const go = ()=>{ closeSheet("regionSheet","regionScrim"); goToDestination(elm.dataset.goto); };
    elm.onclick = go;
    elm.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } };
  });
  openSheet("regionSheet","regionScrim");
}
function openRegionSheet(r){
  renderPlaceListSheet(REGIONS[r], LANDMARKS.filter(l=>l.region===r));
}
function renderCollections(){
  const el = $("collectionGrid");
  if(!el) return;
  // מיון לפי "כמה קרוב להשלמה" - האוסף שנשאר בו הכי מעט עולה למעלה, כי זה ה-open loop
  // שהכי סביר שיגרום ליציאה לטיול הבא (§10). אוספים שהושלמו יורדים לסוף.
  const rows = COLLECTIONS.map(c=>{
    const { done, total } = collectionProgress(c);
    return { c, done, total, left: total-done, pct: total ? Math.round(done/total*100) : 0 };
  }).filter(r=> r.total>0)
    .sort((a,b)=>{
      const aDone = a.left===0, bDone = b.left===0;
      if(aDone!==bDone) return aDone ? 1 : -1;
      if(a.done===0 && b.done>0) return 1;
      if(b.done===0 && a.done>0) return -1;
      return a.left-b.left;
    });
  el.innerHTML = rows.map(r=>{
    const left = r.left===0
      ? "הושלם!"
      : (r.done===0 ? `${r.total} מקומות באוסף` : `נשאר${r.left===1?"" : "ו"} <b>${r.left===1?"מקום אחד":r.left+" מקומות"}</b> להשלמה`);
    return `<div class="collection-card${r.left===0?" done":""}" data-id="${r.c.id}" role="button" tabindex="0">
      <div class="collection-icon">${collectionIconHtml(r.c, 22)}</div>
      <div class="collection-body">
        <div class="collection-title">${r.c.label}</div>
        <div class="collection-left">${left}</div>
        <div class="collection-bar"><i style="width:${r.pct}%"></i></div>
      </div>
      <div class="collection-count">${r.done}/${r.total}</div>
    </div>`;
  }).join("");
  el.querySelectorAll("[data-id]").forEach(elm=>{
    const go = ()=> navigate("#/collection/"+elm.dataset.id);
    elm.onclick = go;
    elm.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } };
  });
}
/* ============ SAVED (§15) ============ */
// "שמורים" קיבל טאב ניווט משלו במקום להיות טאב שלישי בתוך הפרופיל. אותה רשימה, אותה
// לוגיקה (myWishlist + wishlistContextLines) - רק מקום אחד ברור להגיע אליו.
function renderSaved(){
  const listEl = $("savedList"); if(!listEl) return;
  const subEl = $("savedSub");
  if(!session){
    subEl.textContent = "";
    listEl.innerHTML = emptyStateHtml({ icon: uiIcon("heart",26), title: "שמרו מקומות לפעם הבאה",
      sub: "התחברו כדי לשמור יעדים שתרצו להגיע אליהם.", ctaId:"savedGuestCta", ctaLabel:"התחברות / הרשמה" });
    const cta=$("savedGuestCta"); if(cta) cta.onclick = ()=> openAuthSheet("שמרו את הטיול הראשון שלכם");
    return;
  }
  if(!myWishlist.length){
    subEl.textContent = "";
    listEl.innerHTML = emptyStateHtml({ icon: uiIcon("heart",26), title: "עוד לא שמרתם מקומות",
      sub: "סמנו בלב כל מקום שתרצו להגיע אליו, והוא יחכה לכם כאן.", ctaId:"savedEmptyCta", ctaLabel:"גלו מקומות" });
    const cta=$("savedEmptyCta"); if(cta) cta.onclick = ()=> navigate("#/home");
    return;
  }
  loadWishlistFriendVisits();
  subEl.textContent = myWishlist.length+" מקומות מחכים לכם";
  const sorted = userLoc
    ? myWishlist.slice().sort((a,b)=>{
        const la=lmById[a], lb=lmById[b]; if(!la||!lb) return 0;
        return haversine(userLoc.lat,userLoc.lon,la.lat,la.lon) - haversine(userLoc.lat,userLoc.lon,lb.lat,lb.lon);
      })
    : myWishlist;
  listEl.innerHTML = sorted.map(id=>{
    const l = lmById[id]; if(!l) return "";
    const ctx = wishlistContextLines(l).map(t=>`<div class="wishlist-context">${t}</div>`).join("");
    return placeCardHtml(l, { extra: ctx });
  }).join("");
  listEl.querySelectorAll(".mini-card").forEach(elm=> elm.onclick = ()=> goToDestination(elm.dataset.id));
  wireMiniCardKeydown(listEl);
}
function openCollectionSheet(id){
  const c = COLLECTIONS.find(x=>x.id===id); if(!c) return;
  const { done, total } = collectionProgress(c);
  track("collection_progressed", { collection: id, done, total });
  const subtitle = (c.description||"")+"  ·  "+done+"/"+total+" הושלמו";
  // הכותרת מוצגת כ-textContent (לא innerHTML) - כמו openRegionSheet, בלי אייקון בכותרת
  // עצמה; האייקון כבר מופיע על כרטיס האוסף שהוביל לכאן.
  renderPlaceListSheet(c.label, collectionLandmarks(c), subtitle);
}
async function generateShareCard(){
  const W=1080, H=1600;
  const canvas = document.createElement("canvas");
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext("2d");
  const bg = getCssVar("--bg","#F7F5EF"), surface = getCssVar("--surface","#FFFFFF"), text = getCssVar("--text","#202622"), muted = getCssVar("--text-muted","#6F7772"), accent = getCssVar("--accent-strong","#145C3C"), teal = getCssVar("--teal","#2D838C");
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  ctx.textAlign = "center";
  ctx.fillStyle = text; ctx.font = "700 54px Heebo, sans-serif";
  ctx.fillText("מגלים", W/2, 130);
  ctx.fillStyle = muted; ctx.font = "400 32px Heebo, sans-serif";
  ctx.fillText("המסע של "+(myProfile?myProfile.name:"מטייל/ת"), W/2, 185);
  const pct = LANDMARKS.length ? Math.round(myVisits.length/LANDMARKS.length*100) : 0;
  ctx.fillStyle = accent; ctx.font = "800 130px Heebo, sans-serif";
  ctx.fillText("גיליתי "+pct+"% 🇮🇱", W/2, 350);
  ctx.save();
  ctx.translate(80, 420);
  paintIsraelMap(ctx, W-160, 950, { padFrac:0.06 });
  ctx.restore();
  ctx.fillStyle = surface; ctx.fillRect(60, 1400, W-120, 150);
  ctx.fillStyle = text; ctx.font = "800 46px Heebo, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(myVisits.length+" יעדים כבשתי", W-110, 1465);
  ctx.fillStyle = teal; ctx.font = "700 34px Heebo, sans-serif";
  ctx.fillText(totalXP().toLocaleString()+" נקודות · רצף "+computeStreak()+" שבועות", W-110, 1515);
  ctx.textAlign = "center";
  ctx.fillStyle = muted; ctx.font = "400 28px Heebo, sans-serif";
  ctx.fillText(SITE_HOST, W/2, H-40);
  return new Promise(resolve=> canvas.toBlob(blob=>resolve(blob), "image/png"));
}
async function shareMyMap(){
  const btn = $("shareMapBtn");
  if(btn){ btn.disabled = true; btn.textContent = "מכין תמונה..."; }
  try{
    const blob = await generateShareCard();
    const file = new File([blob], "המסע-שלי-בישראל.png", { type:"image/png" });
    if(navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title:"מגלים", text:"המסע שלי בישראל 🇮🇱" });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "המסע-שלי-בישראל.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 4000);
      toast("התמונה הורדה — אפשר לשתף אותה בוואטסאפ או באינסטגרם");
    }
  }catch(err){
    if(err.name!=="AbortError"){ console.error(err); toast("לא הצלחנו להכין את התמונה לשיתוף"); }
  }finally{
    if(btn){ btn.disabled=false; btn.textContent="שתף את המפה שלי"; }
  }
}

/* ============ WISHLIST CONTEXT (Smart Wishlist) ============ */
function currentSeasonKey(){
  const m = new Date().getMonth()+1;
  if(m===12||m<=2) return "winter";
  if(m<=5) return "spring";
  if(m<=8) return "summer";
  return "fall";
}
let wishlistFriendVisits = {};
let wishlistFriendVisitsKey = "";
function loadWishlistFriendVisits(){
  if(!session || !myWishlist.length) return;
  const key = myWishlist.slice().sort().join(",");
  if(key===wishlistFriendVisitsKey) return;
  wishlistFriendVisitsKey = key;
  getFriends().then(friends=>{
    if(!friends.length){ wishlistFriendVisits = {}; return; }
    const friendIds = friends.map(f=>f.userId);
    return supabase.from("visits").select("landmark_id,user_id").in("user_id",friendIds).in("landmark_id",myWishlist).then(({data,error})=>{
      if(error){ console.warn("wishlist friend-visits unavailable:", error.message); return; }
      const counts = {};
      data.forEach(v=>{ counts[v.landmark_id] = (counts[v.landmark_id]||0)+1; });
      wishlistFriendVisits = counts;
      renderSaved();   // רשימת השמורים עברה למסך משלה - שם צריכות להופיע שורות "חברים ביקרו כאן"
    });
  });
}
function wishlistContextLines(l){
  const lines = [];
  if(userLoc){
    const km = haversine(userLoc.lat,userLoc.lon,l.lat,l.lon);
    lines.push(uiIcon("region",13)+" כ-"+estimateDriveMinutes(km)+" דק' נסיעה ממך");
  }
  const friendCount = wishlistFriendVisits[l.id] || 0;
  if(friendCount>0){
    lines.push(uiIcon("family",13)+" "+friendCount+" "+(friendCount===1?"חבר/ה ביקר/ה":"חברים ביקרו")+" כאן");
  } else if(l.season && l.season===currentSeasonKey()){
    lines.push(uiIcon("leaf",13)+" עונה מומלצת לביקור עכשיו");
  }
  return lines.slice(0,2);
}
/* ============ EDIT PROFILE (App Essentials Phase 0A, Round 1) ============ */
let editPrefs = {};
let editAvatarPhoto = null;
function wireMultiChips(containerId, arrGetter){
  document.querySelectorAll("#"+containerId+" .chip").forEach(chip=>{
    chip.onclick = ()=>{
      const id = chip.dataset.id;
      const arr = arrGetter();
      const idx = arr.indexOf(id);
      if(idx>=0) arr.splice(idx,1); else arr.push(id);
      chip.classList.toggle("active", arr.includes(id));
    };
  });
}
function wireSingleChip(containerId, key){
  document.querySelectorAll("#"+containerId+" .chip").forEach(chip=>{
    chip.onclick = ()=>{
      editPrefs[key] = editPrefs[key]===chip.dataset.id ? null : chip.dataset.id;
      document.querySelectorAll("#"+containerId+" .chip").forEach(c=> c.classList.toggle("active", c.dataset.id===editPrefs[key]));
    };
  });
}
function openEditProfile(){
  if(!session || !myProfile){ toast("צריך להתחבר קודם"); navigate("#/map", false); return; }
  editAvatarPhoto = null;
  editPrefs = JSON.parse(JSON.stringify(myProfile.travel_preferences || {}));
  editPrefs.company = editPrefs.company || [];
  editPrefs.interests = editPrefs.interests || [];
  editPrefs.amenities = editPrefs.amenities || [];
  $("editNameInput").value = myProfile.name || "";
  if(myProfile.avatar_url) $("editAvatarPreview").innerHTML = `<img src="${myProfile.avatar_url}" alt="תמונת פרופיל">`;
  else $("editAvatarPreview").innerHTML = `<span id="editAvatarLetter">${(myProfile.name||"א").trim().charAt(0)}</span>`;
  ["prefCompany","prefInterests","prefAmenities"].forEach(id=>{
    const key = id==="prefCompany" ? "company" : id==="prefInterests" ? "interests" : "amenities";
    document.querySelectorAll("#"+id+" .chip").forEach(c=> c.classList.toggle("active", editPrefs[key].includes(c.dataset.id)));
  });
  ["prefDifficulty","prefDuration","prefDistance"].forEach(id=>{
    const key = id==="prefDifficulty" ? "difficulty" : id==="prefDuration" ? "duration" : "distance";
    document.querySelectorAll("#"+id+" .chip").forEach(c=> c.classList.toggle("active", c.dataset.id===editPrefs[key]));
  });
  $("editProfileScreen").classList.remove("hidden");
}
function closeEditProfile(){
  $("editProfileScreen").classList.add("hidden");
  navigate("#/profile");
}
async function saveProfile(){
  const name = $("editNameInput").value.trim();
  if(!name){ toast("נא להזין שם"); return; }
  const btn = $("saveProfileBtn"); btn.disabled = true; btn.textContent = "שומר...";
  try{
    let avatarUrl = myProfile.avatar_url || null;
    if(editAvatarPhoto){
      const path = `${session.user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, editAvatarPhoto.blob, { contentType:"image/jpeg" });
      if(upErr) throw upErr;
      avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("profiles").update({
      name, avatar_url: avatarUrl, travel_preferences: editPrefs,
    }).eq("id", session.user.id);
    if(error){
      if(/travel_preferences/i.test(error.message||"")){
        const { error: err2 } = await supabase.from("profiles").update({ name, avatar_url: avatarUrl }).eq("id", session.user.id);
        if(err2) throw err2;
        toast("השם והתמונה נשמרו — סגנון הטיולים יישמר אחרי עדכון קרוב");
        myProfile.name = name; myProfile.avatar_url = avatarUrl;
        renderProfile(); closeEditProfile();
        return;
      }
      throw error;
    }
    myProfile.name = name; myProfile.avatar_url = avatarUrl; myProfile.travel_preferences = editPrefs;
    toast("✓ הפרופיל נשמר");
    renderProfile(); closeEditProfile();
  }catch(err){
    console.error(err);
    toast("לא הצלחנו לשמור. נסה שוב.");
  }finally{
    btn.disabled = false; btn.textContent = "שמירה";
  }
}
/* ============ GLOBAL SEARCH + RECENT/HISTORY (per-device localStorage) ============ */
const RECENT_SEARCHES_KEY = "magalim-recent-searches";
const RECENTLY_VIEWED_KEY = "magalim-recently-viewed";
function getRecentSearches(){ try{ return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)||"[]"); }catch(e){ return []; } }
function addRecentSearch(q){
  q = (q||"").trim(); if(!q) return;
  let list = getRecentSearches().filter(x=>x!==q);
  list.unshift(q);
  try{ localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list.slice(0,5))); }catch(e){}
  track("search_used", { query_length: q.length });
}
function getRecentlyViewed(){ try{ return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY)||"[]"); }catch(e){ return []; } }
function addRecentlyViewed(id){
  let list = getRecentlyViewed().filter(x=>x!==id);
  list.unshift(id);
  try{ localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list.slice(0,15))); }catch(e){}
}
function searchLandmarks(query){
  const q = query.trim().toLowerCase();
  if(!q) return [];
  return LANDMARKS.filter(l=>{
    const cat = CATEGORIES[l.category];
    return l.name.toLowerCase().includes(q)
      || (REGIONS[l.region]||"").toLowerCase().includes(q)
      || (cat && cat.label.toLowerCase().includes(q));
  }).slice(0,40);
}
function searchMiniCardHtml(l, subLine){
  return placeCardHtml(l, { metaHtml: subLine ? `<div class="sub">${subLine}</div>` : undefined });
}
function wireMiniCardKeydown(container){
  container.querySelectorAll(".mini-card").forEach(card=>{
    card.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); card.onclick && card.onclick(); } };
  });
}
function renderSearchDefault(){
  const el = $("searchResults");
  const recent = getRecentSearches();
  const viewed = getRecentlyViewed().map(id=>lmById[id]).filter(Boolean).slice(0,10);
  let html = "";
  if(recent.length){
    html += `<div class="section-head" style="margin-top:0;"><h2>חיפשת לאחרונה</h2></div>
      <div class="chip-row">${recent.map(q=>`<button type="button" class="chip" data-recent-q="${q.replace(/"/g,"&quot;")}">${q}</button>`).join("")}</div>`;
  }
  if(viewed.length){
    html += `<div class="section-head"${recent.length?"":' style="margin-top:0;"'}><h2>נצפו לאחרונה</h2></div>`
      + viewed.map(l=> searchMiniCardHtml(l, REGIONS[l.region])).join("");
  }
  el.innerHTML = html || '<div class="empty-state">חפשו יעד לפי שם, אזור או קטגוריה.</div>';
  el.querySelectorAll("[data-recent-q]").forEach(chip=> chip.onclick = ()=>{
    $("searchInput").value = chip.dataset.recentQ;
    renderSearchResults(chip.dataset.recentQ);
  });
  el.querySelectorAll(".mini-card").forEach(card=> card.onclick = ()=>{ closeSheet("searchSheet","searchScrim"); goToDestination(card.dataset.id); });
  wireMiniCardKeydown(el);
}
function renderSearchResults(query){
  const el = $("searchResults");
  const results = searchLandmarks(query);
  if(!results.length){
    el.innerHTML = '<div class="empty-state">לא מצאנו יעדים תואמים.</div>';
    return;
  }
  el.innerHTML = results.map(l=> searchMiniCardHtml(l, REGIONS[l.region]+" · "+tierDotHtml(tierForDb(l.difficulty))+tierForDb(l.difficulty).label)).join("");
  el.querySelectorAll(".mini-card").forEach(card=> card.onclick = ()=>{
    addRecentSearch(query);
    closeSheet("searchSheet","searchScrim");
    goToDestination(card.dataset.id);
  });
  wireMiniCardKeydown(el);
}
function openSearchSheet(){
  $("searchInput").value = "";
  renderSearchDefault();
  openSheet("searchSheet","searchScrim");
  setTimeout(()=> $("searchInput").focus(), 150);
}
/* ============ PROFILE ============ */
function renderProfile(){
  if(!session){ setGuestGate("profile", true); $("navUnreadDot").classList.remove("show"); $("bellUnreadDot").classList.remove("show"); return; }
  setGuestGate("profile", false);
  if(!myProfile) return;
  $("adminLinkBtn").classList.toggle("hidden", !myProfile.is_admin);
  // Gamification Overhaul, Phase 2 - totalXP()/getCurrentLevelProgress() (עקומת-20-הרמות
  // החדשה) מחליפים את totalPoints()/getLevel() (עקומת-6-הרמות הישנה) - יחד, לא בנפרד, כדי
  // לא להציג רמה מוטעית-זמנית תוך כדי מעבר (ראו הערה ב-Phase 1).
  const xp = totalXP();
  const progress = getCurrentLevelProgress(xp);
  const level = progress.level;
  $("avatarLetter").innerHTML = myProfile.avatar_url ? `<img src="${myProfile.avatar_url}" alt="">` : (myProfile.name.trim().charAt(0) || "א");
  $("avatarLevelBadge").innerHTML = stampGlyph(levelGlyphName(progress.index), 14);
  $("profName").firstChild.textContent = myProfile.name;
  $("profSub").innerHTML = `<span class="level-chip">${stampGlyph(levelGlyphName(progress.index),14)} ${level.name}</span> · ${myVisits.length} יעדים נכבשו`;
  const levelPct = getLevelProgressPercentage(xp);
  $("progNum").firstChild.textContent = progress.next ? progress.xpIntoLevel.toLocaleString() : xp.toLocaleString();
  $("progNum").querySelector("span").textContent = progress.next ? "/ "+progress.xpForLevel.toLocaleString()+" נקודות" : "נקודות · רמה מקסימלית";
  $("progPct").textContent = levelPct+"%";
  $("progBar").style.width = levelPct+"%";
  $("levelHint").innerHTML = progress.next
    ? `${stampGlyph(levelGlyphName(progress.index+1),14)} עוד ${getXPToNextLevel(xp).toLocaleString()} נקודות לרמת "${progress.next.name}"`
    : `${stampGlyph("trophy",14)} הגעתם לרמה הגבוהה ביותר!`;
  // Gamification Overhaul, Phase 6 - "NEXT LEVEL CTA": מצביע לאותו openTodaySheet() הקיים
  // (המלצה מבוססת בטיחות/העדפות, לא "הכי הרבה XP") - לא מנוע-המלצות חדש. לא מוצג ברמה
  // מקסימלית (אין "רמה הבאה" למצוא-לקראתה).
  $("nextLevelCta").classList.toggle("hidden", progress.isMax);
  $("welcomeBanner").classList.toggle("hidden", myVisits.length>0);
  $("progressSection").classList.toggle("hidden", myVisits.length===0);
  // Gamification Overhaul, Phase 6 - ציר-הסיכום הראשון מציג את אחוז-הגילוי ("ישראל שלי X%",
  // בדיוק כמו הדוגמה במפרט), לא ספירה גולמית של יעדים - הספירה הגולמית עדיין מוצגת ב-profSub
  // ("X יעדים נכבשו") וברשימת "כבשתי" למטה, אז שום מידע לא אבד.
  const discPct = LANDMARKS.length ? Math.round(myVisits.length/LANDMARKS.length*100) : 0;
  const regionsVisited = new Set(myVisits.map(v=>lmById[v.landmark_id]?.region).filter(Boolean));
  $("statRegions").textContent = regionsVisited.size+"/"+Object.keys(REGIONS).length;
  $("statPlaces").textContent = myVisits.length;
  drawPersonalMap($("profileMapCanvas"));
  // Hero metric: אותו נתון-גילוי, עכשיו כטבעת-התקדמות + כותרת ראשית (ולא שורת-טקסט קטנה)
  $("myIsraelPct").textContent = "גילית "+discPct+"% מישראל";
  $("israelRingPct").textContent = discPct+"%";
  const RING_C = 213.6;
  $("israelRing").style.strokeDashoffset = (RING_C*(1-discPct/100)).toFixed(1);
  $("myIsraelSub").textContent = myVisits.length
    ? myVisits.length+" מתוך "+LANDMARKS.length+" מקומות · "+regionsVisited.size+" אזורים"
    : "כל צ׳ק-אין פותח עוד פיסה מהמפה";
  renderRegionProgress();
  $("statPoints").textContent = xp.toLocaleString();
  $("statStreak").textContent = computeStreak();
  $("statBadges").textContent = unlockedBadges().length+"/"+BADGES.length;
  const listEl = $("profList");
  if(profileListTab==="visited"){
    if(!myVisits.length){
      listEl.innerHTML = emptyStateHtml({ icon: uiIcon("compass",26), title: "עוד לא כבשת אף מקום",
        sub: "הטיול הראשון שלך מחכה ממש מעבר לפינה.", ctaId: "emptyVisitedCta", ctaLabel: "גלו מקומות" });
      $("emptyVisitedCta").onclick = ()=> navigate("#/map");
    } else {
      listEl.innerHTML = myVisits.slice().sort((a,b)=>new Date(b.visited_at)-new Date(a.visited_at)).map(v=>{
        const l = lmById[v.landmark_id]; if(!l) return "";
        const cat = CATEGORIES[l.category];
        const thumb = v.photo_url ? `<img src="${v.photo_url}" loading="lazy" alt="תמונה מהצ'ק-אין ב${l.name}">` : photoFallbackHtml(l,30);
        return placeCardHtml(l, {
          thumb,
          metaHtml: `<div class="sub">${new Date(v.visited_at).toLocaleDateString('he-IL')}${v.pending?' · ממתין לסנכרון':''}</div>`,
          points: v.points_awarded, done: true,
        });
      }).join("");
    }
  } else {
    const recentlyViewed = getRecentlyViewed().map(id=>lmById[id]).filter(Boolean);
    if(!recentlyViewed.length){
      listEl.innerHTML = emptyStateHtml({ icon: uiIcon("duration",26), title: "עדיין אין היסטוריה",
        sub: "מקומות שתצפו בהם יופיעו כאן.", ctaId: "emptyHistoryCta", ctaLabel: "גלו מקומות" });
      $("emptyHistoryCta").onclick = ()=> navigate("#/map");
    } else {
      listEl.innerHTML = recentlyViewed.map(l=> placeCardHtml(l)).join("");
    }
  }
  listEl.querySelectorAll(".mini-card").forEach(el=>el.onclick=()=>goToDestination(el.dataset.id));
  wireMiniCardKeydown(listEl);
  renderPrivacySection();
  renderFriends();
  renderNotifications();
}

/* ============ FRIENDSHIPS ============ */
async function sendFriendRequest(addresseeId){
  if(addresseeId === session.user.id) throw new Error("אי אפשר לשלוח בקשת חברות לעצמך");
  const { error } = await supabase.from("friendships").insert({ requester_id: session.user.id, addressee_id: addresseeId });
  if(error) throw error;
}
async function acceptFriendRequest(id){
  const { error } = await supabase.from("friendships").update({ status:"accepted", accepted_at: new Date().toISOString() }).eq("id", id);
  if(error) throw error;
}
async function declineFriendRequest(id){
  const { error } = await supabase.from("friendships").update({ status:"declined" }).eq("id", id);
  if(error) throw error;
}
async function removeFriend(id){
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if(error) throw error;
}
async function blockUser(otherUserId){
  const mine = session.user.id;
  const { data: existing } = await supabase.from("friendships").select("id")
    .or(`and(requester_id.eq.${mine},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${mine})`)
    .maybeSingle();
  if(existing){
    const { error } = await supabase.from("friendships").update({ status:"blocked" }).eq("id", existing.id);
    if(error) throw error;
  } else {
    const { data, error: insErr } = await supabase.from("friendships").insert({ requester_id:mine, addressee_id:otherUserId }).select().single();
    if(insErr) throw insErr;
    const { error: updErr } = await supabase.from("friendships").update({ status:"blocked" }).eq("id", data.id);
    if(updErr) throw updErr;
  }
}
async function unblockUser(friendshipId){
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if(error) throw error;
}
async function getBlockedUsers(){
  const mine = session.user.id;
  const { data, error } = await supabase.from("friendships").select("id,requester_id,addressee_id")
    .eq("status","blocked").or(`requester_id.eq.${mine},addressee_id.eq.${mine}`);
  if(error){ console.warn("friendships feature unavailable:", error.message); return []; }
  return data.map(f=>({ friendshipId:f.id, userId: f.requester_id===mine ? f.addressee_id : f.requester_id }));
}
async function renderBlockedUsers(){
  const el = $("blockedUsersList");
  if(!el) return;
  const blocked = await getBlockedUsers();
  if(!blocked.length){ el.innerHTML = '<div class="friends-empty">אין לך משתמשים חסומים.</div>'; return; }
  const ids = blocked.map(b=>b.userId);
  const { data } = await supabase.from("profiles").select("id,name,avatar_url").in("id", ids);
  const names = {}, avatars = {}; (data||[]).forEach(p=>{ names[p.id]=escapeHtml(p.name); avatars[p.id]=p.avatar_url; });
  el.innerHTML = blocked.map(b=>{
    const name = names[b.userId] || "מטייל/ת";
    return `<div class="friend-row" data-id="${b.friendshipId}">
      <div class="avatar">${avatarInner(name,avatars[b.userId])}</div>
      <div class="friend-name">${name}</div>
      <button class="btn btn-ghost" data-act="unblock">בטל חסימה</button>
    </div>`;
  }).join("");
  el.querySelectorAll(".friend-row").forEach(row=>{
    row.querySelector('[data-act="unblock"]').onclick = async ()=>{ await unblockUser(row.dataset.id); toast("החסימה בוטלה"); renderBlockedUsers(); renderFriends(); };
  });
}
async function getPendingFriendRequests(){
  const { data, error } = await supabase.from("friendships").select("id,requester_id,created_at").eq("addressee_id", session.user.id).eq("status","pending");
  if(error){ console.warn("friendships feature unavailable:", error.message); return []; }
  return data;
}
async function getFriends(){
  const mine = session.user.id;
  const { data, error } = await supabase.from("friendships").select("id,requester_id,addressee_id")
    .eq("status","accepted").or(`requester_id.eq.${mine},addressee_id.eq.${mine}`);
  if(error){ console.warn("friendships feature unavailable:", error.message); return []; }
  return data.map(f=>({ friendshipId:f.id, userId: f.requester_id===mine ? f.addressee_id : f.requester_id }));
}
async function renderFriends(){
  const reqBox = $("friendRequestsBox"), listBox = $("friendsListBox");
  if(!reqBox || !listBox) return;
  getInviteQuota().then(q=>{
    $("inviteQuotaText").textContent = `הזמנות שנותרו: ${q.remaining}`;
    $("inviteQuotaText").classList.remove("hidden");
  }).catch(()=>{});
  const [pending, friends] = await Promise.all([ getPendingFriendRequests(), getFriends() ]);
  const otherIds = [...new Set([...pending.map(p=>p.requester_id), ...friends.map(f=>f.userId)])];
  let names = {}, avatars = {};
  if(otherIds.length){
    const { data } = await supabase.from("profiles").select("id,name,avatar_url").in("id", otherIds);
    (data||[]).forEach(p=>{ names[p.id]=escapeHtml(p.name); avatars[p.id]=p.avatar_url; });
  }
  reqBox.innerHTML = pending.length ? pending.map(p=>{
    const name = names[p.requester_id] || "מטייל/ת";
    return `<div class="friend-row" data-id="${p.id}">
      <div class="avatar">${avatarInner(name,avatars[p.requester_id])}</div>
      <div class="friend-name">${name}</div>
      <div class="friend-actions">
        <button class="btn btn-primary" data-act="accept">אישור</button>
        <button class="btn btn-ghost" data-act="decline">דחייה</button>
      </div>
    </div>`;
  }).join("") : "";
  reqBox.querySelectorAll(".friend-row").forEach(row=>{
    const id = row.dataset.id;
    row.querySelector('[data-act="accept"]').onclick = async ()=>{ await acceptFriendRequest(id); toast("בקשת החברות אושרה!"); renderFriends(); };
    row.querySelector('[data-act="decline"]').onclick = async ()=>{ await declineFriendRequest(id); renderFriends(); };
  });
  if(!friends.length){
    listBox.innerHTML = '<div class="friends-empty">עדיין אין לך חברים באפליקציה.<br>בקרוב תוכלו להזמין חברים בעזרת קישור הזמנה.</div>';
  } else {
    listBox.innerHTML = friends.map(f=>{
      const name = names[f.userId] || "מטייל/ת";
      return `<div class="friend-row" data-id="${f.friendshipId}" data-user="${f.userId}">
        <div class="avatar">${avatarInner(name,avatars[f.userId])}</div>
        <div class="friend-name">${name}</div>
        <button class="icon-btn" data-act="report" aria-label="דיווח על משתמש" title="דיווח">${stampGlyph("flag",16)}</button>
        <button class="icon-btn" data-act="block" aria-label="חסימת משתמש" title="חסום">${uiIcon("block",16)}</button>
        <button class="icon-btn" data-act="remove" aria-label="הסרת חבר">✕</button>
      </div>`;
    }).join("");
    listBox.querySelectorAll(".friend-row").forEach(row=>{
      row.querySelector('[data-act="remove"]').onclick = async ()=>{ await removeFriend(row.dataset.id); renderFriends(); };
      row.querySelector('[data-act="block"]').onclick = async ()=>{
        const name = row.querySelector(".friend-name").textContent;
        const ok = await confirmAction({
          title: "לחסום את "+name+"?",
          message: "החסימה תסיר את החברות ביניכם, ותמנע ראיית פעילות ואינטראקציה הדדית.",
          confirmLabel: "חסום", destructive: true,
        });
        if(!ok) return;
        await blockUser(row.dataset.user);
        toast("המשתמש נחסם"); renderFriends(); renderBlockedUsers();
      };
      row.querySelector('[data-act="report"]').onclick = ()=>{
        const name = row.querySelector(".friend-name").textContent;
        const reportedId = row.dataset.user;
        openReportSheet("דיווח על "+name, USER_REPORT_REASONS, async (reason, message)=>{
          const { error } = await supabase.from("user_reports").insert({
            reporter_id: session.user.id, reported_user_id: reportedId, reason, message: message||null,
          });
          if(error) throw error;
        });
      };
    });
  }
}

/* ============ NOTIFICATIONS (Phase 9) ============ */
async function getNotifications(){
  const { data, error } = await supabase.from("notifications").select("*").order("created_at",{ascending:false}).limit(30);
  if(error){ console.warn("notifications feature unavailable:", error.message); return []; }
  return data;
}
async function markNotificationRead(id){
  const { error } = await supabase.from("notifications").update({ is_read:true }).eq("id",id);
  if(error) throw error;
}
async function markAllNotificationsRead(){
  if(!session) return;
  await supabase.from("notifications").update({ is_read:true }).eq("user_id",session.user.id).eq("is_read",false);
}
function notificationIcon(type){
  if(type==="friend_request") return uiIcon("family",18);
  if(type==="friend_accepted") return uiIcon("check",18);
  if(type==="circle_joined") return uiIcon("family",18);
  if(type==="friend_checkin") return uiIcon("trophy",18);
  if(type==="group_checkin") return uiIcon("trophy",18);
  return uiIcon("flame",18);
}
/* ============ WEB PUSH — התראות מחוץ לאפליקציה ============ */
// ההתראה עצמה תמיד נוצרת כשורה בטבלת notifications (דרך triggers ב-DB בלבד, ראו
// migrations_notifications.sql). ה-Push הוא רק *ערוץ המסירה* של אותה שורה אל מחוץ
// לאפליקציה - ולכן העדפות ההתראות הקיימות (notification_prefs) שולטות כבר גם בו:
// אם ה-trigger לא יצר שורה, אין מה לשלוח, בלי צורך בבדיקה כפולה כאן.
function pushSupported(){
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
// iOS תומך ב-Web Push רק כשהאפליקציה מותקנת למסך הבית (standalone). בטאב Safari רגיל
// PushManager פשוט לא קיים, ואז עדיף להסביר מה לעשות מאשר להציג toggle שלא יכול לעבוד.
function isIosDevice(){
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}
function urlBase64ToUint8Array(base64String){
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for(let i=0; i<raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
async function getExistingPushSubscription(){
  if(!pushSupported()) return null;
  try{
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  }catch(err){
    console.warn("push: getSubscription failed", err);
    return null;
  }
}
async function savePushSubscription(sub){
  const j = sub.toJSON();
  const { error } = await supabase.rpc("save_push_subscription", {
    _endpoint: j.endpoint,
    _p256dh: j.keys.p256dh,
    _auth_key: j.keys.auth,
    _user_agent: navigator.userAgent,
  });
  if(error) throw error;
}
async function enablePush(){
  if(!session){ toast("צריך להתחבר כדי לקבל התראות"); return false; }
  if(!pushSupported()){
    toast(isIosDevice() ? "ב-iPhone צריך קודם להתקין את האפליקציה למסך הבית" : "הדפדפן הזה לא תומך בהתראות");
    return false;
  }
  let perm = Notification.permission;
  if(perm === "default") perm = await Notification.requestPermission();
  if(perm !== "granted"){
    toast("ההרשאה להתראות נחסמה — אפשר לשנות אותה בהגדרות הדפדפן");
    return false;
  }
  try{
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if(!sub){
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await savePushSubscription(sub);
    toast("✓ התראות הופעלו למכשיר הזה");
    return true;
  }catch(err){
    console.error("push: subscribe failed", err);
    toast("לא הצלחנו להפעיל התראות במכשיר הזה");
    return false;
  }
}
async function disablePush(){
  try{
    const sub = await getExistingPushSubscription();
    if(sub){
      // מוחקים קודם מה-DB ורק אז מבטלים בדפדפן: בסדר ההפוך ה-endpoint כבר לא יהיה
      // בידינו כדי למחוק את השורה, והשרת ימשיך לשלוח לנקודת-קצה מתה עד שתיגזם.
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    toast("ההתראות למכשיר הזה כובו");
    return true;
  }catch(err){
    console.error("push: unsubscribe failed", err);
    toast("לא הצלחנו לכבות את ההתראות");
    return false;
  }
}
// ה-endpoint של מנוי יכול להתחלף מעצמו (רוטציה בשירות ה-Push, התקנה מחדש), ואז השורה
// ב-DB מצביעה לנקודת-קצה מתה בלי ששום דבר בממשק ישתנה. שמירה חוזרת בכל התחברות מיישרת.
async function syncPushSubscription(){
  if(!session || !pushSupported() || Notification.permission !== "granted") return;
  const sub = await getExistingPushSubscription();
  if(!sub) return;
  try{ await savePushSubscription(sub); }
  catch(err){ console.warn("push: sync failed", err); }
}
async function refreshPushRow(){
  const statusEl = $("pushStatusText"), toggle = $("pushToggle");
  if(!statusEl || !toggle) return;
  if(!pushSupported()){
    toggle.checked = false;
    toggle.disabled = true;
    statusEl.textContent = isIosDevice()
      ? "ב-iPhone: הקישו על כפתור השיתוף ואז \"הוסף למסך הבית\", ומשם אפשר להפעיל התראות."
      : "הדפדפן הזה לא תומך בהתראות מחוץ לאפליקציה.";
    return;
  }
  if(Notification.permission === "denied"){
    toggle.checked = false;
    toggle.disabled = true;
    statusEl.textContent = "ההרשאה חסומה בהגדרות הדפדפן עבור האתר הזה.";
    return;
  }
  const sub = await getExistingPushSubscription();
  toggle.disabled = false;
  toggle.checked = Boolean(sub) && Notification.permission === "granted";
  statusEl.textContent = toggle.checked
    ? "מקבלים התראות על המכשיר הזה גם כשהאפליקציה סגורה."
    : "הפעילו כדי לקבל עדכונים גם כשהאפליקציה סגורה.";
}
function notificationText(n){
  const p = n.payload || {};
  const fromName = escapeHtml(p.from_name||"מטייל/ת");
  const joinerName = escapeHtml(p.joiner_name||"מטייל/ת");
  const circleName = escapeHtml(p.circle_name||"");
  const visitorName = escapeHtml(p.visitor_name||"מטייל/ת");
  const landmarkName = escapeHtml(p.landmark_name||"");
  if(n.type==="friend_request") return `${fromName} שלח/ה לך בקשת חברות`;
  if(n.type==="friend_accepted") return `${fromName} אישר/ה את בקשת החברות שלך`;
  if(n.type==="circle_joined") return `${joinerName} הצטרפ/ה למעגל "${circleName}"`;
  // הנקודות מגיעות ב-payload רק מהתראות שנוצרו אחרי migrations_group_checkin_notifications -
  // התראות ישנות יותר פשוט לא יציגו אותן, בלי "undefined" ובלי לשבור את השורה.
  const pointsSuffix = Number.isFinite(p.points) && p.points > 0 ? ` · +${p.points} נקודות` : "";
  if(n.type==="friend_checkin") return `${visitorName} כבש/ה יעד חדש${landmarkName?" — "+landmarkName:""}${pointsSuffix}`;
  if(n.type==="group_checkin") return `${visitorName} מהקבוצה כבש/ה ${landmarkName||"יעד חדש"}${pointsSuffix}`;
  return "התראה חדשה";
}
function goToNotificationContext(n){
  const p = n.payload || {};
  if(n.type==="friend_request" || n.type==="friend_accepted"){
    navigate("#/profile");
    setTimeout(()=> $("friendRequestsBox")?.scrollIntoView({behavior:"smooth",block:"center"}), 250);
  } else if(n.type==="circle_joined" && p.circle_id){
    navigate("#/board");
    switchBoardTab("group");
  } else if((n.type==="friend_checkin" || n.type==="group_checkin") && p.landmark_id){
    goToDestination(p.landmark_id);
  }
}
async function renderNotifications(){
  if(!session) return;
  const listEl = $("notifList");
  listEl.innerHTML = skeletonNotifRows(4);
  const list = await getNotifications();
  const unread = list.filter(n=>!n.is_read).length;
  $("navUnreadDot").classList.toggle("show", unread>0);
  $("bellUnreadDot").classList.toggle("show", unread>0);
  if(!list.length){
    listEl.innerHTML = emptyStateHtml({ icon: uiIcon("flame",26), title: "הכול שקט כאן",
      sub: "התראות חדשות יופיעו כאן." });
    return;
  }
  listEl.innerHTML = list.map(n=>
    `<div class="notif-row${n.is_read?"":" unread"}" data-id="${n.id}">
      <div class="notif-icon">${notificationIcon(n.type)}</div>
      <div><div class="notif-text">${notificationText(n)}</div><div class="notif-time">${timeAgo(n.created_at)}</div></div>
    </div>`
  ).join("");
  listEl.querySelectorAll(".notif-row").forEach(row=>{
    const n = list.find(x=>x.id===row.dataset.id);
    row.onclick = async ()=>{
      if(row.classList.contains("unread")){
        row.classList.remove("unread");
        try{ await markNotificationRead(row.dataset.id); }catch(err){}
        const stillUnread = listEl.querySelectorAll(".notif-row.unread").length;
        $("navUnreadDot").classList.toggle("show", stillUnread>0);
        $("bellUnreadDot").classList.toggle("show", stillUnread>0);
      }
      closeSheet("settingsSheet","settingsScrim");
      if(n) goToNotificationContext(n);
    };
  });
}

/* ============ PRIVACY / TRAVEL STATUS ("מטיילים עכשיו") ============ */
function renderPrivacySection(){
  const enabled = !!(myTravelStatus && myTravelStatus.sharing_enabled);
  $("sharingToggle").checked = enabled;
  $("travelStatusBox").classList.toggle("hidden", !enabled);
  if(!enabled) return;
  const region = myTravelStatus.region;
  document.querySelectorAll("#travelRegionChips .chip").forEach(c=> c.classList.toggle("active", c.dataset.region===region));
  const until = myTravelStatus.travel_until ? new Date(myTravelStatus.travel_until) : null;
  const active = until && until.getTime()>Date.now();
  $("travelStatusText").innerHTML = active
    ? `${uiIcon("region",13)} משותף כרגע (${REGIONS[region]||region}) עד ${until.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}`
    : "השיתוף פעיל, אבל עדיין לא סימנתם שאתם מטיילים היום.";
}
async function setSharingEnabled(enabled){
  try{
    const { error } = await supabase.from("travel_status").upsert({ user_id:session.user.id, sharing_enabled:enabled, updated_at:new Date().toISOString() });
    if(error) throw error;
    myTravelStatus = { ...(myTravelStatus||{}), sharing_enabled:enabled };
    renderPrivacySection();
    toast(enabled ? "שיתוף אזור-הטיול עם חברים הופעל" : "שיתוף אזור-הטיול כובה");
  }catch(err){ toast("לא ניתן לעדכן כרגע (יתכן שהתכונה עדיין לא מופעלת)"); $("sharingToggle").checked = !enabled; }
}
async function setTravelingToday(region){
  try{
    const until = new Date(Date.now()+24*3600*1000).toISOString();
    const { error } = await supabase.from("travel_status").upsert({ user_id:session.user.id, sharing_enabled:true, region, travel_until:until, updated_at:new Date().toISOString() });
    if(error) throw error;
    myTravelStatus = { sharing_enabled:true, region, travel_until:until };
    renderPrivacySection();
    toast("שותף! חברים שעוקבים אחריכם יראו שאתם מטיילים היום ב"+REGIONS[region]);
  }catch(err){ toast("לא ניתן לשתף כרגע"); }
}
async function revokeSharing(){ await setSharingEnabled(false); }
async function renderFriendsTravelBanner(){
  const box = $("friendsTravelBanner");
  if(!session){ box.classList.add("hidden"); return; }
  try{
    const friends = await getFriends();
    if(!friends.length){ box.classList.add("hidden"); return; }
    const ids = friends.map(f=>f.userId);
    // ה-RLS על travel_status כבר מגביל לשורות ששותפו במפורש (sharing_enabled) ועדיין בתוקף (travel_until) - כל שורה שחוזרת כאן פעילה
    const { data, error } = await supabase.from("travel_status").select("user_id,region,profiles(name)").in("user_id", ids);
    if(error) throw error;
    if(!data || !data.length){ box.classList.add("hidden"); return; }
    const names = data.map(r=> `${escapeHtml(r.profiles?.name||"מטייל/ת")} (${REGIONS[r.region]||r.region})`).join(", ");
    box.innerHTML = `${uiIcon("eye",14)} ${data.length===1?"חבר/ה אחד/ת מטייל/ת":data.length+" מהחברים שלכם מטיילים"} היום: ${names}`;
    box.classList.remove("hidden");
  }catch(err){ box.classList.add("hidden"); }
}

/* ============ LEADERBOARD ============ */
function renderLbSummary(rows){
  const el = $("lbSummary");
  const myIndex = rows.findIndex(r=>r.id===session.user.id);
  if(myIndex<0 || rows.length<2){ el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  const rank = myIndex+1, total = rows.length;
  const metalIcon = m=>'<span class="milestone-ic" style="color:var(--metal-'+m+')">'+stampGlyph("seal",17)+'</span>';
  let headline;
  if(myIndex===0) headline = `${metalIcon("gold")} את/ה במקום הראשון מתוך ${total}!`;
  else {
    const medal = myIndex===1?metalIcon("silver"):myIndex===2?metalIcon("bronze"):uiIcon("region",16);
    headline = `${medal} את/ה במקום ${rank} מתוך ${total}`;
  }
  let sub = "";
  if(myIndex>0){
    const above = rows[myIndex-1];
    const aboveName = escapeHtml(above.name);
    const gap = above.val - rows[myIndex].val;
    sub = gap>0 ? `${aboveName} מוביל/ה עליך ב-${gap.toLocaleString()} נקודות` : `את/ה צמוד/ה ל${aboveName}!`;
  } else if(rows.length>1){
    sub = `${(rows[0].val-rows[1].val).toLocaleString()} נקודות לפני ${escapeHtml(rows[1].name)}`;
  }
  el.innerHTML = `<div class="lb-summary-head">${headline}</div><div class="lb-summary-sub">${sub}</div><button class="btn btn-primary lb-summary-cta" id="lbFindNext">מצא את היעד הבא</button>`;
  $("lbFindNext").onclick = ()=> navigate("#/map");
}
async function renderBoard(){
  if(!session){ setGuestGate("board", true); return; }
  setGuestGate("board", false);
  const listEl = $("lbList");
  listEl.innerHTML = skeletonRows(5);
  try{
    const friends = await getFriends();
    const ids = Array.from(new Set([...friends.map(f=>f.userId), session.user.id]));
    // Gamification Overhaul - XP מחושב מ-landmark_conquests+xp_bonus_grants (אותו מקור-אמת
    // בדיוק כמו totalXP() העצמי), לא מ-visits.points_awarded - כדי שלא יתערבבו נתונים
    // היסטוריים בסולם-הישן עם נתונים חדשים בסולם-החדש בתוך אותה טבלת-דירוג.
    const [{ data: profs, error: pErr }, { data: conquests, error: cErr }, { data: bonuses, error: bErr }] = await Promise.all([
      supabase.from("profiles").select("id,name,avatar_url").in("id", ids),
      supabase.from("landmark_conquests").select("user_id,landmark_id,xp_awarded,conquered_at").in("user_id", ids),
      supabase.from("xp_bonus_grants").select("user_id,xp_awarded,granted_at").in("user_id", ids),
    ]);
    if(pErr) throw pErr; if(cErr) throw cErr; if(bErr) throw bErr;
    const cutoff = lbPeriod==="week" ? Date.now()-7*86400000 : lbPeriod==="month" ? Date.now()-30*86400000 : 0;
    const totals = {};
    profs.forEach(p=> totals[p.id]=0);
    conquests.forEach(c=>{ if(new Date(c.conquered_at).getTime()>=cutoff) totals[c.user_id]=(totals[c.user_id]||0)+c.xp_awarded; });
    bonuses.forEach(b=>{ if(new Date(b.granted_at).getTime()>=cutoff) totals[b.user_id]=(totals[b.user_id]||0)+b.xp_awarded; });
    // Gamification Overhaul, Phase 7 - יעדים-שנכבשו+אזורים-שהתגלו הם מדדים כלל-זמניים (לא
    // מסוננים לפי lbPeriod כמו ה-XP) - "מי אתה כמטייל" לא אמור להתאפס כל שבוע, בניגוד ל-XP
    // התקופתי. נגזר מאותו conquests שכבר נשלף, בלי שאילתה נוספת.
    const destCount = {}, regionsSet = {};
    profs.forEach(p=>{ destCount[p.id]=0; regionsSet[p.id]=new Set(); });
    conquests.forEach(c=>{
      destCount[c.user_id] = (destCount[c.user_id]||0)+1;
      const region = lmById[c.landmark_id] && lmById[c.landmark_id].region;
      if(region) regionsSet[c.user_id].add(region);
    });
    const rows = profs.map(p=>({ id:p.id, name:p.name, avatarUrl:p.avatar_url, val:totals[p.id]||0, destCount:destCount[p.id]||0, regionCount:regionsSet[p.id].size })).sort((a,b)=>b.val-a.val);
    renderLbSummary(rows);
    const friendsEmptyBanner = (rows.length<=1)
      ? emptyStateHtml({ icon: uiIcon("family",26), title: "המסע מהנה יותר ביחד",
          sub: "הזמינו חברים ותראו מי מכיר את ישראל טוב יותר.", ctaId: "emptyFriendsCta", ctaLabel: "הזמן חברים" })
      : "";
    listEl.innerHTML = friendsEmptyBanner + rows.map((r,i)=>{
      const isMe = r.id===session.user.id;
      const rankClass = i===0?"top1":i===1?"top2":i===2?"top3":"";
      const safeName = escapeHtml(r.name);
      return `<div class="lb-row${isMe?" me":""}"><div class="lb-rank ${rankClass}">${i+1}</div>
        <div class="lb-avatar" style="background:${stringColor(r.name)}">${avatarInner(r.name,r.avatarUrl)}</div>
        <div class="lb-name">${safeName}${isMe?'<small>הדירוג שלך</small>':''}</div>
        <div class="lb-mini-stats"><span>${uiIcon("trophy",12)}<bdi dir="ltr">${r.destCount}</bdi></span><span>${uiIcon("region",12)}<bdi dir="ltr">${r.regionCount}</bdi></span></div>
        <div class="lb-pts">${r.val.toLocaleString()}</div></div>`;
    }).join("");
    if(friendsEmptyBanner) $("emptyFriendsCta").onclick = ()=> $("inviteBtn").click();
  }catch(err){ console.error(err); listEl.innerHTML = errorStateHtml("שגיאה בטעינת הדירוג.", renderBoard); }
}
function stringColor(str){
  const palette = ["#4C7A4A","#3E6E96","#7A5C8C","#B08A3E","#1B7A72","#8C5A3C","#AD8A1E","#5A6572"];
  let h=0; for(let i=0;i<str.length;i++) h = (h*31+str.charCodeAt(i))>>>0;
  return palette[h%palette.length];
}
// תוכן פנימי לעיגול-אווטאר (lb-avatar/avatar) של משתמש אחר - תמונת-פרופיל אם הועלתה, אחרת
// האות הראשונה בשם (ההתנהגות הקיימת). ה-img נראה זהה בכל מקום כי .avatar/.lb-avatar כבר
// מוגדרים ל-overflow:hidden+border-radius:50%.
function avatarInner(name, avatarUrl){
  return avatarUrl ? `<img src="${avatarUrl}" alt="">` : ((name||"א").trim().charAt(0)||"א");
}

/* ============ FEED ============ */
function feedCardHtml(row){
  const l = lmById[row.landmark_id]; if(!l) return "";
  const cat = CATEGORIES[l.category];
  const name = escapeHtml(row.profiles ? row.profiles.name : "מטייל/ת");
  const avatarUrl = row.profiles ? row.profiles.avatar_url : null;
  const likedByMe = row.likes.some(x=>x.user_id===session.user.id);
  const wished = myWishlist.includes(l.id);
  const visited = myVisits.some(v=>v.landmark_id===l.id);
  const bg = row.photo_url ? `background-image:url('${row.photo_url}')` : `background:linear-gradient(135deg,${cat.color},color-mix(in srgb, ${cat.color} 55%, #000 20%))`;
  return `<div class="feed-card">
    <div class="feed-head"><div class="lb-avatar" style="background:${stringColor(name)};width:34px;height:34px;font-size:13.5px;">${avatarInner(name,avatarUrl)}</div>
      <div><div class="feed-name">${name}</div><div class="feed-time">${timeAgo(row.visited_at)} · כבש/ה את ${l.name}</div></div></div>
    <div class="feed-photo" data-goto="${l.id}" role="button" tabindex="0" aria-label="${l.name}" style="${bg}cursor:pointer;">${row.photo_url?"":catIconSvg(cat.icon,52).replace('<svg ','<svg style="color:#fff" ')}<span class="lm-label">${l.name}</span></div>
    ${row.note ? `<div class="feed-note">"${escapeHtml(row.note)}"</div>` : ""}
    <div class="feed-actions">
      <button class="like-btn${likedByMe?" liked":""}" data-id="${row.id}" aria-label="${likedByMe?"בטל לייק":"סמן לייק"}" aria-pressed="${likedByMe}"><svg viewBox="0 0 24 24" fill="${likedByMe?"currentColor":"none"}" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-9.5-9C.7 7.8 2.6 4 6.2 4c2 0 3.5 1.1 4.3 2.4C11.3 5.1 12.8 4 14.8 4c3.6 0 5.5 3.8 3.7 7-2.5 4.6-9.5 9-9.5 9Z"/></svg><span>${row.likes.length}</span></button>
      ${visited ? "" : `<button class="feed-wish-btn${wished?" active":""}" data-lm="${l.id}">${uiIcon("heart",14)}${wished?"ברשימת המשאלות":"הוסף לרשימת המשאלות"}</button>`}
    </div>
  </div>`;
}
function wireFeedCards(listEl, onChange){
  listEl.querySelectorAll(".feed-photo").forEach(el=>{
    el.onclick = ()=> goToDestination(el.dataset.goto);
    el.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); goToDestination(el.dataset.goto); } };
  });
  listEl.querySelectorAll(".feed-wish-btn").forEach(btn=>{
    btn.onclick = async ()=>{
      const lmId = btn.dataset.lm;
      btn.disabled = true;
      if(myWishlist.includes(lmId)){
        const { error } = await supabase.from("wishlist").delete().eq("user_id",session.user.id).eq("landmark_id",lmId);
        if(!error) myWishlist = myWishlist.filter(x=>x!==lmId);
      } else {
        const { error } = await supabase.from("wishlist").insert({ user_id:session.user.id, landmark_id:lmId });
        if(!error) myWishlist.push(lmId);
      }
      onChange(); renderMap();
    };
  });
  listEl.querySelectorAll(".like-btn").forEach(btn=>{
    btn.onclick = async ()=>{
      const visitId = btn.dataset.id;
      const liked = btn.classList.contains("liked");
      btn.disabled = true;
      if(liked) await supabase.from("likes").delete().eq("user_id",session.user.id).eq("visit_id",visitId);
      else await supabase.from("likes").insert({ user_id:session.user.id, visit_id:visitId });
      onChange();
    };
  });
}
function badgeFeedCardHtml(row){
  const name = escapeHtml(row.profiles ? row.profiles.name : "מטייל/ת");
  const avatarUrl = row.profiles ? row.profiles.avatar_url : null;
  const badge = BADGES.find(b=>b.id===row.badge_id);
  if(!badge) return "";
  return `<div class="feed-card badge-feed-card">
    <div class="feed-head"><div class="lb-avatar" style="background:${stringColor(name)};width:34px;height:34px;font-size:13.5px;">${avatarInner(name,avatarUrl)}</div>
      <div><div class="feed-name">${name}</div><div class="feed-time">${timeAgo(row.unlocked_at)} · פתח/ה תג חדש</div></div></div>
    <div class="badge-feed-body"><span class="badge-feed-icon${badgeMetal(badge.id)?" metal-"+badgeMetal(badge.id):""}">${stampGlyph(badgeGlyphName(badge.id),22)}</span><span class="badge-feed-label">${badge.label}</span></div>
  </div>`;
}
async function renderFeed(){
  if(!session){ setGuestGate("board", true); return; }
  setGuestGate("board", false);
  const listEl = $("feedList");
  listEl.innerHTML = skeletonCards(3);
  try{
    let { data, error } = await supabase.from("visits")
      .select("id,visited_at,photo_url,points_awarded,note,landmark_id,user_id,profiles!visits_user_id_fkey(name,avatar_url),likes(user_id)")
      .order("visited_at",{ascending:false}).limit(20);
    if(error && /note/i.test(error.message||"")){
      ({ data, error } = await supabase.from("visits")
        .select("id,visited_at,photo_url,points_awarded,landmark_id,user_id,profiles!visits_user_id_fkey(name,avatar_url),likes(user_id)")
        .order("visited_at",{ascending:false}).limit(20));
    }
    if(error) throw error;
    // user_badges - הרחבה תוספתית לפיד (Round A) - אם עדיין לא רץ ה-migration, נופל בחזרה
    // בחן לפיד-צ'ק-אינים-בלבד הקיים, בלי לשבור כלום.
    let badgeEvents = [];
    try{
      const { data: bdata, error: bErr } = await supabase.from("user_badges")
        .select("id,user_id,badge_id,unlocked_at,profiles!user_badges_user_id_fkey(name,avatar_url)")
        .order("unlocked_at",{ascending:false}).limit(15);
      if(!bErr && bdata) badgeEvents = bdata;
    }catch(e){}
    if(!data.length && !badgeEvents.length){
      listEl.innerHTML = emptyStateHtml({ icon: uiIcon("trophy",26), title: "הפיד עוד ריק",
      sub: "היו הראשונים לכבוש מקום ולספר עליו.", ctaId: "emptyFeedCta", ctaLabel: "גלו מקומות" });
      $("emptyFeedCta").onclick = ()=> navigate("#/map");
      renderChallenge(); renderPersonalChallenges(); return;
    }
    const merged = [
      ...data.map(row=>({type:"checkin", ts:row.visited_at, row})),
      ...badgeEvents.map(row=>({type:"badge", ts:row.unlocked_at, row})),
    ].sort((a,b)=> new Date(b.ts)-new Date(a.ts));
    listEl.innerHTML = merged.map(item=> item.type==="checkin" ? feedCardHtml(item.row) : badgeFeedCardHtml(item.row)).join("");
    wireFeedCards(listEl, renderFeed);
    renderChallenge();
    renderPersonalChallenges();
  }catch(err){ console.error(err); listEl.innerHTML = errorStateHtml("שגיאה בטעינת הפיד.", renderFeed); }
}
async function renderGroupFeed(memberIds){
  const listEl = $("groupFeedList");
  if(!memberIds.length){ listEl.innerHTML = ""; return; }
  listEl.innerHTML = skeletonCards(2);
  try{
    let { data, error } = await supabase.from("visits")
      .select("id,visited_at,photo_url,points_awarded,note,landmark_id,user_id,profiles!visits_user_id_fkey(name,avatar_url),likes(user_id)")
      .in("user_id", memberIds).order("visited_at",{ascending:false}).limit(10);
    if(error && /note/i.test(error.message||"")){
      ({ data, error } = await supabase.from("visits")
        .select("id,visited_at,photo_url,points_awarded,landmark_id,user_id,profiles!visits_user_id_fkey(name,avatar_url),likes(user_id)")
        .in("user_id", memberIds).order("visited_at",{ascending:false}).limit(10));
    }
    if(error) throw error;
    if(!data.length){ listEl.innerHTML = '<div class="empty-state">עדיין אין פעילות בקבוצה. היו הראשונים!</div>'; return; }
    listEl.innerHTML = data.map(feedCardHtml).join("");
    wireFeedCards(listEl, ()=> renderGroupPanel());
  }catch(err){ console.error(err); listEl.innerHTML = ""; }
}
async function renderGroupPanel(){
  if(!session){ setGuestGate("board", true); return; }
  setGuestGate("board", false);
  updateGroupBarVisibility();
  if(!myGroups.length || !activeGroupId) return;
  $("groupMemberStats").innerHTML = skeletonRows(3);
  try{
    const { data: members, error: mErr } = await supabase.from("group_members").select("user_id, profiles(name,avatar_url)").eq("group_id", activeGroupId);
    if(mErr) throw mErr;
    const memberIds = members.map(m=>m.user_id);
    const nameById = Object.fromEntries(members.map(m=>[m.user_id, escapeHtml(m.profiles?.name || "מטייל/ת")]));
    const avatarById = Object.fromEntries(members.map(m=>[m.user_id, m.profiles?.avatar_url || null]));
    const [{ data: visits, error: vErr }, { data: conquests, error: cErr }, { data: bonuses, error: bErr }] = await Promise.all([
      supabase.from("visits").select("user_id,landmark_id,points_awarded,visited_at").in("user_id", memberIds),
      supabase.from("landmark_conquests").select("user_id,xp_awarded").in("user_id", memberIds),
      supabase.from("xp_bonus_grants").select("user_id,xp_awarded").in("user_id", memberIds),
    ]);
    if(vErr) throw vErr; if(cErr) throw cErr; if(bErr) throw bErr;
    const byMember = {};
    memberIds.forEach(id=> byMember[id] = []);
    visits.forEach(v=> byMember[v.user_id].push(v));
    // Gamification Overhaul - XP חברי-הקבוצה, כמו בליברבורד, מגיע מ-landmark_conquests+
    // xp_bonus_grants (לא visits.points_awarded) כדי לא לערבב סולם-ישן/חדש. streak/badges
    // ממשיכים להיגזר מ-visits, שנשאר לוג-ההיסטוריה המלא.
    const xpByMember = {};
    memberIds.forEach(id=> xpByMember[id]=0);
    conquests.forEach(c=> xpByMember[c.user_id]=(xpByMember[c.user_id]||0)+c.xp_awarded);
    bonuses.forEach(b=> xpByMember[b.user_id]=(xpByMember[b.user_id]||0)+b.xp_awarded);

    const statRows = memberIds.map(id=>{
      const vs = byMember[id];
      return { id, name: nameById[id], avatarUrl: avatarById[id], xp: xpByMember[id]||0, streak: streakFromVisits(vs), badgeCount: BADGES.filter(b=>b.current(vs)>=b.target(vs)).length };
    }).sort((a,b)=>b.xp-a.xp);
    $("groupMemberStats").innerHTML = statRows.length ? statRows.map((r,i)=>{
      const isMe = r.id===session.user.id;
      const rankClass = i===0?"top1":i===1?"top2":i===2?"top3":"";
      return `<div class="lb-row${isMe?" me":""}"><div class="lb-rank ${rankClass}">${i+1}</div>
        <div class="lb-avatar" style="background:${stringColor(r.name)}">${avatarInner(r.name,r.avatarUrl)}</div>
        <div class="lb-name">${r.name}${isMe?'<small>אתה/את</small>':''}</div>
        <div class="lb-mini-stats"><span>${uiIcon("flame",12)}<bdi dir="ltr">${r.streak}</bdi></span><span>${stampGlyph("medal",12)}<bdi dir="ltr">${r.badgeCount}</bdi></span></div>
        <div class="lb-pts">${r.xp.toLocaleString()}</div></div>`;
    }).join("") : '<div class="empty-state">אין עדיין נתונים.</div>';

    // §11 - hero משותף: פנים החברים, כמה נכבש יחד, ומה היעד הבא. מחושב מאותם נתונים
    // שכבר נטענו למעלה (members/visits/xpByMember) - בלי שאילתה נוספת.
    const groupName = (myGroups.find(g=>g.id===activeGroupId) || {}).name || "הקבוצה";
    const facePile = statRows.slice(0,5).map(r=>
      `<div class="face" style="background:${stringColor(r.name)}">${avatarInner(r.name, r.avatarUrl)}</div>`).join("")
      + (statRows.length>5 ? `<div class="face more">+${statRows.length-5}</div>` : "");
    const groupXp = statRows.reduce((sum,r)=>sum+r.xp, 0);
    const groupPlaces = new Set(visits.map(v=>v.landmark_id)).size;
    const groupRegions = new Set(visits.map(v=>lmById[v.landmark_id]?.region).filter(Boolean)).size;
    const combinedVisitedIds = new Set(visits.map(v=>v.landmark_id));
    let chosenChallenge = null, chProgress = 0;
    for(const ch of CHALLENGES){
      const matched = [...combinedVisitedIds].filter(id=> lmById[id] && ch.match(lmById[id])).length;
      const current = Math.min(matched, ch.target);
      if(current < ch.target){ chosenChallenge = ch; chProgress = current; break; }
    }
    if(chosenChallenge){
      const pct = Math.round(chProgress/chosenChallenge.target*100);
      $("groupChallengeCard").innerHTML = `<div class="pchallenge-card">
        <div class="pchallenge-head">
          <div class="pchallenge-icon" style="background:${chosenChallenge.color}">${stampGlyph(chosenChallenge.icon,20)}</div>
          <div><div class="pchallenge-title">${chosenChallenge.title}</div><div class="pchallenge-reward">יחד כקבוצה</div></div>
        </div>
        <div class="pchallenge-progress-row"><span>${chProgress} / ${chosenChallenge.target} הושלמו</span><span>${pct}%</span></div>
        <div class="bar"><i style="width:${pct}%;background:${chosenChallenge.color}"></i></div>
      </div>`;
    } else {
      $("groupChallengeCard").innerHTML = emptyStateHtml({ icon: uiIcon("trophy",26), title: "הקבוצה השלימה את כל האתגרים הזמינים!" });
    }

    $("groupHero").innerHTML = `<div class="group-hero">
      <div class="face-pile">${facePile}</div>
      <div class="group-hero-title">${escapeHtml(groupName)}</div>
      <div class="group-hero-sub">${groupPlaces} מקומות נכבשו יחד · ${groupXp.toLocaleString()} נקודות · ${groupRegions} אזורים</div>
      ${chosenChallenge ? `<div class="group-hero-next">${uiIcon("compass",17)}<span>היעד הבא: ${escapeHtml(chosenChallenge.title)} — ${chProgress} מתוך ${chosenChallenge.target}</span></div>` : ""}
    </div>`;

    // רצועת-פעילות קצרה ("שקד כבשה את נחל השופט") מעל פיד-התמונות המלא
    const recentActivity = visits.slice()
      .sort((a,b)=> new Date(b.visited_at) - new Date(a.visited_at)).slice(0,6);
    $("groupActivityStrip").innerHTML = recentActivity.length ? recentActivity.map(v=>{
      const lm = lmById[v.landmark_id];
      const who = nameById[v.user_id] || "מטייל/ת";
      return `<div class="activity-row">
        <div class="activity-avatar" style="background:${stringColor(who)}">${avatarInner(who, avatarById[v.user_id])}</div>
        <div class="activity-text"><b>${who}</b> כבש/ה את ${lm ? escapeHtml(lm.name) : "יעד"}</div>
        <div class="activity-time">${timeAgo(v.visited_at)}</div>
      </div>`;
    }).join("") : emptyStateHtml({ icon: uiIcon("flame",26), title: "עוד לא קרה כלום כאן",
        sub: "הכיבוש הראשון של הקבוצה מחכה לכם." });

    // אותה שפת-חותמות של המסך האישי, רק שה"הושגה" כאן היא "מישהו בקבוצה השיג"
    // והכתובית סופרת כמה חברים - לא תאריך.
    $("groupBadgeGrid").innerHTML = BADGES.map(b=>{
      const count = memberIds.filter(id=> b.current(byMember[id])>=b.target(byMember[id])).length;
      const metal = badgeMetal(b.id);
      return `<div class="stamp${count>0?" is-earned":""}${metal?" metal-"+metal:""}" role="listitem"
        aria-label="${b.label} — ${count} מתוך ${memberIds.length} חברים">
        <div class="stamp-disc"><div class="stamp-face">${stampGlyph(badgeGlyphName(b.id), 26)}</div></div>
        <div class="stamp-label">${b.label}</div>
        <div class="stamp-progress"><bdi dir="ltr">${count} / ${memberIds.length}</bdi></div>
      </div>`;
    }).join("");

    renderVoteBox();
    renderGroupFeed(memberIds);
  }catch(err){
    console.error(err);
    $("groupMemberStats").innerHTML = errorStateHtml("שגיאה בטעינת נתוני הקבוצה.", renderGroupPanel);
  }
}
async function renderVoteBox(){
  const box = $("groupVoteBox");
  if(!activeGroupId) return;
  try{
    const { data, error } = await supabase.from("group_destination_votes").select("landmark_id,user_id").eq("group_id", activeGroupId);
    if(error) throw error;
    const tally = {};
    (data||[]).forEach(v=> tally[v.landmark_id] = (tally[v.landmark_id]||0)+1);
    const top = Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const myVote = (data||[]).find(v=>v.user_id===session.user.id);
    box.innerHTML = `
      <div id="voteResults">${top.length ? top.map(([lmId,count])=>{
        const l = lmById[lmId]; if(!l) return "";
        return `<div class="vote-row${myVote&&myVote.landmark_id===lmId?" mine":""}"><span>${l.name}</span><span class="vote-count">${count} ${count===1?"קול":"קולות"}</span></div>`;
      }).join("") : '<div class="empty-state">אף אחד עוד לא הצביע.</div>'}</div>
      <div class="vote-picker">
        <input class="text-input" id="voteSearch" placeholder="חפשו יעד להצבעה...">
        <div id="voteSearchResults"></div>
      </div>`;
    $("voteSearch").oninput = e=>{
      const q = e.target.value.trim();
      const resultsEl = $("voteSearchResults");
      if(q.length<2){ resultsEl.innerHTML=""; return; }
      const matches = LANDMARKS.filter(l=>l.name.includes(q)).slice(0,5);
      resultsEl.innerHTML = matches.map(l=>`<button type="button" class="vote-option" data-id="${l.id}">${l.name}${myVote&&myVote.landmark_id===l.id?" ✓":""}</button>`).join("");
      resultsEl.querySelectorAll(".vote-option").forEach(btn=> btn.onclick = ()=> castVote(btn.dataset.id));
    };
  }catch(err){ box.innerHTML = ""; }
}
async function castVote(landmarkId){
  try{
    const { error } = await supabase.from("group_destination_votes").upsert({ group_id:activeGroupId, user_id:session.user.id, landmark_id:landmarkId });
    if(error) throw error;
    toast("ההצבעה נשמרה!");
    renderVoteBox();
  }catch(err){ toast("לא ניתן להצביע כרגע"); }
}
const CHALLENGE_SEEN_KEY = "magalim-challenges-seen-v1";
function renderPersonalChallenges(){
  const seen = new Set(JSON.parse(localStorage.getItem(CHALLENGE_SEEN_KEY)||"[]"));
  $("personalChallenges").innerHTML = CHALLENGES.map(ch=>{
    const { current, remaining } = challengeProgress(ch);
    const done = current>=ch.target;
    if(done && !seen.has(ch.id)){
      seen.add(ch.id);
      setTimeout(()=>toast(uiIcon("trophy",15)+" השלמת אתגר: "+ch.title+"!"), 400);
    }
    const pct = Math.round(current/ch.target*100);
    return `<div class="pchallenge-card${done?" done":""}">
      <div class="pchallenge-head">
        <div class="pchallenge-icon" style="background:${ch.color}">${stampGlyph(ch.icon,20)}</div>
        <div><div class="pchallenge-title">${ch.title}</div><div class="pchallenge-reward">${uiIcon("gift",13)} ${ch.reward}</div></div>
      </div>
      <div class="pchallenge-progress-row"><span>${current} / ${ch.target} הושלמו</span><span>${done?uiIcon("check",13)+" הושלם!":pct+"%"}</span></div>
      <div class="bar"><i style="width:${pct}%;background:${ch.color}"></i></div>
      ${done ? "" : `<button class="pchallenge-cta" data-ch="${ch.id}">הצג את ${remaining.length} היעדים שנותרו</button>`}
    </div>`;
  }).join("");
  localStorage.setItem(CHALLENGE_SEEN_KEY, JSON.stringify([...seen]));
  document.querySelectorAll(".pchallenge-cta").forEach(btn=>{
    btn.onclick = ()=>{
      const ch = CHALLENGES.find(c=>c.id===btn.dataset.ch);
      const { remaining } = challengeProgress(ch);
      filters = defaultFilters();
      filters.customIds = new Set(remaining.map(l=>l.id));
      filters.customLabel = ch.title;
      keepMapFraming = true;
      navigate("#/map");
      setTimeout(()=>{
        syncFilterUI(); renderMap();
        if(remaining.length){
          const bounds = L.latLngBounds(remaining.map(l=>[l.lat,l.lon]));
          leafletMap.fitBounds(bounds,{padding:[36,36]});
        }
      },0);
    };
  });
}
function timeAgo(iso){
  const diff = Date.now()-new Date(iso).getTime();
  const mins = Math.floor(diff/60000);
  if(mins<1) return "עכשיו";
  if(mins<60) return "לפני "+mins+" דק'";
  const hrs = Math.floor(mins/60);
  if(hrs<24) return "לפני "+hrs+" שעות";
  const days = Math.floor(hrs/24);
  return days===1?"אתמול":"לפני "+days+" ימים";
}
// App Essentials Phase 0F, Round 1 - מונע XSS מאוחסן: כל טקסט-חופשי שמשתמש הזין (שם/הערה/וכו')
// חייב לעבור דרך זה לפני הזרקה ל-innerHTML, כי הוא עלול להיות מוצג למשתמשים אחרים.
function escapeHtml(str){
  if(str===null || str===undefined) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
async function renderChallenge(){
  try{
    const northIds = LANDMARKS.filter(l=>l.region==="north").map(l=>l.id);
    if(!northIds.length) return;
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
    let { data, error } = await supabase.rpc("get_community_landmark_activity", { p_landmark_ids: northIds, p_since: startOfMonth.toISOString() });
    if(error){
      ({ data } = await supabase.from("visits").select("landmark_id").in("landmark_id",northIds).gte("visited_at", startOfMonth.toISOString()));
    }
    const uniqueLandmarks = new Set((data||[]).map(r=>r.landmark_id)).size;
    const goal = 10;
    $("challengeSub").textContent = `הקהילה כבשה ${uniqueLandmarks} מתוך ${goal} יעדי צפון החודש`;
    $("challengeBar").style.width = Math.min(100, uniqueLandmarks/goal*100)+"%";
  }catch(err){}
}

/* ============ OFFLINE ============ */
function updateOnlineStatus(){
  $("offlineBanner").classList.toggle("show", !navigator.onLine);
}

/* ============ UPDATE CHECK (מזהה כשהדפדפן תקוע על גרסה ישנה בקאש) ============ */
function checkForNewVersion(){
  if(!navigator.onLine) return;
  fetch("./index.html", { cache:"no-store" }).then(r=>r.text()).then(html=>{
    const m = html.match(/app\.js\?v=([\w.-]+)/);
    if(m && m[1]!==APP_VERSION) $("updateBanner").classList.remove("hidden");
  }).catch(()=>{});
}

/* ============ INIT ============ */
/* bootPublic() loads the map/landmarks and shows the app immediately for guests.
   onAuthStateChange (registered above) fires once on subscribe with the current
   session state (logged in or not) and drives bootUserData(), which awaits
   publicBootPromise first so ordering is correct regardless of which resolves first. */
publicBootPromise = bootPublic();
