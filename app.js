import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// גרסת האפליקציה - יש לעדכן יחד עם ה-?v= בתג ה-script ב-index.html בכל דיפלוי, לצורך זיהוי גרסה ישנה בדפדפן
const APP_VERSION = "20260902l";

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
const DIFFS = {
  easy:{label:"קל",points:50}, medium:{label:"בינוני",points:100},
  hard:{label:"קשה",points:150}, extreme:{label:"מאתגר",points:250},
};
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
];
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

/* ============ LEVELS ============ */
const LEVELS = [
  {name:"מטייל מתחיל",icon:"🥾",min:0},
  {name:"מגלה ארצות",icon:"🧭",min:200},
  {name:"סייר",icon:"🏕️",min:600},
  {name:"חוקר הארץ",icon:"🗺️",min:1500},
  {name:"מומחה ישראל",icon:"🎖️",min:3500},
  {name:"אלוף הארץ",icon:"👑",min:7000},
];
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
function getLevel(xp){
  let i = LEVELS.length-1;
  while(i>0 && xp<LEVELS[i].min) i--;
  const cur = LEVELS[i], next = LEVELS[i+1] || null;
  return { name:cur.name, icon:cur.icon, index:i, min:cur.min, next, toNext: next ? next.min-xp : 0 };
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
let lbScope="friends", lbPeriod="week";
let profileListTab="visited";
const PENDING_KEY = "magalim-pending-checkins-v1";

/* ============ HELPERS ============ */
function $(id){ return document.getElementById(id); }
function toast(msg){
  const el = $("toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.classList.remove("show"), 3400);
}
function celebrate(landmarkName, xp, bonusText){
  const overlay = $("celebrateOverlay");
  $("celebrateTitle").textContent = "כבשת את "+landmarkName+"!";
  $("celebrateXp").textContent = "+"+xp+" XP";
  if(bonusText){ $("celebrateBonus").textContent = bonusText; $("celebrateBonus").classList.remove("hidden"); }
  else $("celebrateBonus").classList.add("hidden");
  overlay.classList.remove("hidden");
  overlay.offsetHeight; // force reflow so the class below actually transitions
  overlay.classList.add("show");
  clearTimeout(celebrate._t);
  const dismiss = ()=>{
    overlay.classList.remove("show");
    setTimeout(()=> overlay.classList.add("hidden"), 220);
    overlay.removeEventListener("click", dismiss);
  };
  celebrate._t = setTimeout(dismiss, 2200);
  overlay.addEventListener("click", dismiss);
}
async function shareLink(url, title, text){
  if(navigator.share){
    try{ await navigator.share({ title, text, url }); return; }catch(e){ if(e.name==="AbortError") return; }
  }
  try{ await navigator.clipboard.writeText(url); toast("הקישור הועתק — אפשר להדביק ולשלוח!"); }
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
function friendlyAuthError(msg){
  if(!msg) return "משהו השתבש. נסו שוב.";
  if(/Invalid login credentials/i.test(msg)) return "אימייל או סיסמה שגויים.";
  if(/User already registered/i.test(msg)) return "כבר יש חשבון עם האימייל הזה — נסו להתחבר.";
  if(/Password should be at least/i.test(msg)) return "הסיסמה חייבת להכיל לפחות 6 תווים.";
  if(/Unable to validate email/i.test(msg)) return "כתובת האימייל לא תקינה.";
  return msg;
}

/* ============ AUTH ============ */
let authMode = "login";
$("tabLogin").onclick = ()=>{ authMode="login"; $("tabLogin").classList.add("active"); $("tabSignup").classList.remove("active"); $("nameField").classList.add("hidden"); $("authSubmit").textContent="התחברות"; $("authError").classList.remove("show"); $("authNote").classList.remove("show"); };
$("tabSignup").onclick = ()=>{ authMode="signup"; $("tabSignup").classList.add("active"); $("tabLogin").classList.remove("active"); $("nameField").classList.remove("hidden"); $("authSubmit").textContent="הרשמה"; $("authError").classList.remove("show"); $("authNote").classList.remove("show"); };

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
      const { data, error } = await supabase.auth.signUp({ email, password, options:{ data:{ name: name || "מטייל/ת חדש/ה" } } });
      if(error) throw error;
      if(!data.session){
        $("authNote").textContent = "נרשמת בהצלחה! בדקו את תיבת המייל ואשרו את ההרשמה כדי להתחבר.";
        $("authNote").classList.add("show");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if(error) throw error;
    }
  }catch(err){
    $("authError").textContent = friendlyAuthError(err.message);
    $("authError").classList.add("show");
  }finally{
    $("authSubmit").disabled = false;
  }
});

$("signOutBtn").onclick = async ()=>{ await supabase.auth.signOut(); };
$("authCloseBtn").onclick = ()=> closeAuthSheet();

let authGateMessage = null;
let pendingAuthAction = null;
function openAuthSheet(message, onSuccess){
  authGateMessage = message || null;
  pendingAuthAction = onSuccess || null;
  $("authIntroText").textContent = message || "הצטרפו וצאו לכבוש את הארץ";
  $("authCloseBtn").classList.remove("hidden");
  $("authScreen").classList.remove("hidden");
}
function closeAuthSheet(){
  $("authScreen").classList.add("hidden");
  authGateMessage = null;
}
function requireAuth(message, onSuccess){
  if(session) return true;
  openAuthSheet(message, onSuccess);
  return false;
}

