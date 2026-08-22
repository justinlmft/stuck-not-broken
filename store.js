/* ============================================================================
   Store — accounts, cross-device sync, and the simulated-AI recommender.

   Two modes, same API:
   • Cloud (keys in config.js): real Supabase email/password accounts. Check-ins
     and sessions live in Postgres under the signed-in user (row-level security),
     mirrored to an on-device cache for instant render + offline. An outbox holds
     anything written while offline and flushes on next load.
   • Local (no keys): a profile + data kept in localStorage on this device only.
     Lets the prototype run, and shows the exact sign-in UX, before keys exist.

   Reads are synchronous over an in-memory copy (so the UI render stays simple);
   writes are write-through (memory + cache now, cloud in the background).
   ========================================================================== */
(function (global) {
  // ----------------------------------------------------------------------------
  // WebKit / iOS hardening for the Supabase auth client.
  // config.js builds window.sb with createClient(url, key) and ALL-DEFAULT auth
  // options. On iOS WebKit those defaults bite us:
  //   • the default cross-tab lock (navigator.locks) can wedge per-request token
  //     resolution, so authenticated calls silently go out WITHOUT a JWT — RLS
  //     then rejects the write (insert -> 42501) while a cached read masks it.
  //     This is why even a fresh iOS sign-in fails to persist.
  //   • a single localStorage access that throws (private mode / storage
  //     partitioning) can knock out session persistence entirely.
  // We rebuild the client here — same project, default storageKey, so any
  // session already on the device is reused — with a serial in-memory lock and a
  // never-throw storage shim. config.js is left untouched. If anything goes
  // wrong we fall back to the original client, so desktop behaviour is unchanged.
  // ----------------------------------------------------------------------------
  function buildClient(){
    const orig = global.sb;
    const cfg = global.SNB_CONFIG || {};
    if(!orig || !global.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return orig;
    try{
      // serial, deadlock-proof lock (the auth-js processLock shape): each call
      // waits for the previous to settle, so token refreshes never overlap and
      // we never depend on navigator.locks (which misbehaves under iOS WebKit).
      let chain = Promise.resolve();
      const serialLock = (_name, _acquireTimeout, fn) => {
        const run = chain.then(() => fn());
        chain = run.then(() => {}, () => {});      // advance on settle, swallow errors
        return run;
      };
      // storage that can never throw: real localStorage when reachable, else a
      // memory map, so one WebKit access error can't kill the whole session.
      const mem = {};
      const safeStorage = {
        getItem(k){ try{ return global.localStorage.getItem(k); }catch(e){ return (k in mem) ? mem[k] : null; } },
        setItem(k, v){ try{ global.localStorage.setItem(k, v); }catch(e){ mem[k] = String(v); } },
        removeItem(k){ try{ global.localStorage.removeItem(k); }catch(e){ delete mem[k]; } },
      };
      const client = global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: safeStorage,
          lock: serialLock,
          // storageKey defaults to sb-<ref>-auth-token — identical to the
          // config.js client, so the device's existing session is picked up.
        },
      });
      try{ orig.auth.stopAutoRefresh(); }catch(e){}   // retire config.js's refresher (avoid two)
      global.sb = client;                              // keep console/diagnostic `sb` on the live client
      return client;
    }catch(e){ console.warn('[store] hardened client build failed, using default', e); return orig; }
  }

  const sb = buildClient();             // supabase client or null
  const CLOUD = !!sb;
  const PROFILE_KEY = 'snb_profile';    // local-mode current profile pointer

  // ---- door attribution: ?src= (GMS build item 1, 2026-07-13) ----
  // A label on the DOOR, not on the person. No identity, no email, no Circle member id,
  // nothing crossing between Circle and the app — just a string saying where the click
  // came from. Read once on load, validated against a fixed allowlist (anything else is
  // ignored, so a stray or spoofed param can never create a junk bucket), held for the
  // tab in sessionStorage — it has to survive the check-in and the practice, because the
  // events that matter fire later. Missing/invalid = 'direct'.
  // Stamped on checkins.source and on every events.meta.src for the session.
  const SRC_ALLOW = ['stuck','app-page','youtube','podcast','newsletter','circle','cohort','direct'];
  const SRC_KEY = 'snb_src';
  let _src = 'direct';
  try{
    const q = new URLSearchParams(global.location.search);
    const raw = (q.get('src')||'').trim().toLowerCase();
    if(raw && SRC_ALLOW.indexOf(raw) !== -1){
      _src = raw;
      sessionStorage.setItem(SRC_KEY, _src);
      // strip it so a plain reload doesn't re-read it (the session copy is the record)
      q.delete('src');
      history.replaceState(null,'',global.location.pathname+(q.toString()?'?'+q.toString():'')+global.location.hash);
    } else {
      _src = sessionStorage.getItem(SRC_KEY) || 'direct';
    }
  }catch(e){ _src = 'direct'; }
  function src(){ return _src; }

  /* 2026-08-17 — coarse platform on every event, so "how many Android users do we have"
     is a query instead of a guess. Buckets only — ios / android / desktop / other — plus
     whether the app is running installed rather than in a browser tab. The user-agent
     string itself is never stored and nothing here narrows toward a person; it is the
     same shape of label as `src`: about the device class, not the human. Added because
     the whole audio path in player.html is built against iOS quirks and we had no idea
     whether that mattered to 2% of people or 30%. iPadOS reports itself as a Mac, so the
     touch-point check catches it. */
  const _plat = (function(){
    try{
      const ua = navigator.userAgent || '';
      if(/android/i.test(ua)) return 'android';
      if(/iphone|ipod/i.test(ua)) return 'ios';
      if(/ipad/i.test(ua)) return 'ipados';
      if(/macintosh|mac os x/i.test(ua) && (navigator.maxTouchPoints||0) > 1) return 'ipados';
      if(/macintosh|windows|linux|cros/i.test(ua)) return 'desktop';
      return 'other';
    }catch(e){ return 'other'; }
  })();
  const _installed = (function(){
    try{
      if(navigator.standalone === true) return true;                       // iOS home-screen
      return !!(global.matchMedia && global.matchMedia('(display-mode: standalone)').matches);
    }catch(e){ return false; }
  })();

  let auth = { user: null };            // {id, email}
  let data = { checkins: [], sessions: [] };
  let outbox = { checkins: [], sessions: [] };
  let onChange = null;                  // app re-render hook (set in init)
  let sync = { state: 'idle', pending: 0, error: null };  // 'idle' | 'syncing' | 'error'

  const cacheKey = () => 'snb_cache_' + (auth.user ? auth.user.id : 'anon');
  function saveCache(){ try { localStorage.setItem(cacheKey(), JSON.stringify({ data, outbox, links })); } catch(e){} }
  function loadCache(){ try { const o = JSON.parse(localStorage.getItem(cacheKey())); if(o){ data = o.data||{checkins:[],sessions:[]}; outbox = o.outbox||{checkins:[],sessions:[]}; links = Array.isArray(o.links)?o.links:[]; } else { data={checkins:[],sessions:[]}; outbox={checkins:[],sessions:[]}; links=[]; } } catch(e){ data={checkins:[],sessions:[]}; outbox={checkins:[],sessions:[]}; links=[]; } _reconcile(); }

  // ---- sync plumbing (merge, live-session gating, loud failure) ----
  function notify(){ try{ onChange && onChange(); }catch(e){} }
  function setSync(state, error){
    sync.state = state;
    sync.error = error || null;   // diagnostic only — nothing reads it yet (syncStatus exposes state+pending; the toast keys off state)
    sync.pending = outbox.checkins.length + outbox.sessions.length;
    renderSyncToast();
  }

  // union check-in / session lists by timestamp. Later args win on shared fields
  // (cloud is authoritative for v/sym/dor/dom/...), while any field the cloud row
  // doesn't carry survives the merge. This is what keeps an un-synced check-in
  // visible instead of being wiped by a cloud read. (`challenge` was once the
  // local-only example here — it has had a cloud column since 2026-07.)
  function unionByT(...lists){
    const m = new Map();
    for(const list of lists){ if(!list) continue; for(const r of list){ if(r && r.t!=null){ m.set(r.t, Object.assign({}, m.get(r.t), r)); } } }
    return Array.from(m.values()).sort((a,b)=>a.t-b.t);
  }

  // a "your token isn't valid" failure (vs a transient network blip)?
  function isAuthError(err){
    if(!err) return false;
    const code = String(err.code||'');
    const status = err.status || err.statusCode;
    const msg = String(err.message||'').toLowerCase();
    return code==='42501' || code==='PGRST301' || status===401 || status===403 ||
           msg.includes('jwt') || msg.includes('row-level security') || msg.includes('not authorized');
  }

  // Return a live, non-expired session, refreshing if it is about to lapse;
  // null if there is no usable session. Authenticated reads/writes gate on this
  // so we never silently act on a stale or missing token (the iOS failure mode).
  async function ensureSession(){
    if(!CLOUD) return null;
    try{
      const { data:{ session } } = await sb.auth.getSession();
      if(!session) return null;
      const now = Math.floor(Date.now()/1000);
      if(session.expires_at && session.expires_at - now < 60){
        const { data:r, error } = await sb.auth.refreshSession();
        if(error) return session;                    // refresh failed — hand back what we have
        return (r && r.session) || session;
      }
      return session;
    }catch(e){ return null; }
  }

  // ---- loud failure: a small, self-contained "couldn't sync" toast.
  // Lives entirely in store.js (no app.css / app.js dependency) so the whole fix
  // ships as one identical file to both repos.
  function renderSyncToast(){
    try{
      if(typeof document==='undefined' || !document.body) return;
      const id='snb-sync-toast';
      const existing=document.getElementById(id);
      if(sync.state!=='error'){ if(existing) existing.remove(); return; }
      if(existing) return;
      const el=document.createElement('div');
      el.id=id; el.setAttribute('role','status');
      el.style.cssText='position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:99999;max-width:88%;display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:14px;background:#3a2a2a;color:#fff;font:500 13px/1.35 -apple-system,system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.28)';
      el.appendChild(document.createTextNode('your last check-in hasn’t synced yet.'));
      const b=document.createElement('button');
      b.type='button'; b.textContent='retry';
      b.style.cssText='appearance:none;border:0;background:rgba(255,255,255,.18);color:#fff;font:600 13px/1 inherit;padding:7px 12px;border-radius:9px;cursor:pointer';
      b.onclick=()=>{ setSync('syncing'); hydrate(); };
      el.appendChild(b);
      document.body.appendChild(el);
    }catch(e){}
  }

  // ---- practice pairing (2026-08-07) ------------------------------------------------
  // A check-in only answers "did this practice do anything" if we know WHICH practice it
  // belongs to and WHEN in the arc it was taken. Live sessions have had that since 07-17
  // (live_session_id + phase); ordinary in-app practices had neither, so pairs were
  // reconstructed by timestamp guesswork downstream. Now the app states it:
  //   before   — the read that drove the recommendation, stamped at launch
  //   after    — the read taken right after the practice
  //   followup — the ~3h read. NOT the same measurement: the immediate lift in safety
  //              fades, the drop in sympathetic does not. Two effects, two rows.
  const AFTER_MS  = 45*6e4;               // 'after' window: 0–45 min past the practice
  const FOLLOW_LO = 90*6e4;               // 'followup' window: 90 min …
  const FOLLOW_HI = 6*36e5;               //                    … 6 h (the ~3h read, generously bracketed)
  const BEFORE_MS = 90*6e4;               // how stale the driving check-in may be at launch

  function _uuid(){
    try{ if(global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID(); }catch(e){}
    try{
      const b = new Uint8Array(16); global.crypto.getRandomValues(b);
      b[6]=(b[6]&0x0f)|0x40; b[8]=(b[8]&0x3f)|0x80;
      const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
      return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
    }catch(e){}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch=>{
      const r=Math.random()*16|0; return (ch==='x'?r:(r&0x3|0x8)).toString(16); });
  }
  function newSessionId(){ return _uuid(); }
  // a data-clear name for what was practiced. Mirrors the live flow's practice_ref.
  function practiceRefOf(s){
    if(!s || !s.practiceKey) return null;
    return (s.practiceKey==='most' && s.skill) ? ('most:'+s.skill) : s.practiceKey;
  }
  // ---- challenge appetite: shared levels + label (used by check-in + advisor + you) ----
  // The ONE source of the challenge_level vocabulary (cloud column included). The
  // practice-rung map below derives from it, so a wording change here cannot fork the
  // column's vocabulary between the appetite path and the practice-rung fallback.
  // (practiceLabelFor / PRACTICE_LABEL are a DIFFERENT vocabulary — practice display
  // names, not challenge levels — do not merge them into this.)
  const CHALLENGE_LEVELS = [
    { v:0.12, key:'settle',  label:'simple mindfulness' },
    { v:0.40, key:'gentle',  label:'safety-focused' },
    { v:0.65, key:'meet',    label:'beginner defense' },
    { v:0.90, key:'stretch', label:'advanced defense' },
  ];
  function challengeLabel(v){
    if(v==null||isNaN(v)) return null;
    let b=CHALLENGE_LEVELS[0];
    for(const l of CHALLENGE_LEVELS){ if(Math.abs(l.v-v)<Math.abs(b.v-v)) b=l; }
    return b.label;
  }
  const _CHL = {}; CHALLENGE_LEVELS.forEach(l => _CHL[l.key] = l.label);
  // The rung a practice IS, for when no challenge appetite was recorded. 221 of 288
  // sessions had a null challenge_level because it was derived only from the check-in's
  // appetite slider, which is usually left alone. The practice itself always knows.
  // 'more' = the standalone guided meditations, which sit off the rung ladder entirely.
  // It gets its own honest label rather than being forced onto a rung it isn't on.
  const _PRACTICE_RUNG = { micro:_CHL.settle, mindfulness:_CHL.settle, anchoring:_CHL.gentle, more:'guided meditation' };
  function rungForPractice(s){
    if(!s || !s.practiceKey) return null;
    if(s.practiceKey==='most') return (s.skill==='balancing'||s.skill==='pendulation') ? _CHL.stretch : _CHL.meet;
    return _PRACTICE_RUNG[s.practiceKey] || null;
  }
  // Which phase does a check-in taken at `t` belong to? Looks only at the most recent
  // session that has an id, and only fills a phase that session doesn't already have —
  // so a second read inside the same window never overwrites the first.
  function _phaseFor(t){
    let s = null;
    for(const x of data.sessions){ if(x && x.id && typeof x.t==='number' && x.t<=t && (!s || x.t>s.t)) s=x; }
    if(!s) return null;
    const d = t - s.t;
    let phase = null;
    if(d >= 0 && d <= AFTER_MS) phase = 'after';
    else if(d >= FOLLOW_LO && d <= FOLLOW_HI) phase = 'followup';
    if(!phase) return null;
    if(data.checkins.some(c => c && c.session_id===s.id && c.phase===phase)) return null;   // already have that reading
    return { session_id:s.id, phase, practice_ref:practiceRefOf(s) };
  }
  // Stamp the check-in that drove this practice as its 'before'. Called at launch, when
  // the session row does not exist yet — the cloud write is deferred (see _flushLinks).
  function markPracticeBefore(sessionId, practiceRef){
    if(!sessionId) return null;
    const now = Date.now();
    /* 2026-08-16 — WALK BACK instead of giving up on the newest reading.
       This used to take the single most recent check-in, then bail if it was stale or
       already tagged. Measured on prod: of 45 sessions since 2026-08-07 with no 'before'
       read, 27 had a check-in inside the window (median gap 13 minutes), and 14 of those
       failed for exactly one reason — the NEWEST reading was already spoken for, usually
       as the PREVIOUS practice's 'after'. An earlier, unclaimed reading was sitting right
       there in the same window and we never looked at it.
       This is the biggest limiter on practice-effect: a pair needs a before, and only 40%
       of sessions had one. Same window, same rule about never stealing a reading that
       already belongs to another session. We just stop giving up at the first candidate. */
    const c = data.checkins
      .filter(x => x && typeof x.t === 'number' && x.t <= now && (now - x.t) <= BEFORE_MS)
      .sort((a, b) => b.t - a.t)
      .find(x => !x.session_id && !x.phase && !x.live_session_id);
    if(!c) return null;
    _linkCheckin(c.t, { session_id:sessionId, phase:'before', practice_ref:(practiceRef||null) });
    return c.t;
  }
  // Deferred check-in links. session_id is a real FK, so an UPDATE that names a session
  // the cloud has not seen yet fails. Links therefore wait, on disk, until their session
  // row has actually synced — then they go up. Nothing is lost across a reload.
  let links = [];
  function _linkCheckin(t, fields){
    const i = data.checkins.findIndex(x=>x && x.t===t); if(i<0) return;
    Object.assign(data.checkins[i], fields);
    const oi = outbox.checkins.findIndex(x=>x && x.t===t);
    if(oi>=0){ Object.assign(outbox.checkins[oi], fields); saveCache(); return; }   // rides the pending INSERT
    links.push({ t, fields });
    saveCache();
    if(CLOUD) flush();
  }
  function _sessionSynced(id){
    if(!id) return false;
    if(outbox.sessions.some(s=>s && s.id===id)) return false;      // still queued — its row isn't there yet
    return data.sessions.some(s=>s && s.id===id);
  }
  async function _flushLinks(){
    if(!links.length || !auth.user) return true;
    let ok = true;
    for(const l of links.slice()){
      if(!_sessionSynced(l.fields && l.fields.session_id)) continue;   // wait for the session row
      const { error } = await sb.from('checkins').update(l.fields).eq('user_id', auth.user.id).eq('t', l.t);
      if(error){ console.warn('[store] link failed', error); ok = false; continue; }
      const i = links.indexOf(l); if(i>=0) links.splice(i,1);
    }
    saveCache();
    return ok;
  }

  // ---- row mappers (cloud columns are snake_case) ----
  const rowToCheckin = r => { const c = { t:r.t, v:r.v, sym:r.sym, dor:r.dor, note:r.note, dom:r.dom,
    challenge:(typeof r.challenge==='number'?r.challenge:null), source:(r.source||null) };
    // live check-in tags (2026-07-17, Live-Checkin-Plan Phase 1) — carried both ways so
    // the live flow's "which readings are done" survives a device switch.
    if(r.live_session_id){ c.live_session_id=r.live_session_id; c.joined=r.joined||null; }
    // in-app practice link (2026-08-07): session_id + phase + practice_ref make every
    // ordinary practice produce the same clean pairing the live flow already produced.
    if(r.session_id) c.session_id=r.session_id;
    if(r.phase) c.phase=r.phase;
    if(r.practice_ref) c.practice_ref=r.practice_ref;
    return c; };
  const checkinToRow = c => { const r = { user_id:auth.user.id, t:c.t, v:c.v, sym:c.sym, dor:c.dor, note:c.note||'', dom:c.dom,
    challenge:(typeof c.challenge==='number'?c.challenge:null), source:(c.source||null) };
    // The pairing columns are ALWAYS emitted, null when unset. PostgREST rejects a bulk
    // insert whose objects don't share a key set ("All object keys must match"), so a
    // batch holding one tagged and one untagged check-in used to fail as a whole and the
    // outbox would stick forever. (Latent since the live columns went in — an offline
    // queue mixing a live and an ordinary check-in hit the same wall.)
    // session_id is a FK, so it only ever goes up once the session row itself is in the
    // cloud — see _flushLinks + the sessions-first flush order.
    r.live_session_id = c.live_session_id || null;
    r.joined          = c.live_session_id ? (c.joined||null) : null;
    r.session_id      = c.session_id || null;
    r.phase           = c.phase || null;
    r.practice_ref    = c.practice_ref || null;
    return r; };
  // practice_label = a data-clear name for the practice track. The internal keys 'most'
  // and 'more' are opaque, so they are stored as 'self-regulation' and 'guided meditation'
  // (matching _PRACTICE_RUNG and PRACTICE_LABEL — one vocabulary, three maps, see the
  // cross-references at each); the other keys are self-explanatory and pass through.
  const practiceLabelFor = k => (k==='most' ? 'self-regulation' : k==='more' ? 'guided meditation' : (k||null));
  const rowToSession = r => ({ id:(r.id||null), t:r.t, practiceKey:r.practice_key, skill:r.skill, sense:r.sense, silence:r.silence, completed:r.completed, endedEarly:r.ended_early, minutes:r.minutes, domBefore:r.dom_before, feedback:(r.feedback||null), challenge:(typeof r.challenge==='number'?r.challenge:null), challengeLevel:(r.challenge_level||null), practiceLabel:(r.practice_label||null), descDefense:(r.desc_defense==null?null:!!r.desc_defense), meditationId:(r.meditation_id||null), selfRegLevel:(r.self_reg_level||null), afterFeeling:(r.after_feeling||null), exitReason:(r.exit_reason||null), openEnded:(r.open_ended==null?null:!!r.open_ended), loops:(typeof r.loops==='number'?r.loops:null), holdWatch:(r.hold_watch==null?null:!!r.hold_watch), holdWatchSeconds:(typeof r.hold_watch_seconds==='number'?r.hold_watch_seconds:null), holdWatchTargetSeconds:(typeof r.hold_watch_target_seconds==='number'?r.hold_watch_target_seconds:null), emotionIntent:(r.emotion_intent||null), emotionSurfaced:(r.emotion_surfaced||null) });
  // id is minted on the CLIENT (newSessionId) so a check-in can be tagged with the
  // session it belongs to before the session row has ever reached the cloud. Sending it
  // explicitly just overrides the table's gen_random_uuid() default.
  const sessionToRow = s => ({ id:s.id, user_id:auth.user.id, t:s.t, practice_key:s.practiceKey, skill:s.skill, sense:s.sense, silence:s.silence, completed:!!s.completed, ended_early:!!s.endedEarly, minutes:s.minutes, dom_before:s.domBefore, feedback:(s.feedback||null), challenge:(typeof s.challenge==='number'?s.challenge:null), challenge_level:(s.challengeLevel||null), practice_label:practiceLabelFor(s.practiceKey), desc_defense:(s.descDefense==null?null:!!s.descDefense), meditation_id:(s.meditationId||null), self_reg_level:(s.selfRegLevel||null), after_feeling:(s.afterFeeling||null), exit_reason:(s.exitReason||null), open_ended:(s.openEnded==null?null:!!s.openEnded), loops:(typeof s.loops==='number'?s.loops:null), hold_watch:(s.holdWatch==null?null:!!s.holdWatch), hold_watch_seconds:(typeof s.holdWatchSeconds==='number'?s.holdWatchSeconds:null), hold_watch_target_seconds:(typeof s.holdWatchTargetSeconds==='number'?s.holdWatchTargetSeconds:null), emotion_intent:(s.emotionIntent||null), emotion_surfaced:(s.emotionSurfaced||null) });

  // ---- lifecycle ----
  async function init(cb){
    onChange = cb || null;
    if(CLOUD){
      try{
        // React to background token refreshes / sign-in elsewhere: keep auth.user
        // current and re-sync + re-render when a valid session (re)appears. This
        // is what recovers the UI on iOS once the session plumbing settles.
        sb.auth.onAuthStateChange((event, session)=>{
          if(event==='INITIAL_SESSION') return;          // handled by the explicit load below
          if(event==='PASSWORD_RECOVERY'){               // arrived via a reset-password email link
            if(session && session.user){ auth.user = { id:session.user.id, email:session.user.email }; loadCache(); }
            recoveryPending = true;
            if(typeof onRecovery==='function') onRecovery();
            return;
          }
          if(session && session.user){
            const was = auth.user && auth.user.id;
            auth.user = { id:session.user.id, email:session.user.email, anon:!!session.user.is_anonymous };
            if(was !== auth.user.id) loadCache();
            if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED' || was !== auth.user.id) hydrate();
            if(event==='SIGNED_IN'){ checkMembership(); fetchBilling(); }
          } else if(event==='SIGNED_OUT'){
            auth.user = null;
          }
        });
        const session = await ensureSession();           // live, refreshed-if-needed session — not a cached pointer
        if(session && session.user){ auth.user = { id:session.user.id, email:session.user.email, anon:!!session.user.is_anonymous }; loadCache(); flushEvents(); await hydrate(); checkMembership(); fetchBilling(); }
      }catch(e){ console.warn('session check failed', e); }
    } else {
      const p = readProfile();
      if(p){ auth.user = p; loadCache(); }
    }
    cb && cb();
  }
  // ---- circle membership stamp ----
  // fire-and-forget, at most once a day: asks the circle-membership edge
  // function to check whether this account's email is an unstucking-academy
  // co-regulation member, and stamp the entitlements table. Nothing in the
  // app is gated on it yet; it keeps membership status current for when a
  // paid tier exists.
  function checkMembership(){
    if(!CLOUD || !auth.user) return;
    try{
      const cfg = global.SNB_CONFIG || {};
      if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
      const k='snb_ent_checked_'+auth.user.id, last=+(localStorage.getItem(k)||0);   // per-user: two accounts on one device check independently
      if(Date.now()-last < 864e5) return;
      sb.auth.getSession().then(({ data:{ session } })=>{
        if(!session) return;
        fetch(cfg.SUPABASE_URL + '/functions/v1/circle-membership', {
          method:'POST',
          headers:{ Authorization:'Bearer ' + session.access_token, apikey: cfg.SUPABASE_ANON_KEY }
        }).then(r=>{ if(r.ok){ try{ localStorage.setItem(k, String(Date.now())); }catch(e){} } }).catch(()=>{});
      }).catch(()=>{});
    }catch(e){}
  }
  // ---- billing / subscription status ----
  // Nobody is gated out of the app any more (free is unconditional, 2026-07-13). This
  // now only answers "is there an active subscription", for the settings card and for
  // the paid FEATURE line once that is built. Cached locally so a returning subscriber
  // isn't misread as free before the network answers.
  const BILLING_LS = 'snb_billing';
  function _billingKey(){ return BILLING_LS + '_' + ((auth.user && auth.user.id) || 'anon'); }
  function _readBillingCache(){ try{ return JSON.parse(localStorage.getItem(_billingKey())) || null; }catch(e){ return null; } }
  function _writeBillingCache(o){ try{ localStorage.setItem(_billingKey(), JSON.stringify(o)); }catch(e){} }
  async function fetchBilling(){
    if(!CLOUD || !auth.user) return;
    try{
      // (the is_trial_cohort RPC still exists server-side; the client stopped calling
      // it 2026-08-22 — nothing ever consumed the answer. Same date: the cached
      // trialEnd/cohort fields went with it — there is no trial any more.)
      const [rowRes, entRes] = await Promise.all([
        sb.from('billing').select('*').eq('user_id', auth.user.id).maybeSingle(),
        sb.from('entitlements').select('circle_member,legacy').eq('user_id', auth.user.id).maybeSingle(),
      ]);
      auth.billing = (rowRes && rowRes.data) || null;
      const ent = (entRes && entRes.data) || null;
      auth.ent = { circle: !!(ent && ent.circle_member), legacy: !!(ent && ent.legacy) };
      _writeBillingCache({ status: auth.billing ? auth.billing.sub_status : null,
                           circle: auth.ent.circle, legacy: auth.ent.legacy, at: Date.now() });
      if(typeof notify === 'function') notify();
    }catch(e){ /* keep last-known cache */ }
  }
  function billing(){
    if(auth.billing) return auth.billing;
    const c = _readBillingCache();
    return c ? { sub_status:c.status } : null;
  }
  function _billingActive(){ const b = billing(); return !!(b && (b.sub_status==='trialing' || b.sub_status==='active')); }

  // ---- the free/paid FEATURE line (2026-07-13) ----
  // FREE IS UNCONDITIONAL (2026-07-13): nobody is ever blocked out of the app by a
  // paywall — free has no time limit and no card. (The old whole-app hasAccess()
  // gate was removed 2026-08-22; it had returned a bare `true` since 07-13.)
  // What free is, forever: unlimited check-ins, the immediate state read, the two
  // mindfulness practices, their own saved check-in history. Nothing a guest ever
  // touched is taken away — that is a hard rule, not a preference.
  // What the base plan adds: the MATCHING (practices built from your check-ins), the
  // other practices (safety anchoring, self-regulation, the meditation library), your
  // patterns across all their check-ins (the pattern cards), and the reader (which runs
  // the moment, the day, the week and beyond — it is NOT a weekly).
  //
  // Paid = an active subscription, OR an Academy co-regulator (the entitlements table
  // has stamped Circle membership since day one and was never wired to anything — this
  // is what it was built for), OR a grandfathered pre-existing account (`legacy`, a
  // one-time server-side stamp over the accounts that existed on 2026-07-13; it is NOT
  // date-derived, because a cutoff date would silently grandfather every guest who mints
  // an anonymous session today and then signs up).
  //
  // Fail CLOSED for an anonymous guest (they are pre-account by definition), and OPEN
  // for on-device mode (never gated). Between those, an unknown answer falls back to the
  // local cache so a paying subscriber never flickers into the free tier on a slow
  // network — the honest failure here is to over-serve, never to lock someone out.
  function isPaid(){
    if(!CLOUD) return true;                    // on-device mode is never gated
    if(isAnonymous()) return false;            // a guest has no account yet
    if(_billingActive()) return true;          // paying
    if(typeof auth.ent === 'object' && auth.ent) return !!(auth.ent.circle || auth.ent.legacy);
    const c = _readBillingCache();             // network hasn't answered yet
    return !!(c && (c.circle || c.legacy));
  }
  // WHY this account has the base plan — display only (settings names the reason
  // instead of calling a grandfathered/Academy account "the free plan", 2026-07-14).
  function entitlement(){
    const e = (typeof auth.ent === 'object' && auth.ent) ? auth.ent : (_readBillingCache() || {});
    return { sub: _billingActive(), circle: !!e.circle, legacy: !!e.legacy };
  }
  async function _postFn(name, body){
    const cfg = global.SNB_CONFIG || {};
    try{
      const { data:{ session } } = await sb.auth.getSession();
      if(!session) return { error:'not signed in' };
      const r = await fetch(cfg.SUPABASE_URL + '/functions/v1/' + name, {
        method:'POST',
        // no apikey header on purpose: these fns run verify_jwt=off + auth via the
        // Bearer token internally. Sending apikey would add it to the CORS preflight,
        // which the function's allow-headers must echo — simpler to just not send it.
        headers:{ Authorization:'Bearer ' + session.access_token, 'Content-Type':'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      let b={}; try{ b = await r.json(); }catch(e){}
      if(!r.ok || !b.url) return { error:(b && b.error) || 'something went wrong. please try again in a moment.' };
      return { url:b.url };
    }catch(e){ return { error:String((e&&e.message)||e) }; }
  }
  // ---- subscribe ----
  // No trial (2026-07-13): first charge today. Two intervals share ONE product / ONE set of
  // entitlements (annual added 2026-07-15): monthly $12/mo, annual $108/yr. `plan` names the
  // interval; the edge function is the authority — it bills annual ONLY on an exact match and
  // falls back to monthly on anything else, so a bad `plan` can never mischarge. `origin` and
  // `src` are REPORTING labels only; they buy no different terms. Both doors call the same
  // function; startGuestCheckout just tags the row so the pulse can read guest and cohort as
  // two lines and never blend them.
  // ---- live sessions (2026-07-17, Live-Checkin-Plan Phase 1) ----
  // Both go through the get-live-session edge function (verify_jwt: the anon key is a
  // valid JWT, so no user session is required — the join code is on the shared screen,
  // the check-ins themselves are what's account-bound).
  async function _liveGet(qs){
    const cfg = global.SNB_CONFIG || {};
    try{
      const r = await fetch(cfg.SUPABASE_URL + '/functions/v1/get-live-session' + (qs||''), {
        headers:{ Authorization:'Bearer ' + cfg.SUPABASE_ANON_KEY, apikey: cfg.SUPABASE_ANON_KEY },
      });
      let b={}; try{ b = await r.json(); }catch(e){}
      if(!r.ok) return { error:(b && b.error) || ('status ' + r.status) };
      return b;
    }catch(e){ return { error:String((e&&e.message)||e) }; }
  }
  // full session (id, code, type, recipe, practices, started_at, expires_at, live) or {error}
  function liveFetch(code){ return _liveGet('?code=' + encodeURIComponent(String(code||''))); }
  // {live:[{code,type,started_at,expires_at}...]} — powers the "we're live" nudge poll
  function livePoll(){ return _liveGet(''); }

  async function startCheckout(origin, plan){
    if(!CLOUD) return { error:'unavailable' };
    const p = String(plan||'').toLowerCase()==='annual' ? 'annual' : 'monthly';
    const res = await _postFn('create-checkout', { origin: origin || 'member', src: _src, plan: p });
    if(res.url){
      // funnel: record the handoff to Stripe so the gap between subscribe_click and payment
      // stops being a black box (paired with checkout_cancel on the return). Await the write
      // before navigating away, but cap it so a slow insert can never delay the redirect.
      try{ await Promise.race([ _trackEventNow('checkout_redirect', { origin: origin||'member', plan: p }), _sleep(600) ]); }catch(e){}
      location.href = res.url;
    } else {
      // no url = the function refused or errored; a silent client-side dead end is now visible.
      // reason is a coarse code, never the raw message (no PII into the funnel).
      trackEvent('checkout_error', { origin: origin||'member', plan: p, reason: (res && res.error) ? 'server_error' : 'no_url' });
    }
    return res;
  }
  async function startGuestCheckout(plan){ return startCheckout('guest', plan); }
  // ---- funnel events (on-ramp instrumentation, GMS 2026-07-13) ----
  // Fire-and-forget, write-only (RLS: insert-own only; nothing reads it client-side).
  // offer_view / subscribe_click / continue_free ride through here so conversion
  // timing becomes evidence. Failure is silent by design — never block a screen on it.
  //
  // guest_land fires BEFORE any session exists (the anonymous session mints at first
  // write, by design — that's what makes the check-in's trust line true). So an event
  // with no user is not dropped: it is parked in localStorage with its real timestamp
  // and flushed the moment a session exists. Without this, guest_land — the denominator
  // for the whole funnel — would never be recorded.
  const EV_PENDING = 'snb_events_pending';
  function _evRead(){ try{ return JSON.parse(localStorage.getItem(EV_PENDING)||'[]'); }catch(e){ return []; } }
  function _evWrite(a){ try{ localStorage.setItem(EV_PENDING, JSON.stringify(a.slice(-200))); }catch(e){} }
  function trackEvent(name, meta){
    if(!CLOUD || !name) return;
    const row = { name:String(name), meta: Object.assign({}, meta||{}, { src:_src, plat:_plat, pwa:_installed }), t:new Date().toISOString() };
    if(!auth.user){ const q=_evRead(); q.push(row); _evWrite(q); return; }
    try{ sb.from('events').insert(Object.assign({ user_id: auth.user.id }, row)).then(()=>{}, ()=>{}); }catch(e){}
  }
  // Drain anything parked pre-session. Fire-and-forget; on failure the rows stay parked
  // and the next flush retries. Never blocks a screen.
  function flushEvents(){
    if(!CLOUD || !auth.user) return;
    const q = _evRead(); if(!q.length) return;
    _evWrite([]);
    try{
      sb.from('events').insert(q.map(r=>Object.assign({ user_id: auth.user.id }, r)))
        .then(()=>{}, ()=>{ const cur=_evRead(); _evWrite(q.concat(cur)); });
    }catch(e){ const cur=_evRead(); _evWrite(q.concat(cur)); }
  }
  const _sleep = ms => new Promise(r=>setTimeout(r, ms));
  // Like trackEvent but returns the insert promise, so a caller about to navigate away
  // (the checkout redirect) can await the write. Falls back to the parked path if there is
  // somehow no session yet (it flushes on next load, keeping the real timestamp).
  function _trackEventNow(name, meta){
    if(!CLOUD || !name) return Promise.resolve();
    if(!auth.user){ trackEvent(name, meta); return Promise.resolve(); }
    const row = { user_id: auth.user.id, name:String(name), meta: Object.assign({}, meta||{}, { src:_src, plat:_plat, pwa:_installed }), t:new Date().toISOString() };
    try{ return sb.from('events').insert(row).then(()=>{}, ()=>{}); }catch(e){ return Promise.resolve(); }
  }
  async function openPortal(){ if(!CLOUD) return { error:'unavailable' }; const res = await _postFn('customer-portal'); if(res.url) location.href = res.url; return res; }

  function readProfile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch(e){ return null; } }
  function writeProfile(p){ try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch(e){} }
  function clearProfile(){ try { localStorage.removeItem(PROFILE_KEY); } catch(e){} }

  // Orientation asks "has this person been here before?" and answers it from check-in
  // history. But hydrate() is async — two network reads deep — while isPaid() resolves
  // from the billing cache the moment auth lands. That leaves a window where paid is
  // true and data.checkins is still empty, and a returning member on a fresh install
  // gets walked through orientation again. This flag closes the window: it means the
  // cloud read has FINISHED, whatever it returned. Set on every terminal path, including
  // failure — a network error must not gate a genuinely new member out of orientation.
  // (Justin, 2026-08-17: re-added beta to his phone, got orientation despite 128 check-ins.)
  // Tracks WHICH user's cloud read has completed, not merely 'a read happened'. The first
  // version of this was a plain boolean set on every terminal path — including the
  // !auth.user early return, which on a fresh install runs at first paint, BEFORE sign-in.
  // That set the flag true before any read had occurred, so the gate was a no-op and
  // orientation still replayed. Keyed to the user id, a signed-out first paint can no
  // longer satisfy it. (Justin, 2026-08-17: deleted and re-added, welcome popped again.)
  let _hydratedFor = null;
  function hydrated(){
    try{
      if(!CLOUD) return true;                      // on-device mode has nothing to wait for
      const u = auth.user; if(!u) return false;    // signed out — no history to have loaded
      return _hydratedFor === u.id;
    }catch(e){ return false; }
  }

  async function hydrate(){
    if(!CLOUD || !auth.user) return;
    setSync('syncing');
    await flush();                                   // push anything queued offline first
    try{
      const session = await ensureSession();         // a real GET, not the local cache, must be authenticated
      if(!session){ setSync((outbox.checkins.length||outbox.sessions.length) ? 'error' : 'idle', 'no session'); _hydratedFor = auth.user && auth.user.id; return; }
      const [cs, ss] = await Promise.all([
        sb.from('checkins').select('*').order('t', { ascending:true }),
        sb.from('sessions').select('*').order('t', { ascending:true }),
      ]);
      let fetched = false;   // a cloud read succeeded — no diffing, so notify() runs after every good hydrate
      // MERGE (union by t), never overwrite: local + still-queued outbox + cloud.
      // An un-synced check-in stays visible and is never lost to a cloud read.
      if(!cs.error){ data.checkins = unionByT(data.checkins, outbox.checkins, (cs.data||[]).map(rowToCheckin)); fetched = true; }
      if(!ss.error){ data.sessions = unionByT(data.sessions, outbox.sessions, (ss.data||[]).map(rowToSession)); fetched = true; }
      _reconcile();                                    // re-apply deletions + edits over whatever the cloud just merged back
      saveCache();
      setSync((outbox.checkins.length||outbox.sessions.length) ? 'error' : 'idle', (cs.error||ss.error)||null);
      _hydratedFor = auth.user && auth.user.id;      // cloud read done for THIS user — orientation may now decide
      if(fetched) notify();                          // re-render once fresh data lands (post-init / post-refresh)
      migrateContexts(); pullContexts();             // context chips: lift local up once, then merge cloud in

    }catch(e){ _hydratedFor = auth.user && auth.user.id; console.warn('hydrate failed (using cache)', e); setSync((outbox.checkins.length||outbox.sessions.length) ? 'error' : 'idle', e); }
  }

  let flushing = false;
  async function flush(){
    if(!CLOUD || !auth.user) return;
    if(flushing) return;                 // a flush is already in flight; it will drain the outbox
    flushing = true;
    let ok = true;
    try{
      // SESSIONS FIRST, always: checkins.session_id is a foreign key, so a check-in that
      // names a session the cloud hasn't got yet is rejected and the whole batch sticks.
      // (This order was the other way round before the practice-pairing work.)
      outbox.sessions.forEach(s=>{ if(s && !s.id) s.id = _uuid(); });   // legacy queued rows predate client-minted ids
      if(outbox.sessions.length) ok = await flushTable('sessions', outbox.sessions, sessionToRow);
      if(ok) ok = await _flushLinks();
      if(ok && outbox.checkins.length) ok = await flushTable('checkins', outbox.checkins, checkinToRow);
    } finally {
      flushing = false;
    }
    // drained cleanly but more arrived mid-flush? keep going. otherwise surface state.
    if(ok && (outbox.checkins.length || outbox.sessions.length)){ setSync('syncing'); return flush(); }
    setSync(ok ? 'idle' : 'error');
  }
  // Push one table's outbox. On an auth failure (no/expired JWT — the iOS case),
  // refresh the session once and retry before giving up. Returns true if the
  // queue drained, false if it is stuck (items stay queued; nothing is dropped).
  async function flushTable(table, queue, toRow){
    if(!queue.length) return true;
    const batch = queue.slice();
    let { error } = await sb.from(table).insert(batch.map(toRow));
    if(error && isAuthError(error)){
      try{ await sb.auth.refreshSession(); }catch(e){}
      const live = await ensureSession();
      if(live){ ({ error } = await sb.from(table).insert(batch.map(toRow))); }
    }
    if(!error){ queue.splice(0, batch.length); saveCache(); return true; }
    console.warn('[store] sync failed for', table, error);
    return false;
  }

  // ---- auth ----
  async function signUp(email, password){
    if(CLOUD){
      const { data:res, error } = await sb.auth.signUp({ email, password });
      if(error) return { error: error.message };
      if(res.user && !res.session) return { needsConfirm: true };     // email confirmation on
      if(res.user){ auth.user = { id:res.user.id, email:res.user.email, anon:false }; loadCache(); await hydrate(); }
      return {};
    }
    return localEnter(email);
  }
  async function signIn(email, password){
    if(CLOUD){
      const { data:res, error } = await sb.auth.signInWithPassword({ email, password });
      if(error) return { error: error.message };
      auth.user = { id:res.user.id, email:res.user.email, anon:false }; loadCache(); await hydrate();
      return {};
    }
    return localEnter(email);
  }
  // ---- anonymous (guest) sign-in ----
  // The pre-signup guest flow: a visitor can do a real check-in, get a real
  // reflection, and try one practice before creating an account. Supabase
  // anonymous auth mints a real auth.uid() (is_anonymous=true), which satisfies
  // the RLS `auth.uid() = user_id` on checkins/sessions/contexts/preferences —
  // no schema change. linkIdentity() later attaches an email/password to the
  // SAME user, so everything the guest did carries over with zero migration.
  async function signInAnonymously(){
    if(CLOUD){
      const { data:res, error } = await sb.auth.signInAnonymously();
      if(error) return { error: error.message };
      if(res && res.user){ auth.user = { id:res.user.id, email:res.user.email||'', anon:true }; loadCache(); flushEvents(); }
      return {};
    }
    return localEnter('');   // on-device mode: just a local session
  }
  // true while the person is a guest (anonymous auth, no email yet). Used to keep
  // the guest UI tabbar-free and to hard-refuse the self-regulation track before signup.
  function isAnonymous(){
    if(!CLOUD) return false;
    if(auth.user && typeof auth.user.anon==='boolean') return auth.user.anon;
    return !!(auth.user && !auth.user.email);   // fallback: an anon user has no email
  }
  // Convert an anonymous guest into a permanent account WITHOUT changing user_id:
  // attaching an email + password upgrades the same auth user in place, so the
  // guest's check-in/session/context rows stay theirs. Mirrors signUp's return shape.
  async function linkIdentity(email, password){
    if(CLOUD){
      const { data:res, error } = await sb.auth.updateUser({ email, password });
      if(error) return { error: error.message };
      if(res && res.user){ auth.user = { id:res.user.id, email:res.user.email||email, anon:false }; }
      // some projects require confirming the newly-attached email; surface that like signUp does
      if(res && res.user && res.user.new_email && !res.user.email_confirmed_at){ /* email set, confirmation may follow */ }
      loadCache(); await hydrate();
      return {};
    }
    return localEnter(email);
  }
  // ---- password reset (forgot password) ----
  // resetPassword sends Supabase's recovery email; the link signs the person in
  // and returns them to the app, where PASSWORD_RECOVERY fires and the app shows
  // a set-new-password screen (which calls updatePassword).
  let onRecovery = null, recoveryPending = false;
  function onPasswordRecovery(fn){ onRecovery = fn; if(recoveryPending && typeof fn==='function') fn(); }
  async function resetPassword(email){
    if(!CLOUD) return {};
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' });
    return error ? { error: error.message } : {};
  }
  async function updatePassword(password){
    if(!CLOUD) return {};
    const { error } = await sb.auth.updateUser({ password });
    if(!error) recoveryPending = false;
    return error ? { error: error.message } : {};
  }
  function localEnter(email){
    auth.user = { id:'local:'+(email||'me'), email:email||'' };
    writeProfile(auth.user); loadCache(); return {};
  }
  // full self-serve account deletion: the delete-account edge function removes
  // the caller's rows + auth user server-side, then we clear everything local.
  async function deleteAccount(){
    if(!auth.user) return { error:'not signed in' };
    try{
      if(CLOUD){
        const cfg = global.SNB_CONFIG || {};
        const { data:{ session } } = await sb.auth.getSession();
        if(!session) return { error:'not signed in' };
        const call = (tok) => fetch(cfg.SUPABASE_URL + '/functions/v1/delete-account', {
          method:'POST',
          headers:{ Authorization:'Bearer ' + tok, apikey: cfg.SUPABASE_ANON_KEY }
        });
        let r = await call(session.access_token);
        if(r.status === 401){
          // A long-lived PWA session can hold a token the server no longer accepts
          // (2026-07-14: exactly this staleness made delete fail on a real device with
          // a dead-end error). Refresh the session once and retry; if the server still
          // says no, the honest ask is a fresh sign-in, never "try again in a moment".
          try{
            const { data:rd } = await sb.auth.refreshSession();
            if(rd && rd.session) r = await call(rd.session.access_token);
          }catch(e){}
          if(r.status === 401) return { error:'please sign out and sign back in, then try again.' };   // 🖊 approved 2026-07-14
        }
        if(!r.ok){
          let m='could not delete the account right now. please try again in a moment.';
          try{ const b=await r.json(); if(b && b.error && b.error!=='not signed in') m=b.error; }catch(e){}
          return { error:m };
        }
      }
      await signOut();   // clears in-memory data; server session is already gone
      // both prefixes: current keys are snb_ (underscore); pre-2026-08-22 context keys were snb- (dash)
      try{ Object.keys(localStorage).filter(k=>k.indexOf('snb_')===0 || k.indexOf('snb-')===0).forEach(k=>localStorage.removeItem(k)); }catch(e){}
      return {};
    }catch(e){ return { error:String((e&&e.message)||e) }; }
  }
  async function signOut(){
    if(CLOUD){ try{ await sb.auth.signOut(); }catch(e){} } else { clearProfile(); }
    auth.user = null; data = { checkins:[], sessions:[] }; outbox = { checkins:[], sessions:[] }; links = [];
    setSync('idle');
  }
  function user(){ return auth.user; }
  function cloud(){ return CLOUD; }
  function syncStatus(){ return { state: sync.state, pending: sync.pending }; }   // {state:'idle'|'syncing'|'error', pending}

  // ---- check-ins ----
  function addCheckin(c){
    // explicit state key wins over the inferred one. 'neutral' is accepted too
    // (2026-07-06): an all-untouched midpoint save counts as "settling", never
    // the 50/50/50 tie-break's accidental stillness.
    const dom = (c.dom && (c.dom==='neutral' || PVCurrent.STATES[c.dom])) ? { key: c.dom } : PVCurrent.dominantOf(c.v, c.sym, c.dor);
    // challenge = the level of challenge the person wants today (0..1). Tracked over
    // time and fed to the recommender. Synced to the cloud `challenge` column via checkinToRow.
    const rec = { t:Date.now(), v:c.v, sym:c.sym, dor:c.dor, note:c.note||'', dom:dom.key,
                  challenge:(typeof c.challenge==='number'?c.challenge:null),
                  source:(c.source||null) };   // e.g. 'post-practice' — lets practiceEffect use clean before/after pairs
    // live check-in tags ride along only when the check-in happened inside a live session
    if(c.live_session_id){ rec.live_session_id=c.live_session_id; rec.practice_ref=c.practice_ref||null; rec.phase=c.phase||null; rec.joined=c.joined||null; }
    else {
      // in-app practice: the app states which practice this reading belongs to and where
      // in the arc it sits, instead of leaving it to be guessed from timestamps later.
      // An explicit caller-supplied link always wins over the inferred one.
      const link = (c.session_id ? { session_id:c.session_id, phase:(c.phase||null), practice_ref:(c.practice_ref||null) } : _phaseFor(rec.t));
      if(link && link.session_id){ rec.session_id=link.session_id; rec.phase=link.phase||null; rec.practice_ref=link.practice_ref||null; }
    }
    data.checkins.push(rec);
    if(CLOUD && auth.user){ outbox.checkins.push(rec); setSync('syncing'); }
    saveCache(); if(CLOUD) flush();
    return rec;
  }
  // edit an existing check-in in place (by timestamp): local + cloud, challenge included.
  function updateCheckin(t, c){
    const i = data.checkins.findIndex(x=>x.t===t);
    if(i<0) return null;
    const old = data.checkins[i];
    // expert override: an explicit, valid state key wins over the inferred one
    const dom = (c.dom && PVCurrent.STATES[c.dom]) ? { key: c.dom } : PVCurrent.dominantOf(c.v, c.sym, c.dor);
    const rec = Object.assign({}, old, { v:c.v, sym:c.sym, dor:c.dor, dom:dom.key,
                challenge:(typeof c.challenge==='number'?c.challenge:old.challenge) });
    data.checkins[i] = rec;
    const oi = outbox.checkins.findIndex(x=>x.t===t);
    if(oi>=0) outbox.checkins[oi] = rec;                          // still un-synced: the outbox INSERT carries the edit
    saveCache();
    if(CLOUD && auth.user && oi<0){                                // already synced: UPDATE the cloud row, keep a pending overlay
      _setEdit(t, { v:rec.v, sym:rec.sym, dor:rec.dor, dom:rec.dom, challenge:rec.challenge });
      try{
        // .then() is required or the request never sends; on success drop the overlay.
        sb.from('checkins').update({ v:rec.v, sym:rec.sym, dor:rec.dor, dom:rec.dom, challenge:rec.challenge }).eq('user_id', auth.user.id).eq('t', t)
          .then(function(res){ if(res && !res.error) _clearEdit(t); }, function(){});
      }catch(e){}
    }
    return rec;
  }
  function checkins(){ return data.checkins.slice(); }
  // Most recent check-in, IGNORING any dated in the future. A device with a
  // skewed clock can leave a future-stamped row in the cloud; because reads sort
  // by t, that row would otherwise hijack "today" forever — lastCheckin() would
  // never be sameDay(now), so the for-you reader, done-states, and the practice
  // recommendation all silently fall back to their neutral/stale forms. Tolerance
  // of 60s absorbs minor clock differences on a just-made check-in.
  function lastCheckin(){
    const cutoff = Date.now() + 60000;
    let best = null;
    for(const c of data.checkins){ if(c && typeof c.t==='number' && c.t <= cutoff && (!best || c.t > best.t)) best = c; }
    return best || (data.checkins.length ? data.checkins[data.checkins.length-1] : null);
  }

  // ---- sessions ----
  function addSession(s){
    const rec = Object.assign({ t:Date.now() }, s);
    // every session carries an id from the moment it exists, so the check-ins around it
    // can name it. launchWeaver mints it early (to tag the 'before' read); anything that
    // logs a session without one gets it here.
    if(!rec.id) rec.id = _uuid();
    // stamp practice depth = the challenge appetite for this session. Prefer the value the
    // recommender/customizer carried; fall back to the driving check-in's appetite. Store a
    // human-readable level label too, so any reader (person or model) sees the depth without
    // decoding the 0–0.9 number. Skill × challengeLevel = the skill-by-depth signal.
    if(typeof rec.challenge !== 'number'){ const lc = lastCheckin(); rec.challenge = (lc && typeof lc.challenge==='number') ? lc.challenge : null; }
    // never null: the appetite slider is usually left alone, so fall back to the rung the
    // practice itself IS. A session with no level can't be used on the challenge axis at all.
    rec.challengeLevel = (typeof rec.challenge==='number') ? challengeLabel(rec.challenge) : rungForPractice(rec);
    rec.practiceLabel = practiceLabelFor(rec.practiceKey);
    data.sessions.push(rec);
    if(CLOUD && auth.user){ outbox.sessions.push(rec); setSync('syncing'); }
    saveCache(); if(CLOUD) flush();
  }
  function sessions(){ return data.sessions.slice(); }
  // tombstones: timestamps the user deleted, per kind ('sessions' | 'checkins'). A deletion
  // must survive the cloud re-merge on the next hydrate even before (or if) the cloud DELETE
  // lands, so we record deleted t's locally and purge them after every load/hydrate.
  function _tombKey(kind){ return 'snb_deleted_' + kind + '_' + (auth.user ? auth.user.id : 'anon'); }
  function _tombs(kind){ try{ const a=JSON.parse(localStorage.getItem(_tombKey(kind))); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function _addTomb(kind, t){ try{ const a=_tombs(kind); if(a.indexOf(t)<0){ a.push(t); localStorage.setItem(_tombKey(kind), JSON.stringify(a.slice(-500))); } }catch(e){} }
  function _tombSet(kind){ const a=_tombs(kind); if(!a.length) return null; const set=Object.create(null); a.forEach(t=>set[t]=1); return set; }
  function _purgeTombs(){
    const ss=_tombSet('sessions'); if(ss) data.sessions = data.sessions.filter(s=> !(s && ss[s.t]));
    const cc=_tombSet('checkins'); if(cc) data.checkins = data.checkins.filter(c=> !(c && cc[c.t]));
  }
  // pending check-in edits: unionByT puts the cloud row LAST, so a stale cloud read would
  // overwrite a fresh local edit on the next hydrate. We overlay the edited fields back on
  // after every load/hydrate until the cloud UPDATE confirms (then the edit is cleared).
  function _editKey(){ return 'snb_pending_checkin_edits_' + (auth.user ? auth.user.id : 'anon'); }
  function _edits(){ try{ const o=JSON.parse(localStorage.getItem(_editKey())); return (o && typeof o==='object') ? o : {}; }catch(e){ return {}; } }
  function _saveEdits(o){ try{ localStorage.setItem(_editKey(), JSON.stringify(o)); }catch(e){} }
  function _setEdit(t, fields){ const o=_edits(); o[t]=fields; _saveEdits(o); }
  function _clearEdit(t){ const o=_edits(); if(o[String(t)]!=null){ delete o[String(t)]; _saveEdits(o); } }
  function _applyEdits(){ const o=_edits(); const ks=Object.keys(o); if(!ks.length) return; ks.forEach(k=>{ const t=+k; const i=data.checkins.findIndex(x=>x && x.t===t); if(i>=0) data.checkins[i]=Object.assign({}, data.checkins[i], o[k]); }); }
  // re-apply local intent (deletions + edits) over whatever a load/hydrate just produced.
  function _reconcile(){ _purgeTombs(); _applyEdits(); }
  // delete a logged practice session by timestamp (e.g. a test run). Local + cloud + tombstone.
  function deleteSession(t){
    _addTomb('sessions', t);                                  // record the deletion so it sticks across sync
    const i = data.sessions.findIndex(x => x.t===t);
    if(i >= 0) data.sessions.splice(i, 1);
    const oi = outbox.sessions.findIndex(x => x.t===t);
    if(oi >= 0) outbox.sessions.splice(oi, 1);
    saveCache();
    if(CLOUD && auth.user){
      // .then() is required: a supabase-js builder only sends the request when awaited/thened.
      try{ sb.from('sessions').delete().eq('user_id', auth.user.id).eq('t', t).then(function(){}, function(){}); }catch(e){}
    }
    return true;
  }
  // delete a check-in by timestamp. Same tombstone + fire-the-cloud-delete pattern.
  function deleteCheckin(t){
    _addTomb('checkins', t);
    const i = data.checkins.findIndex(x => x.t===t);
    if(i >= 0) data.checkins.splice(i, 1);
    const oi = outbox.checkins.findIndex(x => x.t===t);
    if(oi >= 0) outbox.checkins.splice(oi, 1);
    saveCache();
    if(CLOUD && auth.user){
      try{ sb.from('checkins').delete().eq('user_id', auth.user.id).eq('t', t).then(function(){}, function(){}); }catch(e){}
    }
    return true;
  }

  // ---- learned preferences ----
  function learned(){
    const done = data.sessions.filter(s=>s.completed);
    const count = (arr,key)=>{const m={};arr.forEach(s=>{const k=s[key];if(k)m[k]=(m[k]||0)+1;});return m;};
    const top = (m)=>Object.keys(m).sort((a,b)=>m[b]-m[a])[0]||null;
    const earlyRate = data.sessions.length ? data.sessions.filter(s=>s.endedEarly).length/data.sessions.length : 0;
    // if the MOST RECENT session ended early with a stated reason (exit-hard /
    // exit-easy / exit-distracted / exit-enough), surface it — the advisor nudges
    // the very next practice off it, then it naturally expires with the next session.
    // exitReason is the clean column (2026-07-06 split); legacy rows fall back to
    // the old overloaded feedback value.
    const lastS = data.sessions[data.sessions.length-1] || null;
    const lastExit = (lastS && lastS.endedEarly)
      ? (lastS.exitReason || ((/^exit-/.test(lastS.feedback||'')) ? lastS.feedback : null))
      : null;
    return { favSense: top(count(done,'sense')), favSkill: top(count(done,'skill')), favPractice: top(count(done,'practiceKey')),
             sessionsDone: done.length, endsEarlyOften: earlyRate >= 0.4 && data.sessions.length >= 3,
             lastExit };
  }

  // ---- trend ----
  // Still measures v (connection) while the rest of the progress story runs on the
  // margin (2026-08-16 rework) — migrating trend()/dayArc() onto margin changes what
  // the app tells people about their own progress, so it is DEFERRED to its own pass
  // with Justin's eyes on the copy.
  function trend(){
    const cs = data.checkins.slice(-5);
    if(!cs.length) return null;
    const avg = k => cs.reduce((n,c)=>n+c[k],0)/cs.length;
    const v=avg('v'), sym=avg('sym'), dor=avg('dor');
    // classify the classifications (Justin 2026-07-06): the trend state is the
    // MODAL dom of the window, ties broken by recency — never a classification
    // of averaged axes (fight↔shutdown oscillation could average into a
    // "freeze" the person never once reported).
    const cnt={}; cs.forEach(c=>{ if(c.dom && c.dom!=='neutral') cnt[c.dom]=(cnt[c.dom]||0)+1; });
    let dk=null;
    for(let i=cs.length-1;i>=0;i--){ const k=cs[i].dom; if(!k||k==='neutral') continue; if(dk==null||cnt[k]>cnt[dk]) dk=k; }
    const dom = dk
      ? { key:dk, name:(PVCurrent.STATES[dk]&&PVCurrent.STATES[dk].name)||dk, color:(PVCurrent.STATES[dk]&&PVCurrent.STATES[dk].color)||null }
      : PVCurrent.dominantOf(v,sym,dor);
    let dir='steady';
    // ±0.12 is a v-scale band (connection, 0..1). baselineDelta's ±0.05 is a
    // margin-scale band — a different scale. The four movement thresholds in this
    // file (0.12 here, 0.08/0.04 in dayArc, 0.05 in baselineDelta) are NOT a set
    // and must not be "harmonized".
    if(cs.length>=2){ const d=cs[cs.length-1].v - cs[0].v; dir = d>0.12?'rising':d<-0.12?'falling':'steady'; }
    return { v, sym, dor, dom, dir, n:cs.length };
  }

  // ---- transitions: the state-change the person tends to make most ----
  // Returns the most common ordered pair of consecutive, DIFFERENT dominant states
  // across their check-in history, or null until there's enough of a pattern to claim.
  function transitions(){
    const cs = data.checkins;
    if(cs.length < 6) return null;                              // not enough history to claim a shape
    const pairs = {}; let total = 0;
    for(let i=1;i<cs.length;i++){
      const a=cs[i-1].dom, b=cs[i].dom;
      if(!a||!b||a===b||a==='neutral'||b==='neutral') continue; // only real state changes count
      const k=a+'>'+b; pairs[k]=(pairs[k]||0)+1; total++;
    }
    if(total < 3) return null;
    let bestK=null, bestN=0;
    for(const k in pairs){ if(pairs[k]>bestN){ bestN=pairs[k]; bestK=k; } }
    if(!bestK || bestN < 2) return null;                        // the top pattern has to repeat
    const i=bestK.indexOf('>');
    return { a:bestK.slice(0,i), b:bestK.slice(i+1), count:bestN, total };
  }

  // ---- dayparts ----
  // _segOf buckets by four dayparts so a check-in and a practice session land in the
  // same "evening" etc. (practiceInsights slices by it; the old timeOfDay() reader was
  // removed 2026-08-22 — no caller anywhere, only the demo engine's stub remembered it).
  function _segOf(t){ const h=new Date(t).getHours(); return h<5?'late':h<12?'morning':h<17?'afternoon':h<22?'evening':'late'; }

  // ---- tenure: how long they've been here + how much data exists, as an honest "stage" ----
  // Drives the for-you blog's time-framing and depth (and the daily card + practice rec) so
  // nothing claims more than the data shows. Pure stage table is split out for testing.
  function _stageFor(m){
    const count=m.count, days=m.days, windowCount=m.windowCount;
    if(count <= 1)                                  return 'start';      // just arrived: no pattern to claim
    if(count <= 4 && days <= 3)                      return 'early';      // first few check-ins: "so far"
    if(days >= 21 && count >= 16 && windowCount >= 4) return 'established'; // long-running + still active
    if(days >= 7 && windowCount >= 4 && count >= 7)  return 'week';        // a real week: 7+ days AND a week's worth of check-ins (not a sparse old account)
    return 'building';                                                    // some history, but not a full honest week
  }
  function tenure(){
    const cs = data.checkins, count = cs.length;
    if(!count) return { count:0, days:0, windowCount:0, returning:false, stage:'start' };
    const now = Date.now(), DAY = 86400000;
    const sd = t => { const d=new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
    const days = Math.round((sd(now) - sd(cs[0].t)) / DAY);          // calendar days since the first check-in
    const windowCount = cs.filter(c => now - c.t <= 7*DAY).length;   // check-ins inside the last 7 days
    const sinceLast = Math.floor((now - cs[count-1].t) / DAY);       // whole days since the most recent check-in
    const returning = count >= 5 && sinceLast >= 4 && windowCount <= 2; // has history but just back from a gap
    return { count, days, windowCount, returning, stage: _stageFor({count, days, windowCount}) };
  }

  // ---- richer for-you signals (read by the blog; all self-gating on min data) ----
  /* ── the margin read (Justin, 2026-08-16) ──────────────────────────────────
     Progress is measured on quantities, not on state names. A check-in's name is
     DERIVED from its own v/sym/dor, so one rule covers all history.
     margin = 0.7*v - 0.3*(sym + dor + tax); >= 0 means capacity covers load in
     that same reading. Never surfaced as a number — margins stay internal.
     'neutral' rows are not reads and are excluded everywhere (these functions
     already filtered them, which is why the filters below are unchanged).
     ⚠ Never infer values from the neutral flag: a few rows carry non-midpoints. */
  function _mgn(c){
    if(!c || c.dom === 'neutral' || typeof c.v !== 'number') return null;
    try{ return PVCurrent.marginOf(c.v, c.sym, c.dor).margin; }catch(e){ return null; }
  }
  function _dm(c){
    if(!c || typeof c.v !== 'number') return c && c.dom || null;
    if(c.dom === 'neutral') return 'neutral';
    try{ return PVCurrent.dominantOf(c.v, c.sym, c.dor).key; }catch(e){ return c.dom || null; }
  }
  function _isReg(c){ const m = _mgn(c); return m != null && m >= 0; }
  // the louder defense axis — the single-scalar defense the tier ceilings read (§7.5).
  // NOT the naming engine's margin (which weighs both axes + the co-activation tax).
  const _defOf = c => Math.max(c.sym||0, c.dor||0);

  const _DYS = { fightflight:1, shutdown:1, freeze:1 };     // dysregulated / defensive dominants
  // (retired 2026-08-16) the _RANK "steadier" ladder scored shutdown and freeze both 0
  // and play and stillness both 2, so real movement between them registered as none.
  // Replaced by the margin delta, which is continuous and signed.

  // weekMix: the window's state distribution — the 2nd-most-common state and the
  // regulated:dysregulated balance. Powers section 1's secondary-state + balance lines.
  // Computed the same way the reader picks its window-dominant, so `second` never equals it.
  function weekMix(){
    const cut = Date.now() - 7*86400000;   // fixed trailing week — no caller ever passed a window
    const cs = data.checkins.filter(c => c.t >= cut && c.dom && c.dom !== 'neutral');
    const n = cs.length;
    if(n < 6) return null;                                  // too few in-window to claim a mix
    const cnt = {}; cs.forEach(c => { const k=_dm(c); cnt[k] = (cnt[k]||0) + 1; });
    const order = Object.keys(cnt).sort((a,b) => cnt[b]-cnt[a]);
    const dom = order[0], second = order[1] || null;
    let reg=0, dys=0; cs.forEach(c => { if(_isReg(c)) reg++; else dys++; });
    const lean = reg>dys ? 'regulated' : dys>reg ? 'dysregulated' : 'even';
    return { n, dom, domShare:Math.round(cnt[dom]/n*100), second,
             secondShare: second ? Math.round(cnt[second]/n*100) : 0,
             reg, dys, regShare:Math.round(reg/n*100), lean, distinct:order.length,
             defenseStates: order.filter(d => _DYS[d]) };       // actual non-safety states present, by frequency
  }

  // recovery: after a dip out of a regulated state, how many check-ins until a regulated
  // one returns. The hope signal — only trustworthy with real history + several round-trips.
  function recovery(){
    const cs = data.checkins.filter(c => c.dom && c.dom !== 'neutral');
    if(cs.length < 12) return null;
    const gaps = [], depths = []; let i = 0;
    while(i < cs.length){
      if(!_isReg(cs[i])){                                   // margin went under: load exceeds capacity
        let j = i, steps = 0, found = false, low = 0;
        while(j < cs.length){
          const m = _mgn(cs[j]); if(m != null && m < low) low = m;
          if(_isReg(cs[j])){ found = true; break; } j++; steps++;
        }
        if(found){ gaps.push(steps); depths.push(low); }     // check-ins under the line, and how far under
        i = j;
      } else i++;
    }
    if(gaps.length < 3) return null;                         // need several completed recoveries
    // depth is the part the old name-walk could not see: "how far under" as well as "how long"
    return { avg: gaps.reduce((a,b)=>a+b,0)/gaps.length, n: gaps.length,
             deepest: Math.min.apply(null, depths),
             avgDepth: depths.reduce((a,b)=>a+b,0)/depths.length };
  }

  // practiceEffect: of the check-ins that follow a practice session, how often the next one
  // reads steadier than the state they went in with. Closes the read->practice->steadier loop.
  // Pairs by session_id + phase — the binding this file already does — rather than
  // by "next check-in after". domBefore is not consulted: it is a bare name with no
  // circuit values, so it cannot be re-derived; the bound 'before' check-in can.
  // 'after' and 'followup' stay separate measurements and are never merged.
  function _pePairs(){
    const bySess = {};
    data.checkins.forEach(c => {
      if(!c || !c.session_id || !c.phase) return;
      const b = bySess[c.session_id] || (bySess[c.session_id] = {});
      if(!b[c.phase]) b[c.phase] = c;
    });
    const out = [];
    data.sessions.forEach(s => {
      const b = s && s.id ? bySess[s.id] : null;
      if(!b || !b.before) return;
      const mB = _mgn(b.before); if(mB == null) return;
      const mA = b.after ? _mgn(b.after) : null;
      const mF = b.followup ? _mgn(b.followup) : null;
      if(mA == null && mF == null) return;
      out.push({ session:s, practiceKey:s.practiceKey||null, t:s.t, beforeCheckin:b.before,
                 before:mB, after:mA, followup:mF,
                 dAfter: mA==null?null:mA-mB, dFollowup: mF==null?null:mF-mB });
    });
    return out;
  }
  function practiceEffect(){
    const pairs = _pePairs().filter(p => p.dAfter != null);
    const total = pairs.length;
    if(total < 6) return null;
    let moved=0, sum=0;
    pairs.forEach(p => { sum += p.dAfter; if(p.dAfter > 0) moved++; });
    // rate is what every current caller reads; mean (the average margin delta) is
    // STAGED for the reader — computed and returned, no consumer yet (2026-08-22)
    return { moved, total, rate: moved/total, mean: sum/total };
  }

  // momentDeltas: the live-session before/after spine (§7.1 "moment self-regulation", §7.4 step 6).
  // Pairs the two check-ins tagged inside one live practice — same live_session_id + practice_ref,
  // phase 'before' vs 'after' — into a per-practice moment delta. This is the small, real, temporary
  // signal (a dip that recovers around a single practice), distinct from the cross-month baseline.
  // READ-ONLY and self-contained: nothing consumes it yet, and it deliberately does NOT touch the
  // recommender (which must never read churn/movement — §7.6). Direction classification (§7.6, out
  // of shutdown/freeze/flight-fight) is Stage 4 and lives in the reader; this only records the raw
  // move so that layer has something honest to read.
  //
  // Per pair: dConn (v_after − v_before), defBefore/defAfter = the larger of the two defense axes
  // (mobilization, immobilization) at each end, dDef (negative = defense eased), the two dominant
  // keys, and marginDelta (continuous, signed). No framing, no "good/bad" — the caller decides.
  function momentDeltas(){
    const cs = data.checkins.filter(c => c.live_session_id && c.practice_ref && c.phase &&
                                          typeof c.v==='number' && typeof c.sym==='number' && typeof c.dor==='number');
    if(!cs.length) return { pairs:[], n:0, meanConnDelta:null, meanDefDelta:null };
    // group by session + practice, keeping the earliest 'before' and the earliest 'after' after it
    const groups = {};
    cs.forEach(c => { const k = c.live_session_id + ' ' + c.practice_ref; (groups[k] || (groups[k] = [])).push(c); });
    const pairs = [];
    Object.keys(groups).forEach(k => {
      const g = groups[k].slice().sort((a,b) => a.t - b.t);
      const before = g.find(c => c.phase === 'before');
      if(!before) return;
      const after = g.find(c => c.phase === 'after' && c.t >= before.t);
      if(!after) return;
      const rb = _mgn(before), ra = _mgn(after);   // margins, not ladder positions
      pairs.push({
        sessionId: before.live_session_id, practiceRef: before.practice_ref,
        tBefore: before.t, tAfter: after.t,
        vBefore: before.v, vAfter: after.v, dConn: after.v - before.v,
        defBefore: _defOf(before), defAfter: _defOf(after), dDef: _defOf(after) - _defOf(before),
        domBefore: _dm(before), domAfter: _dm(after),
        marginBefore: rb, marginAfter: ra,
        marginDelta: (rb != null && ra != null) ? ra - rb : null,
      });
    });
    pairs.sort((a,b) => a.tAfter - b.tAfter);
    const n = pairs.length;
    const mean = sel => n ? pairs.reduce((s,p)=>s+sel(p),0)/n : null;
    return { pairs, n, meanConnDelta: mean(p=>p.dConn), meanDefDelta: mean(p=>p.dDef) };
  }

  // practiceInsights: the same read->practice->steadier loop as practiceEffect(), sliced finer
  // so the reader can name a specific practice for a specific state and time of day instead of
  // just an overall rate. Self-gated per slice (min sample size) so it never claims more than a
  // handful of paired observations can support. Trend data, not a diagnosis or a promise.
  const _INSIGHT_MIN_N = 4;
  function practiceInsights(){
    const groups = {};
    _pePairs().forEach(p => {
      if(!p.practiceKey || p.dAfter == null) return;
      const dom = _dm(p.beforeCheckin); if(!dom || dom === 'neutral') return;
      const key = p.practiceKey + '|' + dom + '|' + _segOf(p.t);
      const g = groups[key] || (groups[key] = { practiceKey:p.practiceKey, dom:dom, seg:_segOf(p.t), moved:0, total:0, sum:0 });
      g.total++; g.sum += p.dAfter;
      if(p.dAfter > 0) g.moved++;
    });
    return Object.keys(groups).map(k => groups[k])
      .filter(g => g.total >= _INSIGHT_MIN_N)
      .map(g => Object.assign(g, { rate: g.moved / g.total, mean: g.sum / g.total }))
      .sort((a,b) => b.total - a.total || b.mean - a.mean);
  }

  // ---- outcome ledger (recommender v2, Justin's rulings 2026-07-06) -----------
  // Polarity: 'more' = good; 'same' = neutral (but nudges one step easier next
  // time); 'less' / 'struggle' / 'unsure' = bad. exit-hard = bad; exit-enough /
  // exit-distracted = neutral; exit-easy = its own turn-up signal (handled in
  // recommend). A next check-in that reads steadier also counts as good — so
  // pre-07-06 history (no after_feeling column) still earns credit.
  function _exitOf(s){ return s ? (s.exitReason || ((/^exit-/.test(s.feedback||'')) ? s.feedback : null)) : null; }
  // "moved up" is now a real quantity: did margin improve across this session's own
  // bound before/after pair. The old version compared a stored name against the next
  // check-in at any distance, on a ladder that scored shutdown and freeze equal.
  function _movedUp(s){
    if(!s || !s.id) return false;
    const p = _pePairs().find(x => x.session && x.session.id === s.id);
    return !!p && p.dAfter != null && p.dAfter > 0;
  }
  // one session -> 'good' | 'bad' | 'neutral' | null (no readable outcome)
  function _outcomeOf(s){
    if(!s) return null;
    const af = s.afterFeeling || null, ex = _exitOf(s);
    if(ex==='exit-hard' || af==='struggle' || af==='less' || af==='unsure') return 'bad';
    if(af==='more' || _movedUp(s)) return 'good';
    if(af==='same' || ex==='exit-enough' || ex==='exit-distracted' || ex==='exit-easy') return 'neutral';
    return null;
  }
  // Justin's self-regulation rung order (his curriculum; validate & normalize is
  // the app's first defense rung as of v2). descDefense is a dial ON TOP of the
  // ladder, and hold & watch sits above that — both gated in recommend().
  const SKILL_LADDER = ['validate','imagery','obstacles','balancing','pendulation'];
  // per-skill tallies over self-regulation sessions; plain (no describe-the-
  // defense) and desc (with it) are tallied separately, because the descDefense
  // rung only unlocks off PLAIN success at balancing + pendulation.
  function skillOutcomes(){
    const out = {};
    SKILL_LADDER.forEach(k => out[k] = { plain:{good:0,bad:0,n:0,last:[]}, desc:{good:0,bad:0,n:0,last:[]} });
    data.sessions.forEach(s => {
      if(s.practiceKey!=='most' || !s.skill || !out[s.skill]) return;
      const o = _outcomeOf(s);
      const b = s.descDefense ? out[s.skill].desc : out[s.skill].plain;
      b.n++;
      if(o==='good') b.good++; else if(o==='bad') b.bad++;
      b.last.push(o); if(b.last.length>2) b.last.shift();     // the two most recent attempts
    });
    return out;
  }
  // rungs(): which skills are cleared, the next rung to work on, and the dial
  // unlocks. Cleared = >=2 good plain outcomes AND no bad in the last 2 attempts
  // (a bad PAUSES the clear until a good attempt lands — scenario B).
  // next = first uncleared rung ABOVE the highest cleared one (history is
  // grandfathered: someone strong at pendulation is never sent back to validate).
  function rungs(){
    const so = skillOutcomes();
    const cleared = {};
    let hi = -1;
    SKILL_LADDER.forEach((k,i) => {
      const p = so[k].plain;
      cleared[k] = p.good >= 2 && p.last.indexOf('bad') < 0;
      if(cleared[k]) hi = i;
    });
    let next = null;
    for(let i = hi + 1; i < SKILL_LADDER.length; i++){ if(!cleared[SKILL_LADDER[i]]){ next = SKILL_LADDER[i]; break; } }
    if(hi < 0) next = 'validate';                             // nothing cleared yet: start at the first rung
    // describe-the-defense unlocks after succeeding at balancing AND pendulation
    // without it (Justin's cohort sequence).
    const descUnlocked = !!(cleared.balancing && cleared.pendulation);
    let descGoing = null;                                     // how the dial itself has been going
    if(descUnlocked){
      let g=0, n=0, lastBad=false;
      SKILL_LADDER.forEach(k => { const d=so[k].desc; g+=d.good; n+=d.n; if(d.last.length && d.last[d.last.length-1]==='bad') lastBad=true; });
      descGoing = { tried:n>0, good:g, n, lastBad };
    }
    // strongest cleared skill that can carry the descDefense dial (introduce the
    // dial where they're most solid first).
    let strongest = null, bestRate = -1;
    ['imagery','balancing','pendulation'].forEach(k => {
      if(!cleared[k]) return;
      const p = so[k].plain, r = p.n ? p.good/p.n : 0;
      if(r > bestRate){ bestRate = r; strongest = k; }
    });
    return { cleared, next, hi, descUnlocked, descGoing, strongest, so };
  }
  // one-sentence descriptions of each ladder skill + dial, so the reader can name
  // the skill AND teach what it is (a path to the fuller practice-tab breakdown sits
  // in the reader copy). Straw wording — Justin owns final. Keyed to SKILL_LADDER + dials.
  const SKILL_DESC = {
    validate:    "letting what's here be here, meeting the emotion without arguing with it",
    imagery:     'using a mental image to invite some safety',
    obstacles:   'noticing what blocks safety and working with it directly',
    balancing:   'holding some safety and some defense at the same time',
    pendulation: 'moving toward the defense and back to safety, in small swings',
    descDefense: 'naming the defense out loud as you feel it',
    holdWatch:   'staying with what surfaces and watching it move, without steering it',
  };
  function skillDesc(k){ return SKILL_DESC[k] || null; }
  // rungStory(): the reader-facing shape of rungs()/skillOutcomes() — which skills are
  // cleared (advisor names, ladder order), the next one to work on, and whether there's
  // any self-regulation history to speak of. Null until there is. Not scored; capacity,
  // not rank. The "what would change the app's recommendation" story is copy in the
  // reader's S6 (the recommender's own step-down/advance logic told plainly).
  function rungStory(){
    const hasHistory = data.sessions.some(s => s && s.practiceKey==='most');
    if(!hasHistory) return null;
    const rg = rungs();
    const cleared = SKILL_LADDER.filter(k => rg.cleared[k]);
    // reason = the good signal that most recently fired on the strongest skill, so the
    // reader can name WHY it was recommended: the after-feeling came back 'more', or the
    // next check-in read steadier (else just 'going well'). Reported, never scored.
    let reason = 'going-well';
    if(rg.strongest){
      const ms = data.sessions.filter(s => s.practiceKey==='most' && s.skill===rg.strongest).sort((a,b)=>a.t-b.t);
      for(let i=ms.length-1;i>=0;i--){ if(_outcomeOf(ms[i])==='good'){ reason = ms[i].afterFeeling==='more' ? 'more' : (_movedUp(ms[i]) ? 'steadier' : 'going-well'); break; } }
    }
    return { cleared, next: rg.next, strongest: rg.strongest, reason,
             descUnlocked: rg.descUnlocked, curDesc: rg.strongest ? skillDesc(rg.strongest) : null,
             nextDesc: rg.next ? skillDesc(rg.next) : null, hasHistory:true };
  }
  // hold & watch duration from demonstrated tolerance: how much of the chosen
  // target they've actually been holding. >=90% of target -> same or one step up;
  // <50% -> one step down; no history -> the smallest dose (30s).
  const HOLD_STEPS = [30,60,90,120];
  function holdTarget(){
    const hs = data.sessions.filter(s => s.holdWatch && typeof s.holdWatchTargetSeconds==='number').slice(-3);
    if(!hs.length) return 30;
    const last = hs[hs.length-1];
    const withActual = hs.filter(s => typeof s.holdWatchSeconds==='number');
    if(!withActual.length) return last.holdWatchTargetSeconds || 30;
    const ratio = withActual.reduce((a,s)=>a + Math.min(1, s.holdWatchSeconds/Math.max(1,s.holdWatchTargetSeconds)), 0) / withActual.length;
    const cur = last.holdWatchTargetSeconds || 30;
    const i = HOLD_STEPS.indexOf(cur) >= 0 ? HOLD_STEPS.indexOf(cur) : 0;
    if(ratio >= 0.9) return HOLD_STEPS[Math.min(i+1, HOLD_STEPS.length-1)];
    if(ratio < 0.5) return HOLD_STEPS[Math.max(i-1, 0)];
    return cur;
  }

  // dayArc: any one calendar day's moments as an arc — the atom of the reflections
  // system. Returns that day's check-ins in order, within-day direction (by
  // safety/ventral), that day's sessions, and any practice deltas (a session
  // sitting between two reads). From moment one. `today()` is dayArc of today.
  // Like trend(), still measures v while the progress story runs on margin —
  // migration deferred (see the trend() note).
  function dayArc(t0){
    const tEnd = t0 + 864e5;
    const moments = data.checkins
      .filter(c => c && typeof c.t==='number' && c.t>=t0 && c.t<tEnd && c.dom && c.dom!=='neutral')
      .sort((a,b)=>a.t-b.t);
    const sess = data.sessions
      .filter(s => s && typeof s.t==='number' && s.t>=t0 && s.t<tEnd)
      .sort((a,b)=>a.t-b.t);
    const n = moments.length;
    let dir = null;
    // ±0.08 (dir) and +0.04 (rose, below) are v-scale bands — not a set with
    // baselineDelta's margin-scale ±0.05 (see the trend() note).
    if(n>=2){ const d = moments[n-1].v - moments[0].v; dir = d>0.08?'up' : d<-0.08?'down' : 'steady'; }
    // practice deltas: the read just before a session vs the first read after it
    const deltas = [];
    sess.forEach(s => {
      const after = moments.find(m => m.t > s.t);
      if(!after) return;
      let before = null;
      for(const m of moments){ if(m.t <= s.t) before = m; else break; }
      const bv = before ? before.v : null;
      deltas.push({ t:s.t, beforeV:bv, afterV:after.v, rose: (bv!=null) ? (after.v > bv+0.04) : null });
    });
    return { moments, sessions:sess, n, dir, deltas, first: n?moments[0]:null, last: n?moments[n-1]:null };
  }
  function today(){ const d=new Date(); d.setHours(0,0,0,0); return dayArc(d.getTime()); }
  // earliest check-in timestamp — the anchor for per-user quarterly anniversaries.
  function firstCheckinT(){ let m=Infinity; data.checkins.forEach(c=>{ if(c && typeof c.t==='number' && c.t<m) m=c.t; }); return isFinite(m)?m:null; }

  // periodStats: aggregate signals over an arbitrary window [startMs, endMs). Powers the
  // monthly + quarterly reflections (the long-range altitudes). All deterministic, on-device.
  function periodStats(startMs, endMs){
    const cs = data.checkins
      .filter(c => c && typeof c.t==='number' && c.t>=startMs && c.t<endMs && c.dom && c.dom!=='neutral')
      .sort((a,b)=>a.t-b.t);
    const n = cs.length;
    if(!n) return null;
    const cnt={}; cs.forEach(c=>{ const k=_dm(c); cnt[k]=(cnt[k]||0)+1; });
    const order = Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
    const dist={}; order.forEach(k=>dist[k]=Math.round(cnt[k]/n*100));
    const dom = order[0], second = order[1] || null;
    let reg=0; cs.forEach(c=>{ if(_isReg(c)) reg++; });   // margin >= 0, not a name bucket
    const regShare = reg/n, lean = regShare>=0.6?'regulated' : regShare<=0.4?'dysregulated' : 'even';
    const avgV = cs.reduce((s,c)=>s+c.v,0)/n;
    // Baseline inputs. avgDef = the louder defense axis, averaged (the §7.5 tier
    // ceilings read avgV and avgDef as two independent ABSOLUTE numbers). meanMargin =
    // the naming engine's margin, averaged — the progress axis. sdV = connection-number
    // fluctuation (§7.6: SD of v) — STAGED for the own-range axis, no reader yet.
    // (§7.2's avgSafetyLead — avgV minus avgDef, unweighted — was removed 2026-08-22:
    // no reader anywhere. It is NOT the engine's margin; recompute it from avgV/avgDef
    // if §7.2's spoken baseline ever ships.)
    const avgDef = cs.reduce((s,c)=>s+_defOf(c),0)/n;
    const meanMargin = cs.reduce((s2,c)=>{ const m=_mgn(c); return s2 + (m==null?0:m); },0)/n;
    const sdV = Math.sqrt(cs.reduce((s,c)=>{ const d=c.v-avgV; return s+d*d; },0)/n);
    const third = Math.max(1, Math.floor(n/3));   // first/last third — the then-vs-now windows
    const days = new Set(cs.map(c=>new Date(c.t).toDateString())).size;
    // day-of-week rhythm: the weekday whose check-ins average the most safety (>=3 samples)
    const dow={}; cs.forEach(c=>{ const d=new Date(c.t).getDay(); (dow[d]=dow[d]||[]).push(c.v); });
    let bestDow=null, bestDowAvg=-1;
    Object.keys(dow).forEach(d=>{ const a=dow[d]; if(a.length>=3){ const m=a.reduce((s,v)=>s+v,0)/a.length; if(m>bestDowAvg){ bestDowAvg=m; bestDow=+d; } } });
    // then-vs-now dominant state (first vs last third), for the identity arc
    const domOf = arr => { const c2={}; arr.forEach(x=>{ const k=_dm(x); c2[k]=(c2[k]||0)+1; }); return Object.keys(c2).sort((a,b)=>c2[b]-c2[a])[0]||null; };
    return {
      n, days, dom, domShare:dist[dom], second, secondShare: second?dist[second]:0, dist, order,
      reg, dys:n-reg, regShare, lean, avgV, avgDef, meanMargin, sdV,
      firstDom: domOf(cs.slice(0,third)), lastDom: domOf(cs.slice(-third)),
      bestDow, defenseStates: order.filter(d=>_DYS[d])
    };
  }
  /* baselineDelta: change between two windows (this period vs the one before).
     2026-08-17 — moved from avgV onto meanMargin, Justin's call. (Correction
     2026-08-22: this was NOT the last v-based surface — trend() and dayArc() still
     measure v; their migration is deferred, see the notes there.) The copy it
     feeds is purely directional (up / down / flat, no numbers), so it survives the swap
     unchanged: margin up IS safety sitting further ahead of defense. The 0.05 dir
     threshold is unchanged and is a MARGIN-scale band: margin spans roughly -0.9..+0.7
     where avgV spanned 0..1, so the same number is now a slightly smaller move and
     'flat' narrows. */
  function baselineDelta(startMs, endMs){
    const span = endMs - startMs;
    const cur = periodStats(startMs, endMs), prev = periodStats(startMs-span, startMs);
    if(!cur) return null;
    if(!prev) return { dir:'new', deltaPct:0 };
    const d = cur.meanMargin - prev.meanMargin;
    /* The +/-0.05 dead-band is UNCHANGED, deliberately, now that d is a margin delta
       rather than an average-connection delta. Margin's theoretical span is ~1.6, which
       makes 0.05 look like a smaller slice than it was — but that span needs v=0 with
       both defenses maxed, a board nobody reports. Across the twelve verified §6 boards
       margin runs -0.502..+0.585, a practical span of 1.087, so 0.05 is 4.6% of it
       against 5.0% for avgV over 0..1. The band transfers essentially untouched, so
       there is nothing to re-tune and no new constant to invent.
       Known asymmetry, recorded not fixed: margin is asymmetric about zero (0.3 per
       full defense, 0.7 per full ventral), so 0.05 is a sixth of a full defense
       downward but a fourteenth of full ventral upward — a symmetric band therefore
       trips more readily toward 'down'. Setting that properly needs observed
       period-over-period variance, which is the same data gate as λ and the ½ cost
       fraction. Guessing an asymmetric band now would be fitting to nothing. */
    return { dir: d>0.05?'up' : d<-0.05?'down' : 'flat', deltaPct: Math.round(d*100) };
  }

  // ---- mint store: dated, immutable reflections (the archive / keepsake moat) ----
  // A reflection lives while its span is open and MINTS (snapshots, frozen) at the
  // span's close. Frozen because the copy arrays cycle randomly — recomputing would
  // change the words. Per device for now (localStorage); cloud sync is a later add.
  function _mintKey(){ return 'snb_mint_' + (auth.user ? auth.user.id : 'anon'); }
  function _mintsRaw(){ try{ const a = JSON.parse(localStorage.getItem(_mintKey())); return Array.isArray(a) ? a : []; }catch(e){ return []; } }
  function mints(tier){ let a = _mintsRaw(); if(tier) a = a.filter(m => m.tier===tier); return a.sort((x,y)=> y.dateMs - x.dateMs); }
  function hasMint(tier, date){ return _mintsRaw().some(m => m.tier===tier && m.date===date); }
  function saveMint(entry){
    if(!entry || !entry.tier || !entry.date || !entry.text) return false;
    if(hasMint(entry.tier, entry.date)) return false;               // immutable: never overwrite
    const a = _mintsRaw();
    a.push({ id: entry.tier+':'+entry.date, tier: entry.tier, date: entry.date, dateMs: entry.dateMs, text: entry.text, data: entry.data || null, ts: Date.now() });
    try{ localStorage.setItem(_mintKey(), JSON.stringify(a)); }catch(e){}
    return true;
  }


  // ---- §7.4–7.5 tier model (connection-vs-defense, absolute levels) ----------
  // GUARDRAIL (Justin 2026-07-27): the tier gates read safety (avgV) and defense
  // (avgDef) as two INDEPENDENT ABSOLUTE numbers, never any margin/lead quantity.
  // A positive margin on low absolute safety must not unlock a tier.
  function _byDay(cs){ const m={}; cs.forEach(c=>{ const k=new Date(c.t).toDateString(); (m[k]=m[k]||[]).push(c); }); return m; }
  // Consistency (§7.5, window resolved §7.6): a stable FLOOR that holds through
  // variance — NOT low variance. Parameterized by the floor level being tested.
  // All must hold across the rolling trailing-7: first AND last check-in at/above
  // the floor (stops a strong-but-decaying week qualifying); most DAYS reach the
  // floor; any dip >25pts below it recovers the SAME day.
  function consistentAt(cs, floor){
    if(!cs || cs.length < 4) return false;
    const s = cs.slice().sort((a,b)=>a.t-b.t);
    if(s[0].v < floor || s[s.length-1].v < floor) return false;      // endpoints rule
    const days = _byDay(s), keys = Object.keys(days);
    let reach = 0; keys.forEach(k => { if(Math.max.apply(null, days[k].map(c=>c.v)) >= floor) reach++; });
    if(reach <= keys.length/2) return false;                          // "most days" = strictly over half
    for(const k of keys){                                             // dips >25pts must recover same day
      const dc = days[k];
      if(dc.some(c => c.v < floor - 0.25) && !dc.some(c => c.v >= floor)) return false;
    }
    return true;
  }
  // The week baseline (§7.5): trailing 7 days, needs >=4 check-ins or it's the
  // honest low-data path. safety = avgV, defense = avgDef (both absolute).
  function baselineWeek(){
    const now = Date.now();
    const cs = data.checkins.filter(c => c.t >= now - 7*864e5 && c.t <= now && c.dom && c.dom !== 'neutral').sort((a,b)=>a.t-b.t);
    if(cs.length < 4) return { lowData:true, n:cs.length };
    // periodStats uses a strict `< endMs`; pass now+1 so a check-in stamped at exactly `now`
    // (e.g. the one that just triggered this) is counted here too. Guard the null just in case.
    const st = periodStats(now - 7*864e5, now + 1);
    if(!st) return { lowData:true, n:cs.length };
    return { lowData:false, n:cs.length, safety:st.avgV, defense:st.avgDef, consistent50: st.avgV >= 0.50 && consistentAt(cs, 0.50) };
  }
  // The moment gate (§7.4 step 5, §7.5): reads TODAY's check-in. Grounding only —
  // no self-reg skill today — if either defense axis is very hot, or the freeze
  // quadrant (both axes up). Targets the quadrant, not a sum.
  function momentGate(last){
    if(!last) return { open:false };
    const s = last.sym, d = last.dor;
    const closed = s >= 0.75 || d >= 0.75 || (s >= 0.40 && d >= 0.40);
    return { open:!closed };
  }
  // The ceiling tier the WEEK earns (§7.5). Week gates the ceiling; the moment gate
  // (above) gates whether any of it is offered TODAY. `cleared` is rungs().cleared.
  // 0 = grounding only · 1 = validating/imagery · 2 = obstacles · 3 = balancing/pendulation.
  function skillCeiling(bw, cleared){
    if(!bw || bw.lowData) return 0;
    const s = bw.safety, d = bw.defense;
    if(s >= 0.50 && bw.consistent50 && d <= 0.55 && cleared && cleared.obstacles) return 3;
    if(s >= 0.45 && d <= 0.60 && cleared && cleared.validate && cleared.imagery) return 2;
    if(s >= 0.40) return 1;
    return 0;
  }

  // ---- recommender (Safety Spectrum model, 2026-07-03) ------------------------
  // The working Spectrum point sets the ceiling; appetite chooses within it, never
  // above it. Pendulation gate: Point 3+, advanced-defense appetite, and a few
  // completed self-regulation sessions.
  function recommend(){
    const last = lastCheckin();
    const L = learned();
    const tr = trend();
    // §7.4–7.5 model (2026-07-27): the 0.55 challenge constant, the want/level fork and the
    // regShare Spectrum are retired. Reading order is now: low-data → moment gate → the tier
    // the WEEK earns (connection-vs-defense, absolute) → the rung ladder within that tier.
    const bw = baselineWeek();          // trailing-7 avgV/avgDef, or the low-data path
    const gate = momentGate(last);      // today's check-in opens/closes the moment
    let ceiling = 0;                    // the tier the week earns (set once we have a check-in)
    if(!last){
      return cfg('mindfulness', null, prefSense()||L.favSense||'touch', 8,
        'a simple place to start. after checking in, you will get a practice attuned to your system.', 'simplest place to begin');
    }
    const dom = last.dom;
    const dys = _DYS[dom];
    const sense = prefSense() || L.favSense || 'touch';
    const sil = L.endsEarlyOften ? 12 : 8;
    const falling = !!(tr && tr.dir==='falling');

    // step 1 — fewer than 4 check-ins this week: the honest low-data path. A common state,
    // written as carefully as the full one (§7.4): an invite plus a short why, not an error.
    if(bw.lowData){
      return cfg('mindfulness', null, sense, L.endsEarlyOften?12:10,
        "there isn't a full week of check-ins yet, so we'll keep it simple through a little time with the present moment. the more you check in, the more this practice adapts to your capacity.",
        'building your picture');
    }
    // step 5 — hot defense today closes the moment gate: grounding only, whatever the week has
    // earned (mobilization or immobilization very high, or the freeze quadrant — both up).
    if(!gate.open){
      let reason = dom==='shutdown' ? 'you are pulling toward shutdown. nothing to push against. we will just find a little safety, gently.'
                 : dom==='freeze' ? "a lot is frozen within. we'll keep this practice small, focusing on the present and connecting with safety."
                 : "there's a lot of defense active right now. we'll stay with the present moment and let some of it settle.";
      if(falling) reason = "safety has been slipping in the last few check-ins. let's spend this one just on rebuilding it.";
      return cfg('mindfulness', null, sense, L.endsEarlyOften?12:10, reason, 'meet you where you are');
    }
    // steps 2-4 — the ceiling the WEEK earns (avgV/avgDef ABSOLUTE, never margin — Justin's
    // guardrail), capped by whichever skills the rung ladder has cleared.
    const rg = rungs();
    ceiling = skillCeiling(bw, rg.cleared);

    // ceiling 0 (safety below the 40% week floor), or a falling trend: anchor into safety and
    // let that be enough today (Scheme A band 2 — rebuild before reaching further).
    if(ceiling === 0 || falling){
      const reason = falling ? "safety has been slipping in the last few check-ins. let's spend this one just on rebuilding it."
                   : dys ? "your history shows real safety to draw on, even in a harder moment. we'll anchor into it and let that be enough today."
                   : "you're finding safety, and it's still building week to week. we'll anchor into it and let that be enough today.";
      return cfg('anchoring', null, sense, sil, reason, dys ? 'meet you where you are' : 'connect with safety');
    }
    // ceiling >=1 — safety first, then a self-regulation skill capped to the tier the week
    // earned (t1: validating/imagery · t2: +obstacles · t3: +balancing/pendulation).
    // Scheme A band 3; the rung ladder fills the skill slot.
    const TIER_TOP = { 1:'imagery', 2:'obstacles', 3:'pendulation' };
    const capIdx = SKILL_LADDER.indexOf(TIER_TOP[ceiling]);
    // ---- what happened last time on this track (graded step-down) ----
    // hard signals (struggle / less / too-hard exit): first one turns the dials
    // down on the SAME rung; a second in a row steps down a rung. soft signals
    // ('same' / 'unsure'): one step easier right away, as a one-session nudge.
    const mosts = data.sessions.filter(s => s.practiceKey==='most');
    const lastMost = mosts[mosts.length-1] || null;
    const prevMost = mosts[mosts.length-2] || null;
    const lastAf = lastMost ? (lastMost.afterFeeling || null) : null;
    const hardLast = !!lastMost && (lastAf==='struggle' || lastAf==='less' || _exitOf(lastMost)==='exit-hard');
    const softLast = !!lastMost && !hardLast && (lastAf==='same' || lastAf==='unsure');
    const below = k => { const i = SKILL_LADDER.indexOf(k); return i > 0 ? SKILL_LADDER[i-1] : null; };
    // default rung: the next uncleared one, else their strongest skill. Then CAP to the
    // tier the week earned — the ladder can propose a rung the week hasn't unlocked; the
    // ceiling holds it back (a rung above the tier drops to the tier's top skill).
    let skill = rg.next || rg.strongest || L.favSkill || 'validate';
    if(SKILL_LADDER.indexOf(skill) > capIdx) skill = SKILL_LADDER[capIdx];
    let dialDown = false, droppedRung = false, leftTrack = false;
    if(hardLast){
      if(prevMost && _outcomeOf(prevMost)==='bad'){                       // two heavy ones in a row
        const dn = below(lastMost.skill || skill);
        if(dn){ skill = dn; droppedRung = true; } else leftTrack = true;  // below the first rung -> anchoring
      } else { skill = lastMost.skill || skill; dialDown = true; }        // first one: same rung, smaller dose
    } else if(softLast){
      const dn = below(lastMost.skill || skill);
      if(dn){ skill = dn; droppedRung = true; } else leftTrack = true;
    }
    if(leftTrack){
      const reason = "last one didn't land well, so we're stepping out of defense work for a practice and connecting with safety instead. the ladder will be right where you left it.";
      return cfg('anchoring', null, sense, 12, reason, 'a gentler practice');
    }
    // (pendulation no longer gated on appetite — the tier ceiling + the cap above are what
    // decide whether it's reachable; a step-down may still have moved `skill` below it.)
    // ---- the dials on top of the rung ----
    // describe-the-defense: unlocks only after plain success at balancing AND
    // pendulation; introduced on the strongest cleared skill; dropped again the
    // session after it went badly. never on a dialed-down / stepped-down session.
    let desc = false, descIntro = false;
    if(rg.descUnlocked && !dialDown && !droppedRung && ['balancing','pendulation'].indexOf(skill) >= 0){
      if(rg.descGoing && rg.descGoing.lastBad) desc = false;
      else { desc = true; descIntro = !(rg.descGoing && rg.descGoing.tried); if(descIntro && rg.strongest) skill = rg.strongest; }
    }
    // hold & watch: the top tier (ceiling 3 = safety 50%+ consistent, defense ≤55%) with the
    // describe rung unlocked. Strong safety as the NORM unlocks it; sits above the describe rung.
    let hold = false, holdSecs = null;
    if(ceiling===3 && rg.descUnlocked && !dialDown && !droppedRung && (skill==='balancing' || skill==='pendulation')){
      hold = true; holdSecs = holdTarget();
    }
    // ---- why this practice (evidence named, in order: baseline/moment -> last
    // session -> rung/dial -> daypart). drafts for Justin's copy pass.
    let reason;
    if(dialDown){
      reason = "last one was a lot, so we'll stay with " + _skillWord(skill) + " but keep it gentler today: a bit shorter, with more quiet space to settle.";
      if(lastMost && lastMost.emotionIntent) reason += " if you work with " + lastMost.emotionIntent + " again, maybe at a gentler intensity this time.";
    } else if(droppedRung && hardLast){
      reason = "the last couple were a lot, so we'll ease back to " + _skillWord(skill) + " for now. that's just where your system is today, and it's completely normal. the deeper work stays right where you left it.";
    } else if(droppedRung){
      reason = "last one didn't land clearly, so we're going one step easier this time: " + _skillWord(skill) + ".";
    } else if(hold){
      reason = "strong safety has become your norm, and you're anchored right now. we'll go to the top of the ladder: " + _skillWord(skill) + ", and hold safety and defense together to watch what unfolds.";
    } else if(descIntro){
      reason = "you've been steady with balancing and pendulation on their own. this one adds describing the defense out loud, one step deeper, on the skill you're strongest in.";
    } else if(dys){
      reason = "your history shows real safety to draw on. we'll anchor first, and only then touch what's underneath, in a small dose.";
    } else if(rg.hi < 0){
      reason = "you have safety here, and this is a good place to start meeting defense gently: validating and normalizing what's here. one rung at a time, with the way back always open.";
    } else if(rg.next){
      reason = "you have safety here, and your practice history has earned the next step: " + _skillWord(skill) + ". one rung at a time, with the way back always open.";
    } else if(ceiling>=3){
      reason = "you've got steady safety and plenty of practice behind you. we'll work with a little defense, then come back to safety.";
    } else if(L.sessionsDone>=3 && L.favPractice==='most'){
      reason = "you have safety, and self-regulation is where you keep going back. let's pick that thread up again.";
    } else {
      reason = "there is real safety here right now. if you're willing, this is a chance to gently meet defense, knowing you can come back.";
    }
    // silence: the 0.55-appetite 4s default is re-sourced to the deepest tier (ceiling 3).
    const sil3 = dialDown ? 12 : (ceiling>=3 ? 4 : (L.endsEarlyOften ? 8 : 6));
    return cfg('most', skill, sense, sil3, reason, dialDown ? 'same rung, smaller dose' : droppedRung ? 'one step easier' : 'room to go deeper',
               { descDefense: desc, holdWatch: hold, holdWatchTargetSeconds: holdSecs, dialDown, droppedRung });

    function cfg(practiceKey, skill, sense, silence, reason, tag, extras){
      const pSil = prefSilence();
      let sil2 = (pSil!=null?pSil:silence);
      if(L.lastExit==='exit-distracted'){ sil2 = Math.min(sil2, 4); reason += " shorter silences this time, so it's easier to stay with."; }
      else if(L.lastExit==='exit-hard' && !(extras && (extras.dialDown || extras.droppedRung))){ reason += " last one was a lot, so we're keeping this one easier."; }
      else if(L.lastExit==='exit-easy'){ reason += " last one felt easy, so we've turned it up a touch."; }
      return Object.assign({ practiceKey, skill, sense, silence: sil2, reason, tag,
               adapted: (L.sessionsDone>0), domBefore: last?last.dom:null, challenge: null,
               descDefense: false, holdWatch: false, holdWatchTargetSeconds: null,
               tier: { ceiling, safety: bw.lowData?null:bw.safety, defense: bw.lowData?null:bw.defense,
                       consistent: !!bw.consistent50, gateOpen: !!gate.open } }, extras || {});
    }
  }
  // plain word for a skill inside advisor copy (lowercase register)
  const _SKILL_WORD = { validate:'validating & normalizing', imagery:'imagery & invitation', obstacles:'obstacles', balancing:'balancing', pendulation:'pendulation' };
  function _skillWord(k){ return _SKILL_WORD[k] || k; }

  // (CHALLENGE_LEVELS + challengeLabel moved up beside _PRACTICE_RUNG, 2026-08-22 —
  // one vocabulary, one source, see the comment there.)
  // post-practice: stamp how the body felt afterward onto the last session
  // Stamp fields onto an already-logged session and get them to the cloud. Mirrors
  // updateCheckin's outbox-aware pattern: if the INSERT is still queued, edit it in place
  // (the pending INSERT carries the fields); otherwise UPDATE the existing cloud row.
  // (Previously noteFeedback only mutated locally, so post-practice feedback never synced.)
  function _stampSession(t, local, row){
    const i=data.sessions.findIndex(x=>x && x.t===t); if(i<0) return;
    Object.assign(data.sessions[i], local);
    const oi=outbox.sessions.findIndex(x=>x && x.t===t);
    if(oi>=0){ Object.assign(outbox.sessions[oi], local); saveCache(); if(CLOUD) flush(); return; }
    saveCache();
    if(CLOUD && auth.user){
      try{ sb.from('sessions').update(row).eq('user_id', auth.user.id).eq('t', t).then(function(){}, function(){}); }catch(e){}
    }
  }
  // post-practice: how the body landed, stamped onto the last session (feeds the advisor).
  function noteFeedback(val){ const s=data.sessions[data.sessions.length-1]; if(!s) return;
    _stampSession(s.t, { feedback:val, afterFeeling:val }, { feedback:val, after_feeling:val }); }
  // early-exit reason, stamped onto the last session — kept separate from after-feeling.
  function noteExit(val){ const s=data.sessions[data.sessions.length-1]; if(!s) return;
    _stampSession(s.t, { feedback:val, exitReason:val }, { feedback:val, exit_reason:val }); }

  // ---- emotions + intensity (recommender v2, Justin 2026-07-06) ---------------
  // Curated plain-emotion words — never an open list, never free text (keeps the
  // analytics mirror clean). DELIBERATELY not state-named (Justin: "rage is
  // frozen fight, but one might choose fight instead") — the chip mirrors what
  // the person FELT; which state it belongs to stays with their check-ins and
  // the reader, never inferred here. Intensity (1 mild / 2 moderate / 3 strong)
  // 'connected' appears only in the post-practice "did anything surface?"
  // question — regulation made visible. (No intensity rating — Justin 07-06:
  // the pick stays one tap; "gentler intensity" lives in coaching copy only.)
  // Clinical rule: emotion SHIFTS (sad in -> angry out) are REPORTED, never
  // scored — the only thing the math ever scores is more safety.
  const EMOTION_FAMILIES = [
    { key:'anxious', label:'anxious', hint:'like nervous, worried, uneasy' },
    { key:'angry',   label:'angry',   hint:'like annoyed, irritable, all the way up to rage' },
    { key:'sad',     label:'sad',     hint:'like lonely, hopeless, disconnected' },
    { key:'fear',    label:'fear',    hint:'like dread, panic, overwhelm' },
  ];
  const EMOTION_SURFACED = EMOTION_FAMILIES.concat([
    { key:'connected', label:'connected', hint:'like calm, present, at ease' },
  ]);
  // optional post-practice: which families showed up while they practiced.
  // MULTI-select (Justin 2026-07-06): a session can surface several — stored as a
  // comma-joined string of family keys in canonical order (text column; simple to
  // split anywhere, mirror-safe).
  function noteSurfaced(val){ const s=data.sessions[data.sessions.length-1]; if(!s) return;
    const v = Array.isArray(val)
      ? EMOTION_SURFACED.map(f=>f.key).filter(k=>val.indexOf(k)>=0).join(',') || null
      : (val || null);
    _stampSession(s.t, { emotionSurfaced:v }, { emotion_surfaced:v }); }

  // ---- reader bridge + signals (recommender-v2 data -> the reader) ------------
  // (the exported emotion→state bridge map was removed 2026-08-22 — no callers;
  // from-justin.js carries its own copy of that grouping for reader copy.)
  // emotionShift(session): per-session beat for the daily reader. Reports the family
  // they set out to work with (intent) and the families they named afterward
  // (surfaced) — both facts THEY gave. diverged = intent set and not among surfaced.
  // Defaults to the most recent session. Reported, never ordered, never scored.
  function emotionShift(s){
    s = s || (data.sessions[data.sessions.length-1] || null);
    if(!s) return null;
    const intent = s.emotionIntent || null;
    const surfaced = s.emotionSurfaced ? String(s.emotionSurfaced).split(',').map(x=>x.trim()).filter(Boolean) : [];
    if(!intent && !surfaced.length) return null;
    return { intent, surfaced, connected: surfaced.indexOf('connected')>=0,
             diverged: !!(intent && surfaced.length && surfaced.indexOf(intent)<0),
             domBefore: s.domBefore || null };
  }
  // emotionPatterns(startMs, endMs): aggregate over sessions in a window that NAMED a
  // feeling. TWO args = explicit window (used by minted period reflections, so a closed
  // month/quarter/year computes over THAT span and can freeze). <=1 arg = rolling last-N-
  // days (default 28) for the live weekly/monthly reader. families = share of naming-
  // sessions each group surfaced in (percentages, never X-of-N). connectedPct = share
  // where connected surfaced. topFamily
  // = most-surfaced group (ties broken by EMOTION_SURFACED order, deterministic). When
  // n>=6, `shift` compares the window's first third vs last third (for the "what surfaces
  // changed over the span" period beat). Gated at >=4 naming-sessions. Reported, NEVER
  // scored; more-safety stays the only scored axis.
  function emotionPatterns(startMs, endMs){
    let a, b;
    if(endMs==null){ const days = (typeof startMs==='number' && startMs>0) ? startMs : 28; b = Date.now(); a = b - days*864e5; }
    else { a = startMs; b = endMs; }
    const ss = data.sessions
      .filter(s => s && typeof s.t==='number' && s.t>=a && s.t<b && s.emotionSurfaced)
      .sort((x,y)=>x.t-y.t);
    const n = ss.length;
    if(n < 4) return null;
    const setsOf = s => String(s.emotionSurfaced).split(',').map(x=>x.trim()).filter(Boolean);
    const tally = list => { const fam={}; EMOTION_SURFACED.forEach(f=>fam[f.key]=0); let conn=0;
      list.forEach(s => { const set=setsOf(s); EMOTION_SURFACED.forEach(f=>{ if(set.indexOf(f.key)>=0) fam[f.key]++; }); if(set.indexOf('connected')>=0) conn++; });
      return { fam, conn }; };
    const topOf = list => { const t=tally(list).fam; let k=null,m=-1; EMOTION_SURFACED.forEach(f=>{ if(t[f.key]>m){ m=t[f.key]; k=f.key; } }); return m>0?k:null; };
    const { fam, conn } = tally(ss);
    const families = {}; Object.keys(fam).forEach(k => { if(fam[k]) families[k] = Math.round(fam[k]/n*100); });
    const topFamily = topOf(ss);
    let shift = null;
    if(n >= 6){
      const third = Math.max(1, Math.floor(n/3));
      const first = ss.slice(0, third), last = ss.slice(-third);
      shift = { firstTop: topOf(first), lastTop: topOf(last),
                connectedFirstPct: Math.round(tally(first).conn/first.length*100),
                connectedLastPct: Math.round(tally(last).conn/last.length*100) };
    }
    return { n, families, topFamily, connectedPct: Math.round(conn/n*100), shift };
  }
  // rungMovement(startMs, endMs): the self-regulation skill practiced at the window's
  // start vs its end (from 'most' sessions with a skill inside the window). Powers the
  // period "3 months ago you were practicing X, now Y" arc. Null until two such practices
  // exist in the window. `advanced` is available (ladder index) but the copy stays neutral
  // — forward-then-back is normal (Justin), and the ladder is a sequence, not a score.
  function rungMovement(startMs, endMs){
    const ms = data.sessions
      .filter(s => s && s.practiceKey==='most' && s.skill && typeof s.t==='number' && s.t>=startMs && s.t<endMs)
      .sort((a,b)=>a.t-b.t);
    if(ms.length < 2) return null;
    const from = ms[0].skill, to = ms[ms.length-1].skill;
    const fi = SKILL_LADDER.indexOf(from), ti = SKILL_LADDER.indexOf(to);
    return { from, to, fromDesc: skillDesc(from), toDesc: skillDesc(to),
             moved: from!==to, advanced: (fi>=0 && ti>=0) ? ti>fi : null, n: ms.length };
  }

  // 'more' matches practiceLabelFor + _PRACTICE_RUNG ('guided meditation') — before
  // 2026-08-22 it was missing here, so the first completed meditation would have
  // rendered the literal key "more" in practice history and the "You return to" line.
  const PRACTICE_LABEL = { micro:'a tiny practice', mindfulness:'simple mindfulness', anchoring:'connect with safety', most:'self-regulation', more:'guided meditation' };
  function practiceLabel(k){ return PRACTICE_LABEL[k]||k; }

  // ---- name ----
  function getName(){ try{ return localStorage.getItem('snb_name_'+(auth.user?auth.user.id:'anon'))||''; }catch(e){ return ''; } }
  function setName(n){ try{ localStorage.setItem('snb_name_'+(auth.user?auth.user.id:'anon'), String(n||'').trim()); }catch(e){} }

  // ---- user-chosen practice preferences (auto-fill the customizer; null = let the app decide) ----
  function prefSense(){ try{ return localStorage.getItem('snb_pref_sense')||null; }catch(e){ return null; } }
  function setPrefSense(s){ try{ if(s) localStorage.setItem('snb_pref_sense', s); else localStorage.removeItem('snb_pref_sense'); }catch(e){} _syncPrefs(); }
  function prefSilence(){ try{ const v=localStorage.getItem('snb_pref_silence'); return v?+v:null; }catch(e){ return null; } }
  function setPrefSilence(n){ try{ if(n!=null&&n!=='') localStorage.setItem('snb_pref_silence', String(n)); else localStorage.removeItem('snb_pref_silence'); }catch(e){} _syncPrefs(); }
  // default sense/silence also live in the cloud (public.preferences) so they aren't
  // device-only and can inform analysis. Fire-and-forget upsert of the current values.
  function _syncPrefs(){ if(!CLOUD || !auth.user) return; try{
    sb.from('preferences').upsert({ user_id:auth.user.id, pref_sense:prefSense(), pref_silence:prefSilence(), updated_at:new Date().toISOString() }, { onConflict:'user_id' }).then(function(){}, function(){});
  }catch(e){} }

  async function reset(){
    if(CLOUD && auth.user){
      try{ await sb.from('checkins').delete().eq('user_id', auth.user.id); await sb.from('sessions').delete().eq('user_id', auth.user.id); await sb.from('contexts').delete().eq('user_id', auth.user.id); }catch(e){}
    }
    data = { checkins:[], sessions:[] }; outbox = { checkins:[], sessions:[] }; links = []; saveCache();
  }

  // ---- contexts (answerable prompt chips, 2026-07-04) ------------------------
  // The localStorage cache app.js renders from; rows upsert to public.contexts keyed
  // (user_id, period_key) so the data follows the account and feeds the analytics
  // mirror. Fire-and-forget, like membership.
  // PER-USER since 2026-08-22: the old shared 'snb-contexts' blob was the one store
  // cache not namespaced by user id, and its dash prefix escaped the deleteAccount
  // purge — on a shared device migrateContexts() could lift one person's answers into
  // the next person's cloud rows. Now keyed like every other cache (snb_ctx_<uid>).
  // The legacy shared blob is adopted into the signed-in user's key on first read —
  // unless the legacy migration flag names a DIFFERENT uid: then it is that person's
  // data and is left alone (their own deleteAccount purge now removes it).
  const CTX_LEGACY = 'snb-contexts', CTX_FLAG_LEGACY = 'snb-ctx-migrated';
  function _ctxKey(){ return 'snb_ctx_' + (auth.user ? auth.user.id : 'anon'); }
  function _ctxFlagKey(){ return 'snb_ctx_migrated_' + (auth.user ? auth.user.id : 'anon'); }
  function _ctxAdoptLegacy(cur){
    try{
      const legacy = JSON.parse(localStorage.getItem(CTX_LEGACY) || 'null');
      if(!legacy || typeof legacy !== 'object') return cur;
      const owner = localStorage.getItem(CTX_FLAG_LEGACY);          // uid that lifted the legacy blob, if any
      if(!auth.user) return Object.assign({}, legacy, cur);         // signed out: read-through only, adopt nothing
      if(owner && owner !== auth.user.id) return cur;               // someone else's data — leave it be
      Object.keys(legacy).forEach(k => { if(!(k in cur)) cur[k] = legacy[k]; });
      localStorage.setItem(_ctxKey(), JSON.stringify(cur));
      if(owner === auth.user.id) localStorage.setItem(_ctxFlagKey(), '1');   // carry the already-migrated marker over
      localStorage.removeItem(CTX_LEGACY);
      localStorage.removeItem(CTX_FLAG_LEGACY);
      return cur;
    }catch(e){ return cur; }
  }
  function _ctxAll(){ try{ return _ctxAdoptLegacy(JSON.parse(localStorage.getItem(_ctxKey()))||{}); }catch(e){ return {}; } }
  function _ctxWrite(m){ try{ localStorage.setItem(_ctxKey(), JSON.stringify(m)); }catch(e){} }
  function saveContexts(periodKey, question, labels){
    labels = (labels||[]).slice();
    const m=_ctxAll(); m[periodKey]=labels; _ctxWrite(m);
    if(!CLOUD || !auth.user) return;
    try{
      sb.from('contexts').upsert(
        { user_id:auth.user.id, period_key:periodKey, question:question||null, labels:labels, updated_at:new Date().toISOString() },
        { onConflict:'user_id,period_key' }
      ).then(function(){}, function(){});
    }catch(e){}
  }
  async function pullContexts(){
    if(!CLOUD || !auth.user) return;
    try{
      const { data:rows, error } = await sb.from('contexts').select('period_key,labels');
      if(error || !rows) return;
      const m=_ctxAll(); let changed=false;
      rows.forEach(r=>{ if(r && r.period_key && !(r.period_key in m)){ m[r.period_key]=r.labels||[]; changed=true; } });
      if(changed) _ctxWrite(m);
    }catch(e){}
  }
  // one-time per user: lift any pre-cloud local answers up (never overwrites cloud rows)
  function migrateContexts(){
    if(!CLOUD || !auth.user) return;
    try{
      const flag=_ctxFlagKey();
      if(localStorage.getItem(flag)) return;
      const m=_ctxAll(), keys=Object.keys(m);
      if(!keys.length){ localStorage.setItem(flag, '1'); return; }
      const rows=keys.map(k=>({ user_id:auth.user.id, period_key:k, labels:m[k]||[] }));
      sb.from('contexts').upsert(rows, { onConflict:'user_id,period_key', ignoreDuplicates:true })
        .then(function(){ try{ localStorage.setItem(flag, '1'); }catch(e){} }, function(){});
    }catch(e){}
  }

  global.Store = {
    init, signUp, signIn, signInAnonymously, isAnonymous, linkIdentity, signOut, user, cloud, syncStatus,
    resetPassword, updatePassword, onPasswordRecovery, deleteAccount,
    addCheckin, updateCheckin, deleteCheckin, checkins, lastCheckin, addSession, sessions, deleteSession, today, dayArc,
    periodStats, baselineDelta, firstCheckinT,
    mints, hasMint, saveMint,
    learned, trend, transitions, tenure, _stageFor, weekMix, recovery, practiceEffect, practiceInsights, momentDeltas, baselineWeek, momentGate, skillCeiling, consistentAt, recommend, practiceLabel, reset, getName, setName,
    challengeLabel, noteFeedback, noteExit, noteSurfaced, CHALLENGE_LEVELS,
    newSessionId, markPracticeBefore, practiceRefOf, rungForPractice,
    rungs, rungStory, rungMovement, skillDesc, skillOutcomes, SKILL_LADDER, EMOTION_FAMILIES, EMOTION_SURFACED,
    emotionShift, emotionPatterns,
    prefSense, setPrefSense, prefSilence, setPrefSilence,
    saveContexts,
    isPaid, hydrated, entitlement, billing, startCheckout, startGuestCheckout, openPortal, refreshBilling: fetchBilling,
    trackEvent, flushEvents, src, SRC_ALLOW,
    liveFetch, livePoll,
  };
})(window);
