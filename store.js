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
    sync.error = error || null;
    sync.pending = outbox.checkins.length + outbox.sessions.length;
    renderSyncToast();
  }

  // union check-in / session lists by timestamp. Later args win on shared
  // fields (cloud is authoritative for v/sym/dor/dom/...), but local-only fields
  // (e.g. `challenge`, which has no cloud column yet) are preserved. This is what
  // keeps an un-synced check-in visible instead of being wiped by a cloud read.
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
  // The rung a practice IS, for when no challenge appetite was recorded. 221 of 288
  // sessions had a null challenge_level because it was derived only from the check-in's
  // appetite slider, which is usually left alone. The practice itself always knows.
  // 'more' = the standalone guided meditations, which sit off the rung ladder entirely.
  // It gets its own honest label rather than being forced onto a rung it isn't on.
  const _PRACTICE_RUNG = { micro:'simple mindfulness', mindfulness:'simple mindfulness', anchoring:'safety-focused', more:'guided meditation' };
  function rungForPractice(s){
    if(!s || !s.practiceKey) return null;
    if(s.practiceKey==='most') return (s.skill==='balancing'||s.skill==='pendulation') ? 'advanced defense' : 'beginner defense';
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
  // practice_label = a data-clear name for the practice track. The internal key 'most' is
  // opaque, so it is stored as 'self-regulation' (the app's own word for that track); the
  // other keys are already self-explanatory and pass through unchanged.
  const practiceLabelFor = k => (k==='most' ? 'self-regulation' : (k||null));
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
      const [rowRes, cohRes, entRes] = await Promise.all([
        sb.from('billing').select('*').eq('user_id', auth.user.id).maybeSingle(),
        sb.rpc('is_trial_cohort'),
        sb.from('entitlements').select('circle_member,legacy').eq('user_id', auth.user.id).maybeSingle(),
      ]);
      auth.billing = (rowRes && rowRes.data) || null;
      auth.isCohort = !!(cohRes && cohRes.data);
      const ent = (entRes && entRes.data) || null;
      auth.ent = { circle: !!(ent && ent.circle_member), legacy: !!(ent && ent.legacy) };
      _writeBillingCache({ status: auth.billing ? auth.billing.sub_status : null, trialEnd: auth.billing ? auth.billing.trial_end : null,
                           cohort: auth.isCohort, circle: auth.ent.circle, legacy: auth.ent.legacy, at: Date.now() });
      if(typeof notify === 'function') notify();
    }catch(e){ /* keep last-known cache */ }
  }
  function billing(){
    if(auth.billing) return auth.billing;
    const c = _readBillingCache();
    return c ? { sub_status:c.status, trial_end:c.trialEnd } : null;
  }
  function _billingActive(){ const b = billing(); return !!(b && (b.sub_status==='trialing' || b.sub_status==='active')); }
  function isCohort(){ if(typeof auth.isCohort==='boolean') return auth.isCohort; const c=_readBillingCache(); return c ? !!c.cohort : false; }

  // FREE IS UNCONDITIONAL (2026-07-13). Nobody is ever blocked out of the app by a
  // paywall: free has no time limit and no card. So hasAccess() is always true — the
  // whole-app gate is dead and is not coming back.
  function hasAccess(){ return true; }

  // ---- the free/paid FEATURE line (2026-07-13) ----
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
  const startTrial = startCheckout;   // legacy alias — there is no trial any more
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
    const row = { name:String(name), meta: Object.assign({}, meta||{}, { src:_src }), t:new Date().toISOString() };
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
    const row = { user_id: auth.user.id, name:String(name), meta: Object.assign({}, meta||{}, { src:_src }), t:new Date().toISOString() };
    try{ return sb.from('events').insert(row).then(()=>{}, ()=>{}); }catch(e){ return Promise.resolve(); }
  }
  async function openPortal(){ if(!CLOUD) return { error:'unavailable' }; const res = await _postFn('customer-portal'); if(res.url) location.href = res.url; return res; }

  function readProfile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch(e){ return null; } }
  function writeProfile(p){ try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch(e){} }
  function clearProfile(){ try { localStorage.removeItem(PROFILE_KEY); } catch(e){} }

  async function hydrate(){
    if(!CLOUD || !auth.user) return;
    setSync('syncing');
    await flush();                                   // push anything queued offline first
    try{
      const session = await ensureSession();         // a real GET, not the local cache, must be authenticated
      if(!session){ setSync((outbox.checkins.length||outbox.sessions.length) ? 'error' : 'idle', 'no session'); return; }
      const [cs, ss] = await Promise.all([
        sb.from('checkins').select('*').order('t', { ascending:true }),
        sb.from('sessions').select('*').order('t', { ascending:true }),
      ]);
      let changed = false;
      // MERGE (union by t), never overwrite: local + still-queued outbox + cloud.
      // An un-synced check-in stays visible and is never lost to a cloud read.
      if(!cs.error){ data.checkins = unionByT(data.checkins, outbox.checkins, (cs.data||[]).map(rowToCheckin)); changed = true; }
      if(!ss.error){ data.sessions = unionByT(data.sessions, outbox.sessions, (ss.data||[]).map(rowToSession)); changed = true; }
      _reconcile();                                    // re-apply deletions + edits over whatever the cloud just merged back
      saveCache();
      setSync((outbox.checkins.length||outbox.sessions.length) ? 'error' : 'idle', (cs.error||ss.error)||null);
      if(changed) notify();                          // re-render once fresh data lands (post-init / post-refresh)
      migrateContexts(); pullContexts();             // context chips: lift local up once, then merge cloud in

    }catch(e){ console.warn('hydrate failed (using cache)', e); setSync((outbox.checkins.length||outbox.sessions.length) ? 'error' : 'idle', e); }
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
      try{ Object.keys(localStorage).filter(k=>k.indexOf('snb_')===0).forEach(k=>localStorage.removeItem(k)); }catch(e){}
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
    const chs = data.checkins.map(c=>c.challenge).filter(v=>typeof v==='number');
    const recentCh = chs.slice(-8);
    const challengeAvg = recentCh.length ? recentCh.reduce((s,v)=>s+v,0)/recentCh.length : null;
    // if the MOST RECENT session ended early with a stated reason (exit-hard /
    // exit-easy / exit-distracted / exit-enough), surface it — the advisor nudges
    // the very next practice off it, then it naturally expires with the next session.
    // exitReason is the clean column (2026-07-06 split); legacy rows fall back to
    // the old overloaded feedback value.
    const lastS = data.sessions[data.sessions.length-1] || null;
    const lastExit = (lastS && lastS.endedEarly)
      ? (lastS.exitReason || ((/^exit-/.test(lastS.feedback||'')) ? lastS.feedback : null))
      : null;
    // how the body landed after the most recent session (more/same/less/struggle/
    // unsure) — a completed session that was a struggle steps the next one down
    // exactly like a too-hard exit (Justin 2026-07-06: finishing != going well).
    const lastAfter = lastS ? (lastS.afterFeeling || null) : null;
    return { favSense: top(count(done,'sense')), favSkill: top(count(done,'skill')), favPractice: top(count(done,'practiceKey')),
             sessionsDone: done.length, endsEarlyOften: earlyRate >= 0.4 && data.sessions.length >= 3,
             challengeAvg, challengeN: chs.length, lastExit, lastAfter };
  }

  // ---- trend ----
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

  // ---- time-of-day: a daypart that skews toward one state vs the overall baseline ----
  // _segOf is shared: timeOfDay() (below) and practiceInsights() both bucket by the same
  // four dayparts, so a check-in and a practice session land in the same "evening" etc.
  function _segOf(t){ const h=new Date(t).getHours(); return h<5?'late':h<12?'morning':h<17?'afternoon':h<22?'evening':'late'; }
  // Returns {seg,dom,n} for the daypart most over-represented by a single state, or null.
  function timeOfDay(){
    const cs = data.checkins;
    if(cs.length < 6) return null;
    const bySeg = {}, overall = {}; let N=0;
    cs.forEach(c=>{ if(!c.dom||c.dom==='neutral') return; const s=_segOf(c.t); (bySeg[s]=bySeg[s]||{})[c.dom]=(bySeg[s][c.dom]||0)+1; overall[c.dom]=(overall[c.dom]||0)+1; N++; });
    if(N < 6) return null;
    let best=null;
    for(const s in bySeg){
      const sc=bySeg[s]; let sn=0; for(const d in sc) sn+=sc[d];
      if(sn < 3) continue;                                      // enough check-ins in this daypart
      for(const d in sc){
        const segShare=sc[d]/sn, baseShare=overall[d]/N, lift=segShare-baseShare;
        if(segShare < 0.5 || lift < 0.15) continue;             // dominates the daypart AND over-represented vs baseline
        if(!best || lift>best.lift) best={ seg:s, dom:d, n:sc[d], lift };
      }
    }
    return best ? { seg:best.seg, dom:best.dom, n:best.n } : null;
  }

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
    if(!count) return { count:0, days:0, windowCount:0, sinceLast:null, returning:false, stage:'start' };
    const now = Date.now(), DAY = 86400000;
    const sd = t => { const d=new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
    const days = Math.round((sd(now) - sd(cs[0].t)) / DAY);          // calendar days since the first check-in
    const windowCount = cs.filter(c => now - c.t <= 7*DAY).length;   // check-ins inside the last 7 days
    const sinceLast = Math.floor((now - cs[count-1].t) / DAY);       // whole days since the most recent check-in
    const returning = count >= 5 && sinceLast >= 4 && windowCount <= 2; // has history but just back from a gap
    return { count, days, windowCount, sinceLast, returning, stage: _stageFor({count, days, windowCount}) };
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

  const _REG = { safety:1, play:1, stillness:1 };          // regulated dominants
  const _DYS = { fightflight:1, shutdown:1, freeze:1 };     // dysregulated / defensive dominants
  // (retired 2026-08-16) the _RANK "steadier" ladder scored shutdown and freeze both 0
  // and play and stillness both 2, so real movement between them registered as none.
  // Replaced by the margin delta, which is continuous and signed.

  // weekMix: the window's state distribution — the 2nd-most-common state and the
  // regulated:dysregulated balance. Powers section 1's secondary-state + balance lines.
  // Computed the same way the reader picks its window-dominant, so `second` never equals it.
  function weekMix(days){
    days = days || 7;
    const cut = Date.now() - days*86400000;
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
    // rate kept for existing callers; mean is the measure that carries the information
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
    cs.forEach(c => { const k = c.live_session_id + '