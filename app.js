/* ============================================================================
   Stuck Not Broken — app prototype. Vanilla JS, on-device storage, real weaver.
   Screens: auth -> paywall -> [today | current | practice | you] + check-in.
   ========================================================================== */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const root = $('#screen');
  const MARK = 'assets/logo/snb-mark-ink.svg';

  const STATE_COLOR = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].color : '#D8D2C2');
  const STATE_NAME  = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].name : 'settling');
  const fmtDay = (t) => new Date(t).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
  const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });

  let liveFigures = []; // current figures to destroy on screen change
  function clearFigures(){ liveFigures.forEach(f=>{try{f.destroy();}catch(e){}}); liveFigures = []; }
  function mountFigure(host, opts){ const f = window.PVCurrent(host, opts); liveFigures.push(f); return f; }

  function setHTML(html){ clearFigures(); document.body.classList.remove('in-practice'); root.innerHTML = html; }

  // ---------------------------------------------------------------- routing
  function route(){
    if(!Store.user()) return screenSignIn();
    return app(currentTab);
  }
  let currentTab = 'today';
  let authMode = 'in';
  let lastEmail = '';

  // ---------------------------------------------------------------- sign in / up
  function screenSignIn(err, busy){
    const up = authMode==='up';
    setHTML(`
      <div class="view gate">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <p class="eyebrow">stuck not broken</p>
          <h1 style="margin:10px 0 12px">your nervous system, over time.</h1>
          <p class="lede" style="margin-bottom:24px">check in with where you are, watch your system change, and practice your way back to safety.</p>
          <div class="field"><label for="em">email</label><input id="em" type="email" autocomplete="email" value="${escapeHtml(lastEmail)}"></div>
          ${up ? '<div class="field"><label for="nm">your name <span style="color:var(--muted);font-weight:400">(optional)</span></label><input id="nm" type="text" autocomplete="name" placeholder="what should we call you?"></div>' : ''}
          <div class="field"><label for="pw">password</label><input id="pw" type="password" autocomplete="${up?'new-password':'current-password'}"></div>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="go" style="margin-top:8px"${busy?' disabled':''}>${busy?'one moment…':(up?'Create account':'Sign in')}</button>
          <p class="fineprint">${up?'already have an account?':'new here?'} <button class="linkbtn" id="toggle" style="font-size:inherit;padding:2px">${up?'sign in':'create an account'}</button></p>
          ${Store.cloud()?'':'<p class="fineprint" style="margin-top:8px">on-device mode: your sign-in works locally now. cross-device sync turns on once Supabase keys are added in config.js.</p>'}
        </div>
      </div>`);
    if(busy) return;
    $('#toggle').onclick = ()=>{ authMode = up?'in':'up'; screenSignIn(); };
    $('#go').onclick = submit;
    $('#em').addEventListener('input', e=>{ lastEmail=e.target.value; });
    $('#pw').addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
    function submit(){
      const email=$('#em').value.trim(), pw=$('#pw').value;
      if(!email || (Store.cloud() && !pw)){ lastEmail=email; screenSignIn('enter your email and a password.'); return; }
      lastEmail=email;
      const nm = up ? (($('#nm')||{}).value||'').trim() : '';
      screenSignIn(null, true);
      Promise.resolve(up ? Store.signUp(email,pw) : Store.signIn(email,pw)).then(res=>{
        if(res && res.error) return screenSignIn(res.error);
        if(res && res.needsConfirm) return screenConfirm(email);
        if(nm) Store.setName(nm);
        currentTab='today'; route();
      }).catch(e=>screenSignIn(String((e&&e.message)||e)));
    }
  }
  function screenConfirm(email){
    setHTML(`
      <div class="view gate"><div class="gate-body" style="text-align:center">
        <p class="eyebrow">almost there</p>
        <h1 style="margin:12px 0 12px">check your email.</h1>
        <p class="lede" style="margin-bottom:24px">we sent a confirmation link to <b style="font-weight:500">${escapeHtml(email)}</b>. tap it, then come back here to sign in.</p>
        <button class="btn block" id="back2">Back to sign in</button>
      </div></div>`);
    $('#back2').onclick=()=>{ authMode='in'; screenSignIn(); };
  }

  // ---------------------------------------------------------------- app shell
  function app(tab){
    currentTab = tab;
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
  }
  function tabBtn(t,label){ return `<button data-t="${t}" class="${currentTab===t?'on':''}"><span class="lb">${label}</span></button>`; }
  const content = () => $('#content');

  // ---------------------------------------------------------------- TODAY
  // ---- daily wins (no counter, no streak — three small things, checkable each day) ----
  function sameDay(t){ const d=new Date(t), n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate(); }
  // morning / afternoon / evening — the check-in resets each segment so you can notice
  // where you are at different times of day, and see those patterns build up over time.
  function segOf(t){ const h=new Date(t).getHours(); return h<12?'morning':h<18?'afternoon':'evening'; }
  function breathKey(){ const n=new Date(); return 'snb_breath_'+n.getFullYear()+'-'+(n.getMonth()+1)+'-'+n.getDate(); }
  function breathDone(){ try{ return localStorage.getItem(breathKey())==='1'; }catch(e){ return false; } }
  function markBreath(){ try{ localStorage.setItem(breathKey(),'1'); }catch(e){} }
  // ---- "From Justin" content library — state-keyed, reactive, no AI ----
  // Pieces are chosen from the dominant state of today's last check-in
  // (Store.lastCheckin().dom). Before the first check-in of the day we fall back
  // to the gentle "neutral" set. promptPolicy is the capacity gate:
  //   open    = show any type
  //   sparing = mostly reminders/reflections, a journal prompt only occasionally
  //   withhold= never auto-show a journal prompt in this state
  // Source of truth: "Stuck Not Broken - From Justin (content + logic).md" / JSON v2.
  const FROM_JUSTIN = {
    safety: { label:"safe", promptPolicy:"open", pieces:[
      {id:"safe-rem-1", type:"reminder", text:"Feeling present isn't the finish line. It's a place to rest, remind your system what safety actually feels like, and even challenge your system to grow capacity. Doing so makes it easier to find this experience again."},
      {id:"safe-rem-2", type:"reminder", text:"Safety isn't the absence of hard things. It's having enough capacity inside to meet them."},
      {id:"safe-ref-1", type:"reflection", text:"In a settled moment like this one, the same problems are still there; they just don't run the show. That steadiness is worth noticing instead of rushing past."},
      {id:"safe-ref-2", type:"reflection", text:"A lot of people skip right over these good moments, already bracing for the next hard one. You're allowed to let this one be and marinate in it for a bit. No rush."},
      {id:"safe-ref-3", type:"reflection", text:"You're present enough. Connected enough. Good job."},
      {id:"safe-jp-1", type:"journal prompt", text:"What's one small thing that helped you feel a little more like yourself today?"},
      {id:"safe-jp-2", type:"journal prompt", text:"When you feel present like this, what becomes possible that doesn't when you're not?"},
      {id:"safe-jp-3", type:"journal prompt", text:"You've earned this level of safety. How do you feel about yourself?"},
      {id:"safe-jp-4", type:"journal prompt", text:"Safety doesn't stay around forever. It'll come and go. Can you give your system permission to come in and out of safety?"},
    ]},
    play: { label:"regulated mobilization", promptPolicy:"open", pieces:[
      {id:"regmob-rem-1", type:"reminder", text:"Energy with a sense of safety underneath it is a good place to be. This is the kind of drive that doesn't cost you later."},
      {id:"regmob-rem-2", type:"reminder", text:"Not all activation is something to calm down. Some of it is just you, moving toward what matters."},
      {id:"regmob-ref-1", type:"reflection", text:"On days like this it's easier to say the honest thing, set the limit, start the thing you've been putting off. The same energy that feels like too much when you're on edge feels like fuel when you're steady."},
      {id:"regmob-ref-2", type:"reflection", text:"There's a kind of busy that drains you and a kind that fills you, isn't there? This is the second one. Worth knowing the difference in your own body. So, pause and take notice."},
      {id:"regmob-jp-1", type:"journal prompt", text:"What do you most want to put this energy toward right now?"},
      {id:"regmob-jp-2", type:"journal prompt", text:"Is there a boundary or a conversation that feels possible today that didn't last week?"},
      {id:"regmob-jp-3", type:"journal prompt", text:"How are you feeling about yourself right now? Your potential?"},
      {id:"regmob-jp-4", type:"journal prompt", text:"You've earned this, haven't you? Tell the truth."},
    ]},
    stillness: { label:"regulated immobilization", promptPolicy:"open", pieces:[
      {id:"regimm-rem-1", type:"reminder", text:"Rest isn't just a reward you earn after everything's done. It's a necessity for restoring your system's balance."},
      {id:"regimm-ref-1", type:"reflection", text:"Sink into the stillness within you and around you."},
      {id:"regimm-ref-2", type:"reflection", text:"Being quiet and close to someone safe, or quiet and alone, can both feel like coming home. A lot of people don't get much of either. Notice it while it's here."},
      {id:"regimm-jp-1", type:"journal prompt", text:"When it's this quiet inside, what's been waiting for your attention?"},
      {id:"regimm-jp-2", type:"journal prompt", text:"What's something you understand now that you couldn't see when things were louder?"},
      {id:"regimm-jp-3", type:"journal prompt", text:"If a younger version of you could feel this kind of calm, what would you want them to know?"},
    ]},
    fightflight: { label:"dysregulated mobilization", promptPolicy:"sparing", pieces:[
      {id:"dysmob-rem-1", type:"reminder", text:"Yes, things are urgent and that's real. But not all of it is equal and you know this. You also know that you're at your best when you can breathe a bit more."},
      {id:"dysmob-rem-2", type:"reminder", text:"Speeding up is the body trying to handle something. It isn't a flaw, even when it bumps into the people around you."},
      {id:"dysmob-rem-3", type:"reminder", text:"Irritability and anxiousness are safety running low, not a reflection of your worth. It's something to understand, not to judge."},
      {id:"dysmob-ref-1", type:"reflection", text:"Sometimes the mind races to stay ahead of a feeling it doesn't want to catch up with. And that makes it even harder to slow down."},
      {id:"dysmob-ref-2", type:"reflection", text:"Being wired and worn out at the same time is something many people know well. You're not alone in that."},
      {id:"dysmob-jp-1", type:"journal prompt", text:"What's one thing your body might need right now: to move, to rest, or to be heard?"},
      {id:"dysmob-jp-2", type:"journal prompt", text:"What's your current emotion? And how does that emotion want to move?"},
    ]},
    shutdown: { label:"dysregulated immobilization", promptPolicy:"withhold", pieces:[
      {id:"dysimm-rem-1", type:"reminder", text:"Collapsed isn't broken. It's a flavor of stuck. And stuck is temporary."},
      {id:"dysimm-rem-2", type:"reminder", text:"Going quiet and heavy is one of the oldest ways the body protects you. It isn't weakness, even when it feels like nothing at all."},
      {id:"dysimm-rem-3", type:"reminder", text:"On the heavy days, getting through is maybe enough. You don't owe anyone more than that today."},
      {id:"dysimm-ref-1", type:"reflection", text:"Shutdown can feel like the lights dimming. Heavy, far away, hard to care. That's not you failing; that's an older part of you trying to get you through."},
      {id:"dysimm-ref-2", type:"reflection", text:"When everything feels flat, it's easy to believe that's just who you are now. It isn't. It's a state, and states shift."},
      {id:"dysimm-ref-3", type:"reflection", text:"Sometimes the day feels like it's happening behind glass. A lot of people know that feeling, and it does pass, even when it doesn't seem like it will."},
      {id:"dysimm-jp-1", type:"journal prompt", text:"What's one sound you can effortlessly hear? Or is there silence?"},
      {id:"dysimm-jp-2", type:"journal prompt", text:"What's one color catching your eye?"},
      {id:"dysimm-jp-3", type:"journal prompt", text:"Where is one imaginary place you would go to be in stillness? A place you could breathe easy and be free from pressure?"},
    ]},
    freeze: { label:"freeze", promptPolicy:"sparing", pieces:[
      {id:"freeze-rem-1", type:"reminder", text:"Feeling stuck in place isn't the same as nothing happening. Inside, a lot is, and it's working hard to keep you protected."},
      {id:"freeze-rem-2", type:"reminder", text:"You don't have to force your way out of stuck. Sometimes the smallest movement is enough to remind the body it can move at all."},
      {id:"freeze-rem-3", type:"reminder", text:"Being caught between wanting to move and not being able to is one of the most common places people get stuck. You're not the only one here."},
      {id:"freeze-ref-1", type:"reflection", text:"Stuck can feel like holding your breath without meaning to. Like being ready and frozen at the same time."},
      {id:"freeze-ref-2", type:"reflection", text:"Freeze might be the current state of your body. And maybe it's been that way for a long time. But not the permanent state of your body."},
      {id:"freeze-jp-1", type:"journal prompt", text:"Can you wiggle your toes even while frozen?"},
      {id:"freeze-jp-2", type:"journal prompt", text:"Can you roll your wrists even from freeze? If so, you opened a bit of mobility. Good job."},
      {id:"freeze-jp-3", type:"journal prompt", text:"Can you roll your neck while in this freeze state?"},
      {id:"freeze-jp-4", type:"journal prompt", text:"Can you acknowledge your emotion without rejecting it? If not, that's okay for now."},
    ]},
    neutral: { label:"settling", promptPolicy:"open", pieces:[
      {id:"neutral-rem-1", type:"reminder", text:"Your current experience is an opportunity to reflect. Check in when (and if) you're ready."},
      {id:"neutral-rem-2", type:"reminder", text:"You don't have to change how you feel to check in. Just notice it."},
      {id:"neutral-ref-1", type:"reflection", text:"Some days you can connect with your body more than others. And that's okay. Progress, not perfection."},
      {id:"neutral-jp-1", type:"journal prompt", text:"If you had to guess, what's one word for how today feels in your body?"},
    ]},
  };
  const _fjLastId = {};      // per-state last shown id, for no-repeat
  let _fjCache = null;       // {key, piece} — stable within a state until refreshed
  let _fjPromptTick = 0;     // rotates the "sparing" prompt cadence

  function fjStateKey(){
    const last = Store.lastCheckin();
    if(last && sameDay(last.t) && FROM_JUSTIN[last.dom]) return last.dom;
    return 'neutral';   // before the first check-in of the day
  }
  function fjPick(key){
    const st = FROM_JUSTIN[key] || FROM_JUSTIN.neutral;
    let pieces = st.pieces.slice();
    // capacity gate
    if(st.promptPolicy==='withhold'){
      pieces = pieces.filter(p=>p.type!=='journal prompt');
    } else if(st.promptPolicy==='sparing'){
      const allowPrompt = (_fjPromptTick++ % 4 === 0);  // a prompt ~1 in 4
      if(!allowPrompt) pieces = pieces.filter(p=>p.type!=='journal prompt');
    }
    if(!pieces.length) pieces = st.pieces.slice();
    // no-repeat: avoid the last id shown for this state
    let pool = pieces.filter(p=>p.id!==_fjLastId[key]);
    if(!pool.length) pool = pieces;
    const piece = pool[Math.floor(Math.random()*pool.length)];
    _fjLastId[key] = piece.id;
    return piece;
  }
  // Returns {type,text} so the existing Today/reflection render stays unchanged.
  function todayReflect(){
    const key = fjStateKey();
    if(_fjCache && _fjCache.key===key) return _fjCache.piece;
    const p = fjPick(key);
    _fjCache = { key, piece:{ type:p.type, text:p.text } };
    return _fjCache.piece;
  }
  // Called on save so the slot reacts to the new check-in (picks a fresh piece).
  function refreshFromJustin(){ _fjCache = null; }
  function winsDone(){
    const last = Store.lastCheckin();
    const sess = Store.sessions();
    return {
      breath: breathDone(),
      checkin: !!(last && sameDay(last.t) && segOf(last.t)===segOf(Date.now())),   // resets each part of day
      practice: sess.some(s => sameDay(s.t)),
    };
  }

  let breathing = false, repeatBreath = false;
  function guideOneBreath(){
    if(breathing) return;
    const ring = $('#tring'), label = $('#breathlabel'), phase = document.getElementById('bh-phase');
    if(!ring) return;
    breathing = true;
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

    const startCycle = ()=>{
      const finish = ()=>{
        breathing = false; repeatBreath = false; markBreath();
        if(phase){ phase.classList.remove('show'); setTimeout(()=>{if(phase)phase.textContent='';},800); }
        if(label) label.textContent = 'one breath taken';
        const tick = document.getElementById('breathtick');
        if(tick){ requestAnimationFrame(()=>{ tick.style.transition='opacity .5s .1s ease'; tick.style.opacity='1'; }); }
        ring.style.transition = 'transform 1.8s ease, opacity 1.8s';
        ring.style.transform  = 'scale(.96)'; ring.style.opacity = '.6';
        const hero = document.querySelector('.breathhero');
        if(hero){ hero.style.transition='opacity 1s ease'; hero.style.opacity='0.48'; }
        setTimeout(()=>{ ring.style.transition=''; ring.style.transform=''; ring.style.opacity=''; ring.style.animation=''; }, 1900);
      };
      if(reduce){ if(phase){phase.textContent='in';phase.classList.add('show');} setTimeout(finish,1200); return; }
      // inhale from rest
      ring.getBoundingClientRect();
      ring.style.transition = 'transform 4s cubic-bezier(.4,0,.5,1), opacity 4s';
      ring.style.transform = 'scale(1.28)'; ring.style.opacity = '.78';
      if(phase){ phase.textContent='in'; phase.classList.add('show'); }
      setTimeout(()=>{
        if(phase) phase.textContent='out';
        ring.style.transition = 'transform 6s cubic-bezier(.4,0,.5,1), opacity 6s';
        ring.style.transform = 'scale(.78)'; ring.style.opacity = '.4';
      }, 4300);
      setTimeout(finish, 10600);
    };

    // Stop ambient animation, glide back to rest, then begin
    ring.style.animation = 'none';
    ring.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
    ring.getBoundingClientRect();
    ring.style.transform = 'scale(.86)'; ring.style.opacity = '.5';
    setTimeout(startCycle, 380);
  }

  const WINS = ['breath','checkin','practice'];
  function winAction(k, reco){
    if(k==='breath') return ()=>{
      if(winsDone().breath && !repeatBreath){
        repeatBreath = true;
        const hero = document.querySelector('.breathhero');
        if(hero){ hero.style.transition='opacity .5s ease'; hero.style.opacity='1'; }
        const lbl = document.getElementById('breathlabel');
        const tickr = document.getElementById('breathtick');
        if(lbl) lbl.textContent = Store.getName() ? 'take one intentional breath, '+Store.getName()+'.' : 'take one intentional breath.';
        if(tickr){ tickr.style.transition='none'; tickr.style.opacity='0'; }
        requestAnimationFrame(()=>guideOneBreath());
      }
      else guideOneBreath();
    };
    if(k==='checkin') return screenCheckin;
    return ()=>launchWeaver(reco);
  }
  function renderWin(k, s){
    const { done, last, reco } = s;
    if(k==='breath'){
      const faded = done && !repeatBreath;
      return `
        <button class="breathhero" data-win="breath"${faded ? ' style="opacity:.48"' : ''}>
          <span class="bh-stage">
            <span class="wc-ring" id="tring" aria-hidden="true"><span class="t-core"></span></span>
            <span class="bh-phase" id="bh-phase" aria-live="polite"></span>
          </span>
          <span class="bh-label-row">
            <span class="bh-check" id="breathcheck" aria-hidden="true"><span class="bh-tick" id="breathtick" style="${faded ? 'opacity:1' : 'opacity:0'}"></span></span>
            <span class="wc-text">
              <span class="wc-kicker">one breath</span>
              <span class="bh-title" id="breathlabel">${faded ? 'one breath taken' : (Store.getName() ? 'take one intentional breath, '+Store.getName()+'.' : 'take one intentional breath.')}</span>
            </span>
          </span>
        </button>`;
    }
    if(k==='checkin'){
      return `
        <button class="wincard ${done?'done':''}" data-win="checkin">
          ${ done ? '<span class="wc-check" aria-hidden="true"></span>' : '<span class="wc-aff" aria-hidden="true"></span>' }
          <span class="wc-text">
            <span class="wc-kicker">check in</span>
            <span class="wc-title">${done ? `${STATE_NAME(last.dom)} · this ${segOf(last.t)}` : 'how are you feeling?'}</span>
          </span>
        </button>`;
    }
    const showSimple = !done && reco.practiceKey !== 'mindfulness';
    return `
      <div class="wincard practice-split ${done?'done':''}">
        <button class="practice-main" id="practice-main-btn">
          ${ done ? '<span class="wc-check" aria-hidden="true"></span>' : '<span class="wc-aff" aria-hidden="true"></span>' }
          <span class="wc-text">
            <span class="wc-kicker">recommended practice</span>
            <span class="wc-title">${Store.practiceLabel(reco.practiceKey)}</span>
            ${!done && reco.reason ? '<span class="wc-reason">'+escapeHtml(reco.reason)+'</span>' : ''}
          </span>
        </button>
        ${showSimple ? '<button class="practice-simple-opt" id="practice-simple-btn">or keep it simple →</button>' : ''}
      </div>`;
  }
  function tabToday(){
    const ab=document.querySelector('.appbar');
    if(ab) ab.innerHTML='<button class="linkbtn" id="set-btn" style="font-size:13px;color:var(--muted);margin-left:auto;padding-right:2px">settings</button>';
    const c = content();
    const last = Store.lastCheckin();
    const reco = Store.recommend();
    const done = winsDone();
    const breathHTML   = renderWin('breath',   {done:done.breath,   last, reco});
    const checkinHTML  = renderWin('checkin',  {done:done.checkin,  last, reco});
    const practiceHTML = renderWin('practice', {done:done.practice, last, reco});
    const r = todayReflect();
    c.innerHTML = `<div class="view today">
      <div class="breath-zone">${breathHTML}</div>
      <div class="bottom-cards">${checkinHTML}${practiceHTML}${r ? `<button class="reflect-row" id="open-refl"><span class="reflect-row-inner"><span class="wc-text"><span class="wc-kicker">${escapeHtml(r.type)}</span><span class="wc-title">where are you, and what helps</span></span><span class="reflect-chevron" aria-hidden="true">→</span></span></button>` : ''}</div>
    </div>`;
    const setBtn=document.querySelector('#set-btn'); if(setBtn) setBtn.onclick=screenSettings;
    const breathBtn  = c.querySelector('[data-win="breath"]');  if(breathBtn)  breathBtn.onclick  = winAction('breath', reco);
    const checkinBtn = c.querySelector('[data-win="checkin"]'); if(checkinBtn) checkinBtn.onclick = winAction('checkin', reco);
    const mainBtn    = c.querySelector('#practice-main-btn');   if(mainBtn)    mainBtn.onclick    = winAction('practice', reco);
    const simpleBtn  = c.querySelector('#practice-simple-btn'); if(simpleBtn)  simpleBtn.onclick  = ()=>launchWeaver({ practiceKey:'mindfulness', skill:null, sense:reco.sense||'touch', silence:8 });
    const reflBtn = c.querySelector('#open-refl'); if(reflBtn) reflBtn.onclick = screenReflection;
  }

  const REFL_SIZES   = [15,17,19,22,26];
  const REFL_SPACING = [[1.5,'compact'],[1.7,'regular'],[2.1,'airy']];
  const LOREM_REFL   = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit.';
  let reflPrefs = {size:2, spacing:1};

  function screenReflection(){
    const r = todayReflect();
    if(!r) return;

    const paras = r.text.split('\n\n')
      .map(p=>`<p class="refl-p">${escapeHtml(p)}</p>`).join('');

    setHTML(`
      <header class="appbar"></header>
      <div class="scroll">
        <div class="refl-page" id="refl-content">
          <p class="eyebrow refl-eyebrow">${escapeHtml(r.type)}</p>
          ${paras}
        </div>
      </div>
      <div class="refl-sheet" id="refl-sheet" aria-hidden="true">
        <div class="refl-controlbar">
          <div class="refl-adjstack">
            <div class="refl-adj">
              <span class="refl-adj-label">size</span>
              <span class="refl-adj-stepper">
                <button class="refl-step" id="refl-sz-dn" aria-label="Smaller">\u2212</button>
                <span class="refl-sval" id="refl-szval"></span>
                <button class="refl-step" id="refl-sz-up" aria-label="Larger">+</button>
              </span>
            </div>
            <div class="refl-adj">
              <span class="refl-adj-label">spacing</span>
              <span class="refl-adj-stepper">
                <button class="refl-step" id="refl-sp-dn" aria-label="Tighter">\u2212</button>
                <span class="refl-sval" id="refl-spval"></span>
                <button class="refl-step" id="refl-sp-up" aria-label="Looser">+</button>
              </span>
            </div>
          </div>
          <button class="refl-nav" id="refl-sheet-back"><span>today</span><span class="refl-nav-arrow"></span></button>
        </div>
      </div>
`);

    function applyPrefs(){
      const el=$('#refl-content');
      if(el){el.style.fontSize=REFL_SIZES[reflPrefs.size]+'px';el.style.lineHeight=REFL_SPACING[reflPrefs.spacing][0];}
      const sv=document.getElementById('refl-szval'); if(sv) sv.textContent=REFL_SIZES[reflPrefs.size]+'px';
      const pv=document.getElementById('refl-spval'); if(pv) pv.textContent=REFL_SPACING[reflPrefs.spacing][1];
      const dn1=document.getElementById('refl-sz-dn'); if(dn1) dn1.disabled=reflPrefs.size===0;
      const up1=document.getElementById('refl-sz-up'); if(up1) up1.disabled=reflPrefs.size===REFL_SIZES.length-1;
      const dn2=document.getElementById('refl-sp-dn'); if(dn2) dn2.disabled=reflPrefs.spacing===0;
      const up2=document.getElementById('refl-sp-up'); if(up2) up2.disabled=reflPrefs.spacing===REFL_SPACING.length-1;
    }
    let reflTimer=null;
    function openSheet(){const s=document.getElementById('refl-sheet');if(s){s.classList.add('open');s.setAttribute('aria-hidden','false');}clearTimeout(reflTimer);reflTimer=setTimeout(closeSheet,4500);}
    function closeSheet(){const s=document.getElementById('refl-sheet');if(s){s.classList.remove('open');s.setAttribute('aria-hidden','true');}clearTimeout(reflTimer);}
    const scrollEl=document.querySelector('#screen .scroll');
    if(scrollEl){scrollEl.addEventListener('pointerdown',()=>openSheet(),{passive:true});}
    const sheetEl=document.getElementById('refl-sheet');
    if(sheetEl){sheetEl.addEventListener('pointerenter',()=>clearTimeout(reflTimer));sheetEl.addEventListener('pointerleave',()=>{reflTimer=setTimeout(closeSheet,4500);});}

    applyPrefs();
    $('#refl-sheet-back').onclick=()=>app('today');
    $('#refl-sz-dn').onclick=()=>{if(reflPrefs.size>0){reflPrefs.size--;applyPrefs();}};
    $('#refl-sz-up').onclick=()=>{if(reflPrefs.size<REFL_SIZES.length-1){reflPrefs.size++;applyPrefs();}};
    $('#refl-sp-dn').onclick=()=>{if(reflPrefs.spacing>0){reflPrefs.spacing--;applyPrefs();}};
    $('#refl-sp-up').onclick=()=>{if(reflPrefs.spacing<REFL_SPACING.length-1){reflPrefs.spacing++;applyPrefs();}};
  }

  function recoCardHTML(reco){
    const label = Store.practiceLabel(reco.practiceKey);
    const extra = [reco.skill, reco.practiceKey!=='mindfulness'?reco.sense:null].filter(Boolean).join(' · ');
    return `
      <div class="reco">
        <div class="head">
          <h3>${label}</h3>
          ${reco.adapted ? '<span class="adapt">tuned to you</span>' : ''}
        </div>
        ${extra?`<p class="meta">${extra}</p>`:''}
        <p class="why">${escapeHtml(reco.reason)}</p>
        <button class="btn" id="startreco">Begin this practice</button>
      </div>`;
  }
  function wireReco(reco){ const b=$('#startreco'); if(b) b.onclick=()=>launchWeaver(reco); }

  function trendHTML(){
    const cs = Store.checkins();
    if(cs.length < 2) return '';
    const recent = cs.slice(-10);
    const bars = recent.map(c=>{
      const h = 16 + Math.round(c.v*30); // height reads "safety present"
      return `<div class="bar" style="height:${h}px;background:${STATE_COLOR(c.dom)}"></div>`;
    }).join('');
    const tr = Store.trend();
    const dirTxt = tr.dir==='rising' ? 'safety has been rising lately.' : tr.dir==='falling' ? 'safety has dipped lately. worth being gentle with yourself.' : 'fairly steady lately.';
    return `
      <p class="eyebrow section-label">lately</p>
      <div class="trendstrip">${bars}</div>
      <p class="trend-cap">${dirTxt} <button class="linkbtn" id="seeall" style="font-size:13px">see your current over time →</button></p>`;
  }

