import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  easy:{label:"קל",points:10}, medium:{label:"בינוני",points:25},
  hard:{label:"קשה",points:50}, extreme:{label:"מאתגר",points:100},
};
const BADGES = [
  {id:"first",label:"צעד ראשון",icon:"👣",cond:v=>v.length>=1},
  {id:"seven",label:"צועד השבעה",icon:"🥾",cond:v=>v.length>=7},
  {id:"water5",label:"כובש נחלים",icon:"💧",cond:v=>countCat(v,"water")>=5},
  {id:"hist5",label:"היסטוריון",icon:"🏺",cond:v=>(countCat(v,"archaeology")+countCat(v,"heritage"))>=5},
  {id:"north",label:"אלוף הצפון",icon:"🧭",cond:v=>regionDone(v,"north")},
  {id:"desert",label:"רץ המדבר",icon:"🏜️",cond:v=>regionDone(v,"south")&&regionDone(v,"eilat")},
  {id:"extreme",label:"מטפס ותיק",icon:"⛰️",cond:v=>countDiff(v,"extreme")>=2},
  {id:"all",label:"כל הארץ",icon:"🏆",cond:v=>v.length>=LANDMARKS.length},
];
function countCat(visited,cat){return visited.filter(v=>lmById[v.landmark_id]&&lmById[v.landmark_id].category===cat).length;}
function countDiff(visited,d){return visited.filter(v=>lmById[v.landmark_id]&&lmById[v.landmark_id].difficulty===d).length;}
function regionDone(visited,r){const ids=LANDMARKS.filter(l=>l.region===r).map(l=>l.id);return ids.length>0 && ids.every(id=>visited.some(v=>v.landmark_id===id));}

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
let userLoc = null;
let filters = { cats:[], diffs:[], regions:[], maxDist:400 };
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
function haversine(lat1,lon1,lat2,lon2){
  const R=6371, toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
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

supabase.auth.onAuthStateChange((event, newSession)=>{
  session = newSession;
  if(session){ boot(); } else { showAuth(); }
});

function showAuth(){
  $("loadingScreen").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
  $("topbar").classList.add("hidden");
  $("bottomNav").classList.add("hidden");
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  $("authForm").reset();
}

/* ============ BOOT / DATA LOAD ============ */
let booted = false;
async function boot(){
  $("authScreen").classList.add("hidden");
  $("loadingScreen").classList.remove("hidden");
  try{
    if(!LANDMARKS.length){
      const { data: lms, error: lmErr } = await supabase.from("landmarks").select("*").order("name");
      if(lmErr) throw lmErr;
      LANDMARKS = lms.map(l=>({ id:l.id, name:l.name, desc:l.description, category:l.category, difficulty:l.difficulty, region:l.region, lat:l.lat, lon:l.lon, duration:l.duration, distanceKm:l.distance_km, points:l.points, baseVisits:l.base_visits }));
      lmById = Object.fromEntries(LANDMARKS.map(l=>[l.id,l]));
    }
    await loadMyProfile();
    await Promise.all([ loadMyVisits(), loadMyWishlist(), loadFollowing(), loadVisitCounts() ]);
    prevBadgeSet = new Set(unlockedBadges().map(b=>b.id));
    flushPendingQueue();
    if(!booted){
      buildChips("catChips", CATEGORIES, "cats");
      buildChips("diffChips", DIFFS, "diffs", "teal");
      buildChips("regionChips", REGIONS, "regions", "teal");
      wireStaticUI();
      subscribeRealtime();
      booted = true;
    }
    $("loadingScreen").classList.add("hidden");
    $("topbar").classList.remove("hidden");
    $("bottomNav").classList.remove("hidden");
    document.querySelectorAll(".view").forEach(v=>{ v.classList.remove("active"); v.classList.remove("hidden"); });
    $("view-map").classList.add("active");
    syncFilterUI();
    refreshHeader();
    renderMap();
    renderProfile();
    renderBoard();
    renderFeed();
    updateOnlineStatus();
  }catch(err){
    console.error(err);
    toast("שגיאה בטעינת הנתונים: "+(err.message||err));
    $("loadingScreen").classList.add("hidden");
  }
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
async function loadVisitCounts(){
  const { data, error } = await supabase.from("visits").select("landmark_id");
  if(error) throw error;
  visitCounts = {};
  data.forEach(r=>{ visitCounts[r.landmark_id] = (visitCounts[r.landmark_id]||0)+1; });
}

function subscribeRealtime(){
  supabase.channel("public:visits-live")
    .on("postgres_changes", { event:"INSERT", schema:"public", table:"visits" }, ()=>{
      loadVisitCounts().then(renderMap);
      renderFeed(); renderBoard();
    })
    .subscribe();
  supabase.channel("public:likes-live")
    .on("postgres_changes", { event:"*", schema:"public", table:"likes" }, ()=> renderFeed())
    .subscribe();
}

/* ============ MAP PROJECTION ============ */
const LON_MIN=34.2, LON_MAX=35.9, LAT_MIN=29.45, LAT_MAX=33.35;
function projectBase(lat,lon){
  const x = 24 + (lon-LON_MIN)/(LON_MAX-LON_MIN)*352;
  const y = 24 + (LAT_MAX-lat)/(LAT_MAX-LAT_MIN)*752;
  return [x,y];
}
const OUTLINE = [
  [33.09,35.11],[33.15,35.30],[33.25,35.55],[33.32,35.78],[33.13,35.82],
  [32.87,35.78],[32.72,35.75],[32.45,35.65],[32.45,35.60],[32.20,35.58],
  [31.85,35.55],[31.53,35.52],[31.30,35.45],[31.10,35.42],[30.95,35.40],
  [30.60,35.30],[30.20,35.15],[29.90,35.05],[29.55,34.97],[29.50,34.85],
  [29.55,34.70],[30.10,34.45],[30.85,34.35],[31.10,34.28],[31.22,34.24],
  [31.45,34.35],[31.80,34.62],[32.05,34.77],[32.35,34.87],[32.50,34.90],
  [32.60,34.93],[32.83,34.97],[32.93,35.07],[33.02,35.10],[33.09,35.11],
];
const mapView = { cx:200, cy:400, s:1 };
function clampView(){
  mapView.s = Math.max(1, Math.min(6, mapView.s));
  const halfW = 200/mapView.s, halfH = 400/mapView.s;
  mapView.cx = Math.max(halfW-40, Math.min(400-halfW+40, mapView.cx));
  mapView.cy = Math.max(halfH-40, Math.min(800-halfH+40, mapView.cy));
}
function currentViewBox(){ const w=400/mapView.s, h=800/mapView.s; return { minX:mapView.cx-w/2, minY:mapView.cy-h/2, w, h }; }

function filteredLandmarks(){
  return LANDMARKS.filter(l=>{
    if(filters.cats.length && !filters.cats.includes(l.category)) return false;
    if(filters.diffs.length && !filters.diffs.includes(l.difficulty)) return false;
    if(filters.regions.length && !filters.regions.includes(l.region)) return false;
    if(userLoc && filters.maxDist<400){
      const d = haversine(userLoc.lat,userLoc.lon,l.lat,l.lon);
      if(d>filters.maxDist) return false;
    }
    return true;
  });
}

const svg = document.getElementById("mapSvg");
let dragged=false, pointers={}, lastDist=null, dragTotal=0;

function renderMap(){
  clampView();
  const vb = currentViewBox();
  svg.setAttribute("viewBox", vb.minX+" "+vb.minY+" "+vb.w+" "+vb.h);
  let html = "";
  html += '<polygon class="map-island" points="'+OUTLINE.map(([la,lo])=>projectBase(la,lo).join(",")).join(" ")+'" />';
  const [kx,ky] = projectBase(32.82,35.585);
  html += '<ellipse class="map-water-shape" cx="'+kx+'" cy="'+ky+'" rx="9" ry="13" transform="rotate(-15 '+kx+' '+ky+')"/>';
  const ds1=projectBase(31.55,35.475), ds2=projectBase(31.05,35.40);
  html += '<line x1="'+ds1[0]+'" y1="'+ds1[1]+'" x2="'+ds2[0]+'" y2="'+ds2[1]+'" stroke="var(--map-water)" stroke-width="9" stroke-linecap="round" opacity="0.9"/>';

  const items = filteredLandmarks().map(l=>{ const [x,y]=projectBase(l.lat,l.lon); return {l,x,y}; });
  const threshold = 55/mapView.s;
  const clusters = []; const used = new Array(items.length).fill(false);
  for(let i=0;i<items.length;i++){
    if(used[i]) continue;
    const group=[items[i]]; used[i]=true;
    for(let j=i+1;j<items.length;j++){
      if(used[j]) continue;
      const dx=items[i].x-items[j].x, dy=items[i].y-items[j].y;
      if(Math.sqrt(dx*dx+dy*dy)<threshold){ group.push(items[j]); used[j]=true; }
    }
    clusters.push(group);
  }
  clusters.forEach(group=>{
    if(group.length===1){
      const {l,x,y} = group[0];
      const visited = myVisits.some(v=>v.landmark_id===l.id);
      const wished = myWishlist.includes(l.id);
      const col = CATEGORIES[l.category].color;
      html += '<g class="marker'+(visited?" visited":"")+'" data-id="'+l.id+'" transform="translate('+x+','+y+')">'
        + '<circle class="halo" r="17" fill="'+col+'"/>'
        + '<circle class="ring" r="11" fill="'+col+'" class="pin"/>'
        + (visited ? '<path class="check" d="M-4 0 L-1 3 L5 -4" stroke="var(--surface)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' : '<circle r="3.2" fill="var(--surface)"/>')
        + (wished ? '<path class="wish-star" transform="translate(8,-9) scale(0.45)" d="M0-8 2-2 8-2 3 2 5 8 0 4-5 8-3 2-8-2-2-2Z"/>' : "")
        + "</g>";
    } else {
      const cx = group.reduce((s,g)=>s+g.x,0)/group.length;
      const cy = group.reduce((s,g)=>s+g.y,0)/group.length;
      html += '<g class="cluster" data-cluster="'+group.map(g=>g.l.id).join(",")+'" transform="translate('+cx+','+cy+')"><circle r="15"/><text x="0" y="5" text-anchor="middle">'+group.length+"</text></g>";
    }
  });
  if(userLoc){
    const [ux,uy] = projectBase(userLoc.lat, userLoc.lon);
    html += '<circle cx="'+ux+'" cy="'+uy+'" r="7" fill="var(--teal)" stroke="var(--surface)" stroke-width="2.5"/><circle cx="'+ux+'" cy="'+uy+'" r="13" fill="var(--teal)" opacity="0.25"/>';
  }
  svg.innerHTML = html;
  $("visibleCount").textContent = filteredLandmarks().length+" יעדים";
  svg.querySelectorAll(".marker").forEach(el=> el.addEventListener("click",()=>{ if(!dragged) openDetail(el.getAttribute("data-id")); }));
  svg.querySelectorAll(".cluster").forEach(el=> el.addEventListener("click",()=>{
    if(dragged) return;
    const ids = el.getAttribute("data-cluster").split(",");
    const pts = ids.map(id=>projectBase(lmById[id].lat,lmById[id].lon));
    mapView.cx = pts.reduce((s,p)=>s+p[0],0)/pts.length;
    mapView.cy = pts.reduce((s,p)=>s+p[1],0)/pts.length;
    mapView.s = Math.min(6, mapView.s*2.2);
    renderMap();
  }));
}

const mapWrap = $("mapWrap");
function svgPixelToUser(px,py){
  const rect = svg.getBoundingClientRect(); const vb = currentViewBox();
  return [ vb.minX + (px-rect.left)/rect.width*vb.w, vb.minY + (py-rect.top)/rect.height*vb.h ];
}
mapWrap.addEventListener("pointerdown",e=>{ mapWrap.setPointerCapture(e.pointerId); pointers[e.pointerId]={x:e.clientX,y:e.clientY}; dragged=false; dragTotal=0; });
mapWrap.addEventListener("pointermove",e=>{
  if(!pointers[e.pointerId]) return;
  pointers[e.pointerId] = {x:e.clientX,y:e.clientY};
  const ids = Object.keys(pointers);
  if(ids.length===1){
    const dx=e.movementX||0, dy=e.movementY||0;
    dragTotal += Math.abs(dx)+Math.abs(dy);
    if(dragTotal>6) dragged=true;
    const rect=svg.getBoundingClientRect(); const vb=currentViewBox();
    mapView.cx -= dx/rect.width*vb.w; mapView.cy -= dy/rect.height*vb.h;
    clampView(); renderMap();
  } else if(ids.length===2){
    const [p1,p2] = ids.map(id=>pointers[id]);
    const dist = Math.hypot(p1.x-p2.x,p1.y-p2.y);
    if(lastDist){ dragged=true; mapView.s *= dist/lastDist; clampView(); renderMap(); }
    lastDist = dist;
  }
});
function endPointer(e){ delete pointers[e.pointerId]; if(Object.keys(pointers).length<2) lastDist=null; }
mapWrap.addEventListener("pointerup",endPointer);
mapWrap.addEventListener("pointercancel",endPointer);
mapWrap.addEventListener("wheel",e=>{
  e.preventDefault();
  const [ux,uy] = svgPixelToUser(e.clientX,e.clientY);
  mapView.s *= e.deltaY<0 ? 1.25 : 0.8; clampView();
  const [ux2,uy2] = svgPixelToUser(e.clientX,e.clientY);
  mapView.cx += (ux-ux2); mapView.cy += (uy-uy2); clampView(); renderMap();
},{passive:false});

function wireStaticUI(){
  $("zoomIn").onclick=()=>{mapView.s*=1.5;clampView();renderMap();};
  $("zoomOut").onclick=()=>{mapView.s/=1.5;clampView();renderMap();};
  $("zoomReset").onclick=()=>{mapView.cx=200;mapView.cy=400;mapView.s=1;renderMap();};
  $("locateBtn").onclick=()=>{
    if(!navigator.geolocation){ toast("המכשיר לא תומך באיתור מיקום"); return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      userLoc = {lat:pos.coords.latitude, lon:pos.coords.longitude};
      $("distHint").textContent = "המיקום שלך אותר — ניתן לסנן לפי מרחק נסיעה";
      toast("המיקום אותר בהצלחה"); renderMap();
    }, ()=> toast("לא הצלחנו לאתר מיקום — יש לאשר גישה למיקום בדפדפן"), {enableHighAccuracy:true, timeout:8000});
  };
  $("openFilters").onclick=()=>{ syncFilterUI(); openSheet("filterSheet","filterScrim"); };
  $("closeFilters").onclick=()=>closeSheet("filterSheet","filterScrim");
  $("filterScrim").onclick=()=>closeSheet("filterSheet","filterScrim");
  $("clearFilters").onclick=()=>{ filters={cats:[],diffs:[],regions:[],maxDist:400}; syncFilterUI(); renderMap(); };
  $("applyFilters").onclick=()=>{ renderMap(); closeSheet("filterSheet","filterScrim"); syncFilterUI(); };
  $("distRange").oninput = e=>{ filters.maxDist=Number(e.target.value); $("distVal").textContent = filters.maxDist>=400?"ללא הגבלה":filters.maxDist+' ק"מ'; };
  $("detailScrim").onclick=()=>closeSheet("detailSheet","detailScrim");
  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
      $("view-"+btn.dataset.view).classList.add("active");
      if(btn.dataset.view==="map") setTimeout(renderMap,0);
      if(btn.dataset.view==="board") renderBoard();
      if(btn.dataset.view==="feed") renderFeed();
      if(btn.dataset.view==="profile") renderProfile();
    };
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
  $("scopeSeg").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    $("scopeSeg").querySelectorAll("button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); lbScope=b.dataset.scope; renderBoard();
  });
  $("periodSeg").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    $("periodSeg").querySelectorAll("button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active"); lbPeriod=b.dataset.period; renderBoard();
  });
  window.addEventListener("online", ()=>{ updateOnlineStatus(); flushPendingQueue(); });
  window.addEventListener("offline", updateOnlineStatus);
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
function syncFilterUI(){
  document.querySelectorAll("#catChips .chip").forEach(c=>c.classList.toggle("active", filters.cats.includes(c.dataset.id)));
  document.querySelectorAll("#diffChips .chip").forEach(c=>c.classList.toggle("active", filters.diffs.includes(c.dataset.id)));
  document.querySelectorAll("#regionChips .chip").forEach(c=>c.classList.toggle("active", filters.regions.includes(c.dataset.id)));
  $("distRange").value = filters.maxDist;
  $("distVal").textContent = filters.maxDist>=400 ? "ללא הגבלה" : filters.maxDist+' ק"מ';
  const hasFilters = filters.cats.length||filters.diffs.length||filters.regions.length||filters.maxDist<400;
  $("openFilters").classList.toggle("has-filters", !!hasFilters);
}
function openSheet(sheetId, scrimId){ $(sheetId).classList.add("open"); $(scrimId).classList.add("open"); }
function closeSheet(sheetId, scrimId){ $(sheetId).classList.remove("open"); $(scrimId).classList.remove("open"); }