supabase.auth.onAuthStateChange((event, newSession)=>{
  const hadNoSession = !session;
  session = newSession;
  if(session) closeAuthSheet();
  bootUserData().then(()=>{
    if(session && hadNoSession && pendingAuthAction){
      const action = pendingAuthAction;
      pendingAuthAction = null;
      action();
    }
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
window.addEventListener("popstate", applyRoute);

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
  if(tab==="leaders") renderBoard();
  else if(tab==="group") renderGroupPanel();
  else if(tab==="feed") renderFeed();
}
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
  closeSheet("detailSheet","detailScrim");
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
      familyFriendly:!!l.family_friendly, dogFriendly:!!l.dog_friendly, accessible:!!l.accessible, hasWater:!!l.has_water, priceType:l.price_type||"free", season:l.season||null, durationHours:l.duration_hours!=null?Number(l.duration_hours):null }));
    lmById = Object.fromEntries(LANDMARKS.map(l=>[l.id,l]));
    await loadVisitCounts();
    loadLandmarkPhotos().then(()=>{
      renderMap();
      const m = location.hash.match(/^#\/destination\/(.+)$/);
      if(m && lmById[decodeURIComponent(m[1])]) openDetail(decodeURIComponent(m[1]));
    }).catch(()=>{});
    buildChips("catChips", CATEGORIES, "cats");
    buildChips("diffChips", DIFFS, "diffs", "teal");
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
    refreshHeader(); renderMap(); renderProfile(); renderBoard(); renderFeed(); renderGroupPanel(); renderFriendsTravelBanner();
    return;
  }
  try{
    await loadMyProfile();
    await Promise.all([ loadMyVisits(), loadMyWishlist(), loadFollowing(), loadMyGroups(), loadMyTravelStatus() ]);
    prevBadgeSet = new Set(unlockedBadges().map(b=>b.id));
    flushPendingQueue();
    await handleInviteLinks();
    updateGroupBarVisibility();
    refreshHeader();
    renderMap(); renderProfile(); renderBoard(); renderFeed(); renderGroupPanel(); renderFriendsTravelBanner();
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
  const { data, error } = await supabase.from("visits").select("landmark_id");
  if(error) throw error;
  visitCounts = {};
  data.forEach(r=>{ visitCounts[r.landmark_id] = (visitCounts[r.landmark_id]||0)+1; });
}
let landmarkPhotos = {};
async function loadLandmarkPhotos(){
  const { data, error } = await supabase.from("visits").select("landmark_id,photo_url,visited_at").not("photo_url","is",null).order("visited_at",{ascending:false}).limit(500);
  if(error) throw error;
  landmarkPhotos = {};
  data.forEach(r=>{ if(!landmarkPhotos[r.landmark_id]) landmarkPhotos[r.landmark_id] = r.photo_url; });
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
  sel.innerHTML = myGroups.map(g=>`<option value="${g.id}">${g.name}</option>`).join("");
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
  const { error: joinErr } = await supabase.from("group_members").insert({ group_id:data.id, user_id:session.user.id });
  if(joinErr){ toast("שגיאה בהצטרפות לקבוצה"); return; }
  myGroups.push({ id:data.id, name:data.name });
  activeGroupId = data.id;
  populateGroupSelect(); updateGroupBarVisibility();
  toast('הקבוצה "'+data.name+'" נוצרה!');
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
  const { data: g, error: gErr } = await supabase.from("groups").select("id,name").eq("id", groupId).maybeSingle();
  if(gErr || !g){ return; }
  const { error } = await supabase.from("group_members").insert({ group_id:groupId, user_id:session.user.id });
  if(error) return;
  myGroups.push({ id:g.id, name:g.name });
  activeGroupId = g.id;
  populateGroupSelect();
  toast('הצטרפת לקבוצה "'+g.name+'"!');
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
  parts.push(DIFFS[l.difficulty].label);
  if(l.category==="water"||l.hasWater) parts.push("יש מים");
  if(l.accessible) parts.push("♿ נגיש");
  if(l.priceType==="free") parts.push("🆓 חינם");
  parts.push("מתאים ל"+(l.duration||DURATION_LABEL[wizState.duration]||""));
  return parts.join(" · ");
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
    const labels = { water:"מים", duration:"משך הזמן", difficulty:"רמת הקושי" };
    note = `<div class="wiz-relaxed-note">לא מצאנו התאמה מלאה, אז הרחבנו את החיפוש (בלי דרישת ${relaxed.map(r=>labels[r]).join(", ")})</div>`;
  }
  $("wizResults").innerHTML = `<h3 style="margin:4px 0 12px;">מצאנו לך ${results.length} טיולים להיום 🎉</h3>${note}` +
    results.map(l=>{
      const cat = CATEGORIES[l.category];
      return `<div class="mini-card wiz-result-card" data-id="${l.id}">
        <div class="mini-thumb" style="background:${cat.color};color:#fff">${catIconSvg(cat.icon,24)}</div>
        <div class="mini-info"><div class="name">${l.name}</div><div class="sub">${wizExplain(l)}</div></div>
      </div>`;
    }).join("");
  $("wizResults").querySelectorAll(".wiz-result-card").forEach(el=> el.onclick = ()=>{ closeSheet("todaySheet","todayScrim"); goToDestination(el.dataset.id); });
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
}