// ---------------------------------------------------------------- CHECK-IN
  function screenCheckin(){
    clearFigures(); document.body.classList.remove('in-practice');
    root.innerHTML = `
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));

    let v=18, s=14, d=12;
    $('#content').innerHTML = `<div class="view checkin-view">
        <div class="checkin-top">
          <p class="eyebrow" style="padding:0 22px">check in</p>
          <h2 style="margin:8px 0 0;padding:0 22px">how is your system showing up in this moment?</h2>
          <div class="checkin-figure"><div id="cfig"></div></div>
        </div>
        <div class="checkin-bottom">
          <div class="sliders">
            ${sliderHTML('v','safety','ventral · settled, connected','r-v',v)}
            ${sliderHTML('sym','fight or flight','sympathetic · charged, mobilized','r-sym',s)}
            ${sliderHTML('dor','shutdown','dorsal · heavy, far away','r-dor',d)}
          </div>
          <button class="btn block" id="save" style="margin-top:20px">Save</button>
        </div>
      </div>`;

    const fig = mountFigure($('#cfig'), { flow:true, labels:false });
    const amt = x => x<12?'barely':x<35?'a little':x<65?'some':x<88?'a lot':'fully';
    function refresh(){
      fig.set({v:v/100,sym:s/100,dor:d/100});
      $('#av').textContent=amt(v); $('#asym').textContent=amt(s); $('#ador').textContent=amt(d);
    }
    bindSlider('v', val=>{v=val;refresh();});
    bindSlider('sym', val=>{s=val;refresh();});
    bindSlider('dor', val=>{d=val;refresh();});
    refresh();
    $('#save').onclick = ()=>{
      Store.addCheckin({ v:v/100, sym:s/100, dor:d/100 });
      refreshFromJustin();   // react to the new state in the "From Justin" slot
      app('current');
    };
  }
  function sliderHTML(key,name,sub,cls,val){
    return `<div class="slider">
      <div class="top"><span class="nm">${name}<span class="sub">${sub}</span></span><span class="amt" id="a${key}"></span></div>
      <input type="range" class="${cls}" id="sl-${key}" min="0" max="100" value="${val}">
    </div>`;
  }
  function bindSlider(key,fn){ const el=$('#sl-'+key); el.addEventListener('input',()=>fn(+el.value)); }

  // ---------------------------------------------------------------- CURRENT OVER TIME
  let playTimer=null;
  const PERIODS=[{key:'7',label:'7 days',days:7},{key:'30',label:'30 days',days:30},{key:'90',label:'90 days',days:90},{key:'all',label:'all time',days:null}];
  let activePeriod='all';
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

  function tabCurrent(){
    const c = content();
    const allCs = Store.checkins();
    if(allCs.length < 2){
      c.innerHTML = `<div class="view"><div class="empty">
        <p class="lede">your current over time will live here.</p>
        <p class="muted">check in a couple of times and you will start to see your system move.</p>
        <button class="btn" id="goci">Check in</button></div></div>`;
      $('#goci').onclick = screenCheckin; return;
    }

    c.innerHTML = `
      <div class="view curr-view">
        <div class="curr-top">
          <p class="eyebrow" style="padding:0 22px">your polyvagal current</p>
          <div class="timeline-figure"><div id="tlfig"></div></div>
        </div>
        <div class="curr-bottom">
          <div class="playbar">
            <button class="playbtn" id="play" aria-label="Play"><svg viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 Z"/></svg></button>
            <div class="scrub"><input type="range" id="scrub" min="0" max="0" value="0"></div>
          </div>
          <div class="period-pills" id="period-pills">${PERIODS.map(p=>`<button class="period-pill${activePeriod===p.key?' on':''}" data-period="${p.key}">${p.label}</button>`).join('')}</div>
          <div id="stats-area"></div>
          <button class="btn quiet block" id="ci-top" style="margin-top:16px">new check in</button>
        </div>
      </div>`;

    const fig = mountFigure($('#tlfig'), { flow:true, labels:false });
    let cs = filterByPeriod(allCs, PERIODS.find(p=>p.key===activePeriod)?.days||null);
    let paced = groupByDay(cs);

    function rebind(){
      cs = filterByPeriod(allCs, PERIODS.find(p=>p.key===activePeriod)?.days||null);
      paced = groupByDay(cs);
      const scrub=$('#scrub');
      scrub.max = Math.max(0,paced.length-1);
      scrub.value = Math.max(0,paced.length-1);
      c.querySelectorAll('.period-pill').forEach(b=>b.classList.toggle('on',b.dataset.period===activePeriod));
      $('#stats-area').innerHTML = statsHTML(cs);
      const statsToggle=$('#p-stats-toggle');
      if(statsToggle) statsToggle.onclick=()=>{
        const body=$('#p-stats-body');
        const open=body.classList.toggle('open');
        statsToggle.setAttribute('aria-expanded',open?'true':'false');
      };
      if(paced.length) show(paced.length-1);
    }

    const scrub = $('#scrub');
    function show(i){
      if(!paced[i]) return;
      fig.set({v:paced[i].v,sym:paced[i].sym,dor:paced[i].dor});
      scrub.value = i;
    }

    rebind();

    c.querySelectorAll('.period-pill').forEach(b=>b.addEventListener('click',()=>{
      activePeriod=b.dataset.period;
      stopPlay();
      rebind();
    }));

    const ciTop=$('#ci-top'); if(ciTop) ciTop.onclick=screenCheckin;

    c.addEventListener('click', e=>{
      const btn=e.target.closest('[data-state-detail]');
      if(btn) screenStateDetail(btn.dataset.stateDetail);
    });
    scrub.addEventListener('input',()=>{ stopPlay(); show(+scrub.value); });
    $('#play').onclick = ()=>{
      if(playTimer){ stopPlay(); return; }
      let i = (+scrub.value >= paced.length-1) ? 0 : +scrub.value;
      $('#play').innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.4" height="14" rx="2"/><rect x="13.6" y="5" width="4.4" height="14" rx="2"/></svg>';
      show(i);
      playTimer = setInterval(()=>{
        i++;
        if(i>paced.length-1){ stopPlay(); return; }
        show(i);
      }, 1100);
    };
    function stopPlay(){ if(playTimer){ clearInterval(playTimer); playTimer=null; } const p=$('#play'); if(p) p.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 Z"/></svg>'; }
  }
  const STATE_DETAIL = {
    safety:      { headline:'safety',        color:'#F4D58D', about:'ventral vagal. your system feels open, connected, and grounded. not the absence of difficulty — the presence of enough safety to meet it.', whenDrops: null },
    fightflight: { headline:'fight or flight',color:'#E89B9B', about:'sympathetic activation. mobilized energy moving through your body. this is not a malfunction — it is ancient protection doing its job.', whenDrops:'movement helps discharge the activation. a walk, deliberate breathing, slow shaking. the energy needs somewhere to go.', practice:{practiceKey:'anchoring',sense:'movement',silence:8} },
    shutdown:    { headline:'shutdown',       color:'#A3C0DD', about:'dorsal vagal. your system has pulled the oldest brake — heavy, flat, far away. it kept you safe when nothing else could.', whenDrops:'warmth and slow, predictable contact help. a warm drink, a blanket, a familiar voice. co-regulation — being near someone safe — is often the most direct path back.', practice:{practiceKey:'mindfulness',sense:'touch',silence:8} },
    play:        { headline:'play',           color:'#E8A871', about:'ventral and sympathetic together. there is safety here with charge moving through it. your system can be activated and regulated at the same time.', whenDrops:'if the ventral drops and the sympathetic stays, watch for the shift toward fight or flight. anchoring through your senses helps keep the safety online.', practice:{practiceKey:'anchoring',sense:'touch',silence:8} },
    stillness:   { headline:'stillness',      color:'#9FC498', about:'ventral and dorsal together — resting in safety. your system is calm enough to be still. this is a deeply regulated state.', whenDrops:'if the ventral drops and the dorsal stays, stillness can slide toward shutdown. slow movement or gentle sensory contact helps hold the ventral online.', practice:{practiceKey:'anchoring',sense:'sound',silence:8} },
    freeze:      { headline:'freeze',         color:'#B89AC4', about:'sympathetic and dorsal together. a lot of activation with the brakes on at the same time. this is one of the most uncomfortable states, and one of the most common.', whenDrops:'you cannot think your way out of freeze. the body needs to complete something. pendulation — moving attention gently between discomfort and ease — is one of the most reliable tools.', practice:{practiceKey:'most',skill:'pendulation',sense:'touch',silence:8} },
  };

  function screenStateDetail(key){
    const d = STATE_DETAIL[key] || STATE_DETAIL.safety;
    clearFigures(); document.body.classList.remove('in-practice');
    root.innerHTML = `
      <header class="appbar">
        <button class="backbtn" id="sd-back">current</button>
      </header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    $('#sd-back').onclick = ()=>app('current');
    $('#content').innerHTML = `<div class="view">
        <span class="dot" style="background:${escapeHtml(d.color)};width:12px;height:12px;display:inline-block;margin-bottom:8px;border-radius:50%"></span>
        <h2 style="margin:4px 0 18px">${escapeHtml(d.headline)}</h2>
        <p class="lede" style="margin-bottom:20px">${escapeHtml(d.about)}</p>
        ${d.whenDrops ? `
        <p class="eyebrow" style="margin:0 0 10px">when safety drops</p>
        <p style="font-size:15px;line-height:1.6;color:var(--ink-80);margin-bottom:24px">${escapeHtml(d.whenDrops)}</p>
        ${d.practice ? `<button class="btn block" id="sd-practice">begin a practice for this</button>` : ''}
        ` : ''}
      </div>`;
    if(d.practice){
      const pb = $('#sd-practice');
      if(pb) pb.onclick = ()=>launchWeaver(d.practice);
    }
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
    const SEGS=['morning','afternoon','evening'];
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
            <span class="dot" style="background:${STATE_COLOR(topKey)}"></span>
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
            <span class="dot" style="background:${STATE_COLOR(s.key)}"></span>
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
    return `<div class="statelegend">${present.map(k=>`<span class="it"><span class="dot" style="background:${STATE_COLOR(k)}"></span>${STATE_NAME(k)}</span>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------- PRACTICE
  // The player (player.html) is embedded full-bleed with no top chrome — the bottom
  // tab bar is the only navigation, and it hides once a session is playing. The
  // practice tab opens the player's own 4-option chooser (incl. "More meditations").
  function practiceShell(src, reco){
    currentTab = 'practice';
    setHTML(`
      <div class="weaver-wrap"><iframe class="weaver-frame" id="weaver" src="${src}" title="Guided practice"></iframe></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`);
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    window._pendingReco = reco || Store.recommend();   // so a completed session still shows the “you came back” screen
  }
  // ---------------------------------------------------------------- PRACTICE CHOOSER DATA
  const P_OPTS=[
    {key:'mindfulness',title:'Simple mindfulness',       sub:'the gentlest — a calm place to start'},
    {key:'anchoring',  title:'Connect with safety',      sub:'settling into safety through your senses'},
    {key:'most',       title:'Practice self-regulation', sub:'the deepest — meeting what is hard'},
    {key:'more',       title:'More meditations',         sub:'standalone guided sessions'},
  ];
  const P_SENSES=['touch','sound','sight','movement','imagination'];
  const P_SKILLS=[['imagery','imagery & invitation'],['obstacles','obstacles'],['balancing','balancing'],['pendulation','pendulation']];
  const P_SILENCE=[[4,'a little'],[8,'some'],[12,'a lot']];
  const P_MEDS=[
    {id:'uye',                 title:'Use Your Ears',       est:'~10 min', sub:'grounding through sound'},
    {id:'eye',                 title:'Use Your Eyes',       est:'~9 min',  sub:'grounding through sight'},
    {id:'daily-dysregulation', title:'Daily Dysregulation', est:'~16 min', sub:'meeting a recent activation'},
    {id:'outside-the-cave',    title:'Outside the Cave',    est:'~32 min', sub:'a deeper imagery journey'},
  ];
  let pState=null;

  function tabPractice(){
    pState={key:null,sense:'touch',skill:'imagery',silence:8,med:null};
    renderPracticeChooser();
  }

  function renderPracticeChooser(animateIn){
    const c=content();
    const {key,sense,skill,silence,med}=pState;

    const selCard=(o,dataAttr,selected)=>`
      <button class="wincard p-opt${selected?' p-sel':''}" ${dataAttr}>
        <span class="wc-text">
          <span class="wc-title">${escapeHtml(o.title)}</span>
          <span class="wc-reason">${escapeHtml(o.sub)}</span>
        </span>
      </button>`;

    const chip=(lbl,val,attr,on)=>
      `<button class="p-chip${on?' on':''}" data-${attr}="${escapeHtml(String(val))}">${escapeHtml(lbl)}</button>`;

    const refineHTML=(key&&key!=='more')?`
      <div class="p-refine">
        ${key!=='mindfulness'?`<div class="p-rgroup">
          <p class="eyebrow" style="margin:0 0 5px">anchor with</p>
          <div class="p-chips">${P_SENSES.map(s=>chip(s,s,'sense',s===sense)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup">
          <p class="eyebrow" style="margin:0 0 5px">skill</p>
          <div class="p-chips">${P_SKILLS.map(([v,l])=>chip(l,v,'skill',v===skill)).join('')}</div>
        </div>`:''}
        <div class="p-rgroup">
          <p class="eyebrow" style="margin:0 0 5px">silence</p>
          <div class="p-chips">${P_SILENCE.map(([v,l])=>chip(l,v,'sil',v===silence)).join('')}</div>
        </div>
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

    c.innerHTML=`<div class="view p-view">
      <div class="p-top">
        <p class="eyebrow">practice</p>
      </div>
      <div class="p-bottom">
        ${key?'<button class="backbtn p-back" id="p-back">back</button>':''}
        <div class="p-opts" id="p-opts-list">
          ${P_OPTS.map(o=>selCard(o,`data-pkey="${o.key}"`,key===o.key)).join('')}
        </div>
        ${refineHTML}${medsHTML}
        ${key?`<button class="btn block" id="p-begin" style="margin-top:16px"${canBegin?'':' disabled'}>Begin</button>`:''}
      </div>
    </div>`;

    if(key){const opts=document.getElementById('p-opts-list');if(opts){if(animateIn)requestAnimationFrame(()=>opts.classList.add('has-sel'));else opts.classList.add('has-sel');}}

    c.querySelectorAll('[data-pkey]').forEach(b=>b.onclick=()=>{const fresh=!pState.key;pState.key=pState.key===b.dataset.pkey?null:b.dataset.pkey;pState.med=null;renderPracticeChooser(fresh&&!!pState.key);});
    c.querySelectorAll('[data-pmed]').forEach(b=>b.onclick=()=>{
      pState.med=b.dataset.pmed;
      c.querySelectorAll('[data-pmed]').forEach(r=>r.classList.toggle('on',r.dataset.pmed===pState.med));
      const bb=$('#p-begin'); if(bb){bb.disabled=false;bb.removeAttribute('disabled');}
    });
    c.querySelectorAll('[data-sense]').forEach(b=>b.onclick=()=>{
      pState.sense=b.dataset.sense;
      c.querySelectorAll('[data-sense]').forEach(r=>r.classList.toggle('on',r.dataset.sense===pState.sense));
    });
    c.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{
      pState.skill=b.dataset.skill;
      c.querySelectorAll('[data-skill]').forEach(r=>r.classList.toggle('on',r.dataset.skill===pState.skill));
    });
    c.querySelectorAll('[data-sil]').forEach(b=>b.onclick=()=>{
      pState.silence=+b.dataset.sil;
      c.querySelectorAll('[data-sil]').forEach(r=>r.classList.toggle('on',r.dataset.sil===String(pState.silence)));
    });

    const surpriseBtn=$('#p-surprise');
    if(surpriseBtn)surpriseBtn.onclick=()=>{
      const rskill=P_SKILLS[Math.floor(Math.random()*P_SKILLS.length)][0];
      const rsense=P_SENSES[Math.floor(Math.random()*P_SENSES.length)];
      const rsilence=P_SILENCE[Math.floor(Math.random()*P_SILENCE.length)][0];
      practiceShell('player.html?'+new URLSearchParams({embed:'1',autostart:'1',practice:'most',sense:rsense,silence:String(rsilence),skill:rskill}).toString(),{practiceKey:'most',sense:rsense,skill:rskill,silence:rsilence});
    };

    const backBtn=$('#p-back'); if(backBtn) backBtn.onclick=()=>{pState.key=null;pState.med=null;renderPracticeChooser();};
    const beginBtn=$('#p-begin');
    if(beginBtn&&canBegin)beginBtn.onclick=()=>{
      const {key,sense,skill,silence,med}=pState;
      let src;
      if(key==='more'){
        src='player.html?embed=1&autostart=1&more=1&med='+encodeURIComponent(med);
      }else{
        const ps={embed:'1',autostart:'1',practice:key,sense,silence:String(silence)};
        if(key==='most')ps.skill=skill;
        src='player.html?'+new URLSearchParams(ps).toString();
      }
      practiceShell(src,{practiceKey:key,sense,skill,silence});
    };
  }

  // Today's "a practice for now" row → one-tap autostart of the recommended practice,
  // same full-bleed shell (tab bar for nav, no top header).
  function launchWeaver(reco){
    const params = { embed:'1', autostart:'1', practice:reco.practiceKey, sense:reco.sense||'touch', silence:String(reco.silence||8) };
    if(reco.skill) params.skill = reco.skill;
    practiceShell('player.html?'+new URLSearchParams(params).toString(), reco);
  }

  // weaver -> app messages
  window.addEventListener('message', (e)=>{
    const m = e.data || {};
    if(m.type !== 'snb-weaver') return;
    if(m.event === 'screen'){ document.body.classList.toggle('in-practice', m.screen==='player'); return; }
    const reco = window._pendingReco;
    if(!reco) return;
    if(m.event === 'complete'){ logSession(reco, true, false, m.minutes); app('today'); }
    else if(m.event === 'exit'){ logSession(reco, false, true, m.minutes); app('today'); }
  });
  function logSession(reco, completed, endedEarly, minutes){
    if(window._sessionLogged) return; window._sessionLogged=true;
    Store.addSession({ practiceKey:reco.practiceKey, skill:reco.skill, sense:reco.sense, silence:reco.silence,
      completed:!!completed, endedEarly:!!endedEarly, minutes:minutes||null, domBefore:reco.domBefore||null });
    setTimeout(()=>{ window._sessionLogged=false; }, 1000);
  }
  function afterSession(reco, completed){
    setHTML(`
      <div class="view gate">
        <div class="gate-body" style="text-align:center">
          <h1 style="margin:0 0 26px">you came back.</h1>
          <button class="endlink lead" id="post">how are you feeling? →</button>
          <button class="endlink" id="home">back to today</button>
        </div>
      </div>`);
    $('#post').onclick = screenCheckin;
    $('#home').onclick = ()=>app('today');
  }

  // ---------------------------------------------------------------- YOU
  function screenSettings(){
    clearFigures(); document.body.classList.remove('in-practice');
    currentTab='current';
    root.innerHTML = `
      <header class="appbar">
        <button class="backbtn" id="set-back">you</button>
      </header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    $('#set-back').onclick=()=>app('current');
    const u=Store.user(); const L=Store.learned(); const cs=Store.checkins();
    $('#content').innerHTML = `
      <div class="view">
        <p class="eyebrow" style="margin:0">settings</p>
        <div class="stats">
          <div class="stat"><span class="big">${cs.length}</span><span class="lbl">check-ins</span></div>
          <div class="stat"><span class="big">${L.sessionsDone}</span><span class="lbl">practices</span></div>
        </div>
        ${L.sessionsDone>0 ? `<p class="muted" style="font-size:14.5px;margin-top:4px">the app is learning your patterns${L.favPractice?`. lately you return to <b style="font-weight:500;color:var(--ink-80)">${Store.practiceLabel(L.favPractice)}</b>`:''}${L.favSense?`, anchored through <b style="font-weight:500;color:var(--ink-80)">${L.favSense}</b>`:''}.</p>`:''}
        <div class="hr"></div>
        <div class="row"><span class="k">name</span><input class="name-input" id="nm-val" type="text" value="${escapeHtml(Store.getName())}" placeholder="add your name"></div>
        <div class="row"><span class="k">account</span><span class="val" style="font-weight:400">${escapeHtml(u.email||'on this device')}</span></div>
        <div class="row"><span class="k">sync</span><span class="val" style="font-weight:400">${Store.cloud()?'across your devices':'this device only'}</span></div>
        <div class="row"><span class="k">your check-ins</span><button class="linkbtn" id="export">export as a file</button></div>
        <div class="hr"></div>
        <button class="linkbtn" id="signout">sign out</button>
        <div style="height:8px"></div>
        <button class="linkbtn" id="reset" style="color:var(--muted)">reset my data</button>
      </div>`;
    const nmVal = $('#nm-val'); if(nmVal) nmVal.addEventListener('change', e=>{ Store.setName(e.target.value.trim()); });
    $('#export').onclick = ()=>{
      const blob = new Blob([JSON.stringify(Store.checkins(),null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='my-checkins.json'; a.click();
    };
    $('#signout').onclick = async ()=>{ await Store.signOut(); currentTab='today'; route(); };
    $('#reset').onclick = async ()=>{ if(confirm('Clear all your check-ins and practices?')){ await Store.reset(); try{ Object.keys(localStorage).filter(k=>k.startsWith('snb_breath_')).forEach(k=>localStorage.removeItem(k)); }catch(e){} app('today'); } };
  }

  // ---------------------------------------------------------------- delegated nav (trend "see all")
  document.addEventListener('click',(e)=>{ if(e.target && e.target.id==='seeall'){ app('current'); } });

  // ---------------------------------------------------------------- utils
  function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function relTime(t){ const m=Math.round((Date.now()-t)/60000); if(m<1)return 'just now'; if(m<60)return m+' min ago'; const h=Math.round(m/60); if(h<24)return h+'h ago'; const d=Math.round(h/24); return d+'d ago'; }

  Store.init(route);
})();