/* ============ LANDMARK DETAIL & CHECK-IN ============ */
let activeCheckinPhoto = null, demoMode = false;
function openDetail(id){
  const l = lmById[id];
  const visitedEntry = myVisits.find(v=>v.landmark_id===id);
  const wished = myWishlist.includes(id);
  const cat = CATEGORIES[l.category];
  const totalVisits = l.baseVisits + (visitCounts[id]||0);
  $("detailBody").innerHTML = `
    <div class="lm-hero" style="background:linear-gradient(135deg, ${cat.color}, color-mix(in srgb, ${cat.color} 60%, #000 15%))">
      ${catIconSvg(cat.icon,110).replace('<svg ','<svg style="color:#fff" ')}
      <span class="badge-count">${totalVisits.toLocaleString()} כובשים</span>
    </div>
    <div class="lm-title-row"><div><h2>${l.name}</h2>
      <div class="lm-region">${REGIONS[l.region]} · <span class="cat-tag" style="background:${cat.color}">${catIconSvg(cat.icon,12)} ${cat.label}</span></div>
    </div></div>
    <p class="lm-desc">${l.desc}</p>
    <div class="lm-stats">
      <div class="lm-stat"><div class="v">${DIFFS[l.difficulty].label}</div><div class="l">קושי</div></div>
      <div class="lm-stat"><div class="v">${l.duration}</div><div class="l">זמן משוער</div></div>
      <div class="lm-stat"><div class="v">${l.distanceKm} ק"מ</div><div class="l">הליכה</div></div>
      <div class="lm-stat"><div class="v">+${DIFFS[l.difficulty].points}</div><div class="l">נקודות</div></div>
    </div>
    ${visitedEntry ? `<div class="checkin-status ok"><span class="ic">✓</span> כבשת את היעד הזה ב-${new Date(visitedEntry.visited_at).toLocaleDateString('he-IL')}${visitedEntry.pending?' · ממתין לסנכרון':''}</div>` : ""}
    <div class="lm-actions">
      <button class="btn btn-outline" id="wishBtn">${wished?"★ ברשימת המשאלות":"☆ הוסף למשאלות"}</button>
      <button class="btn btn-primary" id="checkinBtn" ${visitedEntry?"disabled":""}>${visitedEntry?"נכבש":"סמן שהגעתי"}</button>
    </div>
    <div id="checkinFlow"></div>
  `;
  $("wishBtn").onclick = async ()=>{
    $("wishBtn").disabled = true;
    if(myWishlist.includes(id)){
      const { error } = await supabase.from("wishlist").delete().eq("user_id",session.user.id).eq("landmark_id",id);
      if(!error) myWishlist = myWishlist.filter(x=>x!==id);
    } else {
      const { error } = await supabase.from("wishlist").insert({ user_id:session.user.id, landmark_id:id });
      if(!error) myWishlist.push(id);
    }
    openDetail(id); renderMap(); renderProfile();
  };
  if(!visitedEntry) $("checkinBtn").onclick=()=>startCheckin(l);
  $("detailSheet").style.maxHeight="90%";
  openSheet("detailSheet","detailScrim");
}