let previewId = null;
function openPreview(id){
  const l = lmById[id]; if(!l) return;
  previewId = id;
  const cat = CATEGORIES[l.category];
  const wished = myWishlist.includes(id);
  const photoUrl = landmarkPhotos[id];
  $("destPreviewHero").innerHTML = photoUrl
    ? '<img src="'+photoUrl+'" alt="">'
    : '<div style="background:linear-gradient(135deg, '+cat.color+', color-mix(in srgb, '+cat.color+' 60%, #000 15%));display:flex;align-items:center;justify-content:center;">'+catIconSvg(cat.icon,34).replace('<svg ','<svg style="color:#fff" ')+'</div>';
  $("destPreviewName").textContent = l.name;
  const distText = userLoc ? Math.round(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))+' ק"מ ממך · ' : "";
  $("destPreviewFacts").textContent = distText+DIFFS[l.difficulty].label+" · "+l.duration;
  $("destPreviewWish").textContent = wished ? "❤️" : "🤍";
  $("destPreview").classList.add("open");
  renderMap();
}
function closePreview(){
  if(!previewId) return;
  previewId = null;
  $("destPreview").classList.remove("open");
  renderMap();
}
function renderMap(){
  if(!leafletMap) return;
  clusterGroup.clearLayers();
  const list = filteredLandmarks();
  $("visibleCount").textContent = filters.customLabel ? filters.customLabel+" · "+list.length : list.length+" יעדים";
  if(previewId && !list.some(l=>l.id===previewId)){ previewId = null; $("destPreview").classList.remove("open"); }
  list.forEach(l=>{
    const visited = myVisits.some(v=>v.landmark_id===l.id);
    const wished = myWishlist.includes(l.id);
    const selected = l.id===previewId;
    const cat = CATEGORIES[l.category];
    const icon = L.divIcon({
      className: "lm-divicon",
      html: '<div class="lm-pin-wrap">'
        + '<div class="lm-pin'+(visited?" visited":"")+(selected?" selected":"")+'" style="--pin-color:'+cat.color+'">'
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
  renderDiscoveryCarousel();
}

function renderDiscoveryCarousel(){
  if(!leafletMap) return;
  renderMapSidePanel();
  const el = $("discoveryCarousel");
  el.classList.toggle("hidden", !!previewId);
  if(previewId) return;
  const bounds = leafletMap.getBounds();
  const center = leafletMap.getCenter();
  const list = filteredLandmarks()
    .filter(l=> bounds.contains([l.lat,l.lon]))
    .sort((a,b)=> haversine(center.lat,center.lng,a.lat,a.lon) - haversine(center.lat,center.lng,b.lat,b.lon))
    .slice(0,30);
  el.innerHTML = list.map(l=>{
    const cat = CATEGORIES[l.category];
    const photoUrl = landmarkPhotos[l.id];
    const thumb = photoUrl
      ? '<img src="'+photoUrl+'" alt="">'
      : '<div style="background:linear-gradient(135deg, '+cat.color+', color-mix(in srgb, '+cat.color+' 60%, #000 15%));">'+catIconSvg(cat.icon,26).replace('<svg ','<svg style="color:#fff" ')+'</div>';
    return '<div class="discovery-card" data-id="'+l.id+'">'
      + '<div class="discovery-card-thumb">'+thumb+'</div>'
      + '<div class="discovery-card-name">'+l.name+'</div>'
      + '<div class="discovery-card-facts">'+DIFFS[l.difficulty].label+" · "+l.duration+'</div>'
      + '</div>';
  }).join("");
  el.querySelectorAll(".discovery-card").forEach(card=>{
    card.onclick = ()=>{
      const l = lmById[card.dataset.id];
      if(!l) return;
      leafletMap.panTo([l.lat,l.lon]);
      openPreview(l.id);
    };
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
    panel.innerHTML = `
      <div class="lm-hero${photoUrl?" has-photo":""}" style="height:150px;${photoUrl?"":`background:linear-gradient(135deg, ${cat.color}, color-mix(in srgb, ${cat.color} 60%, #000 15%))`}">
        ${photoUrl ? `<img src="${photoUrl}" alt="">` : catIconSvg(cat.icon,90).replace('<svg ','<svg style="color:#fff" ')}
      </div>
      <div class="lm-title-row"><div><h2>${l.name}</h2>
        <div class="lm-region">${REGIONS[l.region]} · <span class="cat-tag" style="background:${cat.color}">${catIconSvg(cat.icon,12)} ${cat.label}</span></div>
      </div></div>
      <div class="lm-stats">
        <div class="lm-stat"><div class="v">${DIFFS[l.difficulty].label}</div><div class="l">קושי</div></div>
        <div class="lm-stat"><div class="v">${l.duration}</div><div class="l">זמן משוער</div></div>
        <div class="lm-stat"><div class="v">${l.distanceKm} ק"מ</div><div class="l">הליכה</div></div>
      </div>
      <p class="lm-desc">${l.desc}</p>
      <div class="lm-actions">
        <button class="btn btn-outline" id="panelWishBtn">${wished?"❤️ ברשימת המשאלות":"🤍 רוצה להגיע"}</button>
        <button class="btn btn-primary" id="panelDetailBtn">פרטים מלאים</button>
      </div>
    `;
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
      const thumb = photoUrl ? '<img src="'+photoUrl+'" alt="">' : catIconSvg(cat.icon,24);
      return '<div class="mini-card" data-id="'+l.id+'"><div class="mini-thumb" style="background:'+cat.color+';color:#fff">'+thumb+'</div>'
        + '<div class="mini-info"><div class="name">'+l.name+'</div><div class="sub">'+DIFFS[l.difficulty].label+" · "+l.duration+'</div></div></div>';
    }).join("") + '</div>';
    panel.querySelectorAll(".mini-card").forEach(card=>{
      card.onclick = ()=>{
        const l = lmById[card.dataset.id];
        if(!l) return;
        leafletMap.panTo([l.lat,l.lon]);
        openPreview(l.id);
      };
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
  Object.entries(DIFFS).forEach(([id,d])=>{
    const chip = document.createElement("button");
    chip.className = "chip teal"; chip.dataset.id = id; chip.textContent = d.label;
    $("wizDifficulty").appendChild(chip);
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
  $("openTodayWizard").onclick = ()=> openSheet("todaySheet","todayScrim");
  $("welcomeFindBtn").onclick = ()=> navigate("#/map");
  $("closeToday").onclick = ()=> closeSheet("todaySheet","todayScrim");
  $("todayScrim").onclick = ()=> closeSheet("todaySheet","todayScrim");
  $("headerLoginBtn").onclick = ()=> openAuthSheet();
  $("boardGuestBtn").onclick = ()=> openAuthSheet();
  $("profileGuestBtn").onclick = ()=> openAuthSheet();
  $("distRange").oninput = e=>{ filters.maxDist=Number(e.target.value); updateDistVal(); syncDistQuickChips(); };
  document.querySelectorAll("#distQuickChips .chip").forEach(chip=>{
    chip.onclick = ()=>{
      const min = Number(chip.dataset.min);
      if(min>0 && !userLoc){ $("locateBtn").click(); }
      filters.maxDist = min>0 ? kmForDriveMinutes(min) : 400;
      updateDistVal(); syncDistQuickChips(); renderMap(); syncQuickChips();
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
  $("editNameBtn").onclick = async ()=>{
    const n = prompt("איך לקרוא לך?", myProfile.name);
    if(n && n.trim()){
      const { error } = await supabase.from("profiles").update({ name:n.trim() }).eq("id", session.user.id);
      if(error){ toast("שגיאה בעדכון השם"); return; }
      myProfile.name = n.trim(); renderProfile();
    }
  };
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
  $("scopeSeg").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    $("scopeSeg").querySelectorAll("button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); lbScope=b.dataset.scope;
    renderBoard();
  });
  document.querySelectorAll("#boardTabs button").forEach(b=> b.onclick = ()=> switchBoardTab(b.dataset.tab));
  $("periodSeg").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    $("periodSeg").querySelectorAll("button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); lbPeriod=b.dataset.period; renderBoard();
  });
  $("inviteBtn").onclick = ()=> shareLink(
    `${location.origin}${location.pathname}?ref=${session.user.id}`,
    "מגלים את ישראל", "בוא/י תצטרף/י אליי לכבוש יעדים בישראל באפליקציית מגלים את ישראל!"
  );
  $("groupSelect").onchange = e=>{ activeGroupId = e.target.value; renderGroupPanel(); };
  $("groupNewBtn").onclick = createGroup;
  $("groupCreateBtn").onclick = createGroup;
  $("groupInviteBtn").onclick = ()=>{
    if(!activeGroupId){ toast("צור קבוצה קודם"); return; }
    const g = myGroups.find(g=>g.id===activeGroupId);
    shareLink(
      `${location.origin}${location.pathname}?group=${activeGroupId}`,
      "מגלים את ישראל", `הצטרפ/י לקבוצה "${g?g.name:''}" באפליקציית מגלים את ישראל!`
    );
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
    };
  });
}
function wireSingleSelectChips(containerId, filterKey){
  document.querySelectorAll("#"+containerId+" .chip").forEach(chip=>{
    chip.onclick = ()=>{
      const id = chip.dataset.id;
      filters[filterKey] = filters[filterKey]===id ? null : id;
      document.querySelectorAll("#"+containerId+" .chip").forEach(c=>c.classList.toggle("active", c.dataset.id===filters[filterKey]));
    };
  });
}
function wireBooleanChips(containerId, keyMap){
  document.querySelectorAll("#"+containerId+" .chip").forEach(chip=>{
    const key = keyMap[chip.dataset.id];
    chip.onclick = ()=>{ filters[key] = !filters[key]; chip.classList.toggle("active", filters[key]); };
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
  const hasFilters = filters.cats.length||filters.diffs.length||filters.regions.length||filters.maxDist<400||filters.duration||filters.season||filters.family||filters.dog||filters.water||filters.accessible||filters.free;
  $("openFilters").classList.toggle("has-filters", !!hasFilters);
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
function openSheet(sheetId, scrimId){ $(sheetId).classList.add("open"); $(scrimId).classList.add("open"); }
function closeSheet(sheetId, scrimId){ $(sheetId).classList.remove("open"); $(scrimId).classList.remove("open"); }

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
async function toggleWishlist(id){
  let justAdded = false;
  if(myWishlist.includes(id)){
    const { error } = await supabase.from("wishlist").delete().eq("user_id",session.user.id).eq("landmark_id",id);
    if(!error) myWishlist = myWishlist.filter(x=>x!==id);
  } else {
    const { error } = await supabase.from("wishlist").insert({ user_id:session.user.id, landmark_id:id });
    if(!error){ myWishlist.push(id); justAdded = true; }
  }
  renderMap();
  return justAdded;
}
function openDetail(id){
  closePreview();
  const l = lmById[id];
  const visitedEntry = myVisits.find(v=>v.landmark_id===id);
  const wished = myWishlist.includes(id);
  const cat = CATEGORIES[l.category];
  const totalVisits = l.baseVisits + (visitCounts[id]||0);
  const amenities = amenityChips(l);
  const photoUrl = landmarkPhotos[id];
  $("detailBody").innerHTML = `
    <div class="lm-hero${photoUrl?" has-photo":""}"${photoUrl?"":` style="background:linear-gradient(135deg, ${cat.color}, color-mix(in srgb, ${cat.color} 60%, #000 15%))"`}>
      ${photoUrl ? `<img src="${photoUrl}" alt="">` : catIconSvg(cat.icon,110).replace('<svg ','<svg style="color:#fff" ')}
      <span class="badge-count">${totalVisits.toLocaleString()} כובשים</span>
    </div>
    <div class="lm-title-row"><div><h2>${l.name}</h2>
      <div class="lm-region">${REGIONS[l.region]} · <span class="cat-tag" style="background:${cat.color}">${catIconSvg(cat.icon,12)} ${cat.label}</span></div>
      ${userLoc ? `<div class="lm-from-you">📍 ${Math.round(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))} ק"מ ממך · כ-${estimateDriveMinutes(haversine(userLoc.lat,userLoc.lon,l.lat,l.lon))} דק׳ נסיעה (משוער)</div>` : ""}
    </div></div>
    <p class="lm-desc">${l.desc}</p>
    <div class="lm-stats">
      <div class="lm-stat"><div class="v">${DIFFS[l.difficulty].label}</div><div class="l">קושי</div></div>
      <div class="lm-stat"><div class="v">${l.duration}</div><div class="l">זמן משוער</div></div>
      <div class="lm-stat"><div class="v">${l.distanceKm} ק"מ</div><div class="l">הליכה</div></div>
      <div class="lm-stat"><div class="v">+${DIFFS[l.difficulty].points}</div><div class="l">XP</div></div>
    </div>
    <div class="amenity-row">${amenities.map(a=>`<span class="amenity-chip">${a}</span>`).join("")}</div>
    <div id="fieldReportsBox"></div>
    ${visitedEntry ? `<div class="checkin-status ok"><span class="ic">✓</span> כבשת את היעד הזה ב-${new Date(visitedEntry.visited_at).toLocaleDateString('he-IL')}${visitedEntry.pending?' · ממתין לסנכרון':''}</div>` : ""}
    <div class="lm-actions">
      <button class="btn btn-outline" id="wishBtn">${wished?"❤️ ברשימת המשאלות":"🤍 רוצה להגיע"}</button>
      <button class="btn btn-primary" id="checkinBtn" ${visitedEntry?"disabled":""}>${visitedEntry?"✓ כבשתי":"🏆 כבשתי"}</button>
    </div>
    <div id="checkinFlow"></div>
  `;
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
      <div class="photo-drop" id="photoDrop">📷 הקש כדי לצלם תמונת אימות במיקום</div>
      <input type="file" accept="image/*" capture="environment" id="photoInput">
      <img class="photo-preview hidden" id="photoPreview">
      <label class="field-label" style="margin-top:6px;">הערה קצרה לחברים (אופציונלי)</label>
      <input class="text-input" id="checkinNote" maxlength="120" placeholder="לדוגמה: יש מים עכשיו, המסלול מעולה!">
      ${fieldReportChips(l)}
      <button class="btn btn-primary btn-block" id="confirmCheckin" disabled style="margin-top:12px;">אשר צ'ק-אין</button>
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

function pointsFor(l){
  const firstInCat = countCat(myVisits, l.category)===0;
  return DIFFS[l.difficulty].points + (firstInCat?15:0);
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
  const prevLevelIndex = getLevel(totalPoints()).index;
  const pts = pointsFor(l);
  const note = ($("checkinNote")?.value || "").trim().slice(0,120) || null;
  if(!navigator.onLine){
    const pending = { landmarkId:l.id, dataUrl:activeCheckinPhoto?activeCheckinPhoto.dataUrl:null, points:pts, note, ts:new Date().toISOString() };
    const queue = JSON.parse(localStorage.getItem(PENDING_KEY)||"[]");
    queue.push(pending); localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
    myVisits.push({ landmark_id:l.id, visited_at:pending.ts, photo_url:pending.dataUrl, points_awarded:pts, note, pending:true });
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
    let { data, error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:l.id, photo_url:photoUrl, points_awarded:pts, note }).select().single();
    if(error && /note/i.test(error.message||"")){
      ({ data, error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:l.id, photo_url:photoUrl, points_awarded:pts }).select().single());
    }
    if(error) throw error;
    myVisits.push(data);
    submitFieldReport(l.id);
    refreshHeader(); closeSheet("detailSheet","detailScrim");
    const firstInCat = pts>DIFFS[l.difficulty].points;
    celebrate(l.name, pts, firstInCat?"+15 XP בונוס — קטגוריה חדשה!":null);
    const newBadgeCount = checkNewBadges();
    const newLevelIndex = getLevel(totalPoints()).index;
    if(newLevelIndex>prevLevelIndex){
      const lvl = LEVELS[newLevelIndex];
      setTimeout(()=> toast(`🎉 עלית לרמה: ${lvl.icon} ${lvl.name}!`), 2500+newBadgeCount*2200);
    }
    loadVisitCounts().then(renderMap);
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
      let photoUrl = null;
      if(item.dataUrl){
        const blob = await (await fetch(item.dataUrl)).blob();
        const path = `${session.user.id}/${item.landmarkId}-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("checkin-photos").upload(path, blob, { contentType:"image/jpeg" });
        if(!upErr) photoUrl = supabase.storage.from("checkin-photos").getPublicUrl(path).data.publicUrl;
      }
      let { error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:item.landmarkId, photo_url:photoUrl, points_awarded:item.points, note:item.note||null });
      if(error && /note/i.test(error.message||"")){
        ({ error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:item.landmarkId, photo_url:photoUrl, points_awarded:item.points }));
      }
      if(error) throw error;
      myVisits = myVisits.filter(v=>!(v.pending && v.landmark_id===item.landmarkId));
      toast("סונכרן צ'ק-אין: "+(lmById[item.landmarkId]?lmById[item.landmarkId].name:item.landmarkId));
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
  newOnes.forEach((b,i)=> setTimeout(()=>toast("תג חדש נפתח: "+b.icon+" "+b.label), 2500+i*2200));
  return newOnes.length;
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
function totalPoints(){ return myVisits.reduce((s,v)=>s+(v.points_awarded||0),0); }

/* ============ HEADER ============ */
function refreshHeader(){
  $("headerPoints").classList.toggle("hidden", !session);
  $("headerLoginBtn").classList.toggle("hidden", !!session);
  if(session){
    $("pointsVal").textContent = totalPoints().toLocaleString();
    $("streakVal").textContent = computeStreak();
  }
  const pct = (session && LANDMARKS.length) ? Math.round(myVisits.length/LANDMARKS.length*100) : null;
  $("heroSub").textContent = pct!=null ? `גיליתם ${pct}% מהארץ — ${myVisits.length} מתוך ${LANDMARKS.length} יעדים` : "כמה ממנה כבר גיליתם?";
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
  ctx.fillText(totalPoints().toLocaleString()+" XP · רצף "+computeStreak()+" שבועות", W-110, 1515);
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

/* ============ PROFILE ============ */
function renderProfile(){
  if(!session){ setGuestGate("profile", true); return; }
  setGuestGate("profile", false);
  if(!myProfile) return;
  const xp = totalPoints();
  const level = getLevel(xp);
  $("avatarLetter").textContent = myProfile.name.trim().charAt(0) || "א";
  $("avatarLevelBadge").textContent = level.icon;
  $("profName").firstChild.textContent = myProfile.name;
  $("profSub").innerHTML = `<span class="level-chip">${level.icon} ${level.name}</span> · ${myVisits.length} יעדים נכבשו`;
  const bracketTotal = level.next ? level.next.min-level.min : 0;
  const bracketCurrent = level.next ? xp-level.min : 0;
  const levelPct = level.next ? Math.round(bracketCurrent/bracketTotal*100) : 100;
  $("progNum").firstChild.textContent = level.next ? bracketCurrent.toLocaleString() : xp.toLocaleString();
  $("progNum").querySelector("span").textContent = level.next ? "/ "+bracketTotal.toLocaleString()+" XP" : "XP · רמה מקסימלית";
  $("progPct").textContent = levelPct+"%";
  $("progBar").style.width = levelPct+"%";
  $("levelHint").textContent = level.next ? `${level.next.icon} עוד ${level.toNext.toLocaleString()} XP לרמת "${level.next.name}"` : "🎉 הגעתם לרמה הגבוהה ביותר!";
  $("welcomeBanner").classList.toggle("hidden", myVisits.length>0);
  $("statVisited").textContent = myVisits.length;
  const regionsVisited = new Set(myVisits.map(v=>lmById[v.landmark_id]?.region).filter(Boolean));
  $("statRegions").textContent = regionsVisited.size+"/"+Object.keys(REGIONS).length;
  drawPersonalMap($("profileMapCanvas"));
  $("statPoints").textContent = xp.toLocaleString();
  $("statStreak").textContent = computeStreak();
  const ub = unlockedBadges();
  $("statBadges").textContent = ub.length+"/"+BADGES.length;
  $("badgeGrid").innerHTML = BADGES.map(b=>{
    const on = ub.some(u=>u.id===b.id);
    const cur = b.current(myVisits), tgt = b.target(myVisits);
    const progressLine = on ? "" : `<div class="badge-progress">${cur}/${tgt}</div>`;
    return `<div class="badge${on?" unlocked":""}"><div class="circ">${b.icon}</div><div class="lbl">${b.label}</div>${progressLine}</div>`;
  }).join("");
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
        return `<div class="mini-card" data-id="${l.id}"><div class="mini-thumb" style="background:${cat.color};color:#fff">${thumb}</div>
          <div class="mini-info"><div class="name">${l.name}</div><div class="sub">${new Date(v.visited_at).toLocaleDateString('he-IL')}${v.pending?' · ממתין לסנכרון':''}</div></div>
          <div class="mini-pts">+${v.points_awarded}</div></div>`;
      }).join("");
    }
  } else {
    if(!myWishlist.length){
      listEl.innerHTML = '<div class="empty-state"><div class="big">⭐</div>רשימת המשאלות ריקה.<br>שמרו יעדים מהמפה לטיול הבא.<br><button class="btn btn-primary empty-cta" id="emptyWishlistCta">🗺️ גלו יעדים במפה</button></div>';
      $("emptyWishlistCta").onclick = ()=> navigate("#/map");
    } else {
      listEl.innerHTML = myWishlist.map(id=>{
        const l = lmById[id]; if(!l) return ""; const cat = CATEGORIES[l.category];
        return `<div class="mini-card" data-id="${l.id}"><div class="mini-thumb" style="background:${cat.color};color:#fff">${catIconSvg(cat.icon,24)}</div>
          <div class="mini-info"><div class="name">${l.name}</div><div class="sub">${REGIONS[l.region]} · ${l.duration}</div></div>
          <div class="mini-pts">${DIFFS[l.difficulty].label}</div></div>`;
      }).join("");
    }
  }
  listEl.querySelectorAll(".mini-card").forEach(el=>el.onclick=()=>goToDestination(el.dataset.id));
  renderPrivacySection();
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
  if(!session || !followingSet.size){ box.classList.add("hidden"); return; }
  try{
    const ids = [...followingSet];
    // ה-RLS על travel_status כבר מגביל לשורות ששותפו במפורש (sharing_enabled) ועדיין בתוקף (travel_until) - כל שורה שחוזרת כאן פעילה
    const { data, error } = await supabase.from("travel_status").select("user_id,region,profiles(name)").in("user_id", ids);
    if(error) throw error;
    if(!data || !data.length){ box.classList.add("hidden"); return; }
    const names = data.map(r=> `${r.profiles?.name||"מטייל/ת"} (${REGIONS[r.region]||r.region})`).join(", ");
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
    const gap = above.val - rows[myIndex].val;
    sub = gap>0 ? `${above.name} מוביל/ה עליך ב-${gap.toLocaleString()} XP` : `את/ה צמוד/ה ל${above.name}!`;
  } else if(rows.length>1){
    sub = `${(rows[0].val-rows[1].val).toLocaleString()} XP לפני ${rows[1].name}`;
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
    let ids;
    if(lbScope==="friends"){ ids = Array.from(new Set([...followingSet, session.user.id])); }
    else { const { data } = await supabase.from("profiles").select("id").limit(60); ids = data.map(r=>r.id); if(!ids.includes(session.user.id)) ids.push(session.user.id); }
    if(!ids.length){ listEl.innerHTML = '<div class="empty-state">אין עדיין נתונים להצגה.</div>'; $("lbSummary").classList.add("hidden"); return; }
    const [{ data: profs, error: pErr }, { data: visits, error: vErr }] = await Promise.all([
      supabase.from("profiles").select("id,name").in("id", ids),
      supabase.from("visits").select("user_id,points_awarded,visited_at").in("user_id", ids),
    ]);
    if(pErr) throw pErr; if(vErr) throw vErr;
    const cutoff = lbPeriod==="week" ? Date.now()-7*86400000 : lbPeriod==="month" ? Date.now()-30*86400000 : 0;
    const totals = {};
    profs.forEach(p=> totals[p.id]=0);
    visits.forEach(v=>{ if(new Date(v.visited_at).getTime()>=cutoff) totals[v.user_id]=(totals[v.user_id]||0)+v.points_awarded; });
    const rows = profs.map(p=>({ id:p.id, name:p.name, val:totals[p.id]||0 })).sort((a,b)=>b.val-a.val);
    renderLbSummary(rows);
    const friendsEmptyBanner = (lbScope==="friends" && rows.length<=1)
      ? '<div class="empty-state"><div class="big">👥</div>עדיין לא עוקבים אחרי אף אחד.<br>הזמינו חברים כדי להתחרות יחד!<br><button class="btn btn-primary empty-cta" id="emptyFriendsCta">👥 הזמן חברים</button></div>'
      : "";
    listEl.innerHTML = friendsEmptyBanner + rows.map((r,i)=>{
      const isMe = r.id===session.user.id;
      const rankClass = i===0?"top1":i===1?"top2":i===2?"top3":"";
      const following = followingSet.has(r.id);
      return `<div class="lb-row${isMe?" me":""}"><div class="lb-rank ${rankClass}">${i+1}</div>
        <div class="lb-avatar" style="background:${stringColor(r.name)}">${r.name.charAt(0)}</div>
        <div class="lb-name">${r.name}${isMe?'<small>הדירוג שלך</small>':''}</div>
        ${(!isMe) ? `<button class="follow-btn${following?" following":""}" data-id="${r.id}">${following?"עוקב/ת":"עקוב/י"}</button>` : ""}
        <div class="lb-pts">${r.val.toLocaleString()}</div></div>`;
    }).join("");
    if(friendsEmptyBanner) $("emptyFriendsCta").onclick = ()=> $("inviteBtn").click();
    listEl.querySelectorAll(".follow-btn").forEach(btn=>{
      btn.onclick = async ()=>{
        const targetId = btn.dataset.id;
        btn.disabled = true;
        if(followingSet.has(targetId)){
          const { error } = await supabase.from("follows").delete().eq("follower_id",session.user.id).eq("followee_id",targetId);
          if(!error) followingSet.delete(targetId);
        } else {
          const { error } = await supabase.from("follows").insert({ follower_id:session.user.id, followee_id:targetId });
          if(!error) followingSet.add(targetId);
        }
        renderBoard(); renderFriendsTravelBanner();
      };
    });
  }catch(err){ console.error(err); listEl.innerHTML = '<div class="empty-state">שגיאה בטעינת הדירוג.</div>'; }
}
function stringColor(str){
  const palette = ["#4C7A4A","#3E6E96","#7A5C8C","#B08A3E","#1B7A72","#8C5A3C","#AD8A1E","#5A6572"];
  let h=0; for(let i=0;i<str.length;i++) h = (h*31+str.charCodeAt(i))>>>0;
  return palette[h%palette.length];
}

/* ============ FEED ============ */
function feedCardHtml(row){
  const l = lmById[row.landmark_id]; if(!l) return "";
  const cat = CATEGORIES[l.category];
  const name = row.profiles ? row.profiles.name : "מטייל/ת";
  const likedByMe = row.likes.some(x=>x.user_id===session.user.id);
  const wished = myWishlist.includes(l.id);
  const visited = myVisits.some(v=>v.landmark_id===l.id);
  const bg = row.photo_url ? `background-image:url('${row.photo_url}')` : `background:linear-gradient(135deg,${cat.color},color-mix(in srgb, ${cat.color} 55%, #000 20%))`;
  return `<div class="feed-card">
    <div class="feed-head"><div class="lb-avatar" style="background:${stringColor(name)};width:34px;height:34px;font-size:12px;">${name.charAt(0)}</div>
      <div><div class="feed-name">${name}</div><div class="feed-time">${timeAgo(row.visited_at)} · כבש/ה את ${l.name}</div></div></div>
    <div class="feed-photo" data-goto="${l.id}" style="${bg}cursor:pointer;">${row.photo_url?"":catIconSvg(cat.icon,52).replace('<svg ','<svg style="color:#fff" ')}<span class="lm-label">${l.name}</span></div>
    ${row.note ? `<div class="feed-note">"${row.note}"</div>` : ""}
    <div class="feed-actions">
      <button class="like-btn${likedByMe?" liked":""}" data-id="${row.id}" aria-label="${likedByMe?"בטל לייק":"סמן לייק"}" aria-pressed="${likedByMe}"><svg viewBox="0 0 24 24" fill="${likedByMe?"currentColor":"none"}" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-9.5-9C.7 7.8 2.6 4 6.2 4c2 0 3.5 1.1 4.3 2.4C11.3 5.1 12.8 4 14.8 4c3.6 0 5.5 3.8 3.7 7-2.5 4.6-9.5 9-9.5 9Z"/></svg><span>${row.likes.length}</span></button>
      ${visited ? "" : `<button class="feed-wish-btn${wished?" active":""}" data-lm="${l.id}">${wished?"❤️ ברשימת המשאלות":"🤍 הוסף לרשימת המשאלות"}</button>`}
    </div>
  </div>`;
}
function wireFeedCards(listEl, onChange){
  listEl.querySelectorAll(".feed-photo").forEach(el=> el.onclick = ()=> goToDestination(el.dataset.goto));
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
async function renderFeed(){
  if(!session){ setGuestGate("board", true); return; }
  setGuestGate("board", false);
  const listEl = $("feedList");
  listEl.innerHTML = skeletonCards(3);
  try{
    let { data, error } = await supabase.from("visits")
      .select("id,visited_at,photo_url,points_awarded,note,landmark_id,user_id,profiles!visits_user_id_fkey(name),likes(user_id)")
      .order("visited_at",{ascending:false}).limit(20);
    if(error && /note/i.test(error.message||"")){
      ({ data, error } = await supabase.from("visits")
        .select("id,visited_at,photo_url,points_awarded,landmark_id,user_id,profiles!visits_user_id_fkey(name),likes(user_id)")
        .order("visited_at",{ascending:false}).limit(20));
    }
    if(error) throw error;
    if(!data.length){
      listEl.innerHTML = '<div class="empty-state"><div class="big">📷</div>עדיין אין צ׳ק-אינים בפיד.<br>היו הראשונים לכבוש יעד!<br><button class="btn btn-primary empty-cta" id="emptyFeedCta">🗺️ גלו יעדים במפה</button></div>';
      $("emptyFeedCta").onclick = ()=> navigate("#/map");
      renderChallenge(); renderPersonalChallenges(); return;
    }
    listEl.innerHTML = data.map(feedCardHtml).join("");
    wireFeedCards(listEl, renderFeed);
    renderChallenge();
    renderPersonalChallenges();
  }catch(err){ console.error(err); listEl.innerHTML = '<div class="empty-state">שגיאה בטעינת הפיד.</div>'; }
}
async function renderGroupFeed(memberIds){
  const listEl = $("groupFeedList");
  if(!memberIds.length){ listEl.innerHTML = ""; return; }
  listEl.innerHTML = skeletonCards(2);
  try{
    let { data, error } = await supabase.from("visits")
      .select("id,visited_at,photo_url,points_awarded,note,landmark_id,user_id,profiles!visits_user_id_fkey(name),likes(user_id)")
      .in("user_id", memberIds).order("visited_at",{ascending:false}).limit(10);
    if(error && /note/i.test(error.message||"")){
      ({ data, error } = await supabase.from("visits")
        .select("id,visited_at,photo_url,points_awarded,landmark_id,user_id,profiles!visits_user_id_fkey(name),likes(user_id)")
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
  try{
    const { data: members, error: mErr } = await supabase.from("group_members").select("user_id, profiles(name)").eq("group_id", activeGroupId);
    if(mErr) throw mErr;
    const memberIds = members.map(m=>m.user_id);
    const nameById = Object.fromEntries(members.map(m=>[m.user_id, m.profiles?.name || "מטייל/ת"]));
    const { data: visits, error: vErr } = await supabase.from("visits").select("user_id,landmark_id,points_awarded,visited_at").in("user_id", memberIds);
    if(vErr) throw vErr;
    const byMember = {};
    memberIds.forEach(id=> byMember[id] = []);
    visits.forEach(v=> byMember[v.user_id].push(v));

    const statRows = memberIds.map(id=>{
      const vs = byMember[id];
      const xp = vs.reduce((s,v)=>s+(v.points_awarded||0),0);
      return { id, name: nameById[id], xp, streak: streakFromVisits(vs), badgeCount: BADGES.filter(b=>b.current(vs)>=b.target(vs)).length };
    }).sort((a,b)=>b.xp-a.xp);
    $("groupMemberStats").innerHTML = statRows.length ? statRows.map((r,i)=>{
      const isMe = r.id===session.user.id;
      const rankClass = i===0?"top1":i===1?"top2":i===2?"top3":"";
      return `<div class="lb-row${isMe?" me":""}"><div class="lb-rank ${rankClass}">${i+1}</div>
        <div class="lb-avatar" style="background:${stringColor(r.name)}">${r.name.charAt(0)}</div>
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
  }catch(err){ console.error(err); toast("שגיאה בטעינת נתוני הקבוצה: "+(err.message||err)); }
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
async function renderChallenge(){
  try{
    const northIds = LANDMARKS.filter(l=>l.region==="north").map(l=>l.id);
    if(!northIds.length) return;
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
    const { data } = await supabase.from("visits").select("landmark_id").in("landmark_id",northIds).gte("visited_at", startOfMonth.toISOString());
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
