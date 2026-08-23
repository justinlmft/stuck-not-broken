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

  /* ── the margin read, applied to stored check-ins ──────────────────────────
     Progress is measured on quantities, not on state names (Justin, 2026-08-16).

     A check-in's state name is DERIVED here, never trusted from storage, so one
     naming rule covers all history instead of two stitched at a deploy date.
     `margin = 0.7*v - 0.3*(sym + dor + tax)` — sign gives the side, size gives
     the qualifier. Never rendered as a number: margins stay internal, the person
     is their own scale.

     No stored name is trusted — every row derives (Ruling 2, 2026-08-22: untouched
     sliders are the person's answer, so the engine always names what they left).
     'neutral' now only ever means the computed QUIET guard fired (all circuits
     floored): no readable margin — capacity and load both absent — so those rows
     are excluded from every margin statistic (D-A) while still counting as
     check-ins (tenure, streaks).                                                 */
  // Which side of the line each NAME sits on. Not a heuristic: under the margin
  // rule safety/play/stillness can only arise when margin >= 0, and
  // shutdown/freeze/fight-flight only when margin < 0. So this is a fact about
  // the naming rule, used where we need to describe names rather than count them.
  const SAFETY_SIDE  = { safety:1, play:1, stillness:1 };
  const DEFENSE_SIDE = { shutdown:1, freeze:1, fightflight:1 };
  function _isRead(c){ return !!c && typeof c.v === 'number' && _cDom(c) !== 'neutral'; }
  function _reads(arr){ return (arr||[]).filter(_isRead); }
  function _cDom(c){
    if(!c) return null;
    try{ return window.PVCurrent.dominantOf(c.v, c.sym, c.dor).key; }catch(e){ return c.dom || null; }
  }
  function _cMargin(c){
    if(!_isRead(c)) return null;
    try{ return window.PVCurrent.marginOf(c.v, c.sym, c.dor).margin; }catch(e){ return null; }
  }
  // safety-governed: capacity covers load in this same reading. Replaces the
  // REG={safety,play,stillness} bucket lookup, which asked which word won.
  function _cReg(c){ const m=_cMargin(c); return m != null && m >= 0; }
  function _meanMargin(arr){
    const r=_reads(arr), n=r.length; if(!n) return null;
    let t=0; for(let i=0;i<n;i++) t+=_cMargin(r[i]);
    return t/n;
  }

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
    Store.periodStats=(s0,e0)=>{const w=cs.filter(c=>c.t>=s0&&c.t<e0);if(!w.length)return null;const cnt={};_reads(w).forEach(c=>{const k=_cDom(c);cnt[k]=(cnt[k]||0)+1;});const order=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);const nR=_reads(w).length||1;const dist={};order.forEach(k=>dist[k]=Math.round(cnt[k]/nR*100));let reg=0;const rd=_reads(w);rd.forEach(c=>{if(_cReg(c))reg++;});const avgV=w.reduce((s,c)=>s+c.v,0)/w.length;const third=Math.max(1,Math.floor(w.length/3));const fa=w.slice(0,third).reduce((s,c)=>s+c.v,0)/third,la=w.slice(-third).reduce((s,c)=>s+c.v,0)/third;const domOf=a=>{const c2={};_reads(a).forEach(x=>{const k=_cDom(x);c2[k]=(c2[k]||0)+1;});return Object.keys(c2).sort((p,q)=>c2[q]-c2[p])[0]||null;};
      return {n:w.length,days:new Set(w.map(c=>new Date(c.t).toDateString())).size,dom:order[0],domShare:dist[order[0]],second:order[1]||null,secondShare:order[1]?dist[order[1]]:0,dist:dist,order:order,reg:reg,dys:nR-reg,nRead:nR,regShare:reg/nR,lean:reg/nR>=0.6?'regulated':reg/nR<=0.4?'dysregulated':'even',meanMargin:_meanMargin(w),avgV:avgV,firstAvg:fa,lastAvg:la,firstDom:domOf(w.slice(0,third)),lastDom:domOf(w.slice(-third)),bestDow:null,defenseStates:order.filter(d=>DEFENSE_SIDE[d]),regStates:order.filter(d=>SAFETY_SIDE[d])};};
    Store.baselineDelta=(s0,e0)=>{const span=e0-s0,cur=Store.periodStats(s0,e0),prev=Store.periodStats(s0-span,s0);if(!cur)return null;if(!prev)return {dir:'new',deltaPct:0,cur:cur.meanMargin};const d=cur.meanMargin-prev.meanMargin;return {dir:d>0.05?'up':d<-0.05?'down':'flat',deltaPct:Math.round(d*100),cur:cur.meanMargin,prev:prev.meanMargin};};
    Store.recovery=()=>{const r=_reads(cs);if(r.length<12)return null;const gaps=[],depths=[];let i=0;while(i<r.length){if(!_cReg(r[i])){let j=i,st=0,f=false,low=0;while(j<r.length){const m=_cMargin(r[j]);if(m!=null&&m<low)low=m;if(_cReg(r[j])){f=true;break;}j++;st++;}if(f){gaps.push(st);depths.push(low);}i=j;}else i++;}return gaps.length>=3?{avg:gaps.reduce((x,y)=>x+y,0)/gaps.length,n:gaps.length,deepest:Math.min.apply(null,depths),avgDepth:depths.reduce((x,y)=>x+y,0)/depths.length}:null;};
    Store.transitions=()=>{if(cs.length<6)return null;const p={};let tot=0;for(let i=1;i<cs.length;i++){const a=cs[i-1].dom,b=cs[i].dom;if(!a||!b||a===b)continue;p[a+'>'+b]=(p[a+'>'+b]||0)+1;tot++;}if(tot<3)return null;const e=Object.entries(p).sort((x,y)=>y[1]-x[1])[0];if(!e||e[1]<2)return null;const k=e[0].indexOf('>');return {a:e[0].slice(0,k),b:e[0].slice(k+1),count:e[1],total:tot};};
    Store.weekMix=(days)=>{const cut=Date.now()-(days||7)*864e5;const st=Store.periodStats(cut,Date.now());if(!st||st.n<6)return null;return {n:st.n,dom:st.dom,domShare:st.domShare,second:st.second,secondShare:st.secondShare,reg:st.reg,dys:st.dys,regShare:Math.round(st.regShare*100),lean:st.lean,distinct:st.order.length,defenseStates:st.defenseStates};};
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
      ? 'to install, open this page in your browser first (not this in-app window), then tap the share icon and choose "Add to Home Screen."'
      : 'to install, open this page in your browser first (not this in-app window), then use the menu and choose "Add to Home Screen."';
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
  const STATE_NAME  = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].name : 'Quiet');
  // CAP(): sentence-case a value that STARTS a label, heading, cell or button.
  // State names and dayparts are common nouns — they stay lowercase MID-SENTENCE
  // ("you commonly dip into shutdown"), and take a capital only where their
  // position demands it. One rule, applied at the call site, because only the call
  // site knows whether the word starts something. Never mutate the source strings:
  // STATE_NAME/segLabel are read mid-sentence in a dozen places.
  const CAP = (s) => { s = String(s == null ? '' : s); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  const STATE_LABEL = (key) => CAP(STATE_NAME(key));
  // mute(): blends a color toward the card background (--bone) so a de-emphasized
  // chart bar reads as a genuinely softer version of ITS OWN hue, not a differently-
  // hued pale tint. Used by the You-tab bar charts to make the winning bar/segment
  // the obvious one (Justin 2026-07-29: "dull the colors of the other days and
  // times to highlight the winning one").
  // Bakes the muted color directly into the `background` value at render time —
  // deliberately NOT a CSS opacity rule. `.rc-bar` carries `animation:riseIn .45s
  // var(--ease) both`, and riseIn animates opacity 0->1; its `both` fill mode
  // permanently holds opacity:1 once the animation finishes, silently overriding
  // any plain `opacity` CSS property on the same element forever after first
  // paint. A CSS-only "opacity:.x on the losing bars" rule never actually renders
  // once the intro animation completes — caught this in preview when the fade was
  // invisible no matter how low the opacity went ("all look the same opacity").
  function _hexOrRgbToRgb(c){
    c = (c||'').trim();
    if(c[0]==='#'){ const h=c.slice(1); const n=h.length===3?h.split('').map(x=>x+x).join(''):h;
      return [parseInt(n.slice(0,2),16), parseInt(n.slice(2,4),16), parseInt(n.slice(4,6),16)]; }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if(m) return m[1].split(',').slice(0,3).map(x=>parseInt(x.trim(),10));
    return [216,210,194]; // fallback ~ --hairline
  }
  function mute(color, strength){
    strength = strength==null ? 0.62 : strength; // fraction blended TOWARD the bg (higher = duller)
    const bg = [250,249,245]; // --bone
    const c = _hexOrRgbToRgb(color);
    const out = c.map((v,i)=>Math.round(v + (bg[i]-v)*strength));
    return `rgb(${out[0]},${out[1]},${out[2]})`;
  }
  // _staggerDelays(): per-column animation-delay (ms) so a bar chart's secondary
  // columns cascade in fast, left-to-right in their own natural order, and the
  // highlighted/"best" column (Justin 2026-07-30: "end with the primary one")
  // lands LAST as the payoff — regardless of where it sits in the row. `step` is
  // the gap between secondary columns ("rapidly"); `pause` is the small extra
  // beat before the primary bar rises, so it reads as a deliberate landing, not
  // just the next tick in the sequence. bestIdx<0/null = no highlight, falls
  // back to a plain left-to-right cascade.
  function _staggerDelays(n, bestIdx, step, pause){
    step = step==null ? 32 : step;
    pause = pause==null ? 90 : pause;
    const arr = new Array(n).fill(0);
    let k = 0;
    for(let i=0;i<n;i++){ if(i===bestIdx) continue; arr[i] = k*step; k++; }
    if(bestIdx!=null && bestIdx>=0 && bestIdx<n) arr[bestIdx] = k*step + pause;
    return arr;
  }

  // _relWhen(ms): a lowercase, roughly-relative time phrase for a past timestamp
  // (2026-07-31, Justin: "'then' should say the time period, like 'last month'" —
  // the growth card's "then" point is an average over the FIRST k check-ins,
  // not tied to the 7/30/90/all period toggle, so it needs its own real-date-
  // based phrase rather than reusing the toggle-driven 'last week'/'last month'
  // labels the baseline-variation card uses). Coarse on purpose — this is a
  // caption, not a timestamp.
  function _relWhen(ms){
    const days = Math.max(0, Math.round((Date.now()-ms)/86400000));
    if(days<3) return 'a few days ago';
    if(days<10) return 'last week';
    if(days<45) return 'last month';
    if(days<75) return '2 months ago';
    if(days<400) return Math.round(days/30)+' months ago';
    const yrs = Math.round(days/365);
    return yrs<=1 ? 'a year ago' : yrs+' years ago';
  }

  // The three brand marks ARE the three nervous-system axes. heart=safety,
  // bolt=fight-or-flight, x=shutdown. One vocabulary across check-in, you-tab, feedback.
  // front-facing labels are FELT language (anyone can rate them, no theory needed);
  // the state names appear in the readout below, where the app does the teaching.
  const AXIS_ICON = {
    v:   { icon:'heart', state:'safety',      sub:'Connected to yourself, others, & where you are' },
    sym: { icon:'bolt',  state:'fightflight', sub:'Restless, wound up, ready to move' },
    dor: { icon:'x',     state:'shutdown',    sub:'Numb, heavy, checked out' },
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
    // 'neutral' (and anything else with no axes) lights nothing, so all three marks used to
    // fall to --tg-dim and the glyph read as switched-off — measured BELOW the lit safety
    // mark's own contrast. Justin, 2026-07-30b: "neutral should be ink." The class carries
    // it in CSS so it flips with the theme (DQA D236).
    const neutral = !active.length;
    const paths = TRI_ORDER.map(m=>`<path class="tg-m" data-m="${m}"${active.indexOf(m)>=0?` data-col="${col}"`:''} d="${(I[m]&&I[m].d)||''}"></path>`).join('');
    return `<svg class="triglyph${neutral?' tg-neutral':''}" viewBox="${TRI_VB}" aria-hidden="true">${paths}</svg>`;
  }
  // the full brand lockup with every mark in its own axis color — the "all of you"
  // logo (vs triGlyph, which lights only the active state). used by the live popup.
  // ink=true renders the lockup uncolored — glyphs stay ink until they carry DATA
  // (Justin 2026-07-17): the waiting screen shows ink; color belongs to readings.
  function triLogo(cls, ink){
    const I = window.SNB_ICONS||{};
    const cols = { heart:STATE_COLOR('safety'), bolt:STATE_COLOR('fightflight'), x:STATE_COLOR('shutdown') };
    const paths = TRI_ORDER.map(m=>`<path class="tl-m" data-m="${m}"${ink?' style="fill:var(--ink)"':' fill="'+cols[m]+'"'} d="${(I[m]&&I[m].d)||''}"></path>`).join('');
    return `<svg class="trilogo${cls?' '+cls:''}" viewBox="${TRI_VB}" aria-hidden="true">${paths}</svg>`;
  }
  // ── the brand foot ──────────────────────────────────────────────────────────
  // Justin 2026-08-01: "add the app's tri-glyph logo to the bottom with 'Stuck Not
  // Broken app'... discreet, and on every card." ONE definition of the words and ONE
  // of the lockup, shared by the DOM footer and the share-image painter, so the card
  // and its shared picture cannot drift apart. The glyph is INK, not the colour
  // lockup: the standing rule (Justin 2026-07-17) is that glyphs stay ink until they
  // carry DATA, and a signature carries none. It renders with fill="currentColor" so
  // the colour lives entirely in CSS and follows the theme.
  const BRAND_FOOT = 'Stucknotbroken.com/app';
  function brandFootMark(cls){
    const I = window.SNB_ICONS||{};
    const paths = TRI_ORDER.map(m=>`<path d="${(I[m]&&I[m].d)||''}"></path>`).join('');
    return `<svg class="pf-mark${cls?' '+cls:''}" viewBox="${TRI_VB}" fill="currentColor" aria-hidden="true">${paths}</svg>`;
  }
  // Appended to the SHARE CLONE only, never to the live card (Justin 2026-08-01: "remove
  // the footer from the in-app card? i only want it on the shared version"). In the app the
  // foot was a wordmark repeated on every card for someone who already has the app open and
  // does not need telling; on a picture leaving for someone else's feed it is the only thing
  // saying where this came from. Added in _shareClone, so a new card gets it for free and no
  // slide has to remember it.
  function panelFoot(){
    return `<div class="panel-foot">${brandFootMark()}<span class="pf-nm">${BRAND_FOOT}</span></div>`;
  }

  function stateMarks(key){
    const ax = STATE_AXES[key];
    if(!ax) return `<span class="st-dot" style="background:${STATE_COLOR(key)}"></span>`;
    // blends mix to the state's own color (e.g. freeze = both marks purple, matching its bar)
    const col = STATE_COLOR(key);
    const marks = ax.map(([icn])=>ico(icn,{cls:'st-mark', color:col})).join('');
    return `<span class="st-marks${ax.length>1?' st-pair':''}">${marks}</span>`;
  }
  const CB_ARROW = '<svg class="cb-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 5l7 7-7 7"/><path d="M20 12H4"/></svg>';
  // hero arrow (2026-07-29, Justin: "the arrow and line between them should be one
  // arrow not separate things"): the standard treatment is a gradient bar PLUS a
  // separate small arrowhead icon appended after it with a gap — reads as two things.
  // This is ONE filled shape, shaft and head as a single path, one gradient across the
  // whole thing, no seam. Used only by the hero size tier.
  let _cbHeroGradId = 0;
  function cbHeroArrowSVG(fromKey, toKey){
    const id = 'cbHeroGrad'+(_cbHeroGradId++);
    return `<svg class="cb-arrow-hero" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">`
      + `<defs><linearGradient id="${id}" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">`
      + `<stop offset="0" stop-color="${STATE_COLOR(fromKey)}"></stop><stop offset="1" stop-color="${STATE_COLOR(toKey)}"></stop></linearGradient></defs>`
      + `<path d="M0,8 L66,8 L66,0 L100,10 L66,20 L66,12 L0,12 Z" fill="url(#${id})"></path>`
      + `</svg>`;
  }
  // "from state A, to state B" glyph strip — a gradient path between the two states'
  // marks, PLUS an actual arrowhead (was previously just a bare gradient bar with no
  // directionality at all, so which state led to which was only implied by color, easy
  // to misread at a glance — Justin 2026-07-28: "getting back to safety" card glyph/
  // arrow fix). Used by the comeback card, the shift card, and the reader's own
  // patterns-section visual — one function so all three read identically.
  function cbGlyphViz(fromKey, toKey, extraCls, big, steps){
    // "getting back to safety" gets the bigger glyph treatment (Justin 2026-07-28: the
    // glyphs read too small next to the amount of copy around them); other cards using
    // this same viz keep the standard size unless they ask for it too.
    // big='hero' (2026-07-29 → 2026-07-29b): the largest tier, comeback card only — "the
    // glyphs are the star, make them dominant" (Justin). Also swaps the bar+arrowhead
    // pair for the single cbHeroArrowSVG shape above. Superseded the v1 step-dots idea
    // (`steps`, still supported for other callers) — redundant at this scale.
    if(big==='hero'){
      return `<div class="cb-viz cb-glyphs cb-glyphs-hero${extraCls?' '+extraCls:''}" aria-hidden="true">`
        + `<span class="cb-g">${stateMarks(fromKey)}</span>`
        + cbHeroArrowSVG(fromKey, toKey)
        + `<span class="cb-g">${stateMarks(toKey)}</span>`
        + `</div>`;
    }
    const sizeCls = big ? ' cb-glyphs-lg' : '';
    const stepDots = steps>1 ? `<span class="cb-steps">${Array.from({length:Math.min(steps,7)}).map((_,i)=>`<span class="cb-step" style="animation-delay:${900+i*90}ms"></span>`).join('')}</span>` : '';
    return `<div class="cb-viz cb-glyphs${sizeCls}${extraCls?' '+extraCls:''}" aria-hidden="true">`
      + `<span class="cb-g">${stateMarks(fromKey)}</span>`
      + `<span class="cb-path" style="background:linear-gradient(90deg,${STATE_COLOR(fromKey)},${STATE_COLOR(toKey)})">${stepDots}</span>`
      + `${CB_ARROW.replace('class="cb-arrow"', `class="cb-arrow" style="color:${STATE_COLOR(toKey)}"`)}`
      + `<span class="cb-g">${stateMarks(toKey)}</span>`
      + `</div>`;
  }
  // check-in method label/caption/preview — shared between settings and the onboarding
  // "How do you want to check in?" card so the two never drift (hoisted 2026-07-28;
  // was previously a settings-only closure).
  const METHOD_LABEL = { sliders:'questions', states:'state picker', numbers:'number sliders' };
  const METHOD_CAP = {
    sliders:'Best for someone who has a hard time identifying their state. Simply answer a few quick questions with three sliders.',
    numbers:'Use numbers to check in. Best for the person that thinks concretely.',
    states:'Choose your state, then fine-tune it with sliders. Best for someone familiar with their states and able to name them.' };
  // a small, non-interactive taste of the chosen method. ink only (it illustrates the
  // control, not a real reading), no glyph; the scale labels sit flush to the rail, and
  // numbers mode shows the value on the right exactly like the live slider.
  const _methodPreview=(m)=>{
    if(m==='states') return `<div class="ci-ovr-chips">${['safety','play','fightflight','stillness','freeze','shutdown'].map(k=>`<button type="button" class="ci-ovr-opt" tabindex="-1" aria-hidden="true">${stateMarks(k)}<span>${STATE_LABEL(k)}</span></button>`).join('')}</div>`;
    const numbered = m==='numbers';
    const sc = numbered ? ['0','10'] : ['Harder','Easier'];
    return `<div class="ci-prev${numbered?' has-num':''}" aria-hidden="true">
        <div class="ci-prev-scale"><span class="ci-prev-lbls"><span>${sc[0]}</span><span>${sc[1]}</span></span></div>
        <div class="ci-prev-row"><input type="range" class="ci-prev-range" min="0" max="100" value="62" tabindex="-1">${numbered?'<span class="ci-prev-num">6</span>':''}</div>
      </div>`;
  };
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
    validate:   "name one thing you're feeling, say that it's real, and see that it makes sense given your life.",
    imagery:    'Give a challenging feeling a shape in your mind and invite it in, a little at a time.',
    obstacles:  'Notice what gets in the way of feeling safe, and meet it with some kindness.',
    balancing:  'Hold something pleasant and something challenging at the same time, giving each some room.',
    pendulation:'Move gently back and forth between a pleasant feeling and a more challenging one, so your body learns the way back.',
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
      'Pick up a call from a friend?',
      'Sit quietly with someone you like?',
      'Laugh at something silly?',
      "Tell someone how you're really doing?",
      'Make eye contact and mean it?',
      'Enjoy a song you love?',
      'Let someone help you with something?',
      "Be curious about a stranger's story?",
      'Say yes to a last-minute invitation?',
      "Give someone your full attention for a minute?",
      'Accept a compliment without deflecting?',
      "Feel glad someone's nearby?",
    ],
    sym: [
      'Relax your shoulders and keep them relaxed?',
      'Take one slow breath?',
      'Slow your thoughts down?',
      'Unclench your jaw?',
      'Wait in a slow line without getting annoyed?',
      'Set the to-do list aside for ten minutes?',
      'Leave a small worry alone for now?',
      'Be okay with having nothing to do?',
      'Read a full page without skimming?',
      'Let someone finish their sentence without jumping in?',
      'Leave your phone alone for a while?',
      'Do one thing at a time?',
    ],
    dor: [
      'Get up and cross the room?',
      'Answer a question with your full attention?',
      'Start the next small thing on your list?',
      'Step outside for a minute?',
      "Reply to a text that's been waiting?",
      'Make a small decision, like what to eat?',
      'Stand up and stretch?',
      "Look around and notice what's in the room?",
      'Say what you need right now?',
      'Get yourself a glass of water?',
      'Care about how the rest of the day goes?',
      'Look forward to something tomorrow?',
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
  // ---- shared check-in feedback (turn 4 + r2 2026-07-24) -------------------------
  // one ci4 slider row: glyph anchors, question leads, single shared scale above.
  // plain = the state method's fine-tune. Someone who picks a state already knows their
  // states, so they get the axis by name and a less/more scale instead of a scenario
  // question and harder/easier (Justin, 2026-07-26).
  function ci4SliderHTML(key, scenario, cls, val, numbered, plain){
    const ax = AXIS_ICON[key] || {};
    const icon = ax.icon ? ico(ax.icon,{cls:'slider-ico', color:STATE_COLOR(ax.state)}) : '';
    return `<div class="slider${plain?' slider-plain':''}" data-axis="${key}">
      <span class="slider-ico-wrap">${icon}</span>
      <div class="slider-main">
        <p class="q" id="q-${key}">${plain?CAP(scenario):scenario}</p>
        <div class="sl-row">
          <input type="range" class="${cls}" id="sl-${key}" min="0" max="100" value="${val}" aria-label="${plain?('How much '+scenario):('How easy would it be to '+scenario)}">
          ${numbered?`<span class="slider-num" id="num-${key}" aria-hidden="true">${Math.round(val/10)}</span>`:''}
        </div>
      </div>
    </div>`;
  }
  // each axis's colour = its slider-rail colour: faded ink when untouched, the axis's
  // own colour once set, the blend's colour when it joins an active two-axis blend.
  // rails and glyphs both use this, so they move together.
  function ciAxisColorFn(v, s, d, axTouched){
    const dom = window.PVCurrent.dominantOf(v/100, s/100, d/100);
    const core = STATE_CORE[dom.key] || [];
    const own = AXIS_OWN();
    const all = axTouched.v && axTouched.sym && axTouched.dor;
    return ax => !axTouched[ax] ? 'var(--ink-faded)'
      : (all && core.length>1 && core.includes(ax)) ? STATE_COLOR(dom.key) : own[ax];
  }
  // settings disclosure open/close with a measured max-height glide (reliable on iOS
  // WebKit). opening animates 0 → scrollHeight then releases to `none` so later content
  // growth (e.g. swapping the method preview) isn't clipped; closing animates back to 0.
  function _discSetOpen(body, open){ if(!body) return;
    if(open){ body.style.maxHeight='none'; body.style.opacity='1'; }
    else { body.style.maxHeight='0px'; body.style.opacity='0'; } }
  function _discToggle(btn, body){ if(!btn||!body) return;
    const wasOpen = btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded', wasOpen?'false':'true');
    const calm = document.body.classList.contains('reduce-motion');
    if(wasOpen){                                   // closing
      body.style.maxHeight = body.scrollHeight+'px'; body.style.opacity='1';
      void body.offsetHeight;                      // force reflow so the next values transition
      body.style.maxHeight='0px'; body.style.opacity='0';
    } else {                                       // opening
      body.style.opacity='1';
      if(calm){ body.style.maxHeight='none'; return; }
      body.style.maxHeight = body.scrollHeight+'px';
      const done = e=>{ if(e.propertyName!=='max-height') return; body.style.maxHeight='none'; body.removeEventListener('transitionend', done); };
      body.addEventListener('transitionend', done);
    }
  }
  // paint each slider rail AND its anchoring glyph the same colour (colOf)
  function ciPaintSliders(colOf){
    ['v','sym','dor'].forEach(ax=>{
      const col = colOf(ax);
      const el = $('#sl-'+ax); if(el) el.style.setProperty('--rail', col);
      const g = root.querySelector('.slider[data-axis="'+ax+'"] .slider-ico'); if(g) g.style.color = col;
    });
  }
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
  // now-screen post-breath slot (r5 2026-07-24): small, legible icons for the dynamic
  // second row — a plus for "check in again" once it shrinks, a play for the micro
  // practice, an open book for the personal-reader doorway.
  const ICO_PLUS  = '<svg class="mh-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>';
  const ICO_PRAC  = '<svg class="mh-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11.14-6.86a1 1 0 0 0 0-1.72L9.52 4.28A1 1 0 0 0 8 5.14z"></path></svg>';
  const ICO_READ  = '<svg class="mh-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10.5 5 8.3 4.5 5.5 4.5A1.5 1.5 0 0 0 4 6v11a1.5 1.5 0 0 0 1.5 1.5c2.8 0 5 .5 6.5 2 1.5-1.5 3.7-2 6.5-2A1.5 1.5 0 0 0 20 17V6a1.5 1.5 0 0 0-1.5-1.5c-2.8 0-5 .5-6.5 2zM12 6.5v13"></path></svg>';
  // the personal reader adjusts to your MOST RECENT check-in, so it's "waiting" whenever
  // you've checked in since you last opened it (Justin 2026-07-24). tracked by the latest
  // check-in timestamp, stored when the reader opens (from any door, free or paid — free
  // users get the subscribe/upgrade prompt, and it clears the nudge for that check-in).
  function _readerSeenT(){ try{ return parseInt(localStorage.getItem('snb_reader_seen_t')||'0',10)||0; }catch(e){ return 0; } }
  function _readerUnread(){ try{ const last = Store.lastCheckin && Store.lastCheckin(); return !!(last && typeof last.t==='number' && last.t > _readerSeenT()); }catch(e){ return false; } }
  function _markReaderSeen(){ try{ const last = Store.lastCheckin && Store.lastCheckin(); const t=(last && typeof last.t==='number')?last.t:Date.now(); localStorage.setItem('snb_reader_seen_t', String(t)); }catch(e){} }
  let _mhMorphTimer = null;   // micro → reader morph (10s)
  let _mhStepTimer  = null;   // staged post-breath reveal (shorten → invite)
  let _mhAfterBreath = null;  // re-run the post-breath reveal when a breath completes
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
    micro: ()=>'A very short present-moment connection practice, built for the middle of a busy day. Use this anywhere and doing anything.',
    more: ()=>'A full, standalone guided practice, played start to finish.',
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
    // open-ended (self-reg only) has no fixed length: the estimate reflects the
    // guided portion, then notes it keeps going until you stop — a fixed "about N
    // minutes" ignored the open-ended toggle before (fix 2026-07-24).
    const openEnded = (key==='most' && !!open);
    const timePhrase = openEnded
      ? (est ? `, about ${est} minutes of guidance, then open-ended` : ', open-ended')
      : (est ? `, about ${est} minutes` : '');
    const bits = [
      `${head}${timePhrase}.`,
      aboutOf(key, sense),
    ];
    if((key==='most'||key==='micro') && sense) bits.push(`your anchor is ${sense}.`);
    if(key==='most' && skill && SKILL_CAP[skill]) bits.push(SKILL_CAP[skill]);
    // hold & watch is offered only for balancing / pendulation; the line + its duration
    // update live as the user toggles the option and picks a length.
    if(key==='most' && holdWatch && (skill==='balancing' || skill==='pendulation'))
      bits.push(`then hold safety and defense together and watch what unfolds, for ${holdDurWords(holdSeconds)}.`);
    if(key!=='micro') bits.push(`with ${silLabel(silence)} silence between the guidance.`);
    if(openEnded) bits.push('It keeps going until you choose to stop.');
    // practice DESCRIPTIONS read in normal (sentence) case on every surface (Justin
    // 2026-07-25). The plan screen and the 7b maker explainer already proper-case
    // their "what to expect"; this is the ONLY description surface that was still
    // lowercase (the chooser / desktop list|detail's live #p-expect), so make it
    // agree here — one source, every caller. Each bit ends in a period, so
    // properCase capitalizes the first word of every sentence and leaves the
    // lowercase-UI practice names mid-sentence untouched.
    return properCase(bits.filter(Boolean).join(' '));
  }

  const fmtDay = (t) => new Date(t).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
  const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });

  let liveFigures = []; // current figures to destroy on screen change
  function clearFigures(){ liveFigures.forEach(f=>{try{f.destroy();}catch(e){}}); liveFigures = []; }
  function mountFigure(host, opts){ const f = window.PVCurrent(host, opts); liveFigures.push(f); return f; }

  function setHTML(html){ clearFigures(); document.body.classList.remove('in-practice'); root.innerHTML = html; }

  // ---------------------------------------------------------------- routing
  // Has an account ever been signed in on this device? Set on every successful
  // sign-in / sign-up / guest-save. Decides what a signed-OUT visitor lands on:
  // a known device gets the sign-in form; a brand-new visitor gets the on-ramp.
  function knownDevice(){ try{ return localStorage.getItem('snb_had_account')==='1'; }catch(e){ return false; } }
  function markKnownDevice(){ try{ localStorage.setItem('snb_had_account','1'); }catch(e){} }

  function route(){
    // ON-RAMP (rebuilt 2026-07-13; spec ONRAMP-COPY-DRAFT.md): a first-time visitor must
    // reach a real check-in and a real practice BEFORE any signup prompt. The ARRIVAL
    // SCREEN IS RETIRED — every visitor comes from a link that already said what this is;
    // a lobby re-explains the click. The link lands ON the check-in. No anonymous session
    // exists yet: it mints at first write ("see what you described"), which is what makes
    // the check-in's trust line structurally true.
    if(!Store.user()){
      // ?start=signup: a visitor who has already decided to pay/join goes straight to
      // account creation, skipping the free practice/check-in flow entirely. Unlike the
      // practice door below, this is an explicit request to skip value-first, not the
      // app's default — so it's a distinct door, not a replacement for it. Known devices
      // keep the ordinary sign-in gate (their account already exists on this browser).
      // a pending live join needs an account (free is enough): known devices sign in,
      // new devices create one. The join code waits in localStorage through auth.
      if(_liveJoin() && Store.cloud()){ authMode = knownDevice() ? 'in' : 'up'; return screenSignIn(); }
      if(_doorSignup && Store.cloud() && !knownDevice()){ _doorSignup=false; authMode='up'; return screenSignIn(); }
      // /stuck door: a brand-new visitor who clicked "start a practice" gets exactly that.
      // Known devices keep the sign-in gate (their practice is inside their account).
      if(_doorPractice && Store.cloud() && !knownDevice()){ _doorPractice=false; return startGuestFlow('practice'); }
      if(Store.cloud() && !knownDevice()){ if(_guestFlow) return; return startGuestFlow(); }
      return screenSignIn();
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
      // Resume the guest sequence at the STAGE the reload interrupted (sessionStorage
      // carries door/practiced/both reads; Store data is the fallback for a reopened tab).
      const gs = gsGet();
      _guestCI = gs.ci1 || null; _guestCI2 = gs.ci2 || null;
      if(!_guestCI){ try{ const last = Store.lastCheckin && Store.lastCheckin(); if(last && typeof last.v==='number') _guestCI = { v:last.v, sym:last.sym, dor:last.dor }; }catch(e){} }
      let practiced = !!gs.practiced;
      try{ if(!practiced && Store.sessions && Store.sessions().length) practiced = true; }catch(e){}
      _guestPracticed = practiced;
      if(practiced){
        if(_guestCI && _guestCI2) return guestBeforeAfter();
        if(guestDoor()==='practice') return _guestCI ? guestOffer() : guestCheckin('post');
        return _guestCI ? guestCheckin('after') : guestOffer();
      }
      if(_guestCI) return guestReflection();
      if(guestDoor()==='practice') return guestPracticePick();
      return guestCheckin('before');
    }
    if(_recovery) return screenNewPassword();   // arrived via a password-reset email link
    // returning from Stripe Checkout: clear the query flag, refresh billing, greet.
    // ('success' is the retired trial return; kept so an in-flight old link still lands.)
    try{ const q=new URLSearchParams(location.search); const co=q.get('checkout'); if(co){ history.replaceState(null,'',location.pathname); if(co==='success'||co==='success-sub'){ if(Store.refreshBilling) Store.refreshBilling(); showToast('Your subscription is active.'); } else if(co==='cancel'){ if(Store.trackEvent) Store.trackEvent('checkout_cancel', {}); } } }catch(e){}
    // The whole-app paywall is GONE (2026-07-13): free is unconditional, no time limit,
    // no card. Nobody is ever locked out. Subscribing is a choice made in settings or on
    // the offer screen, never a wall. Store.hasAccess() is now always true.
    // live check-in (Live-Checkin-Plan Phase 1): while a join is pending, the app opens
    // straight to the live flow — the seams (open when cued, slide, swipe back) depend on it.
    if(_liveJoin()) return screenLive();
    // N-2: Home-Screen shortcut deep links (manifest shortcuts). consumed once.
    let h=''; try{ h=(location.hash||'').replace('#',''); if(h) history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    if(h==='checkin'){ app('today'); return screenCheckin(); }
    if(h==='practice' || _doorPractice){ _doorPractice=false; return app('practice'); }
    if(h==='breath'){ return app('today'); }   // lands on the ring, ready to tap
    const _r = app(currentTab);
    // MEMBER ONBOARDING (item 114): gate on paid && not yet oriented. Deliberately NOT
    // the ?checkout= return param — someone who closes the tab at Stripe and comes back
    // tomorrow still gets oriented, and so does an Academy member who never saw Stripe.
    // Deferred a frame so the shell it overlays actually exists.
    try{
      let force=false;
      if(_obTestAllowed()){
        const q=new URLSearchParams(location.search);
        if(q.get('walkthrough')==='1'){
          force=true; try{ localStorage.removeItem(_obKey()); }catch(e){}
          history.replaceState(null,'',location.pathname);
        }
      }
      // Decide only once the cloud read has finished. Without this, orientation fires in
      // the gap between "paid is known" and "history has loaded" — see Store.hydrated().
      if((force || (paidNow() && _obHydrated() && !oriented())) && !_liveJoin()) setTimeout(()=>{ if(!_ob.on) startOnboarding(false); }, 60);
      // The old state-math "what's new" card is RETIRED (Justin, 2026-08-17: "There should
      // only ever be one"). It fired from here while whatsNewNaming() fired off 'load', with
      // a separate key, and neither checked for the other's root — so a fresh storage
      // container showed BOTH. whatsNewNaming() at the bottom of this file is now the only one.
    }catch(e){}
    return _r;
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
  let _doorSignup = false;
  // Billing interval selected on any pricing surface. Default monthly; a pricing picker or
  // the ?plan= deep-link param can set it to 'annual'. The edge function is the authority —
  // it bills annual ONLY on an exact match, so this client value can never mischarge.
  let _planChoice = 'monthly';
  // ?start=signup&plan=… is a PAID deep-link (the /app page's subscribe buttons): the person
  // already chose to pay, so after account creation we send them to Checkout, not the app.
  let _paidSignupPending = false;
  try{
    const _dq = new URLSearchParams(location.search);
    const _startVal = _dq.get('start');
    const _planVal = _dq.get('plan');
    if(_planVal) _planChoice = String(_planVal).toLowerCase()==='annual' ? 'annual' : 'monthly';
    if(_startVal==='practice'){
      _doorPractice = true;
    } else if(_startVal==='signup'){
      _doorSignup = true;
      if(_planVal) _paidSignupPending = true;   // came from a paid subscribe button
    }
    // ?live=CODE — the live check-in join link/QR (2026-07-17, Live-Checkin-Plan Phase 1).
    // Persisted to localStorage (not a variable) so the join survives sign-in, an iOS PWA
    // reload under memory pressure, and app-switching between the stream and the app.
    // joined:'scan' = arrived via link/QR; the in-app nudge join stamps 'self' instead.
    const _liveVal = _dq.get('live');
    if(_liveVal && /^[A-Za-z0-9]{4,10}$/.test(_liveVal)){
      try{ localStorage.setItem('snb_live_join', JSON.stringify({ code:String(_liveVal).toUpperCase(), joined:'scan', t:Date.now() })); }catch(e){}
    }
    if(_startVal || _planVal || _liveVal){
      _dq.delete('start'); _dq.delete('plan'); _dq.delete('live');
      history.replaceState(null,'',location.pathname+(_dq.toString()?'?'+_dq.toString():'')+location.hash);
    }
  }catch(e){}
  // (the door now lives in the guest sessionStorage blob — see gsGet/gsSet/guestDoor below)

  // ---------------------------------------------------------------- arrival — RETIRED
  // (2026-07-13, on-ramp rebuild.) The arrival lobby re-explained a click the visitor
  // already made; the link now lands directly on the guest check-in. Its trust line and
  // the quiet "sign in" link moved onto the check-in itself. See guestCheckin().

  // ---------------------------------------------------------------- sign in / up
  function screenSignIn(err, busy){
    const up = authMode==='up';
    setHTML(`
      <div class="view gate">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <button class="gate-breath" id="gate-breath" type="button" aria-label="take one breath first">
            <span class="gb-ring" id="gb-ring" aria-hidden="true"></span>
            <span class="gb-txt" id="gb-txt" aria-live="polite">Take one breath first.</span>
          </button>
          <p class="eyebrow">Stuck Not Broken</p>${_liveJoin()?'<div class="live-gate-note" style="margin:14px 0 2px;padding:11px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);font-size:14px;line-height:1.5">You\u2019re joining a live practice. Sign in to check in.</div>':''}
          <h1 style="margin:10px 0 12px">${up?'An app to guide you through emotional regulation.':'Your nervous system, over time.'}</h1>
          <p class="lede" style="margin-bottom:24px">Check in about your nervous system, get practices tuned to you, and watch your patterns become visible over time.</p>
          <div class="field"><label for="em">Email</label><input id="em" type="email" autocomplete="email" value="${escapeHtml(lastEmail)}"><p class="fineprint" id="em-hint" style="display:none;margin-top:6px" aria-live="polite"></p></div>
          ${up ? '<div class="field"><label for="nm">Your name <span style="color:var(--muted);font-weight:400">(optional)</span></label><input id="nm" type="text" autocomplete="name"></div>' : ''}
          <div class="field"><label for="pw">Password</label><input id="pw" type="password" autocomplete="${up?'new-password':'current-password'}"></div>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="go" style="margin-top:8px"${busy?' disabled':''}>${busy?'One moment…':(up?'Create account':'Sign in')}</button>
          ${up?'<p class="fineprint" style="margin-top:12px;text-align:center">Already have an account? <button class="linkbtn" id="toggle-top" type="button" style="font-size:inherit;padding:2px">Log in</button></p>':''}
          ${up||!Store.cloud()?'':'<p class="fineprint" style="margin-top:14px;text-align:center">New here, or just want to try it?</p><button class="set-quiet" id="guest-start" type="button" style="display:block;margin:6px auto 0"'+(busy?' disabled':'')+'>Start a check-in, no account needed</button>'}
          ${up?`<p class="fineprint" style="margin-top:10px">By creating an account, you agree to the <a href="#" data-policy="terms">terms</a> and <a href="#" data-policy="privacy">privacy policy</a>.</p>
          <p class="fineprint" style="margin-top:6px">An anonymous copy of check-ins and practice data (no name, no email, no notes) helps us learn whether this app helps people and share examples of progress. It can never be traced back to you.</p>`:''}
          <p class="fineprint">${up?'Already have an account?':'New here?'} <button class="linkbtn" id="toggle" style="font-size:inherit;padding:2px">${up?'Sign in':'Create an account'}</button></p>
          ${up?'':'<p class="fineprint" style="margin-top:6px">The breath above needs no account. The rest of the app does. It keeps your check-ins and patterns safe, on any device you sign in from.</p>'}
          ${up||!Store.cloud()?'':'<p class="fineprint" style="margin-top:4px"><button class="linkbtn" id="forgot" style="font-size:inherit;padding:2px">Forgot your password?</button></p>'}
          ${Store.cloud()?'':'<p class="fineprint" style="margin-top:8px">On-device mode: your data stays on this device for now.</p>'}
        </div>
      </div>`);
    if(busy) return;
    const gb=$('#gate-breath'); if(gb) gb.onclick = gateBreath;
    const gs=$('#guest-start'); if(gs) gs.onclick = startGuestFlow;
    $('#toggle').onclick = ()=>{ authMode = up?'in':'up'; screenSignIn(); };
    { const _tt=$('#toggle-top'); if(_tt) _tt.onclick=()=>{ authMode='in'; screenSignIn(); }; }
    $('#go').onclick = submit;
    root.querySelectorAll('.fineprint a[data-policy]').forEach(a=>{
      a.onclick = (e)=>{ e.preventDefault(); screenPolicy(a.getAttribute('data-policy')); };
    });
    $('#em').addEventListener('input', e=>{ lastEmail=e.target.value; emailHint(); });
    $('#em').addEventListener('blur', emailHint);
    $('#pw').addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
    const fg=$('#forgot'); if(fg) fg.onclick = ()=>{
      const email=$('#em').value.trim();
      if(!email){ lastEmail=email; return screenSignIn('enter your email above first, then tap "Forgot your password?"'); }
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
      if(!email || (Store.cloud() && !pw)){ lastEmail=email; screenSignIn('Enter your email and a password.'); return; }
      lastEmail=email;
      const nm = up ? (($('#nm')||{}).value||'').trim() : '';
      screenSignIn(null, true);
      Promise.resolve(up ? Store.signUp(email,pw) : Store.signIn(email,pw)).then(res=>{
        if(res && res.error) return screenSignIn(res.error);
        if(res && res.needsConfirm){ markKnownDevice(); return screenConfirm(email); }
        if(nm) Store.setName(nm);
        markKnownDevice();   // this device has had an account -> signed-out visits land on sign-in, not the on-ramp
        // Paid deep-link (?start=signup&plan=…): they already chose to pay on the /app page,
        // so hand them straight to Checkout for the interval they picked instead of the app.
        if(_paidSignupPending){
          _paidSignupPending = false;
          const plan = _planChoice;
          return Promise.resolve(Store.refreshBilling && Store.refreshBilling()).then(()=>
            Promise.resolve(Store.startCheckout ? Store.startCheckout('member', plan) : { error:'unavailable' }).then(r=>{
              if(r && r.error){ currentTab='today'; route(); showToast("couldn't open the payment page right now. your account is ready. you can subscribe from settings."); }
            }));
        }
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
        setTxt('Take one breath first.');
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

  // ================================================================ GUEST ON-RAMP
  // (Rebuilt 2026-07-13. Spec: ONRAMP-COPY-DRAFT.md — copy CLOSED — + ONRAMP-MOCKUP.html.)
  // The flow: check-in → practice → check in again → what changed (before/after) → the
  // offer. The /stuck door (?start=practice) skips to the pick and offers the check-in
  // after; it has no "before", so it gets no before/after screen.
  //
  // This is deliberately a SEPARATE, tabbar-free linear sequence — it never calls
  // app()/screenCheckin()/renderPracticeChooser(), because those render the shared
  // tabbar whose practice tab exposes the self-regulation ("most"/pendulation) track.
  // That track needs an established safety baseline and must be unreachable by an
  // anonymous visitor. Only after a successful save (linkIdentity) does the person
  // enter the normal route()/app() shell.
  //
  // Free/paid boundary (GMS + Justin 2026-07-13): the guest taster is MINDFULNESS ONLY,
  // chosen by TIME (tiny ~2 min / full ~6 min). Safety anchoring is faded with the rest:
  // (1) never demo what you're about to take away — everything a guest touches, they
  // keep for free; (2) safety anchoring is state-matched by nature = personalization =
  // paid. The guest chose by time; the product chooses by state.
  let _guestFlow = false;
  let _guestCI  = null;   // {v,sym,dor} (0..1) the first check-in — the "before"
  let _guestCI2 = null;   // {v,sym,dor} the post-practice check-in — the "after"
  // ONE practice per guest (Justin 2026-07-10): the taste is a single, honest free
  // practice, not an unlimited library. Once practiced, the way forward is the offer.
  let _guestPracticed = false;
  // Gates the tabbar-free screens and the hard 'most' refusal in launchWeaver/logSession.
  //
  // 2026-07-10: this used to require `_guestFlow && isAnonymous()`. That was a latent
  // hole — `_guestFlow` is in-memory, so any page reload cleared it while the person
  // was still an anonymous user, and every guard keyed on inGuest() silently switched
  // off. Anonymity is the durable fact; the flag is not. Key the guard on anonymity
  // ALONE, so it cannot be defeated by a reload.
  function inGuest(){ try{ return !!(Store.isAnonymous && Store.isAnonymous()); }catch(e){ return false; } }

  // Mid-flow position must survive reloads (a service-worker update reloads the page on
  // its own): door, practiced, the asked questions, and both reads live in sessionStorage
  // for the tab. (Replaces the old single 'snb_guest_door' key AND the in-memory-only
  // _guestPracticed, which a reload used to clear — reopening the practice pick.)
  const GS_KEY = 'snb_guest_state';
  function gsGet(){ try{ return JSON.parse(sessionStorage.getItem(GS_KEY)) || {}; }catch(e){ return {}; } }
  function gsSet(patch){ try{ sessionStorage.setItem(GS_KEY, JSON.stringify(Object.assign(gsGet(), patch))); }catch(e){} }
  function gsClear(){ try{ sessionStorage.removeItem(GS_KEY); }catch(e){} }
  function guestDoor(){ return gsGet().door || null; }

  // ---- offer instrumentation (GMS build item 2, agreed by Justin 07-13) ----
  // offer_view / subscribe_click / continue_free, with return-visit count and check-in
  // count riding along — the data that turns offer-now-vs-offer-later into evidence.
  // Queued locally; drains through Store.trackEvent when the events table lands (Phase 2).
  // Every event carries meta.src (the door) — stamped inside Store.trackEvent so no
  // call site can forget it. Events fired before the anonymous session mints (guest_land)
  // are parked by Store and flushed on first write; they are not lost.
  function gtrack(name, meta){
    const m = Object.assign({}, meta||{}, { src:(Store.src?Store.src():'direct') });
    try{
      const q = JSON.parse(localStorage.getItem('snb_guest_events')||'[]');
      q.push({ name:name, t:Date.now(), meta:m });
      localStorage.setItem('snb_guest_events', JSON.stringify(q.slice(-200)));
    }catch(e){}
    try{ if(Store.trackEvent) Store.trackEvent(name, m); }catch(e){}
  }
  function gVisits(){ try{
    const d = new Date().toDateString();
    const o = JSON.parse(localStorage.getItem('snb_guest_visits')||'{}');
    if(o.day!==d){ o.day=d; o.n=(o.n||0)+1; localStorage.setItem('snb_guest_visits', JSON.stringify(o)); }
    return o.n||1;
  }catch(e){ return 1; } }
  function gCheckinCount(){ try{ return (Store.checkins()||[]).length; }catch(e){ return 0; } }

  // Entry. NO anonymous session is minted here — the sliders run locally, and the
  // session mints at first write (the "see what you described" tap / the practice
  // launch on the /stuck door). Before that tap nothing exists to save, which is what
  // makes the check-in's trust line structurally true.
  // entry: 'checkin' (default) or 'practice' (the /stuck door: straight to the pick;
  // the check-in is offered after the practice).
  function startGuestFlow(entry){
    _guestFlow = true; _guestCI = null; _guestCI2 = null; _guestPracticed = false; _offerViewed = false;
    const practiceFirst = entry==='practice';
    const landed = gsGet().landed;          // read BEFORE the clear
    gsClear(); gsSet({ door: practiceFirst ? 'practice' : 'checkin', landed:1 });
    gVisits();   // count the visit-day for the conversion read
    // guest_land — arrival at the flow, BEFORE the check-in. The denominator for
    // everything: without it, a zero at the offer can't tell "nobody arrived" from
    // "arrived and bounced". No session exists yet (it mints at first write), so this
    // parks in Store and flushes when it does. Once per tab — a reload mid-flow is not
    // a new arrival.
    if(!landed) gtrack('guest_land', { door: practiceFirst ? 'practice' : 'checkin', visits:gVisits() });
    practiceFirst ? guestPracticePick() : guestCheckin('before');
  }
  // Mint the anonymous session on demand, exactly once, at first write.
  function ensureGuestSession(){
    if(Store.user()) return Promise.resolve({});
    return Promise.resolve(Store.signInAnonymously());
  }

  // ---- guest check-in (streamlined, tabbar-free) ----
  // Three sliders + the live mirror + "ask me differently". Intentionally omits the
  // paid-side folds (challenge / "choose your next practice" = recommender
  // personalization) and context tagging (patterns = paid) — the guest taste is
  // generic by design. The saved check-in is source-tagged 'guest' so guest-origin
  // signups never blend into the paid-trial cohort read (GMS condition, 2026-07-10).
  //
  // Three modes:
  //   'before' — the front door (check-in-first). Trust line + quiet sign-in live here
  //              now that the arrival is retired. No session exists until the CTA tap.
  //   'after'  — the second read, post-practice. SAME three questions as the before-read
  //              (like compares with like), sliders reset to the middle — never anchored
  //              to the pre-practice values, so the second read is independent.
  //   'post'   — the /stuck door's OFFERED check-in after its practice. First and only
  //              read there (no "before"), so it leads to the reflection, not a compare.
  function guestCheckin(mode, err){
    mode = mode || 'before';
    clearFigures(); document.body.classList.remove('in-practice');
    let v=50, s=50, d=50;   // symmetric midpoints; nothing suggested
    const gsQ = gsGet().q;
    const qIdx = (mode==='after' && gsQ) ? { v:gsQ.v, sym:gsQ.sym, dor:gsQ.dor }
               : { v:ciRand('v',-1), sym:ciRand('sym',-1), dor:ciRand('dor',-1) };
    const entry = mode==='before';
    root.innerHTML = `
      <header class="appbar">${entry && Store.user() ? '<button class="backbtn" id="g-ci-back">Back</button>':''}</header>
      <div class="scroll" id="content"></div>`;
    // back exists only on a re-visited before-read (reflection -> back). Backing off it
    // = abandon (discard the anonymous session). The entry screen has no back — there is
    // nothing behind it any more; leaving is closing the tab or the quiet sign-in link.
    const gcb = $('#g-ci-back'); if(gcb) gcb.onclick = ()=>guestLeave();
    $('#content').innerHTML = `<div class="view checkin2 ci4">
        <div class="scr-head">
          <p class="eyebrow">${mode==='before' ? 'Before your practice' : 'After your practice'}</p>
          <h2 class="scr-h">Right now, how easy would it be to&hellip;</h2>
        </div>
        <div class="ci-block">
          <div class="ci4-scale" aria-hidden="true"><span>Harder</span><span>Easier</span></div>
          <div class="sliders">
            ${ci4SliderHTML('v', CI_BANK.v[qIdx.v], 'r-v', v)}
            ${ci4SliderHTML('sym', CI_BANK.sym[qIdx.sym], 'r-sym', 100-s)}
            ${ci4SliderHTML('dor', CI_BANK.dor[qIdx.dor], 'r-dor', 100-d)}
          </div>
          ${mode==='after' ? '' : '<button class="ci-shuffle" id="ci-shuffle" type="button">Change the questions</button>'}
          <div class="ci-reading" id="ci-reading"></div>
          ${err?`<p class="autherr" style="margin-top:10px">${escapeHtml(err)}</p>`:''}
        </div>
        <div class="actionbar">
          <button class="btn block" id="g-ci-save">${mode==='after' ? 'See what changed' : 'See what you described'}</button>
          ${mode==='post' ? '<button class="navlink" id="g-ci-skip" style="align-self:center">Not now</button>' : ''}
          ${entry ? `<p class="fineprint" style="text-align:center;margin:2px 0 0">Nothing is saved unless you decide to create an account.</p>
          <p class="fineprint" style="text-align:center;margin:0">Already have an account? <button class="linkbtn" id="g-ci-signin" style="font-size:inherit;padding:2px">Sign in</button></p>` : ''}
        </div>
      </div>`;
    const axTouched = {};
    function refresh(){
      setIcoLvl('v',v); setIcoLvl('sym',s); setIcoLvl('dor',d);
      const colOf = ciAxisColorFn(v, s, d, axTouched);
      ciPaintSliders(colOf);   // rails + anchoring glyphs move together
      const reading = $('#ci-reading');
      if(reading){
        /* 2026-08-17 — the name IS the reading (Justin). 2026-08-22 — it always shows:
           untouched sliders are the person's answer, so there is always a state to
           name. Dead-centre keeps its sentence, the one case with no name to give. */
        const rd = window.PVCurrent.readingOf(v/100, s/100, d/100);
        reading.innerHTML = `<span class="ci-reading-name">${rd.label || rd.dominant}</span>`;
        reading.hidden = false;
      }
    }
    bindSlider('v', val=>{v=val;axTouched.v=1;refresh();});
    bindSlider('sym', val=>{s=100-val;axTouched.sym=1;refresh();});
    bindSlider('dor', val=>{d=100-val;axTouched.dor=1;refresh();});
    refresh();
    const shuf = $('#ci-shuffle'); if(shuf) shuf.onclick = ()=>{
      ['v','sym','dor'].forEach(ax=>{
        qIdx[ax] = ciRand(ax, qIdx[ax]);
        const q = root.querySelector('#q-'+ax); if(q) q.textContent = CI_BANK[ax][qIdx[ax]];
        const sl = $('#sl-'+ax); if(sl) sl.setAttribute('aria-label','How easy would it be to '+CI_BANK[ax][qIdx[ax]]);
      });
    };
    const skip = $('#g-ci-skip'); if(skip) skip.onclick = ()=>guestOffer();
    const gsi = $('#g-ci-signin'); if(gsi) gsi.onclick = ()=>{
      _guestFlow = false; gsClear();
      const go = ()=>{ authMode='in'; screenSignIn(); };
      Promise.resolve(Store.user() ? Store.signOut() : null).then(go).catch(go);
    };
    $('#g-ci-save').onclick = (e)=>{
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'One moment…';
      // source = the DOOR the person came through (?src=, validated; 'direct' if none).
      // Supersedes the flat 'guest' bucket (GMS 2026-07-13): once there is more than one
      // door, a single bucket can't tell us which one produced anything. Guest-origin is
      // still identifiable — it is exactly the Store.SRC_ALLOW set, which no signed-in
      // write can produce (those use 'post-practice' or null).
      const vals = { v:v/100, sym:s/100, dor:d/100, source:Store.src() };
      // the anonymous session mints HERE, at first write — not at page-load.
      ensureGuestSession().then(res=>{
        if(res && res.error) return guestCheckin(mode, res.error);
        Store.addCheckin(vals);
        haptic('save');
        const read = { v:v/100, sym:s/100, dor:d/100 };
        if(mode==='after'){ _guestCI2 = read; gsSet({ ci2:read }); guestBeforeAfter(); }
        else { _guestCI = read; gsSet({ ci1:read, q:qIdx }); guestReflection(); }
      }).catch(e2=>{
        const msg = String((e2&&e2.message)||e2||'');
        // a raw browser network error (offline, DNS, CORS preflight, etc.) reads as
        // jargon and blame ("Failed to fetch"). swap it for plain, corrective copy;
        // anything else (a real validation/server message) still shows as-is.
        const friendly = /fail(ed)? to fetch|networkerror|load failed|network request failed/i.test(msg)
          ? "couldn't reach the server. your check-in still works on this device."
          : msg;
        guestCheckin(mode, friendly);
      });
    };
  }

  // ---- guest reflection (immediate single-check-in state read) ----
  // Free forever (GMS): the immediate state read from a check-in. Mirrors what the
  // person named — the dominant state, in the tri-glyph marks, with the mirror line.
  // THE APP'S OWN mirror sentence (ciMirror) — the guest copy is never forked. They
  // described; the app names. No reader/blog, no "recommended for you" (paid).
  function guestReflection(){
    clearFigures(); document.body.classList.remove('in-practice');
    const ci = _guestCI || { v:.5, sym:.5, dor:.5 };
    const dom = window.PVCurrent.dominantOf(ci.v, ci.sym, ci.dor);
    const name = STATE_NAME(dom.key);
    root.innerHTML = `
      <header class="appbar">${_guestPracticed ? '' : '<button class="backbtn" id="g-rf-back">Back</button>'}</header>
      <div class="scroll" id="content"></div>`;
    const grb = $('#g-rf-back'); if(grb) grb.onclick = ()=>guestCheckin('before');
    $('#content').innerHTML = `<div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">What you described</p>
          <div class="g-glyph">${triGlyph(dom.key)}</div>
          <h1 class="scr-h" style="margin-top:14px">${escapeHtml(CAP(name))}</h1>
          <p class="scr-lede">${escapeHtml(ciMirror(ci.v, ci.sym, ci.dor))}</p>
          ${_guestPracticed ? '' : '<p class="scr-lede">Now that you\'ve checked in, you\'re ready for your practice.</p>'}
        </div>
        <div class="actionbar">
          ${_guestPracticed
            ? '<button class="btn block" id="g-rf-next">Next</button>'
            : '<button class="btn block" id="g-rf-practice">Try my practice</button><button class="navlink" id="g-rf-save" style="align-self:center">Keep this check-in</button>'}
        </div>
      </div>`;
    // post-practice (the /stuck door's offered check-in): the way on is the offer
    const rfp = $('#g-rf-practice'); if(rfp) rfp.onclick = ()=>guestPracticePick();
    const rfs = $('#g-rf-save');     if(rfs) rfs.onclick = ()=>guestOffer();
    const rfn = $('#g-rf-next');     if(rfn) rfn.onclick = ()=>guestOffer();
  }

  // ---- guest practice pick: all six options, two open (mindfulness, chosen by TIME) ----
  // The menu shows the REAL app's menu in the real order — nothing is hidden. Locked is
  // FADED INK ONLY: same card, same fill, no dashes, no padlocks, chevron hidden.
  // Greyed out does not mean filled in. The two open options are the two mindfulness
  // practices; the choice is a time question, never a state match (that's the paid line).
  // NEVER the 'most' (self-regulation) branch — the hard safety boundary for anonymous
  // visitors — and no safety anchoring: never demo what you're about to take away.
  function guestPracticePick(){
    // hard stop: one practice per guest. If they've already had it, the only way on is the offer.
    if(_guestPracticed) return guestOffer();
    clearFigures(); document.body.classList.remove('in-practice');
    const P_ICO = {
      micro:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
      mindfulness: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>',
      anchoring:   ico('heart',{color:'var(--track-safety-ink)'}),
      most:        `<span class="p-ico-pair">${ico('bolt',{color:'var(--track-self-ink)'})}${ico('x',{color:'var(--track-self-ink)'})}</span>`,
      more:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4.2" height="7" rx="1.6"/><rect x="17.3" y="13" width="4.2" height="7" rx="1.6"/></svg>',
    };
    // the two open subs carry the estimate — sourced from PRACTICE_EST at the SAME
    // silence guestLaunch actually passes, so the promised times are the real times.
    const estTiny = estMinutes('micro', 2), estFull = estMinutes('mindfulness', 4);
    const OPTS = [
      { key:'micro',       open:true,  title:'A tiny practice',          sub:`about ${estTiny} min · one sense, done` },
      { key:'mindfulness', open:true,  title:'Simple mindfulness',       sub:`about ${estFull} min · the gentlest, a calm place to start` },
      { key:'anchoring',   open:false, title:'Connect with safety',      sub:'Settling in through your senses' },
      { key:'most',        open:false, title:'Practice self-regulation', sub:'The deepest, meeting what is hard' },
      { key:'more',        open:false, title:'More practices',           sub:'Standalone guided practices' },
    ];
    const card = (o)=> o.open ? `
      <button class="wincard p-opt g-opt" data-gkey="${o.key}">
        <span class="p-opt-ico" aria-hidden="true">${P_ICO[o.key]||''}</span>
        <span class="wc-text">
          <span class="wc-title">${escapeHtml(o.title)}</span>
          <span class="wc-reason">${escapeHtml(o.sub)}</span>
        </span>
        <span class="wc-go">${CHEV}</span>
      </button>` : `
      <div class="wincard p-opt g-opt g-locked" aria-disabled="true">
        <span class="p-opt-ico" aria-hidden="true">${P_ICO[o.key]||''}</span>
        <span class="wc-text">
          <span class="wc-title">${escapeHtml(o.title)}</span>
          <span class="wc-reason">${escapeHtml(o.sub)}</span>
        </span>
        <span class="wc-go">${CHEV}</span>
      </div>`;
    // the tuned card leads, exactly as in the real app — faded, with the honest reason
    const tunedCard = `
      <div class="wincard tuned-card track-mind g-locked" aria-disabled="true" style="margin-bottom:12px">
        <span class="wc-text">
          <span class="tuned-kicker">Made for you</span>
          <span class="wc-title">Your custom practice</span>
          <svg class="tuned-line" viewBox="0 0 120 6" preserveAspectRatio="none" aria-hidden="true"><path d="M2 4 C 30 1.5, 70 5.5, 118 2.5"/></svg>
          <span class="wc-reason">Needs a bit more check-in data</span>
        </span>
        <span class="wc-go">${CHEV}</span>
      </div>`;
    // Practice-first (the /stuck door): the pick is this person's FIRST screen — there is
    // nothing behind it, so it gets no back button. Check-in-first guests keep
    // back -> reflection, a real return. ("keep this check-in" was CUT from this screen:
    // the reflection behind them offers it, and back returns there.)
    root.innerHTML = `
      <header class="appbar">${_guestCI?'<button class="backbtn" id="g-pp-back">Back</button>':''}</header>
      <div class="scroll" id="content"></div>`;
    const gpb = $('#g-pp-back'); if(gpb) gpb.onclick = ()=>guestReflection();
    $('#content').innerHTML = `<div class="view p-view">
        <div class="scr-head">
          <p class="eyebrow">Your choice</p>
          <h2 class="scr-h">How long would you like to practice?</h2>
        </div>
        ${tunedCard}
        <div class="p-opts g-opts">${OPTS.map(card).join('')}</div>
      </div>`;
    content().querySelectorAll('[data-gkey]').forEach(b=>b.onclick=()=>guestLaunch(b.dataset.gkey));
  }

  // ---- guest practice launch + tabbar-free shell ----
  function guestLaunch(key){
    if(key!=='mindfulness' && key!=='micro'){   // hard guard: guests get only the two mindfulness practices
      showToast('That one opens once you have an account.'); return guestPracticePick();
    }
    // Generic, non-personalized defaults. Silence values are load-bearing: the pick
    // screen promised "about 2 min / about 6 min" from PRACTICE_EST — micro runs on its
    // fixed short gaps (2, same as the real app) and mindfulness gets 4, the estimate's
    // basis. Any other value makes the promised times a lie.
    const sense = 'touch', silence = key==='micro' ? 2 : 4;
    const ps = { embed:'1', autostart:'1', practice:key, sense, silence:String(silence) };
    const src = 'player.html?'+new URLSearchParams(ps).toString();
    const reco = { practiceKey:key, sense, silence };
    // the /stuck door reaches here with no session yet (its first write is the session
    // log at practice end) — mint now so that write has somewhere to land.
    ensureGuestSession().then(res=>{
      if(res && res.error){ showToast('Something went wrong. Please try again.'); return guestPracticePick(); }
      guestPracticeShell(src, reco);
    }).catch(()=>{ showToast('Something went wrong. Please try again.'); guestPracticePick(); });
  }
  // Same as practiceShell, but with NO tabbar — a guest must not gain tab access
  // (and its 'most' path) mid-practice. Back returns to the guest pick screen.
  function guestPracticeShell(src, reco){
    haptic('start');
    setHTML(`
      <div class="weaver-wrap">
        <div class="weaver-loading" id="weaver-loading" aria-live="polite"><span class="wl-ring" aria-hidden="true"></span><span class="wl-txt">Preparing your practice</span></div>
        <iframe class="weaver-frame" id="weaver" src="${src}" title="guided practice" allow="autoplay; screen-wake-lock"></iframe>
      </div>`);
    const _wf=$('#weaver'), _wl=$('#weaver-loading');
    let _wlDone=false;
    const _wlTimeout=setTimeout(()=>{
      if(_wlDone||!_wl) return;
      _wl.innerHTML='<span class="wl-txt">Can’t load the practice right now. Check your connection and try again.</span><button class="set-quiet actionbar-aux" id="wl-back" style="margin-top:14px">Back</button>';
      const b=document.getElementById('wl-back'); if(b) b.onclick=()=>guestPracticePick();
    }, 10000);
    if(_wf&&_wl) _wf.addEventListener('load',()=>{ _wlDone=true; clearTimeout(_wlTimeout); _wl.classList.add('gone'); setTimeout(()=>{ try{_wl.remove();}catch(e){} },600); });
    window._pendingReco = beginPractice(reco);
  }

  // ---- what changed (before/after) ----
  // Two tri-glyphs, the two state names, then the two reads in plain speech. THE RULE
  // THAT KEEPS THIS SCREEN SAFE: report the two reads and NEVER attribute the gap to
  // the practice. No "the practice worked", no arrow-up-good, no percentages, no
  // "you improved by". The moment the app claims credit for a good delta, a bad delta
  // becomes a verdict on the person. All three outcomes are normal; none is a result.
  function guestBeforeAfter(){
    const a = _guestCI  || gsGet().ci1 || null;
    const b = _guestCI2 || gsGet().ci2 || null;
    if(!a || !b) return guestOffer();   // a read was lost (tab closed mid-flow): no honest comparison, on to the offer
    const da = window.PVCurrent.dominantOf(a.v, a.sym, a.dor);
    const db = window.PVCurrent.dominantOf(b.v, b.sym, b.dor);
    // Per-axis movement, in the SAME felt bands the mirror speaks in (ciBucket) — a
    // slider nudge that doesn't change the band isn't movement. Direction of "ease":
    // connecting easier (+v), energy settling (−sym), doing more in reach (−dor).
    const mv = ciBucket(b.v)   - ciBucket(a.v);
    const ms = ciBucket(b.sym) - ciBucket(a.sym);
    const md = ciBucket(b.dor) - ciBucket(a.dor);
    const net = (mv>0?1:mv<0?-1:0) + (ms<0?1:ms>0?-1:0) + (md<0?1:md>0?-1:0);
    let body;
    if(net > 0){
      // it eased — describe what actually moved, axis by axis, in the register of
      // Justin's example ("You're feeling more connected. Doing things is about the
      // same. And your energy settled."). 🖊 clause bank assembled from that example +
      // the mirror's vocabulary; flag any clause that reads off and I'll adjust.
      const cv = mv>0 ? "you're feeling more connected"        : mv<0 ? 'connecting feels harder right now'          : 'connecting is about the same';
      const cd = md<0 ? 'doing things feels more within reach' : md>0 ? 'doing things takes more effort right now'   : 'doing things is about the same';
      const cs = ms<0 ? 'your energy settled'                  : ms>0 ? "there's more energy in your body"           : 'your energy is about the same';
      const cap = (t)=>t.charAt(0).toUpperCase()+t.slice(1);
      body = `${cap(cv)}. ${cap(cd)}. And ${cs}.`;
    } else if(net < 0){
      body = "Something felt challenging. Not uncommon at all. Sometimes, slowing down and paying attention brings forth what's waiting for your attention.";
    } else {
      body = "Your before and after are about the same. That's common. This particular practice may not have been the best fit for your system at this time.";
    }
    setHTML(`
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>`);
    $('#content').innerHTML = `<div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">Your before and after</p>
        </div>
        <div class="ba-body">
          <div class="ba-pair">
            <div class="ba-col"><div class="ba-glyph">${triGlyph(da.key)}</div><div class="ba-state">${escapeHtml(STATE_LABEL(da.key))}</div></div>
            <div class="ba-arrow" aria-hidden="true">→</div>
            <div class="ba-col"><div class="ba-glyph">${triGlyph(db.key)}</div><div class="ba-state">${escapeHtml(STATE_LABEL(db.key))}</div></div>
          </div>
          <p class="scr-lede">${escapeHtml(body)}</p>
          <p class="scr-lede">That was your first practice and check-ins! This already tells you something about your state and how your system responds… at least, to this particular practice.</p>
          <p class="scr-lede">Over time, with more check-ins and practices, you can watch your nervous system change, identify what practices work best, and master self-regulation skills. This system adapts with you and your capacity.</p>
          <p class="scr-lede">Sign up for a free account on the next page to keep checking in as much as you want. Or, subscribe for unlimited custom practices and deep insights based on your check-ins.</p>
        </div>
        <div class="actionbar">
          <button class="btn block" id="g-ba-next">Next</button>
          <button class="navlink" id="g-ba-no" style="align-self:center">No thanks</button>
        </div>
      </div>`;
    $('#g-ba-next').onclick = ()=>guestOffer();
    $('#g-ba-no').onclick   = ()=>guestLeave();
  }

  // ---- the offer (replaces the old save-invite screen) ----
  // "Two ways to keep going." — no body; the cards do the work. Paid leads; the free
  // card is SAME weight, no fade — free has to be genuinely takeable, or the honest-
  // offer stance is decorative. No trial: free or paid, nothing between (Justin,
  // 07-13). No urgency, no countdowns, no discounts. Email + password + consent come
  // on the form AFTER the choice — that's the moment of consent.
  let _offerViewed = false;
  function guestOffer(){
    clearFigures(); document.body.classList.remove('in-practice');
    if(!_offerViewed){ _offerViewed = true; gtrack('offer_view', { door:guestDoor(), checkins:gCheckinCount(), visits:gVisits() }); }
    root.innerHTML = `
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>`;
    $('#content').innerHTML = `<div class="view offer-view">
        <div class="scr-head">
          <h1 class="scr-h" style="font-size:calc(26px * var(--type-scale))">Two ways to keep going.</h1>
        </div>
        <div class="offer-card offer-paid">
          <h2>Your personal self-regulation tool</h2>
          <ul>
            <li>Practices built from your check-ins, not picked off a list</li>
            <li>All six practices, including the safety practices</li>
            <li>What shows up across all your check-ins: when you're most regulated, what keeps repeating, which practices actually help</li>
            <li>Your personal reader, from the moment to the day to the week and beyond</li>
          </ul>
          ${planPickerHTML()}
          <button class="btn block" id="g-of-sub">Subscribe now</button>
          <p class="fineprint" style="margin-top:10px">Renews automatically at the interval you pick; cancel anytime from settings. No refunds or pauses.</p>
          <details class="offer-more">
            <summary>What you get when you subscribe ▾</summary>
            <div class="offer-more-body">
              <p><b>Practices:</b> get custom practices designed for your system based on your check-ins. The practice builder prioritizes safety and only offers more challenge when you've reported that you can handle it through your check-ins. You also get a deep custom practice builder and pre-recorded experiences as well.</p>
              <p><b>Analytics:</b> the more you check in, the more you learn about yourself. Identify what time of day, what day of the week, and even what season of the year bring you the most safety or the most challenge. See how practices affect your system and which ones help the most.</p>
              <p><b>Personal reader:</b> your check-ins and analytics create your personal reader. It's like a blog just for you that dynamically changes based on your check-ins and practices.</p>
            </div>
          </details>
        </div>
        <div class="offer-card offer-free">
          <h2>Keep going for free.</h2>
          <ul>
            <li>Check in as often as you like</li>
            <li>Both mindfulness practices, the short one and the full one, as often as you want</li>
            <li>Your check-in history, saved</li>
          </ul>
          <button class="btn block quiet" id="g-of-free">Continue free</button>
        </div>
        <p class="fineprint" style="text-align:center;margin:14px 0 0">Already have an account? <button class="linkbtn" id="g-of-signin" style="font-size:inherit;padding:2px">Sign in</button></p>
        <div class="actionbar">
          <button class="navlink" id="g-of-leave" style="align-self:center">Leave without saving</button>
        </div>
      </div>`;
    wirePlanPicker();
    // "Already have an account?" — the offer screen was the one place in the guest flow
    // with no way back to an existing account, so a returning subscriber on a new device
    // or browser hit a wall that only offered to sell them what they already own. Same
    // operation as "leave without saving" (sign the anonymous session out, land on the
    // sign-in form) and the same affordance already on the guest check-in screen; only
    // the label differs, because the two are different questions to the person reading.
    const gof = $('#g-of-signin'); if(gof) gof.onclick = ()=>{ gtrack('guest_signin', { door:guestDoor(), from:'offer' }); guestLeave(); };
    $('#g-of-sub').onclick   = ()=>{ gtrack('subscribe_click', { door:guestDoor(), checkins:gCheckinCount(), visits:gVisits(), plan:_planChoice }); guestAccountForm('paid'); };
    $('#g-of-free').onclick  = ()=>{ gtrack('continue_free',   { door:guestDoor(), checkins:gCheckinCount(), visits:gVisits() }); guestAccountForm('free'); };
    // "leave without saving" means what it says: sign out, discard. The check-in
    // promised nothing is saved unless they decide to create an account; a quiet
    // bounce back into the flow would make that a lie.
    $('#g-of-leave').onclick = ()=>guestLeave();
  }

  // ---- the account form, after the choice ----
  // Calls Store.linkIdentity() (attach email+password to the same anonymous user), so
  // the guest's check-ins and session carry over with zero migration. The consent
  // fineprint is the app's own sign-up fineprint, reused verbatim — this screen is the
  // moment of consent. Paid continues into Stripe Checkout (standalone acct, NO trial).
  // 🖊 heading + button labels are functional UI copy, not from the closed set — flag
  // if the register is off.
  function guestAccountForm(mode, err, busy){
    const paid = mode==='paid';
    setHTML(`
      <div class="view gate">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <p class="eyebrow">${paid ? (_planChoice==='annual' ? 'subscribe · $108/yr' : 'subscribe · $12/mo') : 'keep going for free'}</p>
          <h1 style="margin:10px 0 12px">Create your account.</h1>
          <div class="field"><label for="em">Email</label><input id="em" type="email" autocomplete="email" value="${escapeHtml(lastEmail)}"></div>
          <div class="field"><label for="nm">Your name <span style="color:var(--muted);font-weight:400">(optional)</span></label><input id="nm" type="text" autocomplete="name"></div>
          <div class="field"><label for="pw">Password</label><input id="pw" type="password" autocomplete="new-password"></div>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="g-go" style="margin-top:8px"${busy?' disabled':''}>${busy?'One moment…':(paid?'Continue to payment':'Create account')}</button>
          <p class="fineprint" style="margin-top:10px">By creating an account, you agree to the <a href="#" data-policy="terms">terms</a> and <a href="#" data-policy="privacy">privacy policy</a>.</p>
          <p class="fineprint" style="margin-top:6px">An anonymous copy of check-ins and practice data (no name, no email, no notes) helps us learn whether this app helps people and share examples of progress. It can never be traced back to you.</p>
          <p class="fineprint" style="margin-top:8px"><button class="linkbtn" id="g-back" style="font-size:inherit;padding:2px">Back</button></p>
        </div>
      </div>`);
    if(busy) return;
    root.querySelectorAll('.fineprint a[data-policy]').forEach(a=>{
      a.onclick = (e)=>{ e.preventDefault(); screenPolicy(a.getAttribute('data-policy')); };
    });
    $('#em').addEventListener('input', e=>{ lastEmail=e.target.value; });
    $('#pw').addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
    const gb = $('#g-back'); if(gb) gb.onclick = ()=>guestOffer();
    $('#g-go').onclick = submit;
    function submit(){
      const email=($('#em').value||'').trim(), pw=$('#pw').value;
      if(!email || (Store.cloud() && !pw)){ lastEmail=email; return guestAccountForm(mode, 'Enter your email and a password.'); }
      lastEmail=email;
      const nm = (($('#nm')||{}).value||'').trim();
      guestAccountForm(mode, null, true);
      Promise.resolve(Store.linkIdentity(email, pw)).then(res=>{
        if(res && res.error) return guestAccountForm(mode, res.error);
        if(nm) Store.setName(nm);
        markKnownDevice();
        _guestFlow = false; _guestCI = null; _guestCI2 = null; _guestPracticed = false; gsClear();
        if(res && res.needsConfirm) return screenConfirm(email);
        // Everyone who chose to subscribe goes to Checkout — invited or not. The old
        // fork (invited emails skipped the guest checkout and were sent to their trial
        // paywall) is dead with the trial: there is ONE offer now, so an invited email
        // gets the same terms as anyone else, and routing them past their own choice
        // would silently hand them a free account they didn't pick. Cohort survives only
        // as a reporting label on the billing row (the edge function stamps it).
        return Promise.resolve(Store.refreshBilling && Store.refreshBilling()).then(()=>{
          if(paid){
            return Promise.resolve(Store.startGuestCheckout ? Store.startGuestCheckout(_planChoice) : { error:'unavailable' }).then(r=>{
              if(r && r.error){ currentTab='today'; route(); showToast("couldn't open the payment page right now. your free account is ready."); }
            });
          }
          currentTab='today'; route();
        });
      }).catch(e=>guestAccountForm(mode, String((e&&e.message)||e)));
    }
  }

  // Abandon the guest flow entirely: sign the anonymous session out and land on the
  // quiet sign-in gate (which carries its own "start a check-in — no account needed"
  // way back in). The stray anonymous user + its rows are discarded — unsaved by definition.
  function guestLeave(){
    _guestFlow = false; _guestCI = null; _guestCI2 = null; _guestPracticed = false; gsClear();
    const done = ()=>{ authMode='in'; screenSignIn(); };
    Promise.resolve(Store.user() ? Store.signOut() : null).then(done).catch(done);
  }

  // ================================================================ THE FREE/PAID LINE
  // (2026-07-13. Built because the trial's removal left a hole: free was unconditional
  // but nothing was gated, so a $12/mo subscription bought nothing a free account
  // already had.)
  //
  // FREE, forever, no card, no time limit:
  //   · unlimited check-ins · the immediate state read (the mirror) · the two mindfulness
  //   practices (a tiny practice ~2min, simple mindfulness ~6min) · their own saved
  //   check-in history, as they recorded it · the breath · export.
  // THE BASE PLAN ($12/mo) adds:
  //   · the MATCHING — practices built from their check-ins
  //   · the other practices — connect with safety, self-regulation, the session library
  //   · the PATTERNS across all their check-ins (the You-tab cards + the deep read)
  //   · the READER — and it is not a weekly: from-justin runs the moment, the day, the
  //     week, the month and the quarter. Never call it "the weekly reader"; it undersells
  //     it and it is not true.
  // Free makes people feel seen; paid is how they change.
  //
  // HARD RULE: nothing a guest touches is ever taken away. The guest taster is exactly
  // the two mindfulness practices + the check-in + the state read — all free, forever.
  // Locked is FADED INK ONLY: same card, same fill, no padlocks, no dashes, no shame.
  // Greyed out does not mean filled in.
  const FREE_PRACTICES = ['micro','mindfulness'];
  function paidNow(){ try{ return !!(Store.isPaid && Store.isPaid()); }catch(e){ return false; } }
  function practiceFree(key){ return FREE_PRACTICES.indexOf(key) !== -1; }
  // what the person just reached for — named back to them on the subscribe screen, so
  // it answers the question they actually asked instead of pitching at them.
  const SUB_WHAT = {
    matching: 'practices built from your check-ins',
    practice: 'The other practices',
    patterns: 'the patterns across your check-ins',
    reader:   'the reader',
  };
  let _subFrom = null;
  function gateSubscribe(what){ _subFrom = what || null; screenSubscribe(); }

  // ---- billing interval picker (monthly / annual) ----
  // ONE product, ONE set of entitlements — the only difference is how often the card is
  // charged. Amounts are stated plainly. NO "save X%", "best value", "2 months free" or any
  // discount/urgency framing (standing brand guardrail). The annual card names its monthly
  // equivalent ($9 a month) only as a factual comparison, matching the /app page. Reads and
  // writes the shared _planChoice so every surface agrees. 🖊 copy draft — flag if register is off.
  function planPickerHTML(){
    const annual = _planChoice==='annual';
    return `<div class="plans" role="radiogroup" aria-label="billing interval">
      <button type="button" class="plan${annual?'':' on'}" data-plan="monthly" role="radio" aria-checked="${annual?'false':'true'}">
        <span class="price">$12<span class="per"> / month</span></span>
        <span class="plan-sub">Billed monthly</span>
      </button>
      <button type="button" class="plan${annual?' on':''}" data-plan="annual" role="radio" aria-checked="${annual?'true':'false'}">
        <span class="price">$108<span class="per"> / year</span></span>
        <span class="plan-sub">Billed once a year · that's $9 a month</span>
      </button>
    </div>`;
  }
  function wirePlanPicker(){
    root.querySelectorAll('.plans .plan').forEach(el=>{
      el.onclick = ()=>{
        _planChoice = el.getAttribute('data-plan')==='annual' ? 'annual' : 'monthly';
        const box = el.closest('.plans'); if(!box) return;
        box.querySelectorAll('.plan').forEach(p=>{ const on=p===el; p.classList.toggle('on',on); p.setAttribute('aria-checked', on?'true':'false'); });
      };
    });
  }

  // ---------------------------------------------------------------- subscribe
  // NOT a paywall. Nothing is blocked and there is no exit cost — this screen is only
  // ever reached by someone who chose it (settings, or by reaching for a base-plan
  // thing). Free stays free, with no time limit. No trial, no card until this moment,
  // no countdown, no discount, no "you're missing out".
  // 🖊 COPY IS DRAFT — Justin is rewriting the offer copy; this is the honest placeholder,
  // not the final register. The structural rule that carries over from the offer screen:
  // staying free must never be styled as a shameful exit.
  function screenSubscribe(err, busy){
    const what = _subFrom && SUB_WHAT[_subFrom];
    setHTML(`
      <div class="view gate">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <p class="eyebrow">The base plan</p>
          <h1 style="margin:10px 0 12px">${what ? escapeHtml(what)+' is on the base plan.' : 'Choose your plan'}</h1>
          <p class="lede" style="margin-bottom:6px">It adds practices built from your check-ins, the other practices, the patterns across all your check-ins, and the reader, which follows you from the moment to the day to the week and further out. Cancel anytime.</p>
          ${planPickerHTML()}
          <p class="fineprint" style="margin-bottom:18px">Your card is charged today. It renews automatically at the interval you pick; cancel anytime from settings. No refunds or pauses. What you use now stays free either way, with no time limit.</p>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="pw-go"${busy?' disabled':''}>${busy?'One moment…':'Subscribe'}</button>
          <p class="fineprint" style="margin-top:14px"><button class="linkbtn" id="pw-back" style="font-size:inherit;padding:2px">Not now</button></p>
        </div>
      </div>`);
    if(busy) return;
    wirePlanPicker();
    $('#pw-go').onclick = ()=>{
      const plan = _planChoice;
      screenSubscribe(null, true);
      Promise.resolve(Store.startCheckout('member', plan)).then(res=>{
        if(res && res.error) return screenSubscribe(res.error);   // else the browser is redirecting to Stripe
      }).catch(e=>screenSubscribe(String((e&&e.message)||e)));
    };
    const bk=$('#pw-back'); if(bk) bk.onclick = ()=>{ _subFrom=null; route(); };
  }

  function screenConfirm(email){
    setHTML(`
      <div class="view gate"><div class="gate-body" style="text-align:center">
        <p class="eyebrow">Almost there</p>
        <h1 style="margin:12px 0 12px">Check your email.</h1>
        <p class="lede" style="margin-bottom:24px">We sent a confirmation link to <b style="font-weight:500;overflow-wrap:break-word">${escapeHtml(email)}</b>. it will come from "Supabase Auth", the service that keeps your account secure. tap it, then come back here to sign in.</p>
        <button class="btn block" id="back2">Back to sign in</button>
      </div></div>`);
    $('#back2').onclick=()=>{ authMode='in'; screenSignIn(); };
  }

  // forgot password: confirmation that the reset email went out
  function screenResetSent(email){
    setHTML(`
      <div class="view gate"><div class="gate-body" style="text-align:center">
        <p class="eyebrow">Reset link sent</p>
        <h1 style="margin:12px 0 12px">Check your email.</h1>
        <p class="lede" style="margin-bottom:24px">We sent a password reset link to <b style="font-weight:500;overflow-wrap:break-word">${escapeHtml(email)}</b>. it will come from "Supabase Auth", the service that keeps your account secure. tap the link and you'll come back here to choose a new password. it can take a couple of minutes to arrive.</p>
        <button class="btn block" id="back3">Back to sign in</button>
      </div></div>`);
    $('#back3').onclick=()=>{ authMode='in'; screenSignIn(); };
  }

  // landed here from the reset link in their email: already signed in,
  // one job — choose a new password.
  function screenNewPassword(err, busy){
    setHTML(`
      <div class="view gate"><div class="gate-body">
        <p class="eyebrow">New password</p>
        <h1 style="margin:12px 0 12px">Choose a new password.</h1>
        <p class="lede" style="margin-bottom:24px">You're signed in. Pick a new password and you're done.</p>
        <div class="field"><label for="npw">New password</label><input id="npw" type="password" autocomplete="new-password"></div>
        ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
        <button class="btn block" id="npw-go" style="margin-top:8px"${busy?' disabled':''}>${busy?'One moment…':'Save password'}</button>
      </div></div>`);
    if(busy) return;
    const submit=()=>{
      const pw=$('#npw').value;
      if(!pw || pw.length<6) return screenNewPassword('Use at least six characters.');
      screenNewPassword(null, true);
      Promise.resolve(Store.updatePassword(pw)).then(res=>{
        if(res && res.error) return screenNewPassword(res.error);
        _recovery=false;
        // reset links always open in the browser, never in the installed app
        // (an iOS limitation) — so if we're not running standalone, close the
        // loop with a pointer back home instead of quietly continuing here.
        const standalone = (navigator.standalone===true) || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
        if(!standalone) return screenResetDone();
        showToast('Password updated.'); currentTab='today'; route();
      }).catch(e=>screenNewPassword(String((e&&e.message)||e)));
    };
    $('#npw-go').onclick=submit;
    $('#npw').addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
  }
  // password saved from a browser tab (not the installed app): point them home.
  function screenResetDone(){
    setHTML(`
      <div class="view gate"><div class="gate-body" style="text-align:center">
        <p class="eyebrow">All set</p>
        <h1 style="margin:12px 0 12px">Password updated.</h1>
        <p class="lede" style="margin-bottom:24px">You can close this tab. Open the app from your Home Screen and sign in with your new password if it asks.</p>
        <button class="btn block" id="reset-done-continue">Or keep going here</button>
      </div></div>`);
    $('#reset-done-continue').onclick=()=>{ currentTab='today'; route(); };
  }
  // In-app reader for the create-account disclaimers. Back returns to the
  // create-account screen (authMode='up'), never into the main app.
  function screenPolicy(which, from){
    const isPriv = which==='privacy';
    const eyebrow = isPriv ? 'privacy policy' : 'terms of use';
    const title = isPriv ? 'What we keep, and what we don’t.' : 'How to get the most out of this app.';
    const lede = isPriv
      ? 'Written in plain language.'
      : 'Transparency before you begin.';
    const sections = isPriv ? [
      ['what we keep','This app keeps track of your email, in-app preferences and check-ins.'],
      ['why','So your account works, your history is here on every device you sign in from, to track progress, and make custom recommendations.'],
      ['what stays anonymous','An anonymous copy of check-ins and practice data also exists, with no name, no email, and none of your written notes. It cannot be traced back to you, even by us.'],
      ['what the anonymous copy is for','Two things, and only these: learning whether this app actually helps people, and sharing de-identified examples of what progress can look like (for instance, "one member\'s reported safety rose from 20% to 60% over six months"). Never advertising, never sold.'],
      ['who sees it',"Your identified data: only you. It isn't sold or given away, and no advertisers see it. Justin works with the anonymous copy to study whether the app helps and to improve it."],
      ['your control','You can delete your data, or your whole account, any time from settings (your data > delete my account). Deleting removes everything that identifies you, permanently. The anonymous copy stays, unlinked, forever.']
    ] : [
      ['what this is',"A tool for noticing your daily experiences through the lens of the nervous system and practicing your way back to safety. It isn't medical care, diagnosis, or therapy, nor should it replace any of those or other professional services."],
      ['in a crisis','If you’re in danger or thinking about harming yourself, contact the 988 Suicide &amp; Crisis Lifeline or your local emergency services. This app can’t help in an emergency.'],
      ['be gentle',"Everyone is different. There's no failing here, and no streak to keep. Use the app as you want and when you want. Practice at your cadence."],
      ['changes',"Justin may (and will) update the app and these terms over time. Updates keep the app working, and you'll hear about changes in the app or by email."]
    ];
    const PP=(t)=>`<p style="font-size:calc(15px * var(--type-scale));line-height:1.7;color:var(--ink-80);text-wrap:pretty;margin:0">${t}</p>`;
    setHTML(`
      <header class="appbar"><button class="backbtn" id="policy-back">Back</button></header>
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
          <p class="fineprint" style="margin-top:4px">Plain-language draft for this design. The final ${isPriv?'privacy policy':'terms'} will replace this before launch.</p>
        </div>
      </div>`);
    $('#policy-back').onclick = ()=>{ if(from==='settings'){ screenSettings(); } else { authMode='up'; screenSignIn(); } };
  }

  // ---------------------------------------------------------------- app shell
  let _mintedThisSession = false;

  // ═════════════════════════════════════════════════════════════════════════
  // MEMBER ONBOARDING (item 114, 2026-07-26)
  // Built from Claude Design's approved prototype — their sheet variant (1b).
  // Their path, kept: welcome + the choice · practice maker (spotlight) ·
  // reader (spotlight) · you-tab stats (spotlight) · check-in method ·
  // practice defaults · your name · done. Declining gives ONE card listing the
  // three unlocks and nothing else. Every card can be left.
  //
  // The gate is `paidNow() && !oriented`, deliberately NOT the ?checkout= param:
  // someone who closes the tab at Stripe and comes back tomorrow still gets
  // oriented, and so does an Academy member who never touched Stripe.
  //
  // The preference cards write the REAL settings — the same keys the settings
  // screen writes — so this is a walkthrough OF the app, not a copy of it.
  // 🖊 ALL COPY IS DRAFT for Justin.
  // ═════════════════════════════════════════════════════════════════════════
  // NON-PROD ONLY test entry (item 114). beta.stucknotbroken.com and localhost get
  // ?walkthrough=1, which clears the oriented flag and replays the whole thing as if the
  // account had just paid. Hostname-gated the same way config.js picks its database, so it
  // is structurally impossible on app.stucknotbroken.com — there is no flag to forget.
  function _obTestAllowed(){ try{ return location.hostname !== 'app.stucknotbroken.com'; }catch(e){ return false; } }
  function _obKey(){ const u=(Store.user()&&Store.user().id)||'anon'; return 'snb_oriented_'+u; }
  // Re-adding the PWA to the home screen hands the app a BRAND NEW storage container:
  // localStorage is empty even though the person has used the app for months, so the local
  // flag alone replays orientation at the worst possible moment. Server history is the
  // durable signal — anyone with a check-in on this account has self-evidently already been
  // through this. Backfill the local flag so the derivation runs once, not on every route.
  // (Justin, 2026-08-17: re-added the app to his home screen and got walked through again.)
  // Defaults to true when Store predates hydrated(), so this can never hard-lock orientation.
  function _obHydrated(){ try{ return !Store.hydrated || Store.hydrated(); }catch(e){ return true; } }
  function _orientedByHistory(){
    try{ return !!(Store.user() && Store.checkins && Store.checkins().length); }catch(e){ return false; }
  }
  function oriented(){
    let v = '';
    try{ v = localStorage.getItem(_obKey()) || ''; }catch(e){ v = ''; }
    if(v) return v;
    if(_orientedByHistory()){ try{ localStorage.setItem(_obKey(), 'history'); }catch(e){} return 'history'; }
    return '';
  }
  function setOriented(v){ try{ localStorage.setItem(_obKey(), v); }catch(e){} }
  function obTrack(name, meta){ try{ if(Store.trackEvent) Store.trackEvent(name, meta||{}); }catch(e){} }

  // ---- "what's new" one-time card (returning users, after the state-math rework) ----
  // Shown ONCE to an already-oriented user when they next open the app, so the change in
  // state naming / practice recommendations doesn't arrive unexplained. New users go through
  // onboarding instead (this fires only for oriented()). Bump the version suffix to re-show
  // for a future update. Copy is Justin's, verbatim; the mark is the onboarding mark.
  function _wnKey(){ const u=(Store.user()&&Store.user().id)||'anon'; return 'snb_whatsnew_statemath_'+u; }
  function whatsNewSeen(){ try{ return !!localStorage.getItem(_wnKey()); }catch(e){ return true; } }
  function markWhatsNewSeen(){ try{ localStorage.setItem(_wnKey(), '1'); }catch(e){} }
  function showWhatsNew(){
    if(document.getElementById('wn-scrim')) return;
    const wrap = document.createElement('div');
    wrap.className = 'wn-scrim'; wrap.id = 'wn-scrim';
    wrap.innerHTML = `
      <div class="wn-card" role="dialog" aria-modal="true" aria-label="app updates">
        <img class="wn-mark" src="${MARK}" alt="Stuck Not Broken">
        <h2 class="wn-h">App updates</h2>
        <p class="wn-p">Stuck Not Broken has undergone a major update to a couple of key things to give you an even better experience. Here's what to expect from now on:</p>
        <ul class="wn-list">
          <li>More accurate state naming and reflections based on your check-ins</li>
          <li>Much more accurate practice recommendations based on your self-reported capacity and previous practice history</li>
        </ul>
        <p class="wn-p">I changed some math stuff in the background to give you the best experience possible and to help you achieve even more levels of insight and regulation.</p>
        <p class="wn-p">Thanks for being an early SNB app user!</p>
        <p class="wn-sig">Justin</p>
        <button class="btn block" id="wn-ok" type="button">Got it</button>
      </div>`;
    // D271 (DQA 2026-07-30): this was aria-modal="true" with no focus management at all
    // — initial focus stayed on <body>, Tab reached six controls BEHIND the scrim before
    // it ever reached "got it", and Escape did nothing. A dialog that traps the pointer
    // has to trap the keyboard too, and it needs a conventional dismiss.
    const _prevFocus = document.activeElement;
    const close = ()=>{
      markWhatsNewSeen();
      try{ document.removeEventListener('keydown', onKey, true); }catch(e){}
      try{ wrap.remove(); }catch(e){}
      try{ if(_prevFocus && _prevFocus.focus) _prevFocus.focus(); }catch(e){}
    };
    const focusables = ()=>Array.prototype.filter.call(
      wrap.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'),
      el=>el.offsetParent !== null || el === document.activeElement);
    function onKey(e){
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); return; }
      if(e.key !== 'Tab') return;
      const f = focusables(); if(!f.length){ e.preventDefault(); return; }
      const first = f[0], last = f[f.length-1];
      if(!wrap.contains(document.activeElement)){ e.preventDefault(); first.focus(); return; }
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    wrap.addEventListener('click', e=>{ if(e.target===wrap) close(); });
    document.body.appendChild(wrap);
    document.addEventListener('keydown', onKey, true);
    const ok = wrap.querySelector('#wn-ok'); if(ok) ok.onclick = close;
    // land focus inside the dialog, on the action, not on <body>
    try{ if(ok) ok.focus({preventScroll:true}); }catch(e){ try{ if(ok) ok.focus(); }catch(_e){} }
    obTrack('whatsnew_shown', { v:'statemath' });
  }

  const OB_UNLOCKS = [
    ['spark', 'Practices created just for you', 'The app designs self-regulation practices for you and only you based on your history, practices, and preferences. (Feel free to customize further!)'],
    ['book',  'A personal reader',                  'It’s like a blog written just for you. It changes over time.'],
    ['chart', 'Deep data insights',                 'Get data analysis about everything, from when you’re most regulated, patterns, and which practices help. It needs a few check-ins first.']
  ];
  function _obIcon(k){
    const p = k==='spark' ? '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8"/>'
            : k==='book'  ? '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>'
            : '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';
    return '<span class="u-ic"><svg viewBox="0 0 24 24">'+p+'</svg></span>';
  }
  function obUnlockList(){
    return '<div class="ob-unlocks">'+OB_UNLOCKS.map(u=>
      '<div class="ob-unlock">'+_obIcon(u[0])+'<span><b>'+escapeHtml(u[1])+'</b><span class="u-s">'+escapeHtml(u[2])+'</span></span></div>').join('')+'</div>';
  }
  function obChip(group,val,label){ return '<button class="ob-chip" type="button" data-'+group+'="'+val+'">'+escapeHtml(label)+'</button>'; }
  const OB_METHOD_CAP = {
    sliders:'Best for someone who has a hard time identifying their state. Simply answer a few quick questions with three sliders.',
    states :'Choose your state, then fine-tune it with sliders. Best for someone familiar with their states and able to name them.',
    numbers:'One number per axis. Quickest if you already know what you would say.'
  };
  let OB_STEPS = [];
  function obBuildSteps(){
    const nm = (Store.getName && Store.getName()) || '';
    // 🖊 DRAFT COPY. Sentence case here, not the app's lowercase UI: Justin's call
    // (2026-07-26) — these cards carry the most reading in the app and legibility wins.
    // Kept short on purpose. The card gives reading room to the body and never to the
    // buttons, so long copy costs the scroll, not the action.
    OB_STEPS = [
      { id:'welcome', tab:'today', kind:'center',
        h:'Welcome',
        body:'<p class="ob-p">Thank you for subscribing. Three things just opened up for you:</p>'
           + '<ol class="ob-list"><li>Practices created just for you</li>'
           + '<li>A personal reader</li>'
           + '<li>Deep data insights</li></ol>'
           + '<p class="ob-p">Choose how you’d like to get started below.</p>'
           + '<p class="ob-sign">Justin</p>'
           + obMarkSVG(),
        actions:[{label:'Walk me through it',kind:'primary',go:1},{label:'Look around myself',kind:'quiet',go:'decline'}] },

      { id:'practice', tab:'practice', kind:'spot', target:'#p7-toggle', pad:8,
        h:'Your practice maker',
        body:'<p class="ob-p">This opens the practice maker. Want more silence? No problem. A certain visual? Sure thing. Do it all here.</p>' },

      { id:'reader', tab:'current', kind:'spot', target:'#you-reader', pad:8,
        h:'Your personal reader',
        body:'<p class="ob-p">Your personal reader changes based on your check-ins and practices. Over the moments, days, weeks, and beyond, it will have more and more information about you to learn from and build insight from.</p>' },

      { id:'stats', tab:'current', kind:'spot', target:'#carousel', pad:6,
        h:'Deep data insights',
        body:'<p class="ob-p">Find snapshot results of your data. Check-ins and practices accumulate here.</p>' },

      { id:'method', tab:'current', kind:'center',
        h:'How do you want to check in?',
        // preview + fixed-height wrap (Justin 2026-07-28): a real taste of the control
        // itself, not just a caption, and a min-height floor so picking between the much
        // taller state-picker preview and the one-line slider previews doesn't resize the
        // whole sheet under the person's thumb.
        body:'<p class="ob-p">All three record the same thing, so no need to worry about your history if you decide to change later.</p>'
           + '<div class="ob-chips" data-group="method">'+obChip('method','sliders','Question sliders')+obChip('method','numbers','Numbers')+obChip('method','states','State picker')+'</div>'
           + '<p class="ob-fine" data-cap="method"></p>'
           + '<div class="rs-preview ob-method-preview" id="ob-method-preview"></div>' },

      { id:'defaults', tab:'practice', kind:'center',
        h:'Practice defaults',
        body:'<p class="ob-p">You can change these any time you want, but this sets the defaults for now.</p>'
           + '<p class="ob-fine" style="margin:10px 0 3px">Connect to the present moment through</p>'
           + '<div class="ob-chips" data-group="sense">'+[['touch','Touch'],['sound','Sound'],['sight','Sight'],['movement','Movement'],['imagination','Imagination']].map(s=>obChip('sense',s[0],s[1])).join('')+'</div>'
           + '<p class="ob-fine" style="margin:14px 0 3px">How much silence</p>'
           + '<div class="ob-chips" data-group="silence">'+[[4,'A little'],[8,'Some'],[14,'A lot']].map(p=>obChip('silence',p[0],p[1])).join('')+'</div>' },

      { id:'name', tab:'practice', kind:'center',
        h:'What should the app call you?',
        body:'<p class="ob-p">(Or leave it blank.)</p>'
           + '<input class="ob-name" id="ob-name" type="text" placeholder="your name" autocomplete="given-name" value="'+escapeHtml(nm)+'">' },

      { id:'done', tab:'today', kind:'center',
        h:'Done.',
        body:'<p class="ob-p">And that’s it. Check in, do a practice, check in again. It gets more and more yours every time.</p>'
           + '<p class="ob-sign">Justin</p>'
           + obMarkSVG(),
        fine:'All of this is in settings, and the walkthrough is there if you want it again.',
        actions:[{label:'Take me in',kind:'primary',go:'end'}] },

      { id:'decline', tab:'today', kind:'center', standalone:true,
        h:'Here\u2019s what opened up',
        body:'<p class="ob-p">Enjoy exploring on your own. Here’s a brief rundown.</p>'+obUnlockList()
           + '<p class="ob-p" style="margin-top:12px">The walkthrough is in settings whenever you want it.</p>',
        actions:[{label:'Okay, in i go',kind:'primary',go:'end'}] }
    ];
  }
  function obMarkSVG(){
    // r9, generated from assets/logo/snb-mark.svg so the inline copy cannot drift from
    // the asset. Weight ladder: head/beard 9.5 - ears 6.5 - frame 5.5 - brows 5.2 -
    // nose 4.2 - eyes 3.6. Do not flatten these; six weights is a decision, not an accident.
    return '<svg class="ob-mark" viewBox="96 10 208 351" aria-hidden="true" fill="none" '
      + 'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
      + '<g id="snb-ears" stroke-width="6.5"> <path id="snb-ear-l" d="M 120,147 C 105,148 112,193 120,194"/> <path id="snb-ear-r" d="M 279.5,147 C 294.5,148 287.5,193 279.5,194"/> </g> <path id="snb-head" stroke-width="9.5" d="M 122,273.5 L 122,86 C 122,63 152,24.5 200,24.5 C 248,24.5 277.5,63 277.5,86 L 277.5,273.5"/> <g id="snb-brows" stroke-width="5.2"> <path id="snb-brow-l" d="M 181.5,108 Q 163,109 146,120"/> <path id="snb-brow-r" d="M 218.5,108 Q 237,109 254,120"/> </g> <g id="snb-glasses" stroke-width="5.5"> <circle id="snb-lens-l" cx="164.5" cy="151" r="25.5"/> <circle id="snb-lens-r" cx="235.5" cy="151" r="25.5"/> <path id="snb-bridge" d="M 192,146 Q 200,141.5 208,146"/> <path id="snb-arm-l" d="M 137.5,148 L 122.5,147"/> <path id="snb-arm-r" d="M 262.5,148 L 277.5,147"/> </g> <g id="snb-eyes-closed" stroke-width="3.6"> <path id="snb-eyec-l" d="M 152,156 C 152.5,144 176.5,144 177,156"/> <path id="snb-eyec-r" d="M 223,156 C 223.5,144 247.5,144 248,156"/> </g> <g id="snb-eyes-open" opacity="0"> <circle id="snb-eyeo-l" cx="164.5" cy="151" r="6" fill="currentColor" stroke="none"/> <circle id="snb-eyeo-r" cx="235.5" cy="151" r="6" fill="currentColor" stroke="none"/> </g> <ellipse id="snb-cheek-l" cx="154.5" cy="192.5" rx="20" ry="6.5" fill="var(--snb-cheek,#F19EEB)" stroke="none" transform="rotate(13.7 154.5 192.5)"/> <ellipse id="snb-cheek-r" cx="245.5" cy="192.5" rx="20" ry="6.5" fill="var(--snb-cheek,#F19EEB)" stroke="none" transform="rotate(-13.7 245.5 192.5)"/> <g id="snb-beard" stroke-width="9.5"> <path id="snb-ridge-1l" d="M 137.5,219.5 L 137.5,305.5"/> <path id="snb-ridge-1r" d="M 261.5,219.5 L 261.5,305.5"/> <path id="snb-ridge-2" d="M 154.5,328.5 L 154.5,258.25 A 45,45 0 0 1 244.5,258.25 L 244.5,328.5"/> <path id="snb-ridge-3" d="M 175.5,343.5 L 175.5,255.5 A 24.5,24.5 0 0 1 224.5,255.5 L 224.5,343.5"/> <path id="snb-ridge-4" d="M 200,262.5 L 200,346.5"/> </g> <path id="snb-nose" stroke-width="4.2" d="M 180,189 C 183,215 217,215 220,189"/>'
      + '</svg>';
  }
  let _ob = { i:0, min:0, on:false };
  // no back on the first card of the run. Re-entry from settings starts at 1, so back
  // there must not reach the welcome, which thanks them for subscribing all over again.
  function obCanBack(){ return _ob.i==='decline' ? true : (typeof _ob.i==='number' && _ob.i > _ob.min); }
  function obStep(x){ return x==='decline' ? OB_STEPS.filter(s=>s.id==='decline')[0] : OB_STEPS[x]; }
  let _obResize=null;
  function startOnboarding(fromSettings){
    if(_ob.on || $('#ob-root')) return;
    obBuildSteps();
    _ob.i = fromSettings ? 1 : 0; _ob.min = _ob.i; _ob.on = true;
    obTrack('orient_start', { from: fromSettings?'settings':'first_open' });
    if(!_obResize){ _obResize = ()=>{ if(_ob.on){ const st=obStep(_ob.i); if(st){ obPlace(st); obFade(); } } };
      window.addEventListener('resize', _obResize); }
    obPaint(true);
  }
  function endOnboarding(how){
    const d=$('#ob-root'); _ob.on=false;
    setOriented(how==='skip' ? 'skipped' : 'yes');
    obTrack(how==='skip' ? 'orient_skip' : 'orient_complete', { step: (obStep(_ob.i)||{}).id||'' });
    const c=$('#content'); if(c) c.style.transform='';
    if(d && d.parentNode) d.parentNode.removeChild(d);
  }
  function obEnsureRoot(){
    let d=$('#ob-root');
    // document.body, NOT root: app() rebuilds root.innerHTML on every render and on every
    // re-entry into route(), which is what made the sheet flash and disappear on beta.
    if(!d){ d=document.createElement('div'); d.id='ob-root'; d.className='ob-root'; document.body.appendChild(d); }
    return d;
  }
  function obPaint(first){
    let st=obStep(_ob.i); if(!st){ endOnboarding('done'); return; }
    // the 'done' card is the very next card after 'name' — greet by the name they just
    // typed (read live, not the value OB_STEPS was built with, which is stale by design:
    // steps are built once at onboarding start, before anyone has typed anything).
    // Justin, 2026-07-28: it should say the chosen name back on that next card.
    if(st.id==='done'){
      const nm=(Store.getName&&Store.getName())||'';
      if(nm) st=Object.assign({}, st, { body: st.body.replace('And that’s it.', 'And that’s it, '+escapeHtml(nm)+'.') });
    }
    // app(tab) rebuilds root.innerHTML, which takes the overlay with it — so switch the
    // tab FIRST and re-attach afterwards, never the other way round.
    if(st.tab && st.tab!==currentTab){ app(st.tab); }
    const d=obEnsureRoot();
    obTrack('orient_step', { step: st.id });
    const seq = OB_STEPS.filter(s=>!s.standalone && s.id!=='welcome' && s.id!=='done');
    const pos = seq.map(s=>s.id).indexOf(st.id);
    const actions = st.actions || [{ label:(pos===seq.length-1?'Done':'Next'), kind:'primary', go:'next' }];
    const showSkip = !st.actions;
    // dims/hole fade in on EVERY step now, not just the first (the .anim classes existed
    // in CSS but were never applied past the first paint, so a spotlight moving to a new
    // target — or vanishing/appearing between a spot card and a centered one — used to
    // snap instantly). The card itself gets the big rise-from-bottom only on first open;
    // every step after that gets a lighter fade+settle so the shape genuinely transitions
    // rather than cutting (Justin 2026-07-28: "onboarding shape-shift transition").
    let html = '<div class="ob-dim anim" data-side="t"></div><div class="ob-dim anim" data-side="b"></div>'
             + '<div class="ob-dim anim" data-side="l"></div><div class="ob-dim anim" data-side="r"></div>';
    if(st.kind==='spot') html += '<div class="ob-hole anim"></div>';
    html += '<div class="ob-card'+(first?' anim':' step')+'" role="dialog" aria-modal="true" aria-label="'+escapeHtml(st.h)+'">'
      + '<div class="ob-top">'
      + (obCanBack() ? '<button class="ob-back" type="button" data-go="back">'
          + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg>Back</button>' : '<span></span>')
      + '<span></span><span class="ob-toppad"></span></div>'
      + '<div class="ob-body">'
      + '<h2 class="ob-h">'+escapeHtml(st.h)+'</h2>'
      + st.body
      + (st.fine?'<p class="ob-fine">'+escapeHtml(st.fine)+'</p>':'')
      + '</div>'
      + '<div class="ob-foot">'
      + '<div class="ob-acts">'+actions.map(a=>'<button class="btn'+(a.kind==='quiet'?' quiet':'')+' block" type="button" data-go="'+a.go+'">'+escapeHtml(a.label)+'</button>').join('')+'</div>'
      + (showSkip ? '<div class="ob-row"><div class="ob-dots">'+seq.map((s,i)=>'<i class="'+(i===pos?'on':'')+'"></i>').join('')+'</div>'
          + '<button class="ob-skip" type="button" data-go="skip">I\u2019ll take it from here</button></div>' : '')
      + '</div></div>';
    d.innerHTML = html;
    obPlace(st);
    obWire(st);
    obFade();
    const card=d.querySelector('.ob-card'); if(card) card.focus && card.setAttribute('tabindex','-1');
  }
  // The footer fade means "there is more copy below". It used to paint unconditionally,
  // so on a card whose copy fitted exactly it washed out the last line for no reason
  // (measured: 0px between the method caption and the footer at 390 / 100%).
  function obFade(){
    const d=$('#ob-root'); if(!d) return;
    const card=d.querySelector('.ob-card'), body=d.querySelector('.ob-body');
    if(!card||!body) return;
    const upd=()=>card.classList.toggle('more', body.scrollTop + body.clientHeight < body.scrollHeight - 1);
    body.onscroll=upd; upd();
    // obPlace sets the card height in this same frame, so a synchronous read can catch a
    // stale clientHeight and miss a body that really does overflow. Re-measure after layout.
    requestAnimationFrame(upd); setTimeout(upd, 140);
  }
  function obPlace(st){
    const d=$('#ob-root'); const card=d.querySelector('.ob-card');
    // positioned against the viewport now that the overlay is a child of body
    const shellR = { left:0, top:0, width:window.innerWidth, height:window.innerHeight };
    const contentEl = $('#content'); if(contentEl) contentEl.style.transform='';
    const dims = [...d.querySelectorAll('.ob-dim')];
    const hole = d.querySelector('.ob-hole');
    let target = st.kind==='spot' ? document.querySelector(st.target) : null;
    // Two of the three spotlight targets are MOBILE-ONLY: #p7-toggle only renders for
    // paid-on-phone (renderMaker7b), and #carousel is replaced by the ledger on the wide
    // you-tab. On desktop they are absent, and an unguarded measure put the ring in the
    // top-left corner. Missing or zero-sized target => fall back to a plain centred card.
    if(target){ const tr=target.getBoundingClientRect(); if(!tr.width || !tr.height) target=null; }
    if(!target){
      // no spotlight: one full dim pane behind the card, the rest collapsed
      dims.forEach((el,i)=>{ el.style.cssText = i===0 ? 'inset:0' : 'display:none'; });
      if(hole) hole.style.display='none';
      return;
    }
    const p = st.pad==null?8:st.pad;
    const measure = ()=>{ const tr=target.getBoundingClientRect();
      return { x:tr.left-p, y:tr.top-p, w:tr.width+p*2, h:tr.height+p*2 }; };
    let r = measure();
    // the sheet is pinned to the bottom, so a low target would sit UNDER it.
    // lift the app content by the overlap and re-measure, so the ring stays visible.
    if(contentEl && card){
      const cardTop = card.getBoundingClientRect().top;
      const overlap = (r.y + r.h + 16) - cardTop;
      if(overlap > 0){ contentEl.style.transform='translateY('+(-Math.round(overlap))+'px)'; r = measure(); }
    }
    const W=shellR.width, H=shellR.height;
    const set=(el,x,y,w,h)=>{ el.style.cssText='left:'+x+'px;top:'+y+'px;width:'+Math.max(0,w)+'px;height:'+Math.max(0,h)+'px'; };
    set(dims[0], 0, 0, W, r.y);                       // top
    set(dims[1], 0, r.y+r.h, W, H-(r.y+r.h));         // bottom
    set(dims[2], 0, r.y, r.x, r.h);                   // left
    set(dims[3], r.x+r.w, r.y, W-(r.x+r.w), r.h);     // right
    if(hole){
      // conform to the target: take its own corner radius and grow it by the pad, so the
      // ring sits snug on a pill or a rounded button instead of boxing it in a rectangle.
      let br = 16;
      try{ const cs=getComputedStyle(target);
        const raw = cs.borderTopLeftRadius||'';
        const v = parseFloat(raw)||0;
        // A target with its own radius: match it and grow by the pad, so the ring is
        // parallel to the corner. A target with NO radius (most of ours are plain text
        // buttons) reads boxy at pad-only, so give it a pill capped at 28.
        br = raw.indexOf('%')>=0 ? Math.min(r.w,r.h)/2
           : v > 0 ? v + p
           : Math.min(r.h/2, 28);
        br = Math.min(br, Math.min(r.w,r.h)/2);
      }catch(e){}
      hole.style.cssText='left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px;border-radius:'+br+'px';
    }
  }
  function obWire(st){
    const d=$('#ob-root'); if(!d) return;
    d.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{
      const g=b.dataset.go;
      if(g==='skip'){ return endOnboarding('skip'); }
      if(g==='end'){ return endOnboarding('done'); }
      if(g==='decline'){ _ob.i='decline'; return obPaint(false); }
      if(g==='next'){
        // save the just-typed name immediately on advance — the input's own 'change'
        // listener only fires on blur, so tapping next without blurring first used to
        // carry the name past the very card that asked for it (2026-07-28, Justin: the
        // NEXT card after spelling it out should already say it back).
        if(st && st.id==='name'){ const ne=d.querySelector('#ob-name'); if(ne && Store.setName) Store.setName(ne.value.trim()); }
        _ob.i = (typeof _ob.i==='number' ? _ob.i+1 : 0); return obPaint(false);
      }
      // decline is a standalone card reached from the welcome, so its back goes there
      if(g==='back'){ _ob.i = (_ob.i==='decline') ? 0 : Math.max(_ob.min, _ob.i-1); return obPaint(false); }
      _ob.i = +g; obPaint(false);
    });
    // the preference cards write the SAME keys settings writes — a walkthrough OF the app
    const mSel = d.querySelector('[data-group="method"]');
    if(mSel){
      const cur = (()=>{ try{ return localStorage.getItem('snb_checkin_method')||'sliders'; }catch(e){ return 'sliders'; } })();
      const cap = d.querySelector('[data-cap="method"]');
      const prev = d.querySelector('#ob-method-preview');
      // numbers preview is a live illustration, same as settings: dragging its slider
      // moves the value on the right rather than sitting static.
      const bindPrev=()=>{ if(!prev) return; const r=prev.querySelector('.ci-prev-range'), n=prev.querySelector('.ci-prev-num'); if(r&&n) r.oninput=()=>{ n.textContent = Math.round((+r.value)/10); }; };
      const mark=(v)=>{ mSel.querySelectorAll('[data-method]').forEach(x=>x.classList.toggle('on', x.dataset.method===v));
                        if(cap) cap.textContent = OB_METHOD_CAP[v]||'';
                        if(prev){ prev.innerHTML = _methodPreview(v); bindPrev(); } };
      mark(cur);
      mSel.querySelectorAll('[data-method]').forEach(b=>b.onclick=()=>{
        try{ localStorage.setItem('snb_checkin_method', b.dataset.method); }catch(e){}
        mark(b.dataset.method); haptic('save'); obTrack('orient_pref',{pref:'method',value:b.dataset.method});
      });
    }
    const sSel = d.querySelector('[data-group="sense"]');
    if(sSel){
      const cur = (Store.prefSense && Store.prefSense()) || '';
      sSel.querySelectorAll('[data-sense]').forEach(x=>x.classList.toggle('on', x.dataset.sense===cur));
      sSel.querySelectorAll('[data-sense]').forEach(b=>b.onclick=()=>{
        if(Store.setPrefSense) Store.setPrefSense(b.dataset.sense);
        sSel.querySelectorAll('[data-sense]').forEach(x=>x.classList.toggle('on',x===b));
        haptic('save'); obTrack('orient_pref',{pref:'sense',value:b.dataset.sense});
      });
    }
    const qSel = d.querySelector('[data-group="silence"]');
    if(qSel){
      const cur = (Store.prefSilence && Store.prefSilence());
      qSel.querySelectorAll('[data-silence]').forEach(x=>x.classList.toggle('on', +x.dataset.silence===cur));
      qSel.querySelectorAll('[data-silence]').forEach(b=>b.onclick=()=>{
        if(Store.setPrefSilence) Store.setPrefSilence(+b.dataset.silence);
        qSel.querySelectorAll('[data-silence]').forEach(x=>x.classList.toggle('on',x===b));
        haptic('save'); obTrack('orient_pref',{pref:'silence',value:b.dataset.silence});
      });
    }
    const nameEl = d.querySelector('#ob-name');
    if(nameEl) nameEl.addEventListener('change', e=>{ if(Store.setName) Store.setName(e.target.value.trim()); });
  }

  /* ── one-time note after the naming change (2026-08-16) ────────────────────────────
   Own root and own key; deliberately NOT wired into the onboarding step machine, which
   has its own sequencing. Shown once, to existing users only: the whole point is that
   PAST names may read differently now, which is meaningless to someone with no history.
   Never over onboarding. Copy stays at "the language is clearer" per Justin — the
   internals are an internal argument, not something to tell people about their own past.
   The third line is the one that actually prevents confusion: reflections minted before
   today keep their original wording and will not always match the re-read names. */
function whatsNewNaming(){
  try{ if(localStorage.getItem('snb_whatsnew_naming')==='1') return; }catch(e){ return; }
  if(document.getElementById('wn-root')) return;
  if(document.getElementById('ob-root')) return;                 // never over onboarding
  try{ if(!(Store.checkins && Store.checkins().length)) return; }catch(e){ return; }
  const d=document.createElement('div'); d.id='wn-root'; d.className='wn-root';
  /* Justin's copy, 2026-08-16, used as written. Two deliberate departures from the
     standing in-app copy rules, both because THIS card is signed by him rather than
     spoken by the app: first person ("I've made"), and the mark as a sign-off. The
     no-first-person rule exists so the reader never sounds like Justin talking; a
     product announcement from the person who built it is the one place it should. */
  d.innerHTML = '<div class="wn-card" role="dialog" aria-modal="true" aria-label="App Updates">'
    + '<div class="wn-mark-wrap">' + (typeof obMarkSVG === 'function' ? obMarkSVG() : '') + '</div>'
    + '<h2 class="wn-h">App Updates</h2>'
    + '<p class="wn-p">I’ve made some significant changes to how the app’s background math works.</p>'
    + '<p class="wn-p">How this affects you: the check-in state naming is clearer. Instead of the one-dimensional state name, it now identifies the state and the level of it. Plus, it will name the secondary state. This should result in more clarity and deeper insights.</p>'
    + '<p class="wn-p">This will change the Reflections reader from here on as well. Your past Reflections won’t change though.</p>'
    + '<p class="wn-p">I also fixed an issue where the practice would cut off if your screen locked.</p>'
    + '<button class="btn block" id="wn-ok" type="button">Got it</button></div>';
  document.body.appendChild(d);
  requestAnimationFrame(()=>d.classList.add('on'));
  const close=()=>{ try{ localStorage.setItem('snb_whatsnew_naming','1'); }catch(e){} d.remove(); };
  const b=d.querySelector('#wn-ok'); if(b) b.onclick=close;
  try{ if(Store.trackEvent) Store.trackEvent('whatsnew_naming_seen',{}); }catch(e){}
}
addEventListener('load',()=>{ setTimeout(()=>{ try{ whatsNewNaming(); }catch(e){} }, 1400); });

function app(tab){
    currentTab = tab;
    if(!_mintedThisSession){ _mintedThisSession = true; mintPastDays(); mintWeeks(); mintMonths(); mintQuarters(); }
    const u = Store.user();
    setHTML(`
      <header class="appbar">
      </header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','now')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`);
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    ({ today:tabToday, current:tabCurrent, practice:tabPractice }[tab] || tabToday)();
    if(tab === 'today') maybeInstallNudge();
    if(tab === 'today') setTimeout(liveNudge, 400);   // "we're live" invitation (quiet, dismissible)
    maybeTrialBanner();
   
  }
  // install affordances: a quiet settings row + an optional dismissable today nudge
  function installRowInner(){
    const s = installState();
    if(s==='installed') return '<span class="val" style="font-weight:400">Installed</span>';
    if(s==='button') return '<button class="set-quiet in-go" type="button">Install this app</button>';
    if(s==='ios-share') return '<span class="ios-hint">To install: tap the share icon, then choose add to Home Screen.</span>';
    if(s==='open-elsewhere') return '<span class="ios-hint">'+openElsewhereMsg()+'</span>';
    return '<span class="ios-hint">To install: open your browser menu and choose install or add to Home Screen.</span>';
  }
  function maybeInstallNudge(){
    // android/chrome: native install button (beforeinstallprompt). iOS never fires
    // that event, so there the nudge carries the add-to-home-screen instruction.
    let s; try{ s = installState(); if(s==='installed' || s==='other') return; if(localStorage.getItem('snb_install_nudge') === 'dismissed') return; }catch(_){ return; }
    const c = content(); if(!c || document.getElementById('install-nudge')) return;
    const b = document.createElement('div'); b.className = 'install-nudge'; b.id = 'install-nudge';
    b.innerHTML = s==='button'
      ? '<span class="in-txt">Install the SNB app.</span><span class="in-actions"><button type="button" class="in-go">Install</button><button type="button" class="in-x" aria-label="dismiss">\u00d7</button></span>'
      : s==='open-elsewhere'
        ? '<span class="in-txt">'+openElsewhereMsg()+'</span><span class="in-actions"><button type="button" class="in-x" aria-label="dismiss">\u00d7</button></span>'
        : '<span class="in-txt">Install the app: tap the share icon, then <b>Add to Home Screen</b>.</span><span class="in-actions"><button type="button" class="in-x" aria-label="dismiss">\u00d7</button></span>';
    c.insertBefore(b, c.firstChild);
    const g = b.querySelector('.in-go'); if(g) g.onclick = promptInstall;
    const x = b.querySelector('.in-x'); if(x) x.onclick = ()=>{ try{ localStorage.setItem('snb_install_nudge','dismissed'); }catch(_){} b.remove(); };
  }
  // RETIRED 2026-07-13 — the trial is gone, so nothing can enter `trialing` and there is
  // no pending charge to warn anyone about. The banner existed to make sure nobody paid by
  // accident; with no card taken until someone chooses to subscribe, that can't happen.
  // Left as a no-op (call sites unchanged) rather than removed, so the deletion is one
  // reversible decision and not a scatter of edits. The `.trial-banner` CSS is now unused.
  function maybeTrialBanner(){ /* no trial exists any more */ }
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
  function tabBtn(t,label){ const on=currentTab===t, L=CAP(label); return `<button data-t="${t}" class="${on?'on':''}" aria-label="${L}"${on?' aria-current="page"':''}><span class="ic" aria-hidden="true">${tabIcon(t,on)}</span><span class="lb">${L}</span></button>`; }
  const content = () => $('#content');

  // ---------------------------------------------------------------- TODAY
  // ---- daily wins (no counter, no streak — three small things, checkable each day) ----
  function sameDay(t){ const d=new Date(t), n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate(); }
  // morning / afternoon / evening — the check-in resets each segment so you can notice
  // where you are at different times of day, and see those patterns build up over time.
  function segOf(t){ const h=new Date(t).getHours(); return h<5?'late':h<12?'morning':h<17?'afternoon':h<22?'evening':'late'; }
  function segLabel(seg){ return seg==='late'?'late night':seg; }
  // daypart symbols (Justin 2026-07-19: symbols where natural — a moon says
  // evening faster than the word). Quiet ink line icons, one per daypart.
  function segIco(seg){
    const P={
      morning:'<path d="M12 9a4 4 0 014 4H8a4 4 0 014-4z"/><path d="M12 4v2M5.3 6.8l1.4 1.4M18.7 6.8l-1.4 1.4M3 13h2M19 13h2M5 17h14"/>',
      afternoon:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
      evening:'<path d="M19 13.5A7.5 7.5 0 0110.5 5 7.5 7.5 0 1019 13.5z"/><path d="M17.5 4.5l.4 1.2 1.2.4-1.2.4-.4 1.2-.4-1.2-1.2-.4 1.2-.4z"/>',
      late:'<path d="M12 3l.9 2.6L15.5 6.5l-2.6.9L12 10l-.9-2.6L8.5 6.5l2.6-.9z"/><path d="M18 12l.6 1.8 1.8.6-1.8.6L18 16.8l-.6-1.8-1.8-.6 1.8-.6z"/><path d="M7 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>'
    };
    return P[seg]?'<svg class="seg-ico" viewBox="0 0 24 24" aria-hidden="true">'+P[seg]+'</svg>':'';
  }
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
      `Hi, ${name}.`,
      `Hey again, ${name}.`,
      `${name}'s back!`,
      `Good ${seg}, ${name}.`,
      `Welcome back, ${name}.`,
      `Hey there, ${name}.`,
      `Glad you're here, ${name}.`,
      `Hello again, ${name}.`,
      `You made it back, ${name}!`,
      `Settle in, ${name}.`,
      `You got this, ${name}.`,
      `Good to see you, ${name}.`,
      `No rush today, ${name}.`,
      `One breath at a time, ${name}.`,
      `The ring's ready when you are, ${name}.`,
      `Take what you need, ${name}.`,
      `Here we are again, ${name}.`,
      `You showed up, ${name}. That counts.`,
      `This ${seg} is yours, ${name}.`
    ] : [
      `Hi again.`,
      `Welcome back.`,
      `Good ${seg}.`,
      `There you are.`,
      `You made it back!`,
      `Settle in.`,
      `Glad you're here.`,
      `Good to see you.`,
      `No rush today.`,
      `One breath at a time.`,
      `The ring's ready when you are.`,
      `Take what you need.`,
      `Here we are again.`
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
    const _paid = paidNow();
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
      ? `<button class="tb-state tb-state-line" id="tb-state"><span class="tb-glyph">${triGlyph(dom)}</span><span class="tb-state-txt">${STATE_LABEL(dom)} · this ${segLabel(segOf(last.t))}</span><span class="tb-chev">${CHEV}</span></button>`
      : `<button class="tb-state tb-state-cta" id="tb-state"><span class="tb-glyph">${triGlyph('neutral')}</span><span class="tb-state-txt">Check in. How are you?</span><span class="tb-chev">${CHEV}</span></button>`;

    const pracName   = escapeHtml(Store.practiceLabel(reco.practiceKey));
    const pracReason = reco.reason ? escapeHtml(reco.reason) : '';
    const r  = (FromJustin.daily ? FromJustin.daily() : FromJustin.today());
    const reflText = (r && r.text) ? escapeHtml(r.text) : '';
    const td = (Store.today ? Store.today() : null);
    const dotsHTML = (td && td.n>=1) ? momentDots(td.moments) : '';
    const settled = done.breath;   // once you've breathed today, land in the calm collapsed state
    // first-week accounts keep a faint affordance hint under the settled ring
    let young=false; try{ const tn=Store.tenure(); young = !tn || (tn.days||0) <= 7; }catch(e){}
    // post-breath slot (r7 2026-07-24; revised 2026-07-28 per Justin: (1) "check in again"
    // should never sit alone once you've checked in, (2) "Two more minutes?" should appear
    // after a breath even when you haven't checked in yet — it never did, since the second
    // row didn't exist at all in the not-checked-in markup). RESTING/default content: the
    // reader doorway when a reflection is waiting; else, once checked in, the "two more
    // minutes?" invite (never nothing any more); if not yet checked in AND nothing's
    // unread, the row collapses at rest but the transient post-breath nudge below still
    // fires and is visible for its ~10s window either way.
    const readerNew = _readerUnread();
    const mhRestKind = readerNew ? 'reader' : (checkedIn ? 'micro' : null);
    const mhThird = true;
    const mhThirdHTML = (kind)=> kind==='reader'
      ? `<span class="mh-th-ic">${ICO_READ}</span><span class="mh-th-t">Your reflection is ready</span>`   // 🖊
      : `<span class="mh-th-ic">${ICO_PRAC}</span><span class="mh-th-t">Two more minutes?</span>`;          // 🖊

    // moment-home (2026-07-23): the "now" screen settles to a calm center — the
    // period icon + your state (or a greeting before you've checked in) over the
    // breath ring, with ONE outlined invitation at the bottom. No dividers, nothing
    // dominating the centering screen. The reader/reflection is its own surface now
    // (the You-tab reader band); the recommended practice is the single capsule.
    c.innerHTML = `<div class="view today tb mh${settled?' breathed':''}${young?' young':''}">
      <div class="tb-hero">
        <div class="mh-top">
          ${checkedIn
            ? `<span class="mh-peri" aria-hidden="true">${segIco(seg)}</span><button class="mh-state" id="mh-state" type="button" aria-label="What ${STATE_NAME(dom)} is (opens the glossary)"><span class="mh-glyph">${triGlyph(dom)}</span><span class="mh-chev">${CHEV}</span></button>`
            : `<span class="mh-peri" aria-hidden="true">${segIco(seg)}</span><h2 class="tb-greet mh-greet">${greet}</h2>`}
        </div>
        <button class="tb-breath" id="tb-breath" aria-label="Take one intentional breath">
          <span class="tb-stage">
            <span class="tb-ring br-stage" id="tring" data-state="${dom||'neutral'}">${tbRingSVG(dom)}</span>
          </span>
          <span class="tb-below">
            <span class="tb-txt"><span class="tb-line">Take a breath</span><span class="tb-hint">Tap the ring to breathe</span></span>
            <span class="tb-phase" id="tb-phase" aria-live="polite"></span>
          </span>
          <span class="tb-esc" aria-hidden="true">Tap anywhere to end early</span>
        </button>
      </div>
      <div class="mh-foot">
        ${checkedIn
          ? `<div class="mh-secondrow${mhThird?' has-third':''}" id="mh-2nd">
               <button class="btn quiet mh-checkin" id="mh-checkin" type="button" aria-label="Check in again" title="Check in again"><span class="mh-ci-full">Check in again</span><span class="mh-ci-plus" aria-hidden="true">${ICO_PLUS}</span></button>
               ${mhThird ? `<button class="btn quiet mh-third" id="mh-third" type="button" data-kind="${mhRestKind||'micro'}">${mhThirdHTML(mhRestKind||'micro')}</button>` : ''}
             </div>
             <button class="btn quiet block mh-primary" id="mh-cta" type="button">${_paid ? 'See your recommended practice' : 'Choose a practice'}</button>`
          : `<p class="mh-noci">No check-in this ${segLabel(seg)} yet</p>
             <div class="mh-secondrow no-checkin" id="mh-2nd">
               <button class="btn quiet mh-third" id="mh-third" type="button" data-kind="${mhRestKind||'micro'}">${mhThirdHTML(mhRestKind||'micro')}</button>
             </div>
             <button class="btn quiet block mh-primary" id="mh-cta" type="button">Check in</button>`}
      </div>
    </div>`;

    const breathBtn = c.querySelector('#tb-breath');   if(breathBtn) breathBtn.onclick = runBreath;
    // the state word opens the glossary (what the state is); re-checking-in lives on
    // the You tab ("change a recent check-in"). The single capsule is the practice.
    const mhState = c.querySelector('#mh-state'); if(mhState) mhState.onclick = ()=> screenStateDetail(dom);
    const mhCheck = c.querySelector('#mh-checkin'); if(mhCheck) mhCheck.onclick = screenCheckin;
    const mhCta   = c.querySelector('#mh-cta');   if(mhCta)   mhCta.onclick   = ()=> { if(!checkedIn) return screenCheckin(); return _paid ? renderPlan(reco,'today') : app('practice'); };

    // ---- dynamic post-breath third button (choreographed) ----
    clearTimeout(_mhMorphTimer); clearTimeout(_mhStepTimer); _mhAfterBreath = null;
    const _launchMicro = ()=>{ let sn='touch'; try{ const p=Store.prefSense(); if(['touch','sound','sight'].includes(p)) sn=p; }catch(e){}
      /* 'micro' lowercase. The player matches this against its own keys, which are all
         lowercase, so 'Micro' fell through to the default script and the "Two more
         minutes?" invite launched a seven-minute practice (Michelle, 2026-08-15;
         reproduced by Justin 2026-08-17 after an earlier fix of mine failed to land).
         Note practiceKey below is already lowercase — the two disagreeing IS the bug. */
      practiceShell('player.html?'+new URLSearchParams({embed:'1',autostart:'1',practice:'micro',sense:sn,silence:'2'}).toString(), {practiceKey:'micro',sense:sn,silence:2}); };
    const third = c.querySelector('#mh-third');
    if(third){
      third.onclick = ()=> (third.dataset.kind==='reader') ? screenReflectionDeep() : _launchMicro();

      // RESTING state: the reader doorway when a reflection is waiting; else, once
      // checked in, the "Two more minutes?" invite (2026-07-28: never collapses once
      // there's a check-in to keep company — the row only collapses to nothing before
      // any check-in exists, when mhRestKind is genuinely null). On load and ~10s after
      // a breath.
      const _rest = (animate)=>{
        const row = c.querySelector('#mh-2nd'), t = c.querySelector('#mh-third'); if(!row || !t) return;
        clearTimeout(_mhStepTimer); clearTimeout(_mhMorphTimer);
        const collapse = ()=>{ const r=c.querySelector('#mh-2nd'); if(r) r.classList.remove('revealed','third-in'); };
        const showRest = ()=>{ const r=c.querySelector('#mh-2nd'), tt=c.querySelector('#mh-third'); if(!r||!tt) return;
          tt.dataset.kind=mhRestKind; tt.innerHTML=mhThirdHTML(mhRestKind); tt.classList.remove('mh-morphing');
          r.classList.add('revealed','third-in'); };
        if(!mhRestKind){                                 // nothing to rest on → collapse the slot
          if(animate){ t.classList.add('mh-morphing'); _mhMorphTimer=setTimeout(collapse, 300); }
          else { row.classList.add('mh-noanim'); collapse(); void row.offsetWidth; row.classList.remove('mh-noanim'); }
          return;
        }
        if(!animate){ row.classList.add('mh-noanim'); showRest(); void row.offsetWidth; row.classList.remove('mh-noanim'); }
        else { t.classList.add('mh-morphing'); _mhMorphTimer=setTimeout(showRest, 480); }   // fade micro out, swap to rest content, fade in
      };

      // TRANSIENT post-breath nudge: show "Two more minutes?" for ~10s, then revert to
      // the resting state. (1) check-in shortens to the plus, (2) the invite eases in.
      const _postBreath = ()=>{
        const row = c.querySelector('#mh-2nd'), t = c.querySelector('#mh-third'); if(!row || !t) return;
        clearTimeout(_mhStepTimer); clearTimeout(_mhMorphTimer);
        t.dataset.kind='micro'; t.innerHTML = mhThirdHTML('micro'); t.classList.remove('mh-morphing');
        // reset to the full check-in instantly (footer is dim from the breath, so no blip)
        row.classList.add('mh-noanim'); row.classList.remove('revealed','third-in'); void row.offsetWidth; row.classList.remove('mh-noanim');
        _mhStepTimer = setTimeout(()=>{                 // beat 1: shorten to the plus
          const r = c.querySelector('#mh-2nd'); if(!r) return;
          r.classList.add('revealed');
          setTimeout(()=>{ const r2=c.querySelector('#mh-2nd'); if(r2) r2.classList.add('third-in'); }, 470);   // beat 2: invite eases in
        }, 300);
        // after ~10s (measured from when the invite finished arriving) fall back to rest
        _mhMorphTimer = setTimeout(()=> _rest(true), 300 + 470 + 550 + 10000);
      };

      _mhAfterBreath = ()=> _postBreath();
      _rest(false);   // load: sit in the resting state (reader default, or collapsed)
    }
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
        if(settle){ view.classList.add('breathed'); try{ if(_mhAfterBreath) _mhAfterBreath(); }catch(_){} }
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
      if(phase){ phase.textContent='In'; phase.classList.add('show'); }
      if(reduce){ ring.style.transition = 'opacity 4s'; ring.style.opacity = '.85'; }
      else{
        ring.style.transition = 'transform 4s cubic-bezier(.4,0,.5,1), opacity 4s';
        ring.style.transform = 'scale(1.28)'; ring.style.opacity = '.8';
      }
      later(()=>{
        if(phase) phase.textContent='Out';
        if(reduce){ ring.style.transition = 'opacity 6s'; ring.style.opacity = '.45'; }
        else{
          ring.style.transition = 'transform 6s cubic-bezier(.4,0,.5,1), opacity 6s';
          ring.style.transform  = 'scale(.78)'; ring.style.opacity = '.4';
        }
      }, 4300);
      later(finish, 10600);
    }, 380);
  }

  // ---- breath ring: the three-state ladder (2026-07-23) ----------------------
  // The single centering ring is really the polyvagal ladder: outer = safety
  // (ventral), middle = flight/fight (sympathetic), inner = shutdown (dorsal) —
  // order fixed forever. All three are always alive: each ring keeps its own
  // ambient breath. The current state lights + amplifies the dominant ring(s)
  // (a blend lights two, in the blend token); quiet rings stay pale ink. On tap,
  // the existing breath engine scales #tring as a whole and CSS (.breathing)
  // gathers all three into one regulated ink wave. A pure SVG, no engine change.
  const RING_CFG = {
    safety:     { out:1, mid:0, in:0, c:'--s-safety' },
    fightflight:{ out:0, mid:1, in:0, c:'--s-fight' },
    shutdown:   { out:0, mid:0, in:1, c:'--s-shutdown' },
    play:       { out:1, mid:1, in:0, c:'--s-play' },
    stillness:  { out:1, mid:0, in:1, c:'--s-still' },
    freeze:     { out:0, mid:1, in:1, c:'--s-freeze' }
  };
  function tbRingSVG(dom){
    const cfg = RING_CFG[dom] || null;   // no/neutral check-in → all rings quiet, alive
    const ring = (pos, r, on)=>{
      const st = on ? ` style="stroke:var(${cfg.c})"` : '';
      return `<g class="br-g br-${pos} ${on?'act':'qui'}"><circle class="br-c ${on?'lit':'dim'}" cx="150" cy="150" r="${r}"${st}/></g>`;
    };
    const dotCol = cfg ? `var(${cfg.c})` : 'var(--muted)';
    return `<svg class="br-svg" viewBox="0 0 300 300" aria-hidden="true">`
      + ring('out',128, !!(cfg&&cfg.out))
      + ring('mid',104, !!(cfg&&cfg.mid))
      + ring('in', 80,  !!(cfg&&cfg.in))
      + `<circle class="br-dot" cx="150" cy="150" r="4.5" style="fill:${dotCol}"/></svg>`;
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
    const rings = sessions.map(s=>{ const x=fx(s.t).toFixed(1), y=fy(vAt(s.t)).toFixed(1); return `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#D29A4A" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="#D29A4A"/>`; }).join('');
    const dots = pts.map((p,i)=>{ const nw=i===pts.length-1, c=STATE_COLOR(p.dom), x=p.x.toFixed(1), y=p.y.toFixed(1);
      return (nw?`<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${c}" stroke-opacity="0.45" stroke-width="2"/>`:'')+`<circle cx="${x}" cy="${y}" r="${nw?8.5:7.5}" fill="${c}"/>`; }).join('');
    const axis=`<text transform="rotate(-90 11 ${midY})" x="11" y="${midY}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="Inter">More safety</text>`+
      `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="var(--hairline)" stroke-width="1"/>`+
      `<line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="var(--hairline)" stroke-width="1"/>`;
    const labels=[['morning',0.18],['midday',0.45],['evening',0.74],['late',0.96]].map(o=>`<text x="${(padL+o[1]*(W-padL-padR)).toFixed(0)}" y="${H-8}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="Inter">${o[0]}</text>`).join('');
    const present=moments.map(m=>m.dom).filter((d,i,a)=>a.indexOf(d)===i);
    const leg=present.map(d=>`<span class="mtl-key"><span class="mtl-sw" style="background:${STATE_COLOR(d)}"></span>${escapeHtml(STATE_LABEL(d))}</span>`).join('')+
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
    const legend = states.map(k=>`<span class="vz-key"><span class="vz-sw" style="background:${STATE_COLOR(k)}"></span>${escapeHtml(STATE_LABEL(k))} ${dist[k]}%</span>`).join('');
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
    return `<div class="sec-viz"><div class="vz-cap">Your safety, recently</div><svg viewBox="0 0 ${W} ${H}" class="vz-svg" role="img" aria-label="your safety trend over recent days">`+
      `<line x1="${padL}" y1="${bot}" x2="${W-padR}" y2="${bot}" stroke="var(--hairline)" stroke-width="1"/>`+
      `<polyline points="${P.join(' ')}" fill="none" stroke="#D29A4A" stroke-width="2.5"/>`+
      `<polyline points="${P.join(' ')} ${fx(last.x).toFixed(1)},${bot} ${padL},${bot}" fill="#F4D58D" fill-opacity="0.14" stroke="none"/>`+
      `<circle cx="${fx(last.x).toFixed(1)}" cy="${_safeToY(last.v,top,bot).toFixed(1)}" r="3.5" fill="#D29A4A"/>`+
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
      `<polyline points="${traj.join(' ')}" fill="none" stroke="#D29A4A" stroke-width="2.5"/>`+
      `<path d="M${nodeX},${ny.toFixed(1)} C${(nodeX+60).toFixed(0)},${(ny-8).toFixed(0)} ${(bx-60)},${upEnd+8} ${bx},${upEnd}" fill="none" stroke="#9FC498" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>`+
      `<path d="M${nodeX},${ny.toFixed(1)} C${(nodeX+60).toFixed(0)},${(ny+8).toFixed(0)} ${(bx-60)},${downEnd-8} ${bx},${downEnd}" fill="none" stroke="${defCol}" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>`+
      `<circle cx="${nodeX}" cy="${ny.toFixed(1)}" r="6" fill="${STATE_COLOR(dom)}" stroke="#D29A4A" stroke-width="1.5"/>`+
      `<text x="${bx}" y="${upEnd-4}" text-anchor="end" font-size="9" fill="var(--muted)" font-family="Inter">Toward more safety</text>`+
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
      if(p.shift) return cbGlyphViz(p.shift.a, 'safety'===p.shift.b?'safety':p.shift.b, 'cb-viz-inset');
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
      <p class="sec-h" style="margin:0 0 8px">In this reflection</p>
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
  // same per-user key store.js owns (2026-08-22; was the shared 'snb-contexts' blob —
  // store.js adopts that legacy blob into the signed-in user's key on first read)
  function _ctxLsKey(){ try{ return 'snb_ctx_' + ((Store.user()&&Store.user().id)||'anon'); }catch(e){ return 'snb_ctx_anon'; } }
  function _ctxLoad(){ try{ return JSON.parse(localStorage.getItem(_ctxLsKey()))||{}; }catch(e){ return {}; } }
  function _ctxSave(m){ try{ localStorage.setItem(_ctxLsKey(), JSON.stringify(m)); }catch(e){} }
  function _ctxChipsHTML(q, key){
    const sel = _ctxLoad()[key]||[];
    return `<div class="wr-ctx" data-key="${escapeHtml(key)}">
      <p class="wr-ctx-q">${escapeHtml(q)}</p>
      <div class="wr-chiprow">${CTX_OPTS.map(o=>`<button type="button" class="wr-chip${sel.indexOf(o)>=0?' on':''}" data-ctx="${escapeHtml(o)}" aria-pressed="${sel.indexOf(o)>=0?'true':'false'}">${escapeHtml(CAP(o))}</button>`).join('')}</div>
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
    const P=(t)=>t?`<p class="read-p">${boldHtml(t)}</p>`:'';
    const bullets = (sec.bullets&&sec.bullets.length) ? `<ul class="wr-list">${sec.bullets.map(b=>`<li>${boldHtml(b)}</li>`).join('')}</ul>` : '';
    const chips = sec.chipQ ? _ctxChipsHTML(sec.chipQ, key) : '';
    const foot = sec.footer ? `<p class="wr-foot">${boldHtml(sec.footer)}</p>` : '';
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
      const cs = Store.checkins().filter(c=>{const k=_cDom(c);return c&&typeof c.t==='number'&&c.t>=ws&&c.t<we&&k&&k!=='neutral';}).sort((a,b)=>a.t-b.t);
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
    // The reader — the weekly letter written from this person's own check-ins — is the
    // base plan. Guarded here as well as at every call site (defense in depth).
    // (When the evergreen/personalized content tagging lands, the evergreen essays come
    // back out from behind this line and become free. That pass is not done yet.)
    _markReaderSeen();   // any reader-open clears the nudge for this check-in — incl. free
                         // users who then hit the subscribe/upgrade prompt below
    if(!paidNow()) return gateSubscribe('reader');
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
        ${dailyNote ? `<p class="read-lead">${boldHtml(dailyNote.text)}</p>` : ''}
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
        const prR=_personalRecords(cs, 8);   // reader: bound "your most regulated week" to the last ~2 months
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

    /* 2026-08-17 — TWO CLAIMS, NEVER FUSED. A band is a property of one reading: capacity
       against load in that same moment. A period is not a reading, so it has no band, and
       joining a modal state to a mean margin produced things like "Shutdown — low" with the
       qualifier computed on the safety scale (four check-ins at shutdown near zero, three at
       safety well positive: modal state defense, mean margin positive). Averaging the circuits
       instead is no better — 90/10/10 and 10/90/10 average to a state nobody was ever in.
       So the reader states a FREQUENCY claim and a QUANTITY claim side by side, each true on
       its own. Both come straight out of periodStats, which already defines them; the 25%
       threshold for naming the runner-up is the one from-justin.js already uses for the same
       clause. Credit: Claude Code caught the category error. */
    let readState = '';
    if(issue && Store.periodStats){
      const ps = Store.periodStats(Date.now() - 7*864e5, Date.now());
      if(ps && ps.n >= 2 && ps.dom){
        const sec  = (ps.second && ps.secondShare >= 25) ? ps.second : null;
        const most = 'Most of your check-ins were ' + STATE_NAME(ps.dom)
                   + (sec ? ', with some ' + STATE_NAME(sec) : '') + '.';
        const ahead = ps.reg === 0
          ? 'Safety was never ahead of defense across your ' + ps.n + ' check-ins.'
          : ps.reg === ps.n
            ? 'Safety was ahead of defense in every one of your ' + ps.n + ' check-ins.'
            : 'Safety was ahead of defense in ' + ps.reg + ' of your ' + ps.n + ' check-ins.';
        readState = '<p class="read-state">' + escapeHtml(most) + '</p>'
                  + '<p class="read-state-sub">' + escapeHtml(ahead) + '</p>';
      }
    }

    // per-section visuals: computed from the reader's own recent signals so each picture
    // illustrates the words of its section (mix bar, state glyph, trend line, personal fork).
    const _now = Date.now();
    const dayV = [];
    for(let i=13;i>=0;i--){ const d=new Date(_now - i*864e5); d.setHours(0,0,0,0); const a=Store.dayArc?Store.dayArc(d.getTime()):null; if(a && a.n) dayV.push({ x:(13-i), v:a.moments.reduce((s,m)=>s+m.v,0)/a.n }); }
    const _ps = Store.periodStats ? Store.periodStats(_now-7*864e5, _now) : null;
    const _base28 = Store.periodStats ? Store.periodStats(_now-28*864e5, _now) : null;
    const vizCtx = { dom:dom, dayV:dayV, dist:_ps?_ps.dist:null, order:_ps?_ps.order:null, defenseState:(_ps&&_ps.defenseStates&&_ps.defenseStates[0])||null,
                     patterns:patterns, zoomPct:(_base28&&_base28.n>=8)?Math.round(_base28.regShare*100):null };
    const P = (t)=> t ? `<p class="read-p">${boldHtml(t)}</p>` : '';
    // the daily note now lives in the today block above; only fall back to a lead
    // paragraph when there are no moments today (todayBlock empty).
    const lead = (!todayBlock && dailyNote) ? `<p class="read-lead" style="margin:0 0 4px">${boldHtml(dailyNote.text)}</p>` : '';

    let bodyHTML;
    if(issue){
      // dek (one-line subtitle) replaces the old "short version" bullets — the
      // TL;DR list re-fragmented exactly what the essay model fixes.
      const dekHTML = issue.dek ? `<p class="read-dek">${boldHtml(issue.dek)}</p>` : '';
      // the closing section's landing line is the issue's most quotable sentence — set it
      // as a pull-quote (reader-beauty pass)
      const PQ = (t)=> t ? `<blockquote class="read-pq">${boldHtml(t)}</blockquote>` : '';
      // fresh (data-driven) sections get the highlight treatment: an accent hairline in
      // the issue's state color + a quiet eyebrow, so what's NEW is scannable at a glance.
      // they're also shareable — same 1080x1080 cards as the You tab (Justin 2026-07-05)
      const _shareable = { 'blog-pats':1, 'blog-zoom':1 };
      const sectionsHTML = issue.sections.map(sec=>`
        <section${sec.fresh?` class="sec-fresh" style="margin-top:22px;--fresh-col:${STATE_COLOR(issue.dom)}"`:` style="margin-top:22px"`}>
          ${sec.fresh?'<p class="fresh-eyeb">From your check-ins · updates as you do</p>':''}
          <h3 id="${sec.id}" class="sec-h" style="margin:0 0 8px;scroll-margin-top:14px">${renderHeading(issue.dom, sec.heading)}</h3>
          ${sec.paras.map((t,i)=> (sec.id==='blog-6' && i===sec.paras.length-1) ? PQ(t) : P(t)).join('')}
          ${sectionViz(sec.id, vizCtx)}
          ${_shareable[sec.id]?`<button class="linkbtn sec-share" type="button" data-share-sec="${sec.id}">Share this →</button>`:''}
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
    const archiveLink = hasArchive ? `<button class="linkbtn arch-link" id="open-arch" style="margin-top:26px">Past Reflections →</button>` : '';
    // the reader closes into a practice: when you've finished reading what your
    // check-ins are saying, the practice shaped from them is one tap away (the plan
    // reader, then begin). links to the SAME recommendation as the practice tab.
    const reco = (Store.recommend && Store.recommend()) || null;
    const practiceCTA = reco ? `<div class="read-to-practice">
            <p class="read-p" style="margin:0 0 12px">When you're ready, here is the practice shaped from these check-ins.</p>
            <button class="btn block" id="read-begin-practice" type="button">The practice made for you</button>
          </div>` : '';
    // quiet read-time line (HIG: set expectations; a reluctant reader wants the size of the ask)
    const _rtWords = String(todayBlock+visit.html+bodyHTML).replace(/<[^>]*>/g,' ').split(/\s+/).filter(Boolean).length;
    const _rtMins = Math.max(1, Math.round(_rtWords/200));
    const _uname = (Store.getName && Store.getName()) || '';
    // desktop contents rail: a second copy of the essay TOC lives in .read-aside and
    // shows only >=720 (CSS), where it becomes a quiet sticky rail that fills the window
    // beside the reading column (HIG Layout: secondary info in another part of the
    // window). The inline TOC inside bodyHTML keeps its mobile position; CSS hides it
    // >=720. .read-flow wraps the reading column so the aside can stretch full-height
    // for a real sticky. Mobile is unchanged (.read-aside is display:none, .read-flow
    // is a flex column that preserves the prior child spacing).
    const asideTOC = issue ? readerTOC(issue) : '';
    setHTML(`
      <header class="appbar read-appbar"><button class="backbtn" id="deep-back">Back</button></header>
      <div class="scroll">
        <div class="view read" style="gap:0">
          <div class="read-flow">
            <div class="scr-head read-head">
              <h1 class="read-h1">Your Reflections</h1>
              <p class="read-time">${_uname ? escapeHtml(_uname)+' · ' : ''}${_rtMins} min read · from your real check-ins</p>
              ${readState}
              ${hasArchive ? `<button class="read-arch" type="button" id="open-arch-top" aria-label="Past Reflections"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4.4L6 21V4.5a1 1 0 0 1 1-1z"/></svg></button>` : ''}
            </div>
            ${todayBlock}
            ${visit.html}
            ${bodyHTML}
            ${practiceCTA}
            ${archiveLink}
          </div>
          ${asideTOC ? `<aside class="read-aside">${asideTOC}</aside>` : ''}
        </div>
      </div>
      <nav class="tabbar reader-rail" id="tabs">${tabBtn('today','now')}${tabBtn('practice','practice')}${tabBtn('current','you')}</nav>`);
    $('#deep-back').onclick = ()=>app('today');
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    const _rbp=$('#read-begin-practice'); if(_rbp) _rbp.onclick = ()=>renderPlan(reco);
    // fresh-section share: the same image cards the You tab shares
    // VOICE, intentional (Justin): share strings are FIRST-PERSON and lowercase-start
    // ("my nervous system's most common shift…") — the user speaking, not the app.
    // Do not "correct" them in a sentence-case sweep.
    (function(){
      const _sig = 'Stuck Not Broken · stucknotbroken.com/stuck';
      root.querySelectorAll('.sec-share').forEach(b=>b.addEventListener('click',()=>{
        const which=b.dataset.shareSec;
        if(which==='blog-pats' && patterns){
          if(patterns.day){ openShare(`${patterns.day.pct}% of my ${patterns.day.label} check-ins have safety in them. ${_sig}`); return; }
          if(patterns.shift){ openShare(`my nervous system's most common shift: ${STATE_NAME(patterns.shift.a)} to ${STATE_NAME(patterns.shift.b)}. i can see the pattern now. ${_sig}`); return; }
        }
        if(which==='blog-zoom' && vizCtx.zoomPct!=null){ openShare(`my safety baseline this month. ${_sig}`); return; }
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
    const cnt={}; _reads(cs).forEach(c=>{const k=_cDom(c); cnt[k]=(cnt[k]||0)+1;});
    const order=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
    const dom=order[0], second=order[1]||null;
    // regulated = margin >= 0, same quantity that picks the name. Computed-Quiet rows
    // are not readable margins (D-A) and leave the sample entirely (num and denom).
    const rd=_reads(cs); const nR=rd.length||1;
    let reg=0; rd.forEach(c=>{ if(_cReg(c)) reg++; });
    const regShare=reg/nR, lean = regShare>=0.6?'regulated' : regShare<=0.4?'dysregulated' : 'even';
    return { n, dom, domShare:Math.round(cnt[dom]/nR*100), second, secondShare: second?Math.round(cnt[second]/nR*100):0,
             reg, dys:nR-reg, nRead:nR, regShare, lean, distinct:order.length, meanMargin:_meanMargin(cs), defenseStates:order.filter(d=>DEFENSE_SIDE[d]) };
  }
  // windowed equivalent of Store.recovery() over an explicit set of in-window check-ins
  // (Store.recovery() is always all-time, no period param — so the "getting back to
  // safety" card's trip-count used to cite an all-time number no matter which period
  // toggle was active, which read as inconsistent with everything else on the card.
  // Justin 2026-07-28: "trip-count moved to a parenthetical at the bottom with the
  // real time period" — this is the "real time period" half of that fix.)
  function _windowRecovery(cs){
    const wcs = cs.filter(c=>{const k=_cDom(c);return k&&k!=='neutral';});
    if(wcs.length<12) return null;
    const gaps=[]; let i=0;
    while(i<wcs.length){
      if(!_REGDOMS[wcs[i].dom]){ let j=i, steps=0, found=false;
        while(j<wcs.length){ if(_REGDOMS[wcs[j].dom]){ found=true; break; } j++; steps++; }
        if(found) gaps.push(steps); i=j;
      } else i++;
    }
    if(gaps.length<3) return null;
    return { avg: gaps.reduce((a,b)=>a+b,0)/gaps.length, n: gaps.length };
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
      dateLabel: 'Week of ' + new Date(ws).toLocaleDateString(undefined,{month:'long',day:'numeric'}),
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
          const lead = mark==='year'?'A year' : mark==='half'?'6 months' : 'A quarter';
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
    const P=(t)=> t?`<p class="read-p">${boldHtml(t)}</p>`:'';
    const PQ=(t)=> t?`<blockquote class="read-pq">${boldHtml(t)}</blockquote>`:'';
    const sectionsHTML = (issue.sections||[]).map(sec=>`<section style="margin-top:22px"><h3 id="${sec.id}" class="sec-h" style="margin:0 0 8px;scroll-margin-top:14px">${renderHeading(issue.dom, sec.heading)}</h3>${(sec.paras||[]).map((t,i)=>(sec.id==='blog-6'&&i===(sec.paras.length-1))?PQ(t):P(t)).join('')}</section>`).join('');
    // new essay issues carry a dek; frozen pre-rework mints still carry bullets
    const headHTML = issue.dek
      ? `<p class="read-dek">${boldHtml(issue.dek)}</p>`
      : `<div style="margin-top:14px"><p class="sec-h" style="margin:0 0 10px">The short version</p><ul style="margin:0;padding-left:18px">${(issue.bullets||[]).map(b=>`<li style="margin:0 0 8px;line-height:1.55;color:var(--ink-80);font-size:calc(15px * var(--type-scale))">${boldHtml(b.text)}</li>`).join('')}</ul></div>`;
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
    let label = (m.tier==='weekly') ? ((m.data&&m.data.card&&m.data.card.dateLabel) || fmtMintDate(m.dateMs))
                : (m.data&&m.data.label) ? m.data.label : fmtMintDate(m.dateMs);
    // minted labels are frozen at mint time; older mints predate the sentence-case
    // sweep ("week of July 12"), so sentence-case at render, not just at mint
    label = String(label).charAt(0).toUpperCase() + String(label).slice(1);
    const tag = tierLabel ? `<span class="arch-tag">${tierLabel}</span>` : '';
    // mock-parity (Justin's QA): weekly/monthly/quarterly rows are label-only —
    // the date IS the information; only dailies keep a one-line memory cue
    const snip = (sub || m.tier!=='daily') ? '' : String(m.text||'').split('. ')[0];
    const body = sub ? `<span class="arch-sub">${escapeHtml(sub)}</span>` : (snip ? `<span class="arch-snip">${escapeHtml(snip)}.</span>` : '');
    return `<button class="arch-row${extraClass?' '+extraClass:''}" data-id="${escapeHtml(m.id)}" data-ms="${m.dateMs}"><span class="arch-row-main"><span class="arch-date">${escapeHtml(label)}${tag}</span>${body}</span><span class="wc-go">${CHEV}</span></button>`;
  }
  function screenArchive(){
    if(!paidNow()) return gateSubscribe('reader');   // the reader's back issues — base plan
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
        pinnedSub = (qst && qst.lean==='dysregulated') ? 'The week you found your way back' : 'The most safety of your quarter';
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
    const caption = turned ? `<p class="arch-note">This quarter has closed into a single reflection</p>` : ''; // 🖊
    const EYEB = t=>`<p class="arch-eyeb">${t}</p>`;
    const G = m=>_archRow(m,'arch-ghost');
    const ghostsHTML = ghosts.sort((a,b)=>b.dateMs-a.dateMs).map(G).join('');
    const parts = [];
    if(dailies.length)  parts.push(EYEB('This week') + dailies.map(m=>_archRow(m)).join(''));
    if(currents.length || ghosts.length) parts.push(EYEB('This quarter') + currents.map(m=>_archRow(m)).join('') + ghostsHTML);
    if(pinned || quarterlies.length || dropQ){
      parts.push(EYEB('Quarters')
        + (pinned ? _archRow(pinned,'',pinnedSub) : '')
        + quarterlies.map(m=>_archRow(m, (arriving&&m.id===arriving.id)?'arch-in':'')).join('')
        + (dropQ ? _archRow(dropQ,'arch-ghost') : ''));
    }
    if(annual) parts.push(EYEB('Your year') + _archRow(annual));
    const rows = parts.length ? parts.join('')
      : `<p style="font-size:calc(15px * var(--type-scale));line-height:1.6;color:var(--muted);margin:8px 0 0">Your reflections will collect here as each day and week closes.</p>`;
    setHTML(`
      <header class="appbar"><button class="backbtn" id="arch-back">Back</button></header>
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
    if(!paidNow()) return gateSubscribe('reader');   // a minted reader issue — base plan
    const m = (Store.mints ? Store.mints() : []).find(x => x.id===id);
    if(!m) return screenArchive();
    if(m.tier==='weekly' && m.data && m.data.issue){
      const card = m.data.card || {};
      // same desktop composition as the live reader: reading column + sticky
      // contents rail (fills the window, top-aligned). Mobile unchanged.
      const asideTOC = readerTOC(m.data.issue);
      setHTML(`
        <header class="appbar read-appbar"><button class="backbtn" id="me-back">Back</button></header>
        <div class="scroll">
          <div class="view read" style="gap:0">
            <div class="read-flow">
              ${weekWinCardHTML(card)}
              ${renderIssue(m.data.issue)}
            </div>
            ${asideTOC ? `<aside class="read-aside">${asideTOC}</aside>` : ''}
          </div>
        </div>
        <nav class="tabbar reader-rail" id="tabs">${tabBtn('today','now')}${tabBtn('practice','practice')}${tabBtn('current','you')}</nav>`);
      $('#me-back').onclick = screenArchive;
      $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
      const sb = $('#me-share'); if(sb) sb.onclick = ()=>shareWeekCard(card);
      return;
    }
    if(m.tier==='monthly' || m.tier==='quarterly'){
      const label = (m.data && m.data.label) || fmtMintDate(m.dateMs);
      setHTML(`
        <header class="appbar"><button class="backbtn" id="me-back">Back</button></header>
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
      <header class="appbar"><button class="backbtn" id="me-back">Back</button></header>
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
    { v:0.12, key:'settle',  label:'Just settle' },
    { v:0.40, key:'gentle',  label:'Gently' },
    { v:0.65, key:'meet',    label:'Meet me' },
    { v:0.90, key:'stretch', label:'Stretch me' },
  ];
  const CH_CAP = {
    settle:  'Just connecting to the external present moment and your natural breath. No pressure. Just presence.',
    gentle:  "simple mindfulness but taken a step further through connecting with safety in your body if it's there.",
    meet:    'Anchor into safety, then use beginner skills to gently connect with defense.',
    stretch: 'Anchor into safety, then use advanced skills to connect with defense at a deeper level. More potential for self-regulation, but more challenge. Only approach this with a strong safety baseline.',
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
    clearFigures(); document.body.classList.remove('in-practice');
    const rows = recent.length ? recent.map((c,i)=>`<div class="ci-row"><button class="change-row ci-edit" data-i="${i}" type="button"><span class="change-when">${relTime(c.t)}</span><span class="change-mark">${stateMarks(c.dom)}<span class="change-state">${STATE_LABEL(c.dom)}</span></span><span class="wc-go">${CHEV}</span></button><button class="pr-del ci-del" data-t="${c.t}" type="button">Remove</button></div>`).join('') : '<p class="panel-empty">No check-ins to change yet.</p>';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="cc-back">Back</button></header>
      <div class="scroll"><div class="view" style="gap:14px">
        <div class="scr-head"><p class="eyebrow"></p><h2 class="scr-h">Change a Check-in</h2></div>
        <p class="map-sub" style="margin:0">Tap a recent check-in to adjust it, or remove one you didn't mean to keep.</p>
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
    clearFigures(); document.body.classList.remove('in-practice');
    const rows = recent.length
      ? recent.map(s => {
          const fb = s.feedback ? ` · ${escapeHtml(_fbShort(s.feedback))}` : '';
          const ended = (s.completed===false || s.endedEarly) ? ' · ended early' : '';
          return `<div class="pr-row"><span class="pr-main"><span class="change-when">${relTime(s.t)}</span><span class="pr-label">${escapeHtml(Store.practiceLabel(s.practiceKey))}${fb}${ended}</span></span><button class="pr-del" data-t="${s.t}" type="button">Remove</button></div>`;
        }).join('')
      : '<p class="panel-empty">No practices to manage yet.</p>';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="mp-back">Back</button></header>
      <div class="scroll"><div class="view" style="gap:14px">
        <div class="scr-head"><p class="eyebrow"></p><h2 class="scr-h">Manage Your Practices</h2></div>
        <p class="map-sub" style="margin:0">Remove a logged practice you didn't mean to keep, like a test. This can't be undone.</p>
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
    clearFigures(); document.body.classList.remove('in-practice');
    root.innerHTML = `
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','now')}${tabBtn('practice','practice')}${tabBtn('current','you')}
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
      if(window._liveCtx) return window._liveCtx.eyebrow;   // live: "live · mindful moment · before"
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
    // input method (settings → "your check-in"): sliders (default) · states · numbers.
    // all three capture the SAME v/sym/dor; the method only changes the affordance, so
    // the saved reading and the trend line never seam across methods (Justin 2026-07-24).
    const ciMethod = (localStorage.getItem('snb_checkin_method')||'sliders');
    const _ciStates = ciMethod==='states', _ciNumbers = ciMethod==='numbers';
    const _ciScale = _ciNumbers ? ['0','10'] : ['Harder','Easier'];
    // one ci4 slider row: glyph anchors, question leads, single shared scale above.
    // numbers mode shows a live 0-10 badge reading the SAME slider value (ease), so the
    // number and the hard→easy position are one datum — Justin's alignment requirement.
    const _ax4 = (key,scenario,cls,val)=>ci4SliderHTML(key,scenario,cls,val,_ciNumbers);
    // the sliders are the SAME markup in every method. In states mode they start folded
    // and open on the first state tap, pre-positioned from it, so picking a state is a
    // starting point that can then be fine-tuned rather than one of six fixed readings.
    // Before this, every "safety" tap saved exactly 85/15/15 and the granular data was
    // gone (Justin, 2026-07-26).
    // Two shapes of the same three sliders.
    //  · question form (sliders / numbers): a scenario, scored harder -> easier. The two
    //    defence axes invert, because "easy to relax your shoulders" is LOW mobilization.
    //  · plain form (states fine-tune): the axis by name, scored less -> more, read
    //    directly. A slider labelled "mobilization" that FALLS as you drag right would be
    //    a trap, so in this form nothing inverts.
    const AX_PLAIN = { v:'connection', sym:'mobilization', dor:'immobilization' };
    const _sliderBlock = `<div class="ci4-scale" aria-hidden="true"><span>${_ciScale[0]}</span><span>${_ciScale[1]}</span></div>
          <div class="sliders">
            ${_ax4('v', CI_BANK.v[qIdx.v], 'r-v', v)}
            ${_ax4('sym', CI_BANK.sym[qIdx.sym], 'r-sym', 100-s)}
            ${_ax4('dor', CI_BANK.dor[qIdx.dor], 'r-dor', 100-d)}
          </div>`;
    const _plainBlock = `<div class="ci4-scale" aria-hidden="true"><span>Less</span><span>More</span></div>
          <div class="sliders">
            ${ci4SliderHTML('v', AX_PLAIN.v, 'r-v', v, false, true)}
            ${ci4SliderHTML('sym', AX_PLAIN.sym, 'r-sym', s, false, true)}
            ${ci4SliderHTML('dor', AX_PLAIN.dor, 'r-dor', d, false, true)}
          </div>`;
    const _ciInput = _ciStates
      ? `<p class="ci4-states-lede">Tap the state that fits right now.</p>
          <div class="ci-ovr-chips ci4-states">
            ${['safety','play','fightflight','stillness','freeze','shutdown'].map(k=>`<button class="ch-opt ci-ovr-opt" type="button" data-ovr="${k}">${stateMarks(k)}<span>${STATE_LABEL(k)}</span></button>`).join('')}
          </div>
          <div class="ci-tune" id="ci-tune"${editRec?'':' hidden'}>
            <p class="ci-tune-lede">Fine-tune anything that isn't quite right.</p>
            ${_plainBlock}
          </div>`
      : _sliderBlock;
    $('#content').innerHTML = `<div class="view checkin2 ci4${_ciStates?' ci-m-states':(_ciNumbers?' ci-m-numbers':'')}">

        <div class="scr-head">
          <p class="eyebrow">${escapeHtml(_ciEyebrow)}</p>
          <h2 class="scr-h">${_ciStates?'How are you, right now?':'Right now, how easy would it be to&hellip;'}</h2>
        </div>

        <div class="ci-block">
          ${_ciInput}
          ${_ciStates?'':'<button class="ci-shuffle" id="ci-shuffle" type="button">Change the questions</button>'}
          <div class="ci-reading" id="ci-reading"></div>
          ${_yng?'<p class="fineprint" style="margin-top:10px">Check in whenever you like: when you’re off, when you’re good, any part of day. Every check-in teaches the app your system.</p>':''}
        </div>

        ${(function(){
          // progressive disclosure (2026-07-05): sliders + save IS a complete
          // check-in. the two optional asks fold into quiet one-row links —
          // the screen's hierarchy now tells the truth about what's required.
          // context sits directly above save (Justin 2026-07-05). no readouts
          // on the collapsed rows (Justin 2026-07-05): the opened panel's
          // highlighted option is the state.
          return `
        <div class="ci-block ci-challenge ci-ctx ci-fold" id="fold-ctx">
          <button class="ci-fold-btn" id="fold-ctx-btn" type="button" aria-expanded="false" aria-controls="fold-ctx-body">
            <span class="ci-fold-lk">Add context to this check-in</span><span class="stats-tog-icon">+</span>
          </button>
          <div class="stats-body" id="fold-ctx-body">
            <div class="set-seg ci-ctx-seg" role="tablist" aria-label="Context direction">
              <button type="button" class="on" data-ctxdir="more" role="tab" aria-selected="true">I've had more of</button>
              <button type="button" data-ctxdir="less" role="tab" aria-selected="false">I've had less of</button>
            </div>
            <div class="wr-chiprow ci-ctx-row" id="ci-ctx-row-more" role="tabpanel">${CTX_OPTS.map(o=>`<button type="button" class="wr-chip${ctxSelMore.has(o)?' on':''}" data-ctx="${escapeHtml(o)}" data-ctxdir="more" aria-pressed="${ctxSelMore.has(o)?'true':'false'}">${escapeHtml(CAP(o))}</button>`).join('')}</div>
            <div class="wr-chiprow ci-ctx-row" id="ci-ctx-row-less" role="tabpanel" hidden>${CTX_OPTS.map(o=>`<button type="button" class="wr-chip${ctxSelLess.has(o)?' on':''}" data-ctx="${escapeHtml(o)}" data-ctxdir="less" aria-pressed="${ctxSelLess.has(o)?'true':'false'}">${escapeHtml(CAP(o))}</button>`).join('')}</div>
            <p class="ch-cap ci-ctx-cap">Helps track what's adding to (or taking from) the states you feel over time. Shows up later in your patterns.</p>
          </div>
        </div>`;
        })()}

        <div class="actionbar"><button class="btn block" id="save">${editRec?'Save changes':'Save check-in'}</button></div>
      </div>`;

    // fresh check-ins start neutral (Justin 2026-07-05): rails and glyphs stay quiet
    // until an axis is set — color responds to what the person SET, never to defaults.
    // edits show everything at once. rail + glyph move together (r2).
    const axTouched = editRec ? { v:1, sym:1, dor:1 } : {};
    function refresh(){
      const colOf = ciAxisColorFn(v, s, d, axTouched);
      // states mode paints the same way, but only once the fine-tune block is open
      const _tuneOpen = !_ciStates || !!(root.querySelector('#ci-tune') && !root.querySelector('#ci-tune').hidden);
      // the chips above are not just the input, they are a live readout: as the sliders
      // move, the highlighted state follows the numbers. Otherwise someone can tune their
      // way well out of the state they tapped while that chip still sits lit (Justin,
      // 2026-07-26). dominantOf can land on 'neutral', which is no chip: honest, so the
      // row simply goes quiet rather than pretending.
      if(_ciStates && _tuneOpen){
        const dk = window.PVCurrent.dominantOf(v/100, s/100, d/100).key;
        root.querySelectorAll('.ci-ovr-opt').forEach(x=>x.classList.toggle('on', x.dataset.ovr===dk));
      }
      if(_tuneOpen){
        setIcoLvl('v',v); setIcoLvl('sym',s); setIcoLvl('dor',d);
        ciPaintSliders(colOf);   // rails + anchoring glyphs take the same colour
        if(_ciNumbers){ ['v','sym','dor'].forEach(ax=>{ const el=$('#sl-'+ax), nb=$('#num-'+ax); if(el&&nb) nb.textContent = Math.round((+el.value)/10); }); }
      }
      // §7.3 — the reading, always shown (2026-08-22): untouched sliders are the
      // person's answer, so there is always a state to name. Names, never grades.
      const reading = $('#ci-reading');
      if(reading){
        /* 2026-08-17 — the name IS the reading (Justin). Dead-centre keeps its
           sentence, the one case with no name to give. */
        const rd = window.PVCurrent.readingOf(v/100, s/100, d/100);
        reading.innerHTML = `<span class="ci-reading-name">${rd.label || rd.dominant}</span>`;
        reading.hidden = false;
      }
    }
    // Bound in every method now: in states mode the same three sliders are the fine-tune.
    // Question form reads ease, so the two defence axes invert; plain form reads the axis.
    bindSlider('v', val=>{v=val;axTouched.v=1;refresh();});
    bindSlider('sym', val=>{s=_ciStates?val:100-val;axTouched.sym=1;refresh();});
    bindSlider('dor', val=>{d=_ciStates?val:100-val;axTouched.dor=1;refresh();});
    refresh();
    const _shuf = $('#ci-shuffle');
    if(_shuf) _shuf.onclick = ()=>{
      ['v','sym','dor'].forEach(ax=>{
        qIdx[ax] = ciRand(ax, qIdx[ax]);
        const q = root.querySelector('#q-'+ax); if(q) q.textContent = CI_BANK[ax][qIdx[ax]];
        const sl = $('#sl-'+ax); if(sl) sl.setAttribute('aria-label','How easy would it be to '+CI_BANK[ax][qIdx[ax]]);
      });
    };
    // pick-a-state input method (moved here from the old inline override; the chooser
    // now lives in settings → "your check-in"): tapping a state sets the underlying
    // v/sym/dor — the SAME three numbers the sliders capture — so the saved reading
    // and the trend line never seam across methods. teaching copy shows in place.
    const STATE_AXES={ safety:[.85,.15,.15], play:[.75,.75,.15], fightflight:[.15,.85,.15],
                       stillness:[.75,.15,.75], freeze:[.15,.8,.8], shutdown:[.15,.15,.85] };
    if(_ciStates){
      // the six presets are the STARTING POINT. Tapping one opens the sliders sitting
      // exactly where that state puts them, and every later nudge is the person's own
      // reading — same v/sym/dor the slider method saves, at full resolution.
      root.querySelectorAll('.ci-ovr-opt').forEach(b=>b.onclick=()=>{
        const k=b.dataset.ovr, ax=STATE_AXES[k];
        root.querySelectorAll('.ci-ovr-opt').forEach(x=>x.classList.toggle('on', x===b));
        if(!ax) return;
        axTouched.v=1; axTouched.sym=1; axTouched.dor=1;
        v=ax[0]*100; s=ax[1]*100; d=ax[2]*100;
        // the plain sliders read the axis directly, so nothing inverts here
        const put=(id,val)=>{ const el=$('#sl-'+id); if(el) el.value=String(Math.round(val)); };
        put('v', v); put('sym', s); put('dor', d);
        const tune=$('#ci-tune'), shuf=$('#ci-shuffle-st');
        const firstOpen = tune && tune.hidden;
        if(firstOpen){ tune.hidden=false; tune.classList.add('in'); }
        if(shuf) shuf.hidden=false;
        refresh();
        // the state chips and the state description push the sliders below the fold, so
        // opening them silently would leave the fine-tune invisible on a phone. Bring it
        // into view once, on the first open only, and never fight a later scroll.
        if(firstOpen) requestAnimationFrame(()=>{
          try{ tune.scrollIntoView({behavior: document.body.classList.contains('reduce-motion')?'auto':'smooth', block:'nearest'}); }catch(e){ tune.scrollIntoView(); }
        });
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
    _bindFold('fold-ctx-btn');

    const _ctxSetOf = d => d==='less' ? ctxSelLess : ctxSelMore;
    ['ci-ctx-row-more','ci-ctx-row-less'].forEach(id=>{
      root.querySelectorAll('#'+id+' .wr-chip').forEach(b=>b.onclick=()=>{
        const set = _ctxSetOf(b.dataset.ctxdir), o = b.dataset.ctx;
        if(set.has(o)) set.delete(o); else set.add(o);
        b.classList.toggle('on', set.has(o)); b.setAttribute('aria-pressed', set.has(o)?'true':'false');
      });
    });

    // the "choose your next practice" fold was removed from the check-in (Justin
    // 2026-07-24, turn 4): the practice picker owns level selection. `ch` stays null,
    // so the recommender uses the person's learned appetite — the intended default.

    $('#save').onclick = ()=>{
      const vals = { v:v/100, sym:s/100, dor:d/100, source:(window._ciSource||null) };
      // live check-in: tag the reading to its session + seam so the trail (and the
      // efficacy mirror) can pair before/after per practice.
      const _lc = window._liveCtx || null;
      if(_lc && !editRec){ vals.live_session_id=_lc.id; vals.practice_ref=_lc.practice_ref; vals.phase=_lc.phase; vals.joined=_lc.joined||'self'; }
      if(ch!=null) vals.challenge = ch;                  // null = "whatever you recommend": let the recommender decide
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
      // live: mid-session readings get the glyph reflection; the LAST reading goes
      // straight to the results — no extra stop between save and the payoff
      // (Justin 2026-07-17, round 4).
      if(_lc){
        window._liveCtx=null;
        const _ls=_liveCache();
        if(_ls && !_liveNext(_ls)) return screenLiveTrail(_ls);
        return screenLiveMoment(rec);
      }
      // T-2: the FIRST check-in lands back on Today, where the halo has just taken
      // their state color — a visible payoff, not the You tab's "check in twice" nag
      app(Store.checkins().length >= 2 ? 'current' : 'today');
      actionSnack('checked in', 'change', ()=>screenCheckin(rec));
    };
  }
  // ---------------------------------------------------------------- LIVE CHECK-IN
  // (2026-07-17, Live-Checkin-Plan.md Phase 1 — Mindful Moment slice.)
  // A live practice publishes itself at Present time (live_sessions row via edge fn);
  // attendees join by QR/link (?live=CODE) or the today-tab nudge. The reading IS the
  // app's full, normal check-in, unchanged — screenCheckin renders it with _liveCtx set,
  // tags the save, and hands back here. Completed readings live in Store.checkins()
  // (tagged), so progress is account-bound and survives reload/app-switch/device-switch.
  // Guardrails: opt-in, invitational, never a score; the trail mirrors what THEY named.
  const LIVE_NAME = { 'mindful-moment':'mindful moment', 'capacity-builder':'capacity builder' };
  function _liveJoin(){ try{
    const j = JSON.parse(localStorage.getItem('snb_live_join')||'null');
    // a join can't outlive the longest possible live session (8h cap server-side):
    // without this, an abandoned scan would trap every later visit at the sign-in gate.
    if(j && Date.now()-(j.t||0) > 8*3600*1000){ localStorage.removeItem('snb_live_join'); return null; }
    return j;
  }catch(e){ return null; } }
  function _liveClear(){ try{ localStorage.removeItem('snb_live_join'); localStorage.removeItem('snb_live_sess'); }catch(e){} }
  function _liveCache(){ try{ return JSON.parse(localStorage.getItem('snb_live_sess')||'null'); }catch(e){ return null; } }
  // practices jsonb -> ordered readings [{ref,phase,label}]; safe default = MM before/after
  function _liveReadings(s){
    const prs = (Array.isArray(s.practices) && s.practices.length) ? s.practices
      : [{ ref:'mm', label:LIVE_NAME[s.type]||'live practice', checkins:['before','after'] }];
    const out=[];
    prs.forEach(p=>((Array.isArray(p.checkins)&&p.checkins.length)?p.checkins:['before','after'])
      .forEach(ph=>out.push({ ref:(p.ref||'mm'), phase:ph, label:(p.label||'') })));
    return out;
  }
  function _liveDone(s){
    const done=new Set();
    try{ Store.checkins().forEach(c=>{ if(c.live_session_id===s.id && c.practice_ref && c.phase) done.add(c.practice_ref+':'+c.phase); }); }catch(e){}
    return done;
  }
  function _liveNext(s){ const done=_liveDone(s); return _liveReadings(s).find(r=>!done.has(r.ref+':'+r.phase))||null; }
  function _liveShell(inner){
    _livePollStop();
    clearFigures(); document.body.classList.remove('in-practice');
    root.innerHTML = `<header class="appbar"></header><div class="scroll" id="content"></div>`;
    $('#content').innerHTML = inner;
  }
  // SLIDE SYNC poll: while the waiting screen is up, watch the session row every 12s.
  // The builder stamps `seam` as slides advance (update-live-session, presenter_key
  // gated) — when the check-in slide is up, the app opens the check-in by itself.
  let _livePollT=null;
  function _livePollStop(){ if(_livePollT){ clearInterval(_livePollT); _livePollT=null; } }
  function _livePollStart(join){
    _livePollStop();
    const tick = async ()=>{
      const j=_liveJoin(); if(!j || j.code!==join.code) return _livePollStop();
      const f=await Store.liveFetch(join.code);
      if(!f || !f.id) return;                                   // network blip: keep waiting
      try{ localStorage.setItem('snb_live_sess', JSON.stringify(f)); }catch(e){}
      const done=_liveDone(f);
      const actionable = !f.live ||
        (f.seam && _liveReadings(f).some(r=>(r.ref+':'+r.phase)===f.seam && !done.has(r.ref+':'+r.phase)));
      if(actionable){ _livePollStop(); screenLive(); }          // re-route: opens the check-in / trail / ended
    };
    tick();                                   // check immediately; don't wait a full interval
    _livePollT = setInterval(tick, 3500);
  }
  // a small terminal screen (not found / ended / member-only) with one way onward. 🖊
  function _liveEnd(h, lede){
    _liveShell(`<div class="view fb-view">
        <div class="scr-head"><p class="eyebrow">Live practice</p>
        <h2 class="scr-h">${h}</h2><p class="scr-lede">${lede}</p></div>
        <div class="actionbar"><button class="btn block" id="lv-out">Back to the app</button></div>
      </div>`);
    $('#lv-out').onclick = ()=>{ _liveClear(); app('today'); };
  }
  function screenLiveCode(){
    _liveShell('<div class="view fb-view"><div class="scr-head"><p class="eyebrow">Live practice</p><h2 class="scr-h">Join with a Code</h2><p class="scr-lede">Enter the code shown on the practice screen.</p></div><input id="lc-in" type="text" inputmode="latin" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="10" placeholder="e.g. 76QMY4" aria-label="live practice code" style="display:block;width:100%;max-width:280px;margin:20px auto 0;padding:14px 16px;font-size:22px;letter-spacing:.22em;text-align:center;text-transform:uppercase;border:1px solid var(--hairline);border-radius:12px;background:var(--field);color:var(--ink);font-family:inherit"><p class="scr-lede" id="lc-msg" style="min-height:1.2em;margin-top:10px"></p><div class="actionbar"><button class="btn block" id="lc-go" type="button">Join</button><button class="set-quiet" id="lc-back" type="button" style="margin-top:8px">Back</button></div></div>');
    var inp=$('#lc-in'); if(inp) inp.focus();
    var go=function(){
      var v=((inp&&inp.value)||'').trim().toUpperCase();
      if(!/^[A-Z0-9]{4,10}$/.test(v)){ var m=$('#lc-msg'); if(m) m.textContent='That doesn\u2019t look like a code. It\u2019s a few letters and numbers.'; return; }
      try{ localStorage.setItem('snb_live_join', JSON.stringify({ code:v, joined:'self', t:Date.now() })); }catch(e){}
      if(!Store.user() && Store.cloud()){ authMode = knownDevice() ? 'in' : 'up'; return screenSignIn(); }
      screenLive();
    };
    if($('#lc-go')) $('#lc-go').onclick=go;
    if(inp) inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); go(); }});
    if($('#lc-back')) $('#lc-back').onclick=function(){ app('settings'); };
  }

  async function screenLive(){
    const join = _liveJoin(); if(!join) return app(currentTab);
    _liveShell(`<div class="view"><div class="scr-head"><p class="eyebrow">Live practice</p><h2 class="scr-h">One moment&hellip;</h2></div></div>`);
    let s = await Store.liveFetch(join.code);
    if(!s || !s.id){
      const c=_liveCache();
      if(c && c.code===join.code) s=c;                       // offline blip: run on the cached copy
      else if(s && s.error && s.error!=='not found') return _liveEnd('We couldn’t reach the live practice','Check your connection, then open the app again. Your place is saved.');   // 🖊
      else return _liveEnd('We couldn’t find that live practice','The code may have been mistyped, or the practice may be over. Nothing is lost.');   // 🖊
    }
    try{ localStorage.setItem('snb_live_sess', JSON.stringify(s)); }catch(e){}
    // capacity builders are an academy practice; mindful moments are for everyone. 🖊
    if(s.type==='capacity-builder'){
      const e=(Store.entitlement&&Store.entitlement())||{};
      if(!(e.sub||e.circle||e.legacy)) return _liveEnd('This one is an academy practice','Capacity builders are part of the unstucking academy. Mindful moments are open to everyone, and you’re always welcome there.');
    }
    const next=_liveNext(s);
    if(!next) return screenLiveTrail(s);
    if(!s.live) return _liveDone(s).size ? screenLiveTrail(s) : _liveEnd('This live practice has ended','It’s okay to have missed it. The practices in the app are always here.');   // 🖊
    const name=LIVE_NAME[s.type]||'live practice';
    const openReading = r => {
      _livePollStop();
      window._ciSource='live';
      // name the PRACTICE, not just the session: a capacity builder has four
      // readings across three practices, so "live · capacity builder · after"
      // three times would tell you nothing. Falls back to the session name, so
      // a mindful moment reads exactly as it did before. (2026-08-10)
      window._liveCtx = { id:s.id, practice_ref:r.ref, phase:r.phase, joined:(join.joined||'self'),
        eyebrow:'live · '+((r.label||name).toLowerCase())+' · '+(r.phase==='before'?'before':'after') };
      screenCheckin();
    };
    // the deck drives (Justin 2026-07-17): if the current slide IS an undone check-in
    // seam, open it immediately — no button, no tap.
    const seamR = s.seam ? _liveReadings(s).find(r=>(r.ref+':'+r.phase)===s.seam && !_liveDone(s).has(r.ref+':'+r.phase)) : null;
    if(seamR) return openReading(seamR);
    // otherwise: a calm holding screen that advances itself. the quiet link is the
    // fallback for sessions whose builder doesn't stamp seams (yet). 🖊
    const first=_liveDone(s).size===0;
    _liveShell(`<div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">Live &middot; ${escapeHtml(name)}</p>
          <div class="lv-wait-logo">${triLogo('lv-breathe', true)}</div>
          <h2 class="scr-h" style="margin-top:14px">${first?'We’re getting started':'Enjoy the practice'}</h2>
          <p class="scr-lede">Your ${first?'':'next '}check-in will open here on its own.</p>
        </div>
        <div class="actionbar">
          ${first
            ? '<button class="btn block" id="lv-go">Check in</button>'
            : '<button class="navlink" id="lv-go" style="align-self:center">Check in now</button>'}
          <button class="navlink" id="lv-leave" style="align-self:center">Leave this live practice</button>
        </div>
      </div>`);
    // self-paced door (Justin 2026-07-17): nobody is ever locked out of checking in by
    // the deck — a late joiner gets a full button until their FIRST reading is saved;
    // after that it recedes to the quiet link and the deck leads.
    _livePollStart(join);
    $('#lv-go').onclick = ()=>openReading(next);
    $('#lv-leave').onclick = ()=>{ _livePollStop(); try{ sessionStorage.setItem('snb_live_seen', join.code); }catch(e){} _liveClear(); app('today'); showToast('you can rejoin any time with the code'); };   // 🖊
  }
  // immediately after each live reading: their state, mirrored back. 🖊
  function screenLiveMoment(rec){
    const s=_liveCache();
    const domKey = (rec.dom && rec.dom!=='neutral') ? rec.dom : window.PVCurrent.dominantOf(rec.v, rec.sym, rec.dor).key;
    const more = s ? !!_liveNext(s) : false;
    _liveShell(`<div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">What you described</p>
          <div class="g-glyph">${rec.dom==='neutral'?'':triGlyph(domKey)}</div>
          <h1 class="scr-h" style="margin-top:14px">${rec.dom==='neutral'?'Quiet':escapeHtml(STATE_LABEL(domKey))}</h1>
          <p class="scr-lede">${escapeHtml(ciMirror(rec.v, rec.sym, rec.dor))}</p>
          <p class="scr-lede">${more?'Your check-in is saved. Head back to the live practice now. This screen will wait here, ready for your next check-in.':'Your check-in is saved. That was the last one.'}</p>
        </div>
        <div class="actionbar"><button class="btn block" id="lv-on">${more?'okay':'see what you noticed'}</button></div>
      </div>`);
    $('#lv-on').onclick = ()=>screenLive();
  }
  // the end-of-practice payoff, stripped to what matters (Justin 2026-07-17):
  // "your practice results" + the state marks with an arrow between. the arrow
  // tells the story; no labels, no lede. never a score.
  function screenLiveTrail(s){
    const cs=Store.checkins();
    const keyed=_liveReadings(s).map(r=>{
      let rec=null; cs.forEach(c=>{ if(c.live_session_id===s.id && c.practice_ref===r.ref && c.phase===r.phase) rec=c; });
      return rec ? { ...r, key:((rec.dom && rec.dom!=='neutral')?rec.dom:window.PVCurrent.dominantOf(rec.v,rec.sym,rec.dor).key) } : null;
    }).filter(Boolean);
    // vertical trail (Justin 2026-07-17): tall view — reads stack, the arrow points DOWN
    const arrow=`<svg class="lv-arr" viewBox="0 0 24 64" aria-hidden="true">
        <path class="lv-arr-line" d="M12 4 V50" fill="none" stroke-linecap="round"/>
        <path class="lv-arr-head" d="M4 46 L12 57 L20 46" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    // each state renders as its OWN mark(s), tinted the state color (blends = both marks)
    const mk=k=>`<span class="lv-mk">${(STATE_AXES[k]||[]).map(([icn])=>ico(icn,{cls:'lv-mark',color:STATE_COLOR(k)})).join('')}</span>`;
    const row=keyed.map((r,i)=>`${i?arrow:''}<span class="lv-g" style="--i:${i}">${mk(r.key)}</span>`).join('');
    _liveShell(`<div class="view fb-view">
        <div class="scr-head"><h2 class="scr-h">Your Practice Results</h2></div>
        <div class="lv-trail2${keyed.length>2?' many':''}">${row}</div>
        <div class="actionbar">
          ${keyed.length?'<button class="btn block" id="lv-share">Share this</button>':''}
          <button class="navlink" id="lv-done" style="align-self:center">Done</button>
        </div>
      </div>`);
    const sh=$('#lv-share'); if(sh) sh.onclick=()=>openShare(
      s.type==='capacity-builder' ? 'I practiced capacity building today.' : 'I practiced mindfulness today.');   // 🖊 CB variant
    $('#lv-done').onclick = ()=>{ _liveClear(); app('today'); showToast('saved with your check-ins'); };
  }
  // the "we're live" nudge: small, invitational, always rejectable, off-switch in settings.
  // free-for-all events show for everyone; member events only to members (kind, no upsell).
  function liveNudge(){
    try{
      if(localStorage.getItem('snb_live_nudge')==='0') return;
      if(!Store.user() || (Store.isAnonymous&&Store.isAnonymous())) return;
      if(_liveJoin()) return;
      const K='snb_live_poll_t';
      if(Date.now() - (+localStorage.getItem(K)||0) < 15*1000) return;   // poll at most every 15s (was 3 min; too slow to re-check on app reopen)
      localStorage.setItem(K, String(Date.now()));
      Store.livePoll().then(r=>{
        if(!r || !Array.isArray(r.live) || !r.live.length) return;
        const e=(Store.entitlement&&Store.entitlement())||{};
        const s=r.live.find(x=>x.type!=='capacity-builder' || e.sub||e.circle||e.legacy);
        if(!s) return;
        if(sessionStorage.getItem('snb_live_seen')===s.code) return;
        if(currentTab!=='today' || !document.querySelector('#content .view')) return;   // still on today?
        if(document.querySelector('.lv-pop')) return;                                   // never stack two
        // a POP-UP, not a card (Justin 2026-07-17): white on purpose against the bone
        // app, the tri-glyph logo on top, marks arriving one by one — significant and
        // a little fun, still fully rejectable in one tap.
        // THE COPY IS SESSION-AUTHORED: the builder sends host + invite at Present
        // (updatable without an app deploy). Built-in lines are only the fallback. 🖊
        const who = s.type==='capacity-builder'
          ? 'You’re an unstucking academy co-regulation student and welcome to join.'
          : (e.circle ? 'You’re an unstucking academy student and welcome to join.'      // 🖊 variant
          :  e.sub    ? 'You’re a subscriber and welcome to join.'                        // 🖊 variant
          :             'You’re a free subscriber and welcome to join.');
        const line = s.invite ? escapeHtml(s.invite)
          : ('right now, '+escapeHtml(s.host||'justin')+' is hosting a '+escapeHtml(LIVE_NAME[s.type]||'live')+' practice. '+who);
        const el=document.createElement('div');
        el.className='lv-pop';
        const room=(typeof s.room==='string' && /^https?:\/\/\S+$/i.test(s.room.trim())) ? s.room.trim() : null;   // builder-published live room URL (Option A: link out only)
        const head=room?'Join us live!':"we're practicing live";   // 🖊 no room → don't over-promise
        const btns=room
          ? '<button class="btn block" id="lv-n-watch">Watch live &rarr;</button><button class="btn quiet block" id="lv-n-join">Just check in</button>'
          : '<button class="btn block" id="lv-n-join">Check in &rarr;</button>';
        el.innerHTML=`<div class="lv-pop-card" role="dialog" aria-modal="true" aria-label="${head}">
          <div class="lv-pop-logo" aria-hidden="true">${triLogo()}</div>
          <p class="lv-pop-h">${head}</p>
          <p class="lv-pop-b">${line}</p>
          ${btns}
          <button class="set-quiet" id="lv-n-no">Not now</button>
          <button class="set-quiet lv-pop-off" id="lv-n-off">Turn off these notifications</button>
        </div>`;
        document.body.appendChild(el);
        const _close=()=>{ sessionStorage.setItem('snb_live_seen', s.code); el.remove(); };
        el.addEventListener('click', ev=>{ if(ev.target===el) _close(); });
        const w=el.querySelector('#lv-n-watch'); if(w) w.onclick=()=>{
          try{ window.open(room,'_blank','noopener'); }catch(e2){}
          _close();
        };
        const j=el.querySelector('#lv-n-join'); if(j) j.onclick=()=>{
          try{ localStorage.setItem('snb_live_join', JSON.stringify({ code:s.code, joined:'self', t:Date.now() })); }catch(e2){}
          el.remove(); screenLive();
        };
        const n=el.querySelector('#lv-n-no'); if(n) n.onclick=_close;
        const off=el.querySelector('#lv-n-off'); if(off) off.onclick=()=>{
          try{ localStorage.setItem('snb_live_nudge','0'); }catch(e2){}
          _close(); showToast('you can turn these back on in settings');   // 🖊
        };
      });
    }catch(e){}
  }

  function sliderHTML(key,scenario,cls,val){
    const ax = AXIS_ICON[key] || {};
    const icon = ax.icon ? ico(ax.icon,{cls:'slider-ico', color:STATE_COLOR(ax.state)}) : '';
    return `<div class="slider" data-axis="${key}">
      <span class="slider-ico-wrap">${icon}</span>
      <div class="slider-main">
        <p class="q" id="q-${key}">${scenario}</p>
        <input type="range" class="${cls}" id="sl-${key}" min="0" max="100" value="${val}" aria-label="How easy would it be to ${scenario}">
        <div class="anchors" aria-hidden="true"><span>Hard</span><span>Easy</span></div>
      </div>
    </div>`;
  }
  function bindSlider(key,fn){ const el=$('#sl-'+key); el.addEventListener('input',()=>fn(+el.value)); }

  // ---------------------------------------------------------------- CURRENT OVER TIME
  let playTimer=null;
  const PERIODS=[{key:'7',label:'Week',days:7},{key:'30',label:'Month',days:30},{key:'90',label:'90 days',days:90},{key:'all',label:'All',days:null}];
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

  // _smoothCurve(): Catmull-Rom -> cubic-bezier conversion (tension 1/6, the
  // standard conversion) so a multi-point line reads as one continuous flowing
  // shape instead of an angular point-to-point polyline (2026-07-30, Justin:
  // "make the line smooth, not angular from point to point... this should feel
  // like a nice flow"). Markers still sit exactly on the real data (dots use the
  // raw point coordinates below); only the CONNECTING line eases between them.
  // Returns just the "C ..." command sequence \u2014 callers prepend their own
  // "M x0 y0 " so the same curve commands can be reused for both the stroke
  // path and the fill-to-baseline area path.
  function _smoothCurve(pts){
    if(pts.length<2) return '';
    if(pts.length===2){
      // no interior neighbors to lean on \u2014 ease via a midpoint control (same
      // flat-in/flat-out S-curve the 2-point growth chart uses) rather than a
      // straight diagonal segment.
      const midX=(pts[0].x+pts[1].x)/2;
      return `C ${midX} ${pts[0].y} ${midX} ${pts[1].y} ${pts[1].x} ${pts[1].y}`;
    }
    let d='';
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
      const c1x=p1.x+(p2.x-p0.x)/6, c1y=p1.y+(p2.y-p0.y)/6;
      const c2x=p2.x-(p3.x-p1.x)/6, c2y=p2.y-(p3.y-p1.y)/6;
      d+=`C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x} ${p2.y} `;
    }
    return d.trim();
  }
  function chartInner(mode, B, safetyColor){
    const N=B.length;
    const W=320,H=132,padL=10,padR=10,padT=16,padB=26;
    const plotW=W-padL-padR, plotH=H-padT-padB;
    const xOf=i=> N===1? W/2 : padL+(i/(N-1))*plotW;
    const yOf=v=> padT+(1-Math.max(0,Math.min(1,v)))*plotH;
    const pts=B.map((b,i)=>({x:+xOf(i).toFixed(1), y:+yOf(b.avg).toFixed(1), b, i}));
    const baseY=(padT+plotH).toFixed(1);
    const curveCmds=_smoothCurve(pts);
    const linePath=N===1?`M ${pts[0].x} ${pts[0].y} L ${pts[0].x+0.1} ${pts[0].y}`:`M ${pts[0].x} ${pts[0].y} ${curveCmds}`;
    const areaPath=N===1?`M ${pts[0].x} ${baseY} L ${pts[0].x} ${pts[0].y} L ${pts[0].x+0.1} ${pts[0].y} L ${pts[0].x+0.1} ${baseY} Z`:`M ${pts[0].x} ${baseY} L ${pts[0].x} ${pts[0].y} ${curveCmds} L ${pts[pts.length-1].x} ${baseY} Z`;
    const maxL=Math.min(6,N), seen=new Set(), labIdxs=[];
    for(let i=0;i<maxL;i++){ const idx=Math.round(i*(N-1)/(maxL-1||1)); if(seen.has(idx))continue; seen.add(idx); labIdxs.push(idx); }
    // gain (2026-07-30, Justin: "'your states over time' has a great opportunity
    // for animation" — it had NONE: this used to gate the self-draw entirely on
    // mode==='safety', a mode that's dead code in current rendering (only 'states'
    // ever reaches the screen), so the line never once drew itself. 'safety' mode
    // keeps its narrative-gated behavior (only draws on a real rise) in case it's
    // ever revived; 'states' just always gets the reveal — it's not telling a
    // gain/loss story, it's a general "here's your timeline" chart.
    const gain = mode==='safety' ? (N>=2 && (B[N-1].avg - B[0].avg) > 0.04) : N>=2;
    const labs=labIdxs.map((idx,li)=>`<text x="${xOf(idx).toFixed(1)}" y="${H-8}" text-anchor="${idx===0?'start':idx===N-1?'end':'middle'}" class="cx"${gain?` style="animation-delay:${1150+li*60}ms"`:''}>${B[idx].label}</text>`);
    // monochrome intensity gradient: height encodes safety; color deepens with it (no state hues)
    const ramp=(v)=>{ v=Math.max(0,Math.min(1,v)); const LO=[206,200,187],HI=[58,55,48]; return `rgb(${LO.map((c,i)=>Math.round(c+(HI[i]-c)*v)).join(',')})`; };
    // dots pop in AFTER the line finishes drawing (chartDraw is 1.05s) — each one
    // landing in sequence along the path feels like the line is "placing" them,
    // rather than everything appearing at once the instant the draw completes.
    const dots=pts.map(p=>`<circle class="cpt" data-i="${p.i}" cx="${p.x}" cy="${p.y}" r="3.6" fill="${mode==='safety'?ramp(p.b.avg):STATE_COLOR(p.b.dom)}" stroke="var(--bone)" stroke-width="1.6"${gain?` style="animation-delay:${950+p.i*60}ms"`:''}></circle>`).join('');
    let defs, lineSvg, footer;
    const stops=pts.map(p=>`<stop offset="${N===1?0:(p.i/(N-1)).toFixed(3)}" stop-color="${mode==='safety'?ramp(p.b.avg):STATE_COLOR(p.b.dom)}"></stop>`).join('');
    defs=`<defs><linearGradient id="cline" x1="${padL}" y1="0" x2="${padL+plotW}" y2="0" gradientUnits="userSpaceOnUse">${stops}</linearGradient></defs>`;
    lineSvg=`<path class="cline-area" d="${areaPath}" fill="url(#cline)" opacity=".1"></path><path class="cline-path" pathLength="1" d="${linePath}" fill="none" stroke="url(#cline)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"></path>`;
    const footerDelay=gain?` style="animation-delay:${1150+labIdxs.length*60}ms"`:'';
    if(mode==='safety'){
      footer=`<div class="arc-scale"${footerDelay}><span>Less safety</span><span class="arc-scale-bar"></span><span>More</span></div>`;
    } else {
      const states=[...new Set(B.map(b=>b.dom))];
      footer=`<div class="legend"${footerDelay}>${states.map(k=>`<span class="lg-it">${stateMarks(k)}${STATE_LABEL(k)}</span>`).join('')}</div>`;
    }
    // the floating "Jul 27 \u00b7 play/motivation" readout (2026-07-30, Justin: "this
    // is just floating there") is CUT \u2014 it defaulted to the latest point with no
    // visual line tying it to that dot, and the legend + line already carry
    // which state is which. Tap-a-dot-for-detail interactivity is cut with it
    // (see the removed .cpt click handler) rather than left to silently do nothing.
    return `<svg viewBox="0 0 ${W} ${H}" class="chart${gain?' draw-gain':''}" preserveAspectRatio="xMidYMid meet">${defs}${lineSvg}${dots}${labs.join('')}</svg>${footer}`;
  }
  // N-4: share as the designed card — a branded 1080×1080 image (bone, state dots,
  // the line, wordmark) via the system share sheet when file-sharing is supported;
  // falls back to the text path below otherwise.
  // ── the share image IS the card ─────────────────────────────────────────────
  // Justin 2026-08-01: "make sure the shareable version of the card matches the card
  // design exactly. Right now, it is different."
  //
  // It used to be a bespoke 1080×1080 layout with its own type, its own signature glyph
  // and a hand-drawn stand-in for each card's visual (`SHARE_VIZ`). Those stand-ins were
  // the whole problem: they were written once and never moved again, so by the time of
  // this pass the "times" card had become a bar chart while its share picture was still
  // drawing the retired dot strip, and the safety card had become a spectrum band while
  // its picture drew three bars. Matching them by hand would just restart that clock.
  //
  // So the painter no longer draws a version of the card — it PAINTS THE CARD. The panel
  // is cloned off-screen at a fixed width, the browser lays it out, and the clone's own
  // computed geometry is rasterised: boxes (fill, gradient, border, radius), inline SVG
  // (including gradient fills), and text placed line box by line box using Range rects,
  // so line breaks, weights and colours are the browser's, not a re-implementation.
  // A new card, or a redesign of an old one, is carried for free.
  //
  // Why not foreignObject (the usual "just screenshot the DOM" trick): it is unreliable
  // on iOS Safari, which is where this app is actually shared from, and it fails blank
  // rather than loudly. This walks the DOM and draws primitives, so it works everywhere
  // canvas does.
  const _SS = 2.6;
  const _sspx = (v) => Math.round(v*_SS);
  const _SFONT = (w,px) => w+' '+_sspx(px)+'px Inter, system-ui, sans-serif';
  // The card talks TO you; a shared picture talks ABOUT you, to someone else. So the
  // clone is rewritten to the first person before it is painted — "Saturday is YOUR most
  // regulated day" reads as "…is MY most regulated day" once it is on someone's feed
  // (Justin 2026-08-01: "that makes more sense for sharing"). This is the one deliberate
  // difference between the card and its picture, and it is only ever applied to the
  // throwaway clone — the live card is never touched.
  // Ordered longest-first so "yourself"/"you're"/"your" are consumed before bare "you",
  // and object position ("to you") is handled before subject position.
  const _FP = [
    [/\byourselves\b/g,'ourselves'], [/\bYourselves\b/g,'Ourselves'],
    [/\byourself\b/g,'myself'],      [/\bYourself\b/g,'Myself'],
    [/\byou're\b/gi,"I'm"],          [/\byou've\b/gi,"I've"],
    [/\byou'll\b/gi,"I'll"],         [/\byou'd\b/gi,"I'd"],
    [/\byours\b/g,'mine'],           [/\bYours\b/g,'Mine'],
    [/\byour\b/g,'my'],              [/\bYour\b/g,'My'],
    [/\b(to|for|with|about|like|than|suits?)\s+you\b/gi, (m,w)=>w+' me'],
    [/\byou are\b/gi,'I am'],        [/\byou were\b/gi,'I was'],
    [/\byou\b/g,'I'],                [/\bYou\b/g,'I'],
  ];
  function _firstPerson(str){
    let out=String(str);
    _FP.forEach(([re,to])=>{ out = out.replace(re, to); });
    return out;
  }
  function _toFirstPerson(root){
    const tw=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n; const hits=[];
    while((n=tw.nextNode())) hits.push(n);
    hits.forEach(n=>{ const v=n.nodeValue; if(!v || !/you|your/i.test(v)) return;
      const nv=_firstPerson(v); if(nv!==v) n.nodeValue=nv; });
  }
  function _shareTokens(){
    let cs=null; try{ cs=getComputedStyle(document.documentElement); }catch(e){}
    const g=(n,f)=>{ try{ return ((cs&&cs.getPropertyValue(n))||'').trim()||f; }catch(e){ return f; } };
    return { bone:g('--bone','#FAF9F5'), boneDeep:g('--bone-deep','#F0EEE7'),
             hairline:g('--hairline','#D8D2C2'), ink:g('--ink','#1A1F2A'),
             ink80:g('--ink-80','#3A3F4A'), muted:g('--muted','#4E4A41') };
  }
  function _rr(x,bx,by,bw,bh,r){
    const R = Array.isArray(r) ? r : [r,r,r,r];
    const m = Math.min(bw,bh)/2;
    const c = R.map(v=>Math.max(0,Math.min(v,m)));
    x.beginPath();
    x.moveTo(bx+c[0],by);
    x.lineTo(bx+bw-c[1],by); x.arcTo(bx+bw,by,bx+bw,by+c[1],c[1]);
    x.lineTo(bx+bw,by+bh-c[2]); x.arcTo(bx+bw,by+bh,bx+bw-c[2],by+bh,c[2]);
    x.lineTo(bx+c[3],by+bh); x.arcTo(bx,by+bh,bx,by+bh-c[3],c[3]);
    x.lineTo(bx,by+c[0]); x.arcTo(bx,by,bx+c[0],by,c[0]);
    x.closePath();
  }
  const _isPaint = (c) => !!c && c!=='none' && c!=='transparent' && !/rgba\([^)]*,\s*0\s*\)$/.test(c);
  const _px = (v) => parseFloat(v)||0;
  // computed background-image -> a canvas gradient across the element's box.
  // Chrome normalises to `linear-gradient(<deg>deg, rgb(..) <pos>, ...)`; the `to right`
  // and bare-two-colour forms are handled too.
  function _cnvGradient(x, img, X, Y, W, H){
    if(!img || img.indexOf('linear-gradient')<0) return null;
    const inner = img.slice(img.indexOf('linear-gradient(')+16, img.lastIndexOf(')'));
    const parts=[]; let depth=0, cur='';
    for(const ch of inner){
      if(ch==='(') depth++; if(ch===')') depth--;
      if(ch===',' && !depth){ parts.push(cur.trim()); cur=''; } else cur+=ch;
    }
    if(cur.trim()) parts.push(cur.trim());
    let deg=180;
    if(/^[-\d.]+deg$/.test(parts[0])){ deg=parseFloat(parts.shift()); }
    else if(/^to\s/.test(parts[0])){ const d=parts.shift();
      deg = /right/.test(d) ? 90 : /left/.test(d) ? 270 : /top/.test(d) ? 0 : 180; }
    const stops = parts.map(s=>{
      const mm = s.match(/^(.*?)(?:\s+([-\d.]+)%)?$/);
      return { c:(mm&&mm[1]||s).trim(), p:(mm&&mm[2]!=null)?parseFloat(mm[2])/100:null };
    }).filter(s=>_isPaint(s.c));
    if(stops.length<2) return null;
    stops.forEach((s,i)=>{ if(s.p==null) s.p = i/(stops.length-1); });
    // css angle: 0deg points up, clockwise. project onto the box.
    const rad=(deg-90)*Math.PI/180, cx=X+W/2, cy=Y+H/2;
    const L=(Math.abs(W*Math.cos(rad))+Math.abs(H*Math.sin(rad)))/2;
    const g=x.createLinearGradient(cx-Math.cos(rad)*L, cy-Math.sin(rad)*L, cx+Math.cos(rad)*L, cy+Math.sin(rad)*L);
    stops.forEach(s=>{ try{ g.addColorStop(Math.max(0,Math.min(1,s.p)), s.c); }catch(e){} });
    return g;
  }
  // paints one inline <svg> — every path/rect/circle in it — into the box the browser
  // gave that svg. Honours viewBox, preserveAspectRatio (meet | none) and url(#grad) fills.
  function _cnvSvg(x, svg, X, Y, W, H){
    let vb=(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
    if(vb.length!==4 || vb.some(isNaN)) vb=[0,0,W,H];
    const none = (svg.getAttribute('preserveAspectRatio')||'').indexOf('none')>=0;
    let sx=W/vb[2], sy=H/vb[3], tx=X, ty=Y;
    if(!none){ const s=Math.min(sx,sy); tx=X+(W-vb[2]*s)/2; ty=Y+(H-vb[3]*s)/2; sx=sy=s; }
    const map=(px,py)=>[tx+(px-vb[0])*sx, ty+(py-vb[1])*sy];
    const paint=(el,spec)=>{   // el is needed for objectBoundingBox gradients
      if(!spec || spec==='none') return null;
      const um=String(spec).match(/url\(["']?#([^"')]+)["']?\)/);
      if(!um) return _isPaint(spec) ? spec : null;
      const gd=svg.querySelector('#'+CSS.escape(um[1]));
      if(!gd) return null;
      const stops=[...gd.querySelectorAll('stop')].map(st=>({
        o:parseFloat(st.getAttribute('offset')||'0'),
        c:(getComputedStyle(st).stopColor||st.getAttribute('stop-color')||'#000') }));
      if(!stops.length) return null;
      // the paths are filled with the canvas transformed INTO viewBox space, so the
      // gradient's coordinates must be in viewBox space too — mapping them to canvas
      // pixels first (the first cut) collapsed the arrow to one flat colour.
      const ubb = (gd.getAttribute('gradientUnits')||'objectBoundingBox')!=='userSpaceOnUse';
      let bb={x:vb[0],y:vb[1],w:vb[2],h:vb[3]};
      if(ubb){ try{ const bx=el.getBBox(); if(bx && bx.width) bb={x:bx.x,y:bx.y,w:bx.width,h:bx.height}; }catch(e){} }
      const gx=(v,d,ax)=>{ const n=parseFloat(v==null?d:v);
        if(!ubb) return n;
        return (ax==='x'? bb.x+bb.w*n : bb.y+bb.h*n); };
      const g=x.createLinearGradient(
        gx(gd.getAttribute('x1'), ubb?'0':String(vb[0]), 'x'),
        gx(gd.getAttribute('y1'), ubb?'0':String(vb[1]), 'y'),
        gx(gd.getAttribute('x2'), ubb?'1':String(vb[0]+vb[2]), 'x'),
        gx(gd.getAttribute('y2'), ubb?'0':String(vb[1]), 'y'));
      stops.forEach(s=>{ try{ g.addColorStop(Math.max(0,Math.min(1,s.o)), s.c); }catch(e){} });
      return g;
    };
    x.save();
    x.setTransform(sx,0,0,sy, tx-vb[0]*sx, ty-vb[1]*sy);
    svg.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse').forEach(el=>{
      const cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden') return;
      let p=null;
      try{
        const tag=el.tagName.toLowerCase();
        if(tag==='path') p=new Path2D(el.getAttribute('d')||'');
        else{
          p=new Path2D();
          if(tag==='circle') p.arc(+el.getAttribute('cx')||0, +el.getAttribute('cy')||0, +el.getAttribute('r')||0, 0, 7);
          else if(tag==='ellipse') p.ellipse(+el.getAttribute('cx')||0, +el.getAttribute('cy')||0, +el.getAttribute('rx')||0, +el.getAttribute('ry')||0, 0,0,7);
          else if(tag==='rect') p.rect(+el.getAttribute('x')||0, +el.getAttribute('y')||0, +el.getAttribute('width')||0, +el.getAttribute('height')||0);
          else if(tag==='line'){ p.moveTo(+el.getAttribute('x1')||0,+el.getAttribute('y1')||0); p.lineTo(+el.getAttribute('x2')||0,+el.getAttribute('y2')||0); }
          else{ const pts=(el.getAttribute('points')||'').trim().split(/[\s,]+/).map(Number);
                for(let i=0;i+1<pts.length;i+=2){ i?p.lineTo(pts[i],pts[i+1]):p.moveTo(pts[i],pts[i+1]); }
                if(tag==='polygon') p.closePath(); }
        }
      }catch(e){ return; }
      const op=parseFloat(cs.opacity); if(!isNaN(op) && op<1) x.globalAlpha=op;
      const f=paint(el, cs.fill); if(f){ x.fillStyle=f; x.fill(p, cs.fillRule==='evenodd'?'evenodd':'nonzero'); }
      const st=paint(el, cs.stroke), sw=_px(cs.strokeWidth);
      if(st && sw>0){ x.strokeStyle=st; x.lineWidth=sw;
        x.lineCap=cs.strokeLinecap||'butt'; x.lineJoin=cs.strokeLinejoin||'miter'; x.stroke(p); }
      x.globalAlpha=1;
    });
    x.restore();
  }
  // every text node, split into its real line boxes via Range rects — so the picture
  // breaks lines exactly where the card does, in the same weight and colour.
  function _cnvText(x, root, O, S){
    const tw=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n;
    while((n=tw.nextNode())){
      const raw=n.nodeValue; if(!raw || !raw.trim()) continue;
      const par=n.parentElement; if(!par) continue;
      const cs=getComputedStyle(par);
      if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0) continue;
      const fs=_px(cs.fontSize);
      const font=(cs.fontStyle&&cs.fontStyle!=='normal'?cs.fontStyle+' ':'')+cs.fontWeight+' '+fs+'px '+cs.fontFamily;
      // The string for a line is accumulated from exactly the characters the browser
      // gave a real box to — never sliced by index and never trimmed. Whitespace that
      // the browser COLLAPSED (a space at a line edge) has a zero-size rect and is
      // dropped; whitespace it KEPT (the space before a bold word) has a real rect and
      // is kept. Slicing-then-trimming instead, as the first cut did, deleted spaces
      // that were genuinely there and welded "most" onto "playful".
      const r=document.createRange();
      const lines=[]; let cur=null;
      for(let i=0;i<raw.length;i++){
        let rect=null;
        try{ r.setStart(n,i); r.setEnd(n,i+1); rect=r.getBoundingClientRect(); }catch(e){ continue; }
        if(!rect || (!rect.width && !rect.height)) continue;
        if(!cur || Math.abs(rect.top-cur.top)>1){
          if(cur) lines.push(cur);
          cur={t:raw[i], top:rect.top, bottom:rect.bottom, left:rect.left, right:rect.right};
        } else { cur.t+=raw[i]; cur.right=Math.max(cur.right,rect.right);
                 cur.bottom=Math.max(cur.bottom,rect.bottom); cur.left=Math.min(cur.left,rect.left); }
      }
      if(cur) lines.push(cur);
      if(!lines.length) continue;
      const op=parseFloat(cs.opacity);
      x.save();
      if(!isNaN(op) && op<1) x.globalAlpha=op;
      x.fillStyle=cs.color; x.textAlign='left'; x.textBaseline='middle';
      x.font=(cs.fontWeight+' '+Math.round(fs*S)+'px '+cs.fontFamily);
      lines.forEach(L=>{
        const str=L.t;
        if(!str) return;
        const tx=O.x+(L.left-O.l)*S, ty=O.y+((L.top+L.bottom)/2-O.t)*S;
        // Canvas metrics and the browser's own layout do not agree exactly (hinting,
        // kerning, the rounding in the scaled font size), and the error ACCUMULATES
        // across a line — enough that "is your most " overran the start of the next
        // text node and ate the space before a bold word. Pinning each line to the
        // width the browser actually gave it removes the drift entirely, so adjacent
        // text nodes can neither collide nor drift apart.
        const target=(L.right-L.left)*S, m=x.measureText(str).width;
        const k=(m>0 && target>0) ? Math.max(0.7, Math.min(1.35, target/m)) : 1;
        x.save(); x.translate(tx,ty); if(k!==1) x.scale(k,1); x.fillText(str,0,0); x.restore();
      });
      x.restore();
    }
  }
  // boxes: background colour, background gradient, border, radius — in tree order.
  function _cnvBoxes(x, root, O, S){
    (function walk(el){
      const cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden') return;
      const op=parseFloat(cs.opacity); if(op===0) return;
      const r=el.getBoundingClientRect();
      const X=O.x+(r.left-O.l)*S, Y=O.y+(r.top-O.t)*S, W=r.width*S, H=r.height*S;
      if(el.tagName.toLowerCase()==='svg'){ if(W>0&&H>0){ x.save(); if(op<1) x.globalAlpha=op; _cnvSvg(x, el, X, Y, W, H); x.restore(); } return; }
      if(W>0 && H>0){
        x.save(); if(op<1) x.globalAlpha=op;
        const rad=['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(k=>_px(cs[k])*S);
        if(_isPaint(cs.backgroundColor)){ x.fillStyle=cs.backgroundColor; _rr(x,X,Y,W,H,rad); x.fill(); }
        const g=_cnvGradient(x, cs.backgroundImage, X, Y, W, H);
        if(g){ x.fillStyle=g; _rr(x,X,Y,W,H,rad); x.fill(); }
        const bw=['borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth'].map(k=>_px(cs[k]));
        const bc=['borderTopColor','borderRightColor','borderBottomColor','borderLeftColor'].map(k=>cs[k]);
        const bs=['borderTopStyle','borderRightStyle','borderBottomStyle','borderLeftStyle'].map(k=>cs[k]);
        const uniform = bw.every(v=>v===bw[0]) && bc.every(v=>v===bc[0]) && bs.every(v=>v===bs[0]);
        if(uniform && bw[0]>0 && bs[0]!=='none' && _isPaint(bc[0])){
          x.strokeStyle=bc[0]; x.lineWidth=bw[0]*S;
          if(bs[0]==='dashed') x.setLineDash([bw[0]*S*3, bw[0]*S*2]);
          _rr(x, X+bw[0]*S/2, Y+bw[0]*S/2, W-bw[0]*S, H-bw[0]*S, rad.map(v=>Math.max(0,v-bw[0]*S/2))); x.stroke();
          x.setLineDash([]);
        } else {
          const seg=[[X,Y,X+W,Y],[X+W,Y,X+W,Y+H],[X,Y+H,X+W,Y+H],[X,Y,X,Y+H]];
          bw.forEach((w,i)=>{ if(w>0 && bs[i]!=='none' && _isPaint(bc[i])){
            x.strokeStyle=bc[i]; x.lineWidth=w*S; x.beginPath();
            x.moveTo(seg[i][0],seg[i][1]); x.lineTo(seg[i][2],seg[i][3]); x.stroke(); } });
        }
        x.restore();
      }
      [...el.children].forEach(walk);
    })(root);
  }
  // clone the panel off-screen so we can lay it out at a width that suits a square
  // picture without disturbing what the user is looking at. `.panel-in` is dropped:
  // the base rules (see app.css, the rcGrow/cbHeroGIn blocks) are deliberately the
  // FINAL state with no hidden start, so the clone is fully drawn the instant it lands.
  // The picture is SQUARE and the card's contents adapt to fill it (Justin 2026-08-01:
  // "let's not place the card inside of the square. Let the contents adapt to the square
  // instead. same layout, but the rounded corners are not going to work"). So the clone is
  // laid out in a SQUARE box, not at a card's natural proportions: same stylesheet, same
  // order, same type ramp, but the box it flows into is 1:1. `.panel-foot{margin-top:auto}`
  // still pins the foot to the bottom edge, so the layout reads exactly as it does in-app —
  // it just has a square to breathe into. The card's own frame (radius + hairline) is
  // dropped: at full bleed a border would just trace the image edge.
  //
  // Choosing the side length: a wider box wraps the text into fewer lines, so content
  // height falls as the side grows — monotone enough to bisect. Find the smallest square
  // the content actually fits in, so type stays as large as it can be.
  function _shareClone(panel, withData){
    const host=document.createElement('div');
    host.className='share-clone-host';
    host.setAttribute('style','position:fixed;left:-99999px;top:0;z-index:-1;pointer-events:none');
    const c=panel.cloneNode(true);
    c.classList.remove('panel-in');
    c.querySelectorAll('.panel-share').forEach(e=>e.remove());
    if(!withData) c.querySelectorAll('.rc-chart,.bl-wrap,.bl-key,.cb-journey,.cb-viz,.distrows,.gr-line,.chart,canvas,svg.chart').forEach(e=>e.remove());
    _toFirstPerson(c);
    // the brand foot lives here and nowhere else. `.panel-foot{margin-top:auto}` pins it to
    // the square's bottom edge, exactly as it did when it sat on the card.
    c.insertAdjacentHTML('beforeend', panelFoot());
    // The card's own 24/22px padding is right for a panel sitting in a scroll view with
    // other chrome around it. A shared picture has NO chrome — it is the whole frame — so
    // that padding reads as cramped once it is edge to edge (Justin 2026-08-01: "give it
    // more visual spacing in the margins"). Padding is set as a FRACTION of the square's
    // side, so the margin scales with the picture instead of being a fixed guess, and it
    // is applied inside the bisection because it changes how the text wraps.
    const base='flex:0 0 auto;margin:0;border-radius:0;border:0;box-shadow:none;';
    const styleAt=(w,h)=>base+'width:'+w+'px;height:'+h+';padding:'+Math.round(w*0.095)+'px '+Math.round(w*0.085)+'px;';
    c.setAttribute('style', styleAt(420,'auto'));
    host.appendChild(c); document.body.appendChild(host);
    // bisect for the smallest square side that holds the content
    let lo=320, hi=820, side=hi;
    for(let i=0;i<8;i++){
      const mid=Math.round((lo+hi)/2);
      c.setAttribute('style', styleAt(mid,'auto'));
      if(c.scrollHeight<=mid){ side=mid; hi=mid-1; } else { lo=mid+1; }
      if(lo>hi) break;
    }
    c.setAttribute('style', styleAt(side, side+'px'));
    return {host, card:c};
  }
  async function shareCardImage(txt, panel){
    let clone=null;
    try{
      try{ if(document.fonts && document.fonts.ready) await document.fonts.ready; }catch(_){}
      const T=_shareTokens();
      const W=1080,H=1080,cv=document.createElement('canvas'); cv.width=W; cv.height=H;
      const x=cv.getContext('2d'); if(!x) return false;
      x.fillStyle=T.bone; x.fillRect(0,0,W,H);
      if(panel){
        // the "your data on shared images" switch (Settings → Your data) used to hide a
        // bespoke signature glyph that no longer exists. It now governs the thing that
        // actually carries personal data: the card's reading. Words and design still go.
        let withData=true; try{ withData = localStorage.getItem('snb_share_glyph')!=='0'; }catch(e){}
        clone=_shareClone(panel, withData);
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const r=clone.card.getBoundingClientRect();
        if(r.width>0 && r.height>0){
          // full bleed: the clone is already square, so it maps 1:1 onto the canvas.
          const S=Math.min(W/r.width, H/r.height);
          const O={ l:r.left, t:r.top, x:(W-r.width*S)/2, y:(H-r.height*S)/2 };
          _cnvBoxes(x, clone.card, O, S);
          _cnvText(x, clone.card, O, S);
          clone.host.remove(); clone=null;
          const blob=await new Promise(r2=>cv.toBlob(r2,'image/png'));
          if(!blob) return false;
          const file=new File([blob],'stuck-not-broken.png',{type:'image/png'});
          // the picture says it all; no canned caption is attached to a card share.
          if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file]}); return true; }
          return false;
        }
        clone.host.remove(); clone=null;
      }
      // no card in hand (the week card, the live-practice popup, the pattern shares):
      // a plain card in the same clothes — bone, hairline, the sentence, the brand foot.
      const CX=100, CY=100, CW=W-200, CH=H-200, padX=_sspx(22), padY=_sspx(24), innerW=CW-2*padX;
      x.fillStyle=T.bone; _rr(x,CX,CY,CW,CH,_sspx(16)); x.fill();
      x.strokeStyle=T.hairline; x.lineWidth=_sspx(1); _rr(x,CX,CY,CW,CH,_sspx(16)); x.stroke();
      const body=String(txt||'').replace(/\s*stuck not broken( · (app\.)?stucknotbroken\.com(\/stuck)?)?\s*$/i,'').trim();
      const fs=21, lh=Math.round(_sspx(fs)*1.45);
      x.font=_SFONT('500',fs); x.fillStyle=T.ink; x.textAlign='left'; x.textBaseline='alphabetic';
      const words=body.split(/\s+/).filter(Boolean), lines=[]; let line='';
      words.forEach(w=>{ const t=line?line+' '+w:w;
        if(x.measureText(t).width>innerW && line){ lines.push(line); line=w; } else line=t; });
      if(line) lines.push(line);
      lines.slice(0,10).forEach((l,i)=>x.fillText(l, CX+padX, CY+padY+lh*0.78+i*lh));
      const fh=_sspx(13), fy=CY+CH-padY-fh;
      const vb=String(TRI_VB).split(/\s+/).map(Number), sc=fh/vb[3], gw=vb[2]*sc, I=window.SNB_ICONS||{};
      x.save(); x.globalAlpha=0.7;
      x.save(); x.translate(CX+padX, fy); x.scale(sc,sc); x.translate(-vb[0],-vb[1]);
      x.fillStyle=T.muted; TRI_ORDER.forEach(m=>{ const ic=I[m]; if(ic) x.fill(new Path2D(ic.d)); });
      x.restore();
      x.fillStyle=T.muted; x.font=_SFONT('400',11);
      x.fillText(BRAND_FOOT, CX+padX+gw+_sspx(7), fy+fh*0.85);
      x.restore();
      const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
      if(!blob) return false;
      const file=new File([blob],'stuck-not-broken.png',{type:'image/png'});
      if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], text:txt}); return true; }
    }catch(e){ if(e && e.name==='AbortError') return true; }
    finally{ try{ if(clone && clone.host) clone.host.remove(); }catch(e){} }
    return false;
  }
  function openShare(txt, panel){
    shareCardImage(txt, panel).then(ok=>{ if(!ok) _openShareText(txt || _cardWords(panel)); });
  }
  // the card's own words, in the first person — used only when the device cannot share a
  // file at all, so the text sheet still says something true rather than nothing.
  function _cardWords(panel){
    if(!panel) return 'Stuck Not Broken · stucknotbroken.com/app';
    const pick=(sel)=>{ const e=panel.querySelector(sel); return e ? e.textContent.replace(/\s+/g,' ').trim() : ''; };
    const head=[pick('.panel-title'), pick('.rc-hero-word'), pick('.rc-hero-title')].filter(Boolean).join(' ');
    const line=pick('.cb-line-lead')||pick('.cb-line')||pick('.panel-sub');
    const body=[head, line].filter(Boolean).join(' — ');
    return (_firstPerson(body||'My nervous system, over time.')+' · stucknotbroken.com/app').trim();
  }
  function _openShareText(txt){
    const url=location.href;
    if(navigator.share){ navigator.share({title:'Stuck Not Broken', text:txt, url}).catch(()=>{}); return; }
    const enc=encodeURIComponent(txt);
    const host=document.querySelector('.shell')||document.body;
    const old=document.getElementById('share-sheet'); if(old) old.remove();
    const s=document.createElement('div'); s.id='share-sheet'; s.className='share-sheet';
    s.innerHTML=`<div class="ss-card"><p class="ss-h">Share your progress</p><a class="ss-opt" href="sms:?&body=${enc}">Message</a><a class="ss-opt" href="mailto:?subject=${encodeURIComponent('my progress')}&body=${enc}">Email</a><a class="ss-opt" href="https://twitter.com/intent/tweet?text=${enc}" target="_blank" rel="noopener">Post to x</a><button class="ss-opt" type="button" data-copy="1">Copy</button><button class="ss-cancel" type="button">Cancel</button></div>`;
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
    const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return { label:names[best.day], idx:best.day, pct:best.pct };
  }
  // mirror of _weekdayPattern, but the LEAST-regulated day (Justin 2026-07-29d).
  // same gating (>=3 check-ins/day, >=14 total) so it never fires on thin data.
  function _weekdayPatternWorst(cs){
    if(cs.length < 14) return null;
    const by={};
    cs.forEach(c=>{ const d=new Date(c.t).getDay(); (by[d]=by[d]||[]).push(c); });
    let worst=null;
    Object.keys(by).forEach(d=>{ const a=by[d]; if(a.length>=3){ const p=_safeShare(a); if(worst==null||p<worst.pct) worst={ day:+d, pct:p }; } });
    if(!worst) return null;
    const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return { label:names[worst.day], idx:worst.day, pct:worst.pct };
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
    // `key` is the raw segment (for building the daypart strip visual); `seg` stays the
    // human label so existing "${dp.seg}" copy is unaffected.
    return { seg:names[best.seg]||best.seg, key:best.seg, pct:best.pct };
  }
  // mirror of _daypartPattern, but the LEAST-regulated time of day (Justin 2026-07-29e:
  // "do a least regulated time of day as well"). Same gating as the "best" version.
  function _daypartPatternWorst(cs){
    if(cs.length < 12) return null;
    const by={};
    cs.forEach(c=>{ const s=segOf(c.t); (by[s]=by[s]||[]).push(c); });
    let worst=null;
    Object.keys(by).forEach(s=>{ const a=by[s]; if(a.length>=3){ const p=_safeShare(a); if(worst==null||p<worst.pct) worst={ seg:s, pct:p }; } });
    if(!worst) return null;
    const names={ morning:'morning', afternoon:'afternoon', evening:'evening', late:'late night' };
    return { seg:names[worst.seg]||worst.seg, key:worst.seg, pct:worst.pct };
  }
  // per-daypart share of safe check-ins, for the deep "time of day" rows (null when thin)
  function _daypartPct(cs, seg){
    const a=cs.filter(x=>segOf(x.t)===seg);
    if(a.length<3) return null;
    return _safeShare(a);
  }
  // which defense state the dips most often start in — colors + glyphs the comeback card
  function _topDipState(){
    const cs = Store.checkins().filter(c=>c.dom&&c.dom!=='neutral');   // stored filter kept until A4 derives this helper (Ruling 2)
    const cnt={}; let inDip=false;
    cs.forEach(c=>{ if(!_REGDOMS[c.dom]){ if(!inDip){ cnt[c.dom]=(cnt[c.dom]||0)+1; inDip=true; } } else inDip=false; });
    const e=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    return (e&&e[1]>=3)?e[0]:null;
  }
  // recovery trend over full history: early episodes vs recent episodes.
  // a slowing never headlines (copy rule: dips live in the reader, gently).
  function _recoveryTrend(){
    const cs = Store.checkins().filter(c=>c.dom&&c.dom!=='neutral');   // stored filter kept until A4 derives this helper (Ruling 2)
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
  // maxWeeksBack: when set, bestWeek only looks at weeks within that many weeks of now —
  // used by the reader essay so "your most regulated week" can't reach back to an
  // arbitrarily old week the essay isn't otherwise discussing (Justin 2026-07-28).
  // The You-tab stats-card call stays unbounded (a legitimate all-time personal best).
  function _personalRecords(allCs, maxWeeksBack){
    const cs = allCs.filter(c=>c.dom&&c.dom!=='neutral').sort((a,b)=>a.t-b.t);   // stored filter kept until A4 derives this helper (Ruling 2)
    if(cs.length<12) return null;
    const wk={}; cs.forEach(c=>{ const ws=_sundayStart(c.t); (wk[ws]=wk[ws]||[]).push(c); });
    const curWs=_sundayStart(Date.now());
    const oldestWs = maxWeeksBack!=null ? (curWs - maxWeeksBack*7*864e5) : -Infinity;
    let bw=null;
    Object.keys(wk).forEach(ws=>{ if(+ws===curWs || +ws<oldestWs) return; const a=wk[ws];
      if(a.length>=4){ const reg=a.filter(c=>_REGDOMS[c.dom]).length/a.length; if(!bw||reg>bw.share) bw={ ws:+ws, share:reg }; } });
    const bestWeek = bw ? { label:new Date(bw.ws).toLocaleDateString(undefined,{month:'long',day:'numeric'}), pct:Math.round(bw.share*100), ws:bw.ws } : null;
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
  // ---- the baseline card, rebuilt (§7.2, Justin 2026-07-27) ----
  // (retired: the old 28-day _baselineCard %/meter — replaced by the spectrum card below)
  // No percent, no meter-to-100. The person is their own scale: the six-state
  // spectrum (their colors, their order) is the axis. The dot is the state they
  // spend the most time in over the window; a white outline shows this window's
  // state variation; a grey overlay shows the previous window's, to compare.
  // Window comes from the you-tab time toggle (days), so the same card serves
  // every timescale the person picks.
  const _BL_ORDER = ['shutdown','freeze','fightflight','play','safety','stillness'];
  /* ── the baseline, on margin (Justin, 2026-08-16) ──────────────────────────
     This card used to plot the median position on the ordinal axis above: every
     check-in's stored NAME became an index 0-5 and the dot was the middle one.
     Two problems with that. Ordinal positions have no distance — shutdown->freeze
     was the same size step as safety->stillness. And the order contradicted the
     model at the top: stillness sat above safety, but stillness 80/10/60 has
     margin +0.350 against safety 90/10/5 at +0.585, so moving safety->stillness
     climbed the card while the actual margin fell. (_PE_RANK ordered those two
     the other way round, so the two cards disagreed with each other.)

     Now the axis is margin, rescaled per side exactly as the read's qualifier is:
     one full defense below the line, the person's own full ventral above it.
     Centre is margin 0 — capacity exactly covering load.

     No number is ever printed. The dot is a position and the band is a spread;
     margins stay internal and the person stays their own scale.

     THE GATE IS ITS OWN THING. The you-tab toggle is a viewing preference; a
     baseline is a statistical claim, so it does not inherit that window. It needs
     n >= 8 reads across at least 28 days. Below that the card returns early with
     the count and the shortfall, and the caller shows a pre-baseline state — which
     is what most people will see, at a median of ~2 check-ins per user.
     Computed-Quiet rows are not readable margins (D-A): they are excluded from the
     mean AND from the count, because a check-in that cannot inform the mean must
     not buy confidence in it.                                                   */
  const _BL_MIN_N = 8, _BL_MIN_DAYS = 28;
  // margin -> 0..1. Continuous at the centre; each side on its own scale.
  function _blPosOf(m){
    if(m == null) return 0.5;
    return m >= 0 ? 0.5 + 0.5*Math.min(1, m/0.7)
                  : 0.5 - 0.5*Math.min(1, -m/0.3);
  }
  function _blBandOf(margins){
    const a = margins.slice().sort((x,y)=>x-y);
    const q = p => { const i=(a.length-1)*p, lo=Math.floor(i), hi=Math.ceil(i); return a[lo]+(a[hi]-a[lo])*(i-lo); };
    // central mass (p16..p84), padded a little so a tight cluster still shows width
    return { lo: Math.max(0, _blPosOf(q(0.16)) - 1/24), hi: Math.min(1, _blPosOf(q(0.84)) + 1/24) };
  }
  // pure: allCs + the active window's length in days (null = all time)
  function _baselineBar(allCs, days){
    const now = Date.now();
    // the baseline window is at least 28 days regardless of what the toggle says
    const win = (days == null) ? null : Math.max(days, _BL_MIN_DAYS);
    const inWin = win == null ? _reads(allCs) : _reads(allCs.filter(c => c.t >= now - win*864e5));
    const margins = inWin.map(_cMargin).filter(m => m != null);
    const n = margins.length;
    const mean = n ? margins.reduce((x,y)=>x+y,0)/n : null;

    if(n < _BL_MIN_N)
      return { early:true, n, need:_BL_MIN_N - n, minN:_BL_MIN_N, minDays:_BL_MIN_DAYS,
               windowDays:win, dotPos:_blPosOf(mean) };

    // the label is still a name — a descriptive word for where the middle sits, not
    // a measurement. Derived from circuit values like every other name now.
    const cnt = {}; inWin.forEach(c => { const k=_cDom(c); if(k && k!=='neutral') cnt[k]=(cnt[k]||0)+1; });
    let modeState = null, mb = -1;
    Object.keys(cnt).forEach(k => { if(cnt[k] > mb){ mb = cnt[k]; modeState = k; } });

    const band = _blBandOf(margins);
    let prev = null;
    if(win != null){
      const pm = _reads(allCs.filter(c => c.t >= now - 2*win*864e5 && c.t < now - win*864e5))
                   .map(_cMargin).filter(m => m != null);
      if(pm.length >= _BL_MIN_N) prev = _blBandOf(pm);      // like-for-like: same gate both windows
    }
    return { early:false, n, windowDays:win, dotPos:_blPosOf(mean), modeState:modeState,
             bandLo:band.lo, bandHi:band.hi, prev };
  }
  // renders the card body (everything under the panel-sub). phrases name the window.
  function _blCardHTML(bl, nowPhrase, prevPhrase){
    const pc = x => (x*100).toFixed(1);
    const ticks = `<div class="bl-ticks">${['shutdown','freeze','flight/<br>fight','play','safety','stillness'].map(t=>`<span>${t}</span>`).join('')}</div>`;
    if(bl.early){
      return `<div class="bl-wrap early"><div class="bl-bar"></div>${ticks}</div>
        <p class="bl-early"><b>Your baseline is still forming.</b> ${bl.n===0?`It takes ${bl.minN} check-ins to draw.`:`${bl.n} of ${bl.minN} check-ins so far. ${bl.need===1?'One more':bl.need+' more'} and it fills in.`}</p>
    <p class="bl-early-sub">It will show where your system tends to sit, and how much it moves from there. Until there is enough to draw from, it stays empty rather than guessing.</p>`;
    }
    const prevEl = bl.prev ? `<span class="bl-prev" style="left:${pc(bl.prev.lo)}%;width:${pc(bl.prev.hi-bl.prev.lo)}%"></span>` : '';
    const band = `<span class="bl-band" style="left:${pc(bl.bandLo)}%;width:${pc(bl.bandHi-bl.bandLo)}%"></span>`;
    const dot  = `<span class="bl-dot" style="left:${pc(bl.dotPos)}%"></span>`;
    const keyPrev = (bl.prev && prevPhrase) ? `<div class="bl-krow"><span class="bl-kmark"><span class="bl-kprev"></span></span><span>your state variation ${prevPhrase}</span></div>` : '';
    return `<div class="bl-wrap"><div class="bl-bar">${prevEl}${band}${dot}</div>${ticks}</div>
      <div class="bl-key">
        <div class="bl-krow"><span class="bl-kmark"><span class="bl-kdot"></span></span><span>The state you spend the most time in</span></div>
        <div class="bl-krow"><span class="bl-kmark"><span class="bl-kband"></span></span><span>your state variation ${nowPhrase}</span></div>
        ${keyPrev}
      </div>`;
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
    Store.checkins().forEach(c=>{ if(!c.dom||c.dom==='neutral') return; const ws=_sundayStart(c.t); (weeks[ws]=weeks[ws]||[]).push(c); });   // stored filter kept until A4 derives this helper (Ruling 2)
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
  /* ── practice effect, on margin ────────────────────────────────────────────
     Was: RANK[after] > RANK[before] on state NAMES, over a flat 12-hour window.
     Two defects that fix themselves here.

     1. The ladder collapsed real movement. RANK scored shutdown and freeze both
        0, play and stillness both 2 — so shutdown -> freeze registered as no
        change at all. Margin is continuous and signed; nothing collapses.
     2. Time proximity, not the actual pairing. store.js already binds a check-in
        to its session with session_id + phase ('before' 0-90 min ahead of launch,
        'after' 0-45 min past it, 'followup' 90 min - 6 h). Those bound pairs were
        sitting unused while the number was computed by "next check-in within 12h".

     We now pair by session_id/phase and report the margin delta. `after` and
     `followup` are DIFFERENT measurements — the immediate lift in safety fades,
     the drop in sympathetic does not — so they are never merged into one number.

     domBefore is no longer consulted: it is a bare name with no circuit values,
     so it could not be re-derived. The bound 'before' check-in carries v/sym/dor
     and gives a real margin.

     ⚠ The >=6 gate below is inherited and is sized for estimating a RATE from
     binary outcomes. A signed continuous delta carries considerably more per
     observation, so this threshold is almost certainly too conservative now —
     left as-is deliberately rather than guessed at, pending real pair volume.   */
  const _PE_WIN = 12*36e5;                    // legacy fallback window, see _peLegacyPair
  // pairs: {before, after, followup} margins for one session, from bound check-ins
  function _pePairs(){
    const cs = Store.checkins(), out = [];
    const bySess = {};
    cs.forEach(c=>{
      if(!c || !c.session_id || !c.phase) return;
      const b = bySess[c.session_id] || (bySess[c.session_id] = {});
      // first of each phase wins; store.js already bounds the windows
      if(!b[c.phase]) b[c.phase] = c;
    });
    Store.sessions().forEach(s=>{
      const b = s && s.id ? bySess[s.id] : null;
      if(!b || !b.before) return;
      const mB = _cMargin(b.before);
      if(mB == null) return;
      const mA = b.after ? _cMargin(b.after) : null;
      const mF = b.followup ? _cMargin(b.followup) : null;
      if(mA == null && mF == null) return;
      out.push({ session:s, practiceKey:s.practiceKey||null, t:s.t, beforeCheckin:b.before,
                 before:mB, after:mA, followup:mF,
                 dAfter: mA==null?null:mA-mB, dFollowup: mF==null?null:mF-mB });
    });
    return out;
  }
  function _peWindowed(){
    const pairs = _pePairs().filter(p=>p.dAfter!=null);
    const total = pairs.length;
    if(total < 6) return null;
    let moved=0, sum=0;
    pairs.forEach(p=>{ sum += p.dAfter; if(p.dAfter > 0) moved++; });
    // `moved`/`rate` kept so existing callers and copy keep working; `mean` is the
    // measure that actually carries the information.
    return { moved, total, rate:moved/total, mean:sum/total };
  }
  function _peInsightsWindowed(){
    const g={};
    _pePairs().forEach(p=>{
      if(!p.practiceKey || p.dAfter==null) return;
      // grouped by the state they went IN with, derived from that check-in's own
      // circuit values rather than a stored name
      const dom = _cDom(p.beforeCheckin);
      if(!dom) return;
      const k=p.practiceKey+'|'+dom+'|'+segOf(p.t);
      const o=g[k]||(g[k]={practiceKey:p.practiceKey,dom:dom,seg:segOf(p.t),moved:0,total:0,sum:0});
      o.total++; o.sum += p.dAfter;
      if(p.dAfter > 0) o.moved++;
    });
    return Object.keys(g).map(k=>g[k]).filter(o=>o.total>=4)
      .map(o=>Object.assign(o,{rate:o.moved/o.total, mean:o.sum/o.total}))
      .sort((a,b)=>b.total-a.total||b.mean-a.mean);
  }
  // context ↔ state link: which tag gets named most around safe check-ins, and which
  // around defense. only per-check-in ('c') tags carry a state, so only they count.
  function _contextStateLink(){
    const m=_ctxLoad();
    const byT={}; Store.checkins().forEach(c=>{ if(c&&c.dom&&c.dom!=='neutral') byT[c.t]=c.dom; });   // stored filter kept until A4 derives this helper (Ruling 2)
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

  // ---- the free You tab: your check-in history, raw ----
  // Not a locked version of the paid tab, and not a teaser. It is the real thing a free
  // account is promised: their own saved check-ins, exactly as they recorded them — the
  // date, the time, the state they named, and the app's mirror of what they set. No
  // trend, no pattern, no verdict, no score: the app does not read it back to them, it
  // simply keeps it and shows it. That read-back is what the base plan is.
  // 🖊 copy draft.
  function tabHistoryFree(c, allCs){
    const cs = allCs.slice().sort((a,b)=>b.t-a.t);   // newest first
    const byDay = {};
    cs.forEach(x=>{ const k = new Date(x.t).toDateString(); (byDay[k] = byDay[k] || []).push(x); });
    const dayHTML = Object.keys(byDay).map(k=>{
      const d = new Date(k);
      const label = sameDay(d.getTime()) ? 'today'
        : d.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' }).toLowerCase();
      const rows = byDay[k].map(x=>{
        const dom = x.dom || (window.PVCurrent.dominantOf(x.v, x.sym, x.dor)||{}).key;
        const mirror = ciMirror(x.v, x.sym, x.dor);
        return `<div class="deep-row hx-row">
          <span class="deep-lbl hx-time">${fmtTime(x.t)}</span>
          <span class="hx-body">
            <span class="hx-name">${dom ? stateMarks(dom) + '<span class="hx-state">'+escapeHtml(STATE_LABEL(dom))+'</span>' : ''}</span>
            ${mirror ? `<span class="hx-mirror">${escapeHtml(mirror)}</span>` : ''}
          </span>
        </div>`;
      }).join('');
      return `<div class="deep-block"><h3 class="deep-h">${escapeHtml(label)}</h3>${rows}</div>`;
    }).join('');

    c.innerHTML = `<div class="view play-view">
      <div class="filter-bar" style="justify-content:flex-end">
        <button class="set-gear ci-add" id="add-ci" type="button" aria-label="New check-in" title="New check-in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>
        <button class="set-gear" id="set-btn" type="button" aria-label="Settings" title="Settings">${GEAR_SVG}</button>
      </div>
      <button class="tb-row p-locked" id="hx-patterns">
        <span class="tb-row-text">
          <span class="tb-row-title">Your patterns</span>
          <span class="tb-row-sub">Your times of day, your week, your numbers &middot; on the base plan</span>
        </span><span class="wc-go">${CHEV}</span>
      </button>
      <a class="you-reader" id="you-reader" href="#" style="margin-top:14px">
        <h3 class="yr-h">Your Reflection</h3>
        <p class="yr-lede">The personal read of your patterns, in plain language.</p>
        <span class="yr-go"><span class="yr-glyph">${triGlyph((cs[0]&&cs[0].dom)||'safety')}</span><span class="yr-txt" style="color:var(--muted)">Read your full reflection &middot; on the base plan</span></span>
      </a>
      <div class="scr-head" style="margin-top:24px"><h2 class="scr-h">Your check-ins.</h2></div>
      <div class="deep">${dayHTML}</div>
    </div>`;
    const ad=$('#add-ci');  if(ad) ad.onclick = screenCheckin;
    const sb1=$('#set-btn'); if(sb1) sb1.onclick = screenSettings;
    const hp=$('#hx-patterns'); if(hp) hp.onclick = ()=>gateSubscribe('patterns');
    const yr=$('#you-reader'); if(yr) yr.onclick = (e)=>{ e.preventDefault(); gateSubscribe('reader'); };
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
          <span class="map-text"><span class="map-name">${STATE_LABEL(st)}</span><span class="map-sub">${ax.sub}</span></span>
          <span class="wc-go">${CHEV}</span>
        </button>`;
      }).join('');
      c.innerHTML = `<div class="view play-view">
        <div class="filter-bar" style="justify-content:flex-end">
          <button class="set-gear" id="set-btn" type="button" aria-label="Settings" title="Settings">${GEAR_SVG}</button>
        </div>
        <div class="map-empty">
        <p class="map-lede">Your three nervous-system states.</p>
        <div class="map-rows">${teach}</div>
        <p class="map-foot">Check in twice, and your patterns start to show here.</p>
        <button class="btn" id="goci">Check in</button></div></div>`;
      $('#goci').onclick = screenCheckin;
      const sb0=$('#set-btn'); if(sb0) sb0.onclick = screenSettings;
      c.querySelectorAll('[data-state-detail]').forEach(b=>b.onclick=()=>screenStateDetail(b.dataset.stateDetail));
      return;
    }
    // The pattern cards + the deep read are the app reading a person's history BACK to
    // them — that is the base plan. Their OWN saved check-ins, exactly as they recorded
    // them, are free forever. So a free account doesn't get a locked, teasing version of
    // this tab; it gets a real one: their history, raw. Free makes people feel seen; paid
    // is how they change.
    if(!paidNow()) return tabHistoryFree(c, allCs);

    const avg = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;
    const domOf = arr => { const m={}; arr.forEach(x=>{m[x.dom]=(m[x.dom]||0)+1;}); const e=Object.entries(m).sort((a,b)=>b[1]-a[1])[0]; return e?e[0]:null; };

    function render(){
      const _span = Store.tenure().days;
      const visPer = PERIODS.filter(p=>p.days==null || p.days<=_span);   // only windows the data actually spans
      if(!visPer.some(p=>p.key===activePeriod)) activePeriod='all';
      const days = PERIODS.find(p=>p.key===activePeriod)?.days||null;
      const cs = filterByPeriod(allCs, days);
      const paced = groupByDay(cs);
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
      const mixHTML=ranked.map(([key,n],i)=>{
        const pct=Math.round(n/total*100);
        return `<button class="distrow" data-state-detail="${key}" style="--sd:${i*50}ms">
          <span class="distrow-top"><span class="distrow-name">${stateMarks(key)}${CAP(({play:'play/motivation',stillness:'stillness'}[key])||STATE_NAME(key))}</span><span class="distrow-pct">${pct}%</span></span>
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
        dayByDay=`<p class="panel-empty">A few more days of check-ins, and your timeline fills in here.</p>`;
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

      // ---- is practice helping: before vs after practice, windowed ----
      // v2 (2026-07-30 redesign, Justin: "what are we trying to show? how
      // practice shifts state? ... this should be purely before and after
      // practice measurement based"). v1 compared average safety on any day
      // that HAD a practice session vs any day that didn't — but that included
      // check-ins that happened BEFORE that day's practice, and counted days
      // where practice happened with no check-in ever logged after it. It
      // measured correlation with a calendar day, never the practice's actual
      // effect. Rebuilt entirely on _peWindowed()/_peInsightsWindowed(): a
      // check-in only counts if it lands within 12 hours AFTER a practice
      // session that has a recorded before-state — a real before/after pair.
      // Same hero treatment as "getting back to safety" (Justin's ask): glyph
      // visual first, one bold lead sentence, small footnote — no bars.
      let practiceHead='';
      (function(){
        const pe=_peWindowed();
        if(!pe) return;
        const pis=_peInsightsWindowed();
        const pi=pis && pis.length ? pis[0] : null;
        const segPhrase = s => s==='late' ? 'late at night' : 'in the '+segLabel(s);
        const pct=Math.round(pe.rate*20)*5;
        // most common pre-practice state across the windowed sessions, purely
        // for the glyph pair (mirrors how "getting back to safety" picks its
        // own most-common dip state) — the claim itself is the RATE below, not
        // a promise that practice always starts from this exact state.
        const domCounts={};
        _pePairs().forEach(p=>{ const d=_cDom(p.beforeCheckin); if(d && d!=='neutral') domCounts[d]=(domCounts[d]||0)+1; });
        const modeDom=Object.keys(domCounts).sort((a,b)=>domCounts[b]-domCounts[a])[0] || 'fightflight';
        practiceHead=`<div class="cb-journey">${cbGlyphViz(modeDom, 'safety', null, 'hero')}</div>
          <p class="cb-line cb-line-lead">After you practice, you move toward more safety about <b>${pct}%</b> of the time.</p>
          <p class="cb-fine">(${pe.total} check-in${pe.total===1?'':'s'} within a few hours of practicing${pi?`; most reliably after ${Store.practiceLabel(pi.practiceKey)} ${segPhrase(pi.seg)}, about ${Math.round(pi.rate*20)*5}% of the time`:''})</p>`;
      })();

      // ---- growth: safety now vs when you started (all-time, not period-filtered) ----
      // v5 (2026-07-30, Justin: "make this into a line graph instead... a nice
      // smooth line using the colors of the safety activation, like the states
      // over time one"). Still the same 2-point then/now comparison (Justin
      // confirmed: restyle the existing 2 points, not a fuller multi-point
      // history — a fuller day-by-day version of this exact card was cut
      // yesterday for looking "ugly"). Drawn with the same gradient/self-draw
      // mechanics as the states-over-time chart (safetyColor, .cline-path/
      // .cline-area/.cpt), just a cubic-bezier S-curve between 2 points instead
      // of an N-point polyline. Layout otherwise unchanged: share button -> big
      // visual first (.cb-journey, standard hero rhythm) -> one bold
      // cb-line-lead sentence -> a small cb-fine footnote.
      // "then" (2026-07-31, Justin: "'then' should say the time period, like
      // 'last month'"): the comparison itself is still always-all-time (start
      // bucket vs recent bucket, not tied to the 7/30/90/all period toggle —
      // that question is separate and still open), but the LABEL now names
      // when the "then" bucket actually was, from the real average timestamp
      // of those check-ins (_relWhen), instead of the bare word "then".
      let growthHead='';
      (function(){
        const tn=Store.tenure();
        if(allCs.length>=8 && tn.days>=5 && tn.stage!=='start' && tn.stage!=='early'){
          const k=Math.max(2,Math.floor(allCs.length/4));
          const startCs=allCs.slice(0,k), recentCs=allCs.slice(-k);
          const startV=avg(startCs.map(x=>x.v)), recentV=avg(recentCs.map(x=>x.v));
          const g=Math.round((recentV-startV)*100), up=g>=3, down=g<=-3;
          // a dip is never the headline here — that conversation lives in the reader.
          if(!down){
            const sV=Math.round(startV*100), rV=Math.round(recentV*100);
            const startColor=safetyColor(startV), recentColor=safetyColor(recentV);
            const heart=ico('heart',{cls:'gr-val-glyph',color:recentColor});
            const thenLabel=_relWhen(avg(startCs.map(x=>x.t)));
            // W/H match chartInner's own viewBox (2026-07-30, Justin: "it's tiny!
            // it should take up as much visual space as 'your states over time'.
            // use the same visual language") — at the same rendered card width,
            // the two charts now carry the same visual weight.
            // BUG FIX (2026-07-31, Justin: "the graph should go all the way to
            // the margin of the card, aligned with 'then' and 'now'"): padX=26
            // (8% inset) left the line/dots visibly indented from where the
            // then/now text sits (flush to the card's own content edges, 0
            // extra padding of their own). Cut to just enough clearance for
            // the larger "now" dot's own radius+stroke (5.4+1) so nothing
            // clips, without the old decorative margin.
            const W=320,H=132,padX=7,padTop=20,padBot=20;
            const x0=padX, x1=W-padX, midX=(x0+x1)/2, baseY=padTop+(H-padTop-padBot);
            const yOf=v=>padTop+(1-Math.max(0,Math.min(1,v)))*(H-padTop-padBot);
            const y0=yOf(startV), y1=yOf(recentV);
            const curvePath=`M ${x0} ${y0} C ${midX} ${y0} ${midX} ${y1} ${x1} ${y1}`;
            const areaPath=`M ${x0} ${baseY} L ${x0} ${y0} C ${midX} ${y0} ${midX} ${y1} ${x1} ${y1} L ${x1} ${baseY} Z`;
            // value labels sit directly above their own point (2026-07-31, Justin:
            // "the safety increase one... has floating percentages" — same "value
            // above the bar, tied to it" rule as .rc-val, not a detached header row).
            // Positioned as a % of the svg's own box so they track the actual point
            // regardless of viewport width; start label left-aligned to its point
            // (room to grow rightward), end label right-aligned to its point (it
            // sits near the chart's right edge, so it must grow leftward instead).
            const lx0=(x0/W*100).toFixed(2), ly0=(y0/H*100).toFixed(2);
            const lx1=(x1/W*100).toFixed(2), ly1=(y1/H*100).toFixed(2);
            const chart=`<div class="gr-line-wrap">
                <div class="gr-line-box">
                  <svg viewBox="0 0 ${W} ${H}" class="chart gr-line-svg draw-gain" preserveAspectRatio="xMidYMid meet">
                    <defs><linearGradient id="glGrad" x1="${x0}" y1="0" x2="${x1}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${startColor}"></stop><stop offset="1" stop-color="${recentColor}"></stop></linearGradient></defs>
                    <path class="cline-area" d="${areaPath}" fill="url(#glGrad)" opacity=".1"></path>
                    <path class="cline-path" pathLength="1" d="${curvePath}" fill="none" stroke="url(#glGrad)" stroke-width="3.4" stroke-linecap="round"></path>
                    <circle class="cpt" cx="${x0}" cy="${y0}" r="4.2" fill="${startColor}" stroke="var(--bone)" stroke-width="1.8" style="animation-delay:150ms"></circle>
                    <circle class="cpt" cx="${x1}" cy="${y1}" r="5.4" fill="${recentColor}" stroke="var(--bone)" stroke-width="2" style="animation-delay:950ms"></circle>
                  </svg>
                  <span class="gr-line-val gr-pt-val" style="left:${lx0}%;top:${ly0}%">${sV}%</span>
                  <span class="gr-line-val gr-line-val-now gr-pt-val gr-pt-val-end" style="left:${lx1}%;top:${ly1}%">${heart}${rV}%</span>
                </div>
                <div class="gr-line-labs"><span>${thenLabel}</span><span>Now</span></div>
              </div>`;
            growthHead=`<div class="cb-journey">${chart}</div>
              <p class="cb-line cb-line-lead">Your average safety has ${up?'grown':'held steady'} since you started.</p>
              <p class="cb-fine">(${tn.days} days between your first and most recent check-ins)</p>`;
          }
        }
      })();
      const SHARE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14V4"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M5 12v7h14v-7"/></svg>';
      const shareBtn=(k)=>`<button class="panel-share" type="button" data-share="${k}" aria-label="Share this card">${SHARE_ICON}</button>`;
      // hoisted card signals (slides render them; the share cards draw them)
      const rec = _windowRecovery(cs);
      const rt  = rec ? _recoveryTrend() : null;
      const dip = _topDipState();
      const bl  = _baselineBar(allCs, days);
      const _blNow  = ({'7':'this week','30':'this month','90':'these 90 days','all':'all time'})[activePeriod] || 'this window';
      const _blPrev = ({'7':'last week','30':'last month','90':'the 90 days before'})[activePeriod] || null;
      const wd  = _weekdayPattern(cs), dp = _daypartPattern(cs);
      const wdLeast = _weekdayPatternWorst(cs);
      const dpLeast = _daypartPatternWorst(cs);
      const trn = (Store.transitions ? Store.transitions() : null);
      const fl  = _safetyFlavors(cs);
      const ce  = _contextEffect();
      const pe  = ce ? _peWindowed() : null;
      const csl = _contextStateLink();
      // reader-on-top + filterable data (2026-07-23 refine): the daily reader line
      // becomes the personal-reflection entry; state chips filter the data rows.
      const _r=(FromJustin&&(FromJustin.daily?FromJustin.daily():(FromJustin.today?FromJustin.today():null)))||null;
      const _reflText=(_r&&_r.text)?escapeHtml(_r.text):'';
      // the filter must offer every state that actually has a row in this period, not just
      // the states that happen to dominate a daypart/weekday bucket (that undercounted —
      // a state could have rows and still never show as a filter chip). Canonical UI order.
      const _stateOrder=['safety','play','fightflight','stillness','freeze','shutdown'];
      const _present=_stateOrder.filter(s=>cs.some(x=>x.dom===s));
      const _chipsHTML=`<button type="button" class="you-chip plain on" data-f="all">All</button>`+_present.map(s=>`<button type="button" class="you-chip" data-f="${s}">${stateMarks(s)}<span>${STATE_LABEL(s)}</span></button>`).join('');
      c.innerHTML=`
        <div class="view play-view">
          <div class="filter-bar">
            ${visPer.length>1?`<div class="play-filter seg">${visPer.map(p=>`<button class="period-pill${activePeriod===p.key?' on':''}" data-period="${p.key}">${p.label}</button>`).join('')}</div>`:''}
            <button class="set-gear ci-add" id="add-ci" type="button" aria-label="New check-in" title="New check-in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>
            <button class="set-gear" id="set-btn" type="button" aria-label="Settings" title="Settings">${GEAR_SVG}</button>
          </div>

          <div class="carousel" id="carousel" role="region" aria-roledescription="carousel" aria-label="Your patterns: swipe or use the dots below">${(function(){
            // slides assemble dynamically, wins first. a safety DIP is never
            // animated or headlined here (it lives, gently worded, in the reader).
            const slides = [];
            slides.push(['safety','the level of safety in your system', `
              ${shareBtn('safety')}<h2 class="panel-title">The level of safety in your system</h2>
              <p class="panel-sub">The state you spend the most time in, over ${periodPhrase}.</p>
              ${_blCardHTML(bl, _blNow, _blPrev)}`]);
            if(rec){
              const from = dip || 'fightflight';
              // v2 (2026-07-29 redesign, final round: "a lot of info crammed into the
              // card... restrict it to one sentence"). One lead sentence carries the
              // whole claim (dip -> recover); the check-in count, trip count, and
              // trend all fold into one small parenthetical footnote below, same tier
              // as the shift card's fine print — so the two hero-glyph cards match.
              const fasterTail = (rt && rt.dir==='faster') ? `, and it's taking less time lately` : '';
              // the recovery-length clause is CUT (Justin 2026-08-01c: "the 'a check-in or
              // two each time' is meaningless, cut it and just stick to the 'x times over
              // the last x time period'"). Counting someone's recovery in check-ins measures
              // how often THEY happened to open the app, not how long they actually took —
              // so the number moved with their logging habit, not their nervous system. The
              // trip count and the period are both real, so those are what the line says now.
              // (The same phrase is still used in the reader essay, from-justin.js ~1019 —
              // that copy is Justin-owned, flagged to him, not changed here.)
              const tripCount = `<p class="cb-fine">(${rec.n} time${rec.n===1?'':'s'} over ${periodPhrase}${fasterTail})</p>`;
              // title cut (Justin 2026-07-29c: "not needed... prefer the images carry
              // the visual weight not the titles"). The slide's array label ('getting
              // back to safety') stays — still used for the carousel dots' aria-label
              // and window._youAll, just not printed as a visible <h2> anymore.
              slides.push(['comeback','getting back to safety', `
              ${shareBtn('comeback')}
              <div class="cb-journey">${cbGlyphViz(from, 'safety', null, 'hero')}</div>
              <p class="cb-line cb-line-lead">You commonly dip into <b>${STATE_NAME(from)}</b>, then recover into <b>safety</b>.</p>
              ${tripCount}`]);
            }
            // the separate "your safety baseline" slide is retired (§7.2): its longer-window
            // view is now just a wider choice on the time toggle above — one card, one metric.
            // split (Justin 2026-07-28): "your most regulated times" conflated a weekday
            // pattern and a time-of-day pattern into one card sharing a single (weekday-only)
            // visual — the daypart claim had no visual of its own. Two cards, each with its
            // own strip: weekdays keep the existing week-dot strip, daypart gets a matching
            // 4-segment strip using the same sun/moon glyphs already used elsewhere (segIco).
            // both strips below now read as a tiny bar chart, not a single highlight: every
            // cell that has enough check-ins gets sized + tinted by ITS OWN safety %, using
            // the same low→high safetyColor ramp as the day-by-day chart above (one color
            // language across cards, not a new palette). The winning cell keeps the heart
            // mark on top so the headline claim is still legible at a glance (Justin
            // 2026-07-28: "ask what each card is trying to express... use glyphs, bars,
            // icons within our color constraints").
            // v2 (2026-07-29, Claude Design's layout-hierarchy pass): real bar charts,
            // not dot strips — height = that day/daypart's safety %, color = that day/
            // daypart's own dominant state (identity), led by a big "it's ___" headline
            // instead of a subtitle sentence. Period phrase folds into the caption line
            // since the subtitle line is gone (still period-honest, just relocated).
            // headline restructure (2026-07-29b, Justin: subject-first phrasing, visual
            // weight and the card's safety color on the day/time name itself). The
            // winning bar is now forced to the safety color too — previously it took
            // whatever state happened to be that day's plurality vote, which could
            // (and did) disagree with the gold headline word right above it.
            if(wd){
              const wdPcts=[0,1,2,3,4,5,6].map(d=>{ const a=cs.filter(x=>new Date(x.t).getDay()===d); return a.length>=3?_safeShare(a):null; });
              const wdDom=[0,1,2,3,4,5,6].map(d=>{ const a=cs.filter(x=>new Date(x.t).getDay()===d); return a.length>=3?domOf(a):null; });
              const wdDelays = _staggerDelays(7, wd.idx);
              const chart = `<div class="rc-chart" aria-hidden="true">${['s','m','t','w','t','f','s'].map((lb,i)=>{
                const pct=wdPcts[i], dom=wdDom[i], best=i===wd.idx;
                const h=pct!=null?Math.max(12,Math.round(pct/100*80)):12;
                const bg=pct==null?'var(--bone-deep)':best?STATE_COLOR('safety'):mute(STATE_COLOR(dom));
                return `<div class="rc-col${best?' rc-col-best':''}" style="--sd:${wdDelays[i]}ms"><span class="rc-bar" style="height:${h}px;background:${bg}"></span><span class="rc-lb">${lb}</span></div>`;
              }).join('')}</div>`;
              // title cut (Justin 2026-07-29c): "your most regulated day" repeated the
              // rc-hero-title sentence right below it. Array label stays for a11y.
              slides.push(['times','your most regulated day', `
              ${shareBtn('times')}
              <p class="rc-hero-title"><b class="rc-hero-word" style="color:${STATE_COLOR('safety')}">${wd.label}</b> is your most regulated day.</p>
              ${chart}
              <p class="cb-line">${wd.pct}% of your <b>${wd.label}</b> check-ins have safety in them, over ${periodPhrase}.</p>`]);
            }
            if(dp){
              const segs=['morning','afternoon','evening','late'];
              const dpDom=segs.map(seg=>{ const a=cs.filter(x=>segOf(x.t)===seg); return a.length>=3?domOf(a):null; });
              const dpDelays = _staggerDelays(segs.length, segs.indexOf(dp.key));
              const chart = `<div class="rc-chart" aria-hidden="true">${segs.map((seg,i)=>{
                const pct=_daypartPct(cs,seg), dom=dpDom[i], best=seg===dp.key;
                const h=pct!=null?Math.max(12,Math.round(pct/100*80)):12;
                const bg=pct==null?'var(--bone-deep)':best?STATE_COLOR('safety'):mute(STATE_COLOR(dom));
                return `<div class="rc-col${best?' rc-col-best':''}" style="--sd:${dpDelays[i]}ms"><span class="rc-bar" style="height:${h}px;background:${bg}"></span><span class="rc-lb">${segIco(seg)}</span></div>`;
              }).join('')}</div>`;
              slides.push(['daypart','your most regulated time of day', `
              ${shareBtn('daypart')}
              <p class="rc-hero-title"><b class="rc-hero-word" style="color:${STATE_COLOR('safety')}">${CAP(dp.seg)}</b> is your most regulated time of day.</p>
              ${chart}
              <p class="cb-line">${dp.pct}% of your <b>${dp.seg}</b> check-ins have safety in them, over ${periodPhrase}.</p>`]);
            }
            // "least regulated day" (Justin 2026-07-29d: "same style we have as the most
            // regulated one"). Same rc-chart bar structure as 'times' above, but there's no
            // single "bad" state the way safety is the one "good" state — so the headline
            // word and winning bar use THAT day's own dominant state color, not a fixed one.
            // Skipped when it'd just repeat the most-regulated-day card (same day, or no
            // most-regulated-day card to contrast against).
            if(wdLeast && (!wd || wdLeast.idx!==wd.idx)){
              const wlPcts=[0,1,2,3,4,5,6].map(d=>{ const a=cs.filter(x=>new Date(x.t).getDay()===d); return a.length>=3?_safeShare(a):null; });
              const wlDom=[0,1,2,3,4,5,6].map(d=>{ const a=cs.filter(x=>new Date(x.t).getDay()===d); return a.length>=3?domOf(a):null; });
              const worstDom = wlDom[wdLeast.idx];
              const worstColor = worstDom ? STATE_COLOR(worstDom) : '#D8D2C2';
              const wlDelays = _staggerDelays(7, wdLeast.idx);
              const chart = `<div class="rc-chart" aria-hidden="true">${['s','m','t','w','t','f','s'].map((lb,i)=>{
                const pct=wlPcts[i], dom=wlDom[i], best=i===wdLeast.idx;
                const h=pct!=null?Math.max(12,Math.round(pct/100*80)):12;
                const bg=pct==null?'var(--bone-deep)':best?worstColor:mute(STATE_COLOR(dom));
                return `<div class="rc-col${best?' rc-col-best':''}" style="--sd:${wlDelays[i]}ms"><span class="rc-bar" style="height:${h}px;background:${bg}"></span><span class="rc-lb">${lb}</span></div>`;
              }).join('')}</div>`;
              slides.push(['leastDay','your least regulated day', `
              ${shareBtn('leastDay')}
              <p class="rc-hero-title"><b class="rc-hero-word" style="color:${worstColor}">${wdLeast.label}</b> has the least regulation.</p>
              ${chart}
              <p class="cb-line">${wdLeast.pct}% of your <b>${wdLeast.label}</b> check-ins have safety in them, over ${periodPhrase}.</p>`]);
            }
            // "least regulated time of day" (Justin 2026-07-29e: "do a least regulated time
            // of day as well"). Mirrors 'daypart' the same way 'leastDay' mirrors 'times' —
            // same rc-chart/segIco structure, headline + winning bar use that daypart's own
            // dominant state color (no single "bad" state to anchor on). Skipped when it'd
            // just repeat the most-regulated-time-of-day card.
            if(dpLeast && (!dp || dpLeast.key!==dp.key)){
              const segs=['morning','afternoon','evening','late'];
              const dlDom=segs.map(seg=>{ const a=cs.filter(x=>segOf(x.t)===seg); return a.length>=3?domOf(a):null; });
              const worstSegIdx=segs.indexOf(dpLeast.key);
              const worstDpDom = dlDom[worstSegIdx];
              const worstDpColor = worstDpDom ? STATE_COLOR(worstDpDom) : '#D8D2C2';
              const dlDelays = _staggerDelays(segs.length, worstSegIdx);
              const chart = `<div class="rc-chart" aria-hidden="true">${segs.map((seg,i)=>{
                const pct=_daypartPct(cs,seg), dom=dlDom[i], best=seg===dpLeast.key;
                const h=pct!=null?Math.max(12,Math.round(pct/100*80)):12;
                const bg=pct==null?'var(--bone-deep)':best?worstDpColor:mute(STATE_COLOR(dom));
                return `<div class="rc-col${best?' rc-col-best':''}" style="--sd:${dlDelays[i]}ms"><span class="rc-bar" style="height:${h}px;background:${bg}"></span><span class="rc-lb">${segIco(seg)}</span></div>`;
              }).join('')}</div>`;
              slides.push(['leastDaypart','your least regulated time of day', `
              ${shareBtn('leastDaypart')}
              <p class="rc-hero-title"><b class="rc-hero-word" style="color:${worstDpColor}">${CAP(dpLeast.seg)}</b> has the least regulation.</p>
              ${chart}
              <p class="cb-line">${dpLeast.pct}% of your <b>${dpLeast.seg}</b> check-ins have safety in them, over ${periodPhrase}.</p>`]);
            }
            if(trn){
              const nm = k => ({play:'regulated mobility',stillness:'regulated immobility'}[k])||STATE_NAME(k);
              // hero treatment (2026-07-29 redesign: "needs the same treatment as
              // 'getting back to safety'") — same cb-journey hero glyphs + one lead
              // sentence + small parenthetical footnote, title cut.
              slides.push(['shift','your most common shift', `
              ${shareBtn('shift')}
              <div class="cb-journey">${cbGlyphViz(trn.a, trn.b, null, 'hero')}</div>
              <p class="cb-line cb-line-lead">Your state most often shifts from <b>${nm(trn.a)}</b> to <b>${nm(trn.b)}</b>.</p>
              <p class="cb-fine">(${trn.count} time${trn.count===1?'':'s'} so far)</p>`]);
            }
            // "your records" card CUT ENTIRELY (Justin 2026-07-29: "it's useless").
            slides.push(['mix','your state mix', `
              ${shareBtn('mix')}<h2 class="panel-title">Your state mix</h2>
              <p class="panel-sub">${activePeriod==='all'?'Your state averages, all time.':'Your check-in averages, over '+periodPhrase+'.'}</p>
              <div class="dist-bars">${mixHTML}</div>`]);
            if(fl){
              slides.push(['flavors','your flavors of safety', `
              ${shareBtn('flavors')}<h2 class="panel-title">Your flavors of safety</h2>
              <p class="panel-sub">This is what your safety looks like over ${periodPhrase}.</p>
              <div class="help-bars">${fl.map((r,i)=>`<div class="help-row" style="--sd:${i*50}ms"><span class="help-lbl">${stateMarks(r.key)}${r.label}</span><span class="help-track"><span class="help-fill" style="width:${Math.max(r.pct,3)}%;background:${STATE_COLOR(r.key)}"></span></span><span class="help-pct">${r.pct}%</span></div>`).join('')}</div>`]);
            }
            if(ce || csl){
              const bars = ce ? `
              <p class="panel-sub">safety in the weeks you tagged “${escapeHtml(ce.label)}”, next to a typical week.</p>
              <div class="help-bars">
                <div class="help-row" style="--sd:0ms"><span class="help-lbl">Tagged weeks</span><span class="help-track"><span class="help-fill" style="width:${ce.tagPct}%;background:var(--s-safety)"></span></span><span class="help-pct">${ce.tagPct}%</span></div>
                <div class="help-row" style="--sd:50ms"><span class="help-lbl">Typical week</span><span class="help-track"><span class="help-fill" style="width:${ce.typPct}%;background:var(--hairline)"></span></span><span class="help-pct">${ce.typPct}%</span></div>
              </div>` : `<p class="panel-sub">What you tag as having the biggest impact, by the state you were in.</p>`;
              const links = csl ? `
              ${csl.safe?`<p class="cb-line"${ce?' style="margin-top:16px"':''}>Tagged most around your safe check-ins: <b>${escapeHtml(csl.safe.label)}</b>.</p>`:''}
              ${csl.def?`<p class="cb-line">Tagged most around defense: <b>${escapeHtml(csl.def.label)}</b>.</p>`:''}` : '';
              slides.push(['context','your top context', `
              ${shareBtn('context')}<h2 class="panel-title">Your top context</h2>
              ${bars}${links}
              ${pe?`<p class="ctx-practice">Practice, for the record: check-ins within a few hours of practicing show more safety about ${Math.round(pe.rate*20)*5}% of the time.</p>`:''}`]);
            }
            // the day-by-day line-chart version of "your safety changes" is CUT
            // (Justin 2026-07-29d: "we don't need it. cut it altogether. ugly anyway.")
            // — the dot-track version below is the only "your safety changes" now, so
            // the title collision flagged on 2026-07-28/29 is moot. `dayByDay` (built
            // above, shared nowhere else) is now dead — left computed rather than
            // restructuring the shared arcBuckets block that 'states' below still uses.
            if(growthHead){
              slides.push(['started','your safety changes', `
              ${shareBtn('started')}${growthHead}`]);
            }
            if(arcBuckets){
              slides.push(['states','your states over time', `
              ${shareBtn('states')}<h2 class="panel-title">Your states over time</h2>
              <p class="panel-sub">The state each stretch of time leaned toward.</p>
              <div class="chart-wrap" data-cmode="states">${chartInner('states', arcBuckets, safetyColor)}</div>`]);
            }
            if(practiceHead){
              slides.push(['practice','Is practice helping?', `
              ${shareBtn('practice')}${practiceHead}`]);
            }
            // axis cards, v2 (2026-07-29 redesign, final: "make these into separate
            // cards... i'd rather see these as cards with immediate info and
            // shareability"). The old 2-card "most mobilized/immobilized time of
            // day" + blended flavor chips are retired in favor of 5 minimal solo-
            // state cards (play, flight/fight, stillness, shutdown, freeze), each
            // with its OWN real per-daypart share and its own bar chart — same
            // rc-hero-word pattern as times/daypart, same mute()-dulled losing bars.
            // A more in-depth cross-referencing/filtering system is a future pass
            // (Justin: "we can create that another time").
            const _AX_SEGS = ['morning','afternoon','evening','late'];
            const _axSoloPattern = (key) => {
              let best=-1, bestPct=-1, bestN=0;
              const pcts = _AX_SEGS.map((sg,i)=>{
                const sub=cs.filter(x=>segOf(x.t)===sg);
                if(sub.length<4) return null;
                const hits=sub.filter(x=>x.dom===key).length;
                const pct=Math.round(hits/sub.length*100);
                if(hits>=3 && pct>bestPct){ bestPct=pct; best=i; bestN=hits; }
                return pct;
              });
              if(best<0) return null;
              return { pcts, best, pct:pcts[best], n:bestN };
            };
            const _AX_ADJ = { play:'playful', fightflight:'flight/fight', stillness:'still', shutdown:'shutdown', freeze:'frozen' };
            const _axSoloSlide = (key) => {
              const pat = _axSoloPattern(key);
              if(!pat) return;
              const color = STATE_COLOR(key), glyph = stateMarks(key), adj = _AX_ADJ[key] || key;
              const segName = segLabel(_AX_SEGS[pat.best]);
              const axDelays = _staggerDelays(_AX_SEGS.length, pat.best);
              const chart = `<div class="rc-chart ax-solo-chart" aria-hidden="true">${_AX_SEGS.map((sg,i)=>{
                const pct=pat.pcts[i], isBest=i===pat.best;
                const h=pct!=null?Math.max(12,Math.round(pct/100*80)):12;
                const bg = pct==null?'var(--bone-deep)':isBest?color:mute(color);
                const val = isBest ? `<span class="rc-val">${glyph}${pct}%</span>` : '';
                return `<div class="rc-col${isBest?' rc-col-best':''}" style="--sd:${axDelays[i]}ms">${val}<span class="rc-bar" style="height:${h}px;background:${bg}"></span><span class="rc-lb">${segIco(sg)}</span></div>`;
              }).join('')}</div>`;
              slides.push(['ax-'+key, segName+' is your most '+adj+' time of day', `
              ${shareBtn('ax-'+key)}
              <p class="rc-hero-title"><b class="rc-hero-word" style="color:${color}">${CAP(segName)}</b> is your most <b>${adj}</b> time of day.</p>
              ${chart}`]);
            };
            ['play','fightflight','stillness','shutdown','freeze'].forEach(_axSoloSlide);
            // capacity-aware carousel (2026-07-05): AT MOST 4 cards, chosen for
            // what the data supports and what the person has room for right now.
            // when recent check-ins lean defensive, the cards that say "dips end"
            // lead (comeback, regulated times, records, practice) and the
            // percentage hero steps back — same honest data, kinder sequence.
            // when steady or rising, the safety story leads as before.
            const _recent = allCs.slice(-6);
            const _defN = _recent.filter(x=>x.dom && x.dom!=='neutral' && !_REGDOMS[x.dom]).length;   // stored filter kept until A4 derives this helper (Ruling 2)
            const _tender = _recent.length>=3 && (_defN/_recent.length)>=0.5;
            const _ORDER = _tender
              ? ['comeback','times','daypart','leastDay','leastDaypart','practice','flavors','baseline','mix','context','started','states','shift','safety']
              : ['safety','comeback','started','baseline','times','daypart','leastDay','leastDaypart','shift','mix','flavors','context','states','practice'];
            const _rank = k=>{ const i=_ORDER.indexOf(k); return i<0?99:i; };
            const sorted = slides.slice().sort((a,b)=>_rank(a[0])-_rank(b[0]));
            // desktop ledger (2026-07-19): at wide the carousel stays empty and a
            // one-card-at-a-time ledger is built after render — ALL cards listed,
            // one shown, so the capacity-aware pacing survives the big screen.
            window._youAll = sorted;
            const _wide = window.matchMedia && matchMedia('(min-width:1120px)').matches;
            const picked = sorted.slice(0,4);
            window._youSlides = _wide ? [] : picked.map(s=>s[1]);
            if(_wide) return '';
            return picked.map((s,i)=>`<section class="panel" role="group" aria-roledescription="slide" aria-label="${CAP(s[1])}, card ${i+1} of ${picked.length}">${s[2]}</section>`).join('');
          })()}</div>

          <div class="dots" id="dots">${(window._youSlides||[]).map((lb,i)=>`<button type="button" class="dot-i${i===0?' on':''}" data-panel="${i}" aria-label="${CAP(lb)}"></button>`).join('')}</div>

          <a class="you-reader" id="you-reader" href="#">
            <h3 class="yr-h">Your Reflection</h3>
            <p class="yr-lede">${_reflText || 'The personal read of your patterns, in plain language.'}</p>
            <span class="yr-go"><span class="yr-glyph">${triGlyph((_r&&_r.state)||topState||'safety')}</span><span class="yr-txt">Read your full reflection</span><span class="yr-arw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></span>
          </a>

          <div class="you-filter" id="you-filter"><div class="you-chips">${_chipsHTML}</div></div>

          <div class="deep">
            <div class="deep-block">
              <h3 class="deep-h">Time of day</h3>
              ${['morning','afternoon','evening','late'].map(seg=>{ const sub=cs.filter(x=>segOf(x.t)===seg); const k=domOf(sub); const pct=_daypartPct(cs,seg); return `<div class="deep-row" data-state="${k||''}"><span class="deep-lbl">${segIco(seg)}${CAP(segLabel(seg))}</span><span class="deep-val">${pct!=null?`<span class="deep-pct">${pct}%</span>`:''}${k?`<span class="deep-tap" data-state-detail="${k}" style="cursor:pointer">${stateMarks(k)}</span>`:'<span class="deep-none">\u00b7</span>'}</span></div>`; }).join('')}
            </div>
            <div class="deep-block">
              <h3 class="deep-h">Day by day</h3>
              ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((nm,d)=>{ const sub=cs.filter(x=>new Date(x.t).getDay()===d); const k=sub.length>=3?domOf(sub):null; const pct=sub.length>=3?_safeShare(sub):null; return `<div class="deep-row" data-state="${k||''}"><span class="deep-lbl">${nm}</span><span class="deep-val">${pct!=null?`<span class="deep-pct">${pct}%</span>`:''}${k?`<span class="deep-tap" data-state-detail="${k}" style="cursor:pointer">${stateMarks(k)}</span>`:'<span class="deep-none">\u00b7</span>'}</span></div>`; }).join('')}
              <p class="deep-foot">% = check-ins where a safe state leads.</p>
            </div>
            <div class="deep-block">
              <h3 class="deep-h">Your numbers</h3>
              <div class="deep-row"><span class="deep-lbl">Days tracked</span><span class="deep-val">${Store.tenure?Store.tenure().days:'\u2014'}</span></div>
              <div class="deep-row"><span class="deep-lbl">Check-ins</span><span class="deep-val">${allCs.length}</span></div>
              ${(function(){const n=Store.sessions().filter(s=>s&&s.completed).length;return n?`<div class="deep-row"><span class="deep-lbl">Practices completed</span><span class="deep-val">${n}</span></div>`:'';})()}
              ${rec?`<div class="deep-row"><span class="deep-lbl">Comebacks made</span><span class="deep-val">${rec.n}</span></div>`:''}
            </div>
            <div class="deep-block">
              <h3 class="deep-h">How you practice</h3>
              ${(function(){const L=Store.learned();let h='';if(L.favPractice)h+=`<div class="deep-row"><span class="deep-lbl">You return to</span><span class="deep-val">${CAP(Store.practiceLabel(L.favPractice))}</span></div>`;if(L.favSense)h+=`<div class="deep-row"><span class="deep-lbl">Anchored through</span><span class="deep-val">${CAP(L.favSense)}</span></div>`;return h;})()}
              ${(function(){const ss=Store.sessions().filter(s=>s&&s.completed);if(!ss.length)return '';const mins=Math.round(ss.reduce((s,x)=>s+(x.minutes||0),0));return mins?`<div class="deep-row"><span class="deep-lbl">Time in practice</span><span class="deep-val">${mins>=90?Math.round(mins/60*10)/10+' hours':mins+' minutes'}</span></div>`:'';})()}
              ${(function(){if(!Store.practiceInsights)return '';const a=Store.practiceInsights();if(!a||!a.length)return '';const s=a[0].seg;return `<div class="deep-row"><span class="deep-lbl">Best time for it</span><span class="deep-val">${s==='late'?'Late at night':CAP(segLabel(s))}</span></div>`;})()}
            </div>
          </div>
          <button class="change-link" id="change-ci" type="button">Change a recent check-in</button>
          ${Store.sessions().length ? '<button class="change-link" id="manage-pr" type="button">Manage your practices</button>' : ''}
        </div>`;

      // ---- desktop ledger (2026-07-19): wide screens get the pattern cards as a
      // quiet list + ONE card at a time (master-detail) instead of a swipe
      // carousel. Runs BEFORE the shared bindings below so the injected card's
      // taps/links bind exactly like carousel content. Compact is untouched.
      if(window.matchMedia && matchMedia('(min-width:1120px)').matches && window._youAll && window._youAll.length){
        const cvEl=$('#carousel'), dtEl=$('#dots');
        if(cvEl){
          const all=window._youAll;
          let key=window._youLedgerKey; if(!all.some(s=>s[0]===key)) key=all[0][0];
          window._youLedgerKey=key;
          const _I={
            safety:'<span class="yl-ic tri"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.4-7 10-7 10z"/></svg><svg viewBox="0 0 24 24"><path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z"/></svg><svg viewBox="0 0 24 24"><path d="M7 7c3 2 7 8 10 10M17 7c-3 2-7 8-10 10M7 7 5.5 5.5M17 7l1.5-1.5M7 17l-1.5 1.5M17 17l1.5 1.5"/></svg></span>',
            comeback:'<span class="yl-ic"><svg viewBox="0 0 24 24"><path d="M9.5 21s-5.5-3.6-5.5-7.8A3.2 3.2 0 019.5 11a3.2 3.2 0 015.5 2.2c0 4.2-5.5 7.8-5.5 7.8z"/><path d="M20 3.5c.6 4.2-1.6 7.6-4.8 9.6"/><path d="M15.8 9.7l-.6 3.4 3.4-.5"/></svg></span>',
            mix:'<span class="yl-ic"><svg viewBox="0 0 24 24" style="stroke-width:3"><path d="M12 4a8 8 0 016.9 4" stroke="'+STATE_COLOR('safety')+'"/><path d="M18.9 16a8 8 0 01-13.8 0" stroke="'+STATE_COLOR('fightflight')+'"/><path d="M5.1 8A8 8 0 0112 4" stroke="'+STATE_COLOR('shutdown')+'"/></svg></span>',
            times:'<span class="yl-ic"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.4-7 10-7 10z"/></svg></span>',
            // mobilized/immobilized (2 combined cards) retired for 5 solo-state axis
            // cards (2026-07-29 redesign) — same two stand-in glyphs reused per card
            // since a bespoke icon per state wasn't part of this round's redesign.
            'ax-play':'<span class="yl-ic"><svg viewBox="0 0 24 24"><path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z"/></svg></span>',
            'ax-fightflight':'<span class="yl-ic"><svg viewBox="0 0 24 24"><path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z"/></svg></span>',
            'ax-stillness':'<span class="yl-ic"><svg viewBox="0 0 24 24"><path d="M7 7c3 2 7 8 10 10M17 7c-3 2-7 8-10 10M7 7 5.5 5.5M17 7l1.5-1.5M7 17l-1.5 1.5M17 17l1.5 1.5"/></svg></span>',
            'ax-shutdown':'<span class="yl-ic"><svg viewBox="0 0 24 24"><path d="M7 7c3 2 7 8 10 10M17 7c-3 2-7 8-10 10M7 7 5.5 5.5M17 7l1.5-1.5M7 17l-1.5 1.5M17 17l1.5 1.5"/></svg></span>',
            'ax-freeze':'<span class="yl-ic"><svg viewBox="0 0 24 24"><path d="M7 7c3 2 7 8 10 10M17 7c-3 2-7 8-10 10M7 7 5.5 5.5M17 7l1.5-1.5M7 17l-1.5 1.5M17 17l1.5 1.5"/></svg></span>'
            // 'records' icon entry removed — the card is cut (2026-07-29: "it's useless").
          };
          const cur=all.find(s=>s[0]===key);
          const wrap=document.createElement('div'); wrap.className='you-ledger';
          // heading approved verbatim (Justin, 2026-07-19) — no sub: the period
          // pills above already say the window, the list already invites choice.
          wrap.innerHTML='<h2 class="yl-h">What your check-ins show.</h2>'
            +'<nav class="yl-list" aria-label="what your check-ins show">'
            +all.map(s=>'<button type="button" class="yl-item'+(s[0]===key?' on':'')+'" data-led="'+s[0]+'">'+(_I[s[0]]||'<span class="yl-ic"><span class="yl-dot"></span></span>')+'<span class="yl-nm">'+CAP(s[1])+'</span></button>').join('')
            +'</nav>'
            +'<section class="panel yl-detail" role="group" aria-label="'+cur[1]+'">'+cur[2]+'</section>';
          cvEl.style.display='none'; if(dtEl) dtEl.style.display='none';
          cvEl.parentNode.insertBefore(wrap, cvEl);
          // the desktop ledger shows exactly one card at a time (not a swipe
          // carousel), so it's always the thing on screen the instant it's built —
          // no need to wait for an IntersectionObserver, just trigger its entrance
          // animation (gated behind `.panel-in`, see app.css) immediately.
          const _ylPanel = wrap.querySelector('.yl-detail'); if(_ylPanel) _ylPanel.classList.add('panel-in');
          // desktop top-alignment: lift the week/all toggle to the row just under the
          // heading, so "What your check-ins show." tops the screen on the same line
          // as the rail's first word (Justin 2026-07-20). Compact carousel untouched.
          const _fb = c.querySelector('.filter-bar'), _ylh = wrap.querySelector('.yl-h');
          if(_fb && _ylh) _ylh.after(_fb);
          wrap.querySelectorAll('.yl-item').forEach(b=>b.onclick=()=>{ window._youLedgerKey=b.dataset.led; render(); });
        }
      }
      if(!window._youMqlBound){
        window._youMqlBound=true;
        try{ matchMedia('(min-width:1120px)').addEventListener('change',()=>{ try{ if(currentTab==='current') app('current'); }catch(e){} }); }catch(e){}
      }

      function stopPlay(){ if(playTimer){ clearInterval(playTimer); playTimer=null; } const p=$('#ot-play'); if(p) p.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 Z"/></svg>'; }

      // panels peek (see CSS): one snap unit = a panel's width + the 14px gap
      const snapUnit = (cv)=>{ const p=cv&&cv.firstElementChild; return p ? p.offsetWidth+14 : (cv?cv.clientWidth:1)||1; };
      c.querySelectorAll('.period-pill').forEach(b=>b.addEventListener('click',()=>{ stopPlay(); const cv=$('#carousel'); const sl=cv?cv.scrollLeft:0; activePeriod=b.dataset.period; render(); const nv=$('#carousel'); if(nv){ nv.scrollLeft=sl; const _dd=c.querySelectorAll('#dots .dot-i'); const i=Math.max(0,Math.min(_dd.length-1,Math.round(sl/snapUnit(nv)))); _dd.forEach((d,j)=>d.classList.toggle('on',j===i)); } }));
      const setBtn=$('#set-btn'); if(setBtn) setBtn.onclick=screenSettings;
      const chgBtn=$('#change-ci'); if(chgBtn) chgBtn.onclick=screenChangeCheckin;
      const mpBtn=$('#manage-pr'); if(mpBtn) mpBtn.onclick=screenManagePractices;
      const addBtn=$('#add-ci'); if(addBtn) addBtn.onclick=screenCheckin;
      // reader-on-top entry → the full personal reflection (paid deep reader)
      const yrd=$('#you-reader'); if(yrd) yrd.onclick=(e)=>{ e.preventDefault(); screenReflectionDeep(); };
      // state chips filter the data rows (dim non-matching); range change re-renders and resets to all
      (function(){ const fb=c.querySelector('#you-filter'); if(!fb) return; const chips=fb.querySelectorAll('.you-chip'); const rows=c.querySelectorAll('.deep-row[data-state]'); chips.forEach(ch=>ch.addEventListener('click',()=>{ const f=ch.dataset.f; chips.forEach(x=>x.classList.toggle('on',x===ch)); rows.forEach(r=>{ const ds=r.getAttribute('data-state'); r.classList.toggle('dim', f!=='all' && ds!==f); }); })); })();
      // SHARE_TXT is GONE, and so is SHARE_VIZ (2026-08-01). Both were parallel decks that
      // had to be kept in step with the cards by hand, and both had drifted: SHARE_VIZ still
      // drew the 'times' card's RETIRED dot strip long after it became a bar chart, and
      // SHARE_TXT wrote its own sentence for a card whose own words say it better. The
      // picture is the card now, rewritten to the first person (_toFirstPerson), and the
      // no-file-sharing fallback quotes those same words rather than a third version.
      c.querySelectorAll('.panel-share').forEach(b=>b.addEventListener('click',(e)=>{ e.stopPropagation();
        openShare(null, b.closest('.panel')); }));
      c.querySelectorAll('.distrow').forEach(b=>b.addEventListener('click',()=>screenStateDetail(b.dataset.stateDetail)));
      c.querySelectorAll('.deep-tap').forEach(b=>b.addEventListener('click',()=>screenStateDetail(b.dataset.stateDetail)));

      const carousel=$('#carousel'); const dots=c.querySelectorAll('#dots .dot-i');
      if(carousel){ carousel.addEventListener('scroll',()=>{ const i=Math.max(0,Math.min(dots.length-1,Math.round(carousel.scrollLeft/snapUnit(carousel)))); dots.forEach((d,j)=>d.classList.toggle('on',j===i)); },{passive:true}); }
      // the dots are real controls: tap one to go to that card (keyboard/switch reachable too)
      dots.forEach((d,j)=>d.addEventListener('click',()=>{ if(!carousel) return;
        const calm=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion:reduce)').matches;
        carousel.scrollTo({left:j*snapUnit(carousel), behavior:calm?'auto':'smooth'});
      }));
      // each card's entrance animation (bars, hero glyphs, chart draw-in) used to
      // fire unconditionally the moment this innerHTML was set — in the mobile
      // swipe carousel only the FIRST card was ever actually on screen when that
      // happened, so every other card had already finished its animation, fully
      // static, by the time you swiped to it (Justin 2026-07-31: "only the first
      // one is seen"). Trigger each card's `.panel-in` (which the CSS gates all
      // of that entrance work behind — see app.css) when it actually scrolls into
      // view instead, same convention as the reader's `.read-anim`/`.sec-in`:
      // content is always visible even if this fails, it just won't animate.
      try{
        if(carousel){
          const _calmCv = matchMedia('(prefers-reduced-motion:reduce)').matches || document.body.classList.contains('reduce-motion');
          const _panels = carousel.querySelectorAll('.panel');
          if(!_calmCv && 'IntersectionObserver' in window){
            const _pio = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('panel-in'); _pio.unobserve(e.target); } }), { root:carousel, threshold:0.55 });
            _panels.forEach(p=>_pio.observe(p));
          } else {
            _panels.forEach(p=>p.classList.add('panel-in'));
          }
        }
      }catch(e){}

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
    play:        { headline:'play/motivation', sub:'Regulated mobilization', color:'#E8A871', about:"Play is safety and energy at the same time, the social, mobilized kind shared with people you trust. On your own, the same drive shows up as motivation. It's the same fuel as flight/fight, with safety mixed in, so it runs as creativity and drive instead of defense.", whenDrops:"If the safety thins and the energy stays, watch for the tip toward flight/fight. Keep a little safety in the mix, slow down enough to feel it, and aim the energy at one thing that matters.", practice:{practiceKey:'anchoring',sense:'touch',silence:8} },
    stillness:   { headline:'stillness/intimacy', sub:'Regulated immobilization', color:'#9FC498', about:"Stillness is the body slowed and quiet, without fear. The same powering-down as shutdown, but with safety mixed in, so it restores instead of collapses. On your own it's stillness; shared with someone safe, it's intimacy. A deeply regulated state.", whenDrops:"If the quiet starts to feel flat or heavy or scared instead of restful, that's the cue to add a small bit of safety, not to force yourself up and out.", practice:{practiceKey:'anchoring',sense:'sound',silence:8} },
    freeze:      { headline:'freeze',         color:'#B89AC4', about:"Freeze is a mixed state, flight/fight energy held down by shutdown. Gas and brake at once. It isn't a deeper shutdown, it's both pedals down, which is why it can feel panicked and paralyzed at the same time. A braced, protective state, not nothing.", whenDrops:"The smallest movement, plus a cue of safety. Let your eyes go where they want, then wiggle your toes or roll your wrists, slow. Don't force it, that adds gas to a slammed brake. Get smaller and safer.", practice:{practiceKey:'anchoring',sense:'touch',silence:10} },   // spectrum fix 2026-07-03: freeze starts at safety, never pendulation
  };

  function screenStateDetail(key){
    const d = STATE_DETAIL[key] || STATE_DETAIL.safety;
    clearFigures(); document.body.classList.remove('in-practice');
    root.innerHTML = `
      <header class="appbar"><button class="backbtn" id="sd-back">Back</button></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','now')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#sd-back').onclick = ()=>app('current');
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    $('#content').innerHTML = `<div class="view read sd-view">
        <div class="scr-head sd-head">
          <span class="sd-marks">${triGlyph(key)}</span>
          <h2 class="scr-h">${escapeHtml(CAP(d.headline))}</h2>
        </div>
        ${d.sub ? `<p class="sd-sub" style="font-size:calc(13px * var(--type-scale));opacity:.55;margin:-2px 0 14px;letter-spacing:.02em">${escapeHtml(d.sub)}</p>` : ''}
        <p class="sd-body">${escapeHtml(d.about)}</p>
        ${d.whenDrops ? `<div class="sd-when">
          <p class="sd-when-label">When safety drops</p>
          <p class="sd-body">${escapeHtml(d.whenDrops)}</p>
        </div>` : ''}
      </div>`;
  }

  // ---------------------------------------------------------------- PRACTICE
  // The player (player.html) is embedded full-bleed with no top chrome — the bottom
  // tab bar is the only navigation, and it hides once a session is playing. The
  // practice tab opens the player's own 4-option chooser (incl. "More meditations").
  // Practice pairing (2026-08-07). Every practice gets an id BEFORE it starts, so the
  // check-in that drove it can be stamped as that practice's 'before' read. The 'after'
  // and the ~3h 'followup' reads are then tagged automatically in Store.addCheckin.
  // Both shells (tabbar + guest) funnel through here — it is the one place a practice begins.
  function beginPractice(reco){
    const r = reco || (Store.recommend && Store.recommend()) || null;
    try{
      if(r && Store.newSessionId){
        r.sessionId = Store.newSessionId();
        // the ref is taken from the reco as launched; an in-player skill change can make it
        // slightly coarser than the session's own skill, which is why session_id, not this,
        // is what the pairing actually joins on.
        r.practiceRef = Store.practiceRefOf ? Store.practiceRefOf(r) : null;
        Store.markPracticeBefore(r.sessionId, r.practiceRef);
      }
    }catch(e){}
    return r;
  }
  function practiceShell(src, reco){
    haptic('start');               // soft tap as the practice begins (Begin tap = user gesture)
    currentTab = 'practice';
    setHTML(`
      <div class="weaver-wrap">
        <div class="weaver-loading" id="weaver-loading" aria-live="polite"><span class="wl-ring" aria-hidden="true"></span><span class="wl-txt">Preparing your practice</span></div>
        <iframe class="weaver-frame" id="weaver" src="${src}" title="guided practice" allow="autoplay; screen-wake-lock"></iframe>
      </div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','now')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`);
    // quiet placeholder until the player document has loaded (it then shows its
    // own "preparing your audio" line) — never a blank screen after "begin".
    // N-5: if it hasn't loaded after ~10s, say so instead of waiting forever.
    const _wf=$('#weaver'), _wl=$('#weaver-loading');
    let _wlDone=false;
    const _wlTimeout=setTimeout(()=>{
      if(_wlDone||!_wl) return;
      _wl.innerHTML='<span class="wl-txt">Can’t load the practice right now. Check your connection and try again.</span><button class="set-quiet actionbar-aux" id="wl-back" style="margin-top:14px">Back</button>';
      const b=document.getElementById('wl-back'); if(b) b.onclick=()=>app('practice');
    }, 10000);
    if(_wf&&_wl) _wf.addEventListener('load',()=>{ _wlDone=true; clearTimeout(_wlTimeout); _wl.classList.add('gone'); setTimeout(()=>{ try{_wl.remove();}catch(e){} },600); });
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    window._pendingReco = beginPractice(reco);   // so a completed session still shows the “you came back” screen
  }
  // ---------------------------------------------------------------- PRACTICE CHOOSER DATA
  const P_OPTS=[
    {key:'micro',      title:'A tiny practice',          sub:'About two minutes, one sense, done'},
    {key:'mindfulness',title:'Simple mindfulness',       sub:'The gentlest, a calm place to start'},
    {key:'anchoring',  title:'Connect with safety',      sub:'Settling in through your senses'},
    {key:'most',       title:'Practice self-regulation', sub:'The deepest, meeting what is hard'},
    {key:'more',       title:'More practices',           sub:'Standalone guided practices'},
  ];
  const P_SENSES=['touch','sound','sight','movement','imagination'];
  const P_SKILLS=[['validate','validate & normalize'],['imagery','imagery & invitation'],['obstacles','obstacles'],['balancing','balancing'],['pendulation','pendulation']];
  const P_SILENCE=[[4,'a little'],[8,'some'],[12,'a lot']];
  const P_MEDS=[
    {id:'uye',                 title:'Use your ears',       est:'~10 min', sub:'Grounding through sound'},
    {id:'eye',                 title:'Use your eyes',       est:'~9 min',  sub:'Grounding through sight'},
    {id:'daily-dysregulation', title:'Daily dysregulation', est:'~16 min', sub:'Meeting a recent activation'},
    {id:'outside-the-cave',    title:'Outside the cave',    est:'~32 min', sub:'A deeper imagery journey'},
  ];
  let pState=null;
  // set by a caller that wants the NEXT tabPractice() to seed pState from a specific
  // shape (e.g. "change this practice" preloading the practice being changed) instead
  // of tabPractice()'s own from-scratch defaults. Consumed once, then cleared
  // (Justin 2026-07-28: "make my own" starts from scratch, "change this practice"
  // preloads — they'd collapsed into the same always-preloaded behavior).
  let _pendingPState=null;

  // ---------------------------------------------------------------- 7b MAKER DATA
  // The four shapeable practices (they take dials). Everything else in the type
  // picker — the standalone sessions and "surprise me" — has no dials, so picking
  // one collapses the rest of the sentence.
  const MK_SHAPED = ['micro','mindfulness','anchoring','most'];
  // the pill (in-sentence) label for each type — kept short so the sentence reads
  // naturally ("a safety practice", not "a connect with safety practice").
  const MK_TYPE_PILL = { micro:'tiny', mindfulness:'mindfulness', anchoring:'safety', most:'self-regulation', surprise:'surprise' };
  const mkIsSession = (k)=> P_MEDS.some(m=>m.id===k);
  const mkPill = (k)=> MK_TYPE_PILL[k] || (P_MEDS.find(m=>m.id===k)||{}).title || k;
  // full (menu) label for each type. The type picker shows the NAME only — no
  // descriptions (Justin 2026-07-25: "just leave the practice names, like
  // 'connect with safety' and 'self-regulation'").
  const MK_TYPE_MENU = { micro:'a tiny practice', mindfulness:'simple mindfulness', anchoring:'connect with safety', most:'self-regulation' };
  // short glosses for the skill picker rows (copy per Justin 2026-07-25)
  const MK_SKILL_SUB = { validate:'acknowledge defense and briefly put into context', imagery:'give the feeling a shape, invite it in', obstacles:'practice noticing emotions as they arise', balancing:'feel into defense while anchored in safety', pendulation:'shift focus between safety and defense' };
  // per-type glyphs for the picker (currentColor: muted at rest, track ink when selected)
  const MK_TYPE_ICO = {
    micro:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg>',
    mindfulness: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
    anchoring:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 20s-6.5-4.2-8.6-8.3A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 8.6 4.9C18.5 15.8 12 20 12 20z"/></svg>',
    most:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M13 2 5 13h5l-1 9 8-11h-5z"/></svg>',
    session:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4.2" height="7" rx="1.6"/><rect x="17.3" y="13" width="4.2" height="7" rx="1.6"/></svg>',
    surprise:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9z"/><path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  };
  // the type picker, grouped for the brand sheet — rows carry an icon + a one-line
  // description; the label-less last group renders as a plain divider before "surprise".
  // NAMES ONLY — no per-row descriptions (Justin 2026-07-25). The banded group
  // headers ('shape your own' / 'guided sessions') carry the grouping; each row is
  // just its icon + name. (openDialSheet omits the sub line when o.sub is absent.)
  const MK_TYPE_GROUPS = ()=>[
    { label:'Shape your own', opts:MK_SHAPED.map(k=>({ val:k, menu:MK_TYPE_MENU[k], ico:MK_TYPE_ICO[k] })) },
    { label:'Guided practices', opts:P_MEDS.map(m=>({ val:m.id, menu:m.title, ico:MK_TYPE_ICO.session })) },
    { label:null, opts:[{ val:'surprise', menu:'Surprise me', ico:MK_TYPE_ICO.surprise }] },
  ];

  // Practice opens on a personalized "for you" view: a context line tuned to the
  // last check-in, and one track-colored card the Curriculum Advisor recommends.
  // Tapping it opens the plan reader. "choose another way" reveals the full chooser.
  function tabPractice(){
    if(_pendingPState){
      // a caller (currently only "change this practice") staged an exact shape to
      // preload — consume it once rather than re-deriving from today's recommendation,
      // which may have moved on since that shape was chosen.
      pState = _pendingPState; _pendingPState = null;
    } else {
      // plain arrival at the practice tab: "make my own" starts from scratch, not
      // silently pre-filled with today's recommendation (that's what the "made for
      // you" card already IS — the maker is the other option, and only reads as an
      // alternative if it actually starts blank). The recommender still seeds the
      // "made for you" tuned card itself, computed fresh inside renderMaker7b/
      // renderPracticeChooser from Store.recommend() — nothing here depends on reco.
      pState = { key:null, sense:'touch', skill:'imagery', silence:8, med:null,
                 holdWatch:false, holdSeconds:60, open:false, emotion:null,
                 makerOpen:false, mkKey:'anchoring' };
    }
    renderPracticeChooser(true);   // animate the tuned card in on tab arrival only
  }

  // (the old "for you" pre-screen \u2014 renderForYou/practiceContextLine \u2014 was dead
  // code since the chooser became the practice tab's landing view; removed.)

  // Estimated session length in minutes, by practice + chosen silence. Derived
  // from the player's own clip durations + gap rules (DUR/build/gapAfter in
  // player.html), averaged across senses/skills. NOT hand-maintained any more:
  // regenerate with `node harness/seq/estimate.js` after any change to build(),
  // to the clip set, or to the gap rules, and paste the line it prints.
  // Last regenerated 2026-08-04 (DESC chunks split per question; INVITE removed from imagery).
  const PRACTICE_EST = { micro:{4:2,8:2,12:2}, mindfulness:{4:6,8:7,12:8}, anchoring:{4:8,8:10,12:12}, most:{4:10,8:13,12:15} };
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
    // The plan reader IS the matching, rendered — "why this practice, for you, now".
    // It is the paid line. Guard here as well as at the call sites (defense in depth).
    if(!paidNow()) return gateSubscribe('matching');
    from = from || 'practice';   // where "back" returns to: the chooser, or today's row
    clearFigures(); document.body.classList.remove('in-practice');
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
      <header class="appbar"><button class="backbtn" id="plan-back">Back</button></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','now')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#plan-back').onclick = ()=>app(from);
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    $('#content').innerHTML = `<div class="view plan-view track-${tk.cls}">
      <div class="plan-head">
        <p class="eyebrow"></p>
        <div class="plan-titlerow">
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
        <button class="set-quiet actionbar-aux" id="plan-change">Change this practice</button>
        <button class="btn block" id="plan-begin">Begin</button>
      </div>
    </div>`;
    $('#plan-begin').onclick = ()=>launchWeaver(reco);
    $('#plan-change').onclick = ()=>{
      // stage the current shape for tabPractice() to pick up, then navigate once — it
      // used to call app('practice') (which rendered the tab's own from-scratch chooser
      // once) and THEN overwrite pState and render a second time, a visible double-render
      // for what should be a single hop straight into editing this practice
      // (Justin 2026-07-28: "consolidate the repetitive practice screen"). Landing with
      // the maker already open (rather than the collapsed toggle) skips re-showing the
      // same "made for you" card the person just came from.
      _pendingPState = { key:(reco.practiceKey==='more'?null:reco.practiceKey), sense:reco.sense||'touch', skill:reco.skill||'imagery', silence:reco.silence||8, med:null,
                 holdWatch:!!reco.holdWatch, holdSeconds:reco.holdWatchTargetSeconds||60, open:false, emotion:null,
                 makerOpen:true, mkKey:(MK_SHAPED.indexOf(reco.practiceKey)>=0 ? reco.practiceKey : 'anchoring') };
      app('practice');
    };
  }

  // caret shown on every dial — an obvious "opens a menu" chevron (replaces the old
  // ambiguous up/down glyph). track-colored via currentColor on the pill.
  const MK_CARET = '<svg class="p7-dial-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  // A brand-styled option sheet (replaces the OS's native <select> menu). Slides up
  // from the bottom, bone surface, hairline rows, the current choice checked in the
  // track color. groups: [{label, opts:[{val, menu}]}]. onPick(val) fires on choose.
  function openDialSheet(title, groups, current, trackCls, onPick){
    const old=document.getElementById('p7-sheet'); if(old) old.remove();
    const wrap=document.createElement('div'); wrap.id='p7-sheet'; wrap.className='p7-sheet';
    let rows='';
    groups.forEach((g,gi)=>{
      if(g.label) rows+=`<div class="p7-sheet-group">${escapeHtml(g.label)}</div>`;
      else if(gi>0) rows+=`<div class="p7-sheet-sep" aria-hidden="true"></div>`;
      g.opts.forEach(o=>{
        const sel = String(o.val)===String(current);
        rows+=`<button class="p7-opt${o.ico?' rich':''}${sel?' sel':''}" type="button" data-val="${escapeHtml(String(o.val))}">
          ${o.ico?`<span class="p7-opt-ico" aria-hidden="true">${o.ico}</span>`:''}
          <span class="p7-opt-main"><span class="p7-opt-l">${escapeHtml(CAP(String(o.menu)))}</span>${o.sub?`<span class="p7-opt-sub">${escapeHtml(CAP(String(o.sub)))}</span>`:''}</span>
          <svg class="p7-opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 6"/></svg>
        </button>`;
      });
    });
    wrap.innerHTML=`<div class="p7-sheet-card ${trackCls||''}" role="dialog" aria-modal="true">
      ${title?`<div class="p7-sheet-title">${escapeHtml(title)}</div>`:''}
      <div class="p7-sheet-body">${rows}</div>
    </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(()=>wrap.classList.add('on'));
    const close=()=>{ wrap.classList.remove('on'); document.removeEventListener('keydown',onKey); setTimeout(()=>{try{wrap.remove();}catch(e){}},320); };
    const onKey=(e)=>{ if(e.key==='Escape') close(); };
    document.addEventListener('keydown',onKey);
    wrap.addEventListener('click',e=>{ if(e.target===wrap) close(); });
    wrap.querySelectorAll('[data-val]').forEach(b=>b.onclick=()=>{ close(); onPick(b.dataset.val); haptic('start'); });
  }

  // ---- 7b: the "make my own" sentence-maker (paid, mobile) --------------------
  // Heading + the recommended "made for you" card (kept), then a collapsible
  // "make my own" that reads as one plain sentence whose underlined words are dials.
  // The sentence is fully dynamic: each clause appears only when it applies to the
  // chosen practice (mindfulness has no sense; micro has no silence; only
  // self-regulation carries skill / emotion / hold-&-watch / length). Picking a
  // standalone session or "surprise" collapses every dial but the type.
  function renderMaker7b(animateIn){
    const c=content();
    const reco = Store.recommend();
    const rtk = trackOf(reco.practiceKey);
    // defensive: some entry paths (e.g. the plan screen's "change this practice") seed
    // pState without a maker type. Never open the maker on a blank practice type.
    if(!pState.mkKey || (MK_SHAPED.indexOf(pState.mkKey)<0 && !mkIsSession(pState.mkKey) && pState.mkKey!=='surprise')){
      pState.mkKey = (MK_SHAPED.indexOf(reco.practiceKey)>=0 ? reco.practiceKey : 'anchoring');
    }
    if(!pState.sense) pState.sense='touch';
    if(!pState.skill) pState.skill='imagery';
    if(!pState.silence) pState.silence=8;
    const tunedNm = Store.getName();
    // the hand-drawn underline sits under the NAME (or "your"), not under "practice"
    // (Justin 2026-07-24) — so the possessive lead is its own underlined span.
    const nameLead = tunedNm ? `${escapeHtml(tunedNm)}’s` : 'your';
    const _tEst = estMinutes(reco.practiceKey, reco.silence);
    const tunedCard = `
      <button class="wincard tuned-card track-${rtk.cls}${animateIn?' tc-in':''}" id="foryou" type="button">
        <span class="wc-text">
          <span class="tuned-kicker">Made for you</span>
          <span class="wc-title"><span class="tuned-name">${CAP(nameLead)}<svg class="tuned-line" viewBox="0 0 120 6" preserveAspectRatio="none" aria-hidden="true"><path d="M2 4 C 30 1.5, 70 5.5, 118 2.5" pathLength="1"/></svg></span> custom practice</span>
          <span class="wc-reason">${escapeHtml(properCase(reco.reason))}</span>
          ${_tEst ? `<span class="tuned-meta">About ${_tEst} min · ${escapeHtml(Store.practiceLabel(reco.practiceKey))}</span>` : ''}
        </span>
        <span class="wc-go">${CHEV}</span>
      </button>`;

    c.innerHTML=`<div class="view p-view p7-view">
      <div class="scr-head"><p class="eyebrow"></p><h2 class="scr-h">Your practice.</h2></div>
      ${tunedCard}
      <button class="p7-maker-toggle" id="p7-toggle" type="button" aria-expanded="${pState.makerOpen?'true':'false'}"></button>
      <div class="p7-shape" id="p7-shape" ${pState.makerOpen?'':'hidden'}></div>
    </div>`;

    const tuned=$('#foryou'); if(tuned) tuned.onclick=()=>renderPlan(reco);
    const toggle=$('#p7-toggle');
    const paintToggle=()=>{
      const open=pState.makerOpen;
      toggle.textContent = open ? 'Hide' : 'Make my own';
      toggle.setAttribute('aria-expanded', open?'true':'false');
    };
    paintToggle();
    toggle.onclick=()=>{
      pState.makerOpen=!pState.makerOpen;
      const sh=$('#p7-shape');
      if(pState.makerOpen){ sh.hidden=false; paintMaker(true); } else { sh.hidden=true; sh.innerHTML=''; }
      paintToggle();
    };
    if(pState.makerOpen) paintMaker(true);

    // build one dial pill (an underlined, tappable word in the sentence)
    function dial(kind, label, extraCls){
      return `<button class="p7-dial${extraCls?' '+extraCls:''}" type="button" data-dial="${kind}"><span class="p7-dial-t">${escapeHtml(label)}</span>${MK_CARET}</button>`;
    }
    // assemble the live sentence for the current maker state
    function sentenceHTML(){
      const k = pState.mkKey;
      const typeLabel = mkPill(k);
      let s = `A ${dial('type', typeLabel || 'choose', typeLabel ? '' : 'is-empty')} practice`;
      if(MK_SHAPED.indexOf(k)>=0){
        if(k!=='mindfulness') s += `, anchored through ${dial('sense', pState.sense)}`;
        if(k==='most'){
          s += `, practicing ${dial('skill', skillLabel(pState.skill))}`;
          // "working with <feeling>" is meaningless for the obstacles skill — omit it there
          if(pState.skill!=='obstacles'){
            const emo = Store.EMOTION_FAMILIES.find(f=>f.key===pState.emotion);
            s += `, working with ${dial('emotion', emo?emo.label:'Whatever surfaces')}`;
          }
          if(pState.skill==='balancing' || pState.skill==='pendulation'){
            s += pState.holdWatch
              ? `, holding &amp; watching for ${dial('hold', holdDurWords(pState.holdSeconds))}`
              : `, ${dial('hold', 'add hold & watch')}`;
          }
        }
        if(k!=='micro') s += `, with ${dial('silence', silLabel(pState.silence))} silence`;
        if(k==='most') s += `, running ${dial('length', pState.open?'open-ended':'a complete practice')}`;
      }
      return s + '.';
    }
    // the dynamic "what this is" explainer — proper-cased (sentence case, not lowercase),
    // with the user's own dial choices shown in bold so they can see their shaping reflected.
    function explainHTML(){
      const k = pState.mkKey;
      const b = (t)=>`<strong>${escapeHtml(String(t))}</strong>`;
      if(k==='surprise') return "This is a randomly created practice, weaving together various self-regulation skills. This is best for the curious and motivated.";
      if(mkIsSession(k)){ const m=P_MEDS.find(x=>x.id===k); return m ? escapeHtml(properCase(`a full, standalone guided practice, ${m.est.replace('~','about ')}. ${m.sub}, played start to finish.`)) : ''; }
      const est = estMinutes(k, k==='micro'?2:pState.silence);
      const openEnded = (k==='most' && !!pState.open);
      const label = Store.practiceLabel(k);
      const bits = [];
      // opening: what it is + how long (the type + length are user choices → bold)
      const head = /^a /.test(label) ? `A ${b(label.replace(/^a /,''))}` : `A guided ${b(label)} practice`;
      const timePhrase = openEnded
        ? (est ? `, about ${b(est+' minutes')} of guidance, then ${b('open-ended')}` : `, ${b('open-ended')}`)
        : (est ? `, about ${b(est+' minutes')}` : '');
      bits.push(head + timePhrase + '.');
      // the approved "about" prose, proper-cased; bold the anchor sense where anchoring names it
      let about = escapeHtml(properCase(aboutOf(k, pState.sense)));
      if(k==='anchoring' && pState.sense) about = about.replace(pState.sense, b(pState.sense));
      bits.push(about);
      if((k==='most'||k==='micro') && pState.sense) bits.push(`Your anchor is ${b(pState.sense)}.`);
      if(k==='most' && pState.skill && SKILL_CAP[pState.skill]) bits.push(escapeHtml(properCase(SKILL_CAP[pState.skill])));
      if(k==='most' && pState.skill!=='obstacles' && pState.emotion){ const emo=Store.EMOTION_FAMILIES.find(f=>f.key===pState.emotion); if(emo) bits.push(`You're working with ${b(emo.label)}.`); }
      if(k==='most' && pState.holdWatch && (pState.skill==='balancing'||pState.skill==='pendulation')) bits.push(`Then hold safety and defense together and watch what unfolds, for ${b(holdDurWords(pState.holdSeconds))}.`);
      if(k!=='micro') bits.push(`With ${b(silLabel(pState.silence))} silence between the guidance.`);
      if(openEnded) bits.push('It keeps going until you choose to stop.');
      return bits.filter(Boolean).join(' ');
    }

    function paintMaker(cue){
      const sh=$('#p7-shape'); if(!sh) return;
      const k=pState.mkKey; const tk=trackOf(k);
      sh.className='p7-shape track-'+tk.cls;
      sh.innerHTML=`
        <p class="p7-shape-h">Make my own</p>
        <p class="p7-sentence">${sentenceHTML()}</p>
        <p class="p7-explain" id="p7-explain">${explainHTML()}</p>
        <div class="p7-actions"><button class="btn block" id="p7-begin">Begin</button></div>`;
      sh.querySelectorAll('[data-dial]').forEach(b=>b.onclick=()=>openDial(b.dataset.dial));
      const bg=$('#p7-begin'); if(bg) bg.onclick=beginMaker;
      // when the maker first opens, briefly pulse the practice-type pill so it's clear
      // the type is tappable (it's the first, primary dial). (Justin 2026-07-24)
      if(cue){ const td=sh.querySelector('[data-dial="type"]'); if(td){ td.classList.add('p7-dial-cue'); td.addEventListener('animationend',()=>td.classList.remove('p7-dial-cue'),{once:true}); } }
    }

    // open the right brand sheet for a given dial, then repaint on choose
    function openDial(kind){
      const k=pState.mkKey; const tkCls='track-'+trackOf(k).cls;
      if(kind==='type'){
        openDialSheet('What would you like to practice?', MK_TYPE_GROUPS(), k, tkCls, (v)=>{
          pState.mkKey=v;
          // entering self-regulation: make sure the seeded dials are valid for it
          if(v==='most'){ if(!pState.skill) pState.skill='imagery'; if(!pState.sense) pState.sense='touch'; }
          if(v==='micro' && ['movement','imagination'].indexOf(pState.sense)>=0) pState.sense='touch';
          paintMaker();
        });
      } else if(kind==='sense'){
        const senseList = k==='micro' ? ['touch','sound','sight'] : P_SENSES;
        openDialSheet('Anchor through', [{opts:senseList.map(s=>({val:s,menu:s}))}], pState.sense, tkCls, (v)=>{ pState.sense=v; paintMaker(); });
      } else if(kind==='skill'){
        openDialSheet('Which skill?', [{opts:P_SKILLS.map(([val,l])=>({val,menu:l,sub:MK_SKILL_SUB[val]}))}], pState.skill, tkCls, (v)=>{
          pState.skill=v;
          if(v!=='balancing' && v!=='pendulation') pState.holdWatch=false;   // hold & watch only applies to these
          paintMaker();
        });
      } else if(kind==='emotion'){
        const opts=[{val:'',menu:'Whatever surfaces',sub:'Let a feeling arrive on its own'}].concat(Store.EMOTION_FAMILIES.map(f=>({val:f.key,menu:f.label,sub:f.hint})));
        openDialSheet('Working with', [{opts}], pState.emotion||'', tkCls, (v)=>{ pState.emotion=v||null; paintMaker(); });
      } else if(kind==='hold'){
        const opts=[{val:'off',menu:'Skip hold & watch'},{val:'30',menu:'Hold & watch for 30 sec'},{val:'60',menu:'Hold & watch for 1 min'},{val:'90',menu:'Hold & watch for 90 sec'},{val:'120',menu:'Hold & watch for 2 min'}];
        openDialSheet('Hold & watch', [{opts}], pState.holdWatch?String(pState.holdSeconds):'off', tkCls, (v)=>{
          if(v==='off'){ pState.holdWatch=false; } else { pState.holdWatch=true; pState.holdSeconds=+v; }
          paintMaker();
        });
      } else if(kind==='silence'){
        openDialSheet('How much silence?', [{opts:P_SILENCE.map(([val,l])=>({val,menu:l}))}], pState.silence, tkCls, (v)=>{ pState.silence=+v; paintMaker(); });
      } else if(kind==='length'){
        openDialSheet('How long?', [{opts:[{val:'false',menu:'A complete practice'},{val:'true',menu:'Open-ended'}]}], String(pState.open), tkCls, (v)=>{ pState.open=(v==='true'); paintMaker(); });
      }
    }

    function beginMaker(){
      const k=pState.mkKey;
      if(k==='surprise'){
        // shape a random self-regulation practice, then show its plan (details) BEFORE it
        // begins — the plan screen's own "begin" launches it. (Justin 2026-07-24: surprise
        // must reveal the practice's details first, not autostart.)
        const rskill=P_SKILLS[Math.floor(Math.random()*P_SKILLS.length)][0];
        const rsense=P_SENSES[Math.floor(Math.random()*P_SENSES.length)];
        const rsilence=P_SILENCE[Math.floor(Math.random()*P_SILENCE.length)][0];
        const rhw=(rskill==='balancing'||rskill==='pendulation')?(Math.random()<0.5):false;
        const rhs=[30,60,90,120][Math.floor(Math.random()*4)];
        renderPlan({ practiceKey:'most', sense:rsense, skill:rskill, silence:rsilence,
                     holdWatch:rhw, holdWatchTargetSeconds:(rhw?rhs:null),
                     reason:'A surprise practice, shaped at random to meet what is hard while keeping you anchored in safety.' }, 'practice');
        return;
      }
      if(mkIsSession(k)){
        practiceShell('player.html?embed=1&autostart=1&more=1&med='+encodeURIComponent(k),{practiceKey:'more',meditationId:k});
        return;
      }
      const sil = k==='micro' ? 2 : pState.silence;
      const ps={embed:'1',autostart:'1',practice:k,sense:pState.sense,silence:String(sil)};
      if(k==='most'){ ps.skill=pState.skill;
        if((pState.skill==='balancing'||pState.skill==='pendulation')&&pState.holdWatch){ ps.holdwatch='1'; ps.holdsecs=String(pState.holdSeconds||60); }
        if(pState.open) ps.open='1';
      }
      practiceShell('player.html?'+new URLSearchParams(ps).toString(),{practiceKey:k,sense:pState.sense,skill:pState.skill,silence:sil,holdWatch:(k==='most'?!!pState.holdWatch:false),holdWatchTargetSeconds:(k==='most'&&pState.holdWatch?(pState.holdSeconds||60):null),openEnded:(k==='most'?!!pState.open:false),emotionIntent:(k==='most'?(pState.emotion||null):null)});
    }
  }

  function renderPracticeChooser(animateIn){
    const c=content();
    let {key,sense,skill,silence,med}=pState;
    // Desktop (>=720) shows a list|detail. On arrival NOTHING is selected: the list
    // shows neutral cards and the detail column stays hidden until the user picks a
    // practice. On pick, that card lights up, the others fade + lose their outline,
    // and its adjust/what-to-expect reveals on the right. (Mobile <720 keeps key=null
    // and its full-screen flow unchanged.)
    // Must stay IDENTICAL to app.css's regular size class (see the size-class comment at the
    // top of app.css). Reverted to width-only 2026-07-30d at Justin's call: a landscape phone
    // takes the desktop composition on purpose.
    const desk = !!(window.matchMedia && window.matchMedia('(min-width:720px)').matches);

    // 7b — paid members on mobile get the "make my own" sentence-maker (redesign,
    // 2026-07-24). Free accounts and desktop keep the existing chooser below,
    // unchanged. (Desktop paid stays on the list|detail split for now.)
    if(paidNow() && !desk){ return renderMaker7b(animateIn); }

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
          <p class="dash-prompt">What would you like to anchor with?</p>
          <div class="p-chips">${senseList.map(s=>chip(s,s,'sense',s===sense)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup">
          <p class="dash-prompt">Which skill do you want to practice?</p>
          <div class="p-chips">${P_SKILLS.map(([v,l])=>chip(l,v,'skill',v===skill)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup">
          <p class="dash-prompt">Working with anything today?</p>
          <div class="p-chips">${[['','let it surface']].concat(Store.EMOTION_FAMILIES.map(f=>[f.key,f.label])).map(([v,l])=>
            `<button class="p-chip${(pState.emotion||'')===v?' on':''}" data-emo="${escapeHtml(v)}">${escapeHtml(l)}</button>`).join('')}</div>
          <p class="ch-cap" id="p-emo-hint">${(()=>{const f=Store.EMOTION_FAMILIES.find(x=>x.key===pState.emotion);return f?escapeHtml(f.hint):'Choosing ahead of time helps you notice it when it arrives. Optional.';})()}</p>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup" id="p-hw-group" style="${(skill==='balancing'||skill==='pendulation')?'':'display:none'}">
          <p class="dash-prompt">Add hold &amp; watch?</p>
          <div class="p-chips">${[[true,'hold & watch'],[false,'skip it']].map(([v,l])=>chip(l,v,'holdwatch',v===!!pState.holdWatch)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup" id="p-hd-group" style="${((skill==='balancing'||skill==='pendulation')&&pState.holdWatch)?'':'display:none'}">
          <p class="dash-prompt">How long to hold &amp; watch?</p>
          <div class="p-chips">${[[30,'30 sec'],[60,'1 min'],[90,'90 sec'],[120,'2 min']].map(([v,l])=>chip(l,v,'holdsec',v===pState.holdSeconds)).join('')}</div>
        </div>`:''}
        ${key!=='micro'?`<div class="p-rgroup">
          <p class="dash-prompt">How much silence between guidance?</p>
          <div class="p-chips">${P_SILENCE.map(([v,l])=>chip(l,v,'sil',v===silence)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup">
          <p class="dash-prompt">How long would you like to practice?</p>
          <div class="p-chips">${[[false,'a complete practice'],[true,'open-ended']].map(([v,l])=>chip(l,v,'open',v===!!pState.open)).join('')}</div>
        </div>`:''}
        <p class="ch-cap p-expect" id="p-expect">${expectText(key, sense, skill, silence, pState.holdWatch, pState.holdSeconds, pState.open)}</p>
        ${key==='most'?'<button class="p-surprise" id="p-surprise">Surprise me</button>':''}
      </div>`:'';

    const medsHTML=key==='more'?`
      <div class="p-med-list">
        ${P_MEDS.map(m=>`<button class="p-med-row${med===m.id?' on':''}" data-pmed="${m.id}">
          <span class="p-med-title">${escapeHtml(m.title)}</span>
          <span class="p-med-meta">${escapeHtml(m.est)} · ${escapeHtml(m.sub)}</span>
        </button>`).join('')}
      </div>`:'';

    const canBegin=!!(key&&(key!=='more'||med));

    const _paid = paidNow();
    const reco = Store.recommend();
    const tk = trackOf(reco.practiceKey);
    const tunedNm = Store.getName();
    const tunedHeading = tunedNm ? `${escapeHtml(tunedNm)}'s custom practice` : 'your custom practice';
    const _tEst = estMinutes(reco.practiceKey, reco.silence);
    // The matched card is the paid line itself. For a free account it is NOT rendered
    // faded-with-the-answer-showing (that would hand over the thing while pretending not
    // to, and dangle it besides) — it is simply not there. What's there instead is the
    // practices they have, and one quiet line saying where the matching lives.
    const tunedCard = !_paid ? '' : `
      <button class="wincard tuned-card track-${tk.cls}${animateIn?' tc-in':''}${pState.tunedSel?' tuned-sel':''}" id="foryou">
        <span class="wc-text">
          <span class="tuned-kicker">Made for you</span>
          <span class="wc-title">${tunedHeading}</span>
          <svg class="tuned-line" viewBox="0 0 120 6" preserveAspectRatio="none" aria-hidden="true"><path d="M2 4 C 30 1.5, 70 5.5, 118 2.5" pathLength="1"/></svg>
          <span class="wc-reason">${escapeHtml(properCase(reco.reason))}</span>
          ${_tEst ? `<span class="tuned-meta">About ${_tEst} min · ${escapeHtml(Store.practiceLabel(reco.practiceKey))}</span>` : ''}
        </span>
        <span class="wc-go">${CHEV}</span>
      </button>`;

    // heading-friendly short names: "adjust your safety practice", never
    // "adjust your connect with safety practice" / "your a tiny practice practice"
    const P_ADJUST = { anchoring:'safety', micro:'tiny', mindfulness:'mindfulness' };
    const heading = !key ? (_paid ? '' : 'Pick a practice.')
      : (key==='more' ? 'Choose a practice.'
      : `adjust your <span class="p-adjust-name">${escapeHtml(P_ADJUST[key]||Store.practiceLabel(key))}</span> practice.`);
    // free: the full menu in the real order, nothing hidden — the base-plan practices are
    // FADED INK ONLY (same card, same fill, no padlock, no dashes), exactly as the guest
    // pick renders them. Tapping one asks; it never scolds.
    const optCards = P_OPTS.map(o=>{
      const locked = !_paid && !practiceFree(o.key);
      return locked
        ? selCard(o, `data-plock="${o.key}"`, false).replace('class="wincard p-opt', 'class="wincard p-opt p-locked')
        : selCard(o, `data-pkey="${o.key}"`, key===o.key && !pState.tunedSel);
    }).join('');
    const freeFoot = (!_paid && !key)
      ? '<p class="fineprint" style="text-align:center;margin:14px 2px 0;opacity:.72">Practices built from your check-ins are on the base plan.</p>'
      : '';

    if(!desk){
      // ---- MOBILE (<720): unchanged full-screen flow (list OR adjust) ----
      c.innerHTML=`<div class="view p-view${key?' track-'+trackOf(key).cls:''}">
      ${heading?`<div class="scr-head">
        <p class="eyebrow"></p>
        <h2 class="scr-h">${heading}</h2>
        ${key&&key!=='more'?`<svg class="p-adjust-line" viewBox="0 0 120 6" preserveAspectRatio="none" aria-hidden="true"><path d="M2 4 C 30 1.5, 70 5.5, 118 2.5" pathLength="1"/></svg>`:''}
      </div>`:''}
      <div class="p-bottom">
        ${!key
          ? `${tunedCard}<div class="p-opts" id="p-opts-list">${optCards}</div>${freeFoot}`
          : `${refineHTML}${medsHTML}`}
      </div>
      ${key?`<div class="actionbar">
        <button class="set-quiet actionbar-aux" id="p-cancel">Back</button>
        <button class="btn block" id="p-begin"${canBegin?'':' disabled'}>Begin</button>
      </div>`:''}
    </div>`;
    } else {
      // ---- DESKTOP (>=720): persistent list | detail. The list (tuned card +
      // practice cards) stays left; the selected practice's adjust/what-to-expect
      // renders on the right. No navigation, no bottom bleed. Reuses the exact same
      // refine/meds markup + handlers + begin flow as mobile. ----
      // D135 / the defect underneath D226 (fixed 2026-07-30d): this used to be
      // `_paid ? '' : 'Pick a practice.'`, so a paid account got NO .scr-head, no heading and
      // no eyebrow on the >=720 practice screen — the one screen in the app with no title.
      // It only became obvious once a rotated phone started landing here. Every screen gets a head.
      const deskHeading = 'Pick a practice.';
      c.innerHTML=`<div class="view p-view p-split-view${key?' has-detail':''}${key?' track-'+trackOf(key).cls:''}">
      ${deskHeading?`<div class="scr-head">
        <p class="eyebrow"></p>
        <h2 class="scr-h">${deskHeading}</h2>
      </div>`:''}
      <div class="p-split">
        <div class="p-list-col">
          ${tunedCard}<div class="p-opts${key?' has-sel':''}" id="p-opts-list">${optCards}</div>${freeFoot}
        </div>
        <div class="p-detail-col">
          ${key ? `${refineHTML}${medsHTML}
            <div class="actionbar p-detail-bar">
              <button class="btn block" id="p-begin"${canBegin?'':' disabled'}>Begin</button>
            </div>` : ''}
        </div>
      </div>
    </div>`;
    }

    c.querySelectorAll('[data-pkey]').forEach(b=>b.onclick=()=>{pState.tunedSel=false;pState.key=desk?b.dataset.pkey:(pState.key===b.dataset.pkey?null:b.dataset.pkey);pState.med=null;renderPracticeChooser();});
    c.querySelectorAll('[data-plock]').forEach(b=>b.onclick=()=>gateSubscribe('practice'));
    const cancelBtn=$('#p-cancel'); if(cancelBtn) cancelBtn.onclick=()=>{pState.key=null;pState.med=null;pState.tunedSel=false;renderPracticeChooser();};
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
        h.textContent = f ? f.hint : 'Choosing ahead of time helps you notice it when it arrives. Optional.'; }
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

    const tuned=$('#foryou'); if(tuned) tuned.onclick=()=>{
      // Desktop: the recommended card opens its detail in the right panel (like the
      // practice cards) instead of navigating to the plan screen. Mobile keeps the plan.
      if(desk && reco.practiceKey && reco.practiceKey!=='more'){
        pState.tunedSel=true; pState.key=reco.practiceKey; pState.med=null;
        if(reco.sense) pState.sense=reco.sense;
        if(reco.skill) pState.skill=reco.skill;
        if(reco.silence) pState.silence=reco.silence;
        renderPracticeChooser();
      } else { renderPlan(reco); }
    };
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
    // Defense in depth for the free/paid line: a free account can only launch the two
    // mindfulness practices. The UI can't produce another key for them, but refuse it
    // here regardless — this is the single choke point every practice passes through.
    if(reco && !practiceFree(reco.practiceKey) && !paidNow()) return gateSubscribe('practice');
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
    // Guest flow: no tabbar screens, ever (never renderFeedback/app()).
    // One practice per guest — whether they finished it or left early, there is no
    // way back to the pick. The practiced flag persists (sessionStorage) so a reload
    // can't reopen the practice.
    if(inGuest()){
      _guestPracticed = true; gsSet({ practiced:1 });
      if(m.event === 'complete'){
        haptic('complete'); logSession(reco, true, false, m.minutes);
        // practice_complete — the guest finished the practice. Distinguishes "checked in
        // and abandoned the practice" from "finished it and declined the offer": two
        // different problems, two different fixes.
        gtrack('practice_complete', { door:guestDoor(), practice:(reco&&reco.practiceKey)||null,
                                      minutes:(typeof m.minutes==='number'?m.minutes:null),
                                      checkins:gCheckinCount(), visits:gVisits() });
        // No landing beat, no "done." — the practice ends and the check-in is what's
        // there. Check-in-first: the second read ("after your practice"), then the
        // before/after. The /stuck door has no "before", so its check-in is OFFERED
        // ('post': same screen, a quiet "not now" leads to the offer instead).
        return (guestDoor()==='practice' && !_guestCI) ? guestCheckin('post') : guestCheckin('after');
      }
      if(m.event === 'exit'){
        // left early = they opted out of the practice; a forced "after" read wouldn't
        // be honest. Straight to the offer.
        logSession(reco, false, true, m.minutes);
        return guestOffer();
      }
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
    // beginner vs advanced self-regulation: the tier-3 skills (balancing/pendulation) = advanced.
    // (re-sourced off the retired 0.55 challenge appetite → skill-based, §7.4.)
    const _selfRegLevel = _isMost ? ((_skill==='pendulation' || _skill==='balancing') ? 'advanced' : 'beginner') : null;
    Store.addSession({ id:(reco.sessionId||null), practiceKey:reco.practiceKey, skill:_skill, sense:reco.sense, silence:reco.silence,
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
    { key:'exit-hard',       label:'It was too hard right now' },
    { key:'exit-easy',       label:'It was too easy' },
    { key:'exit-distracted', label:'I got pulled away' },
    { key:'exit-enough',     label:'I got what i needed' },
  ];
  function renderExitReason(){
    setHTML(`
      <header class="appbar"></header>
      <div class="scroll"><div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">Ended early</p>
          <h1 class="scr-h">No problem. Want to say why?</h1>
          <p class="scr-lede">Totally optional. It helps tune your next practice.</p>
        </div>
        <div class="fb-opts">
          ${EXIT_OPTS.map(o=>`<button class="fb-opt" data-fb="${o.key}">${o.label}</button>`).join('')}
        </div>
        <button class="navlink" id="fb-skip" style="align-self:center;margin-top:18px">Skip</button>
      </div></div>`);
    root.querySelectorAll('.fb-opt').forEach(b=>b.onclick=()=>{ try{ Store.noteExit(b.dataset.fb); }catch(e){} haptic('save'); app('practice'); });
    const sk=$('#fb-skip'); if(sk) sk.onclick=()=>app('practice');
  }

  // Post-practice: a gentle read of how the body landed. Logged onto the session
  // (feeds the advisor over time), then a soft hand-off to a check-in or back home.
  const FB_OPTS = [
    { key:'more',    label:'More connected and present' },
    { key:'same',    label:'About the same' },
    { key:'less',    label:'Less connected and present' },
    { key:'struggle',label:'Struggled with this one' },
    { key:'unsure',  label:'Not sure' },
  ];
  function renderFeedback(reco){
    // v2: the body-feeling answer now SELECTS (instead of advancing), and an
    // optional "Did anything surface?" family row sits beneath it — both save on
    // continue. surfaced uses the same curated families as the customizer (plus
    // settled), so regulation becomes visible: what came up vs what they chose.
    const isMost = reco && reco.practiceKey==='most';
    const emoChip = f => `<button class="p-chip fb-emo" data-emosurf="${f.key}">${escapeHtml(f.label)}</button>`;
    setHTML(`
      <header class="appbar"></header>
      <div class="scroll"><div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">Share your experience</p>
          <h1 class="scr-h">How does your system feel now?</h1>
          <p class="scr-lede">There’s no right answer here. Just notice where you are now, compared to where you started.</p>
        </div>
        <div class="fb-opts">
          ${FB_OPTS.map(o=>`<button class="fb-opt" data-fb="${o.key}">${o.label}</button>`).join('')}
        </div>
        ${isMost?`<div class="fb-surf">
          <p class="dash-prompt">Did anything surface?</p>
          <p class="ch-cap">Whatever showed up while you practiced, even if it wasn’t what you chose. Pick any that fit. Optional.</p>
          <div class="p-chips">${Store.EMOTION_SURFACED.map(emoChip).join('')}</div>
        </div>`:''}
        <button class="btn block" id="fb-continue" disabled style="margin-top:18px">Continue</button>
        <button class="navlink" id="fb-skip" style="align-self:center;margin-top:12px">Skip</button>
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
      more:    { h:'Something shifted toward connection.', s:"that's worth a small pat on your nervous system's back." },
      same:    { h:'No major change, but you showed up.',  s:"that's a solid rep and your system thanks you for it." },
      less:    { h:'You stayed with it.',                  s:"that's not nothing. imperfect practice is still practice. take the next one easier and work your way back. don't rush it." },
      struggle:{ h:'Hard ones are still practice.',        s:"you're still here. you showed up. struggling with practices is very normal. come back to it when you're ready, but maybe focus on an easier skill. customize the next practice to your content." },
      unsure:  { h:'Not knowing is allowed.',             s:'You still showed up. Well done. Stay curious and open for the next one.' },
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
        <p class="settle-note">Safety doesn't erase the rest. It just holds them.</p>
        <div class="fb-after">
          <button class="btn block" id="fb-checkin">Check in now</button>
          <button class="navlink" id="fb-home" style="align-self:center">Back to today</button>
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
        ${tabBtn('today','now')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    const u=Store.user();
    const ts = (localStorage.getItem('snb_textscale')||'1');
    const rm = reduceMotionOn();   // effective, not just the stored value (D157/D270)
    const th = (localStorage.getItem('snb_theme')||'');
    const hp = (localStorage.getItem('snb_haptics')!=='0');   // on by default
    const offOn = (localStorage.getItem('snb_offline_all')==='1');   // offline download — off by default
    const gl = (localStorage.getItem('snb_share_glyph')||'1');       // state glyph on share cards — on by default
    const lv = (localStorage.getItem('snb_live_nudge')||'1');        // "we're live" invitations — on by default
    const psc = (localStorage.getItem('snb_practice_scene')||'');    // practice scene — '' = surprise me (random per session)
    const segBtn=(group,val,lbl,on)=>`<button type="button" data-${group}="${val}"${on?' class="on"':''}>${lbl}</button>`;
    // on/off pairs render as switches in list rows (HIG: segmented controls pick
    // among values; switches flip a state) — settings pass 2026-07-05
    const swRow=(id,label,on)=>`<div class="set-row-sw"><span class="set-sw-lbl">${label}</span><button class="set-sw${on?' on':''}" id="${id}" type="button" role="switch" aria-checked="${on?'true':'false'}" aria-label="${label}"><span class="set-sw-knob"></span></button></div>`;
    // settings redesign (turn 6, 2026-07-24): soft cards + a switch that reads in a row
    const gsSw=(id,label,on)=>`<div class="gs-sw"><span class="gs-lbl">${label}</span><button class="set-sw${on?' on':''}" id="${id}" type="button" role="switch" aria-checked="${on?'true':'false'}" aria-label="${label}"><span class="set-sw-knob"></span></button></div>`;
    // input method (settings owns the choice now): sliders (default) · states · numbers
    // METHOD_LABEL / METHOD_CAP / _methodPreview are module-level (hoisted 2026-07-28 so
    // onboarding's method card can share them — see near stateMarks()).
    const method = (localStorage.getItem('snb_checkin_method')||'sliders');
    const _svgChev=`<svg class="rs-disc-chev" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>`;
    const _svgAuto=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"></circle><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"></path></svg>`;
    const _svgLight=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"></path></svg>`;
    const _svgDark=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"></path></svg>`;
    const TS_SIZES=[['0.92','12px'],['1','15px'],['1.12','18px'],['1.25','21px'],['1.6','26px']];
    $('#content').innerHTML = `
      <div class="view settings-view">
        <div class="scr-head">
          <p class="eyebrow"></p>
          <h2 class="scr-h">Settings</h2>
        </div>
        <div class="gs">

          <div class="gs-card">
            <div class="gs-row"><span class="gs-k">Name</span><input class="name-input" id="nm-val" type="text" value="${escapeHtml(Store.getName())}" placeholder="add your name"></div>
            <div class="gs-row"><span class="gs-k">Account</span><span class="gs-v">${escapeHtml(u.email||'on this device')}</span></div>
          </div>

          <div class="gs-card">
            <button class="rs-disc-btn" id="ci-method-btn" type="button" aria-expanded="true"><span class="gs-h" style="margin:0">Your check-in</span><span class="rs-disc-val"><span id="ci-method-val">${METHOD_LABEL[method]||'sliders'}</span> ${_svgChev}</span></button>
            <div class="rs-disc-body" id="ci-method-body"><div class="disc-inner">
              <p class="gs-lbl2">How you enter your state</p>
              <div class="set-seg" id="seg-method">
                <button type="button" data-method="sliders"${method==='sliders'?' class="on"':''}>Questions</button>
                <button type="button" data-method="numbers"${method==='numbers'?' class="on"':''}>Number sliders</button>
                <button type="button" data-method="states"${method==='states'?' class="on"':''}>State picker</button>
              </div>
              <p class="rs-cap" id="ci-method-cap">${METHOD_CAP[method]||''}</p>
              <div class="rs-preview" id="ci-method-preview">${_methodPreview(method)}</div>
            </div></div>
          </div>

          <div class="gs-card">
            <div class="gs-sw" style="padding-bottom:4px"><span class="gs-lbl">The walkthrough</span>
              <button class="linkbtn" id="set-walkthrough" type="button">Walk me through it</button></div>
            <p class="gs-cap" style="margin:0 0 2px">The member walkthrough, again. It changes nothing on its own.</p>
          </div>

          <div class="gs-card">
            <p class="gs-h">Appearance</p>
            <p class="gs-lbl2">Text size</p>
            <div class="set-seg ts-seg" id="seg-text">
              ${TS_SIZES.map(([v,fs])=>`<button type="button" data-ts="${v}"${ts===v?' class="on"':''}><span class="ts-a" style="font-size:${fs}">A</span></button>`).join('')}
            </div>
            <p class="gs-lbl2" style="margin-top:18px">Theme</p>
            <div class="icon-seg" id="seg-theme">
              <button type="button" data-th=""${th===''?' class="on"':''}>${_svgAuto}<span class="lb">Auto</span></button>
              <button type="button" data-th="light"${th==='light'?' class="on"':''}>${_svgLight}<span class="lb">Light</span></button>
              <button type="button" data-th="dark"${th==='dark'?' class="on"':''}>${_svgDark}<span class="lb">Dark</span></button>
            </div>
            <div class="gs-sw" style="border-top:1px solid var(--hairline);margin-top:16px"><span class="gs-lbl">Animations</span><button class="set-sw${!rm?' on':''}" id="sw-motion" type="button" role="switch" aria-checked="${!rm?'true':'false'}" aria-label="animations"><span class="set-sw-knob"></span></button></div>
            <button class="rs-disc-btn" id="scene-btn" type="button" style="margin-top:10px" aria-expanded="false"><span class="gs-lbl">Practice scene</span><span class="rs-disc-val"><span id="scene-val">${psc===''?'Surprise me':psc.charAt(0).toUpperCase()+psc.slice(1)}</span> ${_svgChev}</span></button>
            <div class="rs-scene-body" id="scene-body"><div class="disc-inner">
              <button class="ch-opt ch-auto scene-opt${psc===''?' on':''}" type="button" data-scene="">Surprise me</button>
              <div class="scene-grid" style="margin-top:8px">
                ${['circles','drift','pond','reeds','breeze','sunbeam','fireflies'].map(s=>`<button class="ch-opt scene-opt${psc===s?' on':''}" type="button" data-scene="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`).join('')}
              </div>
              <p class="rs-cap" id="scene-cap"></p>
            </div></div>
          </div>

          <div class="gs-card">
            <p class="gs-h">App</p>
            ${gsSw('sw-live','Live practice invitations',lv!=='0')}
            ${gsSw('sw-haptics','Haptics',hp)}
            ${gsSw('sw-offline','Save practices for offline',offOn)}
            <p class="gs-fine" id="offline-status"></p>
            <p class="gs-fine">Your check-ins already work offline. They save on this device and sync to your account whenever you reconnect.</p>
            ${_hapIsIOS()?'<p class="gs-fine">On iPhone, the system limits haptics and may clear the offline copy after a while. Just turn things back on if that happens.</p>':''}
            ${isStandalone()?'':`<div class="set-row-inline" id="install-row" style="margin-top:12px">${installRowInner()}</div>`}
            <div class="gs-actions" style="margin-top:14px"><button class="set-quiet" id="live-code" type="button">Join a live practice with a code</button></div>
          </div>

          <div class="gs-card">
            <p class="gs-h">Your data</p>
            ${gsSw('sw-glyph','Charts on shared images',gl!=='0')}
            <p class="gs-fine">A card you share goes out as a picture of that card. On means the picture includes its chart. Off leaves the chart out. The card's words still go, and some of them name numbers.</p>
            <div class="gs-actions" style="margin-top:14px">
              <button class="set-quiet" id="export">Export your check-ins</button>
              <button class="set-quiet" id="privacy">How your data is handled</button>
              <button class="set-quiet" id="signout">Sign out</button>
            </div>
          </div>

          ${(function(){ var b=(Store.billing&&Store.billing())||null;
            // Subscribed: manage/cancel. Not subscribed: a quiet way in — never a wall, and
            // never worded as though the free account is deficient. 🖊 copy draft.
            if(b && b.sub_status==='active')
              return `<div class="gs-card"><p class="gs-h">Subscription</p><p class="gs-note">Your subscription is active. Change between monthly and annual, or cancel, anytime.</p><button class="set-quiet" id="manage-sub">Manage, change, or cancel subscription</button></div>`;
            if(!Store.cloud()) return '';
            // legacy / Academy accounts have the whole base plan without a subscription —
            // never call that "the free plan", and never show them a subscribe button.
            var ent = (Store.entitlement && Store.entitlement()) || {};
            if(ent.circle)
              return `<div class="gs-card"><p class="gs-h">Your plan</p><p class="gs-note" style="margin:0">You're a co-regulator in the unstucking academy. The full app comes included with your membership, as a thank you for practicing with us. Nothing to pay for here.</p></div>`;
            if(ent.legacy)
              return `<div class="gs-card"><p class="gs-h">Your plan</p><p class="gs-note" style="margin:0">Everything is included on your account. You were here before the base plan existed, so all of it is yours.</p></div>`;
            return `<div class="gs-card"><p class="gs-h">Subscription</p><p class="gs-note">You're on the free plan. It has no time limit.</p><button class="set-quiet" id="go-sub">Subscribe &middot; monthly or annual</button></div>`; })()}

          <div class="gs-danger">
            <button class="set-quiet set-quiet-danger" id="reset">Reset my data</button>
            <button class="set-quiet set-quiet-danger" id="delacct">Delete my account</button>
          </div>

          <p class="set-version" id="set-version" style="text-align:left;margin-top:2px"></p>
        </div>
      </div>`;
    const nmVal = $('#nm-val'); if(nmVal) nmVal.addEventListener('change', e=>{ Store.setName(e.target.value.trim()); });
    const swt=$('#set-walkthrough'); if(swt) swt.onclick=()=>{ app('today'); setTimeout(()=>startOnboarding(true), 80); };
    // "your check-in" method chooser (turn 6): the choice lives in settings; the
    // check-in reads snb_checkin_method on open. all three methods capture the same
    // v/sym/dor, so switching never seams the trend line (Justin 2026-07-24).
    (function(){
      const btn=$('#ci-method-btn'), body=$('#ci-method-body');
      if(btn&&body){ _discSetOpen(body, btn.getAttribute('aria-expanded')==='true'); btn.onclick=()=>_discToggle(btn, body); }
      const seg=$('#seg-method'); if(!seg) return;
      const val=$('#ci-method-val'), cap=$('#ci-method-cap'), prev=$('#ci-method-preview');
      // the numbers preview is a live illustration: dragging its slider moves the value
      // on the right, just like the real check-in (Justin r4 — the "6" was static).
      const _bindPrev=()=>{ if(!prev) return; const r=prev.querySelector('.ci-prev-range'), n=prev.querySelector('.ci-prev-num'); if(r&&n) r.oninput=()=>{ n.textContent = Math.round((+r.value)/10); }; };
      _bindPrev();
      seg.querySelectorAll('[data-method]').forEach(b=>b.onclick=()=>{
        const m=b.dataset.method;
        localStorage.setItem('snb_checkin_method', m);
        seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
        if(val) val.textContent = METHOD_LABEL[m]||m;
        if(cap) cap.textContent = METHOD_CAP[m]||'';
        if(prev){ prev.innerHTML = _methodPreview(m); _bindPrev(); }
        haptic('save');
      });
    })();
    // practice-scene disclosure toggle
    (function(){ const btn=$('#scene-btn'), body=$('#scene-body');
      if(btn&&body){ _discSetOpen(body, btn.getAttribute('aria-expanded')==='true'); btn.onclick=()=>_discToggle(btn, body); } })();
    const gsb=$('#go-sub'); if(gsb) gsb.onclick=()=>screenSubscribe();
    const mgs=$('#manage-sub'); if(mgs) mgs.onclick=()=>{ mgs.disabled=true; const t=mgs.textContent; mgs.textContent='One moment…';
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
    const SCENE_CAP={ '':'A different scene each time. The app chooses.',
      circles:'The slow circles, as now.',
      drift:'Soft specks drifting upward, each at its own pace.',
      pond:'Still water, a ripple now and then.',
      reeds:'Reeds swaying in an uneven breeze.',
      breeze:'Strands carried sideways on a light wind, each at its own speed.',
      sunbeam:'A still beam of light, dust hanging in it. Appears in dark mode.',
      fireflies:'Small lights arriving and leaving on their own time. Appears in dark mode.' };
    const scCap=$('#scene-cap'); const scVal=$('#scene-val');
    const _scSet=v=>{ if(scCap) scCap.textContent = SCENE_CAP[v]||''; if(scVal) scVal.textContent = v===''?'Surprise me':v.charAt(0).toUpperCase()+v.slice(1); };
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
      ? 'Animations are on.'
      : "Animations are off. This turns off the app's decorative movement. Breathing practices keep their full timing; words carry the pace instead."; };
    _motionCap(!rm);
    bindSw('sw-motion', on=>{ localStorage.setItem('snb_reduce_motion', on?'0':'1'); applyPrefs(); _motionCap(on); });
    const _hapCap = on=>{ const el=$('#hap-cap'); if(el) el.textContent = on
      ? 'Haptics are on. The app answers your taps with a tiny buzz.'
      : 'Haptics are off. The app never vibrates.'; };
    _hapCap(hp);
    bindSw('sw-haptics', on=>{ localStorage.setItem('snb_haptics', on?'1':'0'); if(on) haptic('save'); _hapCap(on); });
    // says exactly what it does: the switch removes the CHART, not every number —
    // several cards name a figure in their sentence, and that sentence still goes.
    const _glyphCap = on=>{ const el=$('#glyph-cap'); if(el) el.textContent = on
      ? 'Your shared cards include the chart you see on the card.'
      : 'Your shared cards leave the chart out. The words still go, including any numbers in them.'; };
    _glyphCap(gl!=='0');
    bindSw('sw-glyph',  on=>{ localStorage.setItem('snb_share_glyph', on?'1':'0'); _glyphCap(on); });
    // "we're live" invitations: state-mirroring caption, same pattern as the others. 🖊
    const _liveCap = on=>{ const el=$('#live-cap'); if(el) el.textContent = on
      ? 'When a live practice is happening, the today screen offers a quiet invitation to check in alongside it.'
      : 'The app never mentions live practices. Joining by link or code still works.'; };
    _liveCap(lv!=='0');
    bindSw('sw-live',   on=>{ localStorage.setItem('snb_live_nudge', on?'1':'0'); _liveCap(on); });
    { const _lc=$('#live-code'); if(_lc) _lc.onclick=()=>screenLiveCode(); }
    const irow = $('#install-row'); if(irow){ const ig = irow.querySelector('.in-go'); if(ig) ig.onclick = promptInstall; }
    // offline: bulk download / clear, with an honest iOS-eviction check on render
    const segOff = $('#sw-offline'); const offStatus = $('#offline-status');
    const setOff = (t)=>{ if(offStatus) offStatus.textContent = t; };
    // plain state-mirroring captions (Justin 2026-07-05): the line always says
    // what is true RIGHT NOW, in the plainest words we have. 🖊
    const OFF_ON_TXT  = 'Every practice is saved on this device, they all play without a connection.';
    const OFF_OFF_TXT = 'practices play over the internet. turn this on to save them all to this device (about 94 mb, best on wi-fi), so they play with no connection at all.';
    setOff(localStorage.getItem(OFFLINE_FLAG)==='1' ? OFF_ON_TXT : OFF_OFF_TXT);
    (async ()=>{
      if(localStorage.getItem(OFFLINE_FLAG)==='1'){
        const mani = await offlineManifest(); const have = await offlineCachedCount();
        setOff(mani.length && have>=mani.length ? OFF_ON_TXT : 'Your device cleared the offline copy. Turn this on again to re-save it.');
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
          if(res.quota || have < urls.length) setOff("didn't all fit. saved "+have+" of "+urls.length+". free up some space and turn this on again.");
          else setOff(OFF_ON_TXT);
        }catch(e){ setOff('Download failed. Check your connection and try again.'); }
        offBusy = false;
      } else {
        offBusy = true; await clearOffline(); localStorage.removeItem(OFFLINE_FLAG); setOff('Offline copy removed. Practices play over the internet again.'); offBusy = false;
      }
    };
    const privBtn = $('#privacy'); if(privBtn) privBtn.onclick = ()=>screenPolicy('privacy','settings');
    // version line: read the ?v= off the live script tag so it never drifts from a deploy
    try{ const vs=document.querySelector('script[src^="app.js"]'); const vm=vs&&vs.src.match(/v=(\d+)/); const ve=$('#set-version'); if(ve) ve.textContent='Stuck Not Broken · app v'+(vm?vm[1]:'dev'); }catch(e){}
    $('#export').onclick = ()=>{
      const blob = new Blob([JSON.stringify(Store.checkins(),null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='my-checkins.json'; a.click();
    };
    $('#signout').onclick = async ()=>{
      // one accidental tap used to sign you straight out (Justin, 2026-07-05)
      if(!confirm('Sign out? Your check-ins are saved to your account and will be here when you sign back in.')) return;
      await Store.signOut(); currentTab='today'; route();
    };
    $('#reset').onclick = async ()=>{ if(confirm('Clear all your check-ins and practice history? This can\'T be undone. Your account stays, but the data is gone for good.')){ await Store.reset(); try{ Object.keys(localStorage).filter(k=>k.startsWith('snb_breath_')).forEach(k=>localStorage.removeItem(k)); }catch(e){} app('today'); } };
    // full in-app account deletion (the privacy policy promises it): a clear
    // confirm screen, then the delete-account edge function erases everything
    // server-side, instantly. 🖊 copy below is a draft for Justin to own.
    $('#delacct').onclick = ()=>screenDeleteAccount();
  }

  function screenDeleteAccount(err, busy){
    setHTML(`
      <div class="view gate"><div class="gate-body">
        <p class="eyebrow">Delete my account</p>
        <h1 style="margin:12px 0 12px">Before you go, here's exactly what happens.</h1>
        <p class="lede" style="margin-bottom:14px">Deleting your account erases everything that identifies you, immediately and for good: your account, your email, your check-ins, your written notes, your practice history, and your reflections. There is no undo.</p>
        <p class="lede" style="margin-bottom:14px">What stays: an anonymous copy of check-ins and practice data. No name, no email, no notes. Once your account is gone, it can never be connected to you, even by us. It helps us learn whether this app helps people.</p>
        <p class="lede" style="margin-bottom:24px">Your reasons are your own, and no explanation is needed. If it ever feels right to come back, you're welcome any time. A fresh start takes about a minute.</p>
        ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
        <button class="btn block" id="del-keep" style="margin-top:8px"${busy?' disabled':''}>Keep my account</button>
        <p class="fineprint" style="margin-top:12px;text-align:center"><button class="linkbtn" id="del-go" style="font-size:inherit;padding:2px"${busy?' disabled':''}>${busy?'Deleting…':'Delete my account and all of my data'}</button></p>
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
        <p class="eyebrow">Done</p>
        <h1 style="margin:12px 0 12px">Your account is gone.</h1>
        <p class="lede" style="margin-bottom:24px">Everything that identifies you was erased. Thank you for spending some time here. If you ever want to return, the door is open.</p>
        <button class="btn block" id="del-done">Okay</button>
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
  // reader paragraphs (from-justin.js) wrap their dynamic numbers/state names/counts
  // in a literal <b>...</b> so the reader can bold what's actually personal to the
  // reader, the way the You-tab cards already do (Justin 2026-07-28: "bold all
  // dynamic elements in the reader"). escapeHtml() alone would turn that <b> into
  // literal text, so this escapes everything the normal way and then selectively
  // un-escapes ONLY the <b>/</b> sequences — a narrow allowlist, not a trust switch:
  // nothing else (script tags, attributes, other elements) can pass through.
  function boldHtml(s){ return escapeHtml(s).replace(/&lt;b&gt;/g,'<b>').replace(/&lt;\/b&gt;/g,'</b>'); }
  // The effective reduce-motion state: the OS setting is the default, the in-app switch
  // is an explicit override in either direction. One definition so the class, the switch
  // and the caption can never disagree (DQA D157/D158/D269/D270, 2026-07-30).
  function reduceMotionOn(){
    try{
      const pref = localStorage.getItem('snb_reduce_motion');   // '1' | '0' | null
      if(pref==='1') return true;
      if(pref==='0') return false;
      return !!(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches);
    }catch(e){ return false; }
  }
  // user display preferences (text size + motion), persisted and applied app-wide
  function applyPrefs(){
    try{
      const ts = parseFloat(localStorage.getItem('snb_textscale')||'1') || 1;
      // --type-user, not --type-scale: app.css composes --type-scale from the user's
      // setting x the device ramp (--type-fluid). Writing --type-scale here would
      // clobber the ramp and pin the app back to phone-sized type on desktop.
      document.documentElement.style.setProperty('--type-user', String(ts));
      // D157/D158/D269/D270 (DQA 2026-07-30): this class used to be set ONLY from the
      // in-app switch, so `body.reduce-motion` (and every CSS rule keyed off it) stayed
      // off for anyone who had asked for reduced motion at the OS level. Every JS site
      // in this file already ORs both; the class now does too. The stored value is a
      // three-state: '1' = user asked for reduced, '0' = user explicitly asked for
      // animations (an override that beats the OS), unset = follow the OS.
      document.body.classList.toggle('reduce-motion', reduceMotionOn());
      const theme = localStorage.getItem('snb_theme') || '';            // '', 'light', 'dark' ('' follows the system)
      const de = document.documentElement;
      de.classList.toggle('theme-dark', theme==='dark');
      de.classList.toggle('theme-light', theme==='light');
      const dark = theme==='dark' || (theme!=='light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
      const tcm = document.querySelector('meta[name="theme-color"]'); if(tcm) tcm.setAttribute('content', dark ? '#1B1C1E' : '#FAF9F5');
    }catch(e){}
  }
  function relTime(t){ const m=Math.round((Date.now()-t)/60000); if(m<1)return 'just now'; if(m<60)return m+' min ago'; const h=Math.round(m/60); if(h<24)return h+'h ago'; const d=Math.round(h/24); return d+'d ago'; }

  // (the floating new-check-in button was retired 2026-07-30b — DQA D232; see app.css .shell)
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
  /* 2026-08-17 — MEASURED on device, not reasoned about (player trace 18:02:08.798 ->
   18:02:10.175). Coming back to the app after a screen lock makes Supabase refresh the
   auth token; TOKEN_REFRESHED -> hydrate() -> notify() -> route(), and route() re-renders
   the current screen, which replaces the DOM the practice iframe lives in. The audio was
   still sounding at the instant it was destroyed, which is why every "the audio stopped"
   theory was wrong: nothing stopped it, the whole player was thrown away underneath it.
   A running practice owns the screen. Fresh data is already in the store either way, and
   the screen that follows a practice (feedback / exit reason) renders from it. */
function routeSafe(){
  if(document.getElementById('weaver')) return;    // a live practice owns the screen
  /* 2026-08-17, second half of the same bug (Justin, on device): finish a practice while
     the phone is still LOCKED and renderFeedback() draws the after-practice check-in
     while hidden — then the unlock fires the token refresh, route() runs because the
     weaver is already gone, and the check-in is wiped before it is ever seen. Unlock
     mid-practice instead and the refresh lands while the weaver is still up, the guard
     above holds, and the check-in survives. That is exactly the two results he got.
     .fb-view is every transient flow screen: post-practice feedback, exit reason,
     thanks, the guest offer and reflection, and the live-practice screens. None of them
     should ever be replaced by a background repaint the person did not ask for. */
  if(document.querySelector('.fb-view')) return;   // and so do the screens that follow it
  route();
}
Store.init(routeSafe);
})();
