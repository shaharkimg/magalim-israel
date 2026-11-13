/* ביס־סייפ — ניתוב ותצוגות. אתר סטטי, ללא build. */
(function () {
  "use strict";

  /* ================== הגדרות ==================
     formEndpoint   – כתובת לקבלת הפניות (למשל Formspree: https://formspree.io/f/XXXX).
                      כל עוד ריק, הטופס מציג הודעת הצלחה בלי לשלוח בפועל (מצב תצוגה).
     whatsappNumber – מספר בפורמט בינלאומי בלי + ובלי מקפים, למשל 972501234567. */
  const CONFIG = {
    formEndpoint: "",
    whatsappNumber: "",
    whatsappText: "שלום לירון, הגעתי מאתר ביס־סייפ ואשמח לשאול על",
  };

  /* ================== נתונים ================== */
  const AGES = [
    { id: "0-3m", label: "לידה עד 3 חודשים", tag: "מתחילים להכיר" },
    { id: "3-6m", label: "3–6 חודשים", tag: "קולות, חיוכים וקשר" },
    { id: "6-9m", label: "6–9 חודשים", tag: "מגלים עוד דרכים לתקשר" },
    { id: "9-12m", label: "9–12 חודשים", tag: "מבינים, מסמנים ומשתתפים" },
    { id: "12-18m", label: "שנה עד שנה וחצי", tag: "מגלים מילים ומשמעויות" },
    { id: "18-24m", label: "שנה וחצי עד שנתיים", tag: "מחברים מילים ורעיונות" },
    { id: "2-3y", label: "שנתיים עד שלוש", tag: "מדברים, משחקים ומגלים עצמאות" },
    { id: "3-4y", label: "שלוש עד ארבע", tag: "מספרים יותר על העולם שלנו" },
    { id: "4-6y", label: "ארבע עד שש", tag: "מרחיבים שפה, לקראת בית הספר" },
  ];

  const TOPICS = [
    { id: "language", cls: "t-language", icon: "chat", name: "שפה ודיבור", desc: "הבנה, מילים, משפטים והדרך שבה הילדים מבטאים את עצמם.", cta: "לתוכן על שפה ודיבור" },
    { id: "play", cls: "t-play", icon: "blocks", name: "תקשורת ומשחק", desc: "מחוות, יוזמה, שיתוף ומשחק משותף ברגעים הקטנים של היום.", cta: "לתוכן על תקשורת ומשחק" },
    { id: "eating", cls: "t-eating", icon: "bowl", name: "אכילה ותפקודי פה", short: "אכילה", desc: "התנסויות באוכל, מרקמים, לעיסה והחוויה המשפחתית סביב הארוחה.", cta: "לתוכן על אכילה" },
  ];

  /* פריטי ספרייה לדוגמה — להחלפה בתוכן האמיתי */
  const LIBRARY = [
    { id: "l1", title: "פרצופים, קולות ותגובות", age: "3-6m", topic: "play", includes: ["סרטון הדגמה"], dur: 4, open: true },
    { id: "l2", title: "היכרות עם מרקמים חדשים", age: "6-9m", topic: "eating", includes: ["סרטון הדגמה", "דף עזר"], dur: 10, open: false },
    { id: "l3", title: "משחק תורות על השטיח", age: "9-12m", topic: "play", includes: ["סרטון הדגמה", "מדריך"], dur: 6, open: false },
    { id: "l4", title: "קריאה משותפת בספר תמונות", age: "12-18m", topic: "language", includes: ["סרטון הדגמה", "דף עזר"], dur: 8, open: true },
    { id: "l5", title: "שירים ותנועות בשגרת הבוקר", age: "18-24m", topic: "language", includes: ["סרטון הדגמה"], dur: 5, open: true },
    { id: "l6", title: "ארוחה משפחתית רגועה", age: "2-3y", topic: "eating", includes: ["מדריך", "דף עזר"], dur: 12, open: false },
    { id: "l7", title: "לספר מה קרה היום", age: "4-6y", topic: "language", includes: ["סרטון הדגמה", "דף עזר"], dur: 7, open: false },
    { id: "l8", title: "משחק דמיון עם חפצים מהבית", age: "3-4y", topic: "play", includes: ["סרטון הדגמה", "מדריך"], dur: 9, open: false },
  ];

  const FAQ = [
    ["אפשר לקרוא באתר בלי להירשם?", "כן. המידע הבסיסי על שלבי ההתפתחות והתכנים המסומנים כפתוחים זמינים ללא הרשמה. הגישה לתוכן נוסף מפורטת בעמוד הספרייה."],
    ["איך יודעים מאיפה להתחיל?", "אפשר לבחור לפי גיל הילד או לפי הנושא שמעסיק אתכם. אין צורך לקרוא הכול."],
    ["צריך לבצע את כל הפעילויות?", "לא. הרעיונות נועדו לבחירה ולהתאמה לשגרה שלכם. אין צורך להספיק את כולם."],
    ["אפשר לפנות גם בלי לדעת אם צריך אבחון?", "כן. אפשר לתאר את השאלה ולברר מה מתאים להמשך."],
    ["האם התוכן מחליף טיפול או אבחון?", "לא. התוכן באתר הוא מידע כללי. אבחון וטיפול דורשים התייחסות אישית."],
  ];

  const ageById = (id) => AGES.find((a) => a.id === id);
  const topicById = (id) => TOPICS.find((t) => t.id === id);

  /* ================== אחסון מקומי (עם הגנה) ================== */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("bs_" + key); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, val) { try { localStorage.setItem("bs_" + key, JSON.stringify(val)); } catch (e) { /* ignore */ } },
  };
  const getSaved = () => store.get("saved", []);
  const isSaved = (id) => getSaved().includes(id);
  function toggleSaved(id) {
    const s = getSaved();
    const i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1); else s.push(id);
    store.set("saved", s);
    return i < 0;
  }

  /* ================== אייקונים ================== */
  const ICONS = {
    chat: '<path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 20l1.2-3.6C3.4 15.1 3 13.6 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    blocks: '<rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><rect x="8" y="3" width="8" height="8" rx="1.5"/>',
    bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7.5c0-1.5 1-2 1-3.5M12 7.5c0-1.5 1-2 1-3.5M16 7.5c0-1.5 1-2 1-3.5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    home: '<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
    sign: '<path d="M12 3v18M5 6h11l3 3-3 3H5z"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    guide: '<path d="M2 5c3-1 7-1 10 1 3-2 7-2 10-1v14c-3-1-7-1-10 1-3-2-7-2-10-1Z"/><path d="M12 6v14"/>',
    sheet: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
    resume: '<circle cx="12" cy="12" r="9"/><path d="M14 8.5v7l-5-3.5z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>';
  const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-1.7-.1a15.6 15.6 0 0 1-5.6-4.6c-.8-1-1.3-2.2-1.3-3.3 0-1.1.6-1.7.8-1.9.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.2 1.6 2a7.6 7.6 0 0 0 2.4 1.5c.3.1.5.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.4Z"/></svg>';

  /* ================== רכיבים משותפים ================== */
  function waLink() {
    const text = encodeURIComponent(CONFIG.whatsappText);
    const n = (CONFIG.whatsappNumber || "").replace(/\D/g, "");
    return n ? `https://wa.me/${n}?text=${text}` : `https://wa.me/?text=${text}`;
  }

  function ageCards(topicId) {
    return `<div class="age-grid">${AGES.map((a, i) => {
      const size = 14 + i * 3.6;
      const href = `#/age/${a.id}${topicId ? "/" + topicId : ""}`;
      return `<a class="age-card" href="${href}">
        <span class="age-dot" aria-hidden="true"><span style="width:${size}px;height:${size}px"></span></span>
        <span><span class="age-label">${a.label}</span><span class="age-tag">${a.tag}</span></span>
        <span class="chev" aria-hidden="true">←</span>
      </a>`;
    }).join("")}</div>`;
  }

  function topicCards(headingLevel) {
    const h = headingLevel || "h3";
    return `<div class="topic-grid">${TOPICS.map((t) => `
      <article class="topic-card ${t.cls}">
        <span class="topic-icon">${icon(t.icon)}</span>
        <${h}>${t.name}</${h}>
        <p>${t.desc}</p>
        <a class="btn btn-outline btn-sm" href="#/topic/${t.id}">${t.cta}</a>
      </article>`).join("")}</div>`;
  }

  function faqBlock() {
    return `<div class="faq">${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`;
  }

  function slot(text) {
    return `<div class="slot"><span class="slot-tag">תוכן בהכנה</span><p>${text}</p></div>`;
  }

  function contactCta(title, text, btn) {
    return `<section class="section-sm"><div class="container"><div class="contact-cta">
      <span class="eyebrow">פנייה אישית</span>
      <h2>${title}</h2>
      ${text ? `<p class="lead">${text}</p>` : ""}
      <div class="actions" style="justify-content:center">
        <a class="btn btn-coral" href="#/consult">${btn}</a>
      </div>
    </div></div></section>`;
  }

  function heroArt() {
    return `<svg viewBox="0 0 440 420" role="img" aria-label="איור: בועות דיבור וקערת אוכל">
      <path d="M226 24c104 4 190 66 192 176 2 112-80 196-196 198C106 400 22 326 22 214 22 104 116 20 226 24Z" fill="#E7EFE6"/>
      <circle cx="380" cy="64" r="16" fill="#F7ECD3"/>
      <circle cx="54" cy="96" r="10" fill="#F9E6DD"/>
      <circle cx="404" cy="300" r="8" fill="#D7724F" opacity=".5"/>
      <g>
        <rect x="64" y="132" width="132" height="84" rx="42" fill="#D7724F"/>
        <path d="M150 208l34 34-6-40z" fill="#D7724F"/>
        <path d="M98 174c10-12 20 12 30 0s20 12 30 0" fill="none" stroke="#FBF6EE" stroke-width="6" stroke-linecap="round"/>
      </g>
      <g>
        <rect x="176" y="62" width="214" height="136" rx="60" fill="#2F5D5A"/>
        <path d="M322 190l40 46-4-58z" fill="#2F5D5A"/>
        <circle cx="236" cy="130" r="12" fill="#FBF6EE"/>
        <circle cx="283" cy="130" r="12" fill="#D9A441"/>
        <circle cx="330" cy="130" r="12" fill="#FBF6EE"/>
      </g>
      <g>
        <circle cx="186" cy="262" r="12" fill="#8FAF95"/>
        <circle cx="214" cy="254" r="14" fill="#D7724F" opacity=".85"/>
        <circle cx="244" cy="262" r="11" fill="#8FAF95"/>
        <path d="M118 286h204a102 88 0 0 1-204 0Z" fill="#D9A441"/>
        <rect x="108" y="276" width="224" height="18" rx="9" fill="#C8922F"/>
        <path d="M150 320c30 14 110 14 140 0" fill="none" stroke="#F7ECD3" stroke-width="5" stroke-linecap="round" opacity=".7"/>
      </g>
      <g transform="rotate(-28 340 300)">
        <ellipse cx="340" cy="250" rx="16" ry="22" fill="#FBF6EE" stroke="#2F5D5A" stroke-width="5"/>
        <rect x="335" y="270" width="10" height="70" rx="5" fill="#2F5D5A"/>
      </g>
    </svg>`;
  }

  /* ================== תצוגות ================== */
  function viewHome() {
    return `
    <section class="hero">
      <div class="container hero-grid">
        <div class="fade-in">
          <span class="hero-kicker"><span class="dot"></span>שפה, תקשורת ואכילה. מלידה ועד כיתה א׳.</span>
          <h1>להבין את השלב שלהם.<br><em>למצוא את הדרך שלכם.</em></h1>
          <p class="lead">בין המלמול הראשון לשיחה שלמה, ובין ההתנסות הראשונה באוכל לארוחה משפחתית, עולות הרבה שאלות.</p>
          <p class="lead">כאן תמצאו מידע ברור על התפתחות שפה, תקשורת ואכילה, רעיונות לשגרה בבית ואפשרות לליווי אישי — בהתאם לגיל, לצרכים ולמשפחה שלכם.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" type="button" data-scroll="ages">למציאת השלב שלנו</button>
            <a class="btn btn-ghost" href="#/consult">יש לי שאלה</a>
          </div>
          <p class="note">אפשר להתחיל לקרוא בלי הרשמה.</p>
        </div>
        <div class="hero-art">${heroArt()}</div>
      </div>
    </section>

    <section class="section section-white" id="ages">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">בחירת גיל</span>
          <h2>מה מעסיק אתכם בשלב הזה?</h2>
          <p class="lead">בחרו את גיל הילד או הילדה כדי להגיע לתוכן המתאים לכם.</p>
        </div>
        ${ageCards()}
        <p class="note age-disclaimer">החלוקה לגילאים עוזרת להתמצא בתוכן. היא אינה מבחן או קביעה לגבי ההתפתחות של ילדכם.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">בחירת נושא</span>
          <h2>אפשר להתחיל גם מהשאלה שלכם</h2>
        </div>
        ${topicCards()}
      </div>
    </section>

    <section class="section section-alt">
      <div class="container approach">
        <div>
          <span class="eyebrow">הגישה</span>
          <h2>לא צריך להפוך את הבית לחדר טיפולים</h2>
          <p class="lead">ספר לפני השינה, משחק על השטיח או ארוחה משותפת יכולים להיות הזדמנות להתבונן, להתחבר וללמוד.</p>
          <p>המטרה כאן היא לעזור לכם להבין מה אתם רואים ולבחור רעיונות שמתאימים לחיים שלכם — בלי להעמיס עוד משימות על היום.</p>
        </div>
        <div class="moments" aria-hidden="true">
          <div class="moment"><span class="moment-icon" style="background:var(--teal-50);color:var(--teal)">${icon("moon")}</span><div><strong>ספר לפני השינה</strong><span>רגע שקט של מילים, תמונות וקרבה</span></div></div>
          <div class="moment"><span class="moment-icon" style="background:var(--coral-50);color:var(--coral)">${icon("blocks")}</span><div><strong>משחק על השטיח</strong><span>תורות, חיקוי והפתעות קטנות</span></div></div>
          <div class="moment"><span class="moment-icon" style="background:var(--mustard-50);color:#B5852A">${icon("bowl")}</span><div><strong>ארוחה משותפת</strong><span>טעמים, מרקמים ושיחה סביב השולחן</span></div></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">מה מקבלים באתר</span>
          <h2>מההסבר אל היום־יום</h2>
        </div>
        <div class="feature-grid">
          <div class="feature"><span class="feature-num">01</span><h3>מבינים מה קורה</h3><p>הסברים על שפה, תקשורת ואכילה, עם פירוש פשוט למונחים המקצועיים.</p></div>
          <div class="feature"><span class="feature-num">02</span><h3>רואים איך זה נראה</h3><p>דוגמאות מתוך מצבים מוכרים בבית, במשחק ובארוחה.</p></div>
          <div class="feature"><span class="feature-num">03</span><h3>בוחרים מה לנסות</h3><p>רעיונות קטנים שאפשר לשלב בשגרה, בהתאם לילד ולמשפחה.</p></div>
          <div class="feature"><span class="feature-num">04</span><h3>יודעים מתי לפנות</h3><p>מידע שעוזר לנסח את השאלה ולהבין מתי כדאי לקבל התייחסות אישית.</p></div>
        </div>
        <a class="btn btn-outline" href="#/age/12-18m">להצצה במדריך לדוגמה</a>
      </div>
    </section>

    <section class="section section-white">
      <div class="container intro">
        <div class="portrait"><span class="portrait-initial">ל</span><span class="portrait-note">כאן תופיע תמונה</span></div>
        <div>
          <span class="eyebrow">היכרות קצרה</span>
          <h2>נעים להכיר, אני לירון</h2>
          <p class="lead">אני לירון מעודה־כהן, קלינאית תקשורת.</p>
          <p>יצרתי את ביס־סייפ כדי לתת להורים מקום נגיש לשאלות שעולות סביב שפה, תקשורת ואכילה: מה אנחנו רואים? איך אפשר לתמוך בילד בבית? ומתי כדאי לפנות לעזרה?</p>
          <p>חשוב לי לחבר בין ידע מקצועי לבין ההיכרות שלכם עם הילד שלכם, ולתת מקום גם לשאלות הקטנות שקשה לדעת את מי לשאול.</p>
          <a class="link-arrow" href="#/about">עוד עליי ועל הגישה שלי</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="band">
          <span class="band-deco"></span>
          <div>
            <span class="eyebrow">ספריית ההדרכות</span>
            <h2>רוצים לראות גם איך?</h2>
            <p>בספריית ההדרכות תמצאו סרטוני הדגמה, מדריכים ודפי עזר, מסודרים לפי גיל ונושא.</p>
            <p>אפשר לבחור את מה שרלוונטי לכם עכשיו ולחזור לתוכן בזמן שנוח לכם.</p>
            <a class="btn btn-light" href="#/library">מה כוללת הספרייה?</a>
          </div>
          <div class="media-stack" aria-hidden="true">
            <div class="media-pill">${icon("video")}סרטוני הדגמה</div>
            <div class="media-pill">${icon("guide")}מדריכים ממוקדים</div>
            <div class="media-pill">${icon("sheet")}דפי עזר</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section-sm">
      <div class="container"><div class="contact-cta">
        <span class="eyebrow">פנייה אישית</span>
        <h2>יש שאלה שנשארה פתוחה?</h2>
        <p class="lead">לפעמים קוראים ומבינים, ועדיין רוצים לדבר על הילד שלנו.</p>
        <p>אפשר לפנות אליי, לתאר בקצרה מה מעסיק אתכם ולברר איזה סוג של מענה עשוי להתאים.</p>
        <div class="actions" style="justify-content:center"><a class="btn btn-coral" href="#/consult">לפנייה ללירון</a></div>
        <p class="note" style="margin:14px 0 0">אין צורך לדעת מראש איזה שירות לבקש.</p>
      </div></div>
    </section>

    <section class="section" id="faq">
      <div class="container">
        <div class="section-head center"><span class="eyebrow">שאלות נפוצות</span><h2>שאלות שחוזרות על עצמן</h2></div>
        ${faqBlock()}
      </div>
    </section>`;
  }

  function viewAgeIndex() {
    return `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">לפי גיל</span>
        <h1>כל שלב והשאלות שלו</h1>
        <p class="lead">בחרו גיל כדי לקרוא על שפה, תקשורת ואכילה, ולמצוא רעיונות שמתאימים לשגרה שלכם.</p>
        <div class="note-box">${icon("info")}<p>המידע מחולק לתקופות כדי להקל על ההתמצאות. כל ילד מגיע עם דרך משלו, והמידע באתר אינו מחליף היכרות והערכה אישית.</p></div>
      </div>
    </section>
    <section class="section-sm" style="padding-top:8px">
      <div class="container">
        ${ageCards()}
        <div class="contact-cta" style="margin-top:40px;background:var(--surface-2)">
          <h2 style="font-size:1.6rem">מחפשים משהו מסוים?</h2>
          <p>אפשר לעבור ישירות לשפה ודיבור, תקשורת ומשחק או אכילה.</p>
          <div class="actions" style="justify-content:center">
            ${TOPICS.map((t) => `<a class="btn btn-ghost btn-sm" href="#/topic/${t.id}">${t.short || t.name}</a>`).join("")}
          </div>
        </div>
      </div>
    </section>`;
  }

  function contentCard(cls, ic, title, text) {
    return `<div class="content-card ${cls}"><h3><span class="ci">${icon(ic)}</span>${title}</h3>${slot(text)}</div>`;
  }

  function viewAge(ageId) {
    const age = ageById(ageId);
    if (!age) return viewNotFound();
    const idx = AGES.indexOf(age);
    const prev = AGES[idx - 1];
    const next = AGES[idx + 1];
    const nav = [
      ["language", "שפה ודיבור"], ["play", "תקשורת ומשחק"], ["eating", "אכילה"],
      ["home", "רעיונות לבית"], ["consult", "מתי כדאי להתייעץ"],
    ];

    const topicSection = (t) => `
      <section class="topic-block ${t.cls}" id="sec-${t.id}">
        <div class="topic-block-head"><span class="topic-icon">${icon(t.icon)}</span><h2>${t.short || t.name}</h2></div>
        ${contentCard("", "eye", "מה אפשר לפגוש בתקופה הזאת?", `תיאור מקצועי של מיומנויות וטווחי התפתחות בתחום ${t.name}, בניסוח שאינו מציג את הגיל כתאריך יעד קשיח.`)}
        <div class="two-col">
          ${contentCard("", "home", "איך זה נראה ביום־יום?", "דוגמאות שמחברות את ההסבר למצבים שהורים מכירים.")}
          ${contentCard("term", "tag", "מונח קטן, הסבר פשוט", "הסבר קצר למונח מקצועי שמופיע בעמוד.")}
        </div>
      </section>`;

    return `
    <section class="page-head">
      <div class="container">
        <nav class="breadcrumb" aria-label="מיקום באתר"><a href="#/age">ליווי לפי גיל</a><span class="sep">/</span><span>${age.label}</span></nav>
        <h1>${age.label}: ${age.tag}</h1>
        <p class="lead">כאן ריכזתי מידע על שפה, תקשורת ואכילה בתקופה הזאת, לצד רעיונות להתבוננות ולזמן משותף בבית.</p>
        <p class="mb-0">אפשר לקרוא ברצף או לבחור את הנושא שמעסיק אתכם עכשיו.</p>
      </div>
    </section>

    <section class="section-sm" style="padding-top:8px">
      <div class="container age-layout">
        <aside class="toc" aria-label="ניווט בתוך העמוד">
          <p class="toc-title">בעמוד הזה</p>
          <ul>${nav.map(([id, label]) => `<li><button type="button" data-scroll="sec-${id}">${label}</button></li>`).join("")}</ul>
          <div class="age-switch">
            <label for="age-switch">מעבר לגיל אחר</label>
            <select id="age-switch" class="field-select" style="width:100%;font:inherit;padding:8px 10px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg)">
              ${AGES.map((a) => `<option value="${a.id}" ${a.id === age.id ? "selected" : ""}>${a.label}</option>`).join("")}
            </select>
          </div>
        </aside>

        <div>
          ${TOPICS.map(topicSection).join("")}

          <section class="topic-block" id="sec-home">
            <div class="topic-block-head"><span class="topic-icon" style="background:var(--sage-50)">${icon("bulb")}</span><h2>רעיונות לבית</h2></div>
            ${contentCard("idea", "heart", "רעיון לזמן משותף", "פעילות אחת ברורה, עם הסבר איך להתאים אותה לתגובה ולעניין של הילד.")}
            ${contentCard("", "flask", "מה עומד מאחורי ההסבר?", "תמצית מקצועית וקישור למקורות שעליהם מבוסס התוכן.")}
          </section>

          <section class="topic-block" id="sec-consult">
            <div class="topic-block-head"><span class="topic-icon" style="background:var(--coral-50)">${icon("sign")}</span><h2>מתי כדאי לפנות להתייעצות?</h2></div>
            ${contentCard("consult", "info", "מה כדאי לדעת בגיל הזה", "מידע ייעודי לנושא ולגיל, שנבדק מקצועית לפני פרסום.")}
          </section>

          <div class="band" style="margin-bottom:28px">
            <span class="band-deco"></span>
            <div>
              <h2 style="font-size:1.6rem">רוצים לראות הדגמה?</h2>
              <p>בספריית ההדרכות מחכים לכם סרטונים ודפי עזר בנושא הזה.</p>
              <a class="btn btn-light" href="#/library?age=${age.id}">להדרכות בנושא</a>
            </div>
            <div class="media-stack" aria-hidden="true">
              <div class="media-pill">${icon("video")}סרטוני הדגמה</div>
              <div class="media-pill">${icon("sheet")}דפי עזר</div>
            </div>
          </div>

          <div class="contact-cta">
            <h2 style="font-size:1.5rem">יש משהו שאתם רואים אצל הילד שלכם ורוצים להבין טוב יותר?</h2>
            <div class="actions" style="justify-content:center"><a class="btn btn-coral" href="#/consult?age=${age.id}">לשאלה אישית</a></div>
          </div>

          <nav class="age-pager" aria-label="מעבר בין גילאים">
            ${prev ? `<a href="#/age/${prev.id}"><small>→ הגיל הקודם</small>${prev.label}</a>` : "<span></span>"}
            ${next ? `<a class="next" href="#/age/${next.id}"><small>הגיל הבא ←</small>${next.label}</a>` : ""}
          </nav>
        </div>
      </div>
    </section>`;
  }

  function viewTopics() {
    return `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">לפי נושא</span>
        <h1>אפשר להתחיל גם מהשאלה שלכם</h1>
        <p class="lead">בחרו את התחום שמעסיק אתכם, ומשם את הגיל המתאים.</p>
      </div>
    </section>
    <section class="section-sm" style="padding-top:8px">
      <div class="container">
        ${topicCards("h2")}
        <p class="note" style="margin-top:22px">מעדיפים להתחיל מהגיל? <a href="#/age">לבחירה לפי גיל</a></p>
      </div>
    </section>
    ${contactCta("יש שאלה שלא מצאתם לה מקום?", "אפשר לתאר אותה בקצרה ולברר איזה מענה עשוי להתאים.", "לפנייה ללירון")}`;
  }

  function viewTopic(topicId) {
    const t = topicById(topicId);
    if (!t) return viewNotFound();
    return `
    <section class="page-head">
      <div class="container">
        <nav class="breadcrumb" aria-label="מיקום באתר"><a href="#/topics">לפי נושא</a><span class="sep">/</span><span>${t.name}</span></nav>
        <div class="topic-hero ${t.cls}">
          <span class="topic-icon">${icon(t.icon)}</span>
          <h1>${t.name}</h1>
          <p class="lead mb-0">${t.desc}</p>
        </div>
      </div>
    </section>
    <section class="section-sm" style="padding-top:8px">
      <div class="container">
        <div class="section-head"><h2>באיזה גיל הילד או הילדה?</h2><p>בחרו גיל כדי להגיע ישר לחלק על ${t.short || t.name} באותו שלב.</p></div>
        ${ageCards(t.id)}
        <p class="note age-disclaimer">החלוקה לגילאים עוזרת להתמצא בתוכן. היא אינה מבחן או קביעה לגבי ההתפתחות של ילדכם.</p>
        <div class="actions" style="margin-top:24px">
          <a class="btn btn-outline" href="#/library?topic=${t.id}">להדרכות בנושא ${t.short || t.name}</a>
        </div>
      </div>
    </section>
    ${contactCta("יש משהו שאתם רואים אצל הילד שלכם ורוצים להבין טוב יותר?", "", "לשאלה אישית")}`;
  }

  function viewAbout() {
    return `
    <section class="page-head">
      <div class="container intro">
        <div class="portrait"><span class="portrait-initial">ל</span><span class="portrait-note">כאן תופיע תמונה</span></div>
        <div>
          <span class="eyebrow">עליי</span>
          <h1>נעים להכיר, אני לירון</h1>
          <p class="lead">אני לירון מעודה־כהן, קלינאית תקשורת.</p>
          <p>בעבודה עם ילדים ומשפחות, חשוב לי להבין גם את המיומנות שמעסיקה אותנו וגם את המקום שלה בחיים: מה קורה בזמן משחק, איך נראית ארוחה, ואילו רגעים מרגישים קלים או מורכבים בבית.</p>
          <p class="mb-0">הקמתי את ביס־סייפ כדי להנגיש מידע על שפה, תקשורת ואכילה, ולתת להורים נקודת התחלה ברורה לשאלות שלהם.</p>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container approach">
        <div>
          <span class="eyebrow">הגישה</span>
          <h2>איך אני רואה את התפקיד שלי?</h2>
        </div>
        <div>
          <div class="quote"><p>להקשיב למה שאתם מביאים, להסביר את השיקולים המקצועיים ולבנות יחד דרך שאפשר לשלב בחיי המשפחה.</p></div>
          <p>אתם מכירים את הילד שלכם מתוך היום־יום. המפגש עם הידע המקצועי מאפשר להתבונן יחד ולבחור במה כדאי להתמקד.</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head"><span class="eyebrow">רקע מקצועי</span><h2>הכשרה וניסיון</h2></div>
        ${slot("כאן יופיעו התארים, הרישוי, ההכשרות והניסיון הרלוונטיים — לפי פרטים מאומתים.")}
      </div>
    </section>

    ${contactCta("רוצים שנכיר?", "אפשר לספר לי בקצרה מה מעסיק אתכם ולברר על אפשרויות הליווי.", "ליצירת קשר")}`;
  }

  function viewConsult(params) {
    const preAge = params.get("age") || "";
    return `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">ייעוץ אישי</span>
        <h1>מקום לשאלה שלכם</h1>
        <p class="lead">כשיש שאלה על שפה, תקשורת או אכילה, לא תמיד ברור מאיפה מתחילים.</p>
        <p class="mb-0" style="max-width:720px">אפשר לפנות גם כשהשאלה עדיין לא מסודרת. תארו בקצרה מה אתם רואים ומה הייתם רוצים להבין, ונברר מהו הצעד המתאים להמשך.</p>
      </div>
    </section>

    <section class="section-sm" style="padding-top:8px">
      <div class="container">
        <h2>איך מתחילים?</h2>
        <div class="steps">
          <div class="step"><h3>משאירים פנייה קצרה</h3><p>שם, פרטי קשר, גיל הילד או הילדה וכמה מילים על סיבת הפנייה.</p></div>
          <div class="step"><h3>מבררים מה נדרש</h3><p>נבדוק אם הפנייה מתאימה לתחומי השירות שלי ואיזה סוג של מענה אפשר להציע.</p></div>
          <div class="step"><h3>מקבלים פרטים לפני קביעת המפגש</h3><p>אופי המפגש, המיקום או האפשרות המקוונת, משך ועלות יימסרו מראש.</p></div>
        </div>
      </div>
    </section>

    <section class="section" id="contact-form">
      <div class="container form-wrap">
        <div class="form-card" id="form-card">
          <h2>ספרו לי מה מעסיק אתכם</h2>
          <form id="consult-form" novalidate>
            <div class="field-row">
              <div class="field">
                <label for="f-name">איך קוראים לכם?</label>
                <input id="f-name" name="name" type="text" autocomplete="name" required>
                <p class="error">נשמח לדעת איך לפנות אליכם.</p>
              </div>
              <div class="field">
                <label for="f-phone">מספר טלפון</label>
                <input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="050-0000000">
                <p class="error">נראה שחסרה ספרה או שהמספר אינו תקין.</p>
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="f-email">כתובת דוא״ל <span class="opt">— לא חובה</span></label>
                <input id="f-email" name="email" type="email" autocomplete="email">
                <p class="error">כתובת הדוא״ל אינה תקינה.</p>
              </div>
              <div class="field">
                <label for="f-age">גיל הילד או הילדה</label>
                <select id="f-age" name="childAge" required>
                  <option value="">בחרו קבוצת גיל</option>
                  ${AGES.map((a) => `<option value="${a.label}" ${a.id === preAge ? "selected" : ""}>${a.label}</option>`).join("")}
                  <option value="אחר">אחר</option>
                </select>
                <p class="error">בחרו את קבוצת הגיל הקרובה ביותר.</p>
              </div>
            </div>
            <fieldset class="field">
              <legend>באיזה נושא תרצו לפנות?</legend>
              <div class="chips">
                ${["שפה ודיבור", "תקשורת ומשחק", "אכילה", "לא בטוחים"].map((x) => `
                  <label class="chip"><input type="radio" name="topic" value="${x}"><span>${x}</span></label>`).join("")}
              </div>
            </fieldset>
            <div class="field">
              <label for="f-msg">מה הייתם רוצים שאדע?</label>
              <textarea id="f-msg" name="message"></textarea>
              <p class="hint">מספיק תיאור קצר. בשלב הזה אין צורך לצרף מסמכים רפואיים.</p>
            </div>
            <div class="form-foot">
              <button class="btn btn-primary" type="submit">שליחת הפנייה</button>
              <p class="error" id="send-error" style="display:none;color:#B23B2A;margin:0">משהו השתבש בשליחה. אפשר לנסות שוב או לכתוב בוואטסאפ.</p>
            </div>
            <p class="privacy-note">הפרטים ישמשו רק לחזרה אליכם בעניין הפנייה. <a href="#/legal/privacy">מדיניות פרטיות</a></p>
          </form>
        </div>

        <aside class="side-card">
          <h3>מעדיפים לפנות בוואטסאפ?</h3>
          <p>אפשר לכתוב כמה מילים, ואחזור אליכם.</p>
          <a class="btn btn-wa" href="${waLink()}" target="_blank" rel="noopener">${WA_ICON}כתבו לי בוואטסאפ</a>
          <hr style="border:0;border-top:1px solid var(--line);margin:24px 0">
          <h3>לפני שפונים</h3>
          <ul class="check-list" style="margin:0">
            <li>אין צורך לדעת מראש איזה שירות לבקש.</li>
            <li>אפשר לפנות גם בלי לדעת אם צריך אבחון.</li>
            <li>פרטי המפגש והעלות יימסרו מראש.</li>
          </ul>
        </aside>
      </div>
    </section>`;
  }

  function libCard(item) {
    const t = topicById(item.topic);
    const a = ageById(item.age);
    const saved = isSaved(item.id);
    return `<article class="lib-card ${t.cls}">
      <button class="lib-thumb" type="button" data-open="${item.id}" style="border:0;cursor:pointer;width:100%" aria-label="פתיחת ${item.title}">
        <span class="play">${PLAY}</span>
        <span class="dur">${item.dur} דק׳</span>
        <span class="sample">דוגמה</span>
      </button>
      <div class="lib-body">
        <h3>${item.title}</h3>
        <div class="lib-meta">
          <span><b>למי:</b> ${a.label} · ${t.short || t.name}</span>
          <span><b>כולל:</b> ${item.includes.join(" + ")}</span>
          <span><b>משך:</b> ${item.dur} דקות</span>
        </div>
        <div class="lib-foot">
          <span class="badge ${item.open ? "badge-open" : "badge-sub"}">${item.open ? "פתוח לצפייה" : "כלול במנוי"}</span>
          <button class="save-btn" type="button" data-save="${item.id}" aria-pressed="${saved}" aria-label="${saved ? "הסרה מהתוכן השמור" : "שמירה לצפייה מאוחרת"}">${icon("bookmark")}</button>
        </div>
      </div>
    </article>`;
  }

  function viewLibrary(params) {
    const fAge = params.get("age") || "";
    const fTopic = params.get("topic") || "";
    return `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">ספריית ההדרכות</span>
        <h1>להבין, לראות ולנסות בבית</h1>
        <p class="lead">סרטוני הדגמה, מדריכים ודפי עזר בנושאי שפה, תקשורת ואכילה — במקום אחד, עם אפשרות לבחור לפי גיל ולפי נושא.</p>
      </div>
    </section>

    <section class="section-sm" style="padding-top:8px">
      <div class="container">
        <h2>מה תמצאו בספרייה?</h2>
        <div class="lib-types">
          <div class="lib-type t-language"><span class="topic-icon">${icon("video")}</span><h3>סרטוני הדגמה</h3><p>הסברים ודוגמאות שאפשר לצפות בהם שוב, בזמן שמתאים לכם.</p></div>
          <div class="lib-type t-play"><span class="topic-icon">${icon("guide")}</span><h3>מדריכים ממוקדים</h3><p>תוכן שעוזר להבין נושא אחד לעומק ולחבר אותו לחיי היום־יום.</p></div>
          <div class="lib-type t-eating"><span class="topic-icon">${icon("sheet")}</span><h3>דפי עזר</h3><p>תזכורות ורעיונות שאפשר לחזור אליהם בלי לחפש מחדש בתוך הסרטון.</p></div>
        </div>
        <div style="margin-top:22px"><button class="btn btn-outline" type="button" data-open="l4">לצפייה בהדרכה לדוגמה</button></div>
      </div>
    </section>

    <section class="section" id="catalog">
      <div class="container">
        <h2>בחרו את התוכן שמתאים לכם עכשיו</h2>
        <div class="filters" role="search">
          <div>
            <label for="flt-age">סינון לפי גיל</label>
            <select id="flt-age"><option value="">כל הגילאים</option>${AGES.map((a) => `<option value="${a.id}" ${a.id === fAge ? "selected" : ""}>${a.label}</option>`).join("")}</select>
          </div>
          <div>
            <label for="flt-topic">סינון לפי נושא</label>
            <select id="flt-topic"><option value="">כל הנושאים</option>${TOPICS.map((t) => `<option value="${t.id}" ${t.id === fTopic ? "selected" : ""}>${t.name}</option>`).join("")}</select>
          </div>
          <div>
            <label for="flt-q">חיפוש בספרייה</label>
            <div class="search-wrap">${icon("search")}<input id="flt-q" type="search" placeholder="למשל: ספר, ארוחה, משחק"></div>
          </div>
        </div>
        <div class="result-meta"><span id="lib-count" aria-live="polite"></span><span>הפריטים כאן הם דוגמאות למבנה הספרייה</span></div>
        <div class="lib-grid" id="lib-grid"></div>

        <div class="join-box" id="join">
          <div>
            <p style="font-weight:600;font-size:1.1rem;margin-bottom:6px">הצטרפות לספרייה</p>
            <p class="note">פרטי הגישה, המחיר ותנאי המנוי מופיעים כאן לפני ההצטרפות.</p>
          </div>
          <button class="btn btn-primary" type="button" data-join>לפרטי ההצטרפות</button>
        </div>

        <div class="note-box" style="margin-top:20px">${icon("info")}<p>ההדרכות מספקות מידע כללי ואינן כוללות הערכה אישית של הילד או התאמת טיפול.</p></div>
      </div>
    </section>`;
  }

  function renderLibraryGrid() {
    const grid = document.getElementById("lib-grid");
    if (!grid) return;
    const age = document.getElementById("flt-age").value;
    const topic = document.getElementById("flt-topic").value;
    const q = document.getElementById("flt-q").value.trim();
    const items = LIBRARY.filter((it) => {
      if (age && it.age !== age) return false;
      if (topic && it.topic !== topic) return false;
      if (q) {
        const hay = [it.title, ageById(it.age).label, topicById(it.topic).name, it.includes.join(" ")].join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    document.getElementById("lib-count").textContent = items.length ? `${items.length} הדרכות` : "";
    grid.innerHTML = items.length
      ? items.map(libCard).join("")
      : `<div class="empty" style="grid-column:1/-1">${icon("search")}<p class="mb-0">לא מצאנו הדרכה שמתאימה לבחירה הזו. נסו לשנות את הסינון.</p></div>`;
  }

  function viewAccount() {
    const myAge = store.get("age", "");
    return `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">האזור האישי</span>
        <h1>טוב שחזרתם</h1>
        <p class="lead mb-0">מה תרצו לפתוח היום?</p>
      </div>
    </section>
    <section class="section-sm" style="padding-top:8px">
      <div class="container">
        <div class="dash-grid">
          <button class="dash-tile t-language" type="button" data-resume><span class="topic-icon">${icon("resume")}</span><strong>המשך צפייה</strong></button>
          <button class="dash-tile t-play" type="button" data-scroll="saved-panel"><span class="topic-icon">${icon("bookmark")}</span><strong>התוכן ששמרתי</strong></button>
          <a class="dash-tile t-eating" href="${myAge ? "#/age/" + myAge : "#/age"}"><span class="topic-icon">${icon("calendar")}</span><strong>לפי גיל</strong></a>
          <a class="dash-tile t-language" href="#/topics"><span class="topic-icon">${icon("blocks")}</span><strong>לפי נושא</strong></a>
          <button class="dash-tile t-play" type="button" data-scroll="sheets-panel"><span class="topic-icon">${icon("sheet")}</span><strong>דפי העזר שלי</strong></button>
        </div>

        <div class="account-cols">
          <div style="display:grid;gap:24px">
            <div class="panel" id="saved-panel" style="scroll-margin-top:100px">
              <h2>התוכן ששמרתי</h2>
              <div id="saved-list"></div>
            </div>
            <div class="panel" id="sheets-panel" style="scroll-margin-top:100px">
              <h2>דפי העזר שלי</h2>
              <div id="sheets-list"></div>
            </div>
          </div>
          <aside class="panel">
            <h2>קבוצת הגיל שלי</h2>
            <div class="field" style="margin-bottom:10px">
              <label for="my-age" class="sr-only">קבוצת הגיל</label>
              <select id="my-age" style="width:100%;font:inherit;padding:12px;border-radius:12px;border:1.5px solid var(--line);background:var(--bg)">
                <option value="">בחרו קבוצת גיל</option>
                ${AGES.map((a) => `<option value="${a.id}" ${a.id === myAge ? "selected" : ""}>${a.label}</option>`).join("")}
              </select>
            </div>
            <p class="note">אפשר לשנות את קבוצת הגיל בכל עת.</p>
            <a class="btn btn-outline btn-sm" id="my-age-link" href="${myAge ? "#/age/" + myAge : "#/age"}">לתוכן המתאים לגיל</a>
          </aside>
        </div>
      </div>
    </section>`;
  }

  function renderAccountLists() {
    const saved = getSaved().map((id) => LIBRARY.find((x) => x.id === id)).filter(Boolean);
    const emptyHtml = `<div class="empty">${icon("bookmark")}<p>עוד לא שמרתם הדרכות. לחצו על סימן השמירה ליד תוכן שתרצו לחזור אליו.</p><a class="btn btn-primary btn-sm" href="#/library">למציאת הדרכה</a></div>`;
    const row = (it) => `<div class="saved-item">
      <span class="topic-icon ${topicById(it.topic).cls}" style="width:40px;height:40px;margin:0;border-radius:12px">${icon(topicById(it.topic).icon)}</span>
      <div class="grow"><strong>${it.title}</strong><small>${ageById(it.age).label} · ${it.includes.join(" + ")}</small></div>
      <button class="btn btn-ghost btn-sm" type="button" data-open="${it.id}">פתיחה</button>
    </div>`;
    const sl = document.getElementById("saved-list");
    const sh = document.getElementById("sheets-list");
    if (sl) sl.innerHTML = saved.length ? `<div class="saved-list">${saved.map(row).join("")}</div>` : emptyHtml;
    const sheets = saved.filter((it) => it.includes.includes("דף עזר"));
    if (sh) sh.innerHTML = sheets.length
      ? `<div class="saved-list">${sheets.map(row).join("")}</div>`
      : `<p class="note mb-0">דפי עזר מתוך הדרכות ששמרתם יופיעו כאן.</p>`;
  }

  function viewFaq() {
    return `
    <section class="page-head"><div class="container"><span class="eyebrow">שאלות נפוצות</span><h1>שאלות שחוזרות על עצמן</h1></div></section>
    <section class="section-sm" style="padding-top:8px"><div class="container">${faqBlock()}</div></section>
    ${contactCta("לא מצאתם תשובה?", "אפשר לכתוב לי ולברר.", "לפנייה ללירון")}`;
  }

  const LEGAL = {
    privacy: "מדיניות פרטיות",
    terms: "תנאי שימוש",
    accessibility: "הצהרת נגישות",
  };
  function viewLegal(id) {
    const title = LEGAL[id];
    if (!title) return viewNotFound();
    return `
    <section class="page-head"><div class="container prose">
      <h1>${title}</h1>
      ${slot("הנוסח המלא יתווסף כאן לאחר בדיקה משפטית.")}
    </div></section>`;
  }

  function viewNotFound() {
    return `<section class="page-head"><div class="container">
      <h1>העמוד לא נמצא</h1><p class="lead">ייתכן שהקישור השתנה.</p>
      <a class="btn btn-primary" href="#/">לעמוד הבית</a>
    </div></section>`;
  }

  /* ================== מודאל ================== */
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  let lastFocus = null;

  function openModal(html) {
    lastFocus = document.activeElement;
    modalBody.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector(".modal-close").focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function openItem(id) {
    const it = LIBRARY.find((x) => x.id === id);
    if (!it) return;
    store.set("recent", id);
    const t = topicById(it.topic);
    const a = ageById(it.age);
    const saved = isSaved(id);
    openModal(`
      <span class="badge ${it.open ? "badge-open" : "badge-sub"}">${it.open ? "פתוח לצפייה" : "כלול במנוי"}</span>
      <h2 id="modal-title" style="margin-top:10px">${it.title}</h2>
      <p class="note mb-0">${a.label} · ${t.name} · ${it.dur} דקות</p>
      <div class="video-ph"><div><span class="play">${PLAY}</span>${it.open ? "כאן יוטמע סרטון ההדגמה" : "התוכן זמין למנויים"}</div></div>
      <p style="font-weight:600;margin-bottom:8px">מה ההדרכה כוללת?</p>
      <ul class="check-list">${it.includes.map((x) => `<li>${x}</li>`).join("")}</ul>
      <div class="actions">
        <button class="btn ${saved ? "btn-ghost" : "btn-primary"}" type="button" data-save="${id}" aria-pressed="${saved}">${icon("bookmark")}${saved ? "שמור באזור האישי" : "שמירה לאזור האישי"}</button>
        ${it.open ? "" : `<button class="btn btn-outline" type="button" data-join>לפרטי ההצטרפות</button>`}
      </div>
      <p class="note" style="margin:16px 0 0">ההדרכות מספקות מידע כללי ואינן כוללות הערכה אישית של הילד או התאמת טיפול.</p>`);
  }

  function openJoin() {
    openModal(`
      <h2 id="modal-title">פרטי ההצטרפות</h2>
      <p>פרטי הגישה, המחיר ותנאי המנוי יופיעו כאן לפני ההצטרפות, כך שתוכלו לדעת בדיוק מה כלול.</p>
      ${slot("מחיר, משך המנוי, מה כלול ותנאי ביטול — יתווספו כאן.")}
      <div class="actions" style="margin-top:20px">
        <a class="btn btn-primary" href="#/consult" data-close>לשאלה על הספרייה</a>
        <button class="btn btn-ghost" type="button" data-close>חזרה לספרייה</button>
      </div>`);
  }

  /* ================== Toast ================== */
  const toastEl = document.getElementById("toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  /* ================== טופס ================== */
  function bindForm() {
    const form = document.getElementById("consult-form");
    if (!form) return;

    const rules = {
      name: (v) => v.trim().length >= 2,
      phone: (v) => { const d = v.replace(/\D/g, ""); return /^(0\d{8,9}|972\d{8,9})$/.test(d); },
      email: (v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      childAge: (v) => !!v,
    };
    const check = (el) => {
      const rule = rules[el.name];
      if (!rule) return true;
      const ok = rule(el.value);
      el.closest(".field").classList.toggle("invalid", !ok);
      el.setAttribute("aria-invalid", String(!ok));
      return ok;
    };
    form.querySelectorAll("input, select").forEach((el) => {
      el.addEventListener("blur", () => { if (el.value) check(el); });
      el.addEventListener("input", () => { if (el.closest(".field") && el.closest(".field").classList.contains("invalid")) check(el); });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fields = ["name", "phone", "email", "childAge"].map((n) => form.elements[n]);
      const results = fields.map(check);
      const firstBad = fields[results.indexOf(false)];
      if (firstBad) { firstBad.focus(); return; }

      const data = Object.fromEntries(new FormData(form).entries());
      const btn = form.querySelector('button[type="submit"]');
      const err = document.getElementById("send-error");
      err.style.display = "none";
      btn.disabled = true;
      btn.textContent = "שולחים…";

      try {
        if (CONFIG.formEndpoint) {
          const res = await fetch(CONFIG.formEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error("send failed");
        }
        const card = document.getElementById("form-card");
        card.innerHTML = `<div class="success" tabindex="-1" id="success-msg">
          <div class="success-icon">${icon("check")}</div>
          <h2>הפנייה נשלחה</h2>
          <p class="lead mb-0">תודה ששיתפתם — אחזור אליכם לבירור הפרטים.</p>
        </div>`;
        document.getElementById("success-msg").focus();
      } catch (ex) {
        err.style.display = "block";
        btn.disabled = false;
        btn.textContent = "שליחת הפנייה";
      }
    });
  }

  /* ================== ניתוב ================== */
  const main = document.getElementById("main");
  const navEl = document.getElementById("site-nav");
  const navToggle = document.querySelector(".nav-toggle");

  const TITLES = {
    "": "ביס־סייפ | לירון מעודה־כהן, קלינאית תקשורת",
    age: "לפי גיל | ביס־סייפ",
    topics: "לפי נושא | ביס־סייפ",
    topic: "לפי נושא | ביס־סייפ",
    about: "עליי | ביס־סייפ",
    consult: "ייעוץ אישי | ביס־סייפ",
    library: "ספריית ההדרכות | ביס־סייפ",
    account: "האזור האישי | ביס־סייפ",
    faq: "שאלות נפוצות | ביס־סייפ",
    legal: "ביס־סייפ",
  };

  function scrollToId(id, smooth) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  }

  function route() {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, query] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = new URLSearchParams(query || "");
    const [p0, p1, p2] = parts;

    let html;
    switch (p0 || "") {
      case "": html = viewHome(); break;
      case "age": html = p1 ? viewAge(p1) : viewAgeIndex(); break;
      case "topics": html = viewTopics(); break;
      case "topic": html = viewTopic(p1); break;
      case "about": html = viewAbout(); break;
      case "consult": html = viewConsult(params); break;
      case "library": html = viewLibrary(params); break;
      case "account": html = viewAccount(); break;
      case "faq": html = viewFaq(); break;
      case "legal": html = viewLegal(p1); break;
      default: html = viewNotFound();
    }
    main.innerHTML = html;

    // כותרת
    let title = TITLES[p0 || ""] || TITLES[""];
    if (p0 === "age" && p1 && ageById(p1)) title = `${ageById(p1).label} | ביס־סייפ`;
    if (p0 === "topic" && topicById(p1)) title = `${topicById(p1).name} | ביס־סייפ`;
    if (p0 === "legal" && LEGAL[p1]) title = `${LEGAL[p1]} | ביס־סייפ`;
    document.title = title;

    // מצב תפריט
    const navKey = p0 === "topic" ? "topics" : p0;
    document.querySelectorAll("[data-nav]").forEach((a) => {
      if (a.dataset.nav === navKey) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    navEl.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");

    // אתחול לפי עמוד
    if (p0 === "library") {
      ["flt-age", "flt-topic"].forEach((id) => document.getElementById(id).addEventListener("change", renderLibraryGrid));
      document.getElementById("flt-q").addEventListener("input", renderLibraryGrid);
      renderLibraryGrid();
    }
    if (p0 === "account") {
      renderAccountLists();
      document.getElementById("my-age").addEventListener("change", (e) => {
        store.set("age", e.target.value);
        const href = e.target.value ? "#/age/" + e.target.value : "#/age";
        document.getElementById("my-age-link").setAttribute("href", href);
        toast("קבוצת הגיל עודכנה");
      });
    }
    if (p0 === "age" && p1) {
      const sw = document.getElementById("age-switch");
      if (sw) sw.addEventListener("change", (e) => { location.hash = "#/age/" + e.target.value; });
    }
    if (p0 === "consult") bindForm();

    main.focus({ preventScroll: true });
    const target = p0 === "age" && p2 ? "sec-" + p2 : null;
    if (target) requestAnimationFrame(() => scrollToId(target, false));
    else window.scrollTo(0, 0);
  }

  /* ================== אירועים גלובליים ================== */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-scroll],[data-open],[data-save],[data-join],[data-close],[data-resume]");
    if (!el) return;

    if (el.hasAttribute("data-close")) {
      closeModal();
      return; // קישורים עם data-close ממשיכים לנווט
    }
    if (el.dataset.scroll) {
      e.preventDefault();
      scrollToId(el.dataset.scroll, true);
      document.querySelectorAll(".toc button").forEach((b) => b.classList.toggle("active", b === el));
      return;
    }
    if (el.dataset.open) { openItem(el.dataset.open); return; }
    if (el.hasAttribute("data-join")) { if (!modal.hidden) closeModal(); openJoin(); return; }
    if (el.hasAttribute("data-resume")) {
      const r = store.get("recent", "");
      if (r) openItem(r); else toast("עוד לא התחלתם לצפות בהדרכה");
      return;
    }
    if (el.dataset.save) {
      const id = el.dataset.save;
      const nowSaved = toggleSaved(id);
      document.querySelectorAll(`[data-save="${id}"]`).forEach((b) => {
        b.setAttribute("aria-pressed", String(nowSaved));
        if (b.classList.contains("save-btn")) b.setAttribute("aria-label", nowSaved ? "הסרה מהתוכן השמור" : "שמירה לצפייה מאוחרת");
        else {
          b.className = "btn " + (nowSaved ? "btn-ghost" : "btn-primary");
          b.innerHTML = icon("bookmark") + (nowSaved ? "שמור באזור האישי" : "שמירה לאזור האישי");
        }
      });
      toast(nowSaved ? "נשמר באזור האישי" : "הוסר מהתוכן השמור");
      renderAccountLists();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  navToggle.addEventListener("click", () => {
    const open = navEl.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  document.getElementById("year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", route);
  route();
})();
