/* ============================================================================
   Reader — the personal blog (Roadmap essential #2, spec locked 2026-09-30:
   snb-business Projects/App Designer/Reader-Rework/READER-BLOG-SPEC.md).

   A post for every day, an issue every Sunday, and a month, season and year post
   on the evening of each period's last day — all on the CALENDAR. A period with no
   check-ins gets no post (Justin: "If not, they don't get that day and season").

   NUMBERS: every number is read from the MARGIN (Justin, 2026-09-30: "the math should
   be margin-based"). One check-in has "more safety than defense" exactly when its
   margin >= 0 (PVCurrent.dominantOf(v,s,d).margin — the same number that names the
   state, so the words and the state names can never disagree). Percentages only
   from 10+ check-ins; under that, words. Never X of N, never a baseline as a %.

   COPY: plain, natural, about an 8th grade reading level (IN-APP-COPY.md). No
   "today", no metaphors, sentence case, no em dashes, mirror never grade. Every
   string here is a draft (🖊) for Justin.

   Deterministic: the same data always builds the same words (variants are chosen by
   a hash of the period key), so two devices agree and a frozen post never changes.
   Exposes window.Reader (markSVG too). Pure where it can be: compute(), build*() take data in.
   ========================================================================== */
(function (global) {
  'use strict';

  const DAY = 864e5;
  const WEEK_HOUR = 8;      // the Sunday issue: 8 am local (🖊 proposed)
  const EVE_HOUR = 18;      // month / season / year: 6 pm local on the last day

  // ---------------------------------------------------------------- calendar
  const sod = t => { const d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
  const atHour = (t, h) => { const d = new Date(t); d.setHours(h,0,0,0); return d.getTime(); };
  const weekStart = t => { const d = new Date(t); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); };
  const monthStart = t => { const d = new Date(t); d.setHours(0,0,0,0); d.setDate(1); return d.getTime(); };
  const addMonths = (t, n) => { const d = new Date(t); d.setHours(0,0,0,0); d.setDate(1); d.setMonth(d.getMonth() + n); return d.getTime(); };
  const quarterStart = t => { const d = new Date(t); d.setHours(0,0,0,0); d.setDate(1); d.setMonth(Math.floor(d.getMonth()/3)*3); return d.getTime(); };
  const yearStart = t => { const d = new Date(t); d.setHours(0,0,0,0); d.setMonth(0, 1); return d.getTime(); };
  const pad = n => (n < 10 ? '0' : '') + n;
  const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); };

  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  // seasons follow the calendar quarter; named for the northern hemisphere unless the
  // person's time zone sits south of the equator
  const SOUTH = /^(Australia|Antarctica|Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Efate))|^America\/(Argentina|Sao_Paulo|Santiago|Montevideo|Asuncion|La_Paz|Lima)|^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Lusaka|Maseru|Mbabane)|^Indian\/(Mauritius|Reunion)/;
  function isSouth(){ try{ return SOUTH.test(Intl.DateTimeFormat().resolvedOptions().timeZone || ''); }catch(e){ return false; } }
  function seasonName(qs){
    const q = Math.floor(new Date(qs).getMonth()/3);
    const n = ['winter','spring','summer','fall'];
    return isSouth() ? n[(q+2)%4] : n[q];
  }
  function seasonMonths(qs){ const m = new Date(qs).getMonth(); return MONTHS[m] + ' to ' + MONTHS[m+2]; }

  // the five kinds of period: start, end of the window, release time, key, labels
  const PERIOD = {
    week(ws){ const end = addDays(ws, 7); return { kind:'week', start:ws, end, release: atHour(end, WEEK_HOUR), key:'w'+ymd(ws),
      label:'Week of ' + MONTHS[new Date(ws).getMonth()] + ' ' + new Date(ws).getDate() }; },
    month(ms){ const last = addDays(addMonths(ms,1), -1), rel = atHour(last, EVE_HOUR); const d = new Date(ms);
      return { kind:'month', start:ms, end:rel, release:rel, key:'m'+d.getFullYear()+'-'+pad(d.getMonth()+1), label:MONTHS[d.getMonth()], name:MONTHS[d.getMonth()] }; },
    season(qs){ const last = addDays(addMonths(qs,3), -1), rel = atHour(last, EVE_HOUR); const d = new Date(qs);
      return { kind:'season', start:qs, end:rel, release:rel, key:'q'+d.getFullYear()+'-'+(Math.floor(d.getMonth()/3)+1),
               label:'Your ' + seasonName(qs), name:seasonName(qs), months:seasonMonths(qs) }; },
    year(ys){ const last = addDays(addMonths(ys,12), -1), rel = atHour(last, EVE_HOUR); const y = new Date(ys).getFullYear();
      return { kind:'year', start:ys, end:rel, release:rel, key:'y'+y, label:'Your ' + y, name:String(y) }; }
  };
  // the most recent released period of each kind, at time `now`
  function latestReleased(kind, now){
    if(kind === 'week'){ let ws = addDays(weekStart(now), -7); if(PERIOD.week(ws).release > now) ws = addDays(ws, -7); return PERIOD.week(ws); }
    if(kind === 'month'){ let ms = monthStart(now); if(PERIOD.month(ms).release > now) ms = addMonths(ms, -1); return PERIOD.month(ms); }
    if(kind === 'season'){ let qs = quarterStart(now); if(PERIOD.season(qs).release > now) qs = addMonths(qs, -3); return PERIOD.season(qs); }
    let ys = yearStart(now); if(PERIOD.year(ys).release > now) ys = addMonths(ys, -12); return PERIOD.year(ys);
  }
  const prevPeriod = p => p.kind==='week' ? PERIOD.week(addDays(p.start,-7)) : p.kind==='month' ? PERIOD.month(addMonths(p.start,-1))
                        : p.kind==='season' ? PERIOD.season(addMonths(p.start,-3)) : PERIOD.year(addMonths(p.start,-12));

  // ---------------------------------------------------------------- reads (margin)
  const segOf = t => { const h = new Date(t).getHours(); return h<5?'late':h<12?'morning':h<17?'afternoon':h<22?'evening':'late'; };
  const SEG_WORD = { morning:'morning', afternoon:'afternoon', evening:'evening', late:'late night' };
  const SEG_PLURAL = { morning:'mornings', afternoon:'afternoons', evening:'evenings', late:'late nights' };
  const SAFE_SIDE = { safety:1, play:1, stillness:1 };
  const NAME = { safety:'safety', play:'play and motivation', stillness:'stillness', fightflight:'flight/fight', freeze:'freeze', shutdown:'shutdown' };

  function read(c){
    if(!c || typeof c.v !== 'number') return null;
    try{
      const r = global.PVCurrent.dominantOf(c.v, c.sym||0, c.dor||0);
      return { t:c.t, m:r.margin, key:r.key, safe:r.margin >= 0, c };
    }catch(e){ return null; }
  }
  function readsIn(cs, s, e){
    return (cs||[]).filter(c => c && typeof c.t==='number' && c.t>=s && c.t<e).map(read).filter(Boolean).sort((a,b)=>a.t-b.t);
  }
  const mean = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
  function topKey(rs){ const n={}; rs.forEach(r=>n[r.key]=(n[r.key]||0)+1); const o=Object.keys(n).sort((a,b)=>n[b]-n[a]); return o.length?{ key:o[0], share:n[o[0]]/rs.length, second:o[1]||null, secondShare:o[1]?n[o[1]]/rs.length:0 }:null; }

  // comebacks inside a window: after a check-in with more defense than safety, how
  // many check-ins until one has more safety than defense (margin walk, store.recovery's rule)
  function comebacks(rs){
    const gaps = []; let i = 0;
    while(i < rs.length){
      if(!rs[i].safe){ let j=i, steps=0, found=false; while(j<rs.length){ if(rs[j].safe){ found=true; break; } j++; steps++; } if(found) gaps.push(steps); i=j; }
      else i++;
    }
    return gaps.length ? { avg: mean(gaps), n: gaps.length } : null;
  }

  // one practice, plainly: did safety go up inside it, did intensity come down
  function practiceRead(s, store){
    const nums = a => (Array.isArray(a)?a:[]).filter(v=>typeof v==='number');
    const sr = nums(s.safetyReadings), ir = nums(s.intensityReadings);
    const d = s && s.details;
    const anchor = (d && Array.isArray(d.anchorsChosen) && d.anchorsChosen.length) ? d.anchorsChosen[d.anchorsChosen.length-1].anchor : (s.sense||null);
    let best = false; try{ best = !!(store && store.isBestOutcome && store.isBestOutcome(s)); }catch(e){}
    return { t:s.t, day:new Date(s.t).getDay(), seg:segOf(s.t), key:s.practiceKey, anchor,
             s0: sr.length>=2 ? sr[0] : null, s1: sr.length>=2 ? sr[sr.length-1] : null,
             rose: sr.length>=2 ? sr[sr.length-1] > sr[0] : null,
             i0: ir.length>=2 ? ir[0] : null, i1: ir.length>=2 ? ir[ir.length-1] : null,
             eased: ir.length>=2 ? ir[ir.length-1] < ir[0] : null, best };
  }

  // ---------------------------------------------------------------- facts
  // Everything a post can say about one period, from the margin. data = { checkins, sessions, store }
  function compute(p, data){
    const cs = data.checkins || [], ss = data.sessions || [], store = data.store || null;
    const rs = readsIn(cs, p.start, p.end);
    const n = rs.length;
    const f = { p, n, rs };
    if(!n) return f;
    const safe = rs.filter(r=>r.safe), def = rs.filter(r=>!r.safe);
    f.nSafe = safe.length; f.share = safe.length/n; f.meanM = mean(rs.map(r=>r.m));
    f.defFlavor = def.length ? topKey(def) : null;
    f.safeFlavor = safe.length ? topKey(safe) : null;
    // by day
    const byDay = {};
    rs.forEach(r=>{ const k = sod(r.t); (byDay[k] = byDay[k] || []).push(r); });
    f.days = Object.keys(byDay).map(Number).sort((a,b)=>a-b).map(k=>({ t:k, rs:byDay[k], meanM:mean(byDay[k].map(r=>r.m)), share: byDay[k].filter(r=>r.safe).length/byDay[k].length }));
    f.days.forEach(d=>{ d.lean = d.meanM >= 0 ? 'safe' : 'def'; });
    // the longest run of back-to-back calendar days that leaned defense (2+ days)
    let best=null, run=[];
    f.days.forEach((d,i)=>{
      const contiguous = run.length && sod(addDays(run[run.length-1].t,1)) === d.t;
      if(d.lean==='def'){ if(run.length && !contiguous) run=[]; run.push(d); if(!best || run.length>best.length) best=run.slice(); }
      else run=[];
    });
    if(best && best.length>=2){
      const endT = addDays(best[best.length-1].t, 1);
      const back = rs.find(r=>r.t>=endT && r.safe) || null;
      const before = rs.filter(r=>r.t<best[0].t);
      f.stretch = { from:best[0].t, to:best[best.length-1].t, days:best.length,
                    flavor: topKey([].concat.apply([], best.map(d=>d.rs.filter(r=>!r.safe)))),
                    back: back ? { t:back.t, day:new Date(back.t).getDay(), seg:segOf(back.t) } : null,
                    startedSafe: before.length ? before.filter(r=>r.safe).length/before.length >= 0.5 : null };
    }
    // dayparts (3+ check-ins each)
    const segs = {}; rs.forEach(r=>{ const s=segOf(r.t); (segs[s]=segs[s]||[]).push(r); });
    f.segs = {}; Object.keys(segs).forEach(s=>{ if(segs[s].length>=3) f.segs[s] = { n:segs[s].length, share: segs[s].filter(r=>r.safe).length/segs[s].length, meanM: mean(segs[s].map(r=>r.m)) }; });
    // weekdays (2+ check-ins each)
    const wd = {}; rs.forEach(r=>{ const d=new Date(r.t).getDay(); (wd[d]=wd[d]||[]).push(r); });
    f.weekdays = {}; Object.keys(wd).forEach(d=>{ if(wd[d].length>=2) f.weekdays[d] = { n:wd[d].length, share: wd[d].filter(r=>r.safe).length/wd[d].length, meanM: mean(wd[d].map(r=>r.m)) }; });
    // comebacks
    f.comebacks = comebacks(rs);
    // practices
    const sess = ss.filter(s=>s && s.completed && typeof s.t==='number' && s.t>=p.start && s.t<p.end).sort((a,b)=>a.t-b.t);
    f.practices = sess.map(s=>practiceRead(s, store));
    f.minutes = sess.reduce((a,s)=>a+(s.minutes||0),0);
    const prior = ss.filter(s=>s && s.completed && typeof s.t==='number' && s.t<p.start);
    const priorBest = prior.some(s=>{ try{ return store && store.isBestOutcome && store.isBestOutcome(s); }catch(e){ return false; } });
    const firstBest = f.practices.find(x=>x.best);
    f.firstBestEver = (!priorBest && firstBest && prior.length>=1) ? firstBest : null;
    // before/after check-ins around a practice (bound by session_id + phase)
    const bound = {}; cs.forEach(c=>{ if(c && c.session_id && c.phase){ const b=bound[c.session_id]=bound[c.session_id]||{}; if(!b[c.phase]) b[c.phase]=c; } });
    f.pairs = sess.map(s=>{ const b=s.id?bound[s.id]:null; if(!b||!b.before||!b.after) return null; const x=read(b.before), y=read(b.after); return (x&&y)?{ t:s.t, d:y.m-x.m, afterSafe:y.safe }:null; }).filter(Boolean);
    // anchors: how safety moved inside the practices that used each one
    const an = {}; f.practices.forEach(x=>{ if(!x.anchor || x.rose==null) return; const a=an[x.anchor]=an[x.anchor]||{ n:0, rose:0, lift:0 }; a.n++; if(x.rose) a.rose++; a.lift += (x.s1-x.s0); });
    f.anchors = Object.keys(an).map(k=>({ anchor:k, n:an[k].n, rose:an[k].rose, lift:an[k].lift/an[k].n })).sort((a,b)=>b.lift-a.lift);
    // emotions named in practices
    const em = { intents:{}, surfaced:{}, n:0 };
    sess.forEach(s=>{ if(s.emotionIntent){ em.intents[s.emotionIntent]=(em.intents[s.emotionIntent]||0)+1; } String(s.emotionSurfaced||'').split(',').map(x=>x.trim()).filter(Boolean).forEach(k=>{ em.surfaced[k]=(em.surfaced[k]||0)+1; em.n++; }); });
    f.emotions = em.n ? em : null;
    // weeks inside a longer period (share + n), for the month / season / year pictures
    if(p.kind !== 'week'){
      f.weeks = [];
      for(let ws = weekStart(p.start); ws < p.end; ws = addDays(ws, 7)){
        const w = rs.filter(r=>r.t>=ws && r.t<addDays(ws,7));
        f.weeks.push({ ws, n:w.length, share: w.length ? w.filter(r=>r.safe).length/w.length : null, top: w.length ? topKey(w).key : null });
      }
    }
    return f;
  }

  // ---------------------------------------------------------------- words
  // deterministic choice: same key, same variant
  function hash(s){ let h = 2166136261; for(let i=0;i<String(s).length;i++){ h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
  const pick = (arr, key) => arr[hash(key) % arr.length];
  const b = s => '<b>' + String(s).replace(/[&<>"]/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])) + '</b>';
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const nm = k => NAME[k] || k;
  // a sentence that opens with the person's name when they gave one
  const open = (name, rest) => name ? name + rest : cap(rest);
  const S = x => String(x).replace(/^((?:<[^>]+>)*)([a-z])/, (m,t,c)=>t+c.toUpperCase());
  // how much of something, in words or (from 10+) a rounded percentage
  function howMuch(share, n){
    if(share >= 0.97) return 'all';
    if(share <= 0.03) return 'none';
    if(n >= 10) return 'about ' + Math.min(95, Math.max(5, Math.round(share*20)*5)) + '%';
    return share >= 0.95 ? 'all' : share >= 0.6 ? 'most' : share >= 0.4 ? 'about half' : share > 0.1 ? 'some' : 'very few';
  }
  const didWord = h => h==='all' ? 'all of them did' : h==='none' ? 'none of them did' : h + ' did';
  function eachMost(k, n){ return k===n ? (n===2 ? 'both' : 'each') : k/n >= 0.6 ? 'most' : k/n >= 0.4 ? 'about half' : 'some'; }
  const countWord = n => ['zero','one','two','three','four','five','six','seven','eight','nine','ten'][n] || String(n);
  const times = n => n===1 ? 'once' : n===2 ? 'twice' : countWord(n) + ' times';
  function listAnd(a){ return a.length<=1 ? (a[0]||'') : a.slice(0,-1).join(', ') + ' and ' + a[a.length-1]; }
  function partOfWeek(fromT, toT, ws){
    const mid = ((fromT - ws) + (toT - ws)) / 2 / DAY;
    return mid < 2.2 ? 'beginning' : mid < 4.2 ? 'middle' : 'end';
  }
  function dayAt(t){ return DAYS[new Date(t).getDay()]; }
  function comebackWords(avg){ return avg <= 1.5 ? 'one or two check-ins' : 'about ' + Math.round(avg) + ' check-ins'; }

  // ---------------------------------------------------------------- teaching
  // Justin's six state essays, rewritten in plain language (🖊). The full essay sits
  // behind "More about {state}"; one paragraph of it comes into each post, in order,
  // never repeated until all have been shown.
  const ESSAY = {
    freeze: { title:'More about freeze', sections:[
      ['What freeze is', [
        "Freeze can look like nothing is happening. But a lot is happening inside. Your body has flight/fight energy, like feeling jittery and ready to move. At the same time, it has shutdown, like feeling numb and far away. Freeze is both at once: lots of energy, and a body that isn't moving with it.",
        "That's why freeze can feel so uncomfortable. Panic is the urge to run when you can't. Rage is the urge to fight when you can't. Freeze can also feel like fear, stress or overwhelm. The energy is real, and it doesn't have anywhere to go yet.",
        "Pushing through usually doesn't help. Forcing yourself adds more stress, and your body holds on tighter. Small doses of safety help the most, a little at a time."]],
      ['Why freeze stays', [
        "Freeze stays when your body doesn't get enough signs of safety. The energy doesn't drain on its own, and your body doesn't relax until it feels safe enough.",
        "Two habits can keep freeze around longer. One is forcing your way through the day and then crashing at night. The other is rest that isn't really rest, like scrolling on your phone for hours. Scrolling can feel like rest, but it numbs you more than it settles you. That's okay. It just won't help freeze ease up.",
        "Freeze also changes how you think. Thoughts can feel scattered or all-or-nothing. Everything feels impossible, or everything has to happen right now. You don't have to argue with those thoughts. As a bit of safety comes in, your thinking usually loosens too."]],
      ["How you'll know it's shifting", [
        "When freeze starts to thaw, it usually shows up small. A breath that goes deeper on its own. A stretch you didn't plan. Wanting to move, instead of feeling like you have to.",
        "Sometimes the tension goes away but you feel flat, numb or far away. That isn't a thaw. That's more like shutdown. It's common for a system to go back and forth between freeze and shutdown."]],
      ['What to try', [
        "Keep it small. Let your eyes look around the room, wherever they want to go. Then slowly roll your wrists or wiggle your toes. Looking around gives your body a sign of safety, and the small movement reminds it that it can move. In freeze, many small practices help more than one big one."]],
      ['Where this can go', [
        "The energy in freeze isn't your enemy. It's the same energy that becomes motivation and play when there's enough safety with it. As freeze eases, that energy comes back to you, first as small movements, then as wanting to do things again.",
        "Freeze is where your body is right now. It's not where it has to stay. You're stuck, not broken."]]]},
    shutdown: { title:'More about shutdown', sections:[
      ['What shutdown is', [
        "Shutdown is your body's oldest way of protecting you. When something is too much and you can't get away or fight back, your body powers down to save energy. It can feel cold, heavy, drained, numb or far away. A lot of what people call depression can be the body in shutdown."]],
      ['Why shutdown stays', [
        "Shutdown stays when your body doesn't have enough energy to come back online yet. Pushing yourself hard can use up the little energy you have, and the shutdown can get deeper.",
        "Your thoughts can match the state. You might think, \"This is just who I am now,\" or \"Nothing will help.\" Those thoughts can feel completely true. But thoughts follow states. That's the shutdown talking, not the facts."]],
      ["How you'll know it's shifting", [
        "The first signs of energy coming back are small and easy to miss. Caring a little about one thing. Noticing you're hungry. Wanting a window open.",
        "Irritability can actually be a good sign. It can mean energy is coming back into your system. When shutdown has enough safety with it, it becomes stillness: quiet, but peaceful instead of numb.",
        "Sometimes, as energy comes back, freeze shows up instead. That means flight/fight energy and shutdown are there at the same time. Freeze is still and slow like shutdown, but tense instead of collapsed. That's movement too."]],
      ['What to try', [
        "Keep it very small and easy. A sip of tea. A softer light. One sound you can hear without trying. You don't get out of shutdown by forcing it. Small signs of safety let your body bring a little energy back.",
        "When things feel heavy, getting through is enough. Showing up here and checking in honestly already counts."]],
      ['Where this can go', [
        "Small, easy signs of safety, repeated, can move shutdown toward stillness. As energy returns, it might show up as motivation. It might also show up as irritability. Either one means things are moving again.",
        "Feeling permanent isn't the same as being permanent. You're stuck, not broken."]]]},
    fightflight: { title:'More about flight/fight', sections:[
      ['What flight/fight is', [
        "Flight/fight is energy without enough safety with it yet. Your body picked up on danger, real or remembered, and got you ready to handle it. Flight usually comes first: your legs, getting away, anxiety. Then fight: your arms and upper body, pushing back, anger.",
        "Anxiety is the urge to run that hasn't run yet. Anger is the urge to fight that hasn't fought yet. Neither one is bad. They're your body doing its job, even when it bumps into the people around you."]],
      ['Why flight/fight stays', [
        "Flight/fight keeps going when your body hasn't gotten enough signs of safety to calm down. It's not a bad habit. It's a system that's still on alert.",
        "Your thinking can keep it going too. Blaming, worst-case thinking and feeling like everything is urgent come from the state. When you have more safety, your thinking changes on its own."]],
      ["How you'll know it's shifting", [
        "As safety mixes in, the urgency goes down. Things that really are urgent still get your attention, just with more patience. With safety, this energy turns into motivation to get things done. With other people, it turns into play and fun.",
        "Without enough safety, flight/fight stays anxious and angry. Over time it can lead to shutdown or freeze. That's not a flaw in you. It's a system that needs more safety."]],
      ['What to try', [
        "Move a little, on purpose. Shake out your hands for thirty seconds, take a quick walk, or push your palms against a wall. Give the energy somewhere to go. Then try to name the feeling under it.",
        "Try one slow breath with a longer breath out. It won't fix the activation, but it might help you settle a little or get ready to move mindfully."]],
      ['Where this can go', [
        "Every small sign of safety gives this energy somewhere to go. Over time, energy with safety becomes motivation and play. It's the same energy, with more safety.",
        "You're not broken, and you're not too much. You have a lot of energy and not enough safety with it yet. Yet."]]]},
    play: { title:'More about play and motivation', sections:[
      ['What play and motivation is', [
        "Play and motivation is energy with safety. It's the same energy as flight/fight, but with safety mixed in, it's aimed at something. With people you trust, it shows up as play. On your own, it shows up as motivation to create, work, exercise or dance.",
        "There's a kind of busy that drains you and a kind that fills you up. This is the second kind. You can tell because you can still notice your body, and you could stop if you wanted to."]],
      ['Why it stays', [
        "This state lasts as long as safety stays with the energy. The drive comes from the energy, and the ease comes from safety. They're happening at the same time.",
        "Your thinking helps here too. Thoughts get curious and creative, and ideas connect more easily. That kind of thinking keeps the state going."]],
      ["How you'll know it's shifting", [
        "One early sign of change is anxiety or irritability creeping in. If safety slips away, the energy turns into flight/fight. You might snap at people, fun turns into competition, or creativity turns into perfectionism.",
        "That's not a reason to hold back. It's just good to know where the edge is. The energy is good. The safety keeps it good."]],
      ['What to try', [
        "Use the energy on purpose. Pick the one thing that matters most and give it ten minutes. You don't have to finish it. Just start. Stay a little mindful of your body while you do.",
        "If it's the social kind of energy, spend it with people. Reach out to someone you trust and do something together, even something simple. Playing with someone safe is one of the most regulating things there is."]],
      ['Where this can go', [
        "Keep a little safety with this energy and it stays helpful. Over time, you can have energy during the day and still slow down in the evening, without paying for it later."]]]},
    stillness: { title:'More about stillness', sections:[
      ['What stillness is', [
        "Stillness is your body slowed down, with safety. It's the same slowing down you'd feel in shutdown, but safety changes everything. On your own, it feels like rest and reflection. With someone safe, it feels like closeness. A pet counts too.",
        "Rest isn't a reward you earn after everything is done. It's how your system gets back into balance. Stillness is the state behind real sleep, sitting still without feeling restless, and easy closeness with someone safe."]],
      ['Why stillness stays', [
        "Stillness lasts as long as your body trusts that it's okay to stop. That trust is the safety, and it's the difference between resting and just going numb.",
        "Your thinking slows down too. Thoughts get more reflective, more wondering than working. If planning and problem-solving start to crowd back in, that's fine. Just notice which one your body is asking for."]],
      ["How you'll know it's shifting", [
        "Ask yourself if the stillness feels restful and comfortable. If it starts to feel flat, heavy or far away, safety may be fading, and stillness may be moving toward shutdown. Your body is slow in both, but they feel very different. Shutdown makes you want to pull away from people. Stillness makes you want to rest and connect.",
        "If you notice that, don't force yourself to get up and go. Reach for a little safety: a familiar voice, a safe person nearby, or something in the room that's nice to look at."]],
      ['What to try', [
        "You don't have to earn this. Let yourself sink into it. Five minutes with no task and no phone counts.",
        "If a safe person or pet is nearby, just be quiet near them. No talking needed. Being quiet and close is one of the most regulating things there is."]],
      ['Where this can go', [
        "When you let rest actually restore you, it does more than feel good. Being still with safety is how your body recovers. Keep practicing it, and stillness stays restful."]]]},
    safety: { title:'More about safety', sections:[
      ['What safety is', [
        "Safety is your body open to the world. Calm enough to connect, maybe playful enough to laugh, with enough room inside to handle things that usually feel hard. In safety, your body isn't bracing for anything, so its energy goes to health, connection and repair.",
        "Safety doesn't mean no hard emotions. It means having enough room inside to handle them. You can be in safety and still have a hard moment. The difference is that you can handle it without going into defense."]],
      ['Why safety stays', [
        "Safety lasts when your body keeps getting small, real signs that things are okay: enough rest, a face or voice it trusts, a moment with nothing urgent. It doesn't need them all the time, just often enough.",
        "Safety fading is normal. It comes and goes for everyone. You don't keep it by holding still. You keep it by noticing it when it's here and going back to what brought it, again and again.",
        "Your thinking opens up in safety: more curiosity, more empathy, more room to think things through. Notice what kinds of thoughts feel possible now that don't always."]],
      ["How you'll know it's shifting", [
        "Safety that goes unnoticed tends to fade quietly. If the last few days felt easier and you're not sure why, take a second look. Naming what helped makes safety easier to find next time.",
        "When safety starts to fade, you might notice less patience, more anxiety or irritability, or feeling more distant. It depends on your most common defense state. As safety goes down, that state comes up more."]],
      ['What to try', [
        "Notice safety on purpose. Where do you feel calm or settled in your body? How are you breathing? What's your posture like? Are you more likely to smile? Noticing what safety feels like helps you find it again.",
        "Don't hold on too tightly. Can you let safety be here without needing it to stay? Letting your system move in and out of safety is part of how it grows."]],
      ['Where this can go', [
        "Keep noticing safety and using it, and over time it shows up more often. The goal was never to feel safe all the time. It's to have enough safety to move between all your states without getting stuck.",
        "Your system has already shown it can find safety. You can trust your body a little more."]]]}
  };
  const teachList = k => (ESSAY[k] ? [].concat.apply([], ESSAY[k].sections.map(s=>s[1])) : []);

  // ---------------------------------------------------------------- journal reflections
  const JOURNAL = {
    stretch: (x)=>[ 'What was more difficult about ' + DAYS[new Date(x.from).getDay()] + '?',
                    x.back ? 'What was different about ' + DAYS[x.back.day] + ' ' + SEG_WORD[x.back.seg] + '?' : 'What helped you get through the harder days?',
                    'Where do you feel ' + nm(x.flavorKey) + ' in your body first?' ],
    toSafety: ()=>[ 'What helped you have more safety this week?', 'Who or what added safety this week?', 'What is one thing you want to keep doing?' ],
    toDefense: ()=>[ 'What was more difficult about this week?', 'What pulled on your system the most?', 'What is one small thing that could help next week?' ],
    payoff: ()=>[ 'What helped during your practices this week?', 'What did you notice in your body after a practice?', 'When is a good time for your next practice?' ],
    firstBest: (x)=>[ 'What do you remember about that practice?', 'What was different that ' + SEG_WORD[x.seg] + '?', 'What would help you get back to that feeling?' ],
    steadySafe: ()=>[ 'What helped you have more safety this week?', 'Where in your body do you notice safety the most?', 'What is one thing you want to keep doing?' ],
    steadyDef: ()=>[ 'What has been pulling on your system lately?', 'Who or what helps you feel a little safer?', 'What is one small, low-demand thing you could try next week?' ],
    mixed: ()=>[ 'What was different about your easier days?', 'What was more difficult about your harder days?', 'What helped you move back toward safety?' ],
    up: (w)=>[ 'What helped you have more safety this ' + w + '?', 'How are the people or places in your life adding safety?', "What's working well enough to keep, and what small changes could you make?" ],
    down: (w)=>[ 'What did this ' + w + ' ask of you?', 'What changed in your life that pulled on your system?', 'Which people, places or practices still added safety?' ],
    flat: (w)=>[ 'What kept you going this ' + w + '?', 'What is one small thing you could add next ' + w + '?', 'Where in your body do you notice safety the most?' ]
  };
  const CHIPQ = { def:'What pulled you toward defense this week?', safe:'What helped you have more safety this week?', mixed:'What made the biggest difference this week?' };

  // ---------------------------------------------------------------- the week
  // lead insights, in the approved priority: low data > state shift > recovery >
  // practice payoff > baseline > showing up. A lead used last week drops below the rest.
  function weekLead(f, prev, lastLead){
    const leads = [];
    if(f.n < 5) return 'thin';
    const prevShare = prev && prev.n >= 3 ? prev.share : null;
    if(f.stretch && f.stretch.back) leads.push('stretch');
    if(prevShare != null && prevShare < 0.5 && f.share >= 0.5) leads.push('toSafety');
    if(prevShare != null && prevShare >= 0.5 && f.share < 0.5) leads.push('toDefense');
    if(f.stretch && !f.stretch.back && f.share < 0.5 && leads.indexOf('toDefense') < 0) leads.push('toDefense');
    const pr = f.practices.filter(x=>x.rose!=null);
    if(f.firstBestEver) leads.push('firstBest');
    if(pr.length >= 2 && pr.filter(x=>x.rose).length/pr.length >= 0.6) leads.push('payoff');
    if(f.share >= 0.6) leads.push('steadySafe');
    else if(f.share < 0.4) leads.push('steadyDef');
    else leads.push('mixed');
    const fresh = leads.filter(l=>l!==lastLead);
    return (fresh.length ? fresh : leads)[0];
  }

  function practiceParagraph(f){
    const P = f.practices; if(!P.length) return null;
    const byD = {}; P.forEach(x=>{ (byD[x.day]=byD[x.day]||[]).push(x.seg); });
    const order = []; P.forEach(x=>{ if(order.indexOf(x.day)<0) order.push(x.day); });
    const dayList = order.map(d=>{ const sg = byD[d]; return DAYS[d] + (sg.length===1 && (sg[0]==='evening'||sg[0]==='late') ? ' ' + SEG_WORD[sg[0]] : ''); });
    let s = 'You practiced ' + times(P.length) + (dayList.length <= 4 ? ': ' + listAnd(dayList) + '.' : ' this week.');
    const pr = P.filter(x=>x.rose!=null);
    if(pr.length){
      const k = pr.filter(x=>x.rose).length;
      if(k) s += ' In ' + (pr.length===1 ? 'that practice' : eachMost(k, pr.length) + (k===pr.length && pr.length>2 ? ' practice' : ' of your practices')) + ', your safety rating went up from the start to the end.';
      else s += ' Your safety rating stayed about the same inside your practices this time. Showing up for the practice still counts.';
    } else if(f.pairs.length){
      const k = f.pairs.filter(x=>x.d > 0).length;
      if(k) s += ' After ' + (f.pairs.length===1 ? 'that practice' : eachMost(k, f.pairs.length) + ' of them') + ', your next check-in had more safety than the one before.';
    }
    const fb = f.firstBestEver;
    if(fb) s += ' On ' + DAYS[fb.day] + ', your safety went up and your intensity went down. That\'s the ' + b('first time') + ' that has happened in one of your practices.';
    else { const bst = P.find(x=>x.best && x.eased); if(bst) s += ' On ' + DAYS[bst.day] + ', your safety went up and your intensity went down during the practice.'; }
    return s;
  }

  function buildWeek(f, ctx){
    const p = f.p, name = ctx.name ? ctx.name + ', ' : '';
    const prev = ctx.prev, prevWeeks = ctx.prevWeeks || [];
    const post = { kind:'week', key:p.key, label:p.label, release:p.release, start:p.start, blocks:[], journal:[], chipQ:null, n:f.n };
    if(!f.n) return null;
    const lead = weekLead(f, prev, ctx.lastLead);
    post.lead = lead;
    const defName = f.defFlavor ? nm(f.defFlavor.key) : 'defense';
    const safeName = f.safeFlavor ? nm(f.safeFlavor.key) : 'safety';
    // teaching state: the side that led
    post.teachState = (f.share >= 0.5 ? (f.safeFlavor ? f.safeFlavor.key : 'safety') : (f.defFlavor ? f.defFlavor.key : 'freeze'));

    if(lead === 'thin'){
      post.title = f.n===1 ? 'One check-in this week' : 'A short week of check-ins';
      post.blocks.push({ p: 'Only ' + b(f.n===1 ? 'one check-in' : countWord(f.n) + ' check-ins') + ' this week, so this picture is only partial. That\'s okay. A few quick check-ins each day give your reflection more to work with.' });
      post.blocks.push({ snap:'week', data: weekSnapData(f) });
      post.thin = true;
      return post;
    }
    // steady streak: how many weeks before this one also had more safety than defense
    let streak = 0; for(const w of prevWeeks){ if(w && w.n >= 3 && w.share >= 0.5) streak++; else break; }

    let p1;
    if(lead === 'stretch'){
      const x = f.stretch, from = DAYS[new Date(x.from).getDay()], to = DAYS[new Date(x.to).getDay()];
      const part = partOfWeek(x.from, x.to, p.start), fl = x.flavor ? x.flavor.key : f.defFlavor.key;
      post.title = 'More ' + nm(fl) + ' in the ' + part + ' of the week. Safety returned ' + DAYS[x.back.day] + '.';
      const opener = (x.startedSafe && x.from > p.start) ? (streak >= 2 ? 'this week started out like your last ' + countWord(streak) + ' weeks, with more safety than defense.' : 'this week started out with more safety than defense.') : '';
      const mix = 'It was mostly ' + b(nm(fl)) + (x.flavor && x.flavor.second && x.flavor.secondShare >= 0.25 && !SAFE_SIDE[x.flavor.second] ? ', with some ' + nm(x.flavor.second) : '') + '.';
      p1 = opener ? open(name, opener) + ' From ' + from + ' to ' + to + ', that flipped. Most of your check-ins had more defense than safety. ' + mix
                  : open(name, 'from ' + from + ' to ' + to + ', most of your check-ins had more defense than safety. ') + mix;
      post.journal = JOURNAL.stretch({ from:x.from, back:x.back, flavorKey:fl });
      post.chipQ = CHIPQ.def;
    } else if(lead === 'toSafety'){
      post.title = 'More safety than defense this week';
      p1 = name + 'last week had more defense than safety. This week flipped: ' + b(howMuch(f.share, f.n)) + ' of your check-ins had more safety than defense.' + (f.safeFlavor && f.safeFlavor.key!=='safety' ? ' A lot of it was ' + safeName + '.' : '');
      post.journal = JOURNAL.toSafety(); post.chipQ = CHIPQ.safe;
    } else if(lead === 'toDefense'){
      post.title = 'More ' + defName + ' this week';
      p1 = name + (prev && prev.n>=3 && prev.share>=0.5 ? 'last week had more safety than defense. This week, ' : 'this week, ') + b(howMuch(1-f.share, f.n)) + ' of your check-ins had more defense than safety. It was mostly ' + b(defName) + '. Weeks like this happen, and they usually make sense when you look at what was going on. A system that moves into defense under stress is working, not failing.';
      post.journal = JOURNAL.toDefense(); post.chipQ = CHIPQ.def;
    } else if(lead === 'firstBest'){
      const fb = f.firstBestEver;
      post.title = 'A first: safety up and intensity down in one practice';
      p1 = name + b(howMuch(f.share, f.n)) + ' of your check-ins this week had more safety than defense. The biggest news was inside a practice on ' + DAYS[fb.day] + '.';
      post.journal = JOURNAL.firstBest(fb); post.chipQ = f.share>=0.5 ? CHIPQ.safe : CHIPQ.mixed;
    } else if(lead === 'payoff'){
      const pr = f.practices.filter(x=>x.rose!=null), k = pr.filter(x=>x.rose).length;
      post.title = 'Your safety went up in ' + (k===pr.length ? (pr.length===2?'both':'each') : 'most') + ' of your practices';
      p1 = name + b(howMuch(f.share, f.n)) + ' of your check-ins this week had more safety than defense. Your practices are where the week stood out.';
      post.journal = JOURNAL.payoff(); post.chipQ = f.share>=0.5 ? CHIPQ.safe : CHIPQ.mixed;
    } else if(lead === 'steadySafe'){
      post.title = streak >= 2 ? 'Another week with more safety than defense' : 'A week with more safety than defense';
      p1 = name + b(howMuch(f.share, f.n)) + ' of your check-ins this week had more safety than defense' + (streak >= 2 ? ', like your last ' + countWord(Math.min(streak,10)) + ' weeks' : '') + '.' + (f.safeFlavor && f.safeFlavor.key!=='safety' ? ' A lot of it was ' + b(safeName) + '.' : '') + (f.defFlavor ? ' When defense showed up, it was mostly ' + defName + '.' : '');
      post.journal = JOURNAL.steadySafe(); post.chipQ = CHIPQ.safe;
    } else if(lead === 'steadyDef'){
      post.title = 'More ' + defName + ' this week';
      p1 = name + b(howMuch(1-f.share, f.n)) + ' of your check-ins this week had more defense than safety. It was mostly ' + b(defName) + '. Stretches like this can last a while. They don\'t last forever, and every check-in you make here still counts.';
      post.journal = JOURNAL.steadyDef(); post.chipQ = CHIPQ.def;
    } else {
      post.title = 'A mixed week: safety and defense took turns';
      p1 = name + 'this week went back and forth. About half of your check-ins had more safety than defense, and about half had more defense than safety. When defense showed up, it was mostly ' + b(defName) + '.';
      post.journal = JOURNAL.mixed(); post.chipQ = CHIPQ.mixed;
    }
    post.blocks.push({ p: S(p1) });
    post.blocks.push({ snap:'week', data: weekSnapData(f) });
    // teaching paragraph
    const tl = teachList(post.teachState);
    if(tl.length){ const i = (ctx.teachIndex||0) % tl.length; post.teach = { state:post.teachState, i }; post.blocks.push({ p: tl[i], teach:true }); }
    // practices + the inside-your-practices picture
    const pp = practiceParagraph(f);
    if(pp){
      post.blocks.push({ p: (lead==='stretch' ? 'Your practices showed this too. ' : '') + pp });
      const ins = f.practices.filter(x=>x.s0!=null).slice(-5);
      if(ins.length) post.blocks.push({ snap:'inside', data: ins.map(x=>({ day:DAYS[x.day].slice(0,3), anchor:x.anchor, s0:x.s0, s1:x.s1, best:x.best })) });
    }
    // noticing
    if(lead === 'stretch'){
      const x = f.stretch, lastSafe = f.rs.filter(r=>r.safe && r.t < x.from).pop();
      post.blocks.push({ p: DAYS[x.back.day] + ' ' + SEG_WORD[x.back.seg] + ' was also the first time' + (lastSafe ? ' since ' + dayAt(lastSafe.t) : ' in days') + ' that you had more safety than defense. One week can\'t tell us why. But it\'s worth noticing what was different then.' });
    } else if(f.days.length >= 3){
      const bestDay = f.days.slice().sort((a,b2)=>b2.meanM-a.meanM)[0];
      if(bestDay && bestDay.meanM >= 0) post.blocks.push({ p: 'Your check-ins on ' + dayAt(bestDay.t) + ' had the most safety this week. It\'s worth noticing what was different about that day.' });
    }
    // what they named last week, mirrored back (Justin approved, 2026-10-01)
    const ln = lastNamed(ctx, 'week'); if(ln) post.blocks.push(ln);
    // the rotating snapshot
    const rot = rotatingSnap(f, ctx, post);
    if(rot) post.blocks.push(rot);
    return post;
  }

  // the answer to last time's question, said back as the person named it. A mirror, never a cause.
  function lastNamed(ctx, span){
    const a = ctx.prevAnswer; if(!a || !a.tags || !a.tags.length) return null;
    const tags = a.tags.map(String);   // not bolded: b() escapes and boldHtml escapes again, which would show 'body &amp; movement'
    const what = a.dir==='safe' ? 'what helped you have more safety' : a.dir==='def' ? 'what pulled you toward defense' : 'what made the biggest difference';
    return { p: 'Last ' + span + ', you named ' + listAnd(tags) + ' as ' + what + '. Notice if ' + (tags.length===1 ? 'that' : 'those') + ' showed up this ' + span + ' too.' };
  }
  function weekSnapData(f){
    return { ws:f.p.start, pts: f.rs.map(r=>({ d:new Date(r.t).getDay(), h:new Date(r.t).getHours()+new Date(r.t).getMinutes()/60, m:r.m, key:r.key, after: r.c && r.c.phase==='after' })) };
  }
  // one snapshot that changes every week (Justin: "something new every time")
  function rotatingSnap(f, ctx, post){
    const pool = [];
    const mNow = ctx.monthSoFar, mPrev = ctx.monthPrev;
    if(mNow && mPrev && mNow.comebacks && mPrev.comebacks)
      pool.push({ snap:'thennow', title:'Then and now', data:{ rows:[ [MONTHS[new Date(mPrev.p.start).getMonth()], mPrev.comebacks.avg, mPrev.defFlavor ? mPrev.defFlavor.key : null], [MONTHS[new Date(mNow.p.start).getMonth()], mNow.comebacks.avg, mNow.defFlavor ? mNow.defFlavor.key : null] ] },
        caption:'How many check-ins it took to get back to more safety than defense after a defensive dip. This snapshot changes every week.' });
    const segK = Object.keys(f.segs);
    const segShares = segK.map(s=>f.segs[s].share);
    if(segK.length >= 2 && Math.max.apply(null, segShares) > 0 && Math.max.apply(null, segShares) - Math.min.apply(null, segShares) >= 0.2) pool.push({ snap:'dayparts', title:'Your times of day', data:{ segs:['morning','afternoon','evening','late'].filter(s=>f.segs[s]).map(s=>[SEG_PLURAL[s], f.segs[s].share]) },
        caption:'How much of each time of day had more safety than defense this week. This snapshot changes every week.' });
    if(f.anchors.length >= 2) pool.push({ snap:'anchors', title:'Your anchors', data:{ rows:f.anchors.map(a=>[a.anchor, a.lift]) },
        caption:'How much your safety rating went up, on average, in practices with each anchor. This snapshot changes every week.' });
    const wk = (ctx.prevWeeks||[]).slice(0,4).reverse().concat([f]);
    if(wk.filter(w=>w && w.n>=3).length >= 3) pool.push({ snap:'weeks', title:'Your last five weeks', data:{ rows: wk.map(w=>w && w.n ? [w.p ? (MONTHS[new Date(w.p.start).getMonth()].slice(0,3)+' '+new Date(w.p.start).getDate()) : '', w.share] : ['', null]) },
        caption:'How much of each week had more safety than defense. This snapshot changes every week.' });
    if(!pool.length) return null;
    const i = hash(f.p.key) % pool.length;
    return pool[i];
  }

  // ---------------------------------------------------------------- the month
  function buildMonth(f, ctx){
    if(!f.n) return null;
    const p = f.p, prev = ctx.prev, name = ctx.name ? ctx.name + ', ' : '';
    const post = { kind:'month', key:p.key, label:p.label, release:p.release, start:p.start, blocks:[], journal:[], chipQ:null, n:f.n };
    const pm = prev && prev.n ? MONTHS[new Date(prev.p.start).getMonth()] : null;
    const dir = (prev && prev.n >= 8) ? (f.meanM - prev.meanM > 0.05 ? 'up' : f.meanM - prev.meanM < -0.05 ? 'down' : 'flat') : 'new';
    const defName = f.defFlavor ? nm(f.defFlavor.key) : 'defense';
    post.teachState = f.share >= 0.5 ? (f.safeFlavor ? f.safeFlavor.key : 'safety') : (f.defFlavor ? f.defFlavor.key : 'freeze');
    if(f.n < 12){
      post.title = p.name + ': a short month of check-ins';
      post.blocks.push({ p: 'Only ' + b(countWord(f.n) + (f.n===1?' check-in':' check-ins')) + ' in ' + p.name + ', so this picture is only partial. That\'s okay. Every check-in you add makes your next month clearer.' });
      post.blocks.push({ snap:'monthgrid', data: monthGridData(f) });
      post.thin = true; return post;
    }
    // the best time of day, if it clearly beat the others and beat itself last month
    const segK = Object.keys(f.segs).sort((a,c)=>f.segs[c].meanM - f.segs[a].meanM);
    const topSeg = segK.length >= 2 && (f.segs[segK[0]].meanM - f.segs[segK[segK.length-1]].meanM) > 0.08 ? segK[0] : null;
    const lowSeg = topSeg ? segK[segK.length-1] : null;
    const segBeatLast = topSeg && prev && prev.segs && prev.segs[topSeg] ? f.segs[topSeg].meanM > prev.segs[topSeg].meanM : false;
    post.title = topSeg && f.segs[topSeg].share >= 0.5 ? p.name + ': more safety in your ' + SEG_PLURAL[topSeg]
      : dir==='up' ? p.name + ': more safety than ' + pm
      : dir==='down' ? p.name + ': more defense than ' + pm
      : f.share >= 0.5 ? p.name + ': a month with more safety than defense' : p.name + ': a month with more ' + defName;
    let p1 = name + 'in ' + p.name + ', ' + b(howMuch(f.share, f.n)) + ' of your check-ins had more safety than defense.';
    if(pm && prev.n >= 8) p1 += ' In ' + pm + ', ' + didWord(howMuch(prev.share, prev.n)) + '.';
    if(f.defFlavor) p1 += ' When defense showed up, it was mostly ' + b(defName) + '.';
    post.blocks.push({ p: S(p1) });
    post.blocks.push({ snap:'monthgrid', data: monthGridData(f) });
    if(topSeg){
      let s = 'Your system in the ' + SEG_PLURAL[topSeg] + ' typically had more safety than defense, compared to ' + (segBeatLast && pm ? pm + ' and compared to ' : '') + SEG_PLURAL[lowSeg] + '.';
      post.blocks.push({ p:s });
    }
    // the hardest week, and how fast safety came back
    const wks = (f.weeks||[]).filter(w=>w.n>=3);
    if(wks.length >= 2){
      const hard = wks.slice().sort((a,c)=>a.share-c.share)[0];
      const idx = (f.weeks||[]).indexOf(hard), pos = idx===0 ? 'The first week of the month' : idx===f.weeks.length-1 ? 'The last week of the month' : 'The week of ' + MONTHS[new Date(hard.ws).getMonth()] + ' ' + new Date(hard.ws).getDate();
      let s = hard.share < 0.5 ? pos + ' had more challenge.' : 'Even your hardest week had more safety than defense.';
      if(f.comebacks){
        const faster = ctx.fastestBefore != null && f.comebacks.avg < ctx.fastestBefore;
        s += (hard.share < 0.5 ? ' But even then, there was ' : ' After a defensive dip, there was ') + 'more safety than defense within ' + b(comebackWords(f.comebacks.avg)) + (hard.share < 0.5 ? ' after a defensive dip' : '') + '.' + (faster ? ' That\'s the fastest of any month so far.' : '');
      }
      if(!f.comebacks && hard.share < 0.5) s += ' Weeks like that happen, and they usually make sense when you look at what was going on.';
      post.blocks.push({ p:s });
      post.blocks.push({ snap:'weeks', title:'Week by week', data:{ rows:(f.weeks||[]).map(w=>{ const t=Math.max(w.ws, p.start); return [MONTHS[new Date(t).getMonth()].slice(0,3)+' '+new Date(t).getDate(), w.n?w.share:null]; }) }, caption:'How much of each week had more safety than defense. A full bar means every check-in that week did.' });
    }
    // practices
    if(f.practices.length){
      const pr = f.practices.filter(x=>x.rose!=null), k = pr.filter(x=>x.rose).length;
      let s = 'You practiced ' + times(f.practices.length) + ' in ' + p.name + (f.minutes ? ', for about ' + (f.minutes>=90 ? Math.round(f.minutes/60*10)/10 + ' hours' : Math.round(f.minutes) + ' minutes') : '') + '.';
      if(pr.length) s += ' In ' + (k===pr.length ? (pr.length===1?'that practice':'every practice') : eachMost(k, pr.length) + ' of them') + ', your safety rating went up from the start to the end' + (k ? '.' : ' less often. That\'s okay. Some months ask more of you.');
      if(f.anchors.length >= 2) s += ' Your safety rose the most in practices with the ' + b(f.anchors[0].anchor) + ' anchor.';
      if(ctx.movement && ctx.movement.moved) s += ' At the start of the month, you were practicing ' + skillWord(ctx.movement.from) + '. Now you\'re working with ' + skillWord(ctx.movement.to) + '.';
      post.blocks.push({ p:s });
      if(f.anchors.length >= 2) post.blocks.push({ snap:'anchors', title:'Your anchors', data:{ rows:f.anchors.map(a=>[a.anchor, a.lift]) }, caption:'How much your safety rating went up, on average, in practices with each anchor.' });
    }
    const ln = lastNamed(ctx, 'month'); if(ln) post.blocks.push(ln);
    const tl = teachList(post.teachState);
    if(tl.length){ const i = (ctx.teachIndex||0) % tl.length; post.teach = { state:post.teachState, i }; post.blocks.push({ p: tl[i], teach:true }); }
    const w = 'month';
    post.journal = dir==='up' ? JOURNAL.up(w) : dir==='down' ? JOURNAL.down(w) : JOURNAL.flat(w);
    post.chipQ = f.share >= 0.5 ? 'What helped you have more safety this month?' : 'What pulled you toward defense this month?';
    return post;
  }
  const SKILL = { 'validate-defense':'validating', 'normalize-defense':'validating and normalizing', imagery:'imagery', obstacles:'obstacles', balancing:'balancing', pendulating:'pendulation' };
  const skillWord = k => SKILL[k] || k;
  function monthGridData(f){
    const out = []; for(let t = f.p.start; t < addMonths(f.p.start,1); t = addDays(t,1)){ const d = f.days.find(x=>x.t===sod(t)); out.push(d ? topKey(d.rs).key : null); }
    return { first: new Date(f.p.start).getDay(), days: out };
  }

  // ---------------------------------------------------------------- the season
  function buildSeason(f, ctx){
    if(!f.n) return null;
    const p = f.p, prev = ctx.prev, name = ctx.name ? ctx.name + ', ' : '';
    const post = { kind:'season', key:p.key, label:p.label, release:p.release, start:p.start, blocks:[], journal:[], chipQ:null, n:f.n, sub:p.months };
    const dir = (prev && prev.n >= 20) ? (f.meanM - prev.meanM > 0.05 ? 'up' : f.meanM - prev.meanM < -0.05 ? 'down' : 'flat') : 'new';
    post.teachState = f.share >= 0.5 ? (f.safeFlavor ? f.safeFlavor.key : 'safety') : (f.defFlavor ? f.defFlavor.key : 'freeze');
    if(f.n < 20){
      post.title = 'Your ' + p.name + ': a short season of check-ins';
      post.blocks.push({ p: 'Only ' + b(f.n + ' check-ins') + ' this ' + p.name + ', so the bigger picture is only a sketch. That\'s okay. Every check-in you add makes the next season clearer.' });
      post.blocks.push({ snap:'strip', data:{ rows:(f.weeks||[]).map(w=>w.n?w.top:null) } });
      post.thin = true; return post;
    }
    const thirds = [0,1,2].map(i=>compute(PERIOD.month(addMonths(p.start,i)), ctx.data));
    const m0 = thirds[0], m2 = thirds[2];
    const faster = m0.comebacks && m2.comebacks && m2.comebacks.avg < m0.comebacks.avg - 0.3;
    post.title = faster ? 'Your ' + p.name + ': you got back to safety faster'
      : dir==='up' ? 'Your ' + p.name + ': more safety than last season'
      : dir==='down' ? 'Your ' + p.name + ': a season with more challenge'
      : f.share >= 0.5 ? 'Your ' + p.name + ': a season with more safety than defense' : 'Your ' + p.name + ': a season with more ' + (f.defFlavor ? nm(f.defFlavor.key) : 'defense');
    let p1 = name + 'this ' + p.name + ' (' + p.months + '), ' + b(howMuch(f.share, f.n)) + ' of your check-ins had more safety than defense.';
    if(prev && prev.n >= 20) p1 += ' Last season, ' + didWord(howMuch(prev.share, prev.n)) + '.';
    p1 += ' That\'s ' + b(f.n + ' check-ins') + ' over ' + f.days.length + ' days.';
    post.blocks.push({ p: S(p1) });
    post.blocks.push({ snap:'strip', data:{ rows:(f.weeks||[]).map(w=>w.n?w.top:null) } });
    // then and now
    if(m0.n >= 5 && m2.n >= 5){
      const a = MONTHS[new Date(m0.p.start).getMonth()], c = MONTHS[new Date(m2.p.start).getMonth()];
      const t0 = topKey(m0.rs).key, t2 = topKey(m2.rs).key;
      post.blocks.push({ p: t0===t2 ? 'In ' + a + ', your most common state was ' + nm(t0) + '. By ' + c + ', it still was.' + (SAFE_SIDE[t0] ? ' You can build on that foundation of safety.' : '')
        : 'In ' + a + ', your most common state was ' + b(nm(t0)) + '. By ' + c + ', it was ' + b(nm(t2)) + '.' + (SAFE_SIDE[t2] && !SAFE_SIDE[t0] ? ' That\'s a real change, and you made it.' : '') });
    }
    if(m0.comebacks && m2.comebacks){
      post.blocks.push({ p: 'After a defensive dip, it took ' + comebackWords(m0.comebacks.avg) + ' to get back to more safety than defense in ' + MONTHS[new Date(m0.p.start).getMonth()] + '. In ' + MONTHS[new Date(m2.p.start).getMonth()] + ', it took ' + comebackWords(m2.comebacks.avg) + '.' + (faster ? ' Your system is finding its way back faster.' : '') });
      post.blocks.push({ snap:'thennow', title:'Then and now', data:{ rows:[[MONTHS[new Date(m0.p.start).getMonth()], m0.comebacks.avg, m0.defFlavor ? m0.defFlavor.key : null],[MONTHS[new Date(m2.p.start).getMonth()], m2.comebacks.avg, m2.defFlavor ? m2.defFlavor.key : null]] }, caption:'How many check-ins it took to get back to more safety than defense after a defensive dip.' });
    }
    // the best week stays
    const wks = (f.weeks||[]).filter(w=>w.n>=4);
    if(wks.length){ const bw = wks.slice().sort((a,c)=>c.share-a.share)[0];
      if(bw.share >= 0.5) post.blocks.push({ p: 'Your week with the most safety was the week of ' + b(MONTHS[new Date(bw.ws).getMonth()] + ' ' + new Date(bw.ws).getDate()) + '. That week shows what your system can do.' }); }
    if(f.practices.length){
      const pr = f.practices.filter(x=>x.rose!=null), k = pr.filter(x=>x.rose).length;
      let s = 'You practiced ' + times(f.practices.length) + ' this season.';
      if(pr.length >= 3) s += ' In ' + eachMost(k, pr.length) + ' of them, your safety rating went up from the start to the end.';
      if(f.anchors.length >= 2) s += ' The ' + b(f.anchors[0].anchor) + ' anchor helped your safety rise the most.';
      if(ctx.movement && ctx.movement.moved) s += ' At the start of the season, you were practicing ' + skillWord(ctx.movement.from) + '. Now you\'re working with ' + skillWord(ctx.movement.to) + '.';
      post.blocks.push({ p:s });
    }
    const tl = teachList(post.teachState);
    if(tl.length){ const i = (ctx.teachIndex||0) % tl.length; post.teach = { state:post.teachState, i }; post.blocks.push({ p: tl[i], teach:true }); }
    post.journal = dir==='up' ? JOURNAL.up('season') : dir==='down' ? JOURNAL.down('season') : JOURNAL.flat('season');
    post.chipQ = f.share >= 0.5 ? 'What most helped your safety this season?' : 'What pulled you toward defense this season?';
    post.blocks.push({ p: 'A whole season of paying attention to your nervous system. That takes real care.' });
    return post;
  }

  // ---------------------------------------------------------------- the year
  function buildYear(f, ctx){
    if(!f.n) return null;
    const p = f.p, name = ctx.name ? ctx.name + ', ' : '';
    const post = { kind:'year', key:p.key, label:p.label, release:p.release, start:p.start, blocks:[], journal:[], chipQ:null, n:f.n };
    post.teachState = f.share >= 0.5 ? (f.safeFlavor ? f.safeFlavor.key : 'safety') : (f.defFlavor ? f.defFlavor.key : 'freeze');
    if(f.n < 60){
      post.title = 'Your ' + p.name + ': the start of something';
      post.blocks.push({ p: S(name + b(f.n + ' check-ins') + ' this year, so the long view is only a sketch. That\'s okay. Every check-in you add makes next year\'s picture clearer.') });
      post.blocks.push({ snap:'ribbon', data:{ rows:(f.weeks||[]).map(w=>w.n?w.top:null) } });
      post.thin = true; return post;
    }
    const first = f.rs[0], last = f.rs[f.rs.length-1];
    post.title = (!SAFE_SIDE[first.key] && SAFE_SIDE[last.key]) ? 'Your ' + p.name + ': from ' + nm(first.key) + ' to ' + nm(last.key)
      : 'Your ' + p.name + ': a year of getting to know your nervous system';
    post.blocks.push({ p: name + 'this year you checked in ' + b(f.n + ' times') + ' over ' + f.days.length + ' days. ' + cap(howMuch(f.share, f.n)) + ' of those check-ins had more safety than defense.' });
    post.blocks.push({ snap:'ribbon', data:{ rows:(f.weeks||[]).map(w=>w.n?w.top:null) } });
    post.blocks.push({ p: 'Your first check-in this year was ' + b(nm(first.key)) + '. Your latest was ' + b(nm(last.key)) + '. One check-in is only one moment, but the two side by side are worth a look.' });
    post.blocks.push({ snap:'firstlast', data:{ a:first.key, b:last.key } });
    // the seasons, one line each
    const lines = [];
    for(let i=0;i<4;i++){ const sf = compute(PERIOD.season(addMonths(p.start, i*3)), ctx.data); if(sf.n >= 5) lines.push('Your ' + sf.p.name + ' had ' + howMuch(sf.share, sf.n) + ' of its check-ins with more safety than defense' + (sf.defFlavor ? ', and its most common defense state was ' + nm(sf.defFlavor.key) : '') + '.'); }
    if(lines.length) post.blocks.push({ p: lines.join(' ') });
    if(f.comebacks) post.blocks.push({ p: 'After a defensive dip, your system usually got back to more safety than defense within ' + b(comebackWords(f.comebacks.avg)) + '. That happened ' + b(times(f.comebacks.n)) + ' this year.' });
    if(f.practices.length) post.blocks.push({ p: 'You practiced ' + b(times(f.practices.length)) + (f.minutes ? ', for about ' + Math.round(f.minutes/60) + ' hours' : '') + '.' + (f.anchors.length >= 2 ? ' The ' + f.anchors[0].anchor + ' anchor helped your safety rise the most.' : '') });
    const tl = teachList(post.teachState);
    if(tl.length){ const i = (ctx.teachIndex||0) % tl.length; post.teach = { state:post.teachState, i }; post.blocks.push({ p: tl[i], teach:true }); }
    post.blocks.push({ p: 'You\'re not who you were a year ago. The data just shows what you\'ve been living.' });
    post.journal = [ 'What do you know you did this year that helped you feel safer?', 'What changed in your life, people, places or routines, that added safety?', 'What is one small thing you want to carry into next year?' ];
    post.chipQ = 'What most helped your safety this year?';
    return post;
  }

  function finalize(post, f){ if(post && f) post.share = f.share; if(post && post.blocks) post.blocks.forEach(x=>{ if(x.p) x.p = S(x.p); }); if(post) post.minutes = minutes(post); return post; }
  // ---------------------------------------------------------------- reading time
  function minutes(post){
    const w = (post.blocks||[]).filter(x=>x.p).reduce((a,x)=>a + String(x.p).replace(/<[^>]+>/g,'').split(/\s+/).length, 0) + (post.journal||[]).join(' ').split(/\s+/).length;
    return Math.max(1, Math.round(w/200));
  }

  // ---------------------------------------------------------------- snapshots (SVG)
  // col(key) → the state's colour (app passes STATE_COLOR). Text and lines use the
  // app's own tokens so the pictures follow light and dark.
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const T = (x,y,s,anchor,extra) => '<text x="'+x+'" y="'+y+'" text-anchor="'+(anchor||'middle')+'" font-size="10" fill="var(--muted)" font-family="Inter, system-ui, sans-serif"'+(extra||'')+'>'+esc(s)+'</text>';
  // the logo marks inside a snapshot (Justin, 2026-10-01: "those are essential"). Each mark in a
  // pair (play, stillness, freeze) is the same height as a single mark ("a group of 2 glyphs looks
  // smaller than a single one"). h = mark height in SVG units.
  const MARK_AXES = { safety:['heart'], fightflight:['bolt'], shutdown:['x'], play:['heart','bolt'], stillness:['heart','x'], freeze:['bolt','x'] };
  function markSVG(key, cx, cy, h, color){
    const I = global.SNB_ICONS || {}, ax = MARK_AXES[key]; if(!ax) return '';
    const parts = ax.map(k=>{ const v=((I[k]&&I[k].vb)||'0 0 1 1').trim().split(/\s+/).map(Number); return { k, vb:v, w: h*v[2]/v[3] }; });
    const gap = h*0.12, tot = parts.reduce((a,p)=>a+p.w,0) + gap*(parts.length-1);
    let x = cx - tot/2, out = '';
    parts.forEach(p=>{ out += '<svg x="'+x.toFixed(1)+'" y="'+(cy-h/2).toFixed(1)+'" width="'+p.w.toFixed(1)+'" height="'+h+'" viewBox="'+p.vb.join(' ')+'"><path d="'+((I[p.k]&&I[p.k].d)||'')+'" fill="'+color+'"/></svg>'; x += p.w + gap; });
    return out;
  }
  let gradSeq = 0;
  const gid = () => 'rdg' + (gradSeq++) + Math.random().toString(36).slice(2,6);
  const MONTH3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function snapSVG(kind, d, col){
    if(kind === 'week'){
      const W=300,H=150, mid=68, cx=dd=>26+dd*41, cy=m=>Math.max(10, Math.min(126, mid - m*120));
      let s = '<line x1="8" x2="292" y1="'+mid+'" y2="'+mid+'" stroke="var(--hairline)" stroke-width="1"/>';
      const byDay = {}; d.pts.forEach(p=>{ (byDay[p.d]=byDay[p.d]||[]).push(p); });
      const placed = [];
      Object.keys(byDay).forEach(k=>{ const a = byDay[k].sort((x,y)=>x.h-y.h); a.forEach((p,i)=>{ placed.push({ d:+k, h:p.h, key:p.key, after:p.after, x: cx(+k) + (i-(a.length-1)/2)*Math.min(9, 30/Math.max(1,a.length-1||1)), y: cy(p.m) }); }); });
      placed.sort((a,b)=>a.d-b.d || a.h-b.h);
      // the check-ins joined in order; each line fades from one state's color to the next (Justin, 2026-10-01: show the transitions)
      let defs = '', lines = '';
      for(let i=1;i<placed.length;i++){ const A=placed[i-1], B=placed[i], id=gid();
        defs += '<linearGradient id="'+id+'" gradientUnits="userSpaceOnUse" x1="'+A.x.toFixed(1)+'" y1="'+A.y.toFixed(1)+'" x2="'+B.x.toFixed(1)+'" y2="'+B.y.toFixed(1)+'"><stop offset="0" stop-color="'+col(A.key)+'"/><stop offset="1" stop-color="'+col(B.key)+'"/></linearGradient>';
        const hot = !d.focus || A.key===d.focus || B.key===d.focus;
        lines += '<line x1="'+A.x.toFixed(1)+'" y1="'+A.y.toFixed(1)+'" x2="'+B.x.toFixed(1)+'" y2="'+B.y.toFixed(1)+'" stroke="'+(hot ? 'url(#'+id+')' : 'var(--hairline)')+'" stroke-width="'+(hot?2:1.2)+'" stroke-linecap="round" opacity="'+(hot?(d.focus?0.95:0.7):1)+'"/>'; }
      s += (defs ? '<defs>'+defs+'</defs>' : '') + lines;
      // d.focus (a Recommended Learning card): that state filled, the rest outlined in their own color
      placed.forEach(p=>{ if(p.after && !d.focus) s += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="8.5" fill="none" stroke="var(--ink)" stroke-width="1"/>';
        s += (d.focus && p.key !== d.focus) ? '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="5" fill="var(--rd-card, #fff)" stroke="'+col(p.key)+'" stroke-width="1.6"/>'
                                           : '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="5.5" fill="'+col(p.key)+'"/>'; });
      ['S','M','T','W','T','F','S'].forEach((l,i)=>{ s += T(cx(i), 146, l); });
      return '<svg viewBox="0 0 '+W+' '+H+'" class="rd-viz" role="img" aria-label="This week\'s check-ins as dots by day. Dots above the line had more safety than defense.">'+s+'</svg>';
    }
    if(kind === 'inside'){
      const W=300, H=24+d.length*36, sx=v=>92+v*19; let s='';
      d.forEach((r,i)=>{ const y=20+i*36;
        s += '<line x1="'+sx(0)+'" x2="'+sx(10)+'" y1="'+y+'" y2="'+y+'" stroke="var(--hairline)" stroke-width="4" stroke-linecap="round"/>';
        if(r.s1 > r.s0) s += '<line x1="'+sx(r.s0)+'" x2="'+sx(r.s1)+'" y1="'+y+'" y2="'+y+'" stroke="'+col('safety')+'" stroke-width="4" stroke-linecap="round"/>';
        s += '<circle cx="'+sx(r.s0)+'" cy="'+y+'" r="4.5" fill="var(--bone)" stroke="var(--muted)" stroke-width="1.5"/>';
        s += '<circle cx="'+sx(r.s1)+'" cy="'+y+'" r="6" fill="'+col('safety')+'"'+(r.best?' stroke="var(--ink)" stroke-width="1.2"':'')+'/>';
        s += T(0, y+4, r.day + (r.anchor ? ' · ' + r.anchor : ''), 'start');
      });
      [0,5,10].forEach(v=>{ s += T(sx(v), H-2, v); });
      return '<svg viewBox="0 0 '+W+' '+H+'" class="rd-viz" role="img" aria-label="Your safety rating at the start and end of each practice">'+s+'</svg>';
    }
    if(kind === 'thennow'){
      const W=300, H=24+d.rows.length*40; let s='';
      d.rows.forEach((r,i)=>{ const y=20+i*40, k=Math.max(1, Math.min(8, Math.round(r[1])));
        s += T(0, y+4, r[0], 'start');
        for(let j=0;j<k;j++) s += '<circle cx="'+(100+j*20)+'" cy="'+y+'" r="6" fill="'+col('freeze')+'"/>';
        s += '<circle cx="'+(100+k*20)+'" cy="'+y+'" r="6" fill="'+col('safety')+'"/>';
        s += T(300, y+4, 'about ' + Math.round(r[1]), 'end');
      });
      return '<svg viewBox="0 0 '+W+' '+H+'" class="rd-viz" role="img" aria-label="Check-ins it took to get back to more safety than defense">'+s+'</svg>';
    }
    if(kind === 'dayparts' || kind === 'weeks' || kind === 'anchors'){
      const rows = kind==='dayparts' ? d.segs : d.rows; const W=300, H=16+rows.length*30;
      const max = kind==='anchors' ? Math.max(1, ...rows.map(r=>Math.abs(r[1]||0))) : 1;
      let s='';
      rows.forEach((r,i)=>{ const y=14+i*30, v = r[1];
        s += T(0, y+4, r[0], 'start');
        s += '<rect x="96" y="'+(y-6)+'" width="200" height="12" rx="6" fill="var(--hairline)" opacity="0.5"/>';
        if(v != null){ const w = Math.max(4, 200*Math.max(0, kind==='anchors' ? v/max : v)); s += '<rect x="96" y="'+(y-6)+'" width="'+w.toFixed(1)+'" height="12" rx="6" fill="'+col('safety')+'"/>'; }
      });
      return '<svg viewBox="0 0 '+W+' '+H+'" class="rd-viz" role="img" aria-label="'+(kind==='anchors'?'How much safety rose with each anchor':'How much had more safety than defense')+'">'+s+'</svg>';
    }
    if(kind === 'monthgrid'){
      const W=300, rows=Math.ceil((d.first + d.days.length)/7), H=18+rows*36; let s='';
      ['S','M','T','W','T','F','S'].forEach((l,i)=>{ s += T(22+i*42, 10, l); });
      // each day: its state's marks on the bone background, outlined in a darker shade of its color (Justin, 2026-10-01:
      // "cool but saturated in color. Make it the bone bg color.")
      d.days.forEach((k,i)=>{ const pos=i+d.first, c=pos%7, r=Math.floor(pos/7), x=6+c*42, y=18+r*36;
        s += '<rect x="'+(x+0.5)+'" y="'+(y+0.5)+'" width="31" height="29" rx="7" '+(k ? 'style="fill:var(--bone,#FAF9F5);stroke:color-mix(in srgb, '+col(k)+' 70%, var(--ink,#1A1F2A));stroke-width:1"' : 'fill="var(--hairline)" opacity="0.35"')+'/>';
        if(k) s += markSVG(k, x+16, y+15, 10, col(k)); });
      return '<svg viewBox="0 0 '+W+' '+H+'" class="rd-viz" role="img" aria-label="The month as a calendar, each day colored by the state that showed up most">'+s+'</svg>';
    }
    if(kind === 'strip' || kind === 'ribbon'){
      const n = d.rows.length, W=300, top=24, barH = kind==='ribbon'?44:52, H=top+barH+20, bw = W/n; let s='', defs='';
      let lastMarkX = -99;
      d.rows.forEach((k,i)=>{ const x=i*bw+0.6, w=Math.max(1.2,bw-1.2);
        if(!k){ s += '<rect x="'+x.toFixed(1)+'" y="'+top+'" width="'+w.toFixed(1)+'" height="'+barH+'" rx="'+(kind==='ribbon'?1.5:3)+'" fill="var(--hairline)" opacity="0.35"/>'; return; }
        const nx = d.rows[i+1] || k;
        let fill = col(k);
        if(nx !== k){ const id=gid(); defs += '<linearGradient id="'+id+'" x1="0" x2="1" y1="0" y2="0"><stop offset="0.55" stop-color="'+col(k)+'"/><stop offset="1" stop-color="'+col(nx)+'"/></linearGradient>'; fill = 'url(#'+id+')'; }
        s += '<rect x="'+x.toFixed(1)+'" y="'+top+'" width="'+w.toFixed(1)+'" height="'+barH+'" rx="'+(kind==='ribbon'?1.5:3)+'" fill="'+fill+'"/>';
        const cxm = i*bw + bw/2;
        if((i===0 || d.rows[i-1]!==k) && cxm - lastMarkX >= 24){ s += markSVG(k, cxm, 11, 11, col(k)); lastMarkX = cxm; }
      });
      // month names on the scale (Justin, 2026-10-01)
      if(d.ws0){ let lastM = -1; const labs = [];
        for(let i=0;i<n;i++){ const t = d.ws0 + i*7*DAY + 3*DAY, m = new Date(t).getMonth();
          if(m !== lastM){ labs.push({ x:i*bw, m }); lastM = m; } }
        // a month that only clips the start (a December week at the front of the year) would sit on top of the next
        // name ("Dec" over "Jan"): a name is drawn only when the next one is far enough along (2026-10-02)
        const gap = kind==='ribbon' ? 26 : 40;
        labs.forEach((l, j)=>{ const nx = labs[j+1]; if(nx && nx.x - l.x < gap) return; const x = l.x;
          s += '<line x1="'+(x+0.5).toFixed(1)+'" x2="'+(x+0.5).toFixed(1)+'" y1="'+(top+barH+2)+'" y2="'+(top+barH+7)+'" stroke="var(--muted)" stroke-width="1"/>' + T(x+1, H-2, kind==='ribbon' ? MONTH3[l.m] : MONTHS[l.m], 'start'); }); }
      return '<svg viewBox="0 0 '+W+' '+H+'" class="rd-viz" role="img" aria-label="Each week as a bar in the color of the state that led it, with the months below">'+(defs?'<defs>'+defs+'</defs>':'')+s+'</svg>';
    }
    return '';
  }

  // ---------------------------------------------------------------- mint plan
  // Which posts are due at `now` (released, not yet saved), and which saved posts are
  // still on the shelf. The calendar decides; a period with no check-ins has no post.
  function duePeriods(now){
    const out = [];
    const w = latestReleased('week', now); out.push(w);
    // weeks released earlier in this season are minted too, so a few days away doesn't lose them
    for(let ws = addDays(w.start, -7); PERIOD.week(ws).release >= quarterStart(now); ws = addDays(ws, -7)) out.push(PERIOD.week(ws));
    const m = latestReleased('month', now); out.push(m);
    for(let ms = addMonths(m.start, -1); PERIOD.month(ms).release >= quarterStart(now); ms = addMonths(ms, -1)) out.push(PERIOD.month(ms));
    out.push(latestReleased('season', now));
    out.push(latestReleased('year', now));
    return out;
  }
  // the shelf (Justin: dailies "fade out every couple of weeks"; weeks and months stay
  // for the season, then close into it; the best week stays; three seasons; the latest year)
  function shelf(posts, now){
    const qs = quarterStart(now);
    const weeks = posts.filter(x=>x.kind==='week'), months = posts.filter(x=>x.kind==='month'), seasons = posts.filter(x=>x.kind==='season'), years = posts.filter(x=>x.kind==='year');
    const newest = a => a.slice().sort((x,y)=>y.release-x.release);
    const keepW = newest(weeks).filter((x,i)=>i===0 || x.release >= qs);
    // the best week of the last closed season stays, with no label
    const lastQ = addMonths(qs, -3);
    const lastQWeeks = weeks.filter(x=>x.release >= lastQ && x.release < qs && x.share != null);
    const pinned = lastQWeeks.sort((x,y)=>y.share-x.share)[0] || null;
    if(pinned && keepW.indexOf(pinned) < 0) keepW.push(pinned);
    const keepM = newest(months).filter((x,i)=>i===0 || x.release >= qs);
    return newest(keepW.concat(keepM, newest(seasons).slice(0,3), newest(years).slice(0,1)));
  }

  global.Reader = {
    PERIOD, latestReleased, prevPeriod, duePeriods, shelf, compute, minutes,
    buildWeek:(f,c)=>finalize(buildWeek(f,c), f), buildMonth:(f,c)=>finalize(buildMonth(f,c), f), buildSeason:(f,c)=>finalize(buildSeason(f,c), f), buildYear:(f,c)=>finalize(buildYear(f,c), f), snapSVG, markSVG, MARK_AXES, ESSAY, teachList,
    weekStart, monthStart, quarterStart, yearStart, addDays, addMonths, sod, segOf, DAYS, MONTHS,
    _howMuch: howMuch, _weekLead: weekLead
  };
})(typeof window !== 'undefined' ? window : globalThis);
