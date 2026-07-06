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

  let auth = { user: null };            // {id, email}
  let data = { checkins: [], sessions: [] };
  let outbox = { checkins: [], sessions: [] };
  let onChange = null;                  // app re-render hook (set in init)
  let sync = { state: 'idle', pending: 0, error: null };  // 'idle' | 'syncing' | 'error'

  const cacheKey = () => 'snb_cache_' + (auth.user ? auth.user.id : 'anon');
  function saveCache(){ try { localStorage.setItem(cacheKey(), JSON.stringify({ data, outbox })); } catch(e){} }
  function loadCache(){ try { const o = JSON.parse(localStorage.getItem(cacheKey())); if(o){ data = o.data||{checkins:[],sessions:[]}; outbox = o.outbox||{checkins:[],sessions:[]}; } else { data={checkins:[],sessions:[]}; outbox={checkins:[],sessions:[]}; } } catch(e){ data={checkins:[],sessions:[]}; outbox={checkins:[],sessions:[]}; } _reconcile(); }

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

  // ---- row mappers (cloud columns are snake_case) ----
  const rowToCheckin = r => ({ t:r.t, v:r.v, sym:r.sym, dor:r.dor, fr:r.fr, note:r.note, dom:r.dom,
    challenge:(typeof r.challenge==='number'?r.challenge:null), source:(r.source||null) });
  const checkinToRow = c => ({ user_id:auth.user.id, t:c.t, v:c.v, sym:c.sym, dor:c.dor, fr:c.fr||0, note:c.note||'', dom:c.dom,
    challenge:(typeof c.challenge==='number'?c.challenge:null), source:(c.source||null) });
  // practice_label = a data-clear name for the practice track. The internal key 'most' is
  // opaque, so it is stored as 'self-regulation' (the app's own word for that track); the
  // other keys are already self-explanatory and pass through unchanged.
  const practiceLabelFor = k => (k==='most' ? 'self-regulation' : (k||null));
  const rowToSession = r => ({ t:r.t, practiceKey:r.practice_key, skill:r.skill, sense:r.sense, silence:r.silence, completed:r.completed, endedEarly:r.ended_early, minutes:r.minutes, domBefore:r.dom_before, feedback:(r.feedback||null), challenge:(typeof r.challenge==='number'?r.challenge:null), challengeLevel:(r.challenge_level||null), practiceLabel:(r.practice_label||null), descDefense:(r.desc_defense==null?null:!!r.desc_defense), meditationId:(r.meditation_id||null), selfRegLevel:(r.self_reg_level||null), afterFeeling:(r.after_feeling||null), exitReason:(r.exit_reason||null), openEnded:(r.open_ended==null?null:!!r.open_ended), loops:(typeof r.loops==='number'?r.loops:null), holdWatch:(r.hold_watch==null?null:!!r.hold_watch), holdWatchSeconds:(typeof r.hold_watch_seconds==='number'?r.hold_watch_seconds:null) });
  const sessionToRow = s => ({ user_id:auth.user.id, t:s.t, practice_key:s.practiceKey, skill:s.skill, sense:s.sense, silence:s.silence, completed:!!s.completed, ended_early:!!s.endedEarly, minutes:s.minutes, dom_before:s.domBefore, feedback:(s.feedback||null), challenge:(typeof s.challenge==='number'?s.challenge:null), challenge_level:(s.challengeLevel||null), practice_label:practiceLabelFor(s.practiceKey), desc_defense:(s.descDefense==null?null:!!s.descDefense), meditation_id:(s.meditationId||null), self_reg_level:(s.selfRegLevel||null), after_feeling:(s.afterFeeling||null), exit_reason:(s.exitReason||null), open_ended:(s.openEnded==null?null:!!s.openEnded), loops:(typeof s.loops==='number'?s.loops:null), hold_watch:(s.holdWatch==null?null:!!s.holdWatch), hold_watch_seconds:(typeof s.holdWatchSeconds==='number'?s.holdWatchSeconds:null) });

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
            auth.user = { id:session.user.id, email:session.user.email };
            if(was !== auth.user.id) loadCache();
            if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED' || was !== auth.user.id) hydrate();
            if(event==='SIGNED_IN') checkMembership();
          } else if(event==='SIGNED_OUT'){
            auth.user = null;
          }
        });
        const session = await ensureSession();           // live, refreshed-if-needed session — not a cached pointer
        if(session && session.user){ auth.user = { id:session.user.id, email:session.user.email }; loadCache(); await hydrate(); checkMembership(); }
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
      if(outbox.checkins.length) ok = await flushTable('checkins', outbox.checkins, checkinToRow);
      if(ok && outbox.sessions.length) ok = await flushTable('sessions', outbox.sessions, sessionToRow);
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
      if(res.user){ auth.user = { id:res.user.id, email:res.user.email }; loadCache(); await hydrate(); }
      return {};
    }
    return localEnter(email);
  }
  async function signIn(email, password){
    if(CLOUD){
      const { data:res, error } = await sb.auth.signInWithPassword({ email, password });
      if(error) return { error: error.message };
      auth.user = { id:res.user.id, email:res.user.email }; loadCache(); await hydrate();
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
        const r = await fetch(cfg.SUPABASE_URL + '/functions/v1/delete-account', {
          method:'POST',
          headers:{ Authorization:'Bearer ' + session.access_token, apikey: cfg.SUPABASE_ANON_KEY }
        });
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
    auth.user = null; data = { checkins:[], sessions:[] }; outbox = { checkins:[], sessions:[] };
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
    const rec = { t:Date.now(), v:c.v, sym:c.sym, dor:c.dor, fr:c.freeze||0, note:c.note||'', dom:dom.key,
                  challenge:(typeof c.challenge==='number'?c.challenge:null),
                  source:(c.source||null) };   // e.g. 'post-practice' — lets practiceEffect use clean before/after pairs
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
    const rec = Object.assign({}, old, { v:c.v, sym:c.sym, dor:c.dor, fr:(c.freeze!=null?c.freeze:old.fr)||0, dom:dom.key,
                challenge:(typeof c.challenge==='number'?c.challenge:old.challenge) });
    data.checkins[i] = rec;
    const oi = outbox.checkins.findIndex(x=>x.t===t);
    if(oi>=0) outbox.checkins[oi] = rec;                          // still un-synced: the outbox INSERT carries the edit
    saveCache();
    if(CLOUD && auth.user && oi<0){                                // already synced: UPDATE the cloud row, keep a pending overlay
      _setEdit(t, { v:rec.v, sym:rec.sym, dor:rec.dor, fr:rec.fr, dom:rec.dom, challenge:rec.challenge });
      try{
        // .then() is required or the request never sends; on success drop the overlay.
        sb.from('checkins').update({ v:rec.v, sym:rec.sym, dor:rec.dor, fr:rec.fr, dom:rec.dom, challenge:rec.challenge }).eq('user_id', auth.user.id).eq('t', t)
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
    // stamp practice depth = the challenge appetite for this session. Prefer the value the
    // recommender/customizer carried; fall back to the driving check-in's appetite. Store a
    // human-readable level label too, so any reader (person or model) sees the depth without
    // decoding the 0–0.9 number. Skill × challengeLevel = the skill-by-depth signal.
    if(typeof rec.challenge !== 'number'){ const lc = lastCheckin(); rec.challenge = (lc && typeof lc.challenge==='number') ? lc.challenge : null; }
    rec.challengeLevel = (typeof rec.challenge==='number') ? challengeLabel(rec.challenge) : null;
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
    const lastS = data.sessions[data.sessions.length-1] || null;
    const lastExit = (lastS && lastS.endedEarly && /^exit-/.test(lastS.feedback||'')) ? lastS.feedback : null;
    return { favSense: top(count(done,'sense')), favSkill: top(count(done,'skill')), favPractice: top(count(done,'practiceKey')),
             sessionsDone: done.length, endsEarlyOften: earlyRate >= 0.4 && data.sessions.length >= 3,
             challengeAvg, challengeN: chs.length, lastExit };
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
  const _REG = { safety:1, play:1, stillness:1 };          // regulated dominants
  const _DYS = { fightflight:1, shutdown:1, freeze:1 };     // dysregulated / defensive dominants
  const _RANK = { shutdown:0, freeze:0, fightflight:1, play:2, stillness:2, safety:3 }; // "steadier" ladder

  // weekMix: the window's state distribution — the 2nd-most-common state and the
  // regulated:dysregulated balance. Powers section 1's secondary-state + balance lines.
  // Computed the same way the reader picks its window-dominant, so `second` never equals it.
  function weekMix(days){
    days = days || 7;
    const cut = Date.now() - days*86400000;
    const cs = data.checkins.filter(c => c.t >= cut && c.dom && c.dom !== 'neutral');
    const n = cs.length;
    if(n < 6) return null;                                  // too few in-window to claim a mix
    const cnt = {}; cs.forEach(c => { cnt[c.dom] = (cnt[c.dom]||0) + 1; });
    const order = Object.keys(cnt).sort((a,b) => cnt[b]-cnt[a]);
    const dom = order[0], second = order[1] || null;
    let reg=0, dys=0; cs.forEach(c => { if(_REG[c.dom]) reg++; else if(_DYS[c.dom]) dys++; });
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
    const gaps = []; let i = 0;
    while(i < cs.length){
      if(!_REG[cs[i].dom]){                                 // entered a harder state
        let j = i, steps = 0, found = false;
        while(j < cs.length){ if(_REG[cs[j].dom]){ found = true; break; } j++; steps++; }
        if(found) gaps.push(steps);                         // check-ins in the dip before steadier ground
        i = j;
      } else i++;
    }
    if(gaps.length < 3) return null;                         // need several completed recoveries
    return { avg: gaps.reduce((a,b)=>a+b,0)/gaps.length, n: gaps.length };
  }

  // practiceEffect: of the check-ins that follow a practice session, how often the next one
  // reads steadier than the state they went in with. Closes the read->practice->steadier loop.
  function practiceEffect(){
    const ss = data.sessions.filter(s => s.domBefore && _RANK[s.domBefore] != null);
    if(!ss.length) return null;
    const cs = data.checkins;
    let moved=0, total=0;
    ss.forEach(s => {
      const next = cs.find(c => c.t > s.t && c.dom && _RANK[c.dom] != null);
      if(!next) return;
      total++;
      if(_RANK[next.dom] > _RANK[s.domBefore]) moved++;
    });
    if(total < 6) return null;                               // enough paired session->check-in
    return { moved, total, rate: moved/total };
  }

  // practiceInsights: the same read->practice->steadier loop as practiceEffect(), sliced finer
  // so the reader can name a specific practice for a specific state and time of day instead of
  // just an overall rate. Self-gated per slice (min sample size) so it never claims more than a
  // handful of paired observations can support. Trend data, not a diagnosis or a promise.
  const _INSIGHT_MIN_N = 4;
  function practiceInsights(){
    const ss = data.sessions.filter(s => s.practiceKey && s.domBefore && _RANK[s.domBefore] != null);
    if(!ss.length) return [];
    const cs = data.checkins;
    const groups = {};
    ss.forEach(s => {
      const next = cs.find(c => c.t > s.t && c.dom && _RANK[c.dom] != null);
      if(!next) return;
      const key = s.practiceKey + '|' + s.domBefore + '|' + _segOf(s.t);
      const g = groups[key] || (groups[key] = { practiceKey:s.practiceKey, dom:s.domBefore, seg:_segOf(s.t), moved:0, total:0 });
      g.total++;
      if(_RANK[next.dom] > _RANK[s.domBefore]) g.moved++;
    });
    return Object.keys(groups).map(k => groups[k])
      .filter(g => g.total >= _INSIGHT_MIN_N)
      .map(g => Object.assign(g, { rate: g.moved / g.total }))
      .sort((a,b) => b.total - a.total || b.rate - a.rate);
  }

  // dayArc: any one calendar day's moments as an arc — the atom of the reflections
  // system. Returns that day's check-ins in order, within-day direction (by
  // safety/ventral), that day's sessions, and any practice deltas (a session
  // sitting between two reads). From moment one. `today()` is dayArc of today.
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
  const _REGDOM = { safety:1, play:1, stillness:1 }, _DYSDOM = { fightflight:1, shutdown:1, freeze:1 };
  function periodStats(startMs, endMs){
    const cs = data.checkins
      .filter(c => c && typeof c.t==='number' && c.t>=startMs && c.t<endMs && c.dom && c.dom!=='neutral')
      .sort((a,b)=>a.t-b.t);
    const n = cs.length;
    if(!n) return null;
    const cnt={}; cs.forEach(c=>cnt[c.dom]=(cnt[c.dom]||0)+1);
    const order = Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
    const dist={}; order.forEach(k=>dist[k]=Math.round(cnt[k]/n*100));
    const dom = order[0], second = order[1] || null;
    let reg=0; cs.forEach(c=>{ if(_REGDOM[c.dom]) reg++; });
    const regShare = reg/n, lean = regShare>=0.6?'regulated' : regShare<=0.4?'dysregulated' : 'even';
    const avgV = cs.reduce((s,c)=>s+c.v,0)/n;
    // then vs now: first third vs last third of the window's average safety
    const third = Math.max(1, Math.floor(n/3));
    const firstAvg = cs.slice(0,third).reduce((s,c)=>s+c.v,0)/third;
    const lastAvg  = cs.slice(-third).reduce((s,c)=>s+c.v,0)/third;
    const days = new Set(cs.map(c=>new Date(c.t).toDateString())).size;
    // day-of-week rhythm: the weekday whose check-ins average the most safety (>=3 samples)
    const dow={}; cs.forEach(c=>{ const d=new Date(c.t).getDay(); (dow[d]=dow[d]||[]).push(c.v); });
    let bestDow=null, bestDowAvg=-1;
    Object.keys(dow).forEach(d=>{ const a=dow[d]; if(a.length>=3){ const m=a.reduce((s,v)=>s+v,0)/a.length; if(m>bestDowAvg){ bestDowAvg=m; bestDow=+d; } } });
    // then-vs-now dominant state (first vs last third), for the identity arc
    const domOf = arr => { const c2={}; arr.forEach(x=>c2[x.dom]=(c2[x.dom]||0)+1); return Object.keys(c2).sort((a,b)=>c2[b]-c2[a])[0]||null; };
    return {
      n, days, dom, domShare:dist[dom], second, secondShare: second?dist[second]:0, dist, order,
      reg, dys:n-reg, regShare, lean, avgV, firstAvg, lastAvg,
      firstDom: domOf(cs.slice(0,third)), lastDom: domOf(cs.slice(-third)),
      bestDow, defenseStates: order.filter(d=>_DYSDOM[d]), regStates: order.filter(d=>_REGDOM[d])
    };
  }
  // baselineDelta: change in average safety between two windows (this period vs the one before).
  function baselineDelta(startMs, endMs){
    const span = endMs - startMs;
    const cur = periodStats(startMs, endMs), prev = periodStats(startMs-span, startMs);
    if(!cur) return null;
    if(!prev) return { dir:'new', deltaPct:0, cur:cur.avgV };
    const d = cur.avgV - prev.avgV;
    return { dir: d>0.05?'up' : d<-0.05?'down' : 'flat', deltaPct: Math.round(d*100), cur:cur.avgV, prev:prev.avgV };
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

  // ---- recommender (simulated AI) ----
  // superseded 2026-07-03 by the Safety Spectrum recommend() below; kept for reference.
  function _legacyRecommend(){
    const last = lastCheckin();
    const L = learned();
    const tr = trend();
    // how far the person wants to go: this check-in's stated appetite, else their
    // recent average, else a balanced default. This is the new lever the advisor reads.
    let want = (last && typeof last.challenge==='number') ? last.challenge
               : (L.challengeAvg!=null ? L.challengeAvg : 0.55);
    if(!last){
      return cfg('mindfulness', null, prefSense()||L.favSense||'touch', 8,
        'a simple place to start. after checking in, you will get a practice attuned to your system.', 'simplest place to begin');
    }
    // first few days: keep the practice gentle and build from there, unless they explicitly asked to stretch.
    const _tn = tenure();
    const early = (_tn.stage==='start' || _tn.stage==='early') && !(typeof last.challenge==='number' && last.challenge>=0.78);
    if(early) want = Math.min(want, 0.55);
    // one-session nudge from the last early-exit reason (expires once a new session logs)
    if(L.lastExit==='exit-hard') want = Math.min(want, 0.4);
    else if(L.lastExit==='exit-easy') want = Math.min(0.95, want + 0.15);
    const dom = last.dom;
    const sense = prefSense() || L.favSense || 'touch';
    const moreSilence = L.endsEarlyOften ? 12 : 8;
    if(dom==='shutdown' || dom==='freeze'){
      let reason = dom==='shutdown'
        ? 'you are pulling toward shutdown. nothing to push against. we will just find a little safety, gently.'
        : "a lot is frozen within. let's practice through settling, then look for safety.";
      if(tr && tr.dir==='falling') reason = "safety has been slipping in the last few check-ins. let's spend this one just on rebuilding it.";
      else if(want>=0.78) reason += ' you asked to go further, and we will, by settling first.';
      return cfg('anchoring', null, sense, L.endsEarlyOften?12:10, reason, 'meet you where you are');
    }
    if(dom==='fightflight' || dom==='play'){
      let reason = dom==='play'
        ? "there's safety with some energy within. a good opportunity to practice noticing."
        : "a lot of energy within. we'll slow down and let some of it settle before anything else.";
      if(want<=0.3) reason = dom==='play'
        ? "energy with safety mixed in. you asked to keep it gentle, so let's see if we can find more calm."
        : "a lot of energy within you, and you asked for gentle. we'll only settle for now.";
      return cfg('mindfulness', null, sense, moreSilence, reason, 'settle the charge');
    }
    // safe / regulated — this is where the challenge appetite has the most room to act
    if(want<=0.35 || early){
      const reason = early
        ? "you have real safety here. you're just getting started, so let's keep these first few gentle and connect with the calm within."
        : "you have real safety, and you asked to keep it gentle. let's connect more deeply with calm.";
      return cfg('anchoring', null, sense, moreSilence, reason, early ? 'gentle start' : 'stay gentle');
    }
    const skill = want>=0.78 ? 'pendulation' : (L.favSkill || 'imagery');
    let reason = "there is real safety here right now. if you're willing, this is a chance to gently meet defense, knowing you can come back.";
    if(want>=0.78) reason = "you have safety, and you asked for more challenge. let's use that capacity to connect with non-safety.";
    else if(L.sessionsDone>=3 && L.favPractice==='most') reason = "you have safety, and self-regulation is where you keep going back. let's pick that thread up again.";
    return cfg('most', skill, sense, want>=0.78?4:(L.endsEarlyOften?8:6), reason, 'room to go deeper');

    function cfg(practiceKey, skill, sense, silence, reason, tag){
      const pSil = prefSilence();
      let sil = (pSil!=null?pSil:silence);
      // fold in what the last early exit told us, and say so plainly
      if(L.lastExit==='exit-distracted'){ sil = Math.min(sil, 4); reason += " shorter silences this time, so it's easier to stay with."; }
      else if(L.lastExit==='exit-hard'){ reason += " last one was a lot, so we're keeping this one easier."; }
      else if(L.lastExit==='exit-easy'){ reason += " last one felt easy, so we've turned it up a touch."; }
      return { practiceKey, skill, sense, silence: sil, reason, tag,
               adapted: (L.sessionsDone>0 || L.challengeN>0), domBefore: last?last.dom:null, challenge: want };
    }
  }

  // ---- Safety Spectrum (Justin's model, 2026-07-03) ---------------------------
  // Baseline = predictable safety activation over weeks (Point 1 minimal, 2 mild,
  // 3 moderate, 4 strong), estimated from history. Moment = the current check-in,
  // which slides the working point up or down. The working point sets the practice
  // ceiling; the state only flavors the session.
  // Matrix: App Designer/Reader-Rework/practice-decision-matrix.md.
  function spectrum(){
    const now = Date.now();
    const st = periodStats(now - 28*864e5, now);
    const L = learned();
    const last = lastCheckin();
    let baseline = 2, confidence = 'low';                 // thin data: benefit of the doubt, gentle default
    if(st && st.n >= 8){
      confidence = 'ok';
      const pe = practiceEffect(), rec = recovery();
      baseline = 1;
      if(st.regShare >= 0.25) baseline = 2;
      if(st.regShare >= 0.5 && L.sessionsDone >= 3 && (rec != null || (pe && pe.rate >= 0.5))) baseline = 3;
      if(st.regShare >= 0.75 && L.sessionsDone >= 8) baseline = 4;
    }
    let working = baseline;
    if(last){
      if(_REG[last.dom] && last.v >= 0.6) working = Math.min(4, baseline + 1);        // strong safety Moment
      else if(_DYS[last.dom] && last.v <= 0.25) working = Math.max(1, baseline - 1);   // deep defense Moment
    }
    return { baseline, working, moment: last ? { dom:last.dom, v:last.v } : null, confidence };
  }

  // ---- recommender (Safety Spectrum model, 2026-07-03) ------------------------
  // The working Spectrum point sets the ceiling; appetite chooses within it, never
  // above it. Pendulation gate: Point 3+, advanced-defense appetite, and a few
  // completed self-regulation sessions.
  function recommend(){
    const last = lastCheckin();
    const L = learned();
    const tr = trend();
    const sp = spectrum();
    let want = (last && typeof last.challenge==='number') ? last.challenge
               : (L.challengeAvg!=null ? L.challengeAvg : 0.55);
    if(!last){
      return cfg('mindfulness', null, prefSense()||L.favSense||'touch', 8,
        'a simple place to start. after checking in, you will get a practice attuned to your system.', 'simplest place to begin');
    }
    const _tn = tenure();
    const early = (_tn.stage==='start' || _tn.stage==='early') && !(typeof last.challenge==='number' && last.challenge>=0.78);
    if(early) want = Math.min(want, 0.55);
    if(L.lastExit==='exit-hard') want = Math.min(want, 0.4);
    else if(L.lastExit==='exit-easy') want = Math.min(0.95, want + 0.15);
    const dom = last.dom;
    const sense = prefSense() || L.favSense || 'touch';
    const sil = L.endsEarlyOften ? 12 : 8;
    const P = early ? Math.min(sp.working, 2) : sp.working;   // first days stay gentle
    const wantPoint = want>=0.78 ? 4 : want>=0.53 ? 3 : want>=0.26 ? 2 : 1;
    const level = Math.min(P, wantPoint);
    const dys = _DYS[dom];
    const falling = !!(tr && tr.dir==='falling');

    // level 1 — the smallest doses, whatever the state.
    if(level <= 1){
      let reason = dom==='shutdown' ? 'you are pulling toward shutdown. nothing to push against. we will just find a little safety, gently.'
                 : dom==='freeze' ? "a lot is frozen within. we'll keep this small: settle first, then look for a bit of safety."
                 : dys ? "a lot of energy within. we'll slow down and let some of it settle before anything else."
                 : "let's keep it simple and connect with the present moment.";
      if(falling) reason = "safety has been slipping in the last few check-ins. let's spend this one just on rebuilding it.";
      return cfg('mindfulness', null, sense, L.endsEarlyOften?12:10, reason, 'meet you where you are');
    }
    // level 2 — safety cueing: settle the charge first, or gently connect with safety.
    if(level === 2){
      if(dom==='fightflight'){
        const r2 = falling ? "safety has been slipping in the last few check-ins. let's spend this one just on rebuilding it."
                 : "a lot of energy within. we'll slow down and let some of it settle before anything else.";
        return cfg('mindfulness', null, sense, sil, r2, 'settle the charge');
      }
      let reason = dom==='shutdown' ? 'you are pulling toward shutdown. nothing to push against. we will just find a little safety, gently.'
                 : dom==='freeze' ? "a lot is frozen within. let's practice through settling, then look for safety."
                 : dom==='play' ? "there's safety with some energy within. a good opportunity to practice noticing."
                 : "you have real safety here. let's connect more deeply with calm.";
      if(falling) reason = "safety has been slipping in the last few check-ins. let's spend this one just on rebuilding it.";
      return cfg('anchoring', null, sense, sil, reason, 'connect with safety');
    }
    // level 3+ — anchoring is real; defense in a dose when asked. pendulation gated.
    const mostDone = data.sessions.filter(s=>s.completed && s.practiceKey==='most').length;
    const wantsDefense = want >= 0.53;
    if(!wantsDefense || falling){
      const reason = falling ? "safety has been slipping in the last few check-ins. let's spend this one just on rebuilding it."
                   : dys ? "your history shows real safety to draw on, even in a harder moment. we'll anchor into it and let that be enough today."
                   : "you have real safety, and you asked to keep it gentle. let's connect more deeply with calm.";
      return cfg('anchoring', null, sense, sil, reason, dys ? 'meet you where you are' : 'stay gentle');
    }
    const pend = want>=0.78 && mostDone>=3 && !dys;
    const skill = pend ? 'pendulation' : (L.favSkill || 'imagery');
    let reason = dys
      ? "your history shows real safety to draw on. we'll anchor first, and only then touch what's underneath, in a small dose."
      : "there is real safety here right now. if you're willing, this is a chance to gently meet defense, knowing you can come back.";
    if(!dys && want>=0.78) reason = pend
      ? "you have safety, practice reps behind you, and you asked for more. safety, a little defense, and back."
      : "you have safety, and you asked for more challenge. let's use that capacity to connect with non-safety.";
    else if(!dys && L.sessionsDone>=3 && L.favPractice==='most') reason = "you have safety, and self-regulation is where you keep going back. let's pick that thread up again.";
    return cfg('most', skill, sense, want>=0.78?4:(L.endsEarlyOften?8:6), reason, 'room to go deeper');

    function cfg(practiceKey, skill, sense, silence, reason, tag){
      const pSil = prefSilence();
      let sil2 = (pSil!=null?pSil:silence);
      if(L.lastExit==='exit-distracted'){ sil2 = Math.min(sil2, 4); reason += " shorter silences this time, so it's easier to stay with."; }
      else if(L.lastExit==='exit-hard'){ reason += " last one was a lot, so we're keeping this one easier."; }
      else if(L.lastExit==='exit-easy'){ reason += " last one felt easy, so we've turned it up a touch."; }
      return { practiceKey, skill, sense, silence: sil2, reason, tag,
               adapted: (L.sessionsDone>0 || L.challengeN>0), domBefore: last?last.dom:null, challenge: want,
               spectrum: { baseline: sp.baseline, working: sp.working } };
    }
  }

  // ---- challenge appetite: shared levels + label (used by check-in + advisor + you) ----
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

  const PRACTICE_LABEL = { micro:'a tiny practice', mindfulness:'simple mindfulness', anchoring:'connect with safety', most:'self-regulation' };
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
    data = { checkins:[], sessions:[] }; outbox = { checkins:[], sessions:[] }; saveCache();
  }

  // ---- contexts (answerable prompt chips, 2026-07-04) ------------------------
  // localStorage 'snb-contexts' is the write-through cache (app.js renders from it);
  // rows upsert to public.contexts keyed (user_id, period_key) so the data follows
  // the account and feeds the analytics mirror. Fire-and-forget, like membership.
  const CTX_LS = 'snb-contexts';
  function _ctxAll(){ try{ return JSON.parse(localStorage.getItem(CTX_LS))||{}; }catch(e){ return {}; } }
  function _ctxWrite(m){ try{ localStorage.setItem(CTX_LS, JSON.stringify(m)); }catch(e){} }
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
  // one-time: lift any pre-cloud local answers up (never overwrites cloud rows)
  function migrateContexts(){
    if(!CLOUD || !auth.user) return;
    try{
      const flag='snb-ctx-migrated';
      if(localStorage.getItem(flag)===auth.user.id) return;
      const m=_ctxAll(), keys=Object.keys(m);
      if(!keys.length){ localStorage.setItem(flag, auth.user.id); return; }
      const rows=keys.map(k=>({ user_id:auth.user.id, period_key:k, labels:m[k]||[] }));
      sb.from('contexts').upsert(rows, { onConflict:'user_id,period_key', ignoreDuplicates:true })
        .then(function(){ try{ localStorage.setItem(flag, auth.user.id); }catch(e){} }, function(){});
    }catch(e){}
  }

  global.Store = {
    init, signUp, signIn, signOut, user, cloud, syncStatus,
    resetPassword, updatePassword, onPasswordRecovery, deleteAccount,
    addCheckin, updateCheckin, deleteCheckin, checkins, lastCheckin, addSession, sessions, deleteSession, today, dayArc,
    periodStats, baselineDelta, firstCheckinT,
    mints, hasMint, saveMint,
    learned, trend, transitions, timeOfDay, tenure, _stageFor, weekMix, recovery, practiceEffect, practiceInsights, recommend, spectrum, practiceLabel, reset, getName, setName,
    challengeLabel, noteFeedback, noteExit, CHALLENGE_LEVELS,
    prefSense, setPrefSense, prefSilence, setPrefSilence,
    saveContexts,
  };
})(window);
