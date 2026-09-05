import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// גרסת האפליקציה - יש לעדכן יחד עם ה-?v= בתג ה-script ב-index.html בכל דיפלוי, לצורך זיהוי גרסה ישנה בדפדפן
const APP_VERSION = "20260905a8";
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
    ? "אוהבים לטייל עם Magalim? הוסיפו אותה למסך הבית לגישה מהירה."
    : 'אוהבים לטייל עם Magalim? הקישו על שיתוף ⬆️ ואז "הוסף למסך הבית".';
  $("installBannerActionBtn").classList.toggle("hidden", !deferredInstallPrompt);
  el.classList.remove("hidden");
}
window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  deferredInstallPrompt = e;
  maybeShowInstallBanner();
});
window.addEventListener("appinstalled", ()=>{
  deferredInstallPrompt = null;
  try{ localStorage.setItem("magalim-install-dismissed","1"); }catch(e){}
  $("installBanner")?.classList.add("hidden");
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
  { key:"easy", dbValue:"easy", label:"קל", emoji:"🟢", xp:10, color:"var(--success)" },
  { key:"medium", dbValue:"medium", label:"בינוני", emoji:"🔵", xp:20, color:"var(--teal)" },
  { key:"challenging", dbValue:"hard", label:"מאתגר", emoji:"🟠", xp:35, color:"var(--warn)" },
  { key:"hard", dbValue:"extreme", label:"קשה", emoji:"🔴", xp:50, color:"var(--danger)" },
];
const DIFF_TIER_BY_DB = Object.fromEntries(DIFF_TIERS.map(t=>[t.dbValue,t]));
function tierForDb(rawDifficulty){ return DIFF_TIER_BY_DB[rawDifficulty] || DIFF_TIERS[0]; }
// dict בצורת {dbValue:{label}} - לשימוש ב-buildChips/צ'יפים ידניים שממפתחים data-id=dbValue
// (מסנן/wizard/העדפות) בלי לשבור את ה-id הגולמי שנשלח ל-filters/DB - רק התווית משתנה.
const DIFF_CHIPS_DICT = Object.fromEntries(DIFF_TIERS.map(t=>[t.dbValue,{label:t.emoji+" "+t.label}]));
// שם-אזור בצורת "עם ה' הידיעה" לתגי חוקר/מומחה (חלק מהאזורים שמות פרטיים - ירושלים/אילת/ים
// המלח - לא לוקחים ה' הידיעה בעברית, אז אי אפשר פשוט לשרשר "ה"+שם לכל האזורים).
const REGION_THE = { north:"הצפון", center:"המרכז", jerusalem:"ירושלים", south:"הדרום", deadsea:"ים המלח", eilat:"אילת" };
// מרחיבים את מערכת ה-BADGES הקיימת (לא בונים מנגנון נפרד) - 3 דרגות × 6 אזורים, לפי אחוז
// מגילוי האזור (לא מספר קבוע) כי גודל האזורים שונה מאוד זה מזה.
function regionTierBadges(){
  const tiers = [
    { suffix:"bronze", pct:0.25, icon:"🥉", label:r=>"מתחיל ב"+REGIONS[r] },
    { suffix:"silver", pct:0.6, icon:"🥈", label:r=>"חוקר "+REGION_THE[r] },
    { suffix:"gold", pct:1, icon:"🥇", label:r=>"מומחה "+REGION_THE[r] },
  ];
  const out = [];
  Object.keys(REGIONS).forEach(r=>{
    tiers.forEach(t=>{
      out.push({
        id:"region_"+r+"_"+t.suffix, label:t.label(r), icon:t.icon,
        target:()=> Math.max(1, Math.ceil(regionCount(r)*t.pct)),
        current:v=> Math.min(regionVisited(v,r), Math.max(1, Math.ceil(regionCount(r)*t.pct))),
      });
    });
  });
  return out;
}
const BADGES = [
  {id:"first",label:"צעד ראשון",icon:"👣",target:()=>1,current:v=>Math.min(v.length,1)},
  {id:"milestone3",label:"3 יעדים",icon:"🔰",target:()=>3,current:v=>Math.min(v.length,3)},
  {id:"seven",label:"צועד השבעה",icon:"🥾",target:()=>7,current:v=>Math.min(v.length,7)},
  {id:"milestone10",label:"10 יעדים",icon:"🏅",target:()=>10,current:v=>Math.min(v.length,10)},
  {id:"milestone25",label:"25 יעדים",icon:"🥇",target:()=>25,current:v=>Math.min(v.length,25)},
  {id:"milestone50",label:"50 יעדים",icon:"💎",target:()=>50,current:v=>Math.min(v.length,50)},
  {id:"region1",label:"כובש אזור ראשון",icon:"🏁",target:v=>bestRegionProgress(v).total,current:v=>bestRegionProgress(v).done},
  {id:"water5",label:"כובש נחלים",icon:"💧",target:()=>5,current:v=>Math.min(countCat(v,"water"),5)},
  {id:"hist5",label:"היסטוריון",icon:"🏺",target:()=>5,current:v=>Math.min(countCat(v,"archaeology")+countCat(v,"heritage"),5)},
  {id:"north",label:"אלוף הצפון",icon:"🧭",target:()=>Math.min(15,regionCount("north")),current:v=>Math.min(regionVisited(v,"north"),15)},
  {id:"desert",label:"רץ המדבר",icon:"🏜️",target:()=>Math.min(10,regionCount("south")+regionCount("eilat")),current:v=>Math.min(regionVisited(v,"south")+regionVisited(v,"eilat"),10)},
  {id:"extreme",label:"מטפס ותיק",icon:"⛰️",target:()=>2,current:v=>Math.min(countDiff(v,"extreme"),2)},
  {id:"all",label:"כל הארץ",icon:"🏆",target:()=>LANDMARKS.length||259,current:v=>v.length},
  ...regionTierBadges(),
];
// אוספים קיוריטד - כמו BADGES, כל אחד הוא פילטר על LANDMARKS הקיימים (לא רשימת-ID ידנית).
const COLLECTIONS = [
  { id:"water", label:"צייד המים", icon:"💦", description:"נחלים, מעיינות ובריכות טבעיות בכל רחבי הארץ.", filter:l=> l.category==="water"||l.hasWater },
  { id:"heritage", label:"עתיקות ומורשת", icon:"🏛️", description:"אתרי ארכיאולוגיה ומורשת שמספרים את סיפור הארץ.", filter:l=> l.category==="archaeology"||l.category==="heritage" },
  { id:"mountains", label:"מסלולי הרים", icon:"⛰️", description:"מסלולי הרים וטיפוס לעבר הפסגות הכי מרשימות בישראל.", filter:l=> l.category==="mountains" },
  { id:"nature", label:"טבע ונופים", icon:"🌿", description:"נופים פתוחים וטבע ירוק לאורך ולרוחב הארץ.", filter:l=> l.category==="nature" },
  { id:"desertsea", label:"מדבר וים המלח", icon:"🏜️", description:"מדבר יהודה, הנגב, הערבה וים המלח.", filter:l=> l.region==="south"||l.region==="deadsea"||l.region==="eilat" },
  { id:"reserves", label:"שמורות ופארקים לאומיים", icon:"🌲", description:"שמורות טבע ופארקים לאומיים מוגנים.", filter:l=> l.category==="reserves"||l.category==="parks" },
  { id:"family", label:"מושלם למשפחות", icon:"👪", description:"יעדים שמתאימים לטיול עם ילדים.", filter:l=> !!l.familyFriendly },
  { id:"accessible", label:"פתוח לכולם", icon:"♿", description:"יעדים נגישים לכיסא גלגלים ולעגלות.", filter:l=> !!l.accessible },
];
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
  {id:"icons25", title:"25 המקומות שכל ישראלי חייב לראות", icon:"🏆", color:"var(--cat-heritage)", target:25, match:l=>!l.id.startsWith("tiuli-"), reward:"תג ייחודי בפרופיל"},
  {id:"water10", title:"אתגר המים — 10 יעדי מים", icon:"💧", color:"var(--cat-water)", target:10, match:l=>l.category==="water"||l.hasWater, reward:"תג ייחודי בפרופיל"},
  {id:"jlm8", title:"שבילי ירושלים", icon:"🕍", color:"var(--cat-religious)", target:8, match:l=>l.region==="jerusalem", reward:"תג ייחודי בפרופיל"},
  {id:"desert6", title:"חודש במדבר", icon:"🏜️", color:"var(--cat-mountains)", target:6, match:l=>["south","eilat","deadsea"].includes(l.region), reward:"תג ייחודי בפרופיל"},
  {id:"peaks10", title:"כובשי הפסגות — 10 מסלולי הרים", icon:"🏔️", color:"var(--cat-mountains)", target:10, match:l=>l.category==="mountains", reward:"תג ייחודי בפרופיל"},
  {id:"reserves8", title:"שומרי הטבע — 8 שמורות", icon:"🌿", color:"var(--cat-reserves)", target:8, match:l=>l.category==="reserves", reward:"תג ייחודי בפרופיל"},
  {id:"center12", title:"גלו את המרכז — 12 יעדים", icon:"🏙️", color:"var(--cat-urban)", target:12, match:l=>l.region==="center", reward:"תג ייחודי בפרופיל"},
];
function challengeProgress(ch){
  const matched = myVisits.filter(v=> lmById[v.landmark_id] && ch.match(lmById[v.landmark_id]));
  return { current: Math.min(matched.length, ch.target), remaining: LANDMARKS.filter(l=>ch.match(l) && !myVisits.some(v=>v.landmark_id===l.id)) };
}
// Gamification Overhaul - עקומת 20-הרמות + 4 פונקציות-utility בשם מדויק לפי המפרט. מקור-אמת
// יחיד לכל מערכת-הרמות באפליקציה (מחליף את עקומת-6-הרמות הישנה ואת totalPoints(), שהוסרו).
const LEVELS_V2 = [
  { min:0, name:"יוצאים לדרך", icon:"🌱" },
  { min:50, name:"מתחילים לטייל", icon:"🎒" },
  { min:120, name:"צועדים קדימה", icon:"👣" },
  { min:220, name:"מגלי שבילים", icon:"🧭" },
  { min:350, name:"מטיילים מנוסים", icon:"🥾" },
  { min:520, name:"חוקרי טבע", icon:"🌿" },
  { min:730, name:"מגלי הארץ", icon:"🗺️" },
  { min:980, name:"כובשי שבילים", icon:"⛰️" },
  { min:1270, name:"חוקרי מרחבים", icon:"🦅" },
  { min:1600, name:"מטיילי ישראל", icon:"🇮🇱" },
  { min:1980, name:"מומחי שבילים", icon:"🧭" },
  { min:2410, name:"רודפי נופים", icon:"🌄" },
  { min:2890, name:"חוקרי ישראל", icon:"🗺️" },
  { min:3420, name:"ותיקי השבילים", icon:"🥾" },
  { min:4000, name:"אדוני השטח", icon:"⛰️" },
  { min:4640, name:"מגלי אופקים", icon:"🦅" },
  { min:5340, name:"מומחי הארץ", icon:"🇮🇱" },
  { min:6100, name:"אלופי השבילים", icon:"🏆" },
  { min:6920, name:"אגדות מטיילות", icon:"👑" },
  { min:7800, name:"אגדת ישראל", icon:"⭐" },
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
let userLoc = null;
function defaultFilters(){ return { cats:[], diffs:[], regions:[], maxDist:400, duration:null, season:null, family:false, dog:false, water:false, accessible:false, free:false, customIds:null, customLabel:null }; }
let filters = defaultFilters();
let prevBadgeSet = new Set();
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
  }catch(e){
    el.textContent = "לא ניתן לבדוק את מצב ההרשאה בדפדפן הזה.";
    el.style.color = "var(--text-muted)";
  }
}
let retryHandlers = {}, retryHandlerSeq = 0;
function errorStateHtml(message, retryFn){
  const id = "r"+(retryHandlerSeq++);
  retryHandlers[id] = retryFn;
  return `<div class="empty-state">${message}<br><button class="btn btn-outline empty-cta" data-retry="${id}" type="button">🔄 נסה שוב</button></div>`;
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
// steps: [{photoUrl, emoji, title, xp, sub, region, confetti}] - מוצגים ברצף אחד, קליק מקדם/סוגר.
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
    const hero = s.photoUrl
      ? `<div class="celebrate-hero"><img src="${s.photoUrl}" alt=""></div>`
      : s.emoji ? `<div class="celebrate-emoji">${s.emoji}</div>` : "";
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
  btn.onclick = (e)=>{ e.stopPropagation(); openWazeNavigation(l.lat, l.lon, l.name); };
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
$("tabLogin").onclick = ()=>{ authMode="login"; $("tabLogin").classList.add("active"); $("tabSignup").classList.remove("active"); $("nameField").classList.add("hidden"); $("authSubmit").textContent="התחברות"; $("authError").classList.remove("show"); $("authNote").classList.remove("show"); $("forgotPasswordLink").classList.remove("hidden"); showAuthTabs(); };
$("tabSignup").onclick = async ()=>{
  authMode="signup"; $("tabSignup").classList.add("active"); $("tabLogin").classList.remove("active"); $("nameField").classList.remove("hidden"); $("authSubmit").textContent="הרשמה"; $("authError").classList.remove("show"); $("authNote").classList.remove("show"); $("forgotPasswordLink").classList.add("hidden");
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
  document.querySelector(".auth-tabs").classList.add("hidden");
  $("oauthRow").classList.add("hidden");
  $("oauthDivider").classList.add("hidden");
  $("authForm").classList.add("hidden");
  $("resetPasswordForm").classList.add("hidden");
  const copy = WAITLIST_COPY[reason] || WAITLIST_COPY.full;
  $("waitlistTitle").textContent = copy.title;
  $("waitlistSub").textContent = copy.sub;
  $("waitlistError").classList.remove("show");
  $("waitlistNote").classList.remove("show");
  $("waitlistView").classList.remove("hidden");
}
function showAuthTabs(){
  document.querySelector(".auth-tabs").classList.remove("hidden");
  $("oauthRow").classList.remove("hidden");
  $("oauthDivider").classList.remove("hidden");
  $("waitlistView").classList.add("hidden");
  $("resetPasswordForm").classList.add("hidden");
  $("authForm").classList.remove("hidden");
}
async function signInWithOAuth(provider){
  $("authError").classList.remove("show");
  const { error } = await supabase.auth.signInWithOAuth({ provider, options:{ redirectTo: location.origin + location.pathname } });
  if(error){
    $("authError").textContent = friendlyAuthError(error.message);
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
  $("authError").classList.remove("show");
  $("authNote").classList.remove("show");
  $("authSubmit").disabled = true;
  try{
    if(authMode==="signup"){
      const pendingCode = sessionStorage.getItem("pendingInviteCode");
      const meta = { name: name || "מטייל/ת חדש/ה" };
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
    $("authSubmit").disabled = false;
  }
});

$("signOutBtn").onclick = async ()=>{ await supabase.auth.signOut(); };
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
  $("authIntroText").textContent = message || "הצטרפו וצאו לכבוש את הארץ";
  $("authCloseBtn").classList.remove("hidden");
  $("authScreen").classList.remove("hidden");
  showAuthTabs();
  if(!authSheetHistoryPushed){
    authSheetHistoryPushed = true;
    history.pushState({magalimAuthSheet:true}, "", location.hash || "#/map");
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
    document.querySelector(".auth-tabs").classList.add("hidden");
    $("oauthRow").classList.add("hidden");
    $("oauthDivider").classList.add("hidden");
    $("authForm").classList.add("hidden");
    $("resetPasswordForm").classList.remove("hidden");
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
  });
});

/* ============ ROUTER (lightweight hash-based) ============ */
let navStack = [];
function navigate(hash, push){
  if(push===undefined) push = true;
  if(push){ navStack.push(location.hash || "#/map"); history.pushState({magalim:true}, "", hash); }
  else history.replaceState({magalim:true}, "", hash);
  applyRoute();
}
function goBack(){ navigate(navStack.pop() || "#/map", false); }
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

function switchView(view){
  if(view==="feed"){ view = "board"; boardTab = "feed"; }
  if(!["map","board","profile"].includes(view)) view = "map";
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  $("view-"+view).classList.add("active");
  if(view==="map") setTimeout(()=>{ if(leafletMap) leafletMap.invalidateSize(); renderMap(); },0);
  if(view==="board") switchBoardTab(boardTab);
  if(view==="profile") renderProfile();
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
function renderAchievementsPanel(){
  if(!session) return;
  const ub = unlockedBadges();
  $("badgeGrid").innerHTML = BADGES.map(b=>{
    const on = ub.some(u=>u.id===b.id);
    const cur = b.current(myVisits), tgt = b.target(myVisits);
    const progressLine = on ? "" : `<div class="badge-progress">${cur}/${tgt}</div>`;
    return `<div class="badge${on?" unlocked":""}"><div class="circ">${b.icon}</div><div class="lbl">${b.label}</div>${progressLine}</div>`;
  }).join("");
  renderCollections();
}
const SIMPLE_OVERLAY_ROUTES = { "#/about":"aboutScreen", "#/terms":"termsScreen", "#/privacy-policy":"privacyPolicyScreen", "#/help":"helpScreen", "#/notifications":"notificationsScreen" };
const SIMPLE_OVERLAY_IDS = Object.values(SIMPLE_OVERLAY_ROUTES);
function applyRoute(){
  if(!booted) return;
  const hash = location.hash || "#/map";
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
  const view = hash.replace(/^#\//,"").split("/")[0] || "map";
  switchView(view);
}

/* ============ BOOT / DATA LOAD ============ */
let booted = false, publicBootPromise = null;
async function bootPublic(){
  try{
    const { data: lms, error: lmErr } = await supabase.from("landmarks").select("*").order("name");
    if(lmErr) throw lmErr;
    LANDMARKS = lms.map(l=>({ id:l.id, name:l.name, desc:l.description, category:l.category, difficulty:l.difficulty, region:l.region, lat:l.lat, lon:l.lon, duration:l.duration, distanceKm:l.distance_km, points:l.points, baseVisits:l.base_visits,
      familyFriendly:!!l.family_friendly, dogFriendly:!!l.dog_friendly, accessible:!!l.accessible, hasWater:!!l.has_water, priceType:l.price_type||"free", season:l.season||null, durationHours:l.duration_hours!=null?Number(l.duration_hours):null,
      officialUrl:l.official_url||null, stockPhotoUrl:l.stock_photo_url||null, stockPhotoCredit:l.stock_photo_credit||null }));
    lmById = Object.fromEntries(LANDMARKS.map(l=>[l.id,l]));
    await loadVisitCounts();
    loadLandmarkPhotos().then(()=>{
      renderMap();
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
    $("view-map").classList.add("active");
    wireStaticUI();
    subscribeRealtime();
    booted = true;
    syncFilterUI();
    updateOnlineStatus();
    refreshHeader();
    applyRoute();
    initOnboarding();
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
    refreshHeader(); renderMap(); renderProfile(); renderBoard(); renderFeed(); renderGroupPanel(); renderFriendsTravelBanner();
    return;
  }
  try{
    await loadMyProfile();
    await Promise.all([ loadMyVisits(), loadMyWishlist(), loadFollowing(), loadMyGroups(), loadMyTravelStatus(), loadMyConquestsAndBonuses() ]);
    prevBadgeSet = new Set(unlockedBadges().map(b=>b.id));
    flushPendingQueue();
    await handleInviteLinks();
    updateGroupBarVisibility();
    refreshHeader();
    renderMap(); renderProfile(); renderBoard(); renderFeed(); renderGroupPanel(); renderFriendsTravelBanner();
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
    const name = session.user.user_metadata?.name || "מטייל/ת חדש/ה";
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
  const { data, error } = await supabase.from("group_members").select("group_id, groups(id,name)").eq("user_id", session.user.id);
  if(error){ console.warn("groups feature unavailable:", error.message); myGroups = []; return; }
  myGroups = data.filter(r=>r.groups).map(r=>({ id:r.groups.id, name:r.groups.name }));
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
  myGroups.push({ id:data.id, name:data.name });
  activeGroupId = data.id;
  populateGroupSelect(); updateGroupBarVisibility();
  toast('הקבוצה "'+escapeHtml(data.name)+'" נוצרה!');
  renderGroupPanel();
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
  $("inviteBody").innerHTML = `
    <div style="font-size:38px;margin:10px 0 8px;">✉️</div>
    <h2 style="margin:0 0 6px;font-size:19px;">${escapeHtml(data.inviter_name||'מטייל/ת')} הזמינ/ה אותך</h2>
    <p style="color:var(--text-muted);font-size:13.5px;margin:0 0 20px;">${actionText}</p>
    <button class="btn btn-primary btn-block" id="inviteAcceptBtn">אישור ההזמנה</button>
    <button class="btn btn-ghost btn-block" id="inviteDismissBtn" style="margin-top:8px;">לא עכשיו</button>
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
    eventStatsEl.innerHTML = '<div class="empty-state" style="font-size:12.5px;">אין עדיין נתוני אירועים (יתכן שהתכונה עדיין לא מופעלת).</div>';
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
let leafletMap = null, clusterGroup = null, userLocMarker = null;

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
  parts.push(tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label);
  if(l.category==="water"||l.hasWater) parts.push("יש מים");
  if(l.accessible) parts.push("♿ נגיש");
  if(l.priceType==="free") parts.push("🆓 חינם");
  parts.push("מתאים ל"+(l.duration||DURATION_LABEL[wizState.duration]||""));
  return parts.join(" · ");
}
function getRecommendedDestination(){
  if(!session || !myVisits.length) return null;
  const visitedIds = new Set(myVisits.map(v=>v.landmark_id));
  const visitedLandmarks = myVisits.map(v=>lmById[v.landmark_id]).filter(Boolean);
  if(!visitedLandmarks.length) return null;
  const diffCounts = {};
  visitedLandmarks.forEach(l=>{ diffCounts[l.difficulty] = (diffCounts[l.difficulty]||0)+1; });
  const preferredDiff = Object.keys(diffCounts).sort((a,b)=>diffCounts[b]-diffCounts[a])[0] || null;
  const waterShare = visitedLandmarks.filter(l=>l.category==="water"||l.hasWater).length/visitedLandmarks.length;
  const familyShare = visitedLandmarks.filter(l=>l.familyFriendly).length/visitedLandmarks.length;
  const candidates = LANDMARKS.filter(l=>!visitedIds.has(l.id));
  if(!candidates.length) return null;
  let best = null, bestScore = -Infinity;
  candidates.forEach(l=>{
    let score = 0;
    const reasons = [];
    if(userLoc){
      const km = haversine(userLoc.lat,userLoc.lon,l.lat,l.lon);
      score += Math.max(0, 30-km);
      if(km<30) reasons.push(km<1 ? "ממש לידך" : "כ-"+estimateDriveMinutes(km)+" דק' נסיעה ממך");
    }
    if(preferredDiff && l.difficulty===preferredDiff){ score += 18; reasons.push("ברמת הקושי שאתם הכי אוהבים"); }
    if(waterShare>0.4 && (l.category==="water"||l.hasWater)){ score += 14; reasons.push("יש שם מים, בדיוק כמו שאתם אוהבים"); }
    if(familyShare>0.5 && l.familyFriendly){ score += 12; reasons.push("מתאים למשפחה"); }
    const pct = regionDiscoveryPct(l.region);
    if(pct<0.3){ score += 10; reasons.push("אזור שכמעט לא גיליתם"); }
    score += Math.random()*4;
    if(score>bestScore){ bestScore = score; best = { l, reasons }; }
  });
  if(!best) return null;
  return { landmark: best.l, reason: best.reasons.slice(0,2).join(" · ") || tierForDb(best.l.difficulty).label };
}
function wizIntroWhyText(l){
  const parts = [tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label];
  if(l.category==="water"||l.hasWater) parts.push("יש מים");
  if(l.accessible) parts.push("♿ נגיש");
  if(l.priceType==="free") parts.push("🆓 חינם");
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
    <p class="wiz-intro-greet">👋 לאן ממשיכים?</p>
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
    $("wizResults").innerHTML = '<div class="empty-state"><div class="big">🤔</div>לא מצאנו טיול שמתאים לכל הקריטריונים.<br>נסו להרחיב את המרחק או לשחרר קריטריון.</div>';
    return;
  }
  let note = "";
  if(relaxed.length){
    const labels = { water:"מים", duration:"משך הזמן", difficulty:"רמת הקושי", accessible:"נגישות", free:"חינם" };
    note = `<div class="wiz-relaxed-note">לא מצאנו התאמה מלאה, אז הרחבנו את החיפוש (בלי דרישת ${relaxed.map(r=>labels[r]).join(", ")})</div>`;
  }
  const scored = results.map(l=>({ l, pct: wizMatchScore(l) }));
  const tagLabels = assignWizLabels(scored);
  $("wizResults").innerHTML = `<h3 style="margin:4px 0 12px;">מצאנו לך ${results.length} טיולים להיום 🎉</h3>${note}` +
    scored.map((s,i)=>{
      const l = s.l;
      const cat = CATEGORIES[l.category];
      const tag = tagLabels[i] ? `<div class="wiz-match-tag">${tagLabels[i]}</div>` : "";
      const pctChip = s.pct!=null ? `<div class="wiz-match-pct">${s.pct}% התאמה</div>` : "";
      return `<div class="mini-card wiz-result-card" data-id="${l.id}" role="button" tabindex="0" aria-label="${l.name}">
        <div class="mini-thumb" style="background:${cat.color};color:#fff">${catIconSvg(cat.icon,24)}</div>
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
  labels[bestIdx] = "🎯 הכי מתאים";
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
    if(closestIdx>=0) labels[closestIdx] = "📍 הכי קרוב";
    let adventureIdx = -1, maxPts = -1;
    scored.forEach((s,i)=>{
      if(labels[i]) return;
      const pts = tierForDb(s.l.difficulty).xp;
      if(pts>maxPts){ maxPts=pts; adventureIdx=i; }
    });
    if(adventureIdx>=0) labels[adventureIdx] = "🧭 יותר הרפתקני";
  }
  return labels;
}

let israelBounds = null;
function initLeafletMap(){
  leafletMap = L.map("mapSvg", { zoomControl:false, attributionControl:true, minZoom:6, maxZoom:17 })
    .setView(ISRAEL_CENTER, DEFAULT_ZOOM);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(leafletMap);
  clusterGroup = L.markerClusterGroup({ maxClusterRadius:55, spiderfyOnMaxZoom:true, showCoverageOnHover:false });
  leafletMap.addLayer(clusterGroup);
  leafletMap.on("click", closePreview);
  let moveDebounce = null;
  leafletMap.on("moveend", ()=>{ clearTimeout(moveDebounce); moveDebounce = setTimeout(renderDiscoveryCarousel, 150); });
  if(LANDMARKS.length){
    israelBounds = L.latLngBounds(LANDMARKS.map(l=>[l.lat,l.lon]));
    leafletMap.fitBounds(israelBounds, { padding:[28,28] });
  }
  renderFogOfWar();
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
    : '<div style="background:linear-gradient(135deg, '+cat.color+', color-mix(in srgb, '+cat.color+' 60%, #000 15%));display:flex;align-items:center;justify-content:center;">'+catIconSvg(cat.icon,34).replace('<svg ','<svg style="color:#fff" ')+'</div>';
  $("destPreviewName").textContent = l.name;
  const distText = userLoc ? Math.round(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))+' ק"מ ממך · ' : "";
  $("destPreviewFacts").textContent = distText+tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label+(l.duration?" · "+l.duration:"");
  $("destPreviewWish").textContent = wished ? "❤️" : "🤍";
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
  if(userLoc){
    if(userLocMarker) leafletMap.removeLayer(userLocMarker);
    userLocMarker = L.circleMarker([userLoc.lat,userLoc.lon], { radius:8, color:"#fff", weight:2.5, fillColor:"#146F67", fillOpacity:1 }).addTo(leafletMap);
  }
  renderFogOfWar();
  renderDiscoveryCarousel();
}

function renderDiscoveryCarousel(){
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
  if(!list.length){
    el.innerHTML = '<div class="discovery-empty">אין יעדים באזור המוצג — נסו לזוז במפה או לרענן את הסינון.</div>';
    return;
  }
  el.innerHTML = list.map(l=>{
    const cat = CATEGORIES[l.category];
    const photoUrl = landmarkPhotos[l.id];
    const thumb = photoUrl
      ? '<img src="'+photoUrl+'" loading="lazy" decoding="async" alt="'+l.name+'">'
      : '<div style="background:linear-gradient(135deg, '+cat.color+', color-mix(in srgb, '+cat.color+' 60%, #000 15%));">'+catIconSvg(cat.icon,20).replace('<svg ','<svg style="color:#fff" ')+'</div>';
    return '<div class="discovery-card" data-id="'+l.id+'" role="button" tabindex="0" aria-label="'+l.name+'">'
      + '<div class="discovery-card-thumb">'+thumb+'</div>'
      + '<div class="discovery-card-name">'+l.name+'</div>'
      + '<div class="discovery-card-facts">'+tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label+(l.duration?" · "+l.duration:"")+'</div>'
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
        <div class="lm-stat"><div class="v">${tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label}</div><div class="l">קושי</div></div>
        ${l.duration ? `<div class="lm-stat"><div class="v">${l.duration}</div><div class="l">זמן משוער</div></div>` : ""}
        ${l.distanceKm!=null ? `<div class="lm-stat"><div class="v">${l.distanceKm} ק"מ</div><div class="l">הליכה</div></div>` : ""}
        <div class="lm-stat"><div class="v">${panelConquest ? "✓ "+panelConquest.xp_awarded.toLocaleString() : "+"+tierForDb(l.difficulty).xp}</div><div class="l">${panelConquest ? "נכבש" : "נקודות"}</div></div>
      </div>
      <p class="lm-desc">${l.desc}</p>
      <div class="lm-actions">
        <button class="icon-btn waze-btn" id="panelWazeBtn"></button>
        <button class="btn btn-outline" id="panelWishBtn">${wished?"❤️ ברשימת המשאלות":"🤍 רוצה להגיע"}</button>
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
      const cat = CATEGORIES[l.category];
      const photoUrl = landmarkPhotos[l.id];
      const thumb = photoUrl ? '<img src="'+photoUrl+'" loading="lazy" decoding="async" alt="'+l.name+'">' : catIconSvg(cat.icon,24);
      return '<div class="mini-card" data-id="'+l.id+'" role="button" tabindex="0" aria-label="'+l.name+'"><div class="mini-thumb" style="background:'+cat.color+';color:#fff">'+thumb+'</div>'
        + '<div class="mini-info"><div class="name">'+l.name+'</div><div class="sub">'+tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label+(l.duration?" · "+l.duration:"")+'</div></div></div>';
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
  initLeafletMap();
  $("onboardingSkip").onclick = closeOnboarding;
  $("onboardingNext").onclick = ()=>{
    if(onboardingStep<2){ onboardingStep++; updateOnboardingStep(); } else { closeOnboarding(); }
  };
  $("zoomIn").onclick=()=> leafletMap.zoomIn();
  $("zoomOut").onclick=()=> leafletMap.zoomOut();
  $("zoomReset").onclick=()=> israelBounds ? leafletMap.fitBounds(israelBounds,{padding:[28,28]}) : leafletMap.setView(ISRAEL_CENTER, DEFAULT_ZOOM);
  // Gamification Overhaul, Phase 4 - מקרא-קושי: תוכן סטטי מ-DIFF_TIERS (טקסט+אימוג'י-צבעוני,
  // לא צבע-בלבד), נבנה פעם אחת. נסגר אוטומטית עם closePreview (אותה קריאה שכבר קיימת על
  // לחיצה על המפה) כדי לא להישאר פתוח ולחסום תוך כדי שימוש רגיל במפה.
  $("diffLegendPopover").innerHTML = DIFF_TIERS.map(t=>
    `<div class="diff-legend-row">${t.emoji} ${t.label}</div>`
  ).join("");
  $("diffLegendBtn").onclick = (e)=>{
    e.stopPropagation();
    const open = $("diffLegendPopover").classList.toggle("hidden")===false;
    $("diffLegendBtn").setAttribute("aria-expanded", String(open));
  };
  $("locateBtn").onclick=()=>{
    if(!navigator.geolocation){ toast("המכשיר לא תומך באיתור מיקום"); return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      userLoc = {lat:pos.coords.latitude, lon:pos.coords.longitude};
      $("distHint").textContent = "המיקום שלך אותר — ניתן לסנן לפי מרחק נסיעה";
      syncFilterUI(); renderMap();
      const count = filteredLandmarks().length;
      toast(filters.maxDist<400 ? `נמצאו ${count} יעדים במרחק נסיעה של עד ${estimateDriveMinutes(filters.maxDist)} דק'` : "המיקום אותר בהצלחה");
      leafletMap.setView([userLoc.lat, userLoc.lon], 12);
    }, ()=> toast("לא הצלחנו לאתר מיקום — יש לאשר גישה למיקום בדפדפן"), {enableHighAccuracy:true, timeout:8000});
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
      $("destPreviewWish").textContent = justAdded ? "❤️" : "🤍";
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
  wireBooleanChips("amenityChips", { family:"family", dog:"dog", water:"water", accessible:"accessible", free:"free" });
  document.querySelectorAll("#quickChipRow .quick-chip").forEach(chip=>{
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
    };
  });
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
    $("wizLocStatus").innerHTML = '<span class="ic">📡</span> מאתר מיקום...';
    navigator.geolocation.getCurrentPosition(pos=>{
      wizState.loc = { lat:pos.coords.latitude, lon:pos.coords.longitude };
      userLoc = wizState.loc;
      $("wizLocStatus").className = "checkin-status ok";
      $("wizLocStatus").innerHTML = '<span class="ic">✓</span> המיקום אותר בהצלחה';
    }, ()=>{
      $("wizLocStatus").className = "checkin-status bad";
      $("wizLocStatus").innerHTML = '<span class="ic">✕</span> לא הצלחנו לאתר מיקום — עדיין אפשר לחפש בלי זה';
    }, {enableHighAccuracy:true, timeout:8000});
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
    renderBlockedUsers();
    renderLocationPermStatus();
    const av = (myProfile && myProfile.activity_visibility) || "friends_groups";
    document.querySelectorAll("#activityVisibilitySeg button").forEach(b=> b.classList.toggle("active", b.dataset.val===av));
    const np = (myProfile && myProfile.notification_prefs) || { enabled:true, friends:true, groups:true };
    $("notifEnabledToggle").checked = np.enabled!==false;
    $("notifFriendsToggle").checked = np.friends!==false;
    $("notifGroupsToggle").checked = np.groups!==false;
    $("notifCategoryToggles").classList.toggle("hidden", np.enabled===false);
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
  $("closeSettingsSheet").onclick = ()=> closeSheet("settingsSheet","settingsScrim");
  $("settingsScrim").onclick = ()=> closeSheet("settingsSheet","settingsScrim");
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
  document.querySelectorAll(".tab-row [data-list]").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".tab-row [data-list]").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active"); profileListTab = btn.dataset.list; renderProfile();
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
  $("notifBellBtn").onclick = ()=> navigate("#/notifications");
  $("notificationsCloseBtn").onclick = goBack;
  $("openSearchBtn").onclick = openSearchSheet;
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
    $("periodSeg").querySelectorAll("button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); lbPeriod=b.dataset.period; renderBoard();
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
    shareLink(url, "מגלים את ישראל", "בוא/י תצטרף/י אליי לכבוש יעדים בישראל באפליקציית מגלים את ישראל!");
  };
  $("groupSelect").onchange = e=>{ activeGroupId = e.target.value; renderGroupPanel(); };
  $("groupNewBtn").onclick = createGroup;
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
    shareLink(url, "מגלים את ישראל", `הצטרפ/י לקבוצה "${g?g.name:''}" באפליקציית מגלים את ישראל!`);
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
  document.querySelectorAll("#quickChipRow .quick-chip").forEach(chip=>{
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
(function wireSheetSwipeToClose(){
  let drag = null;
  document.addEventListener("touchstart", e=>{
    const handle = e.target.closest(".sheet-handle");
    const sheetEl = handle && handle.closest(".sheet");
    if(!sheetEl || !sheetEl.classList.contains("open")) return;
    drag = { sheetEl, startY: e.touches[0].clientY, dy: 0, height: sheetEl.getBoundingClientRect().height };
    sheetEl.style.transition = "none";
  }, {passive:true});
  document.addEventListener("touchmove", e=>{
    if(!drag) return;
    drag.dy = Math.max(0, e.touches[0].clientY - drag.startY);
    drag.sheetEl.style.transform = `translateY(${drag.dy}px)`;
  }, {passive:true});
  document.addEventListener("touchend", ()=>{
    if(!drag) return;
    const { sheetEl, dy, height } = drag;
    sheetEl.style.transition = ""; sheetEl.style.transform = "";
    drag = null;
    if(dy > Math.min(110, height*0.28)){
      const entry = openSheetStack.find(s=> s.sheetId===sheetEl.id);
      if(entry){ if(entry.onEscape) entry.onEscape(); else closeSheet(entry.sheetId, entry.scrimId); }
    }
  }, {passive:true});
})();

/* ============ LANDMARK DETAIL & CHECK-IN ============ */
let activeCheckinPhoto = null, demoMode = false;
let reportState = { water:null, crowding:null, parking:null };
const SEASON_LABEL = { spring:"אביב", summer:"קיץ", autumn:"סתיו", winter:"חורף" };
function amenityChips(l){
  const chips = [];
  if(l.familyFriendly) chips.push("👪 מתאים למשפחות");
  if(l.dogFriendly) chips.push("🐕 אפשר עם כלב");
  if(l.hasWater) chips.push("💧 יש מים");
  if(l.accessible) chips.push("♿ נגיש");
  if(l.priceType==="paid") chips.push("💰 בתשלום"); else chips.push("🆓 חינם");
  if(l.season) chips.push("🗓 עונה מומלצת: "+SEASON_LABEL[l.season]);
  return chips;
}
let pendingWishlistRemovals = {};
function refreshOpenDetailIfShowing(id){
  if(location.hash === "#/destination/"+encodeURIComponent(id)) openDetail(id);
}
async function toggleWishlist(id){
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
      if(!myWishlist.includes(id)){ myWishlist.push(id); renderMap(); renderProfile(); refreshOpenDetailIfShowing(id); }
      if(!stillPending){
        // ה-timer כבר ירה וה-DELETE כבר בוצע בפועל - הביטול חייב להכניס את השורה מחדש,
        // לא רק לשחזר state מקומי (אחרת המסך יראה "שמור" בזמן שב-DB זה כבר נמחק).
        const { error } = await supabase.from("wishlist").insert({ user_id:session.user.id, landmark_id:id });
        if(error){ myWishlist = myWishlist.filter(x=>x!==id); renderMap(); renderProfile(); refreshOpenDetailIfShowing(id); toast("לא הצלחנו לבטל. נסה שוב."); }
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
    <div class="lm-hero${photoUrl?" has-photo":""}"${photoUrl?"":` style="background:linear-gradient(135deg, ${cat.color}, color-mix(in srgb, ${cat.color} 60%, #000 15%))"`}>
      ${photoUrl ? `<img src="${photoUrl}" alt="${l.name}" loading="eager">` : catIconSvg(cat.icon,110).replace('<svg ','<svg style="color:#fff" ')}
      <span class="badge-count">${totalVisits.toLocaleString()} כובשים</span>
      ${photoUrl && photoUrl===l.stockPhotoUrl && l.stockPhotoCredit ? `<span class="lm-photo-credit">${escapeHtml(l.stockPhotoCredit)}</span>` : ""}
    </div>
    <div class="lm-title-row"><div><h2>${l.name}</h2>
      <div class="lm-region">${REGIONS[l.region]} · <span class="cat-tag" style="background:${cat.color}">${catIconSvg(cat.icon,12)} ${cat.label}</span></div>
      ${userLoc ? `<div class="lm-from-you">📍 ${Math.round(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))} ק"מ ממך · כ-${estimateDriveMinutes(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))} דק׳ נסיעה (משוער)</div>` : ""}
    </div></div>
    <p class="lm-desc">${l.desc}</p>
    <div class="lm-stats">
      <div class="lm-stat"><div class="v">${tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label}</div><div class="l">קושי</div></div>
      ${l.duration ? `<div class="lm-stat"><div class="v">${l.duration}</div><div class="l">זמן משוער</div></div>` : ""}
      ${l.distanceKm!=null ? `<div class="lm-stat"><div class="v">${l.distanceKm} ק"מ</div><div class="l">הליכה</div></div>` : ""}
      <div class="lm-stat"><div class="v">${conquestEntry ? "✓ "+conquestEntry.xp_awarded.toLocaleString() : "+"+tierForDb(l.difficulty).xp}</div><div class="l">${conquestEntry ? "נכבש" : "נקודות"}</div></div>
    </div>
    <div class="lm-important-head">⚠️ חשוב לדעת לפני שיוצאים</div>
    <div class="amenity-row">${amenities.map(a=>`<span class="amenity-chip">${a}</span>`).join("")}</div>
    <div id="fieldReportsBox"></div>
    ${l.officialUrl ? `<a href="${l.officialUrl}" target="_blank" rel="noopener noreferrer" class="lm-official-link">🔗 מידע נוסף באתר הרשמי</a>` : ""}
    ${visitedEntry ? `<div class="checkin-status ok"><span class="ic">✓</span> כבשת את היעד הזה ב-${new Date(visitedEntry.visited_at).toLocaleDateString('he-IL')}${visitedEntry.pending?' · ממתין לסנכרון':''}</div>` : ""}
    <div class="lm-actions">
      <button class="icon-btn waze-btn" id="detailWazeBtn"></button>
      <button class="icon-btn" id="detailShareBtn" aria-label="שיתוף" title="שיתוף">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="5" r="2.6" stroke="currentColor" stroke-width="1.7"/><circle cx="6" cy="12" r="2.6" stroke="currentColor" stroke-width="1.7"/><circle cx="18" cy="19" r="2.6" stroke="currentColor" stroke-width="1.7"/><path d="M8.2 10.6 15.8 6.4M8.2 13.4l7.6 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
      </button>
      <button class="btn btn-outline" id="wishBtn">${wished?"❤️ ברשימת המשאלות":"🤍 רוצה להגיע"}</button>
      <button class="btn btn-primary" id="checkinBtn" ${visitedEntry?"disabled":""}>${visitedEntry?"✓ כבשתי":"🏆 כבשתי"}</button>
    </div>
    <div id="checkinFlow"></div>
    <button type="button" id="reportPlaceInfoBtn" style="display:block;margin:16px auto 4px;background:none;border:none;color:var(--text-muted);font-size:12px;text-decoration:underline;cursor:pointer;">מצאת מידע לא נכון? דווח על טעות</button>
  `;
  wireWazeButton($("detailWazeBtn"), l);
  $("detailShareBtn").onclick = ()=>{
    const url = `${location.origin}${location.pathname}#/destination/${encodeURIComponent(id)}`;
    shareLink(url, l.name, `${l.name} — גלו את זה באפליקציית מגלים את ישראל!`);
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
  $("detailSheet").style.maxHeight="90%";
  openSheet("detailSheet","detailScrim");
  renderFieldReports(id, l);
}

const FIELD_REPORT_LABELS = {
  water: { flowing:"💧 יש מים", low:"💧 מעט מים", dry:"🏜️ יבש" },
  crowding: { quiet:"🙂 שקט", moderate:"🙂 בינוני", crowded:"😅 עמוס" },
  parking: { available:"🅿️ יש מקום", limited:"🅿️ מוגבל", full:"🅿️ מלא" },
};
const FIELD_REPORT_TITLES = { water:"מצב מים", crowding:"עומס", parking:"חניה" };
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
    box.innerHTML = `<div class="field-reports"><div class="field-reports-title">📋 דיווחים מהשטח</div>` +
      keys.map(key=>{
        const r = latest[key];
        const ageDays = (Date.now()-new Date(r.at).getTime())/86400000;
        const stale = ageDays>14;
        return `<div class="field-report-row${stale?" stale":""}">
          <span>${FIELD_REPORT_TITLES[key]}: ${FIELD_REPORT_LABELS[key][r.val]}</span>
          <span class="field-report-time">${timeAgo(r.at)}${stale?" · ייתכן שהמצב השתנה":""}</span>
        </div>`;
      }).join("") + `</div>`;
  }catch(err){
    box.innerHTML = "";
  }
}

const FIELD_REPORT_OPTIONS = {
  water: [ ["flowing","💧 יש מים"], ["low","💧 מעט מים"], ["dry","🏜️ יבש"] ],
  crowding: [ ["quiet","🙂 שקט"], ["moderate","🙂 בינוני"], ["crowded","😅 עמוס"] ],
  parking: [ ["available","🅿️ יש מקום"], ["limited","🅿️ מוגבל"], ["full","🅿️ מלא"] ],
};
function fieldReportChips(l){
  const groups = [];
  if(l.hasWater || l.category==="water") groups.push("water");
  groups.push("crowding","parking");
  return `<label class="field-label" style="margin-top:10px;">איך המצב בשטח עכשיו? (אופציונלי)</label>` +
    groups.map(key=>`<div class="chip-row report-chip-row" id="report_${key}" style="margin-top:6px;">` +
      FIELD_REPORT_OPTIONS[key].map(([val,label])=>`<button type="button" class="chip teal" data-report="${key}" data-val="${val}">${label}</button>`).join("") +
      `</div>`).join("");
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
  activeCheckinPhoto = null;
  reportState = { water:null, crowding:null, parking:null };
  $("checkinFlow").innerHTML = `
    <div class="checkin-status" id="gpsStatus"><span class="ic">📡</span> מאתר מיקום GPS...</div>
    <div class="demo-toggle"><span>מצב הדגמה (עוקף בדיקת מרחק לצורך בדיקה)</span>
      <label class="switch"><input type="checkbox" id="demoSwitch" ${demoMode?"checked":""}><span class="track"></span></label></div>
    <div id="photoStep" class="hidden">
      <div class="photo-drop" id="photoDrop">📷 הוסיפו תמונה מהמקום (אופציונלי)</div>
      <input type="file" accept="image/*" capture="environment" id="photoInput">
      <img class="photo-preview hidden" id="photoPreview">
      <label class="field-label" style="margin-top:6px;">הערה קצרה לחברים (אופציונלי)</label>
      <input class="text-input" id="checkinNote" maxlength="120" placeholder="לדוגמה: יש מים עכשיו, המסלול מעולה!">
      ${fieldReportChips(l)}
      <button class="btn btn-primary btn-block" id="confirmCheckin" style="margin-top:12px;">אשר צ'ק-אין</button>
    </div>`;
  $("demoSwitch").onchange = e=>{ demoMode=e.target.checked; runGpsCheck(l); };
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
  navigator.geolocation.getCurrentPosition(pos=>{
    const d = haversine(pos.coords.latitude,pos.coords.longitude,l.lat,l.lon)*1000;
    userLoc = {lat:pos.coords.latitude, lon:pos.coords.longitude};
    if(d<=300){
      statusEl.className="checkin-status ok";
      statusEl.innerHTML = '<span class="ic">✓</span> אומת! את/ה במרחק '+Math.round(d)+' מטר מהיעד';
      photoStep.classList.remove("hidden");
    } else {
      statusEl.className="checkin-status bad";
      statusEl.innerHTML = '<span class="ic">✕</span> את/ה במרחק '+(d/1000).toFixed(1)+' ק"מ מהיעד — יש להגיע עד 300 מ׳ כדי לבצע צ׳ק-אין';
      photoStep.classList.add("hidden");
    }
  }, ()=>{ statusEl.className="checkin-status bad"; statusEl.innerHTML='<span class="ic">✕</span> לא ניתן לאתר מיקום — יש לאשר הרשאת GPS בדפדפן'; }, {enableHighAccuracy:true, timeout:8000});
}

// Gamification Overhaul, Phase 2 - מענק XP אטומי ואידמפוטנטי: בסיס-כיבוש-ראשון דרך
// landmark_conquests (PK על user_id+landmark_id - insert-on-conflict-do-nothing ברמת ה-DB,
// לא רק דגל-בזיכרון, כך שדאבל-קליק/רענון/race לא יכולים להעניק פעמיים) + כל בונוסי-החד-פעם
// דרך xp_bonus_grants (unique על user_id+bonus_type+source_id). נצרך גם מ-confirmCheckin
// (אונליין) וגם מ-flushPendingQueue (סנכרון-אופליין) - לוגיקה אחת בלבד, לא משוכפלת.
// מחזיר {baseXP, bonuses:[{type,label,xp}], totalGranted, isFirstConquest} - כל השדות
// מבוססים על מה שבאמת נכנס ל-DB (data.length אחרי upsert-ignoreDuplicates), לא ניחוש.
async function grantConquestAndBonuses(l){
  const tier = tierForDb(l.difficulty);
  const result = { baseXP:0, bonuses:[], totalGranted:0, isFirstConquest:false };
  const { data: conquestRows, error: cErr } = await supabase.from("landmark_conquests")
    .upsert({ user_id:session.user.id, landmark_id:l.id, xp_awarded:tier.xp, difficulty_at_conquest:l.difficulty },
      { onConflict:"user_id,landmark_id", ignoreDuplicates:true })
    .select();
  if(cErr){ console.warn("landmark_conquests לא זמינה עדיין (יתכן שה-migration טרם רץ):", cErr.message||cErr); return result; }
  if(!conquestRows || !conquestRows.length) return result; // ביקור חוזר - 0 XP, לא בונוסים
  result.isFirstConquest = true;
  result.baseXP = tier.xp;
  result.totalGranted = tier.xp;
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
  const tier = tierForDb(l.difficulty);
  const note = ($("checkinNote")?.value || "").trim().slice(0,120) || null;
  if(!navigator.onLine){
    // אופליין - אין גישה ל-DB כדי להריץ את מנגנון-הדה-דופ האמיתי, אז שומרים בתור עם הערכה
    // אופטימית בלבד (בסיס-קושי, בלי בונוסים) לתצוגה מקומית; המענק האמיתי (כולל בונוסים)
    // מתבצע ב-flushPendingQueue כשמתחברים מחדש - שם totalXP() מתעדכן לערך הנכון.
    const pending = { landmarkId:l.id, dataUrl:activeCheckinPhoto?activeCheckinPhoto.dataUrl:null, note, ts:new Date().toISOString() };
    const queue = JSON.parse(localStorage.getItem(PENDING_KEY)||"[]");
    queue.push(pending); localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
    myVisits.push({ landmark_id:l.id, visited_at:pending.ts, photo_url:pending.dataUrl, points_awarded:tier.xp, note, pending:true });
    refreshHeader(); closeSheet("detailSheet","detailScrim");
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
    track("checkin_completed", { landmark_id: l.id });
    submitFieldReport(l.id);
    refreshHeader(); closeSheet("detailSheet","detailScrim");
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
      levelLabel: lvlProgress.level.icon+" רמה "+(lvlProgress.index+1)+" — "+lvlProgress.level.name,
      current: lvlProgress.xpIntoLevel, total: lvlProgress.xpForLevel,
      pct: getLevelProgressPercentage(newTotalXP), isMax: lvlProgress.isMax,
      hint: lvlProgress.isMax ? "🎉 הגעתם לרמה הגבוהה ביותר!" : "עוד "+getXPToNextLevel(newTotalXP).toLocaleString()+" נקודות לרמה הבאה",
    };
    const steps = [{
      photoUrl: photoUrl || landmarkPhotos[l.id] || null,
      title: "🏆 עוד מקום נכבש!",
      subtitle: l.name,
      tag: tier.emoji+" "+tier.label,
      xp: grant.baseXP,
      sub: bonusLines.length ? bonusLines.join(" · ") : null,
      totalLine: grant.bonuses.length ? "סה\"כ +"+grant.totalGranted.toLocaleString()+" נקודות" : null,
      region: regionInfo,
      progress: levelField,
      confetti: true,
    }];
    newBadges.forEach(b=> steps.push({ emoji:"🏅", title:"תג חדש נפתח — "+b.icon+" "+b.label, confetti:false }));
    if(leveledUpTo){
      steps.push({
        emoji: leveledUpTo.icon,
        title: "🎉 עליתם רמה!",
        subtitle: "רמה "+(newLevelIndex+1),
        tag: leveledUpTo.icon+" "+leveledUpTo.name,
        confetti: true,
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
    if(nextPlace){
      steps.push({
        emoji:"🌳",
        title:"כבר באזור? יש עוד מקום קרוב",
        sub: nextPlace.name+" · כ-"+estimateDriveMinutes(nextDist)+" דק' נסיעה",
        actions: [
          { label:"קחו אותי לשם", primary:true, onClick:()=> goToDestination(nextPlace.id) },
          { label:"שמור לפעם הבאה", onClick:()=>{ if(!myWishlist.includes(nextPlace.id)) toggleWishlist(nextPlace.id).then(()=>renderProfile()); } },
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
  ctx.fillStyle = landColor || getCssVar("--map-land","#E4DEC9");
  ctx.fill();
  ctx.lineWidth = Math.max(1, w/300);
  ctx.strokeStyle = outlineColor || getCssVar("--map-outline","#B7A97E");
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
    ctx.fillStyle = visited ? (dotVisited || getCssVar("--accent-strong","#96610F")) : (dotOther || outlineColor || getCssVar("--map-outline","#B7A97E"));
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
function regionMilestoneLabel(pct, r){
  if(pct>=100) return "🏆 אלוף "+REGION_THE[r];
  if(pct>=75) return "🥇 מומחה "+REGION_THE[r];
  if(pct>=50) return "🥈 חוקר "+REGION_THE[r];
  if(pct>=25) return "🥉 מגלה "+REGION_THE[r];
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
      return `<div class="region-place-row visited" data-goto="${l.id}" role="button" tabindex="0" aria-label="${l.name}"><div class="thumb">${thumb}</div><div class="info"><div class="name">${l.name}</div><div class="sub">${tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label} · ${cat.label}</div></div></div>`;
    }
    return `<div class="region-place-row locked"><div class="thumb mystery">?</div><div class="info"><div class="name">מקום שעוד לא גילית</div><div class="sub">${tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label} · ${cat.label}</div></div></div>`;
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
  el.innerHTML = COLLECTIONS.map(c=>{
    const { done, total } = collectionProgress(c);
    const on = total>0 && done>=total;
    const progressLine = on ? "" : `<div class="badge-progress">${done}/${total}</div>`;
    return `<div class="badge${on?" unlocked":""}" data-id="${c.id}"><div class="circ">${c.icon}</div><div class="lbl">${c.label}</div>${progressLine}</div>`;
  }).join("");
  el.querySelectorAll("[data-id]").forEach(elm=> elm.onclick = ()=> navigate("#/collection/"+elm.dataset.id));
}
function openCollectionSheet(id){
  const c = COLLECTIONS.find(x=>x.id===id); if(!c) return;
  const { done, total } = collectionProgress(c);
  const subtitle = (c.description||"")+"  ·  "+done+"/"+total+" הושלמו";
  renderPlaceListSheet(c.icon+" "+c.label, collectionLandmarks(c), subtitle);
}
async function generateShareCard(){
  const W=1080, H=1600;
  const canvas = document.createElement("canvas");
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext("2d");
  const bg = getCssVar("--bg","#EDEAE0"), surface = getCssVar("--surface","#FFFFFF"), text = getCssVar("--text","#241F1A"), muted = getCssVar("--text-muted","#6B6255"), accent = getCssVar("--accent-strong","#96610F"), teal = getCssVar("--teal","#146F67");
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  ctx.textAlign = "center";
  ctx.fillStyle = text; ctx.font = "700 54px Heebo, sans-serif";
  ctx.fillText("מגלים את ישראל", W/2, 130);
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
  ctx.fillText("magalim-israel.vercel.app", W/2, H-40);
  return new Promise(resolve=> canvas.toBlob(blob=>resolve(blob), "image/png"));
}
async function shareMyMap(){
  const btn = $("shareMapBtn");
  if(btn){ btn.disabled = true; btn.textContent = "מכין תמונה..."; }
  try{
    const blob = await generateShareCard();
    const file = new File([blob], "המסע-שלי-בישראל.png", { type:"image/png" });
    if(navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title:"מגלים את ישראל", text:"המסע שלי בישראל 🇮🇱" });
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
    if(btn){ btn.disabled=false; btn.textContent="📤 שתף את המפה שלי"; }
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
      if(profileListTab==="wishlist") renderProfile();
    });
  });
}
function wishlistContextLines(l){
  const lines = [];
  if(userLoc){
    const km = haversine(userLoc.lat,userLoc.lon,l.lat,l.lon);
    lines.push("📍 כ-"+estimateDriveMinutes(km)+" דק' נסיעה ממך");
  }
  const friendCount = wishlistFriendVisits[l.id] || 0;
  if(friendCount>0){
    lines.push("👥 "+friendCount+" "+(friendCount===1?"חבר/ה ביקר/ה":"חברים ביקרו")+" כאן");
  } else if(l.season && l.season===currentSeasonKey()){
    lines.push("🌸 עונה מומלצת לביקור עכשיו");
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
  const cat = CATEGORIES[l.category];
  return `<div class="mini-card" data-id="${l.id}" role="button" tabindex="0" aria-label="${l.name}"><div class="mini-thumb" style="background:${cat.color};color:#fff">${catIconSvg(cat.icon,24)}</div>
    <div class="mini-info"><div class="name">${l.name}</div><div class="sub">${subLine}</div></div></div>`;
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
  el.innerHTML = results.map(l=> searchMiniCardHtml(l, REGIONS[l.region]+" · "+tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label)).join("");
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
  $("avatarLevelBadge").textContent = level.icon;
  $("profName").firstChild.textContent = myProfile.name;
  $("profSub").innerHTML = `<span class="level-chip">${level.icon} ${level.name}</span> · ${myVisits.length} יעדים נכבשו`;
  const levelPct = getLevelProgressPercentage(xp);
  $("progNum").firstChild.textContent = progress.next ? progress.xpIntoLevel.toLocaleString() : xp.toLocaleString();
  $("progNum").querySelector("span").textContent = progress.next ? "/ "+progress.xpForLevel.toLocaleString()+" נקודות" : "נקודות · רמה מקסימלית";
  $("progPct").textContent = levelPct+"%";
  $("progBar").style.width = levelPct+"%";
  $("levelHint").textContent = progress.next ? `${progress.next.icon} עוד ${getXPToNextLevel(xp).toLocaleString()} נקודות לרמת "${progress.next.name}"` : "🎉 הגעתם לרמה הגבוהה ביותר!";
  // Gamification Overhaul, Phase 6 - "NEXT LEVEL CTA": מצביע לאותו openTodaySheet() הקיים
  // (המלצה מבוססת בטיחות/העדפות, לא "הכי הרבה XP") - לא מנוע-המלצות חדש. לא מוצג ברמה
  // מקסימלית (אין "רמה הבאה" למצוא-לקראתה).
  $("nextLevelCta").classList.toggle("hidden", progress.isMax);
  $("welcomeBanner").classList.toggle("hidden", myVisits.length>0);
  $("progressSection").classList.toggle("hidden", myVisits.length===0);
  document.querySelector(".journey-stats-3")?.classList.toggle("hidden", myVisits.length===0);
  // Gamification Overhaul, Phase 6 - ציר-הסיכום הראשון מציג את אחוז-הגילוי ("ישראל שלי X%",
  // בדיוק כמו הדוגמה במפרט), לא ספירה גולמית של יעדים - הספירה הגולמית עדיין מוצגת ב-profSub
  // ("X יעדים נכבשו") וברשימת "כבשתי" למטה, אז שום מידע לא אבד.
  const discPct = LANDMARKS.length ? Math.round(myVisits.length/LANDMARKS.length*100) : 0;
  $("statIsraelPct").textContent = discPct+"%";
  const regionsVisited = new Set(myVisits.map(v=>lmById[v.landmark_id]?.region).filter(Boolean));
  $("statRegions").textContent = regionsVisited.size+"/"+Object.keys(REGIONS).length;
  drawPersonalMap($("profileMapCanvas"));
  $("myIsraelPct").textContent = "גילית "+discPct+"% מישראל";
  renderRegionProgress();
  $("statPoints").textContent = xp.toLocaleString();
  $("statStreak").textContent = computeStreak();
  $("statBadges").textContent = unlockedBadges().length+"/"+BADGES.length;
  const listEl = $("profList");
  if(profileListTab==="visited"){
    if(!myVisits.length){
      listEl.innerHTML = '<div class="empty-state"><div class="big">🗺️</div>עדיין לא כבשת יעדים.<br>צאו לטייל ועשו צ׳ק-אין ביעד הראשון!<br><button class="btn btn-primary empty-cta" id="emptyVisitedCta">🗺️ גלו יעדים במפה</button></div>';
      $("emptyVisitedCta").onclick = ()=> navigate("#/map");
    } else {
      listEl.innerHTML = myVisits.slice().sort((a,b)=>new Date(b.visited_at)-new Date(a.visited_at)).map(v=>{
        const l = lmById[v.landmark_id]; if(!l) return "";
        const cat = CATEGORIES[l.category];
        const thumb = v.photo_url ? `<img src="${v.photo_url}" loading="lazy" alt="תמונה מהצ'ק-אין ב${l.name}">` : catIconSvg(cat.icon,24);
        return `<div class="mini-card" data-id="${l.id}" role="button" tabindex="0" aria-label="${l.name}"><div class="mini-thumb" style="background:${cat.color};color:#fff">${thumb}</div>
          <div class="mini-info"><div class="name">${l.name}</div><div class="sub">${new Date(v.visited_at).toLocaleDateString('he-IL')}${v.pending?' · ממתין לסנכרון':''}</div></div>
          <div class="mini-pts">+${v.points_awarded}</div></div>`;
      }).join("");
    }
  } else if(profileListTab==="wishlist"){
    if(!myWishlist.length){
      listEl.innerHTML = '<div class="empty-state"><div class="big">⭐</div>רשימת המשאלות ריקה.<br>שמרו יעדים מהמפה לטיול הבא.<br><button class="btn btn-primary empty-cta" id="emptyWishlistCta">🗺️ גלו יעדים במפה</button></div>';
      $("emptyWishlistCta").onclick = ()=> navigate("#/map");
    } else {
      loadWishlistFriendVisits();
      const sortedWishlist = userLoc
        ? myWishlist.slice().sort((a,b)=>{
            const la=lmById[a], lb=lmById[b]; if(!la||!lb) return 0;
            return haversine(userLoc.lat,userLoc.lon,la.lat,la.lon) - haversine(userLoc.lat,userLoc.lon,lb.lat,lb.lon);
          })
        : myWishlist;
      listEl.innerHTML = sortedWishlist.map(id=>{
        const l = lmById[id]; if(!l) return ""; const cat = CATEGORIES[l.category];
        const ctx = wishlistContextLines(l).map(t=>`<div class="wishlist-context">${t}</div>`).join("");
        return `<div class="mini-card" data-id="${l.id}" role="button" tabindex="0" aria-label="${l.name}"><div class="mini-thumb" style="background:${cat.color};color:#fff">${catIconSvg(cat.icon,24)}</div>
          <div class="mini-info"><div class="name">${l.name}</div><div class="sub">${REGIONS[l.region]}${l.duration?" · "+l.duration:""}</div>${ctx}</div>
          <div class="mini-pts">${tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label}</div></div>`;
      }).join("");
    }
  } else {
    const recentlyViewed = getRecentlyViewed().map(id=>lmById[id]).filter(Boolean);
    if(!recentlyViewed.length){
      listEl.innerHTML = '<div class="empty-state"><div class="big">🕓</div>עדיין אין היסטוריה.<br>יעדים שתצפו בהם יופיעו כאן.<br><button class="btn btn-primary empty-cta" id="emptyHistoryCta">🗺️ גלו יעדים במפה</button></div>';
      $("emptyHistoryCta").onclick = ()=> navigate("#/map");
    } else {
      listEl.innerHTML = recentlyViewed.map(l=>{
        const cat = CATEGORIES[l.category];
        return `<div class="mini-card" data-id="${l.id}" role="button" tabindex="0" aria-label="${l.name}"><div class="mini-thumb" style="background:${cat.color};color:#fff">${catIconSvg(cat.icon,24)}</div>
          <div class="mini-info"><div class="name">${l.name}</div><div class="sub">${REGIONS[l.region]} · ${tierForDb(l.difficulty).emoji+" "+tierForDb(l.difficulty).label}</div></div></div>`;
      }).join("");
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
        <button class="icon-btn" data-act="report" aria-label="דיווח על משתמש" title="דיווח">🚩</button>
        <button class="icon-btn" data-act="block" aria-label="חסימת משתמש" title="חסום">🚫</button>
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
  if(type==="friend_request") return "👋";
  if(type==="friend_accepted") return "🤝";
  if(type==="circle_joined") return "👥";
  if(type==="friend_checkin") return "🏆";
  return "🔔";
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
  if(n.type==="friend_checkin") return `${visitorName} כבש/ה יעד חדש${landmarkName?" — "+landmarkName:""}`;
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
  } else if(n.type==="friend_checkin" && p.landmark_id){
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
    listEl.innerHTML = '<div class="empty-state"><div class="big">🔔</div>הכול שקט כאן.<br>התראות חדשות יופיעו כאן.</div>';
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
  $("travelStatusText").textContent = active
    ? `📍 משותף כרגע (${REGIONS[region]||region}) עד ${until.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}`
    : "השיתוף פעיל, אבל עדיין לא סימנתם שאתם מטיילים היום.";
}
async function setSharingEnabled(enabled){
  try{
    const { error } = await supabase.from("travel_status").upsert({ user_id:session.user.id, sharing_enabled:enabled, updated_at:new Date().toISOString() });
    if(error) throw error;
    myTravelStatus = { ...(myTravelStatus||{}), sharing_enabled:enabled };
    renderPrivacySection();
    toast(enabled ? "שיתוף מיקום כללי הופעל" : "שיתוף המיקום כובה");
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
    box.innerHTML = `👀 ${data.length===1?"חבר/ה אחד/ת מטייל/ת":data.length+" מהחברים שלכם מטיילים"} היום: ${names}`;
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
  let headline;
  if(myIndex===0) headline = `🥇 את/ה במקום הראשון מתוך ${total}!`;
  else {
    const medal = myIndex===1?"🥈":myIndex===2?"🥉":"📍";
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
      ? '<div class="empty-state"><div class="big">👥</div>עדיין אין לך חברים באפליקציה.<br>הזמינו חברים כדי להתחרות יחד!<br><button class="btn btn-primary empty-cta" id="emptyFriendsCta">👥 הזמן חברים</button></div>'
      : "";
    listEl.innerHTML = friendsEmptyBanner + rows.map((r,i)=>{
      const isMe = r.id===session.user.id;
      const rankClass = i===0?"top1":i===1?"top2":i===2?"top3":"";
      const safeName = escapeHtml(r.name);
      return `<div class="lb-row${isMe?" me":""}"><div class="lb-rank ${rankClass}">${i+1}</div>
        <div class="lb-avatar" style="background:${stringColor(r.name)}">${avatarInner(r.name,r.avatarUrl)}</div>
        <div class="lb-name">${safeName}${isMe?'<small>הדירוג שלך</small>':''}</div>
        <div class="lb-mini-stats"><span>🏆${r.destCount}</span><span>🗺️${r.regionCount}</span></div>
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
    <div class="feed-head"><div class="lb-avatar" style="background:${stringColor(name)};width:34px;height:34px;font-size:12px;">${avatarInner(name,avatarUrl)}</div>
      <div><div class="feed-name">${name}</div><div class="feed-time">${timeAgo(row.visited_at)} · כבש/ה את ${l.name}</div></div></div>
    <div class="feed-photo" data-goto="${l.id}" role="button" tabindex="0" aria-label="${l.name}" style="${bg}cursor:pointer;">${row.photo_url?"":catIconSvg(cat.icon,52).replace('<svg ','<svg style="color:#fff" ')}<span class="lm-label">${l.name}</span></div>
    ${row.note ? `<div class="feed-note">"${escapeHtml(row.note)}"</div>` : ""}
    <div class="feed-actions">
      <button class="like-btn${likedByMe?" liked":""}" data-id="${row.id}" aria-label="${likedByMe?"בטל לייק":"סמן לייק"}" aria-pressed="${likedByMe}"><svg viewBox="0 0 24 24" fill="${likedByMe?"currentColor":"none"}" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-9.5-9C.7 7.8 2.6 4 6.2 4c2 0 3.5 1.1 4.3 2.4C11.3 5.1 12.8 4 14.8 4c3.6 0 5.5 3.8 3.7 7-2.5 4.6-9.5 9-9.5 9Z"/></svg><span>${row.likes.length}</span></button>
      ${visited ? "" : `<button class="feed-wish-btn${wished?" active":""}" data-lm="${l.id}">${wished?"❤️ ברשימת המשאלות":"🤍 הוסף לרשימת המשאלות"}</button>`}
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
    <div class="feed-head"><div class="lb-avatar" style="background:${stringColor(name)};width:34px;height:34px;font-size:12px;">${avatarInner(name,avatarUrl)}</div>
      <div><div class="feed-name">${name}</div><div class="feed-time">${timeAgo(row.unlocked_at)} · פתח/ה תג חדש</div></div></div>
    <div class="badge-feed-body"><span class="badge-feed-icon">${badge.icon}</span><span class="badge-feed-label">${badge.label}</span></div>
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
      listEl.innerHTML = '<div class="empty-state"><div class="big">📷</div>עדיין אין צ׳ק-אינים בפיד.<br>היו הראשונים לכבוש יעד!<br><button class="btn btn-primary empty-cta" id="emptyFeedCta">🗺️ גלו יעדים במפה</button></div>';
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
        <div class="lb-mini-stats"><span>🔥${r.streak}</span><span>🏅${r.badgeCount}</span></div>
        <div class="lb-pts">${r.xp.toLocaleString()}</div></div>`;
    }).join("") : '<div class="empty-state">אין עדיין נתונים.</div>';

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
          <div class="pchallenge-icon" style="background:${chosenChallenge.color}">${chosenChallenge.icon}</div>
          <div><div class="pchallenge-title">${chosenChallenge.title}</div><div class="pchallenge-reward">יחד כקבוצה</div></div>
        </div>
        <div class="pchallenge-progress-row"><span>${chProgress} / ${chosenChallenge.target} הושלמו</span><span>${pct}%</span></div>
        <div class="bar"><i style="width:${pct}%;background:${chosenChallenge.color}"></i></div>
      </div>`;
    } else {
      $("groupChallengeCard").innerHTML = '<div class="empty-state">🎉 הקבוצה השלימה את כל האתגרים הזמינים!</div>';
    }

    $("groupBadgeGrid").innerHTML = BADGES.map(b=>{
      const count = memberIds.filter(id=> b.current(byMember[id])>=b.target(byMember[id])).length;
      return `<div class="badge${count>0?" unlocked":""}"><div class="circ">${b.icon}</div><div class="lbl">${b.label}</div><div class="badge-progress">${count}/${memberIds.length}</div></div>`;
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
      setTimeout(()=>toast("🏅 השלמת אתגר: "+ch.title+"!"), 400);
    }
    const pct = Math.round(current/ch.target*100);
    return `<div class="pchallenge-card${done?" done":""}">
      <div class="pchallenge-head">
        <div class="pchallenge-icon" style="background:${ch.color}">${ch.icon}</div>
        <div><div class="pchallenge-title">${ch.title}</div><div class="pchallenge-reward">🎁 ${ch.reward}</div></div>
      </div>
      <div class="pchallenge-progress-row"><span>${current} / ${ch.target} הושלמו</span><span>${done?"הושלם! 🎉":pct+"%"}</span></div>
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
