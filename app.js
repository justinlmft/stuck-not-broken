/* ============================================================================
   Stuck Not Broken — app prototype. Vanilla JS, on-device storage, real weaver.
   Screens: auth -> paywall -> [today | current | practice | you] + check-in.
   ========================================================================== */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const root = $('#screen');
  let _toastT=null;
  function showToast(msg){ let t=document.getElementById('app-toast'); if(!t){ t=document.createElement('div'); t.id='app-toast'; t.className='app-toast'; document.body.appendChild(t); } t.textContent=msg; t.classList.add('on'); clearTimeout(_toastT); _toastT=setTimeout(()=>t.classList.remove('on'),1900); }
  // Haptics — a soft, sparing confirmation when you act (check-in saved, practice
  // started, session complete). Android exposes the Vibration API; iOS Safari does
  // NOT, so there we toggle a hidden iOS <input switch>, which emits a light tap
  // (iOS 17.4+). Both paths need a real user gesture, so haptic() must be called
  // straight from a tap handler. On by default; Settings > haptics writes '0' to mute.
  function _hapIsIOS(){
    try{ return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1); }catch(e){ return false; }
  }
  function _hapTap(){   // iOS web-haptic: create+toggle an <input switch> (rendered, not display:none/opacity:0)
    try{
      const label = document.createElement('label');
      label.setAttribute('aria-hidden','true');
      label.style.cssText = 'position:fixed;top:0;left:0;width:6px;height:6px;opacity:0.0001;border:0;margin:0;padding:0;pointer-events:none;z-index:-1';
      const input = document.createElement('input');
      input.type = 'checkbox'; input.setAttribute('switch','');
      label.appendChild(input);
      (document.body || document.documentElement).appendChild(label);
      label.click();
      setTimeout(()=>{ try{ label.remove(); }catch(e){} }, 200);
    }catch(e){}
  }
  function haptic(kind){
    try{
      if(localStorage.getItem('snb_haptics') === '0') return;       // on by default; '0' mutes
      if(_hapIsIOS()){
        try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}   // some iOS builds expose it
        _hapTap();                                                       // the <input switch> path
        return;
      }
      if(navigator.vibrate) navigator.vibrate(kind === 'complete' ? [16,80,16] : 12);   // Android / Chrome
    }catch(e){}
  }
  const MARK = './assets/logo/snb-mark-ink.svg';

  // ── demo mode ─────────────────────────────────────────────────────
  // Loads ~4 months of sample check-ins for review/demo only. Never persisted,
  // never touches a real account's data. Enable: localStorage.snb_demo='1' or #demo.
  (function demoData(){
    // Production: demo data is OFF by default. Opt in for review only via
    // localStorage.snb_demo='1' or #demo in the URL. Never persisted.
    let on=false; try{ if(localStorage.getItem('snb_demo')==='1' || /(^|[#&])demo\b/.test(location.hash)) on=true; }catch(e){}
    if(!on || !window.PVCurrent) return;
    const cs=[], ss=[];
    for(let d=130; d>=0; d--){
      if(Math.random()<0.32) continue;
      const prog=(130-d)/130, base=0.34+prog*0.42;
      const v=Math.max(.05,Math.min(.95, base+(Math.random()-0.5)*0.38));
      const sym=Math.max(0,Math.min(.9,(1-v)*Math.random()*1.1));
      const dor=Math.max(0,Math.min(.9,(1-v)*Math.random()*0.95));
      const dom=window.PVCurrent.dominantOf(v,sym,dor);
      const t=Date.now()-d*864e5-Math.floor(Math.random()*8)*36e5;
      const challenge=Math.max(0.1,Math.min(0.95, 0.45+prog*0.25+(Math.random()-0.5)*0.4));
      cs.push({t,v,sym,dor,fr:0,note:'',dom:dom.key,challenge});
      if(Math.random()<0.42) ss.push({t:t+18e5,practiceKey:'mindfulness',skill:null,sense:'touch',silence:8,completed:true,endedEarly:false,minutes:9,domBefore:dom.key});
    }
    cs.sort((a,b)=>a.t-b.t);
    Store.checkins=()=>cs.slice();
    Store.sessions=()=>ss.slice();
    try{ const _rn=Store.getName(); Store.getName=()=>_rn||'Sam'; }catch(e){}   // demo name in-memory only; never persisted
    // demo must feed the DERIVED reads too (2026-07-05 fix): the internal store stays
    // empty in demo, so every function that reads data.checkins directly returned null —
    // gated You-tab cards vanished and the reader crashed on trend().dir. These overrides
    // recompute the same signals from the demo arrays. In-memory only, review-only.
    const REG={safety:1,play:1,stillness:1}, RANK={shutdown:0,freeze:0,fightflight:1,play:2,stillness:2,safety:3};
    const _sod=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime();};
    const _segD=t=>{const h=new Date(t).getHours();return h<5?'late':h<12?'morning':h<17?'afternoon':h<22?'evening':'late';};
    Store.firstCheckinT=()=>cs.length?cs[0].t:null;
    Store.tenure=()=>{const days=Math.round((_sod(Date.now())-_sod(cs[0].t))/864e5);const wc=cs.filter(c=>Date.now()-c.t<=7*864e5).length;return {count:cs.length,days:days,windowCount:wc,sinceLast:0,returning:false,stage:'established'};};
    Store.trend=()=>{const a=cs.slice(-5);if(!a.length)return null;const m=k=>a.reduce((s,c)=>s+c[k],0)/a.length;const d=a[a.length-1].v-a[0].v;return {v:m('v'),sym:m('sym'),dor:m('dor'),dom:a[a.length-1].dom,dir:d>0.12?'rising':d<-0.12?'falling':'steady',n:a.length};};
    Store.periodStats=(s0,e0)=>{const w=cs.filter(c=>c.t>=s0&&c.t<e0);if(!w.length)return null;const cnt={};w.forEach(c=>cnt[c.dom]=(cnt[c.dom]||0)+1);const order=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);const dist={};order.forEach(k=>dist[k]=Math.round(cnt[k]/w.length*100));let reg=0;w.forEach(c=>{if(REG[c.dom])reg++;});const avgV=w.reduce((s,c)=>s+c.v,0)/w.length;const third=Math.max(1,Math.floor(w.length/3));const fa=w.slice(0,third).reduce((s,c)=>s+c.v,0)/third,la=w.slice(-third).reduce((s,c)=>s+c.v,0)/third;const domOf=a=>{const c2={};a.forEach(x=>c2[x.dom]=(c2[x.dom]||0)+1);return Object.keys(c2).sort((p,q)=>c2[q]-c2[p])[0]||null;};
      return {n:w.length,days:new Set(w.map(c=>new Date(c.t).toDateString())).size,dom:order[0],domShare:dist[order[0]],second:order[1]||null,secondShare:order[1]?dist[order[1]]:0,dist:dist,order:order,reg:reg,dys:w.length-reg,regShare:reg/w.length,lean:reg/w.length>=0.6?'regulated':reg/w.length<=0.4?'dysregulated':'even',avgV:avgV,firstAvg:fa,lastAvg:la,firstDom:domOf(w.slice(0,third)),lastDom:domOf(w.slice(-third)),bestDow:null,defenseStates:order.filter(d=>!REG[d]),regStates:order.filter(d=>REG[d])};};
    Store.baselineDelta=(s0,e0)=>{const span=e0-s0,cur=Store.periodStats(s0,e0),prev=Store.periodStats(s0-span,s0);if(!cur)return null;if(!prev)return {dir:'new',deltaPct:0,cur:cur.avgV};const d=cur.avgV-prev.avgV;return {dir:d>0.05?'up':d<-0.05?'down':'flat',deltaPct:Math.round(d*100),cur:cur.avgV,prev:prev.avgV};};
    Store.recovery=()=>{if(cs.length<12)return null;const gaps=[];let i=0;while(i<cs.length){if(!REG[cs[i].dom]){let j=i,st=0,f=false;while(j<cs.length){if(REG[cs[j].dom]){f=true;break;}j++;st++;}if(f)gaps.push(st);i=j;}else i++;}return gaps.length>=3?{avg:gaps.reduce((x,y)=>x+y,0)/gaps.length,n:gaps.length}:null;};
    Store.transitions=()=>{if(cs.length<6)return null;const p={};let tot=0;for(let i=1;i<cs.length;i++){const a=cs[i-1].dom,b=cs[i].dom;if(!a||!b||a===b)continue;p[a+'>'+b]=(p[a+'>'+b]||0)+1;tot++;}if(tot<3)return null;const e=Object.entries(p).sort((x,y)=>y[1]-x[1])[0];if(!e||e[1]<2)return null;const k=e[0].indexOf('>');return {a:e[0].slice(0,k),b:e[0].slice(k+1),count:e[1],total:tot};};
    Store.weekMix=(days)=>{const cut=Date.now()-(days||7)*864e5;const st=Store.periodStats(cut,Date.now());if(!st||st.n<6)return null;return {n:st.n,dom:st.dom,domShare:st.domShare,second:st.second,secondShare:st.secondShare,reg:st.reg,dys:st.dys,regShare:Math.round(st.regShare*100),lean:st.lean,distinct:st.order.length,defenseStates:st.defenseStates};};
    Store.timeOfDay=()=>null;
    Store.dayArc=(t0)=>{const tEnd=t0+864e5;const m=cs.filter(c=>c.t>=t0&&c.t<tEnd).sort((a,b)=>a.t-b.t);const se=ss.filter(s=>s.t>=t0&&s.t<tEnd).sort((a,b)=>a.t-b.t);let dir=null;if(m.length>=2){const d=m[m.length-1].v-m[0].v;dir=d>0.08?'up':d<-0.08?'down':'steady';}return {moments:m,sessions:se,n:m.length,dir:dir,deltas:[],first:m[0]||null,last:m[m.length-1]||null};};
    Store.today=()=>{const d=new Date();d.setHours(0,0,0,0);return Store.dayArc(d.getTime());};
    Store.practiceEffect=()=>{const t=ss.filter(s=>s.domBefore);if(t.length<6)return null;let moved=0,tot=0;t.forEach(s=>{const nx=cs.find(c=>c.t>s.t);if(!nx)return;tot++;if(RANK[nx.dom]>RANK[s.domBefore])moved++;});return tot>=6?{moved:moved,total:tot,rate:moved/tot}:null;};
    Store.practiceInsights=()=>{const g={};ss.forEach(s=>{if(!s.practiceKey||!s.domBefore)return;const nx=cs.find(c=>c.t>s.t);if(!nx)return;const k=s.practiceKey+'|'+s.domBefore+'|'+_segD(s.t);const o=g[k]||(g[k]={practiceKey:s.practiceKey,dom:s.domBefore,seg:_segD(s.t),moved:0,total:0});o.total++;if(RANK[nx.dom]>RANK[s.domBefore])o.moved++;});return Object.keys(g).map(k=>g[k]).filter(o=>o.total>=4).map(o=>Object.assign(o,{rate:o.moved/o.total})).sort((a,b)=>b.total-a.total||b.rate-a.rate);};
  })();

  // ── audio autoplay unlock ─────────────────────────────────────────
  // The meditation player runs in an iframe; browsers block its first autoplay
  // until the user has played media on this origin. Play a short silent clip on
  // the first gesture anywhere in the app so the player can autostart with no tap.
  (function(){
    let done=false;
    const SILENT='data:audio/wav;base64,UklGRvQHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdAHAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
    function unlock(){
      if(done)return; done=true;
      document.removeEventListener('pointerdown',unlock,true);
      try{ const a=new Audio(SILENT); const p=a.play(); if(p&&p.catch)p.catch(function(){}); }catch(e){}
    }
    document.addEventListener('pointerdown',unlock,true);
  })();

  // ── installable PWA: capture the browser's install prompt + small helpers ──
  let _deferredInstall = null;
  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isiOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  // in-app browsers (instagram/facebook/gmail/etc.) and non-Safari iOS browsers
  // can't "add to home screen" — the #1 install snag for new members (Claudia hit
  // it). detect them so we say "open in your real browser first" instead of
  // pointing at a share icon that isn't there.
  const inAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|Line|MicroMessenger|WhatsApp|Snapchat|Pinterest|LinkedInApp|GSA/i.test(navigator.userAgent||'') || /; wv\)/.test(navigator.userAgent||'');
  // Real third-party iOS browsers (Chrome/Edge/Firefox on iPhone). These are NOT
  // in-app webviews: since iOS 16.4 they all expose "add to home screen" in their
  // own share menu, exactly like Safari.
  const iosThirdParty = () => isiOS() && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent||'');
  // "can add to home screen from the share menu" — Safari OR a real third-party iOS
  // browser. 2026-07-10 FIX (Justin, on iPhone Chrome): we previously treated ANY
  // non-Safari iOS browser as an in-app webview and told the person to "open this
  // page in safari first." That is wrong and was the message he saw — iOS Chrome can
  // install perfectly well. Only genuine in-app webviews (IG/FB/etc.) cannot.
  const iosShareInstall = () => isiOS() && !inAppBrowser();
  function openElsewhereMsg(){
    // Only ever shown inside a real in-app webview now.
    return isiOS()
      ? 'to install, open this page in your browser first (not this in-app window), then tap the share icon and choose "add to home screen."'
      : 'to install, open this page in your browser first (not this in-app window), then use the menu and choose "add to home screen."';
  }
  // one source of truth for install state: installed | button | ios-share | open-elsewhere | other
  function installState(){
    if(isStandalone()) return 'installed';
    if(inAppBrowser()) return 'open-elsewhere';       // genuine webview: cannot install, must leave
    if(canInstall()) return 'button';                 // Android/desktop Chrome: real install prompt
    if(iosShareInstall()) return 'ios-share';         // any iOS browser incl. Chrome: share -> add to home screen
    return 'other';
  }
  const canInstall = () => !!_deferredInstall;
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); _deferredInstall = e; updateInstallUI(); });
  window.addEventListener('appinstalled', ()=>{ _deferredInstall = null; try{ localStorage.setItem('snb_installed','1'); }catch(_){} updateInstallUI(); showToast('installed'); });
  function promptInstall(){
    if(!_deferredInstall) return;
    const dp = _deferredInstall;
    dp.prompt();
    Promise.resolve(dp.userChoice).then(()=>{ _deferredInstall = null; updateInstallUI(); }).catch(()=>{});
  }
  // refresh any visible install UI when availability changes (settings row + today nudge)
  function updateInstallUI(){
    const row = document.getElementById('install-row');
    if(row){ row.innerHTML = installRowInner(); const g = row.querySelector('.in-go'); if(g) g.onclick = promptInstall; }
    if(isStandalone() || !(canInstall() || isiOS())){ const n = document.getElementById('install-nudge'); if(n) n.remove(); }
    else if(currentTab === 'today') maybeInstallNudge();
  }
  // long-press on chrome shouldn't pop the browser menu; inline text links keep theirs
  document.addEventListener('contextmenu', (e)=>{ const t = e.target; if(t && t.closest && t.closest('.tabbar,.fab,.breathhero,.set-seg,svg,button:not(.linkbtn)')) e.preventDefault(); }, false);
  // no zoom: block iOS Safari pinch-zoom (it ignores user-scalable=no); double-tap zoom is killed by touch-action:manipulation
  ['gesturestart','gesturechange','gestureend'].forEach(ev=>document.addEventListener(ev, e=>e.preventDefault(), {passive:false}));

  const STATE_COLOR = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].color : '#D8D2C2');
  const STATE_NAME  = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].name : 'settling');

  // The three brand marks ARE the three nervous-system axes. heart=safety,
  // bolt=fight-or-flight, x=shutdown. One vocabulary across check-in, you-tab, feedback.
  // front-facing labels are FELT language (anyone can rate them, no theory needed);
  // the state names appear in the readout below, where the app does the teaching.
  const AXIS_ICON = {
    v:   { icon:'heart', state:'safety',      sub:'connected to yourself, others, & where you are' },
    sym: { icon:'bolt',  state:'fightflight', sub:'restless, wound up, ready to move' },
    dor: { icon:'x',     state:'shutdown',    sub:'numb, heavy, checked out' },
  };
  const ico = (k,o) => (window.iconSVG ? window.iconSVG(k,o) : '');
  // every state is one or two axes — so every state is one or two marks.
  // blends show BOTH component marks, each tinted to its own axis. this is the
  // identity used everywhere a state is named (replaces the old colored dots).
  const STATE_AXES = {
    safety:     [['heart','safety']],
    fightflight:[['bolt','fightflight']],
    shutdown:   [['x','shutdown']],
    play:       [['heart','safety'],['bolt','fightflight']],
    stillness:  [['heart','safety'],['x','shutdown']],
    freeze:     [['bolt','fightflight'],['x','shutdown']],
  };
  // which check-in axes (v/sym/dor) make up each state — used to tint the sliders
  // of a blended state (e.g. freeze tints fight-or-flight + shutdown, safety stays its own).
  const STATE_CORE = { safety:['v'], fightflight:['sym'], shutdown:['dor'],
                       play:['v','sym'], stillness:['v','dor'], freeze:['sym','dor'] };
  const AXIS_OWN = () => ({ v:STATE_COLOR('safety'), sym:STATE_COLOR('fightflight'), dor:STATE_COLOR('shutdown') });
  // The brand logo as a live state read: heart, bolt, x in one fixed lockup (size + spacing
  // never change) — only fill color moves. Active axis(es) take the state color, the rest sit in
  // a neutral tone; color eases in on mount (MutationObserver near boot). Reduce-motion safe.
  const TRI_ORDER = ['heart','bolt','x'];
  const TRI_VB = (function(){ const I=window.SNB_ICONS||{}; let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    TRI_ORDER.forEach(k=>{ const v=((I[k]&&I[k].vb)||'0 0 1 1').trim().split(/\s+/).map(Number); x0=Math.min(x0,v[0]); y0=Math.min(y0,v[1]); x1=Math.max(x1,v[0]+v[2]); y1=Math.max(y1,v[1]+v[3]); });
    return x0+' '+y0+' '+(x1-x0)+' '+(y1-y0); })();
  function triGlyph(key){
    const col = STATE_COLOR(key), I = window.SNB_ICONS||{};
    const active = (STATE_AXES[key]||[]).map(a=>a[0]);
    const paths = TRI_ORDER.map(m=>`<path class="tg-m" data-m="${m}"${active.indexOf(m)>=0?` data-col="${col}"`:''} d="${(I[m]&&I[m].d)||''}"></path>`).join('');
    return `<svg class="triglyph" viewBox="${TRI_VB}" aria-hidden="true">${paths}</svg>`;
  }
  function stateMarks(key){
    const ax = STATE_AXES[key];
    if(!ax) return `<span class="st-dot" style="background:${STATE_COLOR(key)}"></span>`;
    // blends mix to the state's own color (e.g. freeze = both marks purple, matching its bar)
    const col = STATE_COLOR(key);
    const marks = ax.map(([icn])=>ico(icn,{cls:'st-mark', color:col})).join('');
    return `<span class="st-marks${ax.length>1?' st-pair':''}">${marks}</span>`;
  }
  // "tuned to you" sparkle — marks the one practice we shaped for you (not the logo)
  function setIcoLvl(axis,val){
    const el = root.querySelector('.slider[data-axis="'+axis+'"] .slider-ico');
    if(el) el.style.setProperty('--lvl',(Math.max(0,Math.min(100,val))/100).toFixed(3));
  }

  // Practice track colors (brand): mindfulness = ink, connect-with-safety = blue,
  // self-regulation = orange. Used for the "for you" card + plan reader accents.
  const TRACK = {
    mindfulness: { cls:'mind',   color:'var(--track-mind)' },
    anchoring:   { cls:'safety', color:'var(--track-safety)' },
    most:        { cls:'self',   color:'var(--track-self)' },
    more:        { cls:'mind',   color:'var(--track-mind)' },
    micro:       { cls:'mind',   color:'var(--track-mind)' },
  };
  const trackOf = (k) => TRACK[k] || TRACK.mindfulness;
  const SKILL_LABEL = { validate:'validate & normalize', imagery:'imagery & invitation', obstacles:'obstacles', balancing:'balancing', pendulation:'pendulation' };
  const skillLabel = (k) => SKILL_LABEL[k] || k;
  // plain-language gloss for each skill name — used by the builder's live
  // "what to expect" paragraph and anywhere else a skill needs explaining
  const SKILL_CAP = {
    validate:   "name one thing you're feeling, say that it's real, and see that it makes sense given your life. the first rung of the ladder.",
    imagery:    'give a challenging feeling a shape in your mind and invite it in, a little at a time.',
    obstacles:  'notice what gets in the way of feeling safe, and meet it with some kindness.',
    balancing:  'hold something pleasant and something challenging at the same time, giving each some room.',
    pendulation:'move gently back and forth between a pleasant feeling and a more challenging one, so your body learns the way back.',
  };
  const silLabel = (n) => n<=4 ? 'a little' : n>=12 ? 'a lot' : 'some';

  // Check-in copy: one fixed stem ("right now, how easy would it be to…") with a
  // rotating scenario per axis — concrete, observable questions instead of felt-sense
  // words nobody can verify. All sliders read hard→easy; heart ease maps straight to
  // connection, while bolt/x ease INVERT to energy/weight amounts before anything
  // downstream (dominantOf, storage) sees them — stored v/sym/dor keep their meaning.
  // Freeze-safety rule for authoring: bolt scenarios probe settling INTERNAL energy
  // (breath, thoughts, jaw) and never staying still; x scenarios probe capacity to
  // act. A frozen system (revved inside + can't move) then reads high on BOTH axes
  // and the existing blend logic names it. Copy is Justin-owned (approved 2026-07-02).
  const CI_BANK = {
    v: [
      'pick up a call from a friend?',
      'sit quietly with someone you like?',
      'laugh at something silly?',
      "tell someone how you're really doing?",
      'make eye contact and mean it?',
      'enjoy a song you love?',
      'let someone help you with something?',
      "be curious about a stranger's story?",
      'say yes to a last-minute invitation?',
      "give someone your full attention for a minute?",
      'accept a compliment without deflecting?',
      "feel glad someone's nearby?",
    ],
    sym: [
      'relax your shoulders and keep them relaxed?',
      'take one slow breath?',
      'slow your thoughts down?',
      'unclench your jaw?',
      'wait in a slow line without getting annoyed?',
      'set the to-do list aside for ten minutes?',
      'leave a small worry alone for now?',
      'be okay with having nothing to do?',
      'read a full page without skimming?',
      'let someone finish their sentence without jumping in?',
      'leave your phone alone for a while?',
      'do one thing at a time?',
    ],
    dor: [
      'get up and cross the room?',
      'answer a question with your full attention?',
      'start the next small thing on your list?',
      'step outside for a minute?',
      "reply to a text that's been waiting?",
      'make a small decision, like what to eat?',
      'stand up and stretch?',
      "look around and notice what's in the room?",
      'say what you need right now?',
      'get yourself a glass of water?',
      'care about how the rest of the day goes?',
      'look forward to something tomorrow?',
    ],
  };
  // Mirror readout: play the person's own report back in plain speech — no state
  // names, no verdicts. The app is not a person: "you're reporting", never "I".
  // 🖊 sym and dor no longer share the word "energy" (Justin 2026-07-05: "a little
  // extra energy" + "energy a little low" read as a contradiction). sym = how revved
  // the body is (his approved word); dor = how reachable doing things feels. band 2
  // softened for the midpoint-start sliders (the old "a lot of energy" overclaimed at 50).
  const CI_MIRROR = {
    v:   ['connecting feels very hard right now','connecting takes effort','connecting is doable','connecting feels easy right now'],
    sym: ['your body is calm','a little extra energy in your body','a good amount of energy in your body','your body is very revved up'],
    dor: ['doing things feels within reach','doing things takes a little extra push','doing things takes real effort right now','doing much of anything feels out of reach'],
  };
  const ciBucket = x => x < 0.18 ? 0 : x < 0.45 ? 1 : x < 0.72 ? 2 : 3;
  const ciMirror = (v, sym, dor) =>
    `you're reporting: ${CI_MIRROR.v[ciBucket(v)]}, ${CI_MIRROR.sym[ciBucket(sym)]}, and ${CI_MIRROR.dor[ciBucket(dor)]}.`;
  function ciRand(ax, not){ const n = CI_BANK[ax].length; let i = Math.floor(Math.random()*n); if(n > 1 && i === not) i = (i+1)%n; return i; }
  // Which scenario each check-in asked (local-only, keyed by check-in timestamp) so
  // editing a check-in shows the questions that were actually answered. Kept out of
  // store.js records — no cloud column, no sync coupling; prunes to the newest 60.
  const CI_QKEY = 'snb-ci-questions';
  function ciSaveQ(t, q){ try{ const m = JSON.parse(localStorage.getItem(CI_QKEY)||'{}'); m[t] = q;
    Object.keys(m).sort((a,b)=>b-a).slice(60).forEach(k=>delete m[k]);
    localStorage.setItem(CI_QKEY, JSON.stringify(m)); }catch(e){} }
  function ciLoadQ(t){ try{ return JSON.parse(localStorage.getItem(CI_QKEY)||'{}')[t] || null; }catch(e){ return null; } }
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>';
  // "tuned to you" badge: the brand mark (recolors to white via currentColor)
  const MARK_GLYPH = "<svg viewBox=\"4 44 462 371\" fill=\"currentColor\"><path d=\"M 228.6626430999995,414.99967965948633 C 193.0931878499996,414.99967965948633 159.69623824999962,401.15528090948635 134.56332974999987,376.0223724094866 L 42.977307250000194,284.43634990948647 C 17.844398749999527,259.30344140948625 4.0,225.86389365948654 4.0,190.3370365594864 C 4.0,154.76758130948647 17.844398750000437,121.3706317094865 42.977307250000194,96.23772320948629 C 68.11021574999995,71.10481470948653 101.54976350000015,57.26041595948655 137.07662059999984,57.260415959486096 C 171.45332764999966,57.260415959486096 203.82792165000046,70.21025355948623 228.6626430999995,93.76703050948609 C 280.7175823999996,44.35317650948619 363.2727970999995,45.20513950948626 414.34797894999974,96.23772320948629 C 466.23252564999984,148.1222699094864 466.23252564999984,232.5518032094864 414.34797894999974,284.47894805948624 L 322.76195644999916,376.06497055948637 C 297.6290479499994,401.1978790594861 264.1895001999992,415.0422778094861 228.6626430999995,415.0422778094861 L 228.6626430999995,414.99967965948633 M 137.11921875000007,109.86913120948648 C 115.60715299999993,109.86913120948648 95.41562990000057,118.21836860948625 80.20809035000002,133.42590815948634 C 48.813253799999075,164.82074470948638 48.813253799999075,215.8533284094864 80.20809035000002,247.24816495948645 L 171.7941128499997,338.83418745948654 C 187.00165239999933,354.0417270094862 207.1931754999996,362.3909644094864 228.70524124999974,362.3909644094864 C 250.2173069999999,362.3909644094864 270.40883009999925,354.0417270094862 285.6163696499989,338.83418745948654 L 377.20239214999947,247.24816495948645 C 408.5546305500002,215.89592655948618 408.5546305500002,164.82074470948638 377.20239214999947,133.42590815948634 C 345.80755560000034,102.0310716094863 294.7749719000003,102.0310716094863 263.3801353500003,133.42590815948634 L 228.70524124999974,168.10080225948641 L 194.03034714999922,133.42590815948634 C 178.82280759999958,118.21836860948625 158.6312844999993,109.86913120948648 137.11921875000007,109.86913120948648\"/></svg>";
  const GEAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
  // Plain-language "what to expect" so a newcomer knows what each practice is.
  // ONE source of truth: the plan screen (custom practice) and the builder's live
  // paragraph both read from here. Copy approved by Justin 2026-07-02.
  const PRACTICE_ABOUT = {
    mindfulness: ()=>"a calm voice helps you connect to the present moment using your senses and your body's natural breathing rhythm. no pressure, just presence. can be used anywhere, even when moving.",
    anchoring: (sense)=>`you'll bring your attention to ${sense||'your senses'} and connect with the present moment, identifying how safety feels in the body and spending time with it. good for moments to practice feeling safety or where your system is drifting into defense. best if done in an environment with less distraction. feel free to move or not.`,
    most: ()=>"you'll intentionally and compassionately turn your attention toward an emotion that is more challenging while staying connected to the present moment and anchored in safety. best done in an environment free of distraction and more comfort.",
    micro: ()=>'a very short present-moment connection practice, built for the middle of a busy day. use this anywhere and doing anything.',
    more: ()=>'a full, standalone guided session, played start to finish.',
  };
  const aboutOf = (k, sense) => { const f = PRACTICE_ABOUT[k]; return f ? f(sense) : ''; };
  // the builder's dynamic "what to expect": assembled from the SAME slots the plan
  // screen uses (practice body, skill gloss, silence vocab, estMinutes) so the two
  // screens always describe the same practice the same way. sense line appears only
  // when the body doesn't already name the anchor (anchoring's body does).
  // dur phrasing for the hold & watch line (30/60/90/120s)
  const holdDurWords = (s) => s===60 ? 'a minute' : s===120 ? 'two minutes' : (s||60)+' seconds';
  function expectText(key, sense, skill, silence, holdWatch, holdSeconds, open){
    if(!key || key==='more') return '';
    const est = estMinutes(key, key==='micro' ? 2 : silence);
    const lbl = Store.practiceLabel(key);
    const head = /^a /.test(lbl) ? lbl : `a guided ${lbl} practice`;   // micro's label is already "a tiny practice"
    const bits = [
      `${head}${est ? ', about '+est+' minutes' : ''}.`,
      aboutOf(key, sense),
    ];
    if((key==='most'||key==='micro') && sense) bits.push(`your anchor is ${sense}.`);
    if(key==='most' && skill && SKILL_CAP[skill]) bits.push(SKILL_CAP[skill]);
    // hold & watch is offered only for balancing / pendulation; the line + its duration
    // update live as the user toggles the option and picks a length.
    if(key==='most' && holdWatch && (skill==='balancing' || skill==='pendulation'))
      bits.push(`then hold safety and defense together and watch what unfolds, for ${holdDurWords(holdSeconds)}.`);
    if(key!=='micro') bits.push(`with ${silLabel(silence)} silence between the guidance.`);
    if(key==='most' && open) bits.push('open-ended — it keeps going until you choose to stop.');
    return bits.filter(Boolean).join(' ');
  }

  const fmtDay = (t) => new Date(t).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
  const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });

  let liveFigures = []; // current figures to destroy on screen change
  function clearFigures(){ liveFigures.forEach(f=>{try{f.destroy();}catch(e){}}); liveFigures = []; }
  function mountFigure(host, opts){ const f = window.PVCurrent(host, opts); liveFigures.push(f); return f; }

  function setHTML(html){ clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab'); root.innerHTML = html; }

  // ---------------------------------------------------------------- routing
  // Has an account ever been signed in on this device? Set on every successful
  // sign-in / sign-up / guest-save. Decides what a signed-OUT visitor lands on:
  // a known device gets the sign-in form; a brand-new visitor gets the on-ramp.
  function knownDevice(){ try{ return localStorage.getItem('snb_had_account')==='1'; }catch(e){ return false; } }
  function markKnownDevice(){ try{ localStorage.setItem('snb_had_account','1'); }catch(e){} }

  function route(){
    // ARRIVAL (2026-07-10, Justin): a first-time visitor must reach a real check-in and
    // a real practice BEFORE any signup prompt — that immediate win is the whole point
    // of the web-first front door. Previously the guest CTA was quiet fineprint *below*
    // the sign-in form, so the default path was land -> sign up -> app, and the taste
    // never happened. Now: new visitor -> on-ramp; known device -> sign-in.
    if(!Store.user()){
      // /stuck door: a brand-new visitor who clicked "start a practice" gets exactly that.
      // Known devices keep the sign-in gate (their practice is inside their account).
      if(_doorPractice && Store.cloud() && !knownDevice()){ _doorPractice=false; return startGuestFlow('practice'); }
      return (Store.cloud() && !knownDevice()) ? screenArrival() : screenSignIn();
    }

    // ---- HARD SAFETY GATE (2026-07-10, found on Justin's device pass) ----
    // An anonymous guest IS a Store.user(), so route() used to fall straight through
    // to app(currentTab) — the full tabbed shell, including the practice tab and its
    // self-regulation / pendulation track. Any reload mid-guest-flow triggered this,
    // and a service-worker update reloads the page automatically, so it happened on
    // its own. The guest SCREENS were tabbar-free and correct; the ROUTER was the hole.
    //
    // A guest must never reach the tabbed app. Resume the guest sequence instead:
    // straight to the reflection if they already checked in, otherwise the check-in.
    if(Store.isAnonymous && Store.isAnonymous()){
      if(_guestFlow) return;                 // already mid-flow; the guest screens own the view
      _guestFlow = true;
      let last = null; try{ last = Store.lastCheckin && Store.lastCheckin(); }catch(e){}
      if(last && typeof last.v==='number'){
        _guestCI = { v:last.v, sym:last.sym, dor:last.dor };
        return guestReflection();
      }
      // practice-first guest (came through the /stuck door) who reloaded before
      // checking in: resume at the pick, not a check-in they never chose.
      if(guestDoor()==='practice') return guestPracticePick();
      return guestCheckin();
    }
    if(_recovery) return screenNewPassword();   // arrived via a password-reset email link
    // returning from Stripe Checkout: clear the query flag, refresh billing, greet.
    try{ const q=new URLSearchParams(location.search); const co=q.get('checkout'); if(co){ history.replaceState(null,'',location.pathname); if(co==='success'){ if(Store.refreshBilling) Store.refreshBilling(); showToast("your free trial is active. no charge until it ends, and we'll remind you first."); } } }catch(e){}
    // paid-trial gate: ONLY the invited cohort without an active sub sees the paywall.
    if(!Store.hasAccess()) return screenPaywall();
    // N-2: Home-Screen shortcut deep links (manifest shortcuts). consumed once.
    let h=''; try{ h=(location.hash||'').replace('#',''); if(h) history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    if(h==='checkin'){ app('today'); return screenCheckin(); }
    if(h==='practice' || _doorPractice){ _doorPractice=false; return app('practice'); }
    if(h==='breath'){ return app('today'); }   // lands on the ring, ready to tap
    return app(currentTab);
  }
  let currentTab = 'today';
  let authMode = 'in';
  let lastEmail = '';
  // captured at load, before the hash is consumed anywhere; also set by the
  // PASSWORD_RECOVERY auth event (registered near Store.init at the bottom)
  let _recovery = /type=recovery/.test(location.hash||'');

  // ---- the /stuck hand-off door (2026-07-12, Justin via architect: intent, not data) ----
  // ?start=practice sends a BRAND-NEW visitor straight to the guest practice pick — the
  // check-in is OFFERED after the practice instead of leading. Everyone else (no param,
  // known device, signed in) keeps the existing doors. No state travels; the param is the
  // person's intent, nothing more. UTM params pass through untouched (page-level analytics;
  // the app never reads them). Captured once and stripped so a plain reload re-enters
  // normally; sessionStorage remembers the door within the tab so a mid-flow reload resumes
  // the practice-first sequence instead of dumping the person into a check-in they didn't pick.
  let _doorPractice = false;
  try{
    const _dq = new URLSearchParams(location.search);
    if(_dq.get('start')==='practice'){
      _doorPractice = true;
      _dq.delete('start');
      history.replaceState(null,'',location.pathname+(_dq.toString()?'?'+_dq.toString():'')+location.hash);
    }
  }catch(e){}
  function guestDoor(){ try{ return sessionStorage.getItem('snb_guest_door'); }catch(e){ return null; } }
  function setGuestDoor(v){ try{ v ? sessionStorage.setItem('snb_guest_door',v) : sessionStorage.removeItem('snb_guest_door'); }catch(e){} }

  // ---------------------------------------------------------------- arrival (on-ramp)
  // The front door for anyone who has never had an account on this device. No form,
  // no password, no tabbar — one primary action: start a check-in. The guest sequence
  // (check-in -> reflection -> one practice -> save invite) runs from here, so the
  // person feels something work before they are ever asked for an email.
  // Sign-in is present but secondary — a returning person on a new device still gets in
  // in one tap. 🖊 copy: draft, Justin to finalize.
  function screenArrival(err, busy){
    setHTML(`
      <div class="view gate">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <button class="gate-breath" id="gate-breath" type="button" aria-label="take one breath first">
            <span class="gb-ring" id="gb-ring" aria-hidden="true"></span>
            <span class="gb-txt" id="gb-txt" aria-live="polite">take one breath first.</span>
          </button>
          <p class="eyebrow">stuck not broken</p>
          <h1 style="margin:10px 0 12px">name where you are right now.</h1>
          <p class="lede" style="margin-bottom:26px">two minutes, three questions, and a practice for whatever you find. no account, nothing to install.</p>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <p class="fineprint" style="margin-top:2px">nothing is saved unless you decide to keep it.</p>
          <p class="fineprint" style="margin-top:14px">already have an account? <button class="linkbtn" id="arrive-signin" style="font-size:inherit;padding:2px">sign in</button></p>
        </div>
        <div class="actionbar">
          <button class="btn block" id="arrive-start"${busy?' disabled':''}>${busy?'one moment…':'start a check-in'}</button>
        </div>
      </div>`);
    if(busy) return;
    const gb=$('#gate-breath'); if(gb) gb.onclick = gateBreath;
    // hold the arrival on screen (just disable the button) — no re-render, no flash
    $('#arrive-start').onclick = (e)=>{ const b=e.currentTarget; b.disabled=true; b.textContent='one moment…'; startGuestFlow(); };
    $('#arrive-signin').onclick = ()=>{ authMode='in'; screenSignIn(); };
  }

  // ---------------------------------------------------------------- sign in / up
  function screenSignIn(err, busy){
    const up = authMode==='up';
    setHTML(`
      <div class="view gate">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <button class="gate-breath" id="gate-breath" type="button" aria-label="take one breath first">
            <span class="gb-ring" id="gb-ring" aria-hidden="true"></span>
            <span class="gb-txt" id="gb-txt" aria-live="polite">take one breath first.</span>
          </button>
          <p class="eyebrow">stuck not broken</p>
          <h1 style="margin:10px 0 12px">${up?'an app to guide you through emotional regulation.':'your nervous system, over time.'}</h1>
          <p class="lede" style="margin-bottom:24px">check in about your nervous system, get practices tuned to you, and watch your patterns become visible over time.</p>
          <div class="field"><label for="em">email</label><input id="em" type="email" autocomplete="email" value="${escapeHtml(lastEmail)}"><p class="fineprint" id="em-hint" style="display:none;margin-top:6px" aria-live="polite"></p></div>
          ${up ? '<div class="field"><label for="nm">your name <span style="color:var(--muted);font-weight:400">(optional)</span></label><input id="nm" type="text" autocomplete="name"></div>' : ''}
          <div class="field"><label for="pw">password</label><input id="pw" type="password" autocomplete="${up?'new-password':'current-password'}"></div>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="go" style="margin-top:8px"${busy?' disabled':''}>${busy?'one moment…':(up?'create account':'sign in')}</button>
          ${up||!Store.cloud()?'':'<p class="fineprint" style="margin-top:14px;text-align:center">new here, or just want to try it?</p><button class="set-quiet" id="guest-start" type="button" style="display:block;margin:6px auto 0"'+(busy?' disabled':'')+'>start a check-in — no account needed</button>'}
          ${up?`<p class="fineprint" style="margin-top:10px">by creating an account, you agree to the <a href="#" data-policy="terms">terms</a> and <a href="#" data-policy="privacy">privacy policy</a>.</p>
          <p class="fineprint" style="margin-top:6px">an anonymous copy of check-ins and practice data (no name, no email, no notes) helps us learn whether this app helps people and share examples of progress. it can never be traced back to you.</p>`:''}
          <p class="fineprint">${up?'already have an account?':'new here?'} <button class="linkbtn" id="toggle" style="font-size:inherit;padding:2px">${up?'sign in':'create an account'}</button></p>
          ${up?'':'<p class="fineprint" style="margin-top:6px">the breath above needs no account. the rest of the app does — it keeps your check-ins and patterns safe, on any device you sign in from.</p>'}
          ${up||!Store.cloud()?'':'<p class="fineprint" style="margin-top:4px"><button class="linkbtn" id="forgot" style="font-size:inherit;padding:2px">forgot your password?</button></p>'}
          ${Store.cloud()?'':'<p class="fineprint" style="margin-top:8px">on-device mode: your data stays on this device for now.</p>'}
        </div>
      </div>`);
    if(busy) return;
    const gb=$('#gate-breath'); if(gb) gb.onclick = gateBreath;
    const gs=$('#guest-start'); if(gs) gs.onclick = startGuestFlow;
    $('#toggle').onclick = ()=>{ authMode = up?'in':'up'; screenSignIn(); };
    $('#go').onclick = submit;
    root.querySelectorAll('.fineprint a[data-policy]').forEach(a=>{
      a.onclick = (e)=>{ e.preventDefault(); screenPolicy(a.getAttribute('data-policy')); };
    });
    $('#em').addEventListener('input', e=>{ lastEmail=e.target.value; emailHint(); });
    $('#em').addEventListener('blur', emailHint);
    $('#pw').addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
    const fg=$('#forgot'); if(fg) fg.onclick = ()=>{
      const email=$('#em').value.trim();
      if(!email){ lastEmail=email; return screenSignIn('enter your email above first, then tap "forgot your password?"'); }
      lastEmail=email;
      screenSignIn(null, true);
      Promise.resolve(Store.resetPassword(email)).then(res=>{
        if(res && res.error) return screenSignIn(res.error);
        screenResetSent(email);
      }).catch(e=>screenSignIn(String((e&&e.message)||e)));
    };
    // gentle typo guard on the email domain (never blocks; a wrong email here
    // means reset links and sign-ins on a new phone would quietly go nowhere)
    function emailHint(){
      const el=$('#em'), hint=$('#em-hint'); if(!el||!hint) return;
      const v=el.value.trim(), at=v.lastIndexOf('@');
      const fixes={ 'gmial.com':'gmail.com','gmal.com':'gmail.com','gamil.com':'gmail.com','gmail.co':'gmail.com','gmail.cm':'gmail.com','gnail.com':'gmail.com',
                    'yaho.com':'yahoo.com','yahooo.com':'yahoo.com','yahoo.co':'yahoo.com','hotmial.com':'hotmail.com','hotmail.co':'hotmail.com',
                    'outlok.com':'outlook.com','outlook.co':'outlook.com','iclod.com':'icloud.com','icloud.co':'icloud.com','icoud.com':'icloud.com' };
      const dom = at>0 ? v.slice(at+1).toLowerCase() : '';
      if(fixes[dom]){
        hint.style.display='block';
        hint.innerHTML='did you mean <button type="button" class="linkbtn" id="em-fix" style="font-size:inherit;padding:0">'+escapeHtml(v.slice(0,at+1)+fixes[dom])+'</button>?';
        const fx=hint.querySelector('#em-fix');
        if(fx) fx.onclick=()=>{ el.value=v.slice(0,at+1)+fixes[dom]; lastEmail=el.value; hint.style.display='none'; };
      } else hint.style.display='none';
    }
    function submit(){
      const email=$('#em').value.trim(), pw=$('#pw').value;
      if(!email || (Store.cloud() && !pw)){ lastEmail=email; screenSignIn('enter your email and a password.'); return; }
      lastEmail=email;
      const nm = up ? (($('#nm')||{}).value||'').trim() : '';
      screenSignIn(null, true);
      Promise.resolve(up ? Store.signUp(email,pw) : Store.signIn(email,pw)).then(res=>{
        if(res && res.error) return screenSignIn(res.error);
        if(res && res.needsConfirm){ markKnownDevice(); return screenConfirm(email); }
        if(nm) Store.setName(nm);
        markKnownDevice();   // this device has had an account -> signed-out visits land on sign-in, not the on-ramp
        currentTab='today'; route();
      }).catch(e=>screenSignIn(String((e&&e.message)||e)));
    }
  }
  // T-1: one guided breath on the sign-in gate, no account needed — the app's
  // best moment shouldn't be locked behind its most stressful one. Same in(4s)/
  // out(6s) timing as the Today ring; reduced motion = text + opacity only.
  let _gbRunning = false;
  function gateBreath(){
    if(_gbRunning) return; _gbRunning = true;
    const ring=$('#gb-ring'), txt=$('#gb-txt');
    const reduce = document.body.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion:reduce)').matches;
    try{ haptic('start'); }catch(_){}
    const setTxt=(t)=>{ if(txt) txt.textContent=t; };
    const done=()=>{
      setTxt("that's the heart of it. come on in.");
      setTimeout(()=>{
        if(ring){ ring.style.transition=''; ring.style.transform=''; ring.style.opacity=''; ring.style.animation=''; }
        setTxt('take one breath first.');
        _gbRunning=false;
      }, 3200);
    };
    if(ring){
      ring.style.animation='none';
      ring.style.transition = reduce ? 'opacity .3s ease' : 'transform .3s ease, opacity .3s ease';
      ring.getBoundingClientRect();
      if(!reduce) ring.style.transform='scale(.86)';
      ring.style.opacity='.5';
    }
    setTimeout(()=>{
      setTxt('in');
      if(ring){ if(reduce){ ring.style.transition='opacity 4s'; ring.style.opacity='.85'; }
        else{ ring.style.transition='transform 4s cubic-bezier(.4,0,.5,1), opacity 4s'; ring.style.transform='scale(1.22)'; ring.style.opacity='.85'; } }
      setTimeout(()=>{
        setTxt('out');
        if(ring){ if(reduce){ ring.style.transition='opacity 6s'; ring.style.opacity='.45'; }
          else{ ring.style.transition='transform 6s cubic-bezier(.4,0,.5,1), opacity 6s'; ring.style.transform='scale(.82)'; ring.style.opacity='.45'; } }
      }, 4200);
      setTimeout(done, 10400);
    }, 350);
  }

  // ================================================================ GUEST PRE-SIGNUP FLOW
  // A visitor can do a real check-in, get a real reflection, and try ONE practice
  // before creating an account (approved 2026-07-10; free/paid boundary cleared by
  // Get More Sales). This is deliberately a SEPARATE, tabbar-free linear sequence —
  // it never calls app()/screenCheckin()/renderPracticeChooser(), because those
  // render the shared tabbar whose practice tab exposes the self-regulation ("most"/
  // pendulation) track. That track needs an established safety baseline and must be
  // unreachable by a first-time anonymous visitor. Only after a successful save
  // (linkIdentity) does the person enter the normal route()/app() shell.
  //
  // Free/paid boundary held here (GMS 2026-07-10): the guest gets a single generic,
  // self-picked, NON-recommended taste. No recommender/personalization dials, no
  // reader/blog, no "most" track — those stay paid.
  let _guestFlow = false;
  let _guestCI = null;          // {v,sym,dor} (0..1) captured at check-in, for reflection + return
  // ONE practice per guest. Justin, 2026-07-10: a guest could finish (or exit) a practice
  // and immediately pick another, indefinitely — the taste is meant to be a single, honest
  // free practice, not an unlimited library. Once they've practiced, the way forward is the
  // save screen; the practice CTA is retired rather than silently failing.
  let _guestPracticed = false;
  // Gates the tabbar-free screens and the hard 'most' refusal in launchWeaver/logSession.
  //
  // 2026-07-10: this used to require `_guestFlow && isAnonymous()`. That was a latent
  // hole — `_guestFlow` is in-memory, so any page reload cleared it while the person
  // was still an anonymous user, and every guard keyed on inGuest() silently switched
  // off. Anonymity is the durable fact; the flag is not. Key the guard on anonymity
  // ALONE, so it cannot be defeated by a reload.
  function inGuest(){ try{ return !!(Store.isAnonymous && Store.isAnonymous()); }catch(e){ return false; } }

  // Entry: mint an anonymous session, then drop into the tabbar-free guest sequence.
  // entry: 'checkin' (default — arrival CTA) or 'practice' (the /stuck door: straight
  // to the pick; the check-in is offered after the practice on the landing beat).
  function startGuestFlow(entry){
    // 2026-07-10 (Justin, on-device): this used to render screenSignIn(busy) while the
    // anonymous session minted — so tapping "start a check-in" flashed the SIGN-IN SCREEN
    // for a split second before the check-in appeared. A leftover from before the arrival
    // existed. Don't render anything: hold the current screen until the check-in is ready.
    //
    // Also set _guestFlow BEFORE the async call. Store.init(route) re-fires route() on the
    // SIGNED_IN event, which would otherwise race us and render the check-in twice.
    _guestFlow = true; _guestCI = null; _guestPracticed = false;
    const practiceFirst = entry==='practice';
    setGuestDoor(practiceFirst ? 'practice' : null);
    // on failure fall back to whichever gate this visitor came from
    const gate = (err)=>{ _guestFlow=false; setGuestDoor(null); return (Store.cloud() && !knownDevice()) ? screenArrival(err) : screenSignIn(err); };
    Promise.resolve(Store.signInAnonymously()).then(res=>{
      if(res && res.error) return gate(res.error);
      practiceFirst ? guestPracticePick() : guestCheckin();
    }).catch(e=>gate(String((e&&e.message)||e)));
  }

  // ---- guest check-in (streamlined, tabbar-free) ----
  // Three sliders + the live mirror + "ask me differently". Intentionally omits the
  // paid-side folds (challenge / "choose your next practice" = recommender
  // personalization) and context tagging (patterns = paid) — the guest taste is
  // generic by design. The saved check-in is source-tagged 'guest' so guest-origin
  // signups never blend into the paid-trial cohort read (GMS condition, 2026-07-10).
  function guestCheckin(){
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    let v=50, s=50, d=50;   // symmetric midpoints; nothing suggested
    const qIdx = { v:ciRand('v',-1), sym:ciRand('sym',-1), dor:ciRand('dor',-1) };
    root.innerHTML = `
      <header class="appbar"><button class="backbtn" id="g-ci-back">back</button></header>
      <div class="scroll" id="content"></div>`;
    // back off the FIRST screen = abandon. But when the check-in was offered after a
    // practice (the /stuck door), back returns to the save offer — leaving would silently
    // discard the practice they just finished.
    $('#g-ci-back').onclick = ()=> _guestPracticed ? guestSaveInvite('landing') : guestLeave();
    $('#content').innerHTML = `<div class="view checkin2">
        <div class="scr-head">
          <p class="eyebrow">your first check-in</p>
          <h2 class="scr-h">right now, how easy would it be to&hellip;</h2>
        </div>
        <div class="ci-block">
          <div class="sliders">
            ${sliderHTML('v', CI_BANK.v[qIdx.v], 'r-v', v)}
            ${sliderHTML('sym', CI_BANK.sym[qIdx.sym], 'r-sym', 100-s)}
            ${sliderHTML('dor', CI_BANK.dor[qIdx.dor], 'r-dor', 100-d)}
          </div>
          <button class="ci-shuffle" id="ci-shuffle" type="button">ask me differently</button>
          <p class="ci-readout" id="ci-readout"></p>
          <p class="fineprint" style="margin-top:10px">small, ordinary things. how hard or easy they feel is the read.</p>
        </div>
        <div class="actionbar"><button class="btn block" id="g-ci-save">see what you described</button></div>
      </div>`;
    const readout = $('#ci-readout');
    const axTouched = {};
    function refresh(){
      setIcoLvl('v',v); setIcoLvl('sym',s); setIcoLvl('dor',d);
      const dom = window.PVCurrent.dominantOf(v/100, s/100, d/100);
      const core = STATE_CORE[dom.key] || [];
      const own = AXIS_OWN();
      const allTouched = axTouched.v && axTouched.sym && axTouched.dor;
      ['v','sym','dor'].forEach(ax=>{ const el=$('#sl-'+ax); if(!el) return;
        const active = allTouched && core.length>1 && core.includes(ax);
        el.style.setProperty('--rail', axTouched[ax] ? (active ? STATE_COLOR(dom.key) : own[ax]) : 'var(--ink-faded)'); });
      if(readout){
        const anyTouched = axTouched.v||axTouched.sym||axTouched.dor;
        readout.textContent = anyTouched ? ciMirror(v/100, s/100, d/100)
          : 'move the sliders, and this line will mirror what you set.';
        readout.classList.toggle('ci-readout-idle', !anyTouched);
      }
    }
    bindSlider('v', val=>{v=val;axTouched.v=1;refresh();});
    bindSlider('sym', val=>{s=100-val;axTouched.sym=1;refresh();});
    bindSlider('dor', val=>{d=100-val;axTouched.dor=1;refresh();});
    refresh();
    $('#ci-shuffle').onclick = ()=>{
      ['v','sym','dor'].forEach(ax=>{
        qIdx[ax] = ciRand(ax, qIdx[ax]);
        const q = root.querySelector('#q-'+ax); if(q) q.textContent = CI_BANK[ax][qIdx[ax]];
        const sl = $('#sl-'+ax); if(sl) sl.setAttribute('aria-label','how easy would it be to '+CI_BANK[ax][qIdx[ax]]);
      });
    };
    $('#g-ci-save').onclick = ()=>{
      const vals = { v:v/100, sym:s/100, dor:d/100, source:'guest' };
      if(!(axTouched.v||axTouched.sym||axTouched.dor)) vals.dom='neutral';   // untouched midpoints = settling, never a tie-break state
      Store.addCheckin(vals);
      _guestCI = { v:v/100, sym:s/100, dor:d/100 };
      haptic('save');
      guestReflection();
    };
  }

  // ---- guest reflection (immediate single-check-in state read) ----
  // Free forever (GMS): the immediate state read from a check-in. Mirrors what the
  // person named — the dominant state, in the tri-glyph marks, with the mirror line.
  // No reader/blog and no "recommended for you" (both paid personalization).
  function guestReflection(){
    clearFigures(); document.body.classList.remove('in-practice');
    const ci = _guestCI || { v:.5, sym:.5, dor:.5 };
    const dom = window.PVCurrent.dominantOf(ci.v, ci.sym, ci.dor);
    const name = STATE_NAME(dom.key);
    root.innerHTML = `
      <header class="appbar"><button class="backbtn" id="g-rf-back">back</button></header>
      <div class="scroll" id="content"></div>`;
    $('#g-rf-back').onclick = ()=>guestCheckin();
    $('#content').innerHTML = `<div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">what you described</p>
          <div class="g-glyph">${triGlyph(dom.key)}</div>
          <h1 class="scr-h" style="margin-top:14px">${escapeHtml(name)}</h1>
          <p class="scr-lede">${escapeHtml(ciMirror(ci.v, ci.sym, ci.dor))}</p>
        </div>
        <div class="actionbar">
          ${_guestPracticed
            ? '<button class="btn block" id="g-rf-save">keep this check-in</button>'
            : '<button class="btn block" id="g-rf-practice">try a practice from here</button><button class="navlink" id="g-rf-save" style="align-self:center">keep this check-in</button>'}
        </div>
      </div>`;
    // once they've practiced, the practice CTA is gone — one taste, then save
    const rfp = $('#g-rf-practice'); if(rfp) rfp.onclick = ()=>guestPracticePick();
    $('#g-rf-save').onclick = ()=>guestSaveInvite('reflection');
  }

  // ---- guest practice pick (exactly two hardcoded options) ----
  // Built fresh with exactly two options — simple mindfulness and connect-with-safety.
  // NEVER the full P_OPTS and NEVER the 'most' (self-regulation) branch. This is the
  // hard safety boundary for anonymous visitors.
  const GUEST_P_OPTS = [
    { key:'mindfulness', title:'simple mindfulness', sub:'the gentlest, a calm place to start' },
    { key:'anchoring',   title:'connect with safety', sub:'settling in through your senses' },
  ];
  function guestPracticePick(){
    // hard stop: one practice per guest. If they've already had it, the only way on is save.
    if(_guestPracticed) return guestSaveInvite('complete');
    clearFigures(); document.body.classList.remove('in-practice');
    const P_ICO = {
      mindfulness: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>',
      anchoring:   ico('heart',{color:'var(--track-safety-ink)'}),
    };
    const card = (o)=>`
      <button class="wincard p-opt g-opt" data-gkey="${o.key}">
        <span class="p-opt-ico" aria-hidden="true">${P_ICO[o.key]||''}</span>
        <span class="wc-text">
          <span class="wc-title">${escapeHtml(o.title)}</span>
          <span class="wc-reason">${escapeHtml(o.sub)}</span>
        </span>
        <span class="wc-go">${CHEV}</span>
      </button>`;
    root.innerHTML = `
      <header class="appbar"><button class="backbtn" id="g-pp-back">back</button></header>
      <div class="scroll" id="content"></div>`;
    // practice-first guests have no reflection to go back to — back means leave.
    $('#g-pp-back').onclick = ()=> _guestCI ? guestReflection() : guestLeave();
    $('#content').innerHTML = `<div class="view p-view">
        <div class="scr-head">
          <p class="eyebrow">your choice</p>
          <h2 class="scr-h">pick one. either is fine.</h2>
          <p class="scr-lede">both are short. there's no wrong one.</p>
        </div>
        <div class="p-opts g-opts">${GUEST_P_OPTS.map(card).join('')}</div>
        ${_guestCI ? `<div class="actionbar">
          <button class="navlink" id="g-pp-save" style="align-self:center">keep this check-in</button>
        </div>` : ''}
      </div>`;
    content().querySelectorAll('[data-gkey]').forEach(b=>b.onclick=()=>guestLaunch(b.dataset.gkey));
    const gps = $('#g-pp-save'); if(gps) gps.onclick = ()=>guestSaveInvite('pick');
  }

  // ---- guest practice launch + tabbar-free shell ----
  function guestLaunch(key){
    if(key!=='mindfulness' && key!=='anchoring'){   // hard guard: guests get only these two
      showToast('that one opens once you have an account.'); return guestPracticePick();
    }
    const sense = 'touch', silence = 8;   // generic, non-personalized defaults
    const ps = { embed:'1', autostart:'1', practice:key, sense, silence:String(silence) };
    const src = 'player.html?'+new URLSearchParams(ps).toString();
    const reco = { practiceKey:key, sense, silence };
    guestPracticeShell(src, reco);
  }
  // Same as practiceShell, but with NO tabbar — a guest must not gain tab access
  // (and its 'most' path) mid-practice. Back returns to the guest pick screen.
  function guestPracticeShell(src, reco){
    haptic('start');
    setHTML(`
      <div class="weaver-wrap">
        <div class="weaver-loading" id="weaver-loading" aria-live="polite"><span class="wl-ring" aria-hidden="true"></span><span class="wl-txt">preparing your practice</span></div>
        <iframe class="weaver-frame" id="weaver" src="${src}" title="guided practice" allow="autoplay; screen-wake-lock"></iframe>
      </div>`);
    const _wf=$('#weaver'), _wl=$('#weaver-loading');
    let _wlDone=false;
    const _wlTimeout=setTimeout(()=>{
      if(_wlDone||!_wl) return;
      _wl.innerHTML='<span class="wl-txt">can’t load the practice right now. check your connection and try again.</span><button class="set-quiet actionbar-aux" id="wl-back" style="margin-top:14px">back</button>';
      const b=document.getElementById('wl-back'); if(b) b.onclick=()=>guestPracticePick();
    }, 10000);
    if(_wf&&_wl) _wf.addEventListener('load',()=>{ _wlDone=true; clearTimeout(_wlTimeout); _wl.classList.add('gone'); setTimeout(()=>{ try{_wl.remove();}catch(e){} },600); });
    window._pendingReco = reco;
  }

  // ---- guest save-invite (identity linking) ----
  // Reuses the account form, but calls Store.linkIdentity() (attach email+password
  // to the same anonymous user) instead of signUp — so the guest's check-in,
  // session, and any data carry over with zero migration. Frames the free tier as
  // progression, not a downgrade (GMS copy note, 🖊 Justin to finalize wording).
  // ---- guest landing (after a completed practice) ----
  // A close, not a congratulation. Nothing to do, nothing to answer, no ask. Its only job
  // is to let the practice land BEFORE the save invite, so the offer reads as a choice
  // rather than a sell riding on top of the reward.
  function guestLanding(){
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    setHTML(`
      <div class="view gate land">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <span class="land-ring" aria-hidden="true"></span>
          <h1 style="margin:22px 0 12px">that's the practice.</h1>
          <p class="lede">stay here as long as you like.</p>
        </div>
        <div class="actionbar">
          ${_guestCI
            ? '<button class="btn block" id="g-land-go">i\'m ready</button>'
            : `<button class="btn block" id="g-land-ci">name where you are now</button>
               <button class="navlink" id="g-land-skip" style="align-self:center">not now</button>`}
        </div>
      </div>`);
    // practice-first (the /stuck door): the check-in is OFFERED here, after the practice —
    // 🖊 draft copy, Justin finalizes. Taking it runs the same guest check-in -> reflection,
    // where "keep this check-in" leads on (the practice CTA is already retired). Declining
    // goes straight to the save offer. Check-in-first guests keep the plain close.
    const glg = $('#g-land-go');   if(glg)  glg.onclick  = ()=>guestSaveInvite('complete');
    const glc = $('#g-land-ci');   if(glc)  glc.onclick  = ()=>guestCheckin();
    const gls = $('#g-land-skip'); if(gls)  gls.onclick  = ()=>guestSaveInvite('complete');
  }

  function guestSaveInvite(from, err, busy){
    setHTML(`
      <div class="view gate">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <p class="eyebrow">before you go</p>
          <h1 style="margin:10px 0 12px">this ${_guestCI?'check-in':'practice'} only exists on this device.</h1>
          <p class="lede" style="margin-bottom:22px">an account keeps it, and everything you do after it, yours.</p>
          <div class="field"><label for="em">email</label><input id="em" type="email" autocomplete="email" value="${escapeHtml(lastEmail)}"><p class="fineprint" id="em-hint" style="display:none;margin-top:6px" aria-live="polite"></p></div>
          <div class="field"><label for="nm">your name <span style="color:var(--muted);font-weight:400">(optional)</span></label><input id="nm" type="text" autocomplete="name"></div>
          <div class="field"><label for="pw">password</label><input id="pw" type="password" autocomplete="new-password"></div>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="g-go" style="margin-top:8px"${busy?' disabled':''}>${busy?'one moment…':'create an account'}</button>
          <p class="fineprint" style="margin-top:10px">by creating an account, you agree to the <a href="#" data-policy="terms">terms</a> and <a href="#" data-policy="privacy">privacy policy</a>.</p>
          <p class="fineprint" style="margin-top:6px">an anonymous copy of check-ins and practice data (no name, no email, no notes) helps us learn whether this app helps people. it can never be traced back to you.</p>
          <p class="fineprint" style="margin-top:8px"><button class="linkbtn" id="g-later" style="font-size:inherit;padding:2px">leave without saving</button></p>
        </div>
      </div>`);
    if(busy) return;
    root.querySelectorAll('.fineprint a[data-policy]').forEach(a=>{
      a.onclick = (e)=>{ e.preventDefault(); screenPolicy(a.getAttribute('data-policy')); };
    });
    $('#em').addEventListener('input', e=>{ lastEmail=e.target.value; });
    $('#pw').addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
    // "leave without saving" means what it says. The arrival screen promised nothing is
    // saved unless they decide to keep it; a quiet bounce back into the flow (or a kept
    // check-in) would make that a lie. So this exits: sign out, discard, back to the door.
    const later = $('#g-later'); if(later) later.onclick = ()=>guestLeave();
    $('#g-go').onclick = submit;
    function submit(){
      const email=($('#em').value||'').trim(), pw=$('#pw').value;
      if(!email || (Store.cloud() && !pw)){ lastEmail=email; return guestSaveInvite(from, 'enter your email and a password.'); }
      lastEmail=email;
      const nm = (($('#nm')||{}).value||'').trim();
      guestSaveInvite(from, null, true);
      Promise.resolve(Store.linkIdentity(email, pw)).then(res=>{
        if(res && res.error) return guestSaveInvite(from, res.error);
        if(res && res.needsConfirm){ markKnownDevice(); return screenConfirm(email); }
        if(nm) Store.setName(nm);
        markKnownDevice();
        _guestFlow = false; _guestCI = null; setGuestDoor(null);   // leave the guest sequence; now a normal saved user
        currentTab='today'; route();
      }).catch(e=>guestSaveInvite(from, String((e&&e.message)||e)));
    }
  }

  // Abandon the guest flow entirely (back off the first screen): sign the anonymous
  // session out and return to the sign-in gate. The stray anonymous user + its lone
  // check-in are discarded (unsaved by definition).
  function guestLeave(){
    _guestFlow = false; _guestCI = null; setGuestDoor(null);
    Promise.resolve(Store.signOut && Store.signOut()).then(()=>{ authMode='in'; route(); }).catch(()=>{ authMode='in'; route(); });
  }

  // ---------------------------------------------------------------- paywall (paid-trial cohort only)
  // Shown to an invited cohort member who is signed in but has no active trial or
  // subscription. Copy is the calm, no-surprise-charge voice (Trial-Copy draft).
  function screenPaywall(err, busy){
    const b = (Store.billing && Store.billing()) || null;
    const ended = !!(b && (b.sub_status==='canceled' || b.sub_status==='unpaid' || b.sub_status==='incomplete_expired' || b.sub_status==='paused'));
    setHTML(`
      <div class="view gate">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <p class="eyebrow">${ended?'your free trial has ended':'your free trial'}</p>
          <h1 style="margin:10px 0 12px">${ended?'keep going for $12 a month':'try the whole app free for 8 days'}</h1>
          <p class="lede" style="margin-bottom:18px">${ended
            ? "you weren't charged. if you'd like to keep going, it's $12 a month, and you can cancel anytime."
            : 'check in with how you actually feel, get a practice tuned to your state, and notice what shifts. free for 8 days.'}</p>
          ${ended?'':`<p class="fineprint" style="margin-bottom:18px">a card is required to start. you won't be charged today. after 8 days it's $12 a month, and you can cancel anytime before then and pay nothing.</p>`}
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="pw-go"${busy?' disabled':''}>${busy?'one moment…':(ended?'subscribe':'start my free trial')}</button>
          ${ended?'':'<p class="fineprint" style="margin-top:10px">we\'ll remind you before the trial ends. cancelling takes two taps.</p>'}
          <p class="fineprint" style="margin-top:14px"><button class="linkbtn" id="pw-out" style="font-size:inherit;padding:2px">sign out</button></p>
        </div>
      </div>`);
    if(busy) return;
    $('#pw-go').onclick = ()=>{
      screenPaywall(null, true);
      Promise.resolve(Store.startTrial()).then(res=>{
        if(res && res.error) return screenPaywall(res.error);   // else the browser is redirecting to Stripe
      }).catch(e=>screenPaywall(String((e&&e.message)||e)));
    };
    const so=$('#pw-out'); if(so) so.onclick = async ()=>{ await Store.signOut(); currentTab='today'; route(); };
  }

  function screenConfirm(email){
    setHTML(`
      <div class="view gate"><div class="gate-body" style="text-align:center">
        <p class="eyebrow">almost there</p>
        <h1 style="margin:12px 0 12px">check your email.</h1>
        <p class="lede" style="margin-bottom:24px">we sent a confirmation link to <b style="font-weight:500">${escapeHtml(email)}</b>. it will come from "Supabase Auth", the service that keeps your account secure. tap it, then come back here to sign in.</p>
        <button class="btn block" id="back2">back to sign in</button>
      </div></div>`);
    $('#back2').onclick=()=>{ authMode='in'; screenSignIn(); };
  }

  // forgot password: confirmation that the reset email went out
  function screenResetSent(email){
    setHTML(`
      <div class="view gate"><div class="gate-body" style="text-align:center">
        <p class="eyebrow">reset link sent</p>
        <h1 style="margin:12px 0 12px">check your email.</h1>
        <p class="lede" style="margin-bottom:24px">we sent a password reset link to <b style="font-weight:500">${escapeHtml(email)}</b>. it will come from "Supabase Auth", the service that keeps your account secure. tap the link and you'll come back here to choose a new password. it can take a couple of minutes to arrive.</p>
        <button class="btn block" id="back3">back to sign in</button>
      </div></div>`);
    $('#back3').onclick=()=>{ authMode='in'; screenSignIn(); };
  }

  // landed here from the reset link in their email: already signed in,
  // one job — choose a new password.
  function screenNewPassword(err, busy){
    setHTML(`
      <div class="view gate"><div class="gate-body">
        <p class="eyebrow">new password</p>
        <h1 style="margin:12px 0 12px">choose a new password.</h1>
        <p class="lede" style="margin-bottom:24px">you're signed in. pick a new password and you're done.</p>
        <div class="field"><label for="npw">new password</label><input id="npw" type="password" autocomplete="new-password"></div>
        ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
        <button class="btn block" id="npw-go" style="margin-top:8px"${busy?' disabled':''}>${busy?'one moment…':'save password'}</button>
      </div></div>`);
    if(busy) return;
    const submit=()=>{
      const pw=$('#npw').value;
      if(!pw || pw.length<6) return screenNewPassword('use at least six characters.');
      screenNewPassword(null, true);
      Promise.resolve(Store.updatePassword(pw)).then(res=>{
        if(res && res.error) return screenNewPassword(res.error);
        _recovery=false;
        // reset links always open in the browser, never in the installed app
        // (an iOS limitation) — so if we're not running standalone, close the
        // loop with a pointer back home instead of quietly continuing here.
        const standalone = (navigator.standalone===true) || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
        if(!standalone) return screenResetDone();
        showToast('password updated.'); currentTab='today'; route();
      }).catch(e=>screenNewPassword(String((e&&e.message)||e)));
    };
    $('#npw-go').onclick=submit;
    $('#npw').addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
  }
  // password saved from a browser tab (not the installed app): point them home.
  function screenResetDone(){
    setHTML(`
      <div class="view gate"><div class="gate-body" style="text-align:center">
        <p class="eyebrow">all set</p>
        <h1 style="margin:12px 0 12px">password updated.</h1>
        <p class="lede" style="margin-bottom:24px">you can close this tab. open the app from your home screen and sign in with your new password if it asks.</p>
        <button class="btn block" id="reset-done-continue">or keep going here</button>
      </div></div>`);
    $('#reset-done-continue').onclick=()=>{ currentTab='today'; route(); };
  }
  // In-app reader for the create-account disclaimers. Back returns to the
  // create-account screen (authMode='up'), never into the main app.
  function screenPolicy(which, from){
    const isPriv = which==='privacy';
    const eyebrow = isPriv ? 'privacy policy' : 'terms of use';
    const title = isPriv ? 'what we keep, and what we don’t.' : 'how to get the most out of this app.';
    const lede = isPriv
      ? 'written in plain language.'
      : 'transparency before you begin.';
    const sections = isPriv ? [
      ['what we keep','this app keeps track of your email, in-app preferences and check-ins.'],
      ['why','so your account works, your history is here on every device you sign in from, to track progress, and make custom recommendations.'],
      ['what stays anonymous','an anonymous copy of check-ins and practice data also exists, with no name, no email, and none of your written notes. it cannot be traced back to you, even by us.'],
      ['what the anonymous copy is for','two things, and only these: learning whether this app actually helps people, and sharing de-identified examples of what progress can look like (for instance, "one member\'s reported safety rose from 20% to 60% over six months"). never advertising, never sold.'],
      ['who sees it',"your identified data: only you. it isn't sold or given away, and no advertisers see it. justin works with the anonymous copy to study whether the app helps and to improve it."],
      ['your control','you can delete your data, or your whole account, any time from settings (your data > delete my account). deleting removes everything that identifies you, permanently. the anonymous copy stays, unlinked, forever.']
    ] : [
      ['what this is',"a tool for noticing your daily experiences through the lens of the nervous system and practicing your way back to safety. it isn't medical care, diagnosis, or therapy, nor should it replace any of those or other professional services."],
      ['in a crisis','if you’re in danger or thinking about harming yourself, contact the 988 Suicide &amp; Crisis Lifeline or your local emergency services. this app can’t help in an emergency.'],
      ['be gentle',"everyone is different. there's no failing here, and no streak to keep. use the app as you want and when you want. practice at your cadence."],
      ['changes',"justin may (and will) update the app and these terms over time. updates keep the app working, and you'll hear about changes in the app or by email."]
    ];
    const PP=(t)=>`<p style="font-size:calc(15px * var(--type-scale));line-height:1.7;color:var(--ink-80);text-wrap:pretty;margin:0">${t}</p>`;
    setHTML(`
      <header class="appbar"><button class="backbtn" id="policy-back">back</button></header>
      <div class="scroll">
        <div class="view read" style="gap:22px">
          <div>
            <p class="eyebrow" style="margin-bottom:10px">${eyebrow}</p>
            <h1 style="margin:0 0 12px">${title}</h1>
            ${PP(lede)}
          </div>
          ${sections.map(([h,b])=>`<div style="display:flex;flex-direction:column;gap:8px">
            <p class="eyebrow" style="margin:0">${h}</p>
            ${PP(b)}
          </div>`).join('')}
          <p class="fineprint" style="margin-top:4px">plain-language draft for this design. the final ${isPriv?'privacy policy':'terms'} will replace this before launch.</p>
        </div>
      </div>`);
    $('#policy-back').onclick = ()=>{ if(from==='settings'){ screenSettings(); } else { authMode='up'; screenSignIn(); } };
  }

  // ---------------------------------------------------------------- app shell
  let _mintedThisSession = false;
  function app(tab){
    currentTab = tab;
    if(!_mintedThisSession){ _mintedThisSession = true; mintPastDays(); mintWeeks(); mintMonths(); mintQuarters(); }
    const u = Store.user();
    setHTML(`
      <header class="appbar">
      </header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`);
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    ({ today:tabToday, current:tabCurrent, practice:tabPractice }[tab] || tabToday)();
    if(tab === 'today') maybeInstallNudge();
    maybeTrialBanner();
    document.body.classList.remove('show-fab');
  }
  // install affordances: a quiet settings row + an optional dismissable today nudge
  function installRowInner(){
    const s = installState();
    if(s==='installed') return '<span class="val" style="font-weight:400">installed</span>';
    if(s==='button') return '<button class="set-quiet in-go" type="button">install this app</button>';
    if(s==='ios-share') return '<span class="ios-hint">to install: tap the share icon, then choose add to home screen.</span>';
    if(s==='open-elsewhere') return '<span class="ios-hint">'+openElsewhereMsg()+'</span>';
    return '<span class="ios-hint">to install: open your browser menu and choose install or add to home screen.</span>';
  }
  function maybeInstallNudge(){
    // android/chrome: native install button (beforeinstallprompt). iOS never fires
    // that event, so there the nudge carries the add-to-home-screen instruction.
    let s; try{ s = installState(); if(s==='installed' || s==='other') return; if(localStorage.getItem('snb_install_nudge') === 'dismissed') return; }catch(_){ return; }
    const c = content(); if(!c || document.getElementById('install-nudge')) return;
    const b = document.createElement('div'); b.className = 'install-nudge'; b.id = 'install-nudge';
    b.innerHTML = s==='button'
      ? '<span class="in-txt">install the SNB app.</span><span class="in-actions"><button type="button" class="in-go">install</button><button type="button" class="in-x" aria-label="dismiss">\u00d7</button></span>'
      : s==='open-elsewhere'
        ? '<span class="in-txt">'+openElsewhereMsg()+'</span><span class="in-actions"><button type="button" class="in-x" aria-label="dismiss">\u00d7</button></span>'
        : '<span class="in-txt">install the app: tap the share icon, then <b>add to home screen</b>.</span><span class="in-actions"><button type="button" class="in-x" aria-label="dismiss">\u00d7</button></span>';
    c.insertBefore(b, c.firstChild);
    const g = b.querySelector('.in-go'); if(g) g.onclick = promptInstall;
    const x = b.querySelector('.in-x'); if(x) x.onclick = ()=>{ try{ localStorage.setItem('snb_install_nudge','dismissed'); }catch(_){} b.remove(); };
  }
  // paid-trial banner: persistent while trialing. names the charge date and gives a
  // one-tap manage/cancel. calm early on; a firmer nudge in the last two days. no
  // countdown-timer urgency — the promise is that nobody pays by accident.
  function maybeTrialBanner(){
    let bill; try{ bill = Store.billing && Store.billing(); }catch(_){ return; }
    if(!bill || bill.sub_status!=='trialing' || !bill.trial_end) return;
    const c = content(); if(!c || document.getElementById('trial-banner')) return;
    const end = new Date(bill.trial_end); if(isNaN(end)) return;
    const daysLeft = Math.max(0, Math.ceil((end - Date.now())/864e5));
    const dateStr = end.toLocaleDateString('en-US', { month:'long', day:'numeric' });
    const urgent = daysLeft <= 2;
    const msg = daysLeft<=0
      ? "your trial ends today. you'll be charged $12 to keep going, or cancel now and pay nothing."
      : urgent
        ? `your free trial ends ${dateStr}. to avoid the $12 charge, cancel before then. it takes two taps.`
        : `you're on your free trial. it ends ${dateStr}, when the first $12 charge would happen.`;
    const el = document.createElement('div');
    el.className = 'trial-banner' + (urgent?' urgent':''); el.id = 'trial-banner';
    el.innerHTML = `<span class="tb-txt">${msg}</span><button type="button" class="tb-manage">manage</button>`;
    c.insertBefore(el, c.firstChild);
    const m = el.querySelector('.tb-manage');
    if(m) m.onclick = ()=>{ m.disabled=true; m.textContent='one moment…';
      Promise.resolve(Store.openPortal()).then(res=>{ if(res && res.error){ m.disabled=false; m.textContent='manage'; showToast(res.error); } })
        .catch(e=>{ m.disabled=false; m.textContent='manage'; showToast(String((e&&e.message)||e)); }); };
  }
  // active tab = FILLED symbol (the iOS convention: selection reads at a glance,
  // not just by tint); inactive = outline.
  function tabIcon(t, on){
    if(on) return ({
      today:'<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.4" fill="currentColor" stroke="none"/><path fill="none" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
      practice:'<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path fill="none" d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4.2" height="7" rx="1.6" fill="currentColor" stroke="none"/><rect x="17.3" y="13" width="4.2" height="7" rx="1.6" fill="currentColor" stroke="none"/></svg>',
      current:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.8" fill="currentColor"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0z" fill="currentColor"/></svg>'
    }[t]||'');
    return ({
    today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
    practice:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4.2" height="7" rx="1.6"/><rect x="17.3" y="13" width="4.2" height="7" rx="1.6"/></svg>',
    current:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>'
  }[t]||''); }
  function tabBtn(t,label){ const on=currentTab===t; return `<button data-t="${t}" class="${on?'on':''}" aria-label="${label}"${on?' aria-current="page"':''}><span class="ic" aria-hidden="true">${tabIcon(t,on)}</span><span class="lb">${label}</span></button>`; }
  const content = () => $('#content');

  // ---------------------------------------------------------------- TODAY
  // ---- daily wins (no counter, no streak — three small things, checkable each day) ----
  function sameDay(t){ const d=new Date(t), n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate(); }
  // morning / afternoon / evening — the check-in resets each segment so you can notice
  // where you are at different times of day, and see those patterns build up over time.
  function segOf(t){ const h=new Date(t).getHours(); return h<5?'late':h<12?'morning':h<17?'afternoon':h<22?'evening':'late'; }
  function segLabel(seg){ return seg==='late'?'late night':seg; }
  function segPoss(seg){ return seg==='late'?'night':seg; }
  // per-user AND per-day: a new account on the same device must not inherit
  // the previous account's "already breathed today" settled state
  function breathKey(){ const n=new Date(); const u=(Store.user()&&Store.user().id)||'anon'; return 'snb_breath_'+u+'_'+n.getFullYear()+'-'+(n.getMonth()+1)+'-'+n.getDate(); }
  function breathDone(){ try{ return localStorage.getItem(breathKey())==='1'; }catch(e){ return false; } }
  function markBreath(){ try{ localStorage.setItem(breathKey(),'1'); }catch(e){} }
  // Daily note: state-reactive via FromJustin module
  function winsDone(){
    const last = Store.lastCheckin();
    const sess = Store.sessions();
    return {
      breath: breathDone(),
      checkin: !!(last && sameDay(last.t) && segOf(last.t)===segOf(Date.now())),   // resets each part of day
      practice: sess.some(s => sameDay(s.t)),
    };
  }

  let breathing = false;
  let todayGreet = null, todayGreetName = null;
  function pickGreeting(seg, name, quiet){
    // a wide pool for variety; exclamation lines are skipped for shutdown/freeze
    // arrivals (the quiet filter below), so keep plenty of soft lines in the mix.
    let pool = name ? [
      `hi, ${name}.`,
      `hey again, ${name}.`,
      `${name}'s back!`,
      `good ${seg}, ${name}.`,
      `welcome back, ${name}.`,
      `hey there, ${name}.`,
      `glad you're here, ${name}.`,
      `hello again, ${name}.`,
      `you made it back, ${name}!`,
      `settle in, ${name}.`,
      `you got this, ${name}.`,
      `good to see you, ${name}.`,
      `no rush today, ${name}.`,
      `one breath at a time, ${name}.`,
      `the ring's ready when you are, ${name}.`,
      `take what you need, ${name}.`,
      `here we are again, ${name}.`,
      `you showed up, ${name}. that counts.`,
      `this ${seg} is yours, ${name}.`
    ] : [
      `hi again.`,
      `welcome back.`,
      `good ${seg}.`,
      `there you are.`,
      `you made it back!`,
      `settle in.`,
      `glad you're here.`,
      `good to see you.`,
      `no rush today.`,
      `one breath at a time.`,
      `the ring's ready when you are.`,
      `take what you need.`,
      `here we are again.`
    ];
    // shutdown/freeze arrivals get the quiet lines only — no exclamation energy
    if(quiet) pool = pool.filter(t=>t.indexOf('!')===-1);
    let last=-1; try{ var v=parseInt(localStorage.getItem('snb_greet_i'),10); if(!isNaN(v)) last=v; }catch(e){}
    let i=Math.floor(Math.random()*pool.length);
    if(pool.length>1){ while(i===last){ i=Math.floor(Math.random()*pool.length); } }
    try{ localStorage.setItem('snb_greet_i', i); }catch(e){}
    return pool[i];
  }
  function tabToday(){
    const c = content();
    const last = Store.lastCheckin();
    const reco = Store.recommend();
    const done = winsDone();
    const nm = Store.getName();
    const seg = segOf(Date.now());
    if(todayGreet===null || todayGreetName!==nm){ const _q = !!(last && (last.dom==='shutdown'||last.dom==='freeze')); todayGreet = pickGreeting(segLabel(seg), nm ? escapeHtml(nm) : '', _q); todayGreetName = nm; }
    const greet = todayGreet;

    // state readout doubles as the check-in control: outlined full-width when
    // you've checked in THIS PART OF DAY (shows your state), a filled capsule CTA
    // when you haven't — it reverts each segment (morning/afternoon/evening/late)
    // so every new stretch of the day invites a fresh check-in.
    const checkedIn = !!(last && sameDay(last.t) && segOf(last.t)===segOf(Date.now()));
    const dom  = checkedIn ? last.dom : null;
    const halo = checkedIn ? STATE_COLOR(dom) : 'var(--hairline)';
    const stateHTML = checkedIn
      ? `<button class="tb-state tb-state-line" id="tb-state"><span class="tb-glyph">${triGlyph(dom)}</span><span class="tb-state-txt">${STATE_NAME(dom)} · this ${segLabel(segOf(last.t))}</span><span class="tb-chev">${CHEV}</span></button>`
      : `<button class="tb-state tb-state-cta" id="tb-state"><span class="tb-glyph">${triGlyph('neutral')}</span><span class="tb-state-txt">check in — how are you?</span><span class="tb-chev">${CHEV}</span></button>`;

    const pracName   = escapeHtml(Store.practiceLabel(reco.practiceKey));
    const pracReason = reco.reason ? escapeHtml(reco.reason) : '';
    const r  = (FromJustin.daily ? FromJustin.daily() : FromJustin.today());
    const reflText = (r && r.text) ? escapeHtml(r.text) : '';
    const td = (Store.today ? Store.today() : null);
    const dotsHTML = (td && td.n>=1) ? momentDots(td.moments) : '';
    const settled = done.breath;   // once you've breathed today, land in the calm collapsed state
    // first-week accounts keep a faint affordance hint under the settled ring
    let young=false; try{ const tn=Store.tenure(); young = !tn || (tn.days||0) <= 7; }catch(e){}

    c.innerHTML = `<div class="view today tb${settled?' breathed':''}${young?' young':''}">
      <div class="tb-head"><h2 class="tb-greet">${greet}</h2></div>
      <div class="tb-cluster">${stateHTML}</div>
      <div class="tb-hero">
        <button class="tb-breath" id="tb-breath" aria-label="take one intentional breath">
          <span class="tb-stage" style="--halo:${halo}">
            <span class="tb-halo"></span><span class="tb-halo b"></span>
            <span class="tb-ring" id="tring"><span class="tb-core"></span></span>
          </span>
          <span class="tb-below">
            <span class="tb-txt"><span class="tb-line">take a breath</span><span class="tb-hint">tap the ring to breathe</span></span>
            <span class="tb-phase" id="tb-phase" aria-live="polite"></span>
          </span>
          <span class="tb-esc" aria-hidden="true">tap anywhere to end early</span>
        </button>
      </div>
      <div class="tb-more-slot"><button class="tb-more" id="tb-more" type="button">two more minutes?</button></div>
      <div class="tb-foot">
        <button class="tb-row" id="tb-practice">
          <span class="tb-row-ico" aria-hidden="true">${tabIcon('practice')}</span>
          <span class="tb-row-text">
            <span class="tb-row-title">recommended practice</span>
            <span class="tb-row-sub tb-prac track-${trackOf(reco.practiceKey).cls}">${pracName}</span>
            ${pracReason ? `<span class="tb-reason">${pracReason}</span>` : ''}
          </span><span class="wc-go">${CHEV}</span>
        </button>
        ${reflText ? `<button class="tb-row" id="tb-refl">
          <span class="tb-row-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3h11a1 1 0 0 1 1 1v17l-6.5-4.2L5.5 21V4a1 1 0 0 1 1-1z"/></svg></span>
          <span class="tb-row-text">
            <span class="tb-row-title">reflections for you</span>
            <span class="tb-refl">${reflText}</span>${dotsHTML}
          </span><span class="wc-go">${CHEV}</span>
        </button>` : ''}
      </div>
    </div>`;

    const stateBtn  = c.querySelector('#tb-state');    if(stateBtn)  stateBtn.onclick  = screenCheckin;
    const breathBtn = c.querySelector('#tb-breath');   if(breathBtn) breathBtn.onclick = runBreath;
    // post-breath offer: one tap into the ~2.5-min micro practice
    const moreBtn = c.querySelector('#tb-more'); if(moreBtn) moreBtn.onclick = ()=>{
      let sn = 'touch'; try{ const p=Store.prefSense(); if(['touch','sound','sight'].includes(p)) sn=p; }catch(e){}
      practiceShell('player.html?'+new URLSearchParams({embed:'1',autostart:'1',practice:'micro',sense:sn,silence:'2'}).toString(), {practiceKey:'micro',sense:sn,silence:2});
    };
    const pracBtn   = c.querySelector('#tb-practice');  if(pracBtn)   pracBtn.onclick   = ()=>renderPlan(reco,'today');
    const reflBtn   = c.querySelector('#tb-refl');      if(reflBtn)   reflBtn.onclick   = screenReflectionDeep;
  }

  // Breath engine for the redesigned Today. On tap the ring becomes the whole
  // screen (everything else + the tab bar fade) with "in / out" beneath it; when
  // it settles the instruction is gone, the ring quiets, and the cards open up.
  // A tap anywhere during the breath ends it gently (no lock-in); the breath only
  // counts as done when a full cycle completes. With reduced motion the SAME
  // in(4s)/out(6s) timing runs, carried by the phase text + a soft opacity shift
  // instead of scale — motion is never the only signal.
  function runBreath(){
    if(breathing) return;
    const view  = content().querySelector('.today.tb');
    const ring  = document.getElementById('tring');
    const phase = document.getElementById('tb-phase');
    if(!view || !ring) return;
    try{ haptic('start'); }catch(_){}
    breathing = true;
    view.classList.remove('breathed');
    view.classList.add('breathing');
    document.body.classList.add('breathing');
    const reduce = document.body.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion:reduce)').matches;
    const timers = [];
    const later  = (fn,ms)=>{ timers.push(setTimeout(fn,ms)); };
    let done = false;
    const cleanup = (settle)=>{
      if(done) return; done = true;
      timers.forEach(clearTimeout);
      document.removeEventListener('pointerdown', onCancel, true);
      if(phase){ phase.classList.remove('show'); setTimeout(()=>{ if(phase) phase.textContent=''; }, 700); }
      ring.style.transition = 'transform 1.2s ease, opacity 1.2s';
      ring.style.transform  = 'scale(.96)'; ring.style.opacity = '.55';
      setTimeout(()=>{
        ring.style.transition=''; ring.style.transform=''; ring.style.opacity=''; ring.style.animation='';
        document.body.classList.remove('breathing');
        view.classList.remove('breathing');
        if(settle) view.classList.add('breathed');
        breathing = false;
      }, settle ? 1200 : 500);
    };
    const finish = ()=>{ try{ markBreath(); }catch(_){} cleanup(true); };
    // cancel: any tap once the breath is underway ends it; the screen settles
    // only if a full breath was already completed earlier today.
    const onCancel = ()=>{ cleanup(breathDone()); };
    later(()=>{ if(!done) document.addEventListener('pointerdown', onCancel, true); }, 600);
    // stop the ambient animation, glide to rest, then inhale / exhale
    ring.style.animation = 'none';
    ring.style.transition = reduce ? 'opacity .35s ease' : 'transform .35s ease, opacity .35s ease';
    ring.getBoundingClientRect();
    if(!reduce) ring.style.transform = 'scale(.86)';
    ring.style.opacity = '.5';
    later(()=>{
      if(phase){ phase.textContent='in'; phase.classList.add('show'); }
      if(reduce){ ring.style.transition = 'opacity 4s'; ring.style.opacity = '.85'; }
      else{
        ring.style.transition = 'transform 4s cubic-bezier(.4,0,.5,1), opacity 4s';
        ring.style.transform = 'scale(1.28)'; ring.style.opacity = '.8';
      }
      later(()=>{
        if(phase) phase.textContent='out';
        if(reduce){ ring.style.transition = 'opacity 6s'; ring.style.opacity = '.45'; }
        else{
          ring.style.transition = 'transform 6s cubic-bezier(.4,0,.5,1), opacity 6s';
          ring.style.transform  = 'scale(.78)'; ring.style.opacity = '.4';
        }
      }, 4300);
      later(finish, 10600);
    }, 380);
  }

  // The moment timeline: today's check-ins placed by time (x) and safety (y),
  // colored by state, with practices marked as gold rings and the newest moment
  // haloed. Shows from moment one. The model made visible.
  function momentTimeline(moments, sessions){
    moments  = (moments||[]).filter(m=>m&&typeof m.t==='number'&&m.dom).slice().sort((a,b)=>a.t-b.t);
    sessions = (sessions||[]).filter(s=>s&&typeof s.t==='number').slice().sort((a,b)=>a.t-b.t);
    if(!moments.length) return '';
    const W=320,H=148,padL=24,padR=14,padT=16,padB=26;
    // anchor the day to the MOMENTS' own date, not today's — archived days were
    // clamping every dot to the left edge (Justin's QA, 2026-07-05)
    const d0=new Date(moments[0].t); d0.setHours(0,0,0,0); const t0=d0.getTime(); const span=864e5;
    const cl=x=>x<0?0:x>1?1:x;
    const fx=t=>padL + cl((t-t0)/span)*(W-padL-padR);
    const fy=v=>padT + (1-cl(v))*(H-padT-padB);
    const pts=moments.map(m=>({x:fx(m.t),y:fy(m.v),dom:m.dom}));
    const vAt=t=>{ const a=moments; if(t<=a[0].t) return a[0].v; if(t>=a[a.length-1].t) return a[a.length-1].v;
      for(let i=1;i<a.length;i++){ if(t<=a[i].t){ const f=(t-a[i-1].t)/((a[i].t-a[i-1].t)||1); return a[i-1].v+(a[i].v-a[i-1].v)*f; } } return a[a.length-1].v; };
    const midY=(padT+(H-padT-padB)/2).toFixed(0);
    const line = pts.length>1 ? `<polyline points="${pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}" fill="none" stroke="var(--hairline)" stroke-width="1.5" stroke-dasharray="2 3"/>` : '';
    const rings = sessions.map(s=>{ const x=fx(s.t).toFixed(1), y=fy(vAt(s.t)).toFixed(1); return `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#C9A24B" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="#C9A24B"/>`; }).join('');
    const dots = pts.map((p,i)=>{ const nw=i===pts.length-1, c=STATE_COLOR(p.dom), x=p.x.toFixed(1), y=p.y.toFixed(1);
      return (nw?`<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${c}" stroke-opacity="0.45" stroke-width="2"/>`:'')+`<circle cx="${x}" cy="${y}" r="${nw?8.5:7.5}" fill="${c}"/>`; }).join('');
    const axis=`<text transform="rotate(-90 11 ${midY})" x="11" y="${midY}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="Inter">more safety</text>`+
      `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="var(--hairline)" stroke-width="1"/>`+
      `<line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="var(--hairline)" stroke-width="1"/>`;
    const labels=[['morning',0.18],['midday',0.45],['evening',0.74],['late',0.96]].map(o=>`<text x="${(padL+o[1]*(W-padL-padR)).toFixed(0)}" y="${H-8}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="Inter">${o[0]}</text>`).join('');
    const present=moments.map(m=>m.dom).filter((d,i,a)=>a.indexOf(d)===i);
    const leg=present.map(d=>`<span class="mtl-key"><span class="mtl-sw" style="background:${STATE_COLOR(d)}"></span>${escapeHtml(STATE_NAME(d))}</span>`).join('')+
      (sessions.length?`<span class="mtl-key"><span class="mtl-ring"></span>practice</span>`:'');
    return `<div class="mtl"><svg viewBox="0 0 ${W} ${H}" class="mtl-svg" role="img" aria-label="your check-ins today, placed by time and safety, colored by state">${axis}${line}${rings}${dots}${labels}</svg><div class="mtl-legend">${leg}</div></div>`;
  }
  // compact dots for the today card: today's moments in order, newest ringed.
  function momentDots(moments){
    const ms=(moments||[]).filter(m=>m&&m.dom).slice(-8);
    if(!ms.length) return '';
    return `<span class="md-row" aria-hidden="true">${ms.map((m,i)=>`<span class="md-dot${i===ms.length-1?' md-new':''}" style="background:${STATE_COLOR(m.dom)}"></span>`).join('')}</span>`;
  }

  // ---- for-you reader section visuals: each pictures the words of its section ----
  const _safeToY = (v, top, bot) => top + (1 - Math.max(0, Math.min(1, v))) * (bot - top);
  // light 3-point smoothing so a trend line reads as a trajectory, not day-to-day noise.
  function _smoothV(pts){
    if(!pts || pts.length<3) return pts||[];
    return pts.map((p,i)=>{ const a=pts[i-1]||p, b=pts[i+1]||p; return { x:p.x, v:(a.v+p.v+b.v)/3 }; });
  }
  // "where you've been": a proportional bar of the state mix + a labeled legend.
  function stateMixBar(dist, order){
    const states = (order||[]).filter(k=>dist && dist[k]>0);
    if(!states.length) return '';
    const segs = states.map(k=>`<div style="width:${dist[k]}%;background:${STATE_COLOR(k)}"></div>`).join('');
    const legend = states.map(k=>`<span class="vz-key"><span class="vz-sw" style="background:${STATE_COLOR(k)}"></span>${escapeHtml(STATE_NAME(k))} ${dist[k]}%</span>`).join('');
    return `<div class="sec-viz"><div class="mix-bar">${segs}</div><div class="vz-legend">${legend}</div></div>`;
  }
  // "what that state is": the brand triGlyph lit to the dominant state — the state's face.
  function stateGlyphViz(dom){ return `<div class="sec-viz sec-glyph">${triGlyph(dom)}</div>`; }
  // "your movement": a smooth safety trend line over the recent days.
  function trendArc(dayV){
    const pts = _smoothV((dayV||[]).filter(d=>d && typeof d.v==='number'));
    if(pts.length<2) return '';
    const W=320,H=84,padL=8,padR=8,top=14,bot=64;
    const maxX = Math.max.apply(null, pts.map(p=>p.x)) || 1;
    const fx = x => padL + (x/maxX)*(W-padL-padR);
    const P = pts.map(p=>`${fx(p.x).toFixed(1)},${_safeToY(p.v,top,bot).toFixed(1)}`);
    const last = pts[pts.length-1];
    return `<div class="sec-viz"><div class="vz-cap">your safety, recently</div><svg viewBox="0 0 ${W} ${H}" class="vz-svg" role="img" aria-label="your safety trend over recent days">`+
      `<line x1="${padL}" y1="${bot}" x2="${W-padR}" y2="${bot}" stroke="var(--hairline)" stroke-width="1"/>`+
      `<polyline points="${P.join(' ')}" fill="none" stroke="#C9A24B" stroke-width="2.5"/>`+
      `<polyline points="${P.join(' ')} ${fx(last.x).toFixed(1)},${bot} ${padL},${bot}" fill="#F4D58D" fill-opacity="0.14" stroke="none"/>`+
      `<circle cx="${fx(last.x).toFixed(1)}" cy="${_safeToY(last.v,top,bot).toFixed(1)}" r="3.5" fill="#C9A24B"/>`+
      `</svg></div>`;
  }
  // "the fork ahead": the person's real trajectory flowing into a split — up toward more
  // safety, down toward THEIR most-common defense state. Both equal weight: awareness, not a prediction.
  function forkViz(dayV, dom, defenseState){
    const pts = _smoothV((dayV||[]).filter(d=>d && typeof d.v==='number'));
    if(pts.length<2 || !dom) return '';
    const W=320,H=124,padL=8,top=16,bot=104;
    const maxX = Math.max.apply(null, pts.map(p=>p.x)) || 1;
    const nodeX = padL + 0.52*(W-2*padL);                       // split sits mid-canvas
    const fx = x => padL + (x/maxX)*(nodeX-padL);               // real line spans left half, into the node
    const traj = pts.map(p=>`${fx(p.x).toFixed(1)},${_safeToY(p.v,top,bot).toFixed(1)}`);
    const ny = _safeToY(pts[pts.length-1].v, top, bot);
    const upEnd = top+8, downEnd = bot-8, bx = W-8;
    const defCol = defenseState ? STATE_COLOR(defenseState) : '#A3C0DD';
    const defName = defenseState ? STATE_NAME(defenseState) : 'defense';
    return `<div class="sec-viz"><svg viewBox="0 0 ${W} ${H}" class="vz-svg" role="img" aria-label="a forking path from your current level toward more safety or toward ${escapeHtml(defName)}">`+
      `<line x1="${padL}" y1="${bot}" x2="${W-8}" y2="${bot}" stroke="var(--hairline)" stroke-width="1"/>`+
      `<polyline points="${traj.join(' ')}" fill="none" stroke="#C9A24B" stroke-width="2.5"/>`+
      `<path d="M${nodeX},${ny.toFixed(1)} C${(nodeX+60).toFixed(0)},${(ny-8).toFixed(0)} ${(bx-60)},${upEnd+8} ${bx},${upEnd}" fill="none" stroke="#9FC498" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>`+
      `<path d="M${nodeX},${ny.toFixed(1)} C${(nodeX+60).toFixed(0)},${(ny+8).toFixed(0)} ${(bx-60)},${downEnd-8} ${bx},${downEnd}" fill="none" stroke="${defCol}" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>`+
      `<circle cx="${nodeX}" cy="${ny.toFixed(1)}" r="6" fill="${STATE_COLOR(dom)}" stroke="#C9A24B" stroke-width="1.5"/>`+
      `<text x="${bx}" y="${upEnd-4}" text-anchor="end" font-size="9" fill="var(--muted)" font-family="Inter">toward more safety</text>`+
      `<text x="${bx}" y="${downEnd+13}" text-anchor="end" font-size="9" fill="var(--muted)" font-family="Inter">toward ${escapeHtml(defName)}</text>`+
      `</svg></div>`;
  }
  // route a section id to its visual (from the reader's real signals)
  function sectionViz(id, c){
    if(!c) return '';
    if(id==='blog-1' && c.dist && c.order) return stateMixBar(c.dist, c.order);
    if(id==='blog-2' && c.dom) return stateGlyphViz(c.dom);
    // fresh sections reuse the You-tab card visuals (Justin 2026-07-05): the reader
    // and the cards speak the same visual language
    if(id==='blog-pats' && c.patterns){
      const p=c.patterns;
      if(p.day) return `<div class="wk-strip" aria-hidden="true" style="margin:14px 0 4px">${['s','m','t','w','t','f','s'].map((lb,i)=>`<span class="wk-cell" style="animation-delay:${i*45}ms">${i===p.day.idx?`<span class="wk-mark">${ico('heart',{color:STATE_COLOR('safety')})}</span>`:'<span class="wk-dot"></span>'}<span class="wk-lb">${lb}</span></span>`).join('')}</div>`;
      if(p.shift) return `<div class="cb-viz cb-glyphs" aria-hidden="true" style="margin:14px 0 4px"><span class="cb-g">${stateMarks(p.shift.a)}</span><span class="cb-path" style="background:linear-gradient(90deg,${STATE_COLOR(p.shift.a)},${STATE_COLOR(p.shift.b)})"></span><span class="cb-g">${stateMarks('safety'===p.shift.b?'safety':p.shift.b)}</span></div>`;
      return '';
    }
    if(id==='blog-zoom' && c.zoomPct!=null){
      return `<div class="safety-meter" style="margin:14px 0 4px"><span class="safety-meter-fill" style="width:${c.zoomPct}%"></span></div>`;
    }
    // trend-arc (blog-3) + fork (blog-4) removed per Justin; helpers kept for possible reuse.
    return '';
  }
  // a section heading is {pre, state, post}: color just the state word in its own palette
  // color (no fragile text-matching). Falls back to a plain string for mints saved before
  // this change existed (those are frozen and will never carry the new shape).
  function renderHeading(dom, h){
    if(!h) return '';
    if(typeof h === 'string') return escapeHtml(h);
    // state-color in headings cut per Justin (2026-07-03): plain ink throughout
    return escapeHtml((h.pre||'') + (h.state||'') + (h.post||''));
  }
  // a real table of contents from the essay's own sections, replacing the old inline
  // "-> [label] ↓" jump arrows on the TL;DR bullets.
  function readerTOC(issue){
    if(!issue || !issue.sections || issue.sections.length < 2) return '';
    const rows = issue.sections.map(sec =>
      `<li><a href="#${sec.id}">${renderHeading(issue.dom, sec.heading)}</a></li>`
    ).join('');
    return `<nav aria-label="contents" style="margin-top:14px">
      <p class="sec-h" style="margin:0 0 8px">in this reflection</p>
      <ul class="read-toc">${rows}</ul>
    </nav>`;
  }

  // ---- visiting sections: Sunday week-in-review + quarter/year closes ---------
  // (Justin-approved 2026-07-04; Reader-Rework/week-in-review.md + period-sections.md.)
  // Only ever ONE visiting section at a time, in the slot between "Today, so far"
  // and the essay. Weekly shows Sunday+Monday; a closing quarter/year takes the
  // slot on the first Sun–Mon on/after the close.
  const _REGDOMS = { safety:1, play:1, stillness:1 };
  // answerable context prompt (context-prompts.md): one tappable question per
  // section, multi-select, skippable. LOCAL-ONLY for now — cloud column waits for
  // the next Supabase round (do not sync from here).
  const CTX_OPTS = ['work','family','friends','partner','hobbies','spiritual','nature','body & movement','rest','practice','something else']; // 🖊
  function _ctxLoad(){ try{ return JSON.parse(localStorage.getItem('snb-contexts'))||{}; }catch(e){ return {}; } }
  function _ctxSave(m){ try{ localStorage.setItem('snb-contexts', JSON.stringify(m)); }catch(e){} }
  function _ctxChipsHTML(q, key){
    const sel = _ctxLoad()[key]||[];
    return `<div class="wr-ctx" data-key="${escapeHtml(key)}">
      <p class="wr-ctx-q">${escapeHtml(q)}</p>
      <div class="wr-chiprow">${CTX_OPTS.map(o=>`<button type="button" class="wr-chip${sel.indexOf(o)>=0?' on':''}" data-ctx="${escapeHtml(o)}" aria-pressed="${sel.indexOf(o)>=0?'true':'false'}">${escapeHtml(o)}</button>`).join('')}</div>
    </div>`;
  }
  function _wireCtxChips(key){
    document.querySelectorAll('.wr-ctx .wr-chip').forEach(b=>{
      b.onclick = ()=>{
        const m=_ctxLoad(); const a=m[key]=(m[key]||[]); const o=b.dataset.ctx; const i=a.indexOf(o);
        if(i>=0) a.splice(i,1); else a.push(o);
        _ctxSave(m);
        // cloud sync (public.contexts) — Store handles upsert + the analytics mirror follows
        try{ if(window.Store && Store.saveContexts){ const qEl=document.querySelector('.wr-ctx-q'); Store.saveContexts(key, qEl?qEl.textContent:'', a); } }catch(e){}
        b.classList.toggle('on', i<0); b.setAttribute('aria-pressed', i<0?'true':'false');
      };
    });
  }
  function _fmtRange(a, b){
    const f = t=>new Date(t).toLocaleDateString(undefined,{month:'long',day:'numeric'});
    return f(a)+' to '+f(b);
  }
  // a dip in the middle with a comeback: >=2 consecutive defense check-ins, then safety
  function _recoverySignal(cs){
    let dipStart=-1, run=0;
    for(let i=0;i<cs.length;i++){
      if(!_REGDOMS[cs[i].dom]){ run++; if(run===2 && dipStart<0) dipStart=i-1; }
      else { if(dipStart>0) return { day:new Date(cs[i].t).toLocaleDateString(undefined,{weekday:'long'}), def:cs[dipStart].dom }; run=0; }
    }
    return null;
  }
  // practice payoff: check-ins within 3h after sessions carry more safety than the 3h before
  function _payoffSignal(cs, sess){
    if(!sess.length) return 0;
    const b=[], a=[];
    sess.forEach(s=>{ cs.forEach(c=>{ const d=c.t-s.t; if(d>0&&d<=3*36e5) a.push(c.v); else if(d<0&&d>=-3*36e5) b.push(c.v); }); });
    const avg = x=>x.reduce((p,q)=>p+q,0)/x.length;
    return (a.length>=2 && b.length>=2 && avg(a)>avg(b)+0.05) ? sess.length : 0;
  }
  // a personal quarter/year just closed (anchored to first check-in, same math as
  // mintQuarters): section shows through the first Sun–Mon window on/after the close
  function _periodVisit(now){
    const first = Store.firstCheckinT ? Store.firstCheckinT() : null; if(!first) return null;
    let end=null, idx=0;
    for(let i=1;i<=40;i++){ const e=_addMonths(first,i*3); if(e<=now){ end=e; idx=i; } else break; }
    if(!end) return null;
    const winStart = _sundayStart(end) + ((new Date(end).getDay()<=1) ? 0 : WEEK_MS);
    if(now < winStart || now >= winStart + 2*864e5) return null;
    const start = _addMonths(first,(idx-1)*3);
    const mark = (idx%4===0)?'year':'q';
    const st = Store.periodStats(start, end); if(!st) return null;
    const D28 = 28*864e5;
    const b1s = Store.periodStats(start, Math.min(start+D28,end));
    const b2s = Store.periodStats(Math.max(end-D28,start), end);
    const mn = t=>new Date(t).toLocaleDateString(undefined,{month:'long'});
    const my = t=>new Date(t).toLocaleDateString(undefined,{month:'long',year:'numeric'});
    const rangeLabel = mark==='year' ? my(start)+' to '+my(end-1) : mn(start)+' to '+mn(end-1);
    return { key:(mark==='year'?'y':'q')+new Date(start).toISOString().slice(0,10),
      ctx: { mark, n:st.n, dom:st.dom, firstDom:st.firstDom,
             b1:(b1s&&b1s.n>=8)?b1s.regShare*100:null, b2:(b2s&&b2s.n>=8)?b2s.regShare*100:null,
             rangeLabel } };
  }
  function _visitSectionHTML(sec, key){
    if(!sec) return { html:'', wire:null };
    const P=(t)=>t?`<p class="read-p">${escapeHtml(t)}</p>`:'';
    const bullets = (sec.bullets&&sec.bullets.length) ? `<ul class="wr-list">${sec.bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '';
    const chips = sec.chipQ ? _ctxChipsHTML(sec.chipQ, key) : '';
    const foot = sec.footer ? `<p class="wr-foot">${escapeHtml(sec.footer)}</p>` : '';
    const html = `
      <section class="wr" style="margin:0 0 4px">
        ${sec.eyebrow?`<p class="wr-eyeb">${escapeHtml(sec.eyebrow)}</p>`:''}
        <h2 class="read-h2">${escapeHtml(sec.heading)}</h2>
        ${sec.paras.map(P).join('')}
        ${bullets}
        ${chips}
        ${foot}
      </section>
      <hr style="border:none;border-top:0.5px solid var(--hairline);margin:18px 0 20px">`;
    return { html, wire: sec.chipQ ? ()=>_wireCtxChips(key) : null };
  }
  function buildVisitSection(){
    try{
      if(!(window.FromJustin && FromJustin.weekReview && Store.periodStats)) return { html:'', wire:null };
      const now = Date.now(), dow = new Date(now).getDay();
      const pv = _periodVisit(now);
      if(pv && FromJustin.periodSection) return _visitSectionHTML(FromJustin.periodSection(pv.ctx), pv.key);
      if(dow!==0 && dow!==1) return { html:'', wire:null };
      const ws = _sundayStart(now) - WEEK_MS, we = ws + WEEK_MS;
      const cs = Store.checkins().filter(c=>c&&typeof c.t==='number'&&c.t>=ws&&c.t<we&&c.dom&&c.dom!=='neutral').sort((a,b)=>a.t-b.t);
      if(!cs.length) return { html:'', wire:null };
      const st = Store.periodStats(ws, we), prev = Store.periodStats(ws-WEEK_MS, ws);
      let shiftDir=null;
      if(st && prev && prev.n>=3 && st.dom!==prev.dom){
        if(_REGDOMS[st.dom] && !_REGDOMS[prev.dom]) shiftDir='safety';
        else if(!_REGDOMS[st.dom] && _REGDOMS[prev.dom]) shiftDir='defense';
      }
      const rec = _recoverySignal(cs);
      const sess = (Store.sessions?Store.sessions():[]).filter(s=>s&&typeof s.t==='number'&&s.t>=ws&&s.t<we);
      const tn = Store.tenure ? Store.tenure() : null;
      const base = (tn && tn.days>=28) ? Store.periodStats(ws-28*864e5, ws) : null;
      const ctx = {
        n:cs.length, pct:st?st.domShare:null, dom:st?st.dom:null, prevDom:prev?prev.dom:null, shiftDir,
        recoveryDay:rec?rec.day:null, defenseState:rec?rec.def:null,
        practicesK:sess.length, payoffK:_payoffSignal(cs, sess),
        weekPct: st?st.regShare*100:null, basePct: (base&&base.n>=8)?base.regShare*100:null,
        rangeLabel:_fmtRange(ws, we-1)
      };
      return _visitSectionHTML(FromJustin.weekReview(ctx), 'w'+new Date(ws).toISOString().slice(0,10));
    }catch(e){ return { html:'', wire:null }; }
  }

  function screenReflectionDeep(){
    const note = FromJustin.today();
    const last = Store.lastCheckin();
    const cs   = Store.checkins();
    const paced = groupByDay(cs);
    // today block (daily altitude): the live daily reflection + the moment timeline,
    // shown above the weekly letter. From moment one.
    const td = Store.today ? Store.today() : null;
    const dailyNote = FromJustin.daily ? FromJustin.daily(td||undefined) : null;
    const todayBlock = (td && td.n>=1) ? `
      <section style="margin:0 0 4px">
        <h2 class="read-h2">Today, so far</h2>
        ${dailyNote ? `<p class="read-lead">${escapeHtml(dailyNote.text)}</p>` : ''}
        ${momentTimeline(td.moments, td.sessions)}
      </section>
      <hr style="border:none;border-top:0.5px solid var(--hairline);margin:18px 0 20px">` : '';

    // signals over the last 7 days (fall back to all check-ins)
    const wk = cs.filter(c => c.t >= Date.now() - 7*864e5);
    const base = wk.length ? wk : cs;
    let dom=null, share=null, dir=null, variance=null, streak=0;
    if(base.length){
      const freq={}; base.forEach(c=>{ freq[c.dom]=(freq[c.dom]||0)+1; });
      let bestN=-1; for(const k in freq){ if(freq[k]>bestN){ bestN=freq[k]; dom=k; } }
      share = Math.round((freq[dom]||0)/base.length*100);
    }
    if(!dom && last) dom = last.dom;
    if(cs.length>=2){ const _tr=Store.trend(); dir=_tr?_tr.dir:null; }   // null-safe: never crash the reader
    if(base.length>=3){
      const avgV=base.reduce((s,c)=>s+c.v,0)/base.length;
      const sd=Math.sqrt(base.reduce((s,c)=>s+(c.v-avgV)*(c.v-avgV),0)/base.length);
      variance = sd>0.18 ? 'shifts' : 'consistent';
    }
    if(dom && paced.length>=2){ for(let i=paced.length-1;i>=0;i--){ if(paced[i].dom===dom) streak++; else break; } }

    // essay-model signals (reader rework 2026-07-03): counts woven into sentences,
    // freeze->shutdown drift, and the dominant non-safety state for the safety essay.
    let f2s = 0; const _wkSorted = base.slice().sort((a,b)=>a.t-b.t);
    for(let i=1;i<_wkSorted.length;i++){ if(_wkSorted[i-1].dom==='freeze' && _wkSorted[i].dom==='shutdown') f2s++; }
    const _DYSD = { fightflight:1, shutdown:1, freeze:1 };
    const _defCnt = {}; cs.forEach(c=>{ if(c && _DYSD[c.dom]) _defCnt[c.dom]=(_defCnt[c.dom]||0)+1; });
    const defDom = Object.keys(_defCnt).sort((a,b)=>_defCnt[b]-_defCnt[a])[0] || null;
    // patterns: the written version of the You-tab stats (same helpers, full history).
    // each self-gates; the section only appears when >=2 signals are real.
    const patterns = (function(){
      try{
        const wdR=_weekdayPattern(cs), dpR=_daypartPattern(cs);
        const trnR=Store.transitions?Store.transitions():null;
        const recR=Store.recovery?Store.recovery():null;
        const rtR=recR?_recoveryTrend():null;
        const prR=_personalRecords(cs);
        const ceR=_contextEffect();
        const peR=ceR?_peWindowed():null;
        return {
          day:wdR, seg:dpR,
          shift:trnR?{a:trnR.a,b:trnR.b,count:trnR.count}:null,
          comeback:recR?{phrase:(recR.avg<=1.5?'a check-in or two':'about '+Math.round(recR.avg)+' check-ins'), n:recR.n, faster:!!(rtR&&rtR.dir==='faster')}:null,
          record:(prR&&prR.bestWeek)?prR.bestWeek:null,
          context:ceR?{label:ceR.label,tagPct:ceR.tagPct,typPct:ceR.typPct,peRate:peR?Math.round(peR.rate*20)*5:null}:null,
          ctxStates:_contextStateLink()
        };
      }catch(e){ return null; }
    })();
    const issue = (dom && FromJustin.blog) ? FromJustin.blog({
      dom:dom, dir:dir, count:base.length, streak:streak,
      nState:base.filter(c=>c.dom===dom).length, nTotal:base.length,
      f2s:f2s, defDom:defDom, name:((Store.getName&&Store.getName())||''),
      patterns:patterns,
      emotion:(Store.emotionPatterns?Store.emotionPatterns():null),
      rung:(Store.rungStory?Store.rungStory():null)
    }) : null;

    // per-section visuals: computed from the reader's own recent signals so each picture
    // illustrates the words of its section (mix bar, state glyph, trend line, personal fork).
    const _now = Date.now();
    const dayV = [];
    for(let i=13;i>=0;i--){ const d=new Date(_now - i*864e5); d.setHours(0,0,0,0); const a=Store.dayArc?Store.dayArc(d.getTime()):null; if(a && a.n) dayV.push({ x:(13-i), v:a.moments.reduce((s,m)=>s+m.v,0)/a.n }); }
    const _ps = Store.periodStats ? Store.periodStats(_now-7*864e5, _now) : null;
    const _base28 = Store.periodStats ? Store.periodStats(_now-28*864e5, _now) : null;
    const vizCtx = { dom:dom, dayV:dayV, dist:_ps?_ps.dist:null, order:_ps?_ps.order:null, defenseState:(_ps&&_ps.defenseStates&&_ps.defenseStates[0])||null,
                     patterns:patterns, zoomPct:(_base28&&_base28.n>=8)?Math.round(_base28.regShare*100):null };
    const P = (t)=> t ? `<p class="read-p">${escapeHtml(t)}</p>` : '';
    // the daily note now lives in the today block above; only fall back to a lead
    // paragraph when there are no moments today (todayBlock empty).
    const lead = (!todayBlock && dailyNote) ? `<p class="read-lead" style="margin:0 0 4px">${escapeHtml(dailyNote.text)}</p>` : '';

    let bodyHTML;
    if(issue){
      // dek (one-line subtitle) replaces the old "short version" bullets — the
      // TL;DR list re-fragmented exactly what the essay model fixes.
      const dekHTML = issue.dek ? `<p class="read-dek">${escapeHtml(issue.dek)}</p>` : '';
      // the closing section's landing line is the issue's most quotable sentence — set it
      // as a pull-quote (reader-beauty pass)
      const PQ = (t)=> t ? `<blockquote class="read-pq">${escapeHtml(t)}</blockquote>` : '';
      // fresh (data-driven) sections get the highlight treatment: an accent hairline in
      // the issue's state color + a quiet eyebrow, so what's NEW is scannable at a glance.
      // they're also shareable — same 1080x1080 cards as the You tab (Justin 2026-07-05)
      const _shareable = { 'blog-pats':1, 'blog-zoom':1 };
      const sectionsHTML = issue.sections.map(sec=>`
        <section${sec.fresh?` class="sec-fresh" style="margin-top:22px;--fresh-col:${STATE_COLOR(issue.dom)}"`:` style="margin-top:22px"`}>
          ${sec.fresh?'<p class="fresh-eyeb">from your check-ins · updates as you do</p>':''}
          <h3 id="${sec.id}" class="sec-h" style="margin:0 0 8px;scroll-margin-top:14px">${renderHeading(issue.dom, sec.heading)}</h3>
          ${sec.paras.map((t,i)=> (sec.id==='blog-6' && i===sec.paras.length-1) ? PQ(t) : P(t)).join('')}
          ${sectionViz(sec.id, vizCtx)}
          ${_shareable[sec.id]?`<button class="linkbtn sec-share" type="button" data-share-sec="${sec.id}">share this →</button>`:''}
        </section>`).join('');
      bodyHTML = `
        ${lead}
        ${dekHTML}
        ${readerTOC(issue)}
        ${sectionsHTML}`;
    } else {
      bodyHTML = `${lead}${P('Check in a few times, and a more personal summary will show up here.')}`;
    }

    // the visiting section (week / quarter / year) — one at a time, above the essay
    const visit = buildVisitSection();
    const hasArchive = (Store.mints && Store.mints().length > 0);
    const archiveLink = hasArchive ? `<button class="linkbtn arch-link" id="open-arch" style="margin-top:26px">past reflections →</button>` : '';
    // quiet read-time line (HIG: set expectations; a reluctant reader wants the size of the ask)
    const _rtWords = String(todayBlock+visit.html+bodyHTML).replace(/<[^>]*>/g,' ').split(/\s+/).filter(Boolean).length;
    const _rtMins = Math.max(1, Math.round(_rtWords/200));
    const _uname = (Store.getName && Store.getName()) || '';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="deep-back">back</button></header>
      <div class="scroll">
        <div class="view read" style="gap:0">
          <div class="scr-head read-head">
            <h1 class="read-h1">Your Reflections</h1>
            <p class="read-time">${_uname ? escapeHtml(_uname)+' · ' : ''}${_rtMins} min read · from your real check-ins</p>
            ${hasArchive ? `<button class="read-arch" type="button" id="open-arch-top" aria-label="past reflections"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4.4L6 21V4.5a1 1 0 0 1 1-1z"/></svg></button>` : ''}
          </div>
          ${todayBlock}
          ${visit.html}
          ${bodyHTML}
          ${archiveLink}
        </div>
      </div>`);
    $('#deep-back').onclick = ()=>app('today');
    // fresh-section share: the same image cards the You tab shares
    (function(){
      const _sig = 'stuck not broken · app.stucknotbroken.com';
      root.querySelectorAll('.sec-share').forEach(b=>b.addEventListener('click',()=>{
        const which=b.dataset.shareSec;
        if(which==='blog-pats' && patterns){
          if(patterns.day){ openShare(`${patterns.day.pct}% of my ${patterns.day.label} check-ins have safety in them. ${_sig}`, { kind:'days', idx:patterns.day.idx }); return; }
          if(patterns.shift){ openShare(`my nervous system's most common shift: ${STATE_NAME(patterns.shift.a)} to ${STATE_NAME(patterns.shift.b)}. i can see the pattern now. ${_sig}`, { kind:'path', a:patterns.shift.a, b:patterns.shift.b }); return; }
        }
        if(which==='blog-zoom' && vizCtx.zoomPct!=null){ openShare(`my safety baseline this month. ${_sig}`, { kind:'meter', pct:vizCtx.zoomPct }); return; }
      }));
    })();
    if(visit.wire) visit.wire();
    const ab = $('#open-arch'); if(ab) ab.onclick = screenArchive;
    const at = $('#open-arch-top'); if(at) at.onclick = screenArchive;
    // sections breathe in as you reach them (scoped by .read-anim so content is
    // always visible if anything here fails; reduced motion = everything static)
    try{
      const rv = root.querySelector('.view.read');
      const calm = matchMedia('(prefers-reduced-motion:reduce)').matches || document.body.classList.contains('reduce-motion');
      if(rv && !calm && 'IntersectionObserver' in window){
        rv.classList.add('read-anim');
        const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('sec-in'); io.unobserve(e.target); } }), { rootMargin:'0px 0px -8% 0px' });
        rv.querySelectorAll('section').forEach(s=>io.observe(s));
      }
    }catch(e){}
  }

  // ---- reflections archive (minted past reflections) -------------------------
  function fmtMintDate(ms){
    try{ return new Date(ms).toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' }); }
    catch(e){ return new Date(ms).toDateString(); }
  }
  // mint each closed day's daily reflection once (freeze the text — arrays cycle, so
  // recomputing would change the words). Idempotent: skips days already minted.
  function mintPastDays(){
    try{
      if(!(FromJustin.daily && Store.dayArc && Store.saveMint && Store.hasMint)) return;
      const cs = Store.checkins(); if(!cs.length) return;
      const sod = (function(){ const d=new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
      const seen = {};
      cs.forEach(c => { if(c && typeof c.t==='number'){ const d=new Date(c.t); d.setHours(0,0,0,0); const t0=d.getTime(); if(t0 < sod) seen[t0]=true; } });
      Object.keys(seen).map(Number).forEach(t0 => {
        const key = new Date(t0).toDateString();
        if(Store.hasMint('daily', key)) return;
        const ctx = Store.dayArc(t0);
        if(!ctx || ctx.n < 1) return;
        const note = FromJustin.daily(ctx);
        if(note && note.text) Store.saveMint({ tier:'daily', date:key, dateMs:t0, text:note.text });
      });
    }catch(e){}
  }
  // ---- weekly altitude: mint each closed Sunday-week's letter (the for-you reader
  // content), computed over that exact 7-day window so it's honest even on a late open.
  const WEEK_MS = 7*864e5;
  function _sundayStart(t){ const d=new Date(t); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d.getTime(); }
  // windowed equivalent of Store.weekMix() over an explicit set of in-window check-ins
  function _windowMix(cs){
    const n=cs.length; if(n<6) return null;                 // weekMix self-gates >=6; below that no secondary lines
    const cnt={}; cs.forEach(c=>cnt[c.dom]=(cnt[c.dom]||0)+1);
    const order=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
    const dom=order[0], second=order[1]||null;
    const REG={safety:1,play:1,stillness:1}, DYS={fightflight:1,shutdown:1,freeze:1};
    let reg=0; cs.forEach(c=>{ if(REG[c.dom]) reg++; });
    const regShare=reg/n, lean = regShare>=0.6?'regulated' : regShare<=0.4?'dysregulated' : 'even';
    return { n, dom, domShare:Math.round(cnt[dom]/n*100), second, secondShare: second?Math.round(cnt[second]/n*100):0,
             reg, dys:n-reg, regShare, lean, distinct:order.length, defenseStates:order.filter(d=>DYS[d]) };
  }
  function weeklyIssueFor(ws){
    if(!FromJustin.blog) return null;
    const we = ws + WEEK_MS;
    const cs = Store.checkins().filter(c=>c&&typeof c.t==='number'&&c.t>=ws&&c.t<we&&c.dom&&c.dom!=='neutral').sort((a,b)=>a.t-b.t);
    const n = cs.length;
    if(n < 3) return null;                                   // sparse week: skip minting in v1
    const freq={}; cs.forEach(c=>freq[c.dom]=(freq[c.dom]||0)+1);
    let dom=null,bestN=-1; for(const k in freq){ if(freq[k]>bestN){ bestN=freq[k]; dom=k; } }
    const share = Math.round(bestN/n*100);
    const dv = cs[n-1].v - cs[0].v; const dir = dv>0.08?'rising' : dv<-0.08?'falling' : 'steady';
    const avgV = cs.reduce((s,c)=>s+c.v,0)/n;
    const sd = Math.sqrt(cs.reduce((s,c)=>s+(c.v-avgV)*(c.v-avgV),0)/n);
    const variance = sd>0.18 ? 'shifts' : 'consistent';
    const mix = _windowMix(cs);
    // force the full-week framing (it IS a complete week) + suppress the from-now secondary
    // lines (transitions/time-of-day/recovery/payoff) with empty overrides so the snapshot
    // never borrows current data.
    // essay-model weekly snapshot: pass explicit window counts; null the live-borrowing
    // signals (pi/baseline/defDom) so a frozen week never reads current data.
    const issue = FromJustin.blog({ dom, dir, count:n, streak:0, nState:bestN, nTotal:n,
      f2s:0, defDom:null, pi:null, baseline:null, stage:'week', tenure:{stage:'week',days:7,returning:false} });
    if(!issue) return null;
    const doms = Object.keys(freq).sort((a,b)=>freq[b]-freq[a]);     // doms[0] = the week's dominant state (lights the triGlyph)
    const traj = dir==='rising' ? 'leaned toward safe' : dir==='falling' ? 'kept showing up all week' : 'stayed with it all week';
    const card = {
      dateLabel: 'week of ' + new Date(ws).toLocaleDateString(undefined,{month:'long',day:'numeric'}),
      n: n, dir: dir, traj: traj, doms: doms
    };
    const summary = issue.dek || ((issue.bullets && issue.bullets[0]) ? issue.bullets[0].text : (n + ' check-ins this week.'));
    return { issue, card, summary };
  }
  function mintWeeks(){
    try{
      if(!(FromJustin.blog && Store.saveMint && Store.hasMint)) return;
      const cs = Store.checkins(); if(!cs.length) return;
      let firstT = Infinity; cs.forEach(c=>{ if(c&&typeof c.t==='number'&&c.t<firstT) firstT=c.t; });
      if(!isFinite(firstT)) return;
      const thisWeek = _sundayStart(Date.now());
      for(let ws = _sundayStart(firstT); ws < thisWeek; ws += WEEK_MS){
        const key = 'w' + new Date(ws).toISOString().slice(0,10);
        if(Store.hasMint('weekly', key)) continue;
        const built = weeklyIssueFor(ws);
        if(!built) continue;
        Store.saveMint({ tier:'weekly', date:key, dateMs:ws, text:built.summary, data:{ issue:built.issue, card:built.card } });
      }
    }catch(e){}
  }

  // ---- monthly + quarterly minting (long-range altitudes) --------------------
  function _monthStart(t){ const d=new Date(t); d.setHours(0,0,0,0); d.setDate(1); return d.getTime(); }
  function _addMonths(t, n){ const d=new Date(t); d.setDate(1); d.setMonth(d.getMonth()+n); return d.getTime(); }
  function mintMonths(){
    try{
      if(!(FromJustin.monthly && Store.periodStats && Store.saveMint && Store.hasMint)) return;
      const first = Store.firstCheckinT ? Store.firstCheckinT() : null; if(!first) return;
      const thisMonth = _monthStart(Date.now());
      for(let ms = _monthStart(first); ms < thisMonth; ){
        const me = _addMonths(ms, 1);
        const key = 'm' + new Date(ms).toISOString().slice(0,7);
        if(!Store.hasMint('monthly', key)){
          const st = Store.periodStats(ms, me);
          if(st && st.n>=8){
            const note = FromJustin.monthly({ stats:st, baseline:Store.baselineDelta(ms,me), recovery:(Store.recovery?Store.recovery():null),
              emotion:(Store.emotionPatterns?Store.emotionPatterns(ms,me):null), movement:(Store.rungMovement?Store.rungMovement(ms,me):null) });
            if(note && note.text){
              const label = new Date(ms).toLocaleDateString(undefined,{ month:'long', year:'numeric' });
              Store.saveMint({ tier:'monthly', date:key, dateMs:ms, text:note.text, data:{ label } });
            }
          }
        }
        ms = me;
      }
    }catch(e){}
  }
  function mintQuarters(){
    try{
      if(!(FromJustin.quarterly && Store.periodStats && Store.saveMint && Store.hasMint)) return;
      const first = Store.firstCheckinT ? Store.firstCheckinT() : null; if(!first) return;
      const now = Date.now();
      for(let q=1; q<=40; q++){
        const start = _addMonths(first, (q-1)*3), end = _addMonths(first, q*3);
        if(end > now) break;
        const key = 'q' + q + '-' + new Date(start).toISOString().slice(0,10);
        if(Store.hasMint('quarterly', key)) continue;
        const st = Store.periodStats(start, end);
        if(!st || st.n<12) continue;
        const mark = (q%4===0)?'year' : (q%4===2)?'half' : 'q';
        const note = FromJustin.quarterly({ stats:st, baseline:Store.baselineDelta(start,end), recovery:(Store.recovery?Store.recovery():null), mark:mark,
          emotion:(Store.emotionPatterns?Store.emotionPatterns(start,end):null), movement:(Store.rungMovement?Store.rungMovement(start,end):null) });
        if(note && note.text){
          const lead = mark==='year'?'a year' : mark==='half'?'6 months' : 'a quarter';
          const label = lead + ' to ' + new Date(end-1).toLocaleDateString(undefined,{ month:'long', day:'numeric', year:'numeric' });
          Store.saveMint({ tier:'quarterly', date:key, dateMs:start, text:note.text, data:{ label, mark } });
        }
      }
    }catch(e){}
  }

  // the guardrailed share card: the user's name + their personal triGlyph (the brand
  // logo) lit to the week's dominant state. Proud = showing-up + trajectory, never a ranking.
  function _cardLine(card){
    const name = (Store.getName && Store.getName()) || '';
    return (name ? 'Checked' : 'I checked') + ' in ' + card.n + ' times this week, and ' + (card.traj || 'stayed with it all week') + '.';
  }
  // solid-fill triGlyph (explicit fills, no CSS) for rasterizing into the share image
  function triGlyphSolid(key, dimCol){
    const col = STATE_COLOR(key), I = window.SNB_ICONS || {};
    const active = (STATE_AXES[key]||[]).map(a=>a[0]);
    const paths = TRI_ORDER.map(m=>`<path d="${(I[m]&&I[m].d)||''}" fill="${active.indexOf(m)>=0?col:dimCol}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${TRI_VB}">${paths}</svg>`;
  }
  // week win card (Justin, 2026-07-05): the mint entry's celebration moment, in
  // the wincard family (bone paper + hairline border) instead of the old dark
  // preview. The dark branded card still exists as the SHARED canvas image.
  function weekWinCardHTML(card){
    const name = (Store.getName && Store.getName()) || '';
    const dom = (card.doms && card.doms[0]) || 'safety';
    return `<div class="week-win">
      <button class="panel-share ww-share" type="button" id="me-share" aria-label="share this week"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14V4"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M5 12v7h14v-7"/></svg></button>
      <p class="ww-eyeb">${escapeHtml(String(card.dateLabel||'').toUpperCase())}</p>
      <p class="ww-line">${escapeHtml(_cardLine(card))}</p>
      <div class="ww-foot">${triGlyph(dom)}${name?`<span class="ww-name">${escapeHtml(name)}</span>`:''}</div>
    </div>`;
  }
  function _wrapText(g, text, x, y, maxW, lh){ const words=String(text).split(' '); let line='', yy=y; for(const w of words){ const test=line?line+' '+w:w; if(g.measureText(test).width>maxW && line){ g.fillText(line,x,yy); line=w; yy+=lh; } else line=test; } if(line) g.fillText(line,x,yy); return yy; }
  async function shareWeekCard(card){
    try{
      const W=1080, H=1080, PAD=96, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
      const g=cv.getContext('2d'); g.fillStyle='#1A1F2A'; g.fillRect(0,0,W,H); g.textBaseline='top';
      g.fillStyle='#B9B09A'; g.font='500 30px Inter, sans-serif'; g.fillText(String(card.dateLabel||'').toUpperCase(), PAD, 300);
      // the quote line, large, up top
      g.fillStyle='#F4F1E8'; g.font='500 66px Inter, sans-serif'; _wrapText(g, _cardLine(card), PAD, 372, W-PAD*2, 88);
      // attribution at the bottom: the personal triGlyph (lit to the week's dominant state) + name
      const dom = (card.doms && card.doms[0]) || 'safety';
      const vb = String(TRI_VB).split(/\s+/).map(Number); const aspect = (vb[2]||1)/(vb[3]||1);
      const gw = 210, gh = gw/aspect, by = H - 150 - gh;
      try{
        const svg = triGlyphSolid(dom, '#565961');
        const img = new Image();
        await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); });
        g.drawImage(img, PAD, by, gw, gh);
      }catch(_){}
      const name = (Store.getName && Store.getName()) || '';
      if(name){ g.fillStyle='#F4F1E8'; g.font='500 44px Inter, sans-serif'; g.fillText(name, PAD + gw + 26, by + gh/2 - 26); }
      g.fillStyle='#B9B09A'; g.font='400 30px Inter, sans-serif'; g.textAlign='right'; g.fillText('stuck not broken', W-PAD, by + gh/2 - 16); g.textAlign='left';
      const blob = await new Promise(res=>cv.toBlob(res,'image/png'));
      if(!blob) throw new Error('no blob');
      const file = new File([blob], 'snb-week.png', { type:'image/png' });
      if(navigator.canShare && navigator.canShare({ files:[file] }) && navigator.share){
        await navigator.share({ files:[file], text: _cardLine(card) });
      } else {
        const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='snb-week.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1500);
      }
    }catch(e){ /* user cancelled or unsupported — no-op */ }
  }
  // render a frozen weekly issue (short version + sections) like the live for-you reader
  function renderIssue(issue){
    const P=(t)=> t?`<p class="read-p">${escapeHtml(t)}</p>`:'';
    const PQ=(t)=> t?`<blockquote class="read-pq">${escapeHtml(t)}</blockquote>`:'';
    const sectionsHTML = (issue.sections||[]).map(sec=>`<section style="margin-top:22px"><h3 id="${sec.id}" class="sec-h" style="margin:0 0 8px;scroll-margin-top:14px">${renderHeading(issue.dom, sec.heading)}</h3>${(sec.paras||[]).map((t,i)=>(sec.id==='blog-6'&&i===(sec.paras.length-1))?PQ(t):P(t)).join('')}</section>`).join('');
    // new essay issues carry a dek; frozen pre-rework mints still carry bullets
    const headHTML = issue.dek
      ? `<p class="read-dek">${escapeHtml(issue.dek)}</p>`
      : `<div style="margin-top:14px"><p class="sec-h" style="margin:0 0 10px">the short version</p><ul style="margin:0;padding-left:18px">${(issue.bullets||[]).map(b=>`<li style="margin:0 0 8px;line-height:1.55;color:var(--ink-80);font-size:calc(15px * var(--type-scale))">${escapeHtml(b.text)}</li>`).join('')}</ul></div>`;
    return `${headHTML}${readerTOC(issue)}${sectionsHTML}`;
  }

  // Past Reflections — wabi-sabi shelf (Justin, 2026-07-04). The shelf is always
  // COMPUTED from today's date, never from what was last seen, so nothing piles up
  // even after a year away: this week's dailies, this quarter's weeklies+monthlies,
  // one remaining week from the last quarter (why-line under it), the last 3
  // quarterlies, and the latest annual. Mints are never deleted — the shelf just
  // shows less (render-level prune, data intact).
  function _archRow(m, extraClass, sub){
    const tierLabel = { weekly:'weekly', monthly:'monthly', quarterly:'quarterly' }[m.tier] || '';
    const label = (m.tier==='weekly') ? ((m.data&&m.data.card&&m.data.card.dateLabel) || fmtMintDate(m.dateMs))
                : (m.data&&m.data.label) ? m.data.label : fmtMintDate(m.dateMs);
    const tag = tierLabel ? `<span class="arch-tag">${tierLabel}</span>` : '';
    // mock-parity (Justin's QA): weekly/monthly/quarterly rows are label-only —
    // the date IS the information; only dailies keep a one-line memory cue
    const snip = (sub || m.tier!=='daily') ? '' : String(m.text||'').split('. ')[0];
    const body = sub ? `<span class="arch-sub">${escapeHtml(sub)}</span>` : (snip ? `<span class="arch-snip">${escapeHtml(snip)}.</span>` : '');
    return `<button class="arch-row${extraClass?' '+extraClass:''}" data-id="${escapeHtml(m.id)}" data-ms="${m.dateMs}"><span class="arch-row-main"><span class="arch-date">${escapeHtml(label)}${tag}</span>${body}</span><span class="wc-go">${CHEV}</span></button>`;
  }
  function screenArchive(){
    const all = Store.mints ? Store.mints() : [];   // sorted newest-first
    const now = Date.now();
    const first = Store.firstCheckinT ? Store.firstCheckinT() : null;
    let closedQ = 0;
    if(first){ for(let i=1;i<=40;i++){ if(_addMonths(first,i*3)<=now) closedQ=i; else break; } }
    const curQStart  = first ? _addMonths(first, closedQ*3) : 0;
    const prevQStart = (first && closedQ>0) ? _addMonths(first,(closedQ-1)*3) : null;
    const weekStart  = _sundayStart(now);

    // pinned week: the best week of the last closed quarter simply remains — no
    // stamp, no "kept" label; the sub-line says why it's still here. 🖊
    let pinned=null, pinnedSub='';
    if(prevQStart!=null){
      let best=-1;
      all.forEach(m=>{
        if(m.tier!=='weekly' || m.dateMs<prevQStart || m.dateMs>=curQStart) return;
        const st = Store.periodStats(m.dateMs, m.dateMs+WEEK_MS);
        const share = st?st.regShare:0;
        if(share>best){ best=share; pinned=m; }
      });
      if(pinned){
        const qst = Store.periodStats(prevQStart, curQStart);
        pinnedSub = (qst && qst.lean==='dysregulated') ? 'the week you found your way back' : 'the most safety of your quarter';
      }
    }
    const dailies    = all.filter(m=>m.tier==='daily'   && m.dateMs>=weekStart);
    const currents   = all.filter(m=>(m.tier==='weekly'||m.tier==='monthly') && m.dateMs>=curQStart);
    const qAll       = all.filter(m=>m.tier==='quarterly' && !(m.data&&m.data.mark==='year'));
    const quarterlies= qAll.slice(0,3);
    const annual     = all.find(m=>m.tier==='quarterly' && m.data && m.data.mark==='year') || null;

    // quarter turn since last visit? caption always; animation only for exactly one
    // turn (away longer = no theater, the shelf simply is its current state), and
    // never under calm/reduced motion. HIG: the caption does the explaining, the
    // motion is garnish. Arrival before departure: the quarterly settles in first.
    const qKey = String(curQStart||0);
    let seen=null; try{ seen=localStorage.getItem('snb-arch-q'); }catch(e){}
    const turned  = seen!=null && seen!==qKey && closedQ>0;
    const oneTurn = turned && prevQStart!=null && seen===String(prevQStart);
    const calm = matchMedia('(prefers-reduced-motion:reduce)').matches || document.body.classList.contains('reduce-motion');
    const animate = oneTurn && !calm;
    try{ localStorage.setItem('snb-arch-q', qKey); }catch(e){}

    // ghosts: the just-expired rows, shown once and folded away (only while animating)
    let ghosts=[], arriving=null, dropQ=null;
    if(animate){
      ghosts = all.filter(m=>(m.tier==='weekly'||m.tier==='monthly') && m.dateMs>=prevQStart && m.dateMs<curQStart && (!pinned || m.id!==pinned.id));
      arriving = quarterlies.find(m=>m.dateMs>=prevQStart) || null;
      dropQ = qAll[3] || null;
    }
    const caption = turned ? `<p class="arch-note">this quarter has closed into a single reflection</p>` : ''; // 🖊
    const EYEB = t=>`<p class="arch-eyeb">${t}</p>`;
    const G = m=>_archRow(m,'arch-ghost');
    const ghostsHTML = ghosts.sort((a,b)=>b.dateMs-a.dateMs).map(G).join('');
    const parts = [];
    if(dailies.length)  parts.push(EYEB('this week') + dailies.map(m=>_archRow(m)).join(''));
    if(currents.length || ghosts.length) parts.push(EYEB('this quarter') + currents.map(m=>_archRow(m)).join('') + ghostsHTML);
    if(pinned || quarterlies.length || dropQ){
      parts.push(EYEB('quarters')
        + (pinned ? _archRow(pinned,'',pinnedSub) : '')
        + quarterlies.map(m=>_archRow(m, (arriving&&m.id===arriving.id)?'arch-in':'')).join('')
        + (dropQ ? _archRow(dropQ,'arch-ghost') : ''));
    }
    if(annual) parts.push(EYEB('your year') + _archRow(annual));
    const rows = parts.length ? parts.join('')
      : `<p style="font-size:calc(15px * var(--type-scale));line-height:1.6;color:var(--muted);margin:8px 0 0">your reflections will collect here as each day and week closes.</p>`;
    setHTML(`
      <header class="appbar"><button class="backbtn" id="arch-back">back</button></header>
      <div class="scroll">
        <div class="view read" style="gap:0">
          <h1 class="read-h1">Past Reflections</h1>
          ${caption}
          ${rows}
        </div>
      </div>`);
    $('#arch-back').onclick = screenReflectionDeep;
    document.querySelectorAll('.arch-row').forEach(b => b.onclick = ()=>screenMintedEntry(b.dataset.id));
    if(animate){
      try{
        const inEl = arriving ? root.querySelector('.arch-in') : null;
        if(inEl) requestAnimationFrame(()=>{ inEl.style.maxHeight = Math.max(inEl.scrollHeight,90)+'px'; inEl.classList.add('here'); });
        const gs = Array.prototype.slice.call(root.querySelectorAll('.arch-ghost'))
          .sort((a,b)=>(+a.dataset.ms)-(+b.dataset.ms));           // oldest fades first
        gs.forEach((el,i)=>{
          setTimeout(()=>el.classList.add('gone'), (inEl?1500:400) + i*350);
          setTimeout(()=>{ el.style.maxHeight = el.scrollHeight+'px'; requestAnimationFrame(()=>el.classList.add('fold')); }, (inEl?1500:400) + i*350 + 1500);
        });
      }catch(e){}
    }
  }
  function screenMintedEntry(id){
    const m = (Store.mints ? Store.mints() : []).find(x => x.id===id);
    if(!m) return screenArchive();
    if(m.tier==='weekly' && m.data && m.data.issue){
      const card = m.data.card || {};
      setHTML(`
        <header class="appbar"><button class="backbtn" id="me-back">back</button></header>
        <div class="scroll">
          <div class="view read" style="gap:0">
            ${weekWinCardHTML(card)}
            ${renderIssue(m.data.issue)}
          </div>
        </div>`);
      $('#me-back').onclick = screenArchive;
      const sb = $('#me-share'); if(sb) sb.onclick = ()=>shareWeekCard(card);
      return;
    }
    if(m.tier==='monthly' || m.tier==='quarterly'){
      const label = (m.data && m.data.label) || fmtMintDate(m.dateMs);
      setHTML(`
        <header class="appbar"><button class="backbtn" id="me-back">back</button></header>
        <div class="scroll">
          <div class="view read" style="gap:0">
            <p class="read-date">${escapeHtml(label)}</p>
            <p style="font-size:calc(16px * var(--type-scale));line-height:1.7;color:var(--ink-80);text-wrap:pretty;margin:0">${escapeHtml(m.text)}</p>
          </div>
        </div>`);
      $('#me-back').onclick = screenArchive;
      return;
    }
    const ctx = Store.dayArc ? Store.dayArc(m.dateMs) : null;
    const tl = (ctx && ctx.n >= 1) ? momentTimeline(ctx.moments, ctx.sessions) : '';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="me-back">back</button></header>
      <div class="scroll">
        <div class="view read" style="gap:0">
          <p class="read-date">${escapeHtml(fmtMintDate(m.dateMs))}</p>
          <p style="font-size:calc(16px * var(--type-scale));line-height:1.65;color:var(--ink-80);text-wrap:pretty;margin:0 0 16px">${escapeHtml(m.text)}</p>
          ${tl}
        </div>
      </div>`);
    $('#me-back').onclick = screenArchive;
  }

  // (recoCardHTML / wireReco / trendHTML — old today-card renderers — were dead
  // code with no callers; removed in the 2026-07-02 housekeeping pass.)

// ---------------------------------------------------------------- CHECK-IN
  // Challenge appetite levels for the check-in (mirror Store.CHALLENGE_LEVELS), each
  // with a one-line read of what choosing it means.
  const CH_LEVELS = (window.Store && Store.CHALLENGE_LEVELS) || [
    { v:0.12, key:'settle',  label:'just settle' },
    { v:0.40, key:'gentle',  label:'gently' },
    { v:0.65, key:'meet',    label:'meet me' },
    { v:0.90, key:'stretch', label:'stretch me' },
  ];
  const CH_CAP = {
    settle:  'just connecting to the external present moment and your natural breath. no pressure. just presence.',
    gentle:  "simple mindfulness but taken a step further through connecting with safety in your body if it's there.",
    meet:    'anchor into safety, then use beginner skills to gently connect with defense.',
    stretch: 'anchor into safety, then use advanced skills to connect with defense at a deeper level. more potential for self-regulation, but more challenge. only approach this with a strong safety baseline.',
  };
  // short labels for the segmented control (the nuance lives in the caption below)
  const CH_SHORT = { settle:'simple mindfulness', gentle:'safety-focused', meet:'beginner defense', stretch:'advanced defense' };

  let _snackT=null;
  function actionSnack(msg, label, fn){
    let s=document.getElementById('action-snack'); if(s) s.remove();
    s=document.createElement('div'); s.id='action-snack'; s.className='update-toast';
    const sp=document.createElement('span'); sp.textContent=msg;
    const b=document.createElement('button'); b.type='button'; b.textContent=label;
    s.appendChild(sp); s.appendChild(b); document.body.appendChild(s);
    requestAnimationFrame(()=>s.classList.add('on'));
    const close=()=>{ s.classList.remove('on'); setTimeout(()=>{ if(s.parentNode) s.remove(); }, 260); };
    b.onclick=()=>{ close(); fn&&fn(); };
    clearTimeout(_snackT); _snackT=setTimeout(close, 6000);
  }
  // change a recent check-in: pick from the last few, then edit it in place
  function screenChangeCheckin(){
    const recent = Store.checkins().slice(-6).reverse();
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    const rows = recent.length ? recent.map((c,i)=>`<div class="ci-row"><button class="change-row ci-edit" data-i="${i}" type="button"><span class="change-when">${relTime(c.t)}</span><span class="change-mark">${stateMarks(c.dom)}<span class="change-state">${STATE_NAME(c.dom)}</span></span><span class="wc-go">${CHEV}</span></button><button class="pr-del ci-del" data-t="${c.t}" type="button">remove</button></div>`).join('') : '<p class="panel-empty">no check-ins to change yet.</p>';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="cc-back">back</button></header>
      <div class="scroll"><div class="view" style="gap:14px">
        <div class="scr-head"><p class="eyebrow"></p><h2 class="scr-h">change a check-in</h2></div>
        <p class="map-sub" style="margin:0">tap a recent check-in to adjust it, or remove one you didn't mean to keep.</p>
        <div class="change-list">${rows}</div>
      </div></div>`);
    $('#cc-back').onclick=()=>app('current');
    root.querySelectorAll('.ci-edit').forEach(b=>b.onclick=()=>screenCheckin(recent[+b.dataset.i]));
    root.querySelectorAll('.ci-del').forEach(b=>b.onclick=()=>{
      const t = +b.dataset.t;
      if(confirm('Remove this check-in? This cannot be undone.')){
        Store.deleteCheckin(t); haptic('save'); FromJustin.refresh(); screenChangeCheckin();
      }
    });
  }

  // manage logged practices: remove a session you didn't mean to keep (e.g. a test run)
  function _fbShort(k){ return ({ more:'felt more present', same:'about the same', less:'less connected', struggle:'struggled', unsure:'not sure',
    'exit-hard':'too hard right now', 'exit-easy':'too easy', 'exit-distracted':'got pulled away', 'exit-enough':'got what they needed' })[k] || ''; }
  function screenManagePractices(){
    const recent = Store.sessions().slice(-8).reverse();
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    const rows = recent.length
      ? recent.map(s => {
          const fb = s.feedback ? ` · ${escapeHtml(_fbShort(s.feedback))}` : '';
          const ended = (s.completed===false || s.endedEarly) ? ' · ended early' : '';
          return `<div class="pr-row"><span class="pr-main"><span class="change-when">${relTime(s.t)}</span><span class="pr-label">${escapeHtml(Store.practiceLabel(s.practiceKey))}${fb}${ended}</span></span><button class="pr-del" data-t="${s.t}" type="button">remove</button></div>`;
        }).join('')
      : '<p class="panel-empty">no practices to manage yet.</p>';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="mp-back">back</button></header>
      <div class="scroll"><div class="view" style="gap:14px">
        <div class="scr-head"><p class="eyebrow"></p><h2 class="scr-h">manage your practices</h2></div>
        <p class="map-sub" style="margin:0">remove a logged practice you didn't mean to keep, like a test. this can't be undone.</p>
        <div class="change-list">${rows}</div>
      </div></div>`);
    $('#mp-back').onclick=()=>app('current');
    root.querySelectorAll('.pr-del').forEach(b=>b.onclick=()=>{
      const t = +b.dataset.t;
      if(confirm('Remove this practice? This cannot be undone.')){
        Store.deleteSession(t); haptic('save'); screenManagePractices();
      }
    });
  }
  function screenCheckin(editRec){
    if(editRec && typeof editRec.t!=='number') editRec = null;   // the today-card onclick passes its click EVENT as editRec; an event is not a check-in to edit -> start a fresh check-in (fixes "change your check-in" / "NaNd ago" / silent no-save)
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    root.innerHTML = `
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));

    // fresh check-ins start with every slider at the midpoint (Justin 2026-07-05):
    // symmetric, no suggested answer — the old defaults quietly encoded a state
    let v=50, s=50, d=50;
    // challenge: null = "whatever you recommend" (the default — no one should feel
    // trapped into picking a level; the recommender uses their learned appetite)
    let ch=null;
    if(editRec){ v=Math.round((editRec.v||0)*100); s=Math.round((editRec.sym||0)*100); d=Math.round((editRec.dor||0)*100); if(typeof editRec.challenge==='number') ch=editRec.challenge; }
    // scenarios: on edit, restore the questions that were actually answered; else roll fresh
    const qIdx = (editRec && ciLoadQ(editRec.t)) || { v:ciRand('v',-1), sym:ciRand('sym',-1), dor:ciRand('dor',-1) };
    const seg = segPoss(segOf(editRec?editRec.t:Date.now()));
    // first-week cadence hint (Beth's day-1 question, 2026-07-05): answers "how
    // often should i check in?" right where the question arises, then retires. 🖊
    let _yng=false; try{ const _tn=Store.tenure(); _yng=!editRec && (!_tn || (_tn.days||0)<=7); }catch(e){}
    // "{name}'s {time} check-in", counting returns within the same daypart
    // ("sam's 2nd afternoon check-in") — the eyebrow becomes theirs
    const _ciEyebrow = (function(){
      if(editRec) return `changing ${fmtDay(editRec.t)} · ${fmtTime(editRec.t)}`;
      const who = (Store.getName && Store.getName()) ? Store.getName()+"'s" : 'your';
      const nth = Store.checkins().filter(c=>sameDay(c.t)&&segOf(c.t)===segOf(Date.now())).length + 1;
      const ord = nth===2?'2nd ':nth===3?'3rd ':nth>3?nth+'th ':'';
      return `${who} ${ord}${seg} check-in`;
    })();
    // per-check-in context (2026-07-06 v3): two tabs, "i've had more of" / "i've had
    // less of", each an independent set of tags. keyed 'c'+t+'+' and 'c'+t+'-' so each
    // check-in carries two context signals tied to the state it was felt in — powers
    // downstream attribution ("more of X correlated with better regulation", "less of Y
    // correlated with more shutdown"). synced through Store.saveContexts -> public.contexts
    // -> analytics mirror path (no schema change; just varies period_key).
    // legacy 'c'+t rows (pre-v3) alias to "more of" on read; fresh check-ins start untagged.
    const _ctxAll_e = editRec ? _ctxLoad() : {};
    const _legacyC  = editRec ? (_ctxAll_e['c'+editRec.t]||null) : null;
    const ctxSelMore = new Set(editRec ? (_ctxAll_e['c'+editRec.t+'+'] || _legacyC || []) : []);
    const ctxSelLess = new Set(editRec ? (_ctxAll_e['c'+editRec.t+'-'] || []) : []);
    let ctxDir = 'more';   // active tab
    $('#content').innerHTML = `<div class="view checkin2">

        <div class="scr-head">
          <p class="eyebrow">${escapeHtml(_ciEyebrow)}</p>
          <h2 class="scr-h">right now, how easy would it be to&hellip;</h2>
        </div>

        <div class="ci-block">
          <div class="sliders">
            ${sliderHTML('v', CI_BANK.v[qIdx.v], 'r-v', v)}
            ${sliderHTML('sym', CI_BANK.sym[qIdx.sym], 'r-sym', 100-s)}
            ${sliderHTML('dor', CI_BANK.dor[qIdx.dor], 'r-dor', 100-d)}
          </div>
          <button class="ci-shuffle" id="ci-shuffle" type="button">ask me differently</button>
          <p class="ci-readout" id="ci-readout"></p>
          ${_yng?'<p class="fineprint" style="margin-top:10px">check in whenever you like — when you’re off, when you’re good, any part of day. every check-in teaches the app your system.</p>':''}
          <div class="ci-ovr">
            <button class="set-quiet ci-ovr-link" id="ci-ovr-link" type="button">know your states? set it yourself</button>
            <div class="ci-ovr-panel" id="ci-ovr-panel" hidden>
              <p class="ci-ovr-note">choosing a state moves the sliders to match it — fine-tune from there if it's close but not quite.</p>
              <div class="ci-ovr-chips">
                ${['safety','play','fightflight','stillness','freeze','shutdown'].map(k=>`<button class="ch-opt ci-ovr-opt" type="button" data-ovr="${k}">${stateMarks(k)}<span>${STATE_NAME(k)}</span></button>`).join('')}
              </div>
              <p class="ci-ovr-about" id="ci-ovr-about"></p>
            </div>
          </div>
        </div>

        ${(function(){
          // progressive disclosure (2026-07-05): sliders + save IS a complete
          // check-in. the two optional asks fold into quiet one-row links —
          // the screen's hierarchy now tells the truth about what's required.
          // context sits directly above save (Justin 2026-07-05). no readouts
          // on the collapsed rows (Justin 2026-07-05): the opened panel's
          // highlighted option is the state.
          return `
        <div class="ci-block ci-challenge ci-fold" id="fold-ch">
          <button class="ci-fold-btn" id="fold-ch-btn" type="button" aria-expanded="false" aria-controls="fold-ch-body">
            <span class="ci-fold-lk">choose your next practice</span><span class="stats-tog-icon">+</span>
          </button>
          <div class="stats-body" id="fold-ch-body">
            <button class="ch-opt ch-auto${ch==null?' on':''}" id="ch-auto" type="button">whatever you recommend</button>
            <div class="ch-seg" id="ch-seg">
              ${CH_LEVELS.map(l=>`<button class="ch-opt${l.v===ch?' on':''}" type="button" data-ch="${l.v}" data-chkey="${l.key}">${CH_SHORT[l.key]||l.label}</button>`).join('')}
            </div>
            <p class="ch-cap" id="ch-cap"></p>
          </div>
        </div>

        <div class="ci-block ci-challenge ci-ctx ci-fold" id="fold-ctx">
          <button class="ci-fold-btn" id="fold-ctx-btn" type="button" aria-expanded="false" aria-controls="fold-ctx-body">
            <span class="ci-fold-lk">add context to this check-in</span><span class="stats-tog-icon">+</span>
          </button>
          <div class="stats-body" id="fold-ctx-body">
            <div class="set-seg ci-ctx-seg" role="tablist" aria-label="context direction">
              <button type="button" class="on" data-ctxdir="more" role="tab" aria-selected="true">i've had more of</button>
              <button type="button" data-ctxdir="less" role="tab" aria-selected="false">i've had less of</button>
            </div>
            <div class="wr-chiprow ci-ctx-row" id="ci-ctx-row-more" role="tabpanel">${CTX_OPTS.map(o=>`<button type="button" class="wr-chip${ctxSelMore.has(o)?' on':''}" data-ctx="${escapeHtml(o)}" data-ctxdir="more" aria-pressed="${ctxSelMore.has(o)?'true':'false'}">${escapeHtml(o)}</button>`).join('')}</div>
            <div class="wr-chiprow ci-ctx-row" id="ci-ctx-row-less" role="tabpanel" hidden>${CTX_OPTS.map(o=>`<button type="button" class="wr-chip${ctxSelLess.has(o)?' on':''}" data-ctx="${escapeHtml(o)}" data-ctxdir="less" aria-pressed="${ctxSelLess.has(o)?'true':'false'}">${escapeHtml(o)}</button>`).join('')}</div>
            <p class="ch-cap ci-ctx-cap">helps track what's adding to — or taking from — the states you feel over time. shows up later in your patterns.</p>
          </div>
        </div>`;
        })()}

        <div class="actionbar"><button class="btn block" id="save">${editRec?'save changes':'save check-in'}</button></div>
      </div>`;

    const readout = $('#ci-readout');
    // fresh check-ins start neutral (Justin 2026-07-05): rails sit in ink and the
    // mirror stays quiet until a slider actually moves — color and words respond
    // to what the person SET, never to defaults. edits show everything at once.
    const axTouched = editRec ? { v:1, sym:1, dor:1 } : {};
    function refresh(){
      setIcoLvl('v',v); setIcoLvl('sym',s); setIcoLvl('dor',d);
      const dom = window.PVCurrent.dominantOf(v/100, s/100, d/100);
      // tint the sliders to the current state: a blend colors only its active axes.
      // the blend tint only applies once ALL THREE are set — a dominant computed
      // from untouched midpoints isn't a real read, so partial input shows each
      // axis its own color. untouched rails sit in faded ink: present, not "done".
      const core = STATE_CORE[dom.key] || [];
      const own = AXIS_OWN();
      const allTouched = axTouched.v && axTouched.sym && axTouched.dor;
      ['v','sym','dor'].forEach(ax=>{ const el=$('#sl-'+ax); if(!el) return;
        const active = allTouched && core.length>1 && core.includes(ax);
        el.style.setProperty('--rail', axTouched[ax] ? (active ? STATE_COLOR(dom.key) : own[ax]) : 'var(--ink-faded)'); });
      if(readout){
        const anyTouched = axTouched.v||axTouched.sym||axTouched.dor;
        readout.textContent = anyTouched ? ciMirror(v/100, s/100, d/100)
          : 'move the sliders, and this line will mirror what you set.';   // 🖊
        readout.classList.toggle('ci-readout-idle', !anyTouched);
      }
    }
    // sliders read ease (right = easier): heart ease IS connection; bolt/x ease invert
    bindSlider('v', val=>{v=val;axTouched.v=1;refresh();});
    bindSlider('sym', val=>{s=100-val;axTouched.sym=1;refresh();});
    bindSlider('dor', val=>{d=100-val;axTouched.dor=1;refresh();});
    refresh();
    $('#ci-shuffle').onclick = ()=>{
      ['v','sym','dor'].forEach(ax=>{
        qIdx[ax] = ciRand(ax, qIdx[ax]);
        const q = root.querySelector('#q-'+ax); if(q) q.textContent = CI_BANK[ax][qIdx[ax]];
        const sl = $('#sl-'+ax); if(sl) sl.setAttribute('aria-label','how easy would it be to '+CI_BANK[ax][qIdx[ax]]);
      });
    };
    // "know your states" (reworked 2026-07-06, Justin): picking a state MOVES
    // the sliders to that state's shape, animated in real time — the sliders
    // stay the single source of truth, the saved label always derives from the
    // answers (no label-only override, nothing to discard, safety % and state
    // mix can never disagree), and fine-tuning from there is the natural next
    // step. the teaching copy (STATE_DETAIL.about) still appears in place.
    const STATE_AXES={ safety:[.85,.15,.15], play:[.75,.75,.15], fightflight:[.15,.85,.15],
                       stillness:[.75,.15,.75], freeze:[.15,.8,.8], shutdown:[.15,.15,.85] };
    let _ovrAnim=null;
    function _slideTo(tv,ts,td){
      cancelAnimationFrame(_ovrAnim);
      const f={v:v,s:s,d:d};
      const calm=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion:reduce)').matches;
      axTouched.v=1; axTouched.sym=1; axTouched.dor=1;
      const apply=(nv,ns,nd)=>{ v=nv; s=ns; d=nd;
        const ev=$('#sl-v'), es=$('#sl-sym'), ed=$('#sl-dor');
        if(ev) ev.value=Math.round(v); if(es) es.value=Math.round(100-s); if(ed) ed.value=Math.round(100-d);
        refresh(); };
      if(calm){ apply(tv,ts,td); return; }
      const t0=performance.now(), dur=650, easeFn=x=>1-Math.pow(1-x,3);
      const step=now=>{ const p=Math.min(1,(now-t0)/dur), e=easeFn(p);
        apply(f.v+(tv-f.v)*e, f.s+(ts-f.s)*e, f.d+(td-f.d)*e);
        if(p<1) _ovrAnim=requestAnimationFrame(step); };
      _ovrAnim=requestAnimationFrame(step);
    }
    const ovrLink = $('#ci-ovr-link');
    if(ovrLink){
      const panel = $('#ci-ovr-panel');
      const paint = k=>{
        root.querySelectorAll('.ci-ovr-opt').forEach(b=>b.classList.toggle('on', b.dataset.ovr===k));
        const ab = $('#ci-ovr-about'); if(ab) ab.textContent = (k && STATE_DETAIL[k]) ? STATE_DETAIL[k].about : '';
      };
      ovrLink.onclick = ()=>{ panel.hidden = !panel.hidden; };
      root.querySelectorAll('.ci-ovr-opt').forEach(b=>b.onclick=()=>{
        const k=b.dataset.ovr, ax=STATE_AXES[k];
        paint(k);
        if(ax) _slideTo(ax[0]*100, ax[1]*100, ax[2]*100);
      });
    }

    // context tabs + chips: switch direction, then tap tags to toggle in the active set
    root.querySelectorAll('.ci-ctx-seg button').forEach(b=>b.onclick=()=>{
      ctxDir = b.dataset.ctxdir;
      root.querySelectorAll('.ci-ctx-seg button').forEach(x=>{
        const on = x===b;
        x.classList.toggle('on', on);
        x.setAttribute('aria-selected', on?'true':'false');
      });
      const more = root.querySelector('#ci-ctx-row-more'), less = root.querySelector('#ci-ctx-row-less');
      if(more) more.hidden = ctxDir!=='more';
      if(less) less.hidden = ctxDir!=='less';
    });
    // fold rows: tap to open, tap to tuck away.
    const _bindFold = id => { const b=$('#'+id); if(!b) return; b.onclick=()=>{
      const body=$('#'+b.getAttribute('aria-controls'));
      const open=b.getAttribute('aria-expanded')==='true';
      b.setAttribute('aria-expanded', open?'false':'true');
      if(body) body.classList.toggle('open', !open);
    }; };
    _bindFold('fold-ch-btn'); _bindFold('fold-ctx-btn');

    const _ctxSetOf = d => d==='less' ? ctxSelLess : ctxSelMore;
    ['ci-ctx-row-more','ci-ctx-row-less'].forEach(id=>{
      root.querySelectorAll('#'+id+' .wr-chip').forEach(b=>b.onclick=()=>{
        const set = _ctxSetOf(b.dataset.ctxdir), o = b.dataset.ctx;
        if(set.has(o)) set.delete(o); else set.add(o);
        b.classList.toggle('on', set.has(o)); b.setAttribute('aria-pressed', set.has(o)?'true':'false');
      });
    });

    const cap = $('#ch-cap');
    const AUTO_CAP = 'a new practice designed for you will arrive after you save your check-in.';
    function setCap(key){ if(cap) cap.textContent = key==='auto' ? AUTO_CAP : (CH_CAP[key] || ''); }
    const chAuto = $('#ch-auto');
    setCap(ch==null ? 'auto' : (CH_LEVELS.find(l=>l.v===ch)||{key:'meet'}).key);
    if(chAuto) chAuto.onclick = ()=>{
      ch = null;
      chAuto.classList.add('on');
      $('#ch-seg').querySelectorAll('.ch-opt').forEach(x=>x.classList.remove('on'));
      setCap('auto');
    };
    $('#ch-seg').querySelectorAll('.ch-opt').forEach(b=>b.onclick=()=>{
      ch = +b.dataset.ch;
      if(chAuto) chAuto.classList.remove('on');
      $('#ch-seg').querySelectorAll('.ch-opt').forEach(x=>x.classList.toggle('on', x===b));
      setCap(b.dataset.chkey);
    });

    $('#save').onclick = ()=>{
      const vals = { v:v/100, sym:s/100, dor:d/100, source:(window._ciSource||null) };
      if(ch!=null) vals.challenge = ch;                  // null = "whatever you recommend": let the recommender decide
      // untouched midpoints are not a read: never let the 50/50/50 tie-break
      // invent "stillness" — an all-untouched fresh save counts as settling.
      if(!(axTouched.v||axTouched.sym||axTouched.dor) && !editRec) vals.dom='neutral';
      window._ciSource = null;
      // context is saved keyed to the exact check-in, split by direction:
      //   c{t}+ = "i've had more of"   c{t}- = "i've had less of"
      // legacy c{t} (pre-v3) is aliased to "more of" for read paths; on save we
      // additionally overwrite legacy c{t} with the "more of" set so the old key
      // stays consistent if any older code path still reads it.
      const _saveCtx = (t)=>{ try{
        const kMore='c'+t+'+', kLess='c'+t+'-', m=_ctxLoad();
        const arrMore=Array.from(ctxSelMore), arrLess=Array.from(ctxSelLess);
        m[kMore]=arrMore; m[kLess]=arrLess; m['c'+t]=arrMore;   // legacy alias
        _ctxSave(m);
        if(window.Store && Store.saveContexts){
          Store.saveContexts(kMore, "i've had more of", arrMore);
          Store.saveContexts(kLess, "i've had less of", arrLess);
        }
      }catch(e){} };
      if(editRec){ Store.updateCheckin(editRec.t, vals); _saveCtx(editRec.t); ciSaveQ(editRec.t, qIdx); haptic('save'); FromJustin.refresh(); app('current'); showToast('check-in updated'); return; }
      const rec = Store.addCheckin(vals);
      _saveCtx(rec.t);
      ciSaveQ(rec.t, qIdx);
      haptic('save');
      FromJustin.refresh();
      // T-2: the FIRST check-in lands back on Today, where the halo has just taken
      // their state color — a visible payoff, not the You tab's "check in twice" nag
      app(Store.checkins().length >= 2 ? 'current' : 'today');
      actionSnack('checked in', 'change', ()=>screenCheckin(rec));
    };
  }
  function sliderHTML(key,scenario,cls,val){
    const ax = AXIS_ICON[key] || {};
    const icon = ax.icon ? ico(ax.icon,{cls:'slider-ico', color:STATE_COLOR(ax.state)}) : '';
    return `<div class="slider" data-axis="${key}">
      <span class="slider-ico-wrap">${icon}</span>
      <div class="slider-main">
        <p class="q" id="q-${key}">${scenario}</p>
        <input type="range" class="${cls}" id="sl-${key}" min="0" max="100" value="${val}" aria-label="how easy would it be to ${scenario}">
        <div class="anchors" aria-hidden="true"><span>hard</span><span>easy</span></div>
      </div>
    </div>`;
  }
  function bindSlider(key,fn){ const el=$('#sl-'+key); el.addEventListener('input',()=>fn(+el.value)); }

  // ---------------------------------------------------------------- CURRENT OVER TIME
  let playTimer=null;
  const PERIODS=[{key:'7',label:'week',days:7},{key:'30',label:'month',days:30},{key:'90',label:'90 days',days:90},{key:'all',label:'all',days:null}];
  let activePeriod='all';
  let chartMode='safety';
  function filterByPeriod(cs,days){ if(!days) return cs; const cut=Date.now()-days*864e5; return cs.filter(c=>c.t>=cut); }
  function groupByDay(arr){
    const map={};
    arr.forEach(c=>{ const k=new Date(c.t).toDateString(); if(!map[k]) map[k]=[]; map[k].push(c); });
    return Object.values(map).map(g=>{
      const n=g.length, last=g[n-1];
      return {...last, v:g.reduce((s,c)=>s+c.v,0)/n, sym:g.reduce((s,c)=>s+c.sym,0)/n, dor:g.reduce((s,c)=>s+c.dor,0)/n};
    });
  }
  function periodLabel(key){ return PERIODS.find(p=>p.key===key)?.label||'all time'; }

  function chartInner(mode, B, safetyColor){
    const N=B.length;
    const W=320,H=132,padL=10,padR=10,padT=16,padB=26;
    const plotW=W-padL-padR, plotH=H-padT-padB;
    const xOf=i=> N===1? W/2 : padL+(i/(N-1))*plotW;
    const yOf=v=> padT+(1-Math.max(0,Math.min(1,v)))*plotH;
    const pts=B.map((b,i)=>({x:+xOf(i).toFixed(1), y:+yOf(b.avg).toFixed(1), b, i}));
    const baseY=(padT+plotH).toFixed(1);
    const linePath=N===1?`M ${pts[0].x} ${pts[0].y} L ${pts[0].x+0.1} ${pts[0].y}`:'M '+pts.map(p=>`${p.x} ${p.y}`).join(' L ');
    const areaPath=`M ${pts[0].x} ${baseY} L `+pts.map(p=>`${p.x} ${p.y}`).join(' L ')+` L ${pts[pts.length-1].x} ${baseY} Z`;
    const maxL=Math.min(6,N), seen=new Set(), labs=[];
    for(let i=0;i<maxL;i++){ const idx=Math.round(i*(N-1)/(maxL-1||1)); if(seen.has(idx))continue; seen.add(idx); labs.push(`<text x="${xOf(idx).toFixed(1)}" y="${H-8}" text-anchor="${idx===0?'start':idx===N-1?'end':'middle'}" class="cx">${B[idx].label}</text>`); }
    // monochrome intensity gradient: height encodes safety; color deepens with it (no state hues)
    const ramp=(v)=>{ v=Math.max(0,Math.min(1,v)); const LO=[206,200,187],HI=[58,55,48]; return `rgb(${LO.map((c,i)=>Math.round(c+(HI[i]-c)*v)).join(',')})`; };
    const dots=pts.map(p=>`<circle class="cpt" data-i="${p.i}" cx="${p.x}" cy="${p.y}" r="3.6" fill="${mode==='safety'?ramp(p.b.avg):STATE_COLOR(p.b.dom)}" stroke="var(--bone)" stroke-width="1.6"></circle>`).join('');
    let defs, lineSvg, footer, readoutTxt;
    const last=B[N-1];
    const stops=pts.map(p=>`<stop offset="${N===1?0:(p.i/(N-1)).toFixed(3)}" stop-color="${mode==='safety'?ramp(p.b.avg):STATE_COLOR(p.b.dom)}"></stop>`).join('');
    defs=`<defs><linearGradient id="cline" x1="${padL}" y1="0" x2="${padL+plotW}" y2="0" gradientUnits="userSpaceOnUse">${stops}</linearGradient></defs>`;
    lineSvg=`<path class="cline-area" d="${areaPath}" fill="url(#cline)" opacity=".1"></path><path class="cline-path" pathLength="1" d="${linePath}" fill="none" stroke="url(#cline)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"></path>`;
    if(mode==='safety'){
      footer=`<div class="arc-scale"><span>less safety</span><span class="arc-scale-bar"></span><span>more</span></div>`;
      readoutTxt=`${last.label} \u00b7 ${Math.round(last.avg*100)}% safety`;
    } else {
      const states=[...new Set(B.map(b=>b.dom))];
      footer=`<div class="legend">${states.map(k=>`<span class="lg-it">${stateMarks(k)}${STATE_NAME(k)}</span>`).join('')}</div>`;
      readoutTxt=`${last.label} \u00b7 ${STATE_NAME(last.dom)}`;
    }
    const gain = mode==='safety' && N>=2 && (B[N-1].avg - B[0].avg) > 0.04;   // a real safety rise -> the line draws itself as a payoff
    return `<div class="arc-readout" id="chart-readout">${readoutTxt}</div><svg viewBox="0 0 ${W} ${H}" class="chart${gain?' draw-gain':''}" preserveAspectRatio="xMidYMid meet">${defs}${lineSvg}${dots}${labs.join('')}</svg>${footer}`;
  }
  // N-4: share as the designed card — a branded 1080×1080 image (bone, state dots,
  // the line, wordmark) via the system share sheet when file-sharing is supported;
  // falls back to the text path below otherwise.
  // brand glyphs on canvas: the tri-lockup (active marks in state color) + single marks.
  // Path2D consumes the same SVG path data icons.js renders in-app.
  function _cnvGlyph(x, key, cx, cy, h){
    try{
      const I=window.SNB_ICONS||{}; const vb=String(TRI_VB).split(/\s+/).map(Number);
      const s=h/vb[3], w=vb[2]*s;
      const active=(STATE_AXES[key]||[]).map(a=>a[0]);
      x.save(); x.translate(cx-w/2, cy-h/2); x.scale(s,s); x.translate(-vb[0],-vb[1]);
      TRI_ORDER.forEach(m=>{ const icn=I[m]; if(!icn) return;
        x.fillStyle = active.indexOf(m)>=0 ? STATE_COLOR(key) : '#E3DFD2';
        x.fill(new Path2D(icn.d));
      });
      x.restore(); return true;
    }catch(e){ return false; }
  }
  function _cnvMark(x, m, color, cx, cy, h){
    try{
      const icn=(window.SNB_ICONS||{})[m]; if(!icn) return false;
      const vb=icn.vb.split(/\s+/).map(Number); const s=h/vb[3], w=vb[2]*s;
      x.save(); x.translate(cx-w/2, cy-h/2); x.scale(s,s); x.translate(-vb[0],-vb[1]);
      x.fillStyle=color; x.fill(new Path2D(icn.d)); x.restore(); return true;
    }catch(e){ return false; }
  }
  // draws a card's visual onto the share canvas; returns the y where text may begin.
  // everything left-aligned at the shared margin, like the app (Justin 2026-07-05)
  const _SHL = 120;   // share-card left margin
  function _shareViz(x, W, viz){
    const L=_SHL;
    const rr=(bx,by,bw,bh,r)=>{ x.beginPath(); x.moveTo(bx+r,by); x.arcTo(bx+bw,by,bx+bw,by+bh,r); x.arcTo(bx+bw,by+bh,bx,by+bh,r); x.arcTo(bx,by+bh,bx,by,r); x.arcTo(bx,by,bx+bw,by,r); x.closePath(); };
    if(viz.kind==='meter'){
      x.fillStyle='#1A1F2A'; x.font='500 170px Inter, system-ui, sans-serif'; x.textAlign='left';
      x.fillText(viz.big || (viz.pct+'%'), L, 320);
      if(viz.pct!=null){
        const bw=W-2*L, by=360;
        x.fillStyle='#F0EEE7'; rr(L,by,bw,28,14); x.fill();
        x.fillStyle='#F4D58D'; rr(L,by,Math.max(28,bw*viz.pct/100),28,14); x.fill();
        return 490;
      }
      return 400;
    }
    if(viz.kind==='path'){
      // a/b are STATE KEYS: endpoints render ONLY the state's own active marks
      const y=300, x1=L+90, x2=W-L-90;
      const ca=STATE_COLOR(viz.a), cb=STATE_COLOR(viz.b);
      const g=x.createLinearGradient(x1,0,x2,0); g.addColorStop(0,ca); g.addColorStop(1,cb);
      x.strokeStyle=g; x.lineWidth=7; x.beginPath(); x.moveTo(x1+100,y); x.lineTo(x2-100,y); x.stroke();
      const marks=(k,cx)=>{ const ax=(STATE_AXES[k]||[]).map(a=>a[0]); const h=72, gap=14;
        let tw=0; const ws=ax.map(m=>{ const vb=(window.SNB_ICONS[m].vb).split(/\s+/).map(Number); const w=h*vb[2]/vb[3]; tw+=w; return w; }); tw+=gap*(ax.length-1);
        let px=cx-tw/2;
        const ok=ax.every((m,i)=>{ const r=_cnvMark(x,m,STATE_COLOR(k),px+ws[i]/2,y,h); px+=ws[i]+gap; return r; });
        if(!ok){ x.fillStyle=STATE_COLOR(k); x.beginPath(); x.arc(cx,y,34,0,7); x.fill(); }
      };
      marks(viz.a,x1); marks(viz.b,x2);
      return 460;
    }
    if(viz.kind==='days'){
      const lbs=['s','m','t','w','t','f','s'], y=300, gap=112, x0=L+30;
      lbs.forEach((lb,i)=>{
        const on=i===viz.idx;
        if(on){ if(!_cnvMark(x,'heart','#F4D58D',x0+i*gap,y,64)){ x.fillStyle='#F4D58D'; x.beginPath(); x.arc(x0+i*gap,y,34,0,7); x.fill(); } }
        else { x.fillStyle='#F0EEE7'; x.beginPath(); x.arc(x0+i*gap,y,22,0,7); x.fill(); }
        x.fillStyle='#5E5A4E'; x.font='400 30px Inter, system-ui, sans-serif'; x.textAlign='center';
        x.fillText(lb, x0+i*gap, y+92);
      });
      return 480;
    }
    if(viz.kind==='streak'){
      const y=300, gap=64, x0=L+22;
      for(let i=0;i<viz.n;i++){ x.fillStyle='#F4D58D'; x.beginPath(); x.arc(x0+i*gap,y,22,0,7); x.fill(); }
      return 380;
    }
    if(viz.kind==='bars'){
      const bw=W-2*L-110; let by=260;
      viz.rows.slice(0,3).forEach(r=>{
        x.fillStyle='#F0EEE7'; rr(L,by,bw,26,13); x.fill();
        x.fillStyle=r.color; rr(L,by,Math.max(26,bw*r.pct/100),26,13); x.fill();
        x.fillStyle='#5E5A4E'; x.font='400 28px Inter, system-ui, sans-serif'; x.textAlign='left';
        x.fillText(r.pct+'%', L+bw+18, by+23);
        by+=72;
      });
      return by+60;
    }
    return null;
  }
  async function shareCardImage(txt, viz){
    try{
      // the canvas only uses Inter if it's actually loaded — otherwise it silently
      // falls back and the card "loses the styling" (Justin 2026-07-05). load first.
      try{ if(document.fonts && document.fonts.load){ await Promise.all(['500 54px Inter','500 170px Inter','400 30px Inter','400 26px Inter','500 34px Inter'].map(f=>document.fonts.load(f))); } }catch(_){}
      const W=1080,H=1080,cv=document.createElement('canvas'); cv.width=W; cv.height=H;
      const x=cv.getContext('2d'); if(!x) return false;
      x.fillStyle='#FAF9F5'; x.fillRect(0,0,W,H);
      x.strokeStyle='#D8D2C2'; x.lineWidth=3; x.strokeRect(48,48,W-96,H-96);
      const L=_SHL;
      const vizBottom = viz ? _shareViz(x, W, viz) : null;
      // adaptive text block: left-aligned like the app; shrink type until the whole
      // message fits above the signature + footer — lines never collide.
      // NOTE the regex must NOT eat the sentence's final period (that was the
      // missing-period bug on shared cards, Justin 2026-07-05).
      x.fillStyle='#1A1F2A'; x.textAlign='left';
      const body=String(txt).replace(/\s*stuck not broken( · app\.stucknotbroken\.com)?\s*$/i,'').trim();
      const wrap=(fs)=>{
        x.font='500 '+fs+'px Inter, system-ui, sans-serif';
        const words=body.split(/\s+/), out=[]; let line='';
        words.forEach(w=>{ const t=line?line+' '+w:w; if(x.measureText(t).width>W-2*L&&line){ out.push(line); line=w; } else line=t; });
        if(line) out.push(line);
        return out;
      };
      const top = vizBottom ? vizBottom+56 : 260;
      const bottomLimit = H-330;                          // room for the glyph signature + footer below
      let fs=54, lh=Math.round(54*1.42), lines=wrap(fs);
      while(lines.length*lh > (bottomLimit-top) && fs>34){ fs-=4; lh=Math.round(fs*1.42); lines=wrap(fs); }
      const maxL=Math.max(1, Math.floor((bottomLimit-top)/lh));
      if(lines.length>maxL){ lines=lines.slice(0,maxL); lines[maxL-1]=lines[maxL-1].replace(/\s+\S*$/,'')+'…'; }
      const blockH=lines.length*lh;
      const startY = (vizBottom ? top : Math.max(top,(bottomLimit+top-blockH)/2)) + Math.round(lh*0.75);
      x.font='500 '+fs+'px Inter, system-ui, sans-serif';
      lines.forEach((l,i)=>x.fillText(l,L,startY+i*lh));
      // the user's state glyph sits UNDER the declaration — a signature (Justin
      // 2026-07-05). optional via settings; falls back to the small brand dots.
      const sigY = startY - Math.round(lh*0.75) + blockH + 58;
      let drewGlyph=false;
      try{
        if(localStorage.getItem('snb_share_glyph')!=='0'){
          // the signature is the state the body keeps coming back to: the most
          // common state over a trailing 90-day window, recomputed at share time
          // so it moves with every check-in (Justin 2026-07-05). thin window
          // falls back to all-time so new accounts still get a signature.
          const _cut=Date.now()-90*864e5;
          let _arr=Store.checkins().filter(c=>c.dom&&c.dom!=='neutral'&&c.t>=_cut);
          if(!_arr.length) _arr=Store.checkins().filter(c=>c.dom&&c.dom!=='neutral');
          const m={}; _arr.forEach(c=>{ m[c.dom]=(m[c.dom]||0)+1; });
          const idKey=Object.keys(m).sort((a,b)=>m[b]-m[a])[0]||null;
          if(idKey){ const vb=String(TRI_VB).split(/\s+/).map(Number); const gw=52*vb[2]/vb[3]; drewGlyph=_cnvGlyph(x, idKey, L+gw/2, sigY, 52); }
        }
      }catch(e){}
      if(!drewGlyph) ['#F4D58D','#E89B9B','#A3C0DD'].forEach((c,i)=>{ x.fillStyle=c; x.beginPath(); x.arc(L+12+i*36,sigY,11,0,7); x.fill(); });
      x.textAlign='left';
      x.fillStyle='#5E5A4E'; x.font='500 34px Inter, system-ui, sans-serif';
      x.fillText('the Stuck Not Broken app',L,H-186);
      x.fillStyle='#928F87'; x.font='400 26px Inter, system-ui, sans-serif';
      x.fillText('download at app.stucknotbroken.com',L,H-138);
      const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
      if(!blob) return false;
      const file=new File([blob],'stuck-not-broken.png',{type:'image/png'});
      if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], text:txt}); return true; }
    }catch(e){ if(e && e.name==='AbortError') return true; }   // user closed the sheet: done
    return false;
  }
  function openShare(txt, viz){
    shareCardImage(txt, viz).then(ok=>{ if(!ok) _openShareText(txt); });
  }
  function _openShareText(txt){
    const url=location.href;
    if(navigator.share){ navigator.share({title:'stuck not broken', text:txt, url}).catch(()=>{}); return; }
    const enc=encodeURIComponent(txt);
    const host=document.querySelector('.phone')||document.body;
    const old=document.getElementById('share-sheet'); if(old) old.remove();
    const s=document.createElement('div'); s.id='share-sheet'; s.className='share-sheet';
    s.innerHTML=`<div class="ss-card"><p class="ss-h">share your progress</p><a class="ss-opt" href="sms:?&body=${enc}">message</a><a class="ss-opt" href="mailto:?subject=${encodeURIComponent('my progress')}&body=${enc}">email</a><a class="ss-opt" href="https://twitter.com/intent/tweet?text=${enc}" target="_blank" rel="noopener">post to X</a><button class="ss-opt" type="button" data-copy="1">copy</button><button class="ss-cancel" type="button">cancel</button></div>`;
    host.appendChild(s);
    requestAnimationFrame(()=>s.classList.add('on'));
    const close=()=>{ s.classList.remove('on'); setTimeout(()=>{ if(s.parentNode) s.remove(); },240); };
    s.addEventListener('click',e=>{ if(e.target===s) close(); });
    s.querySelector('.ss-cancel').onclick=close;
    s.querySelector('[data-copy]').onclick=()=>{ try{ navigator.clipboard&&navigator.clipboard.writeText(txt); }catch(_){} showToast('copied'); close(); };
    s.querySelectorAll('a.ss-opt').forEach(a=>a.addEventListener('click',()=>setTimeout(close,80)));
  }
  // ---- you-tab pattern & progress stats (2026-07-05) -------------------------
  // all derived + read-only (no new stored fields, so nothing new to mirror);
  // every one self-gates on data. the reader picks these up next round.
  // ONE metric across all pattern cards (clarity + consistency, Justin 2026-07-05):
  // "the share of check-ins that land in a safe state" — countable, plain to an
  // outside reader, and usable by a professional. Every card names its own metric.
  function _safeShare(arr){ if(!arr.length) return null; let r=0; arr.forEach(c=>{ if(_REGDOMS[c.dom]) r++; }); return Math.round(r/arr.length*100); }
  function _weekdayPattern(cs){
    if(cs.length < 14) return null;
    const by={};
    cs.forEach(c=>{ const d=new Date(c.t).getDay(); (by[d]=by[d]||[]).push(c); });
    let best=null;
    Object.keys(by).forEach(d=>{ const a=by[d]; if(a.length>=3){ const p=_safeShare(a); if(best==null||p>best.pct) best={ day:+d, pct:p }; } });
    if(!best) return null;
    const names=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    return { label:names[best.day], idx:best.day, pct:best.pct };
  }
  // flavors of safety: among the check-ins that carry safety, which safe state they land in
  function _safetyFlavors(cs){
    const safe=cs.filter(c=>_REGDOMS[c.dom]);
    if(safe.length<6) return null;
    const cnt={}; safe.forEach(c=>cnt[c.dom]=(cnt[c.dom]||0)+1);
    const rows=[['safety','safety'],['play','play'],['stillness','stillness']]
      .filter(r=>cnt[r[0]])
      .map(r=>({ key:r[0], label:r[1], pct:Math.round(cnt[r[0]]/safe.length*100) }))
      .sort((a,b)=>b.pct-a.pct);
    return rows.length>=2 ? rows : null;
  }
  function _daypartPattern(cs){
    if(cs.length < 12) return null;
    const by={};
    cs.forEach(c=>{ const s=segOf(c.t); (by[s]=by[s]||[]).push(c); });
    let best=null;
    Object.keys(by).forEach(s=>{ const a=by[s]; if(a.length>=3){ const p=_safeShare(a); if(best==null||p>best.pct) best={ seg:s, pct:p }; } });
    if(!best) return null;
    const names={ morning:'morning', afternoon:'afternoon', evening:'evening', late:'late night' };
    return { seg:names[best.seg]||best.seg, pct:best.pct };
  }
  // per-daypart share of safe check-ins, for the deep "time of day" rows (null when thin)
  function _daypartPct(cs, seg){
    const a=cs.filter(x=>segOf(x.t)===seg);
    if(a.length<3) return null;
    return _safeShare(a);
  }
  // which defense state the dips most often start in — colors + glyphs the comeback card
  function _topDipState(){
    const cs = Store.checkins().filter(c=>c.dom&&c.dom!=='neutral');
    const cnt={}; let inDip=false;
    cs.forEach(c=>{ if(!_REGDOMS[c.dom]){ if(!inDip){ cnt[c.dom]=(cnt[c.dom]||0)+1; inDip=true; } } else inDip=false; });
    const e=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    return (e&&e[1]>=3)?e[0]:null;
  }
  // recovery trend over full history: early episodes vs recent episodes.
  // a slowing never headlines (copy rule: dips live in the reader, gently).
  function _recoveryTrend(){
    const cs = Store.checkins().filter(c=>c.dom&&c.dom!=='neutral');
    if(cs.length<12) return null;
    const eps=[]; let i=0;
    while(i<cs.length){
      if(!_REGDOMS[cs[i].dom]){ let j=i, steps=0, found=false;
        while(j<cs.length){ if(_REGDOMS[cs[j].dom]){ found=true; break; } j++; steps++; }
        if(found) eps.push(steps); i=j;
      } else i++;
    }
    if(eps.length<6) return null;
    const h=Math.floor(eps.length/2), avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
    const early=avg(eps.slice(0,h)), late=avg(eps.slice(-h));
    return { dir: late<=early-0.75?'faster' : late>=early+0.75?'slower' : 'steady', n:eps.length };
  }
  // personal records: high-water marks ONLY — a record can be improved but never
  // lost, so there's nothing to "break" (no streaks: chain logic teaches that a
  // dip is a failure, which is the opposite of the app's teaching — Justin 2026-07-05).
  function _personalRecords(allCs){
    const cs = allCs.filter(c=>c.dom&&c.dom!=='neutral').sort((a,b)=>a.t-b.t);
    if(cs.length<12) return null;
    const wk={}; cs.forEach(c=>{ const ws=_sundayStart(c.t); (wk[ws]=wk[ws]||[]).push(c); });
    const curWs=_sundayStart(Date.now());
    let bw=null;
    Object.keys(wk).forEach(ws=>{ if(+ws===curWs) return; const a=wk[ws];
      if(a.length>=4){ const reg=a.filter(c=>_REGDOMS[c.dom]).length/a.length; if(!bw||reg>bw.share) bw={ ws:+ws, share:reg }; } });
    const bestWeek = bw ? { label:new Date(bw.ws).toLocaleDateString(undefined,{month:'long',day:'numeric'}), pct:Math.round(bw.share*100) } : null;
    // fastest comeback: the shortest completed dip->safety trip (a recovery record)
    let fastest=null, n=0, i=0;
    while(i<cs.length){
      if(!_REGDOMS[cs[i].dom]){ let j=i, steps=0, found=false;
        while(j<cs.length){ if(_REGDOMS[cs[j].dom]){ found=true; break; } j++; steps++; }
        if(found){ n++; if(!fastest||steps<fastest.steps) fastest={ steps, dom:cs[i].dom }; }
        i=j;
      } else i++;
    }
    if(n<3) fastest=null;                                    // needs several real comebacks to call one a record
    if(!bestWeek && !fastest) return null;
    return { bestWeek, fastest };
  }
  // the visible 28-day Baseline (same math as the reader's zoom-out section)
  function _baselineCard(){
    if(!(Store.tenure&&Store.periodStats)) return null;
    const tn=Store.tenure(); if(!tn||tn.days<28) return null;
    const now=Date.now();
    const base=Store.periodStats(now-28*864e5, now); if(!base||base.n<8) return null;
    const wk=Store.periodStats(now-7*864e5, now);
    // LEVEL, not share (Justin 2026-07-05): "the level of safety consistently in
    // your system" — average safety, unified with the hero card's metric. the
    // reader's Baseline sections still use share; unify there in the reader round.
    return { basePct: Math.round(base.avgV*100), wkPct: (wk&&wk.n>=3)?Math.round(wk.avgV*100):null };
  }
  // context effect: the tagged label whose weeks differ most from a typical week.
  // returns BOTH percentages (never a "points" delta — Justin 2026-07-05: confusing).
  // attribution guardrail: only ever rendered WITH the practice effect beside it.
  function _contextEffect(){
    const m=_ctxLoad();
    // key shapes:
    //   c{t}+  = "i've had more of" for check-in t (v3)
    //   c{t}-  = "i've had less of" for check-in t (v3)
    //   c{t}   = legacy pre-v3 tag (aliased to "more of" on read; also carried by save)
    //   w{YYYY-MM-DD} = weekly reader question   d{...} = daily reader question
    // per-check-in tags fold into their containing week; labels prefixed with the
    // direction so "more of X" and "less of X" are separate signals downstream.
    // legacy c{t} would double-count with new c{t}+; we skip legacy when the
    // suffixed key exists for the same check-in.
    const wkTags={};
    Object.keys(m).forEach(k=>{
      if(!(m[k]||[]).length) return;
      let ws=null, prefix='';
      if(k[0]==='c'){
        const mm=/^c(\d+)([+-]?)$/.exec(k); if(!mm) return;
        const t=Number(mm[1]); if(!isFinite(t)) return;
        // legacy no-suffix: skip if the '+' key already carries this check-in
        if(mm[2]==='' && ('c'+t+'+') in m) return;
        ws=_sundayStart(t);
        prefix = mm[2]==='-' ? 'less of ' : 'more of ';
      }
      else if(k[0]==='w'||k[0]==='d'){
        const p=k.slice(1).split('-').map(Number);          // local date parts
        if(p.length<3||p.some(isNaN)) return;
        const t=new Date(p[0],p[1]-1,p[2]).getTime();
        ws = k[0]==='w' ? t : _sundayStart(t);
      }
      if(ws==null) return;
      const set=wkTags[ws]=wkTags[ws]||{};
      m[k].forEach(lb=>{ set[prefix+lb]=1; });
    });
    const tagged=Object.keys(wkTags);
    if(tagged.length<2) return null;
    const weeks={};
    Store.checkins().forEach(c=>{ if(!c.dom||c.dom==='neutral') return; const ws=_sundayStart(c.t); (weeks[ws]=weeks[ws]||[]).push(c); });
    const share=ws=>{ const a=weeks[ws]; if(!a||a.length<3) return null; return a.filter(c=>_REGDOMS[c.dom]).length/a.length; };
    const all=Object.keys(weeks).map(ws=>share(+ws)).filter(v=>v!=null);
    if(all.length<3) return null;
    const typPct=Math.round(all.reduce((s,v)=>s+v,0)/all.length*100);
    const byLabel={};
    tagged.forEach(ws=>{
      const v=share(+ws); if(v==null) return;
      Object.keys(wkTags[ws]).forEach(lb=>{ (byLabel[lb]=byLabel[lb]||[]).push(v); });
    });
    let best=null;
    Object.keys(byLabel).forEach(lb=>{ const a=byLabel[lb];
      if(a.length>=2){ const p=Math.round(a.reduce((s,v)=>s+v,0)/a.length*100); if(!best||Math.abs(p-typPct)>Math.abs(best.tagPct-typPct)) best={ label:lb, tagPct:p, n:a.length }; } });
    return (best && Math.abs(best.tagPct-typPct)>=5) ? { label:best.label, tagPct:best.tagPct, typPct } : null;
  }

  // windowed practice effect (2026-07-05, Justin): a check-in a week later says
  // nothing about the practice — only pairs within 12 hours count, so the stat
  // never claims a correlation the timing can't support. computed from raw data;
  // store.js untouched.
  const _PE_WIN = 12*36e5;
  const _PE_RANK = { shutdown:0, freeze:0, fightflight:1, play:2, stillness:2, safety:3 };
  function _peWindowed(){
    const ss = Store.sessions().filter(s=>s&&s.domBefore&&_PE_RANK[s.domBefore]!=null);
    if(!ss.length) return null;
    const cs = Store.checkins();
    let moved=0, total=0;
    ss.forEach(s=>{
      const next = cs.find(c=>c.t>s.t && c.t-s.t<=_PE_WIN && c.dom && _PE_RANK[c.dom]!=null);
      if(!next) return;
      total++;
      if(_PE_RANK[next.dom]>_PE_RANK[s.domBefore]) moved++;
    });
    return total>=6 ? { moved, total, rate:moved/total } : null;
  }
  function _peInsightsWindowed(){
    const ss = Store.sessions().filter(s=>s&&s.practiceKey&&s.domBefore&&_PE_RANK[s.domBefore]!=null);
    if(!ss.length) return [];
    const cs = Store.checkins(), g={};
    ss.forEach(s=>{
      const next = cs.find(c=>c.t>s.t && c.t-s.t<=_PE_WIN && c.dom && _PE_RANK[c.dom]!=null);
      if(!next) return;
      const k=s.practiceKey+'|'+s.domBefore+'|'+segOf(s.t);
      const o=g[k]||(g[k]={practiceKey:s.practiceKey,dom:s.domBefore,seg:segOf(s.t),moved:0,total:0});
      o.total++;
      if(_PE_RANK[next.dom]>_PE_RANK[s.domBefore]) o.moved++;
    });
    return Object.keys(g).map(k=>g[k]).filter(o=>o.total>=4).map(o=>Object.assign(o,{rate:o.moved/o.total})).sort((a,b)=>b.total-a.total||b.rate-a.rate);
  }
  // context ↔ state link: which tag gets named most around safe check-ins, and which
  // around defense. only per-check-in ('c') tags carry a state, so only they count.
  function _contextStateLink(){
    const m=_ctxLoad();
    const byT={}; Store.checkins().forEach(c=>{ if(c&&c.dom&&c.dom!=='neutral') byT[c.t]=c.dom; });
    const safe={}, def={};
    Object.keys(m).forEach(k=>{
      if(k[0]!=='c'||!(m[k]||[]).length) return;
      const mm=/^c(\d+)([+-]?)$/.exec(k); if(!mm) return;
      const t=Number(mm[1]);
      // legacy no-suffix: skip if we already have a '+' row for the same check-in
      if(mm[2]==='' && ('c'+t+'+') in m) return;
      const dom=byT[t]; if(!dom) return;
      const prefix = mm[2]==='-' ? 'less of ' : 'more of ';
      const tgt=_REGDOMS[dom]?safe:def;
      m[k].forEach(lb=>{ tgt[prefix+lb]=(tgt[prefix+lb]||0)+1; });
    });
    const top=o=>{ const e=Object.entries(o).sort((a,b)=>b[1]-a[1])[0]; return (e&&e[1]>=2)?{label:e[0],n:e[1]}:null; };
    const s=top(safe), d=top(def);
    return (s||d) ? { safe:s, def:d } : null;
  }

  function tabCurrent(){
    const c = content();
    const ab=document.querySelector('.appbar');
    if(ab) ab.innerHTML='';
    const allCs = Store.checkins();
    if(allCs.length < 2){
      // each teach row opens the full state page (STATE_DETAIL) — the state info was
      // only reachable through the stats glyphs before; this is the front door now
      const teach = ['safety','fightflight','shutdown'].map(st=>{
        const ax = AXIS_ICON[{safety:'v',fightflight:'sym',shutdown:'dor'}[st]];
        return `<button class="map-row" type="button" data-state-detail="${st}">
          <span class="map-ico">${ico(ax.icon,{color:STATE_COLOR(st)})}</span>
          <span class="map-text"><span class="map-name">${STATE_NAME(st)}</span><span class="map-sub">${ax.sub}</span></span>
          <span class="wc-go">${CHEV}</span>
        </button>`;
      }).join('');
      c.innerHTML = `<div class="view play-view">
        <div class="filter-bar" style="justify-content:flex-end">
          <button class="set-gear" id="set-btn" type="button" aria-label="settings" title="settings">${GEAR_SVG}</button>
        </div>
        <div class="map-empty">
        <p class="map-lede">your three nervous-system states.</p>
        <div class="map-rows">${teach}</div>
        <p class="map-foot">check in twice, and your patterns start to show here.</p>
        <button class="btn" id="goci">check in</button></div></div>`;
      $('#goci').onclick = screenCheckin;
      const sb0=$('#set-btn'); if(sb0) sb0.onclick = screenSettings;
      c.querySelectorAll('[data-state-detail]').forEach(b=>b.onclick=()=>screenStateDetail(b.dataset.stateDetail));
      return;
    }

    const avg = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;
    const domOf = arr => { const m={}; arr.forEach(x=>{m[x.dom]=(m[x.dom]||0)+1;}); const e=Object.entries(m).sort((a,b)=>b[1]-a[1])[0]; return e?e[0]:null; };

    function render(){
      const _span = Store.tenure().days;
      const visPer = PERIODS.filter(p=>p.days==null || p.days<=_span);   // only windows the data actually spans
      if(!visPer.some(p=>p.key===activePeriod)) activePeriod='all';
      const days = PERIODS.find(p=>p.key===activePeriod)?.days||null;
      const cs = filterByPeriod(allCs, days);
      const paced = groupByDay(cs);
      const sess = filterByPeriod(Store.sessions(), days);
      const periodTxt = PERIODS.find(p=>p.key===activePeriod)?.label||'all time';
      // full phrase for card subtitles ("7d" would read as "during the last 7d";
      // "all" used to render as "during the last all" — a live grammar bug)
      const periodPhrase = ({'7':'the last 7 days','30':'the last 30 days','90':'the last 90 days','all':'all time'})[activePeriod] || 'all time';

      // ---- safety hero + trend over the window ----
      const safetyPct = Math.round(avg(cs.map(x=>x.v))*100);
      const vsAll = cs.map(x=>x.v);
      const hiPct = vsAll.length?Math.round(Math.max.apply(null,vsAll)*100):0;
      const loPct = vsAll.length?Math.round(Math.min.apply(null,vsAll)*100):0;
      const topState = domOf(cs);
      let dir='steady';
      if(paced.length>=4){
        const k=Math.max(1,Math.floor(paced.length/3));
        const d = avg(paced.slice(-k).map(x=>x.v)) - avg(paced.slice(0,k).map(x=>x.v));
        dir = d>0.08?'rising':d<-0.08?'falling':'steady';
      }
      const rising = dir==='rising';

      // ---- mix (time-bound) ----
      const counts={}; cs.forEach(x=>{counts[x.dom]=(counts[x.dom]||0)+1;});
      const total=cs.length||1;
      const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
      const mixHTML=ranked.map(([key,n])=>{
        const pct=Math.round(n/total*100);
        return `<button class="distrow" data-state-detail="${key}">
          <span class="distrow-top"><span class="distrow-name">${stateMarks(key)}${({play:'play/motivation',stillness:'stillness'}[key])||STATE_NAME(key)}</span><span class="distrow-pct">${pct}%</span></span>
          <span class="distrow-track"><span class="distrow-fill" style="width:${Math.max(pct,2)}%;background:${STATE_COLOR(key)}"></span></span>
        </button>`;
      }).join('');

      // ---- day by day: a flowing ribbon — warmer = more safety ----
      function safetyColor(v){
        const stops=[[0,[163,192,221]],[0.5,[159,196,152]],[1,[244,213,141]]];
        v=Math.max(0,Math.min(1,v));
        let a=stops[0],b=stops[stops.length-1];
        for(let i=0;i<stops.length-1;i++){ if(v>=stops[i][0]&&v<=stops[i+1][0]){a=stops[i];b=stops[i+1];break;} }
        const t=(v-a[0])/((b[0]-a[0])||1);
        const c=a[1].map((x,i)=>Math.round(x+(b[1][i]-x)*t));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
      }
      let dayByDay, arcBuckets=null;
      if(paced.length<3){
        dayByDay=`<p class="panel-empty">a few more days of check-ins, and your timeline fills in here.</p>`;
      } else {
        const minT=paced[0].t, maxT=paced[paced.length-1].t, spanD=(maxT-minT)/864e5;
        const unit = spanD>75?'month': spanD>21?'week':'day';
        const keyOf=(t)=>{ const d=new Date(t); if(unit==='month') return d.getFullYear()+'-'+d.getMonth(); if(unit==='week'){ const o=new Date(d); o.setHours(0,0,0,0); o.setDate(o.getDate()-o.getDay()); return o.getTime(); } return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
        const labOf=(t)=>{ const d=new Date(t); return unit==='month'?d.toLocaleDateString(undefined,{month:'short'}):d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); };
        const bmap=new Map();
        paced.forEach(p=>{ const k=keyOf(p.t); if(!bmap.has(k)) bmap.set(k,{t:p.t,vs:[],dom:{}}); const bb=bmap.get(k); bb.vs.push(p.v); bb.dom[p.dom]=(bb.dom[p.dom]||0)+1; });
        arcBuckets=[...bmap.values()].sort((a,b)=>a.t-b.t).map(b=>({t:b.t, label:labOf(b.t), avg:b.vs.reduce((s,v)=>s+v,0)/b.vs.length, dom:Object.entries(b.dom).sort((x,y)=>y[1]-x[1])[0][0]}));
        // two charts, two cards (Justin 2026-07-05): the safety line and the states
        // view were two different stories crammed behind a toggle — separated.
        dayByDay=`<div class="chart-wrap" data-cmode="safety">${chartInner('safety', arcBuckets, safetyColor)}</div>`;
      }

      // ---- does practice help: safety on practice days vs other days ----
      const pDays=new Set(sess.map(s=>new Date(s.t).toDateString()));
      const on=[],off=[];
      cs.forEach(x=>{ (pDays.has(new Date(x.t).toDateString())?on:off).push(x.v); });
      // data-only, three layers deep (Justin 2026-07-05): the bars, the loop rate,
      // and the personal best-combo insight. no editorial verdicts.
      let helpHTML;
      if(sess.length<2 || !on.length || !off.length){
        helpHTML=`<p class="panel-empty">practice a few times, checking in around it, and we'll show you whether it moves your safety.</p>`;
      } else {
        const onP=Math.round(avg(on)*100), offP=Math.round(avg(off)*100);
        const _pe = _peWindowed();
        const _pis = _peInsightsWindowed();
        const _pi = _pis && _pis.length ? _pis[0] : null;
        const _segPhrase = s => s==='late' ? 'late at night' : 'in the '+segLabel(s);
        helpHTML=`
          <div class="help-bars">
            <div class="help-row"><span class="help-lbl">practice days</span><span class="help-track"><span class="help-fill" style="width:${onP}%;background:var(--s-safety)"></span></span><span class="help-pct">${onP}%</span></div>
            <div class="help-row"><span class="help-lbl">other days</span><span class="help-track"><span class="help-fill" style="width:${offP}%;background:var(--hairline)"></span></span><span class="help-pct">${offP}%</span></div>
          </div>
          ${_pe?`<p class="cb-line" style="margin-top:16px">when you check in within a few hours of practicing, it shows more safety about <b>${Math.round(_pe.rate*20)*5}%</b> of the time.</p>`:''}
          ${_pi?`<p class="cb-line" style="margin-top:10px">your most reliable combo so far: <b>${Store.practiceLabel(_pi.practiceKey)}</b> ${_segPhrase(_pi.seg)}, safety follows about <b>${Math.round(_pi.rate*20)*5}%</b> of the time.</p>`:''}`;
      }

      // ---- growth headline: safety now vs when you started (all-time, not period-filtered) ----
      let growthHead='';
      (function(){
        const tn=Store.tenure();
        if(allCs.length>=8 && tn.days>=5 && tn.stage!=='start' && tn.stage!=='early'){
          const k=Math.max(2,Math.floor(allCs.length/4));
          const startV=avg(allCs.slice(0,k).map(x=>x.v)), recentV=avg(allCs.slice(-k).map(x=>x.v));
          const g=Math.round((recentV-startV)*100), up=g>=3, down=g<=-3;
          // a dip is never the headline here — that conversation lives in the reader.
          // two plain percentages, never a "pts" delta (Justin 2026-07-05)
          if(!down){
            const cap=up?'average safety, when you started vs now. the reps add up!':'average safety, about steady since you started.';
            growthHead=`<p class="growth-head"><span class="growth-num ${up?'up':'flat'}">${Math.round(startV*100)}% → ${Math.round(recentV*100)}%</span><span class="growth-cap">${cap}</span></p>`;
          }
        }
      })();
      const SHARE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14V4"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M5 12v7h14v-7"/></svg>';
      const shareBtn=(k)=>`<button class="panel-share" type="button" data-share="${k}" aria-label="share this card">${SHARE_ICON}</button>`;
      // hoisted card signals (slides render them; the share cards draw them)
      const rec = (Store.recovery ? Store.recovery() : null);
      const rt  = rec ? _recoveryTrend() : null;
      const dip = _topDipState();
      const bl  = _baselineCard();
      const wd  = _weekdayPattern(cs), dp = _daypartPattern(cs);
      const trn = (Store.transitions ? Store.transitions() : null);
      const pr  = _personalRecords(allCs);
      const fl  = _safetyFlavors(cs);
      const ce  = _contextEffect();
      const pe  = ce ? _peWindowed() : null;
      const csl = _contextStateLink();
      c.innerHTML=`
        <div class="view play-view">
          <div class="filter-bar">
            ${visPer.length>1?`<div class="play-filter seg">${visPer.map(p=>`<button class="period-pill${activePeriod===p.key?' on':''}" data-period="${p.key}">${p.label}</button>`).join('')}</div>`:''}
            <button class="set-gear ci-add" id="add-ci" type="button" aria-label="new check in" title="new check in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>
            <button class="set-gear" id="set-btn" type="button" aria-label="settings" title="settings">${GEAR_SVG}</button>
          </div>

          <div class="carousel" id="carousel" role="region" aria-roledescription="carousel" aria-label="your patterns \u2014 swipe or use the dots below">${(function(){
            // slides assemble dynamically, wins first. a safety DIP is never
            // animated or headlined here (it lives, gently worded, in the reader).
            const slides = [];
            slides.push(['safety','your safety', `
              ${shareBtn('safety')}<h2 class="panel-title">your safety</h2>
              <p class="panel-sub">the average level of safety in your system over ${periodPhrase}.</p>
              <div class="safety-wrap${rising?' rising':''}" id="safety-wrap">
                <div class="safety-num"><span class="safety-num-val">${safetyPct}</span><span class="pct">%</span></div>
                ${dir==='falling'?'':`<div class="safety-trend ${dir}">${dir==='rising'?'and rising \u2191':'and steady'}</div>`}
              </div>
              <div class="safety-meter"><span class="safety-meter-fill" style="width:${safetyPct}%"></span></div>
              ${(topState==='play'||topState==='stillness')?`<div class="safety-foot"><span class="tg-host">${triGlyph(topState)}</span><span class="sf-txt">your safety usually looks like <b>${topState==='play'?'playfulness and motivation':'stillness'}</b></span></div>`:''}
              ${rising?'<p class="bloom-line">your system is finding more safety.</p>':''}`]);
            if(rec){
              const phrase = rec.avg<=1.5 ? 'a check-in or two' : 'about '+Math.round(rec.avg)+' check-ins';
              const from = dip || 'fightflight';
              const rtLine = (rt && rt.dir==='faster') ? `<p class="cb-line">and lately, that trip has been getting <b>shorter</b>.</p>` : '';
              const dipLine = dip ? `<p class="cb-line">your most common dip is into <b>${STATE_NAME(dip)}</b>.</p>` : '';
              slides.push(['comeback','getting back to safety', `
              ${shareBtn('comeback')}<h2 class="panel-title">getting back to safety</h2>
              <div class="cb-viz cb-glyphs" aria-hidden="true"><span class="cb-g">${stateMarks(from)}</span><span class="cb-path" style="background:linear-gradient(90deg,${STATE_COLOR(from)},${STATE_COLOR('safety')})"></span><span class="cb-g">${stateMarks('safety')}</span></div>
              <p class="cb-line">when your body drops into defense, safety usually returns within <b>${phrase}</b>. you've made that trip ${rec.n} times.</p>
              ${dipLine}${rtLine}`]);
            }
            if(bl){
              slides.push(['baseline','your safety baseline', `
              ${shareBtn('baseline')}<h2 class="panel-title">your safety baseline</h2>
              <p class="panel-sub">the level of safety consistently in your system over the past month.</p>
              <div class="safety-wrap"><div class="safety-num"><span>${bl.basePct}</span><span class="pct">%</span></div></div>
              <div class="safety-meter"><span class="safety-meter-fill" style="width:${bl.basePct}%"></span></div>
              ${(bl.wkPct!=null&&bl.wkPct>=bl.basePct+3)?`<p class="cb-line">(but this week you're even higher, at <b>${bl.wkPct}%</b>.)</p>`:''}`]);
            }
            if(wd || dp){
              const strip = wd ? `<div class="wk-strip" aria-hidden="true">${['s','m','t','w','t','f','s'].map((lb,i)=>`<span class="wk-cell" style="animation-delay:${i*45}ms">${i===wd.idx?`<span class="wk-mark">${ico('heart',{color:STATE_COLOR('safety')})}</span>`:'<span class="wk-dot"></span>'}<span class="wk-lb">${lb}</span></span>`).join('')}</div>` : '';
              slides.push(['times','your most regulated times', `
              ${shareBtn('times')}<h2 class="panel-title">your most regulated times</h2>
              <p class="panel-sub">when your check-ins have safety most often, over ${periodPhrase}.</p>
              ${strip}
              ${wd?`<p class="cb-line">${wd.pct}% of your <b>${wd.label}</b> check-ins have safety in them.</p>`:''}
              ${dp?`<p class="cb-line">${dp.pct}% of your <b>${dp.seg}</b> check-ins have safety in them.</p>`:''}`]);
            }
            if(trn){
              const nm = k => ({play:'regulated mobility',stillness:'regulated immobility'}[k])||STATE_NAME(k);
              slides.push(['shift','your most common shift', `
              ${shareBtn('shift')}<h2 class="panel-title">your most common shift</h2>
              <div class="cb-viz cb-glyphs" aria-hidden="true"><span class="cb-g">${stateMarks(trn.a)}</span><span class="cb-path" style="background:linear-gradient(90deg,${STATE_COLOR(trn.a)},${STATE_COLOR(trn.b)})"></span><span class="cb-g">${stateMarks(trn.b)}</span></div>
              <p class="cb-line">your state most often shifts from <b>${nm(trn.a)}</b> to <b>${nm(trn.b)}</b>. ${trn.count} times so far.</p>`]);
            }
            if(pr){
              const fcTxt = pr.fastest ? (pr.fastest.steps<=1?'back in one check-in':'back in '+pr.fastest.steps+' check-ins') : '';
              slides.push(['records','your records', `
              ${shareBtn('records')}<h2 class="panel-title">your records</h2>
              <p class="panel-sub">personal bests, from your real check-ins.</p>
              ${pr.bestWeek?`<div class="safety-meter" style="margin:12px 0 16px"><span class="safety-meter-fill" style="width:${pr.bestWeek.pct}%"></span></div>`:''}
              ${pr.bestWeek?`<p class="cb-line">your most regulated week yet: the week of <b>${pr.bestWeek.label}</b>, when <b>${pr.bestWeek.pct}%</b> of your check-ins had safety in them.</p>`:''}
              ${pr.fastest?`<p class="cb-line">your fastest comeback: a dip into <b>${STATE_NAME(pr.fastest.dom)}</b>, <b>${fcTxt}</b>.</p>`:''}`]);
            }
            slides.push(['mix','your state mix', `
              ${shareBtn('mix')}<h2 class="panel-title">your state mix</h2>
              <p class="panel-sub">${activePeriod==='all'?'your state averages, all time.':'your check-in averages, over '+periodPhrase+'.'}</p>
              <div class="dist-bars">${mixHTML}</div>`]);
            if(fl){
              slides.push(['flavors','your flavors of safety', `
              ${shareBtn('flavors')}<h2 class="panel-title">your flavors of safety</h2>
              <p class="panel-sub">this is what your safety looks like over ${periodPhrase}.</p>
              <div class="help-bars">${fl.map(r=>`<div class="help-row"><span class="help-lbl">${stateMarks(r.key)}${r.label}</span><span class="help-track"><span class="help-fill" style="width:${Math.max(r.pct,3)}%;background:${STATE_COLOR(r.key)}"></span></span><span class="help-pct">${r.pct}%</span></div>`).join('')}</div>`]);
            }
            if(ce || csl){
              const bars = ce ? `
              <p class="panel-sub">safety in the weeks you tagged “${escapeHtml(ce.label)}”, next to a typical week.</p>
              <div class="help-bars">
                <div class="help-row"><span class="help-lbl">tagged weeks</span><span class="help-track"><span class="help-fill" style="width:${ce.tagPct}%;background:var(--s-safety)"></span></span><span class="help-pct">${ce.tagPct}%</span></div>
                <div class="help-row"><span class="help-lbl">typical week</span><span class="help-track"><span class="help-fill" style="width:${ce.typPct}%;background:var(--hairline)"></span></span><span class="help-pct">${ce.typPct}%</span></div>
              </div>` : `<p class="panel-sub">what you tag as having the biggest impact, by the state you were in.</p>`;
              const links = csl ? `
              ${csl.safe?`<p class="cb-line"${ce?' style="margin-top:16px"':''}>tagged most around your safe check-ins: <b>${escapeHtml(csl.safe.label)}</b>.</p>`:''}
              ${csl.def?`<p class="cb-line">tagged most around defense: <b>${escapeHtml(csl.def.label)}</b>.</p>`:''}` : '';
              slides.push(['context','your top context', `
              ${shareBtn('context')}<h2 class="panel-title">your top context</h2>
              ${bars}${links}
              ${pe?`<p class="ctx-practice">practice, for the record: check-ins within a few hours of practicing show more safety about ${Math.round(pe.rate*20)*5}% of the time.</p>`:''}`]);
            }
            slides.push(['changes','your safety changes', `
              ${shareBtn('day')}<h2 class="panel-title">your safety changes</h2>
              <p class="panel-sub">your safety state over time, and how far you've come since you started.</p>
              ${growthHead}${dayByDay}`]);
            if(arcBuckets){
              slides.push(['states','your states over time', `
              ${shareBtn('states')}<h2 class="panel-title">your states over time</h2>
              <p class="panel-sub">the state each stretch of time leaned toward.</p>
              <div class="chart-wrap" data-cmode="states">${chartInner('states', arcBuckets, safetyColor)}</div>`]);
            }
            slides.push(['practice','is practice helping?', `
              ${shareBtn('practice')}<h2 class="panel-title">is practice helping?</h2>
              <p class="panel-sub">your average safety after you practice vs. not.</p>
              ${helpHTML}`]);
            // capacity-aware carousel (2026-07-05): AT MOST 4 cards, chosen for
            // what the data supports and what the person has room for right now.
            // when recent check-ins lean defensive, the cards that say "dips end"
            // lead (comeback, regulated times, records, practice) and the
            // percentage hero steps back — same honest data, kinder sequence.
            // when steady or rising, the safety story leads as before.
            const _recent = allCs.slice(-6);
            const _defN = _recent.filter(x=>x.dom && x.dom!=='neutral' && !_REGDOMS[x.dom]).length;
            const _tender = _recent.length>=3 && (_defN/_recent.length)>=0.5;
            const _ORDER = _tender
              ? ['comeback','times','records','practice','flavors','baseline','mix','context','changes','states','shift','safety']
              : ['safety','comeback','changes','baseline','times','shift','records','mix','flavors','context','states','practice'];
            const _rank = k=>{ const i=_ORDER.indexOf(k); return i<0?99:i; };
            const picked = slides.slice().sort((a,b)=>_rank(a[0])-_rank(b[0])).slice(0,4);
            window._youSlides = picked.map(s=>s[1]);
            return picked.map((s,i)=>`<section class="panel" role="group" aria-roledescription="slide" aria-label="${s[1]}, card ${i+1} of ${picked.length}">${s[2]}</section>`).join('');
          })()}</div>

          <div class="dots" id="dots">${(window._youSlides||[]).map((lb,i)=>`<button type="button" class="dot-i${i===0?' on':''}" data-panel="${i}" aria-label="${lb}"></button>`).join('')}</div>

          <div class="deep">
            <div class="deep-block">
              <h3 class="deep-h">time of day</h3>
              ${['morning','afternoon','evening','late'].map(seg=>{ const sub=cs.filter(x=>segOf(x.t)===seg); const k=domOf(sub); const pct=_daypartPct(cs,seg); return `<div class="deep-row"><span class="deep-lbl">${segLabel(seg)}</span><span class="deep-val">${pct!=null?`<span class="deep-pct">${pct}%</span>`:''}${k?`<span class="deep-tap" data-state-detail="${k}" style="cursor:pointer">${stateMarks(k)}</span>`:'<span class="deep-none">\u2014</span>'}</span></div>`; }).join('')}
            </div>
            <div class="deep-block">
              <h3 class="deep-h">day by day</h3>
              ${['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map((nm,d)=>{ const sub=cs.filter(x=>new Date(x.t).getDay()===d); const k=sub.length>=3?domOf(sub):null; const pct=sub.length>=3?_safeShare(sub):null; return `<div class="deep-row"><span class="deep-lbl">${nm}</span><span class="deep-val">${pct!=null?`<span class="deep-pct">${pct}%</span>`:''}${k?`<span class="deep-tap" data-state-detail="${k}" style="cursor:pointer">${stateMarks(k)}</span>`:'<span class="deep-none">\u2014</span>'}</span></div>`; }).join('')}
              <p class="deep-foot">% = check-ins where a safe state leads.</p>
            </div>
            <div class="deep-block">
              <h3 class="deep-h">your numbers</h3>
              <div class="deep-row"><span class="deep-lbl">days tracked</span><span class="deep-val">${Store.tenure?Store.tenure().days:'\u2014'}</span></div>
              <div class="deep-row"><span class="deep-lbl">check-ins</span><span class="deep-val">${allCs.length}</span></div>
              ${(function(){const n=Store.sessions().filter(s=>s&&s.completed).length;return n?`<div class="deep-row"><span class="deep-lbl">practices completed</span><span class="deep-val">${n}</span></div>`:'';})()}
              ${rec?`<div class="deep-row"><span class="deep-lbl">comebacks made</span><span class="deep-val">${rec.n}</span></div>`:''}
            </div>
            <div class="deep-block">
              <h3 class="deep-h">how you practice</h3>
              <div class="deep-row"><span class="deep-lbl">challenge level</span><span class="deep-val">${(function(){const ca=Store.learned().challengeAvg;return ca!=null?Store.challengeLabel(ca):'\u2014';})()}</span></div>
              ${(function(){const L=Store.learned();let h='';if(L.favPractice)h+=`<div class="deep-row"><span class="deep-lbl">you return to</span><span class="deep-val">${Store.practiceLabel(L.favPractice)}</span></div>`;if(L.favSense)h+=`<div class="deep-row"><span class="deep-lbl">anchored through</span><span class="deep-val">${L.favSense}</span></div>`;return h;})()}
              ${(function(){const ss=Store.sessions().filter(s=>s&&s.completed);if(!ss.length)return '';const mins=Math.round(ss.reduce((s,x)=>s+(x.minutes||0),0));return mins?`<div class="deep-row"><span class="deep-lbl">time in practice</span><span class="deep-val">${mins>=90?Math.round(mins/60*10)/10+' hours':mins+' minutes'}</span></div>`:'';})()}
              ${(function(){if(!Store.practiceInsights)return '';const a=Store.practiceInsights();if(!a||!a.length)return '';const s=a[0].seg;return `<div class="deep-row"><span class="deep-lbl">best time for it</span><span class="deep-val">${s==='late'?'late at night':segLabel(s)}</span></div>`;})()}
            </div>
          </div>
          <button class="change-link" id="change-ci" type="button">change a recent check-in</button>
          ${Store.sessions().length ? '<button class="change-link" id="manage-pr" type="button">manage your practices</button>' : ''}
        </div>`;

      function stopPlay(){ if(playTimer){ clearInterval(playTimer); playTimer=null; } const p=$('#ot-play'); if(p) p.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 Z"/></svg>'; }

      // panels peek (see CSS): one snap unit = a panel's width + the 14px gap
      const snapUnit = (cv)=>{ const p=cv&&cv.firstElementChild; return p ? p.offsetWidth+14 : (cv?cv.clientWidth:1)||1; };
      c.querySelectorAll('.period-pill').forEach(b=>b.addEventListener('click',()=>{ stopPlay(); const cv=$('#carousel'); const sl=cv?cv.scrollLeft:0; activePeriod=b.dataset.period; render(); const nv=$('#carousel'); if(nv){ nv.scrollLeft=sl; const _dd=c.querySelectorAll('#dots .dot-i'); const i=Math.max(0,Math.min(_dd.length-1,Math.round(sl/snapUnit(nv)))); _dd.forEach((d,j)=>d.classList.toggle('on',j===i)); } }));
      const setBtn=$('#set-btn'); if(setBtn) setBtn.onclick=screenSettings;
      const chgBtn=$('#change-ci'); if(chgBtn) chgBtn.onclick=screenChangeCheckin;
      const mpBtn=$('#manage-pr'); if(mpBtn) mpBtn.onclick=screenManagePractices;
      const addBtn=$('#add-ci'); if(addBtn) addBtn.onclick=screenCheckin;
      // per-card share text — each card shares what IT shows, in a hopeful register
      const _topNm = ({play:'regulated mobility',stillness:'regulated immobility'}[topState])||STATE_NAME(topState||'safety');
      const _sig = 'stuck not broken · app.stucknotbroken.com';
      // share copy never repeats the number the visual already shows (Justin 2026-07-05:
      // "redundant"). when the baseline ROSE this month, the card celebrates the rise.
      const bd = bl ? (function(){ try{ const n=Date.now(); return Store.baselineDelta ? Store.baselineDelta(n-28*864e5, n) : null; }catch(e){ return null; } })() : null;
      const SHARE_TXT = {
        safety:  `my average level of safety lately. i'm learning my nervous system's language. ${_sig}`,
        mix:     `my state mix lately. i'm mapping my nervous system, state by state. ${_sig}`,
        comeback:`after a dip, my nervous system finds its way back to safety. ${_sig}`,
        day:     `my safety over time, and how far it's come since i started. ${_sig}`,
        practice:`i'm tracking whether practice actually moves my nervous system. the data is answering. ${_sig}`,
        states:  `my states over time, stretch by stretch. ${_sig}`,
        baseline:(bd&&bd.dir==='up')?`my safety baseline increased this much this month! ${_sig}`:`my safety baseline this month. ${_sig}`,
        times:   wd?`${wd.pct}% of my ${wd.label} check-ins have safety in them. ${_sig}`:'',
        shift:   trn?`my nervous system's most common shift: ${STATE_NAME(trn.a)} to ${STATE_NAME(trn.b)}. i can see the pattern now. ${_sig}`:'',
        records: (pr&&pr.bestWeek)?`my most regulated week yet. ${_sig}`:(pr&&pr.fastest)?`my fastest comeback yet: a dip, and back in ${pr.fastest.steps<=1?'one check-in':pr.fastest.steps+' check-ins'}. ${_sig}`:'',
        flavors: (fl&&fl.length)?`my safety comes in flavors. lately it's mostly ${fl[0].label}. ${_sig}`:'',
        context: ce?`safety in my weeks tagged “${ce.label}”, next to a typical week. ${_sig}`:'',
      };
      // each share image carries the card's visual, not just words
      const SHARE_VIZ = {
        safety:  { kind:'meter', pct:safetyPct },
        day:     { kind:'meter', pct:safetyPct },
        comeback:rec?{ kind:'path', a:(dip||'fightflight'), b:'safety' }:null,
        baseline:(bd&&bd.dir==='up')?{ kind:'meter', big:'+'+Math.abs(bd.deltaPct)+'%', pct:null }:(bl?{ kind:'meter', pct:bl.basePct }:null),
        times:   wd?{ kind:'days', idx:wd.idx }:null,
        shift:   trn?{ kind:'path', a:trn.a, b:trn.b }:null,
        records: (pr&&pr.bestWeek)?{ kind:'meter', pct:pr.bestWeek.pct }:(pr&&pr.fastest)?{ kind:'path', a:pr.fastest.dom, b:'safety' }:null,
        flavors: fl?{ kind:'bars', rows:fl.map(r=>({ color:STATE_COLOR(r.key), pct:r.pct })) }:null,
        context: ce?{ kind:'bars', rows:[{ color:STATE_COLOR('safety'), pct:ce.tagPct },{ color:'#D8D2C2', pct:ce.typPct }] }:null,
        mix:     { kind:'bars', rows:ranked.slice(0,3).map(([k,n])=>({ color:STATE_COLOR(k), pct:Math.round(n/total*100) })) },
        states:  { kind:'bars', rows:ranked.slice(0,3).map(([k,n])=>({ color:STATE_COLOR(k), pct:Math.round(n/total*100) })) },
      };
      c.querySelectorAll('.panel-share').forEach(b=>b.addEventListener('click',(e)=>{ e.stopPropagation(); const k=b.dataset.share; openShare(SHARE_TXT[k]||SHARE_TXT.safety, SHARE_VIZ[k]||null); }));
      c.querySelectorAll('.distrow').forEach(b=>b.addEventListener('click',()=>screenStateDetail(b.dataset.stateDetail)));
      c.querySelectorAll('.deep-tap').forEach(b=>b.addEventListener('click',()=>screenStateDetail(b.dataset.stateDetail)));

      if(arcBuckets){
        c.querySelectorAll('.chart-wrap').forEach(wrap=>{
          const mode=wrap.dataset.cmode;
          wrap.querySelectorAll('.cpt').forEach(el=>el.addEventListener('click',()=>{ const i=+el.dataset.i, b=arcBuckets[i], r=wrap.querySelector('.arc-readout'); if(b&&r) r.textContent = mode==='safety'?`${b.label} \u00b7 ${Math.round(b.avg*100)}% safety`:`${b.label} \u00b7 ${STATE_NAME(b.dom)}`; }));
        });
      }

      const carousel=$('#carousel'); const dots=c.querySelectorAll('#dots .dot-i');
      if(carousel){ carousel.addEventListener('scroll',()=>{ const i=Math.max(0,Math.min(dots.length-1,Math.round(carousel.scrollLeft/snapUnit(carousel)))); dots.forEach((d,j)=>d.classList.toggle('on',j===i)); },{passive:true}); }
      // the dots are real controls: tap one to go to that card (keyboard/switch reachable too)
      dots.forEach((d,j)=>d.addEventListener('click',()=>{ if(!carousel) return;
        const calm=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion:reduce)').matches;
        carousel.scrollTo({left:j*snapUnit(carousel), behavior:calm?'auto':'smooth'});
      }));

      // gentle count-up to the safety figure — the card's one breath of life,
      // and only the first time it's shown per page load (not on every period/tab switch).
      if(!window._snbSafetyCounted){
        window._snbSafetyCounted = true;
        const el=c.querySelector('.safety-num-val');
        if(el){
          const target=safetyPct, dur=1100, t0=Date.now();
          const ease=x=>1-Math.pow(1-x,3);
          const calm=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion:reduce)').matches;
          if(calm){ el.textContent=target; }
          else { el.textContent='0';
            const timer=setInterval(()=>{ if(!el.isConnected){ clearInterval(timer); return; }
              const p=Math.min(1,(Date.now()-t0)/dur);
              el.textContent=Math.round(target*ease(p));
              if(p>=1){ el.textContent=target; clearInterval(timer); }
            }, 32);
          }
        }
      }
    }

    render();
  }
  const STATE_DETAIL = {
    safety:      { headline:'safety',        color:'#F4D58D', about:"Safety is your nervous system open and online, not braced for anything. It spends its energy on rest, connection, and repair instead of defense. Safety isn't the absence of hard emotions. It's having enough capacity inside to meet them.", whenDrops: null },
    fightflight: { headline:'flight/fight',color:'#E89B9B', about:"Flight/fight is mobilizing energy without enough safety yet. Your body picked up danger and mobilized to handle it. Flight first, the urge to escape, anxiety. Then fight, the urge to push back, anger. It's protection, not a flaw, even when it spills onto people you care about.", whenDrops:"Move a little on purpose, a short walk, shake out your hands, push your palms against a wall. Give the energy somewhere to go, then name the feeling under it. A long, slow exhale helps too.", practice:{practiceKey:'anchoring',sense:'movement',silence:8} },
    shutdown:    { headline:'shutdown',       color:'#A3C0DD', about:"Shutdown is the oldest brake your body has, heavy, flat, far away. Your system powered down to protect you when things got to be too much. A lot of what gets called depression is the body in shutdown. It isn't weakness, and it isn't who you are.", whenDrops:"Very small, very low demand. One sip of water, a dimmer light, one thing you can see or hear right now. You don't force your way out of shutdown. You add a little safety, and the body lets some energy come back.", practice:{practiceKey:'mindfulness',sense:'touch',silence:8} },
    play:        { headline:'play/motivation', sub:'regulated mobilization', color:'#E8A871', about:"Play is safety and energy at the same time, the social, mobilized kind shared with people you trust. On your own, the same drive shows up as motivation. It's the same fuel as flight/fight, with safety mixed in, so it runs as creativity and drive instead of defense.", whenDrops:"If the safety thins and the energy stays, watch for the tip toward flight/fight. Keep a little safety in the mix, slow down enough to feel it, and aim the energy at one thing that matters.", practice:{practiceKey:'anchoring',sense:'touch',silence:8} },
    stillness:   { headline:'stillness/intimacy', sub:'regulated immobilization', color:'#9FC498', about:"Stillness is the body slowed and quiet, without fear. The same powering-down as shutdown, but with safety mixed in, so it restores instead of collapses. On your own it's stillness; shared with someone safe, it's intimacy. A deeply regulated state.", whenDrops:"If the quiet starts to feel flat or heavy or scared instead of restful, that's the cue to add a small bit of safety, not to force yourself up and out.", practice:{practiceKey:'anchoring',sense:'sound',silence:8} },
    freeze:      { headline:'freeze',         color:'#B89AC4', about:"Freeze is a mixed state, flight/fight energy held down by shutdown. Gas and brake at once. It isn't a deeper shutdown, it's both pedals down, which is why it can feel panicked and paralyzed at the same time. A braced, protective state, not nothing.", whenDrops:"The smallest movement, plus a cue of safety. Let your eyes go where they want, then wiggle your toes or roll your wrists, slow. Don't force it, that adds gas to a slammed brake. Get smaller and safer.", practice:{practiceKey:'anchoring',sense:'touch',silence:10} },   // spectrum fix 2026-07-03: freeze starts at safety, never pendulation
  };

  function screenStateDetail(key){
    const d = STATE_DETAIL[key] || STATE_DETAIL.safety;
    clearFigures(); document.body.classList.remove('in-practice');
    root.innerHTML = `
      <header class="appbar"><button class="backbtn" id="sd-back">back</button></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#sd-back').onclick = ()=>app('current');
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    $('#content').innerHTML = `<div class="view read sd-view">
        <div class="scr-head sd-head">
          <span class="sd-marks">${triGlyph(key)}</span>
          <h2 class="scr-h">${escapeHtml(d.headline)}</h2>
        </div>
        ${d.sub ? `<p class="sd-sub" style="font-size:calc(13px * var(--type-scale));opacity:.55;margin:-2px 0 14px;letter-spacing:.02em">${escapeHtml(d.sub)}</p>` : ''}
        <p class="sd-body">${escapeHtml(d.about)}</p>
        ${d.whenDrops ? `<div class="sd-when">
          <p class="sd-when-label">when safety drops</p>
          <p class="sd-body">${escapeHtml(d.whenDrops)}</p>
        </div>` : ''}
      </div>`;
  }

  function statsHTML(cs){
    if(cs.length<3) return `<p style="font-size:11.5px;color:var(--hairline);text-align:right;margin-top:8px">${cs.length} check-in${cs.length===1?'':'s'}</p>`;
    const freq={};cs.forEach(c=>{freq[c.dom]=(freq[c.dom]||0)+1;});
    const topEntries=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    const [topKey,topCount]=topEntries[0];
    const topPct=Math.round(topCount/cs.length*100);
    const avgV=cs.reduce((s,c)=>s+c.v,0)/cs.length;
    const avgPct=Math.round(avgV*100);
    const tr=Store.trend();
    const trendTxt=tr.dir==='rising'?'rising':tr.dir==='falling'?'dipping':'steady';
    const trendArrow=tr.dir==='rising'?'↑':tr.dir==='falling'?'↓':'→';
    const variance=cs.reduce((s,c)=>s+(c.v-avgV)**2,0)/cs.length;
    const stdDev=Math.sqrt(variance);
    const volTxt=stdDev>0.22?'shifts a lot':stdDev>0.12?'some variation':'fairly consistent';
    const SEGS=['morning','afternoon','evening','late'];
    const segRows=SEGS.map(seg=>{
      const arr=cs.filter(c=>segOf(c.t)===seg);
      if(arr.length<2) return null;
      const f={};arr.forEach(c=>{f[c.dom]=(f[c.dom]||0)+1;});
      const [sk]=Object.entries(f).sort((a,b)=>b[1]-a[1])[0];
      return {seg,key:sk};
    }).filter(Boolean);
    return `
      <div class="hr"></div>
      <button class="stats-toggle" id="p-stats-toggle" aria-expanded="false">
        <span class="eyebrow" style="margin:0">your patterns</span>
        <span class="stats-tog-icon">+</span>
      </button>
      <div class="stats-body" id="p-stats-body">
      <div class="stat-rows" style="margin-top:8px">
        <button class="stat-row stat-row-tap" data-state-detail="${topKey}">
          <span class="stat-row-lbl">most often in</span>
          <span class="stat-row-val">
            ${stateMarks(topKey)}
            ${STATE_NAME(topKey)} <span style="color:var(--muted);font-weight:400">${topPct}%</span>
            <span style="color:var(--hairline);margin-left:2px">›</span>
          </span>
        </button>
        <div class="stat-row">
          <span class="stat-row-lbl">average safety</span>
          <span class="stat-row-val">
            <span class="safety-track"><span class="safety-fill" style="width:${avgPct}%"></span></span>
            ${avgPct}% <span class="stat-trend">${trendArrow} ${trendTxt}</span>
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-row-lbl">consistency</span>
          <span class="stat-row-val" style="color:var(--muted);font-weight:400">${volTxt}</span>
        </div>
      </div>
      ${segRows.length>=2?`
      <div class="hr"></div>
      <p class="eyebrow" style="margin:0 0 12px">by time of day</p>
      <div class="stat-rows">
        ${segRows.map(s=>`
        <div class="stat-row">
          <span class="stat-row-lbl">${s.seg}</span>
          <span class="stat-row-val">
            ${stateMarks(s.key)}
            ${STATE_NAME(s.key)}
          </span>
        </div>`).join('')}
      </div>`:''}
      <p style="font-size:11.5px;color:var(--hairline);text-align:right;margin-top:14px">${cs.length} check-in${cs.length===1?'':'s'}</p>
      </div>
    `;
  }
  function legendHTML(cs){
    const present = [...new Set(cs.map(c=>c.dom))];
    return `<div class="statelegend">${present.map(k=>`<span class="it">${stateMarks(k)}${STATE_NAME(k)}</span>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------- PRACTICE
  // The player (player.html) is embedded full-bleed with no top chrome — the bottom
  // tab bar is the only navigation, and it hides once a session is playing. The
  // practice tab opens the player's own 4-option chooser (incl. "More meditations").
  function practiceShell(src, reco){
    haptic('start');               // soft tap as the practice begins (Begin tap = user gesture)
    currentTab = 'practice';
    setHTML(`
      <div class="weaver-wrap">
        <div class="weaver-loading" id="weaver-loading" aria-live="polite"><span class="wl-ring" aria-hidden="true"></span><span class="wl-txt">preparing your practice</span></div>
        <iframe class="weaver-frame" id="weaver" src="${src}" title="guided practice" allow="autoplay; screen-wake-lock"></iframe>
      </div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`);
    // quiet placeholder until the player document has loaded (it then shows its
    // own "preparing your audio" line) — never a blank screen after "begin".
    // N-5: if it hasn't loaded after ~10s, say so instead of waiting forever.
    const _wf=$('#weaver'), _wl=$('#weaver-loading');
    let _wlDone=false;
    const _wlTimeout=setTimeout(()=>{
      if(_wlDone||!_wl) return;
      _wl.innerHTML='<span class="wl-txt">can’t load the practice right now. check your connection and try again.</span><button class="set-quiet actionbar-aux" id="wl-back" style="margin-top:14px">back</button>';
      const b=document.getElementById('wl-back'); if(b) b.onclick=()=>app('practice');
    }, 10000);
    if(_wf&&_wl) _wf.addEventListener('load',()=>{ _wlDone=true; clearTimeout(_wlTimeout); _wl.classList.add('gone'); setTimeout(()=>{ try{_wl.remove();}catch(e){} },600); });
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    window._pendingReco = reco || Store.recommend();   // so a completed session still shows the “you came back” screen
  }
  // ---------------------------------------------------------------- PRACTICE CHOOSER DATA
  const P_OPTS=[
    {key:'micro',      title:'a tiny practice',          sub:'about two minutes, one sense, done'},
    {key:'mindfulness',title:'simple mindfulness',       sub:'the gentlest, a calm place to start'},
    {key:'anchoring',  title:'connect with safety',      sub:'settling in through your senses'},
    {key:'most',       title:'practice self-regulation', sub:'the deepest, meeting what is hard'},
    {key:'more',       title:'more meditations',         sub:'standalone guided sessions'},
  ];
  const P_SENSES=['touch','sound','sight','movement','imagination'];
  const P_SKILLS=[['validate','validate & normalize'],['imagery','imagery & invitation'],['obstacles','obstacles'],['balancing','balancing'],['pendulation','pendulation']];
  const P_SILENCE=[[4,'a little'],[8,'some'],[12,'a lot']];
  const P_MEDS=[
    {id:'uye',                 title:'Use Your Ears',       est:'~10 min', sub:'grounding through sound'},
    {id:'eye',                 title:'Use Your Eyes',       est:'~9 min',  sub:'grounding through sight'},
    {id:'daily-dysregulation', title:'Daily Dysregulation', est:'~16 min', sub:'meeting a recent activation'},
    {id:'outside-the-cave',    title:'Outside the Cave',    est:'~32 min', sub:'a deeper imagery journey'},
  ];
  let pState=null;

  // Practice opens on a personalized "for you" view: a context line tuned to the
  // last check-in, and one track-colored card the Curriculum Advisor recommends.
  // Tapping it opens the plan reader. "choose another way" reveals the full chooser.
  function tabPractice(){
    const reco = Store.recommend();
    // the recommender's preset dials (describe-the-defense / hold & watch, both
    // gate-checked in store.js) seed the customizer so "change this practice"
    // starts from the tuned shape.
    pState = { key:null, sense:reco.sense||'touch', skill:reco.skill||'imagery', silence:reco.silence||8, med:null,
               holdWatch:!!reco.holdWatch, holdSeconds:reco.holdWatchTargetSeconds||60, open:false, emotion:null };
    renderPracticeChooser(true);   // animate the tuned card in on tab arrival only
  }

  // (the old "for you" pre-screen \u2014 renderForYou/practiceContextLine \u2014 was dead
  // code since the chooser became the practice tab's landing view; removed.)

  // Estimated session length in minutes, by practice + chosen silence. Derived
  // from the player's own clip durations + gap rules (DUR/build/gapAfter in
  // player.html), computed offline; midpoints across senses/skills.
  const PRACTICE_EST = { micro:{4:2,8:2,12:2}, mindfulness:{4:6,8:7,12:8}, anchoring:{4:8,8:9,12:11}, most:{4:11,8:13,12:15} };
  function estMinutes(key, sil){
    const t = PRACTICE_EST[key]; if(!t) return null;
    const s = [4,8,12].reduce((b,x)=>Math.abs(x-(sil||8))<Math.abs(b-(sil||8))?x:b, 8);
    return t[s] || null;
  }

  // Plan reader: a calm, full read of the recommended practice before it starts —
  // what it is, its shape, why it was chosen — with Begin / change.
  // sentence-case a lowercase advisor string for the blog-styled plan screen
  function properCase(s){ return String(s==null?'':s).replace(/(^|[.!?]\s+)([a-z])/g,(m,p,c)=>p+c.toUpperCase()).replace(/\bi\b/g,'I').replace(/\bi(['’])/g,'I$1'); }
  function renderPlan(reco, from){
    from = from || 'practice';   // where "back" returns to: the chooser, or today's row
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    currentTab = 'practice';
    const tk = trackOf(reco.practiceKey);
    const planNm = Store.getName();
    const planTitle = planNm ? `${escapeHtml(planNm)}’s custom practice` : 'Your custom practice';
    const chLabel = reco.challenge!=null ? Store.challengeLabel(reco.challenge) : null;
    // the customized items used to be a separate key/value list; they now live inside
    // "what to expect" as track-colored tokens woven into the sentence.
    const hl = (s)=>`<span class="plan-hl">${escapeHtml(String(s))}</span>`;
    const planEst = estMinutes(reco.practiceKey, reco.silence);
    const shapeBits = [
      (reco.practiceKey!=='mindfulness' && reco.sense) ? `anchored through ${hl(reco.sense)}` : null,
      reco.skill ? `practicing ${hl(skillLabel(reco.skill))}` : null,
      reco.descDefense ? `${hl('describing the defense')} out loud` : null,
      reco.holdWatch ? `${hl('holding both')} for ${hl(holdDurWords(reco.holdWatchTargetSeconds||30))}` : null,
      `with ${hl(silLabel(reco.silence))} silence between guidance`,
      chLabel ? `challenge level at ${hl(chLabel)}` : null,
      planEst ? `about ${hl(planEst+' minutes')} in all` : null,
    ].filter(Boolean);
    const joinList = (a)=> a.length<=1 ? (a[0]||'') : a.slice(0,-1).join(', ')+' and '+a[a.length-1];
    const shapedSentence = shapeBits.length ? `Tuned for you, ${joinList(shapeBits)}.` : '';
    root.innerHTML = `
      <header class="appbar"><button class="backbtn" id="plan-back">back</button></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#plan-back').onclick = ()=>app(from);
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    $('#content').innerHTML = `<div class="view plan-view track-${tk.cls}">
      <div class="plan-head">
        <p class="eyebrow"></p>
        <div class="plan-titlerow">
          <span class="plan-rail" aria-hidden="true"></span>
          <h1 class="plan-title">${planTitle}</h1>
        </div>
      </div>
      <div class="plan-sec">
        <p class="sec-h">Why this practice was chosen for you</p>
        <p class="plan-why">${escapeHtml(properCase(reco.reason))}</p>
      </div>
      <div class="plan-sec">
        <p class="sec-h">What to expect in your custom practice</p>
        <p class="plan-about">${escapeHtml(properCase(aboutOf(reco.practiceKey, reco.sense)))}</p>
        ${shapedSentence?`<p class="plan-about plan-shaped">${shapedSentence}</p>`:''}
      </div>
      <div class="plan-actions">
        <button class="set-quiet actionbar-aux" id="plan-change">change this practice</button>
        <button class="btn block" id="plan-begin">begin</button>
      </div>
    </div>`;
    $('#plan-begin').onclick = ()=>launchWeaver(reco);
    $('#plan-change').onclick = ()=>{
      app('practice');
      // open the chooser already on this practice, with its current shape selected
      pState = { key:(reco.practiceKey==='more'?null:reco.practiceKey), sense:reco.sense||'touch', skill:reco.skill||'imagery', silence:reco.silence||8, med:null,
                 holdWatch:!!reco.holdWatch, holdSeconds:reco.holdWatchTargetSeconds||60, open:false, emotion:null };
      renderPracticeChooser();
    };
  }

  function renderPracticeChooser(animateIn){
    const c=content();
    const {key,sense,skill,silence,med}=pState;

    // per-practice icons: the breath ring for mindfulness, the brand heart for
    // safety, the brand bolt for self-regulation (matching the player's tinting),
    // headphones for the session library — each in its track's ink color.
    const P_ICO = {
      micro:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
      mindfulness: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>',
      anchoring:   ico('heart',{color:'var(--track-safety-ink)'}),
      // self-regulation meets BOTH defenses, so it carries both marks (bolt + x)
      most:        `<span class="p-ico-pair">${ico('bolt',{color:'var(--track-self-ink)'})}${ico('x',{color:'var(--track-self-ink)'})}</span>`,
      more:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4.2" height="7" rx="1.6"/><rect x="17.3" y="13" width="4.2" height="7" rx="1.6"/></svg>',
    };
    const selCard=(o,dataAttr,selected)=>`
      <button class="wincard p-opt${selected?' p-sel':''}" ${dataAttr}>
        <span class="p-opt-ico" aria-hidden="true">${P_ICO[o.key]||''}</span>
        <span class="wc-text">
          <span class="wc-title">${escapeHtml(o.title)}</span>
          <span class="wc-reason">${escapeHtml(o.sub)}</span>
        </span>
        <span class="wc-go">${CHEV}</span>
      </button>`;

    const chip=(lbl,val,attr,on)=>
      `<button class="p-chip${on?' on':''}" data-${attr}="${escapeHtml(String(val))}">${escapeHtml(lbl)}</button>`;

    // micro keeps decisions tiny: three senses only (movement & imagination need
    // the full anchoring ladder), no silence question (fixed short gaps)
    const senseList = key==='micro' ? ['touch','sound','sight'] : P_SENSES;
    const refineHTML=(key&&key!=='more')?`
      <div class="p-refine">
        ${key!=='mindfulness'?`<div class="p-rgroup">
          <p class="dash-prompt">what would you like to anchor with?</p>
          <div class="p-chips">${senseList.map(s=>chip(s,s,'sense',s===sense)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup">
          <p class="dash-prompt">which skill do you want to practice?</p>
          <div class="p-chips">${P_SKILLS.map(([v,l])=>chip(l,v,'skill',v===skill)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup">
          <p class="dash-prompt">working with anything today?</p>
          <div class="p-chips">${[['','let it surface']].concat(Store.EMOTION_FAMILIES.map(f=>[f.key,f.label])).map(([v,l])=>
            `<button class="p-chip${(pState.emotion||'')===v?' on':''}" data-emo="${escapeHtml(v)}">${escapeHtml(l)}</button>`).join('')}</div>
          <p class="ch-cap" id="p-emo-hint">${(()=>{const f=Store.EMOTION_FAMILIES.find(x=>x.key===pState.emotion);return f?escapeHtml(f.hint):'choosing ahead of time helps you notice it when it arrives. optional.';})()}</p>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup" id="p-hw-group" style="${(skill==='balancing'||skill==='pendulation')?'':'display:none'}">
          <p class="dash-prompt">add hold &amp; watch?</p>
          <div class="p-chips">${[[true,'hold & watch'],[false,'skip it']].map(([v,l])=>chip(l,v,'holdwatch',v===!!pState.holdWatch)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup" id="p-hd-group" style="${((skill==='balancing'||skill==='pendulation')&&pState.holdWatch)?'':'display:none'}">
          <p class="dash-prompt">how long to hold &amp; watch?</p>
          <div class="p-chips">${[[30,'30 sec'],[60,'1 min'],[90,'90 sec'],[120,'2 min']].map(([v,l])=>chip(l,v,'holdsec',v===pState.holdSeconds)).join('')}</div>
        </div>`:''}
        ${key!=='micro'?`<div class="p-rgroup">
          <p class="dash-prompt">how much silence between guidance?</p>
          <div class="p-chips">${P_SILENCE.map(([v,l])=>chip(l,v,'sil',v===silence)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup">
          <p class="dash-prompt">how long would you like to practice?</p>
          <div class="p-chips">${[[false,'a complete practice'],[true,'open-ended']].map(([v,l])=>chip(l,v,'open',v===!!pState.open)).join('')}</div>
        </div>`:''}
        <p class="ch-cap p-expect" id="p-expect">${expectText(key, sense, skill, silence, pState.holdWatch, pState.holdSeconds, pState.open)}</p>
        ${key==='most'?'<button class="p-surprise" id="p-surprise">surprise me</button>':''}
      </div>`:'';

    const medsHTML=key==='more'?`
      <div class="p-med-list">
        ${P_MEDS.map(m=>`<button class="p-med-row${med===m.id?' on':''}" data-pmed="${m.id}">
          <span class="p-med-title">${escapeHtml(m.title)}</span>
          <span class="p-med-meta">${escapeHtml(m.est)} · ${escapeHtml(m.sub)}</span>
        </button>`).join('')}
      </div>`:'';

    const canBegin=!!(key&&(key!=='more'||med));

    const reco = Store.recommend();
    const tk = trackOf(reco.practiceKey);
    const tunedNm = Store.getName();
    const tunedHeading = tunedNm ? `${escapeHtml(tunedNm)}'s custom practice` : 'your custom practice';
    const _tEst = estMinutes(reco.practiceKey, reco.silence);
    const tunedCard = `
      <button class="wincard tuned-card track-${tk.cls}${animateIn?' tc-in':''}" id="foryou">
        <span class="wc-text">
          <span class="tuned-kicker">made for you</span>
          <span class="wc-title">${tunedHeading}</span>
          <svg class="tuned-line" viewBox="0 0 120 6" preserveAspectRatio="none" aria-hidden="true"><path d="M2 4 C 30 1.5, 70 5.5, 118 2.5" pathLength="1"/></svg>
          <span class="wc-reason">${escapeHtml(reco.reason)}</span>
          ${_tEst ? `<span class="tuned-meta">about ${_tEst} min · ${escapeHtml(Store.practiceLabel(reco.practiceKey))}</span>` : ''}
        </span>
        <span class="wc-go">${CHEV}</span>
      </button>`;

    // heading-friendly short names: "adjust your safety practice", never
    // "adjust your connect with safety practice" / "your a tiny practice practice"
    const P_ADJUST = { anchoring:'safety', micro:'tiny', mindfulness:'mindfulness' };
    const heading = !key ? 'your practice, or choose another.'
      : (key==='more' ? 'choose a session.'
      : `adjust your <span class="p-adjust-name">${escapeHtml(P_ADJUST[key]||Store.practiceLabel(key))}</span> practice.`);

    c.innerHTML=`<div class="view p-view${key?' track-'+trackOf(key).cls:''}">
      <div class="scr-head">
        <p class="eyebrow"></p>
        <h2 class="scr-h">${heading}</h2>
        ${key&&key!=='more'?`<svg class="p-adjust-line" viewBox="0 0 120 6" preserveAspectRatio="none" aria-hidden="true"><path d="M2 4 C 30 1.5, 70 5.5, 118 2.5" pathLength="1"/></svg>`:''}
      </div>
      <div class="p-bottom">
        ${!key
          ? `${tunedCard}<div class="p-opts" id="p-opts-list">${P_OPTS.map(o=>selCard(o,`data-pkey="${o.key}"`,key===o.key)).join('')}</div>`
          : `${refineHTML}${medsHTML}`}
      </div>
      ${key?`<div class="actionbar">
        <button class="set-quiet actionbar-aux" id="p-cancel">back</button>
        <button class="btn block" id="p-begin"${canBegin?'':' disabled'}>begin</button>
      </div>`:''}
    </div>`;

    c.querySelectorAll('[data-pkey]').forEach(b=>b.onclick=()=>{pState.key=pState.key===b.dataset.pkey?null:b.dataset.pkey;pState.med=null;renderPracticeChooser();});
    const cancelBtn=$('#p-cancel'); if(cancelBtn) cancelBtn.onclick=()=>{pState.key=null;pState.med=null;renderPracticeChooser();};
    c.querySelectorAll('[data-pmed]').forEach(b=>b.onclick=()=>{
      pState.med=b.dataset.pmed;
      c.querySelectorAll('[data-pmed]').forEach(r=>r.classList.toggle('on',r.dataset.pmed===pState.med));
      const bb=$('#p-begin'); if(bb){bb.disabled=false;bb.removeAttribute('disabled');}
    });
    // the live "what to expect" paragraph rebuilds (with a soft crossfade) on every chip tap
    const updExpect=()=>{ const el=$('#p-expect'); if(el){ el.classList.remove('cap-in'); void el.offsetWidth;
      el.textContent=expectText(pState.key, pState.sense, pState.skill, pState.silence, pState.holdWatch, pState.holdSeconds, pState.open); el.classList.add('cap-in'); } };
    c.querySelectorAll('[data-sense]').forEach(b=>b.onclick=()=>{
      pState.sense=b.dataset.sense;
      c.querySelectorAll('[data-sense]').forEach(r=>r.classList.toggle('on',r.dataset.sense===pState.sense));
      updExpect();
    });
    c.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{
      pState.skill=b.dataset.skill;
      c.querySelectorAll('[data-skill]').forEach(r=>r.classList.toggle('on',r.dataset.skill===pState.skill));
      // hold & watch is offered only for balancing / pendulation — show/hide its group as skill changes
      const hwg=$('#p-hw-group'); if(hwg) hwg.style.display=(pState.skill==='balancing'||pState.skill==='pendulation')?'':'none';
      const hdg0=$('#p-hd-group'); if(hdg0) hdg0.style.display=((pState.skill==='balancing'||pState.skill==='pendulation')&&pState.holdWatch)?'':'none';
      updExpect();
    });
    c.querySelectorAll('[data-emo]').forEach(b=>b.onclick=()=>{
      pState.emotion = b.dataset.emo || null;
      c.querySelectorAll('[data-emo]').forEach(r=>r.classList.toggle('on',(r.dataset.emo||null)===pState.emotion));
      const h=$('#p-emo-hint');
      if(h){ const f=Store.EMOTION_FAMILIES.find(x=>x.key===pState.emotion);
        h.textContent = f ? f.hint : 'choosing ahead of time helps you notice it when it arrives. optional.'; }
    });
    c.querySelectorAll('[data-holdwatch]').forEach(b=>b.onclick=()=>{
      pState.holdWatch=b.dataset.holdwatch==='true';
      c.querySelectorAll('[data-holdwatch]').forEach(r=>r.classList.toggle('on',(r.dataset.holdwatch==='true')===pState.holdWatch));
      const hdg=$('#p-hd-group'); if(hdg) hdg.style.display=(pState.holdWatch&&(pState.skill==='balancing'||pState.skill==='pendulation'))?'':'none';
      updExpect();
    });
    c.querySelectorAll('[data-holdsec]').forEach(b=>b.onclick=()=>{
      pState.holdSeconds=+b.dataset.holdsec;
      c.querySelectorAll('[data-holdsec]').forEach(r=>r.classList.toggle('on',+r.dataset.holdsec===pState.holdSeconds));
      updExpect();
    });
    c.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{
      pState.open=b.dataset.open==='true';
      c.querySelectorAll('[data-open]').forEach(r=>r.classList.toggle('on',(r.dataset.open==='true')===pState.open));
      updExpect();
    });
    c.querySelectorAll('[data-sil]').forEach(b=>b.onclick=()=>{
      pState.silence=+b.dataset.sil;
      c.querySelectorAll('[data-sil]').forEach(r=>r.classList.toggle('on',r.dataset.sil===String(pState.silence)));
      updExpect();
    });

    const surpriseBtn=$('#p-surprise');
    if(surpriseBtn)surpriseBtn.onclick=()=>{
      const rskill=P_SKILLS[Math.floor(Math.random()*P_SKILLS.length)][0];
      const rsense=P_SENSES[Math.floor(Math.random()*P_SENSES.length)];
      const rsilence=P_SILENCE[Math.floor(Math.random()*P_SILENCE.length)][0];
      const rhw=(rskill==='balancing'||rskill==='pendulation')?(Math.random()<0.5):false;
      const rhs=[30,60,90,120][Math.floor(Math.random()*4)];
      practiceShell('player.html?'+new URLSearchParams({embed:'1',autostart:'1',practice:'most',sense:rsense,silence:String(rsilence),skill:rskill,holdwatch:rhw?'1':'',holdsecs:rhw?String(rhs):''}).toString(),{practiceKey:'most',sense:rsense,skill:rskill,silence:rsilence,holdWatch:rhw,holdWatchTargetSeconds:(rhw?rhs:null)});
    };

    const tuned=$('#foryou'); if(tuned) tuned.onclick=()=>renderPlan(reco);
    const beginBtn=$('#p-begin');
    // attach regardless of initial canBegin: for "More meditations" the button starts
    // disabled (no session picked yet) and is enabled when a session is chosen — but the
    // handler must already be wired, or clicking the enabled button does nothing.
    if(beginBtn)beginBtn.onclick=()=>{
      const {key,sense,skill,silence,med}=pState;
      let src;
      if(key==='more'){
        src='player.html?embed=1&autostart=1&more=1&med='+encodeURIComponent(med);
      }else{
        const sil = key==='micro' ? 2 : silence;   // micro runs on fixed short gaps
        const ps={embed:'1',autostart:'1',practice:key,sense,silence:String(sil)};
        if(key==='most')ps.skill=skill;
        if(key==='most'&&(skill==='balancing'||skill==='pendulation')&&pState.holdWatch){ps.holdwatch='1';ps.holdsecs=String(pState.holdSeconds||60);}
        if(key==='most'&&pState.open)ps.open='1';
        src='player.html?'+new URLSearchParams(ps).toString();
      }
      practiceShell(src,{practiceKey:key,sense,skill,silence:(key==='micro'?2:silence),holdWatch:!!pState.holdWatch,holdWatchTargetSeconds:(pState.holdWatch?(pState.holdSeconds||60):null),openEnded:(key==='most'?!!pState.open:false),emotionIntent:(key==='most'?(pState.emotion||null):null)});
    };
  }

  // Today's "a practice for now" row → one-tap autostart of the recommended practice,
  // same full-bleed shell (tab bar for nav, no top header).
  function launchWeaver(reco){
    // Defense in depth: an anonymous guest must never reach the self-regulation
    // ("most") track — it needs an established safety baseline. The guest UI can't
    // produce this key, but refuse it here regardless.
    if(reco && reco.practiceKey==='most' && Store.isAnonymous && Store.isAnonymous()){
      showToast("that practice opens once you've saved an account."); return;
    }
    const params = { embed:'1', autostart:'1', practice:reco.practiceKey, sense:reco.sense||'touch', silence:String(reco.silence||8) };
    if(reco.skill) params.skill = reco.skill;
    // recommender-preset dials ride into the player (both already gate-checked in
    // store.js: describe-the-defense by the rung ladder, hold & watch by baseline 4).
    if(reco.practiceKey==='most' && reco.descDefense) params.descdef = '1';
    if(reco.practiceKey==='most' && reco.holdWatch && (reco.skill==='balancing'||reco.skill==='pendulation')){
      params.holdwatch='1'; params.holdsecs=String(reco.holdWatchTargetSeconds||30);
    }
    practiceShell('player.html?'+new URLSearchParams(params).toString(), reco);
  }

  // weaver -> app messages
  window.addEventListener('message', (e)=>{
    const m = e.data || {};
    if(m.type !== 'snb-weaver') return;
    if(m.event === 'screen'){ document.body.classList.toggle('in-practice', m.screen==='player'); return; }
    const reco = window._pendingReco;
    if(!reco) return;
    // merge the player's final, actually-practiced config + telemetry onto the reco, so
    // the logged session reflects any in-player tweaks (skill/sense/silence/describe-the-
    // defense), the guided meditation chosen, endless mode + loop count, and hold-both time.
    if(m.event === 'complete' || m.event === 'exit'){
      if(reco.practiceKey==='most' && m.skill!==undefined) reco.skill=m.skill;
      if(m.sense!==undefined && m.sense!==null) reco.sense=m.sense;
      if(typeof m.silence==='number') reco.silence=m.silence;
      if(m.descDefense!==undefined) reco.descDefense=m.descDefense;
      if(m.meditationId!==undefined) reco.meditationId=m.meditationId;
      if(m.openEnded!==undefined) reco.openEnded=m.openEnded;
      if(typeof m.loops==='number') reco.loops=m.loops;
      if(m.holdWatch!==undefined) reco.holdWatch=m.holdWatch;
      if(typeof m.holdWatchSeconds==='number') reco.holdWatchSeconds=m.holdWatchSeconds;
      if(typeof m.holdWatchTargetSeconds==='number') reco.holdWatchTargetSeconds=m.holdWatchTargetSeconds;
    }
    // Guest flow: no tabbar screens. A completed practice hands off to save-invite;
    // an early exit returns to the guest reflection (never renderFeedback/app()).
    if(inGuest()){
      // One practice per guest — whether they finished it or left early, the next step is
      // the save screen, not another pick. (Previously an early exit dropped back to the
      // reflection, where they could start another practice, and another, forever.)
      _guestPracticed = true;
      // Completed → land first (a beat with no ask), THEN the save invite. Left early →
      // they already opted out of the practice; no landing beat, straight to the offer.
      if(m.event === 'complete'){ haptic('complete'); logSession(reco, true, false, m.minutes); guestLanding(); }
      else if(m.event === 'exit'){ logSession(reco, false, true, m.minutes); guestSaveInvite('exit'); }
      return;
    }
    if(m.event === 'complete'){ haptic('complete'); logSession(reco, true, false, m.minutes); renderFeedback(reco); }
    else if(m.event === 'exit'){ logSession(reco, false, true, m.minutes); renderExitReason(); }
  });
  function logSession(reco, completed, endedEarly, minutes){
    // Defense in depth: never log a self-regulation ('most') session for an
    // anonymous guest (the guest UI cannot produce one; refuse it regardless).
    if(reco && reco.practiceKey==='most' && Store.isAnonymous && Store.isAnonymous()) return;
    if(window._sessionLogged) return; window._sessionLogged=true;
    // skills exist only on the self-regulation ('most') track. Gate here at the save
    // boundary so no non-'most' session can inherit a leftover default skill (e.g. the
    // customizer's default 'imagery'). This is the authoritative write for every path.
    const _isMost = reco.practiceKey==='most';
    const _skill = _isMost ? (reco.skill||null) : null;
    // beginner vs advanced self-regulation: pendulation or a high challenge appetite = advanced.
    const _selfRegLevel = _isMost ? ((_skill==='pendulation' || (typeof reco.challenge==='number' && reco.challenge>=0.78)) ? 'advanced' : 'beginner') : null;
    Store.addSession({ practiceKey:reco.practiceKey, skill:_skill, sense:reco.sense, silence:reco.silence,
      completed:!!completed, endedEarly:!!endedEarly, minutes:minutes||null, domBefore:reco.domBefore||null,
      challenge:(typeof reco.challenge==='number' ? reco.challenge : null),
      selfRegLevel:_selfRegLevel,
      descDefense:(_isMost ? !!reco.descDefense : null),
      emotionIntent:(_isMost ? (reco.emotionIntent||null) : null),
      meditationId:(reco.meditationId||null),
      openEnded:(reco.openEnded!=null ? !!reco.openEnded : null),
      loops:(typeof reco.loops==='number' ? reco.loops : null),
      holdWatch:(reco.holdWatch!=null ? !!reco.holdWatch : null),
      holdWatchSeconds:(typeof reco.holdWatchSeconds==='number' ? reco.holdWatchSeconds : null),
      holdWatchTargetSeconds:(typeof reco.holdWatchTargetSeconds==='number' ? reco.holdWatchTargetSeconds : null) });
    setTimeout(()=>{ window._sessionLogged=false; }, 1000);
  }
  // Early exit: an optional one-tap read on WHY — too hard, too easy, pulled away —
  // logged onto the session like completion feedback. No guilt, fully skippable,
  // then lands back on the practice tab.
  const EXIT_OPTS = [
    { key:'exit-hard',       label:'it was too hard right now' },
    { key:'exit-easy',       label:'it was too easy' },
    { key:'exit-distracted', label:'i got pulled away' },
    { key:'exit-enough',     label:'i got what i needed' },
  ];
  function renderExitReason(){
    setHTML(`
      <header class="appbar"></header>
      <div class="scroll"><div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">ended early</p>
          <h1 class="scr-h">no problem. want to say why?</h1>
          <p class="scr-lede">totally optional. it helps tune your next practice.</p>
        </div>
        <div class="fb-opts">
          ${EXIT_OPTS.map(o=>`<button class="fb-opt" data-fb="${o.key}">${o.label}</button>`).join('')}
        </div>
        <button class="navlink" id="fb-skip" style="align-self:center;margin-top:18px">skip</button>
      </div></div>`);
    root.querySelectorAll('.fb-opt').forEach(b=>b.onclick=()=>{ try{ Store.noteExit(b.dataset.fb); }catch(e){} haptic('save'); app('practice'); });
    const sk=$('#fb-skip'); if(sk) sk.onclick=()=>app('practice');
  }

  // Post-practice: a gentle read of how the body landed. Logged onto the session
  // (feeds the advisor over time), then a soft hand-off to a check-in or back home.
  const FB_OPTS = [
    { key:'more',    label:'more connected and present' },
    { key:'same',    label:'about the same' },
    { key:'less',    label:'less connected and present' },
    { key:'struggle',label:'struggled with this one' },
    { key:'unsure',  label:'not sure' },
  ];
  function renderFeedback(reco){
    // v2: the body-feeling answer now SELECTS (instead of advancing), and an
    // optional "did anything surface?" family row sits beneath it — both save on
    // continue. surfaced uses the same curated families as the customizer (plus
    // settled), so regulation becomes visible: what came up vs what they chose.
    const isMost = reco && reco.practiceKey==='most';
    const emoChip = f => `<button class="p-chip fb-emo" data-emosurf="${f.key}">${escapeHtml(f.label)}</button>`;
    setHTML(`
      <header class="appbar"></header>
      <div class="scroll"><div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">share your experience</p>
          <h1 class="scr-h">how does your system feel now?</h1>
          <p class="scr-lede">there’s no right answer here. just notice where you are now, compared to where you started.</p>
        </div>
        <div class="fb-opts">
          ${FB_OPTS.map(o=>`<button class="fb-opt" data-fb="${o.key}">${o.label}</button>`).join('')}
        </div>
        ${isMost?`<div class="fb-surf">
          <p class="dash-prompt">did anything surface?</p>
          <p class="ch-cap">whatever showed up while you practiced — even if it wasn’t what you chose. pick any that fit. optional.</p>
          <div class="p-chips">${Store.EMOTION_SURFACED.map(emoChip).join('')}</div>
        </div>`:''}
        <button class="btn block" id="fb-continue" disabled style="margin-top:18px">continue</button>
        <button class="navlink" id="fb-skip" style="align-self:center;margin-top:12px">skip</button>
      </div></div>`);
    let fbSel=null; const surfSel=new Set();   // surfaced is MULTI-select: several families can show up in one session
    const cont=$('#fb-continue');
    root.querySelectorAll('.fb-opt').forEach(b=>b.onclick=()=>{
      fbSel=b.dataset.fb;
      root.querySelectorAll('.fb-opt').forEach(r=>r.classList.toggle('on',r.dataset.fb===fbSel));
      if(cont){ cont.disabled=false; cont.removeAttribute('disabled'); }
    });
    root.querySelectorAll('[data-emosurf]').forEach(b=>b.onclick=()=>{
      const k=b.dataset.emosurf;
      if(surfSel.has(k)) surfSel.delete(k); else surfSel.add(k);   // tap toggles each family
      b.classList.toggle('on', surfSel.has(k));
    });
    if(cont) cont.onclick=()=>{
      if(!fbSel) return;
      try{ Store.noteFeedback(fbSel); }catch(e){}
      if(surfSel.size){ try{ Store.noteSurfaced(Array.from(surfSel)); }catch(e){} }
      haptic('save'); fbThanks(fbSel);
    };
    const sk=$('#fb-skip'); if(sk) sk.onclick=()=>app('today');
  }
  function fbThanks(val){
    // closing line in Justin's voice — the report tunes the tone, never judges it
    const CLOSE = {
      more:    { h:'something shifted toward connection.', s:"that's worth a small pat on your nervous system's back." },
      same:    { h:'no major change, but you showed up.',  s:"that's a solid rep and your system thanks you for it." },
      less:    { h:'you stayed with it.',                  s:"that's not nothing. imperfect practice is still practice. take the next one easier and work your way back. don't rush it." },
      struggle:{ h:'hard ones are still practice.',        s:"you're still here. you showed up. struggling with practices is very normal. come back to it when you're ready, but maybe focus on an easier skill. customize the next practice to your content." },
      unsure:  { h:'not knowing is allowed.',             s:'you still showed up. well done. stay curious and open for the next one.' },
    };
    const cl = CLOSE[val] || CLOSE.same;
    setHTML(`
      <header class="appbar"></header>
      <div class="scroll"><div class="view fb-view fb-thanks">
        <div class="settle" aria-hidden="true">
          <span class="settle-ico settle-bolt">${ico('bolt',{color:STATE_COLOR('fightflight')})}</span>
          <span class="settle-ico settle-heart">${ico('heart',{color:STATE_COLOR('safety')})}</span>
          <span class="settle-ico settle-x">${ico('x',{color:STATE_COLOR('shutdown')})}</span>
        </div>
        <div class="scr-head fb-thanks-head">
          <h1 class="scr-h">${cl.h}</h1>
          <p class="scr-lede">${cl.s}</p>
        </div>
        <p class="settle-note">safety doesn't erase the rest. it just holds them.</p>
        <div class="fb-after">
          <button class="btn block" id="fb-checkin">check in now</button>
          <button class="navlink" id="fb-home" style="align-self:center">back to today</button>
        </div>
      </div></div>`);
    requestAnimationFrame(()=>{ const s=root.querySelector('.settle'); if(s) s.classList.add('on'); });
    // N-7: a check-in started from here is tagged post-practice, so "is practice
    // helping?" can use clean before/after pairs instead of day-level inference
    $('#fb-checkin').onclick = ()=>{ window._ciSource='post-practice'; screenCheckin(); };
    $('#fb-home').onclick = ()=>app('today');
  }

  // ---------------------------------------------------------------- YOU
  // ---- offline ("save all practices") — bulk precache into the existing snb-audio-v1 SW cache ----
  const OFFLINE_FLAG = 'snb_offline_all';
  async function offlineManifest(){
    try{ const r = await fetch('./offline-manifest.json', {cache:'no-store'}); if(!r.ok) return [];
      const arr = await r.json(); return (Array.isArray(arr)?arr:[]).map(p=>new URL(p, location.href).href); }
    catch(e){ return []; }
  }
  async function offlineCachedCount(){
    try{ const c = await caches.open('snb-audio-v1'); const keys = await c.keys();
      return keys.filter(req=>/\/(clips|packs)\//.test(new URL(req.url).pathname)).length; }catch(e){ return 0; }
  }
  // post the clip list to the SW, which bulk-caches with progress; resolves when done
  async function downloadOffline(urls, onProgress){
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active || navigator.serviceWorker.controller;
    if(!sw) throw new Error('no active service worker');
    return new Promise((resolve)=>{
      const onMsg = (ev)=>{ const d = ev.data||{};
        if(d.type==='PRECACHE_PROGRESS'){ try{ onProgress && onProgress(d); }catch(e){} }
        else if(d.type==='PRECACHE_DONE'){ navigator.serviceWorker.removeEventListener('message', onMsg); resolve(d); } };
      navigator.serviceWorker.addEventListener('message', onMsg);
      sw.postMessage({ type:'PRECACHE_AUDIO', urls });
    });
  }
  async function clearOffline(){ try{ await caches.delete('snb-audio-v1'); }catch(e){} }

  function screenSettings(){
    clearFigures(); document.body.classList.remove('in-practice');
    currentTab='current';
    root.innerHTML = `
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    const u=Store.user();
    const ts = (localStorage.getItem('snb_textscale')||'1');
    const rm = (localStorage.getItem('snb_reduce_motion')==='1');
    const th = (localStorage.getItem('snb_theme')||'');
    const hp = (localStorage.getItem('snb_haptics')!=='0');   // on by default
    const offOn = (localStorage.getItem('snb_offline_all')==='1');   // offline download — off by default
    const gl = (localStorage.getItem('snb_share_glyph')||'1');       // state glyph on share cards — on by default
    const psc = (localStorage.getItem('snb_practice_scene')||'');    // practice scene — '' = surprise me (random per session)
    const segBtn=(group,val,lbl,on)=>`<button type="button" data-${group}="${val}"${on?' class="on"':''}>${lbl}</button>`;
    // on/off pairs render as switches in list rows (HIG: segmented controls pick
    // among values; switches flip a state) — settings pass 2026-07-05
    const swRow=(id,label,on)=>`<div class="set-row-sw"><span class="set-sw-lbl">${label}</span><button class="set-sw${on?' on':''}" id="${id}" type="button" role="switch" aria-checked="${on?'true':'false'}" aria-label="${label}"><span class="set-sw-knob"></span></button></div>`;
    $('#content').innerHTML = `
      <div class="view settings-view">
        <div class="scr-head">
          <p class="eyebrow"></p>
          <h2 class="scr-h">settings</h2>
        </div>

        <div class="set-card">
        <div class="set-rows">
          <div class="row"><span class="k">name</span><input class="name-input" id="nm-val" type="text" value="${escapeHtml(Store.getName())}" placeholder="so the app can greet you by name"></div>
          <div class="row"><span class="k">account</span><span class="val" style="font-weight:400">${escapeHtml(u.email||'on this device')}</span></div>
        </div>
        </div>

        <div class="set-card">
        <p class="set-card-h">display</p>
        <div class="set-group">
          <p class="dash-prompt">text size</p>
          <div class="set-seg" id="seg-text">
            ${segBtn('ts','0.92','smaller',ts==='0.92')}${segBtn('ts','1','default',ts==='1')}${segBtn('ts','1.12','larger',ts==='1.12')}${segBtn('ts','1.25','largest',ts==='1.25')}
          </div>
        </div>
        <div class="set-group">
          <p class="dash-prompt">appearance</p>
          <div class="set-seg" id="seg-theme">
            ${segBtn('th','','auto',th==='')}${segBtn('th','light','light',th==='light')}${segBtn('th','dark','dark',th==='dark')}
          </div>
        </div>
        <div class="set-group">
          <p class="dash-prompt">practice scene</p>
          <button class="ch-opt ch-auto scene-opt${psc===''?' on':''}" type="button" data-scene="">surprise me</button>
          <div class="scene-grid">
            ${['circles','drift','pond','reeds','breeze','sunbeam','fireflies'].map(s=>`<button class="ch-opt scene-opt${psc===s?' on':''}" type="button" data-scene="${s}">${s}</button>`).join('')}
          </div>
          <p class="fineprint" id="scene-cap" style="margin-top:10px"></p>
        </div>
        <div class="set-group">
          ${swRow('sw-motion','animations',!rm)}
          <p class="fineprint" id="motion-cap" style="margin-top:2px"></p>
          ${swRow('sw-haptics','haptics',hp)}
          <p class="fineprint" id="hap-cap" style="margin-top:2px"></p>
          ${_hapIsIOS()?'<p class="fineprint" style="margin-top:4px;opacity:.7">on iphone, the system limits haptics for web apps, so taps here may stay silent. everything else works the same.</p>':''}
        </div>
        </div>

        <div class="set-card">
        <p class="set-card-h">app</p>
        ${isStandalone()?'':`<div class="set-group">
          <div class="set-row-inline" id="install-row">${installRowInner()}</div>
        </div>`}

        <div class="set-group">
          ${swRow('sw-offline','save practices for offline',offOn)}
          <p class="fineprint" id="offline-status" style="margin-top:2px"></p>
          <p class="fineprint" style="margin-top:4px">your check-ins already work offline — they save on this device and sync to your account whenever you reconnect.</p>
          <p class="fineprint" style="margin-top:4px;opacity:.7">on iphone, the system may clear this if the app goes unused for a while. just turn it back on if that happens.</p>
        </div>

        <div class="set-group">
          ${swRow('sw-glyph','state glyph on shared images',gl!=='0')}
          <p class="fineprint" id="glyph-cap" style="margin-top:2px"></p>
        </div>

        </div>

        ${(function(){ var b=(Store.billing&&Store.billing())||null; if(!b||(b.sub_status!=='trialing'&&b.sub_status!=='active'))return '';
          var lbl=b.sub_status==='trialing'?"you're on a free trial. $12/month begins when it ends, and you can cancel before then and pay nothing.":'your subscription is active. $12/month, cancel anytime.';
          return `<div class="set-card"><p class="set-card-h">subscription</p><p class="fineprint" style="margin-bottom:8px">${lbl}</p><div class="set-actions"><button class="set-quiet" id="manage-sub">manage or cancel subscription</button></div></div>`; })()}

        <div class="set-card">
        <p class="set-card-h">your data</p>
        <div class="set-actions">
          <button class="set-quiet" id="export">export your check-ins</button>
          <button class="set-quiet" id="privacy">how your data is handled</button>
          <button class="set-quiet" id="signout">sign out</button>
        </div>
        </div>

        <div class="set-card set-danger">
        <div class="set-actions">
          <button class="set-quiet set-quiet-danger" id="reset">reset my data</button>
          <button class="set-quiet set-quiet-danger" id="delacct">delete my account</button>
        </div>
        </div>
        <p class="set-version" id="set-version"></p>
      </div>`;
    const nmVal = $('#nm-val'); if(nmVal) nmVal.addEventListener('change', e=>{ Store.setName(e.target.value.trim()); });
    const mgs=$('#manage-sub'); if(mgs) mgs.onclick=()=>{ mgs.disabled=true; const t=mgs.textContent; mgs.textContent='one moment…';
      Promise.resolve(Store.openPortal()).then(res=>{ if(res&&res.error){ mgs.disabled=false; mgs.textContent=t; showToast(res.error);} })
        .catch(e=>{ mgs.disabled=false; mgs.textContent=t; showToast(String((e&&e.message)||e)); }); };
    const segText=$('#seg-text'); if(segText) segText.querySelectorAll('[data-ts]').forEach(b=>b.onclick=()=>{
      localStorage.setItem('snb_textscale', b.dataset.ts); applyPrefs();
      segText.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    });
    const segTh=$('#seg-theme'); if(segTh) segTh.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{
      localStorage.setItem('snb_theme', b.dataset.th); applyPrefs();
      segTh.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    });
    // practice scene: the caption mirrors the choice, same as the switches. 🖊
    const SCENE_CAP={ '':'a different scene each session — the app chooses.',
      circles:'the slow circles, as now.',
      drift:'soft specks drifting upward, each at its own pace.',
      pond:'still water — a ripple now and then.',
      reeds:'reeds swaying in an uneven breeze.',
      breeze:'strands carried sideways on a light wind, each at its own speed.',
      sunbeam:'a still beam of light, dust hanging in it. appears in dark mode.',
      fireflies:'small lights arriving and leaving on their own time. appears in dark mode.' };
    const scCap=$('#scene-cap');
    const _scSet=v=>{ if(scCap) scCap.textContent = SCENE_CAP[v]||''; };
    _scSet(psc);
    document.querySelectorAll('.scene-opt').forEach(b=>b.onclick=()=>{
      localStorage.setItem('snb_practice_scene', b.dataset.scene);
      document.querySelectorAll('.scene-opt').forEach(x=>x.classList.toggle('on', x===b));
      _scSet(b.dataset.scene);
    });
    const bindSw=(id,fn)=>{ const b=$('#'+id); if(b) b.onclick=()=>{
      const on=!b.classList.contains('on');
      b.classList.toggle('on',on); b.setAttribute('aria-checked',on?'true':'false');
      fn(on);
    }; };
    // "animations" reads in the positive: switch ON = animations on. the caption
    // mirrors the current state so the row explains itself either way. 🖊
    const _motionCap = on=>{ const el=$('#motion-cap'); if(el) el.textContent = on
      ? 'animations are on.'
      : "animations are off — this turns off the app's decorative movement. breathing practices keep their full timing; words carry the pace instead."; };
    _motionCap(!rm);
    bindSw('sw-motion', on=>{ localStorage.setItem('snb_reduce_motion', on?'0':'1'); applyPrefs(); _motionCap(on); });
    const _hapCap = on=>{ const el=$('#hap-cap'); if(el) el.textContent = on
      ? 'haptics are on — the app answers your taps with a tiny buzz.'
      : 'haptics are off — the app never vibrates.'; };
    _hapCap(hp);
    bindSw('sw-haptics', on=>{ localStorage.setItem('snb_haptics', on?'1':'0'); if(on) haptic('save'); _hapCap(on); });
    const _glyphCap = on=>{ const el=$('#glyph-cap'); if(el) el.textContent = on
      ? 'your share cards carry a small signature: the state your body keeps coming back to, from your last three months of check-ins.'
      : 'your share cards go out with no state signature.'; };
    _glyphCap(gl!=='0');
    bindSw('sw-glyph',  on=>{ localStorage.setItem('snb_share_glyph', on?'1':'0'); _glyphCap(on); });
    const irow = $('#install-row'); if(irow){ const ig = irow.querySelector('.in-go'); if(ig) ig.onclick = promptInstall; }
    // offline: bulk download / clear, with an honest iOS-eviction check on render
    const segOff = $('#sw-offline'); const offStatus = $('#offline-status');
    const setOff = (t)=>{ if(offStatus) offStatus.textContent = t; };
    // plain state-mirroring captions (Justin 2026-07-05): the line always says
    // what is true RIGHT NOW, in the plainest words we have. 🖊
    const OFF_ON_TXT  = 'every meditation is saved on this device — they all play without a connection.';
    const OFF_OFF_TXT = 'meditations play over the internet. turn this on to save them all to this device (about 94 mb — best on wi-fi), so they play with no connection at all.';
    setOff(localStorage.getItem(OFFLINE_FLAG)==='1' ? OFF_ON_TXT : OFF_OFF_TXT);
    (async ()=>{
      if(localStorage.getItem(OFFLINE_FLAG)==='1'){
        const mani = await offlineManifest(); const have = await offlineCachedCount();
        setOff(mani.length && have>=mani.length ? OFF_ON_TXT : 'your device cleared the offline copy — turn this on again to re-save it.');
      }
    })();
    let offBusy = false;
    if(segOff) segOff.onclick = async ()=>{
      if(offBusy) return;
      const want = !segOff.classList.contains('on');
      segOff.classList.toggle('on', want); segOff.setAttribute('aria-checked', want?'true':'false');
      if(want){
        offBusy = true; haptic('save'); setOff('preparing…');
        const urls = await offlineManifest();
        if(!urls.length){ setOff("couldn't read the practice list. try again."); offBusy=false; return; }
        try{
          const res = await downloadOffline(urls, d=>setOff('saving… '+d.done+'/'+d.total));
          localStorage.setItem(OFFLINE_FLAG,'1');
          try{ if(navigator.storage && navigator.storage.persist) await navigator.storage.persist(); }catch(e){}
          const have = await offlineCachedCount();
          if(res.quota || have < urls.length) setOff("didn't all fit — saved "+have+" of "+urls.length+". free up some space and turn this on again.");
          else setOff(OFF_ON_TXT);
        }catch(e){ setOff('download failed. check your connection and try again.'); }
        offBusy = false;
      } else {
        offBusy = true; await clearOffline(); localStorage.removeItem(OFFLINE_FLAG); setOff('offline copy removed — meditations play over the internet again.'); offBusy = false;
      }
    };
    const privBtn = $('#privacy'); if(privBtn) privBtn.onclick = ()=>screenPolicy('privacy','settings');
    // version line: read the ?v= off the live script tag so it never drifts from a deploy
    try{ const vs=document.querySelector('script[src^="app.js"]'); const vm=vs&&vs.src.match(/v=(\d+)/); const ve=$('#set-version'); if(ve) ve.textContent='stuck not broken · app v'+(vm?vm[1]:'dev'); }catch(e){}
    $('#export').onclick = ()=>{
      const blob = new Blob([JSON.stringify(Store.checkins(),null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='my-checkins.json'; a.click();
    };
    $('#signout').onclick = async ()=>{
      // one accidental tap used to sign you straight out (Justin, 2026-07-05)
      if(!confirm('Sign out? Your check-ins are saved to your account and will be here when you sign back in.')) return;
      await Store.signOut(); currentTab='today'; route();
    };
    $('#reset').onclick = async ()=>{ if(confirm('Clear all your check-ins and practice history? This can\'t be undone — your account stays, but the data is gone for good.')){ await Store.reset(); try{ Object.keys(localStorage).filter(k=>k.startsWith('snb_breath_')).forEach(k=>localStorage.removeItem(k)); }catch(e){} app('today'); } };
    // full in-app account deletion (the privacy policy promises it): a clear
    // confirm screen, then the delete-account edge function erases everything
    // server-side, instantly. 🖊 copy below is a draft for Justin to own.
    $('#delacct').onclick = ()=>screenDeleteAccount();
  }

  function screenDeleteAccount(err, busy){
    setHTML(`
      <div class="view gate"><div class="gate-body">
        <p class="eyebrow">delete my account</p>
        <h1 style="margin:12px 0 12px">Before you go, here's exactly what happens.</h1>
        <p class="lede" style="margin-bottom:14px">Deleting your account erases everything that identifies you, immediately and for good: your account, your email, your check-ins, your written notes, your practice history, and your reflections. There is no undo.</p>
        <p class="lede" style="margin-bottom:14px">What stays: an anonymous copy of check-ins and practice data. No name, no email, no notes. Once your account is gone, it can never be connected to you, even by us. It helps us learn whether this app helps people.</p>
        <p class="lede" style="margin-bottom:24px">Your reasons are your own, and no explanation is needed. If it ever feels right to come back, you're welcome any time. A fresh start takes about a minute.</p>
        ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
        <button class="btn block" id="del-keep" style="margin-top:8px"${busy?' disabled':''}>keep my account</button>
        <p class="fineprint" style="margin-top:12px;text-align:center"><button class="linkbtn" id="del-go" style="font-size:inherit;padding:2px"${busy?' disabled':''}>${busy?'deleting…':'delete my account and all of my data'}</button></p>
      </div></div>`);
    $('#del-keep').onclick = ()=>{ if(!busy) screenSettings(); };
    if(busy) return;
    $('#del-go').onclick = ()=>{
      screenDeleteAccount(null, true);
      Promise.resolve(Store.deleteAccount()).then(res=>{
        if(res && res.error) return screenDeleteAccount(res.error);
        screenDeleted();
      }).catch(e=>screenDeleteAccount(String((e&&e.message)||e)));
    };
  }

  function screenDeleted(){
    setHTML(`
      <div class="view gate"><div class="gate-body" style="text-align:center">
        <p class="eyebrow">done</p>
        <h1 style="margin:12px 0 12px">Your account is gone.</h1>
        <p class="lede" style="margin-bottom:24px">Everything that identifies you was erased. Thank you for spending some time here. If you ever want to return, the door is open.</p>
        <button class="btn block" id="del-done">okay</button>
      </div></div>`);
    $('#del-done').onclick = ()=>{ authMode='in'; lastEmail=''; currentTab='today'; route(); };
  }

  // ---------------------------------------------------------------- delegated nav (trend "see all")
  document.addEventListener('click',(e)=>{ if(e.target && e.target.id==='seeall'){ app('current'); } });

  // apple-style large title: heading holds still during rubber-band (position:sticky
  // in css) and fades over the first ~70px of scroll. Delegated capture listener so
  // it survives every re-render without per-screen wiring.
  document.addEventListener('scroll',(e)=>{
    const sc = e.target;
    if(!(sc instanceof Element) || !sc.classList || !sc.classList.contains('scroll')) return;
    const head = sc.querySelector('.scr-head');
    if(!head) return;
    const f = Math.max(0, Math.min(1, 1 - sc.scrollTop/70));
    head.style.setProperty('--hfade', f.toFixed(3));
    // interactive heads (reader's archive button) stop eating touches once faded
    if(head.classList.contains('read-head')) head.style.pointerEvents = f<=0.02 ? 'none' : '';
  }, true);

  // ---------------------------------------------------------------- utils
  function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  // user display preferences (text size + motion), persisted and applied app-wide
  function applyPrefs(){
    try{
      const ts = parseFloat(localStorage.getItem('snb_textscale')||'1') || 1;
      // --type-user, not --type-scale: app.css composes --type-scale from the user's
      // setting x the device ramp (--type-fluid). Writing --type-scale here would
      // clobber the ramp and pin the app back to phone-sized type on desktop.
      document.documentElement.style.setProperty('--type-user', String(ts));
      document.body.classList.toggle('reduce-motion', localStorage.getItem('snb_reduce_motion')==='1');
      const theme = localStorage.getItem('snb_theme') || '';            // '', 'light', 'dark' ('' follows the system)
      const de = document.documentElement;
      de.classList.toggle('theme-dark', theme==='dark');
      de.classList.toggle('theme-light', theme==='light');
      const dark = theme==='dark' || (theme!=='light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
      const tcm = document.querySelector('meta[name="theme-color"]'); if(tcm) tcm.setAttribute('content', dark ? '#1B1C1E' : '#FAF9F5');
    }catch(e){}
  }
  function relTime(t){ const m=Math.round((Date.now()-t)/60000); if(m<1)return 'just now'; if(m<60)return m+' min ago'; const h=Math.round(m/60); if(h<24)return h+'h ago'; const d=Math.round(h/24); return d+'d ago'; }

  (function(){ const fab=document.getElementById('fab-checkin'); if(fab) fab.addEventListener('click',()=>{ if(Store.user()) screenCheckin(); }); })();
  applyPrefs();
  // light up any triglyph as it enters the DOM: fill eases from the neutral tone into the active
  // axis color(s), so the brand mark settles into your state on each render. Reduce-motion -> instant.
  try{
    const _litTri = ()=>requestAnimationFrame(()=>{ document.querySelectorAll('.triglyph .tg-m[data-col]').forEach(p=>{ if(!p.style.fill) p.style.fill=p.getAttribute('data-col'); }); });
    new MutationObserver((muts)=>{ for(const m of muts){ if(m.addedNodes){ for(const n of m.addedNodes){ if(n.nodeType===1 && (n.classList&&n.classList.contains('triglyph') || (n.querySelector&&n.querySelector('.triglyph')))){ _litTri(); return; } } } } }).observe(document.body,{childList:true,subtree:true});
  }catch(e){}
  try{ if(window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPrefs); }catch(_){}
  // reset-link arrivals: supabase fires PASSWORD_RECOVERY after it consumes the
  // token from the URL; the hash check in _recovery covers the load-time race.
  try{ if(Store.onPasswordRecovery) Store.onPasswordRecovery(()=>{ _recovery=true; if(Store.user()) screenNewPassword(); }); }catch(e){}
  Store.init(route);
})();