function startCheckin(l){
  activeCheckinPhoto = null;
  $("checkinFlow").innerHTML = `
    <div class="checkin-status" id="gpsStatus"><span class="ic">📡</span> מאתר מיקום GPS...</div>
    <div class="demo-toggle"><span>מצב הדגמה (עוקף בדיקת מרחק לצורך בדיקה)</span>
      <label class="switch"><input type="checkbox" id="demoSwitch" ${demoMode?"checked":""}><span class="track"></span></label></div>
    <div id="photoStep" class="hidden">
      <div class="photo-drop" id="photoDrop">📷 הקש כדי לצלם תמונת אימות במיקום</div>
      <input type="file" accept="image/*" capture="environment" id="photoInput">
      <img class="photo-preview hidden" id="photoPreview">
      <button class="btn btn-primary btn-block" id="confirmCheckin" disabled>אשר צ'ק-אין</button>
    </div>`;
  $("demoSwitch").onchange = e=>{ demoMode=e.target.checked; runGpsCheck(l); };
  $("photoDrop").onclick=()=>$("photoInput").click();
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

async function confirmCheckin(l){
  const pts = pointsFor(l);
  if(!navigator.onLine){
    const pending = { landmarkId:l.id, dataUrl:activeCheckinPhoto?activeCheckinPhoto.dataUrl:null, points:pts, ts:new Date().toISOString() };
    const queue = JSON.parse(localStorage.getItem(PENDING_KEY)||"[]");
    queue.push(pending); localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
    myVisits.push({ landmark_id:l.id, visited_at:pending.ts, photo_url:pending.dataUrl, points_awarded:pts, pending:true });
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
    const { data, error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:l.id, photo_url:photoUrl, points_awarded:pts }).select().single();
    if(error) throw error;
    myVisits.push(data);
    refreshHeader(); closeSheet("detailSheet","detailScrim");
    const firstInCat = pts>DIFFS[l.difficulty].points;
    toast("צ'ק-אין אושר! +"+pts+" נקודות"+(firstInCat?" (+15 בונוס קטגוריה ראשונה)":""));
    checkNewBadges();
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
      const { error } = await supabase.from("visits").insert({ user_id:session.user.id, landmark_id:item.landmarkId, photo_url:photoUrl, points_awarded:item.points });
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
function unlockedBadges(){ return BADGES.filter(b=>b.cond(myVisits)); }
function checkNewBadges(){
  const now = unlockedBadges();
  const newOnes = now.filter(b=>!prevBadgeSet.has(b.id));
  prevBadgeSet = new Set(now.map(b=>b.id));
  newOnes.forEach(b=> setTimeout(()=>toast("תג חדש נפתח: "+b.icon+" "+b.label), 900));
}
function isoWeekKey(d){
  const date = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day = (date.getUTCDay()+6)%7;
  date.setUTCDate(date.getUTCDate()-day+3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(),0,4));
  const week = 1+Math.round(((date-firstThu)/86400000-3+((firstThu.getUTCDay()+6)%7))/7);
  return date.getUTCFullYear()+"-W"+week;
}
function computeStreak(){
  if(!myVisits.length) return 0;
  const weeks = new Set(myVisits.map(v=>isoWeekKey(new Date(v.visited_at))));
  let cursor = new Date(), streak=0;
  while(weeks.has(isoWeekKey(cursor))){ streak++; cursor.setDate(cursor.getDate()-7); }
  return streak;
}
function totalPoints(){ return myVisits.reduce((s,v)=>s+(v.points_awarded||0),0); }

/* ============ HEADER ============ */
function refreshHeader(){
  $("pointsVal").textContent = totalPoints().toLocaleString();
  $("streakVal").textContent = computeStreak();
}

/* ============ PROFILE ============ */
function renderProfile(){
  if(!myProfile) return;
  $("profAvatar").textContent = myProfile.name.trim().charAt(0) || "א";
  $("profName").firstChild.textContent = myProfile.name;
  $("profSub").textContent = (myVisits.length?"מטייל/ת פעיל/ה":"מצטרפ/ת חדש/ה")+" · "+myVisits.length+" יעדים נכבשו";
  const pct = LANDMARKS.length ? Math.round(myVisits.length/LANDMARKS.length*100) : 0;
  $("progNum").firstChild.textContent = myVisits.length;
  $("progNum").querySelector("span").textContent = "/ "+LANDMARKS.length+" יעדים";
  $("progPct").textContent = pct+"%";
  $("progBar").style.width = pct+"%";
  $("statPoints").textContent = totalPoints().toLocaleString();
  $("statStreak").textContent = computeStreak();
  const ub = unlockedBadges();
  $("statBadges").textContent = ub.length+"/"+BADGES.length;
  $("badgeGrid").innerHTML = BADGES.map(b=>{
    const on = ub.some(u=>u.id===b.id);
    return '<div class="badge'+(on?" unlocked":"")+'"><div class="circ">'+b.icon+'</div><div class="lbl">'+b.label+"</div></div>";
  }).join("");
  const listEl = $("profList");
  if(profileListTab==="visited"){
    if(!myVisits.length){
      listEl.innerHTML = '<div class="empty-state"><div class="big">🗺️</div>עדיין לא כבשת יעדים.<br>צאו לטייל ועשו צ׳ק-אין ביעד הראשון!</div>';
    } else {
      listEl.innerHTML = myVisits.slice().sort((a,b)=>new Date(b.visited_at)-new Date(a.visited_at)).map(v=>{
        const l = lmById[v.landmark_id]; if(!l) return "";
        const cat = CATEGORIES[l.category];
        const thumb = v.photo_url ? `<img src="${v.photo_url}">` : catIconSvg(cat.icon,24);
        return `<div class="mini-card" data-id="${l.id}"><div class="mini-thumb" style="background:${cat.color};color:#fff">${thumb}</div>
          <div class="mini-info"><div class="name">${l.name}</div><div class="sub">${new Date(v.visited_at).toLocaleDateString('he-IL')}${v.pending?' · ממתין לסנכרון':''}</div></div>
          <div class="mini-pts">+${v.points_awarded}</div></div>`;
      }).join("");
    }
  } else {
    if(!myWishlist.length){
      listEl.innerHTML = '<div class="empty-state"><div class="big">⭐</div>רשימת המשאלות ריקה.<br>שמרו יעדים מהמפה לטיול הבא.</div>';
    } else {
      listEl.innerHTML = myWishlist.map(id=>{
        const l = lmById[id]; if(!l) return ""; const cat = CATEGORIES[l.category];
        return `<div class="mini-card" data-id="${l.id}"><div class="mini-thumb" style="background:${cat.color};color:#fff">${catIconSvg(cat.icon,24)}</div>
          <div class="mini-info"><div class="name">${l.name}</div><div class="sub">${REGIONS[l.region]} · ${l.duration}</div></div>
          <div class="mini-pts">${DIFFS[l.difficulty].label}</div></div>`;
      }).join("");
    }
  }
  listEl.querySelectorAll(".mini-card").forEach(el=>el.onclick=()=>openDetail(el.dataset.id));
}

/* ============ LEADERBOARD ============ */
async function renderBoard(){
  if(!session) return;
  const listEl = $("lbList");
  listEl.innerHTML = '<div class="empty-state">טוען דירוג...</div>';
  try{
    let ids;
    if(lbScope==="friends"){ ids = Array.from(new Set([...followingSet, session.user.id])); }
    else { const { data } = await supabase.from("profiles").select("id").limit(60); ids = data.map(r=>r.id); if(!ids.includes(session.user.id)) ids.push(session.user.id); }
    if(!ids.length){ listEl.innerHTML = '<div class="empty-state">אין עדיין נתונים להצגה.</div>'; return; }
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
    listEl.innerHTML = rows.map((r,i)=>{
      const isMe = r.id===session.user.id;
      const rankClass = i===0?"top1":i===1?"top2":i===2?"top3":"";
      const following = followingSet.has(r.id);
      return `<div class="lb-row${isMe?" me":""}"><div class="lb-rank ${rankClass}">${i+1}</div>
        <div class="lb-avatar" style="background:${stringColor(r.name)}">${r.name.charAt(0)}</div>
        <div class="lb-name">${r.name}${isMe?'<small>הדירוג שלך</small>':''}</div>
        ${(!isMe) ? `<button class="follow-btn${following?" following":""}" data-id="${r.id}">${following?"עוקב/ת":"עקוב/י"}</button>` : ""}
        <div class="lb-pts">${r.val.toLocaleString()}</div></div>`;
    }).join("");
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
        renderBoard();
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
async function renderFeed(){
  if(!session) return;
  const listEl = $("feedList");
  listEl.innerHTML = '<div class="empty-state">טוען פיד...</div>';
  try{
    const { data, error } = await supabase.from("visits")
      .select("id,visited_at,photo_url,points_awarded,landmark_id,user_id,profiles!visits_user_id_fkey(name),likes(user_id)")
      .order("visited_at",{ascending:false}).limit(20);
    if(error) throw error;
    if(!data.length){ listEl.innerHTML = '<div class="empty-state"><div class="big">📷</div>עדיין אין צ׳ק-אינים בפיד.<br>היו הראשונים לכבוש יעד!</div>'; renderChallenge(); return; }
    listEl.innerHTML = data.map(row=>{
      const l = lmById[row.landmark_id]; if(!l) return "";
      const cat = CATEGORIES[l.category];
      const name = row.profiles ? row.profiles.name : "מטייל/ת";
      const likedByMe = row.likes.some(x=>x.user_id===session.user.id);
      const bg = row.photo_url ? `background-image:url('${row.photo_url}')` : `background:linear-gradient(135deg,${cat.color},color-mix(in srgb, ${cat.color} 55%, #000 20%))`;
      return `<div class="feed-card">
        <div class="feed-head"><div class="lb-avatar" style="background:${stringColor(name)};width:34px;height:34px;font-size:12px;">${name.charAt(0)}</div>
          <div><div class="feed-name">${name}</div><div class="feed-time">${timeAgo(row.visited_at)} · כבש/ה את ${l.name}</div></div></div>
        <div class="feed-photo" style="${bg}">${row.photo_url?"":catIconSvg(cat.icon,52).replace('<svg ','<svg style="color:#fff" ')}<span class="lm-label">${l.name}</span></div>
        <div class="feed-actions"><button class="like-btn${likedByMe?" liked":""}" data-id="${row.id}"><svg viewBox="0 0 24 24" fill="${likedByMe?"currentColor":"none"}" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-9.5-9C.7 7.8 2.6 4 6.2 4c2 0 3.5 1.1 4.3 2.4C11.3 5.1 12.8 4 14.8 4c3.6 0 5.5 3.8 3.7 7-2.5 4.6-9.5 9-9.5 9Z"/></svg><span>${row.likes.length}</span></button></div>
      </div>`;
    }).join("");
    listEl.querySelectorAll(".like-btn").forEach(btn=>{
      btn.onclick = async ()=>{
        const visitId = btn.dataset.id;
        const liked = btn.classList.contains("liked");
        btn.disabled = true;
        if(liked) await supabase.from("likes").delete().eq("user_id",session.user.id).eq("visit_id",visitId);
        else await supabase.from("likes").insert({ user_id:session.user.id, visit_id:visitId });
        renderFeed();
      };
    });
    renderChallenge();
  }catch(err){ console.error(err); listEl.innerHTML = '<div class="empty-state">שגיאה בטעינת הפיד.</div>'; }
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

/* ============ INIT ============ */
(async function init(){
  const { data } = await supabase.auth.getSession();
  session = data.session;
  if(session) boot(); else showAuth();
})();
