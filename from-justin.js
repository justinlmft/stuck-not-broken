/* ============================================================================
   From Justin — daily note + deep (learn-more) reflection.  No AI, state-keyed.
   Drop-in module for Stuck Not Broken. Exposes window.FromJustin.

   TWO LAYERS
   1) Daily note (Today tab): a short piece chosen from the LAST check-in's state
      (Store.lastCheckin().dom), felt-language, no state name, no call to action.
   2) Deep reflection ("learn more"): present + what to expect (body), one small
      next step (invite), plus change / stuck / watch-for overlays. May name the
      state using the new two-axis label (already glossed in the body copy).

   Both pick with no immediate repeat per slot. Call FromJustin.refresh() when a
   check-in is saved so the daily note reacts to the new state.

   promptPolicy gate (daily note): open = any type; sparing = a journal prompt
   only ~1 in 4; withhold = never auto-show a journal prompt.

   API (E2, 2026-08-22 — the deep/learn-more layer and the legacy reader were
   deleted dead: zero callers; app.js teaches states via its own STATE_DETAIL)
     FromJustin.today([lastCheckin]) -> { state, label, id, type, text }
        reads Store.lastCheckin() if no arg; 'neutral' before today's 1st check-in.
        cached until refresh() so re-renders are stable. (Superseded by daily();
        kept while call sites still fall back to it.)
     FromJustin.daily([dayArc])      -> the live daily note (the Now tab's line)
     FromJustin.refresh()            clear the daily cache (call on check-in save)
     FromJustin.pick(stateKey)       -> { id, type, text }  raw daily pick
     FromJustin.blog(ctx)            -> the essay-model reader issue
     FromJustin.weekReview / periodSection / monthly / quarterly -> period prose
     FromJustin.LIBRARY              raw daily-note data

   Content source of truth: "Stuck Not Broken - From Justin (content + logic).md".
   ========================================================================== */
(function (global) {
  'use strict';

  // bold the parts of a reader sentence that are actually personal to the reader —
  // percentages, counts, state names, dates/labels — the same way the You-tab cards
  // already bold their numbers (.cb-line b in app.js). Escapes the value first (it
  // may be user data, e.g. a name) so this can never inject anything beyond the
  // literal <b>...</b> wrapper; app.js's boldHtml() is the matching piece that lets
  // that <b> survive into the rendered paragraph (Justin 2026-07-28: "bold all
  // dynamic elements in the reader").
  function _esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function hl(s){ return '<b>'+_esc(s)+'</b>'; }

  const LIBRARY = {
    "safety": {
      "label": "safe",
      "promptPolicy": "open",
      "pieces": [
        {
          "id": "safe-rem-1",
          "type": "reminder",
          "text": "Feeling present isn't the finish line. It's a place to rest, remind your system what safety actually feels like, and even challenge your system to grow capacity. Doing so makes it easier to find this experience again."
        },
        {
          "id": "safe-rem-2",
          "type": "reminder",
          "text": "Safety isn't the absence of hard emotions. It's having enough capacity inside to meet them."
        },
        {
          "id": "safe-ref-1",
          "type": "reflection",
          "text": "In a settled moment like this one, the same problems are still there; they just don't run the show. That steadiness is worth noticing instead of rushing past."
        },
        {
          "id": "safe-ref-2",
          "type": "reflection",
          "text": "It's easy to skip right over these good moments, already bracing for the next hard one. You're allowed to let this one be and sit with it for a bit. No rush."
        },
        {
          "id": "safe-ref-3",
          "type": "reflection",
          "text": "You're present enough. Connected enough. Good job."
        },
        {
          "id": "safe-jp-1",
          "type": "journal prompt",
          "text": "What's one small thing that helped you feel a little more like yourself today?"
        },
        {
          "id": "safe-jp-2",
          "type": "journal prompt",
          "text": "When you feel present like this, what becomes possible that doesn't when you're not?"
        },
        {
          "id": "safe-jp-3",
          "type": "journal prompt",
          "text": "You've earned this level of safety. How do you feel about yourself?"
        },
        {
          "id": "safe-jp-4",
          "type": "journal prompt",
          "text": "Safety doesn't stay around forever. It'll come and go. Can you give your system permission to come in and out of safety?"
        }
      ]
    },
    "play": {
      "label": "regulated mobilization",
      "promptPolicy": "open",
      "pieces": [
        {
          "id": "regmob-rem-1",
          "type": "reminder",
          "text": "Energy with a little safety mixed in is a good place to be. This is the kind of drive that doesn't cost you later."
        },
        {
          "id": "regmob-rem-2",
          "type": "reminder",
          "text": "Not all activation is something to calm down. Some of it is just you, moving toward what matters."
        },
        {
          "id": "regmob-ref-1",
          "type": "reflection",
          "text": "On days like this it's easier to say the honest thing, set the limit, start the thing you've been putting off. The same energy that feels like too much when you're on edge feels like fuel when you're steady."
        },
        {
          "id": "regmob-ref-2",
          "type": "reflection",
          "text": "There's a kind of busy that drains you and a kind that fills you, isn't there? This is the second one. Worth knowing the difference in your body. So, pause and take notice."
        },
        {
          "id": "regmob-jp-1",
          "type": "journal prompt",
          "text": "What do you most want to put this energy toward right now?"
        },
        {
          "id": "regmob-jp-2",
          "type": "journal prompt",
          "text": "Is there a boundary or a conversation that feels possible today that didn't last week?"
        },
        {
          "id": "regmob-jp-3",
          "type": "journal prompt",
          "text": "How are you feeling about yourself right now? Your potential?"
        },
        {
          "id": "regmob-jp-4",
          "type": "journal prompt",
          "text": "You've earned this, haven't you? Tell the truth."
        }
      ]
    },
    "stillness": {
      "label": "regulated immobilization",
      "promptPolicy": "open",
      "pieces": [
        {
          "id": "regimm-rem-1",
          "type": "reminder",
          "text": "Rest isn't just a reward you earn after everything's done. It's a necessity for restoring your system's balance."
        },
        {
          "id": "regimm-ref-1",
          "type": "reflection",
          "text": "Sink into the stillness within you and around you."
        },
        {
          "id": "regimm-ref-2",
          "type": "reflection",
          "text": "Being quiet and close to someone safe, or quiet and alone, can both feel like coming home. Notice it while it's here."
        },
        {
          "id": "regimm-jp-1",
          "type": "journal prompt",
          "text": "When it's this quiet inside, what's been waiting for your attention?"
        },
        {
          "id": "regimm-jp-2",
          "type": "journal prompt",
          "text": "What's something you understand now that you couldn't see when things were louder?"
        },
        {
          "id": "regimm-jp-3",
          "type": "journal prompt",
          "text": "If a younger version of you could feel this kind of calm, what would you want them to know?"
        }
      ]
    },
    "fightflight": {
      "label": "dysregulated mobilization",
      "promptPolicy": "sparing",
      "pieces": [
        {
          "id": "dysmob-rem-1",
          "type": "reminder",
          "text": "Yes, things are urgent and that's real. But not all of it is equal and you know this. You also know that you're at your best when you can breathe a bit more."
        },
        {
          "id": "dysmob-rem-2",
          "type": "reminder",
          "text": "Speeding up is the body trying to handle something. It isn't a flaw, even when it bumps into the people around you."
        },
        {
          "id": "dysmob-rem-3",
          "type": "reminder",
          "text": "Irritability and anxiousness are safety running low, not a reflection of your worth. It's something to understand, not to judge."
        },
        {
          "id": "dysmob-ref-1",
          "type": "reflection",
          "text": "Sometimes the mind races to stay ahead of a feeling it doesn't want to catch up with. And that makes it even harder to slow down."
        },
        {
          "id": "dysmob-ref-2",
          "type": "reflection",
          "text": "Being wired and worn out at the same time is one of the harder places to be."
        },
        {
          "id": "dysmob-jp-1",
          "type": "journal prompt",
          "text": "What's one thing your body might need right now: to move, to rest, or to be heard?"
        },
        {
          "id": "dysmob-jp-2",
          "type": "journal prompt",
          "text": "What's your current emotion? And how does that emotion want to move?"
        }
      ]
    },
    "shutdown": {
      "label": "dysregulated immobilization",
      "promptPolicy": "withhold",
      "pieces": [
        {
          "id": "dysimm-rem-1",
          "type": "reminder",
          "text": "Collapsed isn't broken. It's a flavor of stuck. And stuck is temporary."
        },
        {
          "id": "dysimm-rem-2",
          "type": "reminder",
          "text": "Going quiet and heavy is one of the oldest ways the body protects you. It isn't weakness, even when it feels like nothing at all."
        },
        {
          "id": "dysimm-rem-3",
          "type": "reminder",
          "text": "On the heavy days, getting through is maybe enough. You don't owe anyone more than that today."
        },
        {
          "id": "dysimm-ref-1",
          "type": "reflection",
          "text": "Shutdown can feel like the lights dimming. Heavy, far away, hard to care. That's not you failing. It's an old protective response, the kind that kicks in to get you through."
        },
        {
          "id": "dysimm-ref-2",
          "type": "reflection",
          "text": "When everything feels flat, it's easy to believe that's just who you are now. It isn't. It's a state, and states shift."
        },
        {
          "id": "dysimm-ref-3",
          "type": "reflection",
          "text": "Sometimes it feels like you're living behind glass. It does pass, even when it doesn't seem like it will."
        },
        {
          "id": "dysimm-jp-1",
          "type": "journal prompt",
          "text": "What's one sound you can effortlessly hear? Or is there silence?"
        },
        {
          "id": "dysimm-jp-2",
          "type": "journal prompt",
          "text": "What's one color catching your eye?"
        },
        {
          "id": "dysimm-jp-3",
          "type": "journal prompt",
          "text": "Where is one imaginary place you would go to be in stillness? A place you could breathe easy and be free from pressure?"
        }
      ]
    },
    "freeze": {
      "label": "freeze",
      "promptPolicy": "sparing",
      "pieces": [
        {
          "id": "freeze-rem-1",
          "type": "reminder",
          "text": "Feeling stuck in place isn't the same as nothing happening. Inside, a lot is, and it's working hard to keep you protected."
        },
        {
          "id": "freeze-rem-2",
          "type": "reminder",
          "text": "You don't have to force your way out of stuck. Sometimes the smallest movement is enough to remind the body it can move at all."
        },
        {
          "id": "freeze-rem-3",
          "type": "reminder",
          "text": "Being caught between wanting to move and not being able to is one of the hardest places to be. There's nothing wrong with you for being here."
        },
        {
          "id": "freeze-ref-1",
          "type": "reflection",
          "text": "Stuck can feel like holding your breath without meaning to. Like being ready and frozen at the same time."
        },
        {
          "id": "freeze-ref-2",
          "type": "reflection",
          "text": "Freeze might be the current state of your body. And maybe it's been that way for a long time. But not the permanent state of your body."
        },
        {
          "id": "freeze-jp-1",
          "type": "journal prompt",
          "text": "Can you wiggle your toes even while frozen?"
        },
        {
          "id": "freeze-jp-2",
          "type": "journal prompt",
          "text": "Can you roll your wrists even from freeze? If so, you opened a bit of mobility. Good job."
        },
        {
          "id": "freeze-jp-3",
          "type": "journal prompt",
          "text": "Can you roll your neck while in this freeze state?"
        },
        {
          "id": "freeze-jp-4",
          "type": "journal prompt",
          "text": "Can you acknowledge your emotion without rejecting it? If not, that's okay for now."
        }
      ]
    },
    "neutral": {
      "promptPolicy": "open",
      "pieces": [
        {
          "id": "neutral-rem-1",
          "type": "reminder",
          "text": "Your current experience is an opportunity to reflect. Check in when (and if) you're ready."
        },
        {
          "id": "neutral-rem-2",
          "type": "reminder",
          "text": "You don't have to change how you feel to check in. Just notice it."
        },
        {
          "id": "neutral-ref-1",
          "type": "reflection",
          "text": "Some days you can connect with your body more than others. And that's okay. Progress, not perfection."
        },
        {
          "id": "neutral-jp-1",
          "type": "journal prompt",
          "text": "If you had to guess, what's one word for how today feels in your body?"
        }
      ]
    }
  };


  // ---- shared no-repeat cycler ------------------------------------------------
  const _last = {};                                   // slotKey -> last index shown
  function cycle(slotKey, arr){
    if(!arr || !arr.length) return '';
    if(arr.length === 1) return arr[0];
    let i; do { i = Math.floor(Math.random()*arr.length); } while(i === _last[slotKey]);
    _last[slotKey] = i;
    return arr[i];
  }

  // ---- daily note -------------------------------------------------------------
  const _lastId = {};
  let   _cache = null;
  let   _promptTick = 0;

  function sameDay(t){
    const d = new Date(t), n = new Date();
    return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
  }
  function stateKeyFor(lastCheckin){
    if(lastCheckin && sameDay(lastCheckin.t) && LIBRARY[lastCheckin.dom]) return lastCheckin.dom;
    return 'neutral';
  }
  function pick(stateKey){
    const st = LIBRARY[stateKey] || LIBRARY.neutral;
    let pieces = st.pieces.slice();
    if(st.promptPolicy === 'withhold'){
      pieces = pieces.filter(p => p.type !== 'journal prompt');
    } else if(st.promptPolicy === 'sparing'){
      const allowPrompt = (_promptTick++ % 4 === 0);
      if(!allowPrompt) pieces = pieces.filter(p => p.type !== 'journal prompt');
    }
    if(!pieces.length) pieces = st.pieces.slice();
    let pool = pieces.filter(p => p.id !== _lastId[stateKey]);
    if(!pool.length) pool = pieces;
    const piece = pool[Math.floor(Math.random()*pool.length)];
    _lastId[stateKey] = piece.id;
    return { id: piece.id, type: piece.type, text: piece.text };
  }
  function today(lastCheckin){
    const last = (lastCheckin !== undefined)
      ? lastCheckin
      : (global.Store && Store.lastCheckin ? Store.lastCheckin() : null);
    // onboarding: on the very first check-in (or before any exist), the card welcomes instead of
    // reading a state, so a brand-new user isn't handed a pattern note before there's a pattern.
    const _tn = (global.Store && Store.tenure) ? Store.tenure() : null;
    if(_tn && _tn.stage === 'start'){
      if(_cache && _cache.state === '__onboard') return _cache.note;
      _cache = { state: '__onboard', note: { state:'start', label:'', id:'onboard', type:'reminder', text: cycle('onboard-start', ONBOARD_START) } };
      return _cache.note;
    }
    const key = stateKeyFor(last);
    if(_cache && _cache.state === key) return _cache.note;
    const p = pick(key);
    _cache = { state: key, note: Object.assign({ state: key, label: (LIBRARY[key]||{}).label || '' }, p) };
    return _cache.note;
  }
  function refresh(){ _cache = null; }

  // ---- daily reflection ("for you" daily card, reflections DAILY tier) --------
  // Justin's VERBATIM §17 copy (all-app-copy.md). Assembly per his spec: one Meet
  // line (names the felt experience, never the precise state) + one Point or Ask
  // (Ask gated by policy: open/sparing/withhold). A 2nd+ same-day check-in adds a
  // shared Arc line; a post-practice check-in swaps in a shared Delta line. Arrays
  // cycle no-repeat. State keys map dom -> his sections (play=safe & mobile,
  // stillness=safe & immobile, neutral=present/neutral).
  const DAILY = {
    safety: { policy:'open',
      meet:["You're grounded in the here and now.","You're connected with the present moment.","Present and connected. (enough, at least.)"],
      point:["Worth staying with for a moment, before the next thing pulls at you. (Which it probably will.)","A good opportunity to get familiar with this state, so it's easier to find again.","Rest in it for a moment. Take it in."],
      ask:["What helped you arrive here, even a little?","What feels possible right now that doesn't always?","How is your body naturally breathing right now?"] },
    play: { policy:'open',
      meet:["Charged up but connected.","Energy moving, and it feels more like fuel than pressure.","Wound up but in a good way, with some ease in the mix."],
      point:["Point it at one thing that matters.","If it wants company, spend it with someone who has earned your trust.","Keep a little safety in the mix, and it stays energized without the crash."],
      ask:["What do you most want to put this toward right now?","What's one thing worth starting today?","What's something you've been putting off that you have the energy for now?","How is your body naturally breathing right now?"] },
    stillness: { policy:'open',
      meet:["Quiet, and okay being quiet.","Slowed all the way down, and okay with the slowness.","Settled and soft right now.","Stillness internally. And ability to connect with stillness externally."],
      point:["This is an opportunity for real rest.","Nowhere to be for a minute. Let yourself marinate in it."],
      ask:["When it's this quiet, what's been waiting for your attention?","What's easier to hear now than when things are loud?","An opportunity to connect with your inner world.","How is your body naturally breathing right now?"] },
    fightflight: { policy:'sparing',
      meet:["Wound up and hard to settle.","A lot of charge moving, looking for somewhere to go.","Maybe irritable. Maybe anxious. Maybe both?"],
      point:["The internal activation is real, and the discomfort that it brings.","This kind of charge needs somewhere to go. A little movement on purpose helps more than holding still."],
      ask:["What type of movement would your system love right now? Would you rather go for a run or lift weights? Use your legs or your arms?","What's the feeling underneath the internal activation?","How is your body naturally breathing right now?"] },
    shutdown: { policy:'withhold',
      meet:["Heavy, far-off, low on energy.","Flat and slowed down right now.","Little energy to care. Yet, you're showing up here."],
      point:["You don't force your way out of this. One small, low-demand thing is plenty: a sip of tea, a look out the window, a toe wiggle.","It can feel permanent from the inside, even though it isn't. And yeah, maybe it's been this way for a long while."],
      ask:["What's one sound you can hear without trying?","What's one color in front of you right now?","How is your body naturally breathing right now?"] },
    freeze: { policy:'sparing',
      meet:["Braced. Wanting to move yet stuck at the same time.","Immobile on the outside, but a lot is going on inside.","Holding your breath without meaning to, huh?"],
      point:["The way through isn't forced. A wiggle of the toes, a neck rotation, one big breath into the chest.","Pushing hard tends to lock it tighter. Smaller and slower is better for the system when you can."],
      ask:["Can you roll your wrists or wiggle your toes? If so, a little movement just opened up.","Can you let the feeling be here without pushing it away? If not, that's okay for now.","Can you take one intentional breath and let it out slower? And then, can you stretch one part of your body?","How is your body naturally breathing right now?"] },
    neutral: { policy:'open',
      meet:["Hard to pin down right now, and that's fine.","Somewhere in between, nothing too obvious."],
      point:["Nothing to change. Noticing is enough.","Check in whenever you're ready, or let it be for now."],
      ask:["If you had to guess, what's one word for how this moment sits in your body?","How is your body naturally breathing right now?"] }
  };
  // Shared Arc line — 2nd+ same-day check-in, keyed to within-day movement.
  const DAILY_ARC = {
    eased:   ["A couple of check-ins in today, and things have eased since this morning. Worth noticing the shift."],
    charged: ["You started more grounded, and there's more energy now. Pay attention to that feeling and what it might want."],
    mixed:   ["You've moved through a few different places today. That's range (and you're still showing up), not instability."],
    steady:  ["Today has held pretty steady so far."]
  };
  // Shared Delta line — post-practice check-in, keyed to the shift (the safety moment).
  const DAILY_DELTA = {
    eased:    ["You did a practice, and you're more grounded now than before. These little practices add up over time."],
    held:     ["The practice didn't shift much this time, which is okay. Showing up for the practice is the rep that builds, whether or not it moves obviously. An imperfect rep is still a rep."],
    struggled:["That was a tough one to stay with, and you stayed anyway. That's the rep, even when it doesn't feel like one. It's something to learn from and adapt to next time."]
  };
  function _dailySecond(key, st){
    // pick Point or Ask: open -> alternate Ask/Point; sparing -> Ask ~1 in 4; withhold -> Point only
    let useAsk = false;
    if(st.policy === 'open')        useAsk = (Math.random() < 0.5);
    else if(st.policy === 'sparing') useAsk = (_promptTick++ % 4 === 0);
    if(useAsk && st.ask && st.ask.length) return cycle('daily-ask:'+key, st.ask);
    return cycle('daily-point:'+key, st.point);
  }
  function daily(ctx0){
    const t = (ctx0 && ctx0.n!=null) ? ctx0
            : ((global.Store && Store.today) ? Store.today() : { moments:[], sessions:[], n:0, dir:null, deltas:[] });
    const last = (global.Store && Store.lastCheckin) ? Store.lastCheckin() : null;
    const n = t.n || 0;
    // No check-in today: graceful present/neutral prompt (his copy). Tappable to the
    // reader when there's prior history, static otherwise.
    if(n===0){
      const st0 = DAILY.neutral;
      const text0 = st0.meet[1] + ' ' + st0.point[1];   // "Somewhere in between..." + "Check in whenever you're ready..."
      return { state: last ? last.dom : 'neutral', n:0, text: text0 };
    }
    const dom = t.last.dom;
    const st = DAILY[dom] || DAILY.neutral;
    const parts = [ cycle('daily-meet:'+dom, st.meet), _dailySecond(dom, st) ];
    // same-day extra line: a post-practice latest moment -> Delta; else 2+ moments -> Arc
    const M = t.moments || [];
    const lastM = M[M.length-1], prevM = M.length>=2 ? M[M.length-2] : null;
    const sBetween = (t.sessions||[]).find(s => s.t < lastM.t && (!prevM || s.t > prevM.t));
    if(sBetween){
      const beforeV = prevM ? prevM.v : null;
      const rose = (beforeV!=null) && (lastM.v > beforeV + 0.04);
      const dkey = (sBetween.feedback === 'struggle') ? 'struggled' : (rose || sBetween.feedback === 'more') ? 'eased' : 'held';
      parts.push(cycle('daily-delta', DAILY_DELTA[dkey]));
      // per-session emotion shift beat: what they set out to work with vs what surfaced
      const shift = (global.Store && Store.emotionShift) ? Store.emotionShift(sBetween) : null;
      if(shift && shift.surfaced && shift.surfaced.length){ const line = _emotionShiftLine(shift); if(line) parts.push(line); }
    } else if(n >= 2){
      const distinct = M.map(m=>m.dom).filter((d,i,a)=>a.indexOf(d)===i).length;
      const akey = distinct >= 3 ? 'mixed' : t.dir==='up' ? 'eased' : t.dir==='down' ? 'charged' : 'steady';
      parts.push(cycle('daily-arc', DAILY_ARC[akey]));
    }
    return { state: dom, n, text: parts.join(' ') };
  }



  // ---- custom blog: the "for you" reader, assembled from the user's signals ----
  // RUNDOWNS was the deep teaching library of the retired legacy reader (E2): only
  // the short felt names survive, read by _feltName. The prose bodies are gone.
  const RUNDOWNS = { shutdown:{label_felt:'shutdown'}, safety:{label_felt:'safety'}, play:{label_felt:'play & motivation'}, stillness:{label_felt:'stillness & intimacy'}, fightflight:{label_felt:'flight/fight'}, freeze:{label_felt:'freeze'} };

  // ---- onboarding daily-card notes (felt, proper case, no first person, no state name) ----
  const ONBOARD_START = ["You can check in as often or as little as you like. The app tracks morning, afternoon, evening, and late night. So, to get the best results, check in throughout the day and learn how your system shifts over the span of a day, a week, and beyond."];
  const STATE_NAMES = { safety:'safety', play:'regulated mobilization (play and motivation)', stillness:'regulated immobilization (stillness and intimacy)', fightflight:'flight/fight', shutdown:'shutdown', freeze:'freeze' };
  // short felt name for in-sentence use (transitions / time-of-day), e.g. "flight/fight", "play & motivation"
  function _feltName(k){ return (RUNDOWNS[k] && RUNDOWNS[k].label_felt) || STATE_NAMES[k] || k; }
  const SEG_PHRASE = { morning:'mornings', afternoon:'afternoons', evening:'evenings', late:'late nights' };
  function _recoveryPhrase(rec){ return rec.avg<=1.5 ? 'a check-in or two' : 'about '+Math.round(rec.avg)+' check-ins'; }
  // heading builder: {pre, state, post} instead of a flat string, so the renderer can color
  // just the state word in the state's own palette color without any fragile text-matching.
  // state is '' for headings that don't reference a state name (the renderer treats that as
  // "render pre as plain text").
  function _heading(dom, pre, withState, post){ return { pre:pre||'', state: withState ? _feltName(dom) : '', post:post||'' }; }

  // ============================================================================
  // THE FOR-YOU ESSAYS (reader rework, 2026-07-03).
  // One authored essay per state, developed start to finish. Deterministic: the
  // same data always renders the same words, so the copy is stable and stays
  // Justin-editable. Live numbers appear inside sentences as evidence, never as
  // a stats block. Source of truth: App Designer/Reader-Rework/*-essay.md.
  // ctx signals (all optional, self-gating): name, nState, nTotal, streak (days),
  // dir ('rising'|'falling'|'steady'), f2s (freeze->shutdown transitions this
  // week), pi (best practice insight for this state), defDom (dominant
  // non-safety state from history), baseline (Store.baselineDelta over ~28d).
  // ============================================================================
  const ESSAY_DEK = {
    freeze:      'What freeze is, why it stays, and how it thaws.',
    shutdown:    'What shutdown is, why it stays, and how energy comes back.',
    fightflight: 'What flight/fight is, why it stays, and where the charge wants to go.',
    play:        'What play and motivation are, why they hold together, and how to spend the energy well.',
    stillness:   'What stillness is, why it isn\'t shutdown, and how to let it restore you.',
    safety:      'What safety is, why it comes and goes, and how to make it easier to find.'
  };
  const ESSAY_TAIL = {
    freeze:      'So, this is all about what freeze is, and why it isn\'t what it looks like from the outside.',
    shutdown:    'So, this is all about what shutdown is, and why the heaviness isn\'t who you are.',
    fightflight: 'So, this is all about that wired, on-edge state, and what the charge is actually for.',
    play:        'So, this is all about that energized, connected state, and how to keep it working for you.',
    stillness:   'So, this is all about the quiet kind of regulation, and why it\'s not the same as shutting down.',
    safety:      'So, this is all about what safety is, and why it\'s worth your attention while it\'s here.'
  };
  const ESSAY_ENCOURAGE = {
    freeze:      'Take note and give yourself a pat on the back.',
    shutdown:    'Give yourself some honest credit, nothing forced.',
    fightflight: 'That\'s a rep. Count it.',
    play:        'Throw yourself a little celebratory party in your imagination. (No one will know.)',
    stillness:   'Worth a quiet nod to yourself.',
    safety:      'Give yourself a kudos.'
  };
  // practice doors follow the Safety Spectrum ladder (practice-decision-matrix.md)
  const ESSAY_DOOR = {
    freeze:      'The practice tab has something shaped for where you are right now. In freeze, the place to start is safety, built in small doses. Anchor into a bit of safety first. Once anchored, connecting with the defense side becomes possible.',
    shutdown:    'The practice tab has something shaped for where you are right now. In shutdown, that means the smallest doses: simple mindfulness and safety building, nothing that asks for effort you don\'t have.',
    fightflight: 'The practice tab has something shaped for where you are right now. With this much charge, the order matters: settle a little of the energy first, find some safety, and then it\'s easier to work with what\'s underneath.',
    play:        'The practice tab has something shaped for a state like this: using the energy while you have it, in a way that builds capacity instead of spending it all at once.',
    stillness:   'The practice tab has something shaped for a settled state like this. This kind of quiet is good ground for gentle inner work, in doses, while you have the calm to hold it.',
    safety:      'This is the state with the most capacity available, which makes it the right time for the harder practices: anchoring into safety, then connecting with a little of the harder stuff in a dose, then coming back. The practice tab has that work waiting when you want it.'
  };
  const DEFENSE_TELL = {
    freeze:      'that braced, held-breath feeling',
    fightflight: 'anxiousness or irritability',
    shutdown:    'the flat, far-off heaviness'
  };
  function _essayOpen(ctx){
    const felt = _feltName(ctx.dom);
    let body;
    if(ctx.nState!=null && ctx.nTotal!=null && ctx.nTotal>=3){
      // percentages, never "X of N" (Justin, 2026-07-04: counting fractions is cognitive load)
      body = 'about ' + hl(Math.round(ctx.nState/ctx.nTotal*100)+'%') + ' of your check-ins this week were ' + hl(felt) + '. ' + ESSAY_TAIL[ctx.dom];
    } else {
      body = 'your last check-in was ' + hl(felt) + '. ' + ESSAY_TAIL[ctx.dom];
    }
    // the greeting name is real user text — escaped (not bolded: a shouted name at
    // the top of every essay reads as noise, not emphasis) so it can never carry
    // stray markup through boldHtml()'s narrow <b> allowlist on the app.js side.
    if(ctx.name) return _esc(ctx.name) + ', ' + body;
    return body.charAt(0).toUpperCase() + body.slice(1);
  }
  function _essayInsight(ctx){
    const pi = ctx.pi; if(!pi) return ESSAY_DOOR[ctx.dom];
    const label = (global.Store && Store.practiceLabel) ? Store.practiceLabel(pi.practiceKey) : pi.practiceKey;
    const pct = Math.round(pi.rate*20)*5;
    return 'Lately, in the ' + hl(SEG_PHRASE[pi.seg]||pi.seg) + ', ' + hl(label) + ' has tended to help you connect more with safety afterward, about ' + hl(pct+'%') + ' of the time. ' + ESSAY_ENCOURAGE[ctx.dom];
  }
  // Moments & Baseline (Justin's spec, 2026-07-03): Baselines form over a month or
  // more. Under ~4 weeks of history: name the week, promise the baseline. Month+:
  // compare each week against the formed baseline, adjusted weekly. The monthly
  // reflection carries the baseline update (see MONTHLY.baseline).
  function _essayBaseline(ctx){
    if(!(global.Store && Store.periodStats && Store.tenure)) return '';
    const now = Date.now();
    const wk = (ctx.weekStats !== undefined) ? ctx.weekStats : Store.periodStats(now - 7*864e5, now);
    if(!wk || wk.n < 3) return '';
    const days = (ctx.histDays != null) ? ctx.histDays : ((Store.tenure()||{}).days || 0);
    // Scheme B (§7.2): band the CONNECTION level (avgV) into how reachable safety has been.
    // No percentages — the person is their own scale; words, not numbers.
    const band = v => v >= 0.50 ? 'within reach' : v >= 0.40 ? 'coming and going' : 'hard to reach';
    // pre-Baseline: too early to call it
    if(days < 28){
      return 'Zoom out for a second. So far this week, safety has been ' + hl(band(wk.avgV)) + '. It\'s too early to call this a baseline, so we\'ll keep watching it through your check-ins for another few weeks. By then a clearer pattern should be forming.';
    }
    // Baseline formed (month+): this week vs the baseline, in words not numbers
    const base = Store.periodStats(now - 28*864e5, now);
    if(!base || base.n < 8) return '';
    const d = wk.avgV - base.avgV;
    const move = d >= 0.05 ? 'a little higher than it\'s been' : d <= -0.05 ? 'a bit lower than usual' : 'about where it\'s been';
    const close = d >= 0.05 ? 'That\'s how a baseline shifts: one week at a time.'
                : d <= -0.05 ? 'A quieter week is a moment in the bigger picture, not a slide. Gentle is fine for now.'
                : 'Holding steady is its own kind of solid ground.';
    return 'Zoom out for a second. Over the past month, safety has been ' + hl(band(base.avgV)) + '. This week came in ' + hl(move) + '. ' + close;
  }
  const ESSAYS = {
    freeze: function(ctx){
      const H=(p,w,s)=>_heading('freeze',p,w,s);
      const sec=[];
      sec.push({ id:'blog-2', heading:H('What ',true,' is'), paras:[
        _essayOpen(ctx),
        'From the outside, freeze looks like nothing happening. But you know better. It\'s the held breath with tension in your chest you weren\'t aware of. It\'s being ready to move but unable to, like your body pressing the gas and the brake at the same time. The gas is flight/fight energy (jittery, activated, readiness) and the brake is shutdown (numb and distant). Mobility + Immobility.',
        'That\'s why freeze feels the way it does. Panic is the urge to run that can\'t run. Rage is the urge to fight that can\'t fight. It also shows up as fear, stress, and overwhelm. The energy is real, and it has nowhere to go yet. The way out is not through force; that\'s just more gas against a locked brake. The brake lifts with safety, a little at a time.'
      ]});
      const why=[
        'Freeze holds because both pedals stay pressed. The energy underneath doesn\'t drain on its own, and the brake doesn\'t lift until your body gets enough cues of safety. Until then, the state keeps itself going.',
        'Two coping habits keep it pressed longer. The first is forcing through the day and collapsing at the end of it, then doing the same thing tomorrow. Force reads to your body as more threat, so the brake holds tighter. The second is faking rest. Doom-scrolling looks like rest, but it numbs the experience instead of letting your system settle. It\'s coping, and coping is fine. It just won\'t lift the brake.',
        'Your thinking plays a part here too. Freeze thinking runs scattered and all-or-nothing: everything feels impossible, or it all has to happen right now. Those thoughts stem from the state, and they feed it back, because a mind insisting on all-or-nothing keeps the body braced. You don\'t have to argue with the thoughts. When a little safety comes in and the state thaws, the thinking loosens with it.'
      ];
      if((ctx.streak||0)>=3) why.push('You\'ve checked in around freeze for '+hl(ctx.streak+' days')+' now. Long stretches in one place are common; that\'s basically what stuck means. It doesn\'t mean you\'ve stalled, and it isn\'t evidence that this is who you are. It\'s a state. States shift, even the ones that have been around a long time.');
      sec.push({ id:'blog-3', heading:H('Why ',true,' stays'), paras:why });
      const shift=[
        'Thawing doesn\'t announce itself. It shows up small. A breath that goes deeper on its own. A stretch that happens without deciding to. The urge to move starting to feel more like wanting to than having to.',
        'But what about the other direction? If the tension leaves but you\'re just left feeling flat, numb, empty, and distant, that\'s not a thaw. That\'s more like shutdown. That\'s the brake aspect of a freeze becoming more dominant and the entire system slipping into collapse. And yes, it\'s very possible that a system can fluctuate between freeze and shutdown.'
      ];
      if(ctx.dir==='rising') shift.push('Your data is already showing some evidence of a thaw happening. You\'re reporting more safety in your last few check-ins than you were before. It\'s small, sure. But it\'s real.');
      if((ctx.f2s||0)>=2) shift.push('Your check-ins this week suggest more of the shutdown flavor of things. This is by no means a failure. A system in freeze tends to do better with small, regular doses of practice primarily focusing on simple mindfulness and safety.');
      sec.push({ id:'blog-4', heading:H('How you\'ll know it\'s shifting',false), paras:shift });
      sec.push({ id:'blog-5', heading:H('What to try',false), paras:[
        'One thing, and keep it small: a cue of safety plus the smallest movement. Let your eyes go wherever they want in the room. Then roll your wrists or wiggle your toes, slow. The safety asks the brake to ease, and the movement reminds your body it can move at all. That\'s one rep. In freeze, reps count for more than size.',
        _essayInsight(ctx)
      ]});
      sec.push({ id:'blog-6', heading:H('Where this can go',false), paras:[
        'The energy locked up in freeze isn\'t the enemy. It\'s the same fuel that runs motivation and play once safety is mixed in. As the brake learns it can lift, that fuel comes back to you. First as small movements, then as wanting things again.',
        'Freeze is where your body is right now. Maybe it\'s been here a long time. It\'s not where your body stays.',
        'Stuck, not broken. And stuck is temporary.'
      ].filter(Boolean)});
      return sec;
    },
    shutdown: function(ctx){
      const H=(p,w,s)=>_heading('shutdown',p,w,s);
      const sec=[];
      sec.push({ id:'blog-2', heading:H('What ',true,' is'), paras:[
        _essayOpen(ctx),
        'Shutdown is the oldest brake your body has. (The theory behind this app calls it dorsal vagal.) When danger is too much and you can\'t escape it or fight it, your body survives by powering down and conserving what\'s left. It feels cold, heavy, drained, numb, far away. Through this lens, a lot of what gets called depression is the body in shutdown.'
      ]});
      const why=[
        'Shutdown stays because the body doesn\'t have enough energy yet to come back online. Pushing against it, forcing yourself up and out, spends what little energy there is and deepens the collapse instead.',
        'It also stays because the mind starts telling a story that matches the state: that this is just who you are now, that nothing will help. The hopelessness feels like stone-carved truth. It isn\'t. Thoughts follow states, and that story is the shutdown talking, not the facts.'
      ];
      if((ctx.streak||0)>=3) why.push('You\'ve checked in around shutdown for '+hl(ctx.streak+' days')+' now. Long stretches here are common, and they\'re exactly when the "this is just me now" story gets loudest. It\'s a state. States shift, even the slow ones.');
      sec.push({ id:'blog-3', heading:H('Why ',true,' stays'), paras:why });
      const shift=[
        'The first signs of energy returning are small and easy to miss. Caring a little about one thing. Noticing you\'re hungry. A window you actually wanted open.',
        'Something that people mistake all the time is that irritability is a bad thing. But it\'s potentially a very strong sign of coming out of shutdown. It\'s a signal that the immobilization is easing, and mobilization is returning to the system. So, as you add safety and the body tries to regulate, irritability may surface. If enough safety is in the system, shutdown beautifully merges with it to form stillness.',
        'Another potential of shutdown shifting is an increase in freeze. As mobilization comes into the system, it\'s possible the shutdown does not ease, and instead co-exists with the re-emerged flight/fight activation. That combination makes freeze. Freeze is immobile like shutdown, but it\'s tense, not collapsed.'
      ];
      if(ctx.dir==='rising') shift.push('Your data is already showing more safety coming in. You\'re reporting more of it in your last few check-ins than you were before. It\'s a small shift. In shutdown, small shifts are the whole game.');
      sec.push({ id:'blog-4', heading:H('How you\'ll know it\'s shifting',false), paras:shift });
      sec.push({ id:'blog-5', heading:H('What to try',false), paras:[
        'Very small, very low demand. One sip of tea. A dimmer light. One thing you can hear without trying. You don\'t climb out of shutdown by forcing it. You offer your body a small cue of safety, and it may allow a little more energy back in. Pay close attention to a breath that wants to be bigger, an ankle that wants to stretch, or a bit of motivation to do the thing you\'ve wanted to do forever.',
        'In the heavy moments, getting through is enough. You don\'t owe anyone more than that today, including yourself. Showing up here and checking in honestly already counts.',
        _essayInsight(ctx)
      ]});
      sec.push({ id:'blog-6', heading:H('Where this can go',false), paras:[
        'Hold this lightly if it\'s hard to believe right now. Small, low-demand safety cues, repeated, shift shutdown toward stillness. A similar internal quiet, but peaceful instead of numb. As energy returns, it might show up as motivation. It might also show up as irritability. Either one is good news, because it means things are moving again.',
        'Feeling permanent isn\'t the same as being permanent.',
        'You\'re not broken. You\'re stuck, and stuck is something that moves.'
      ].filter(Boolean)});
      return sec;
    },
    fightflight: function(ctx){
      const H=(p,w,s)=>_heading('fightflight',p,w,s);
      const sec=[];
      sec.push({ id:'blog-2', heading:H('What ',true,' is'), paras:[
        _essayOpen(ctx),
        'Flight/fight is mobilizing energy without enough safety mixed in yet. Your body\'s threat radar picked up danger (real or remembered) and got you ready to handle it. Flight tends to come first: the legs, escape, distance, anxiety. Then fight: the upper body, push, boundaries, anger.',
        'An emotion is the conscious experience of an impulse you haven\'t acted on. Anxiety is the run that hasn\'t run. Anger is the fight that hasn\'t been fought. Neither one is the enemy. They\'re a mobilized body doing its job, even when it bumps into the people around you.'
      ]});
      sec.push({ id:'blog-3', heading:H('Why ',true,' stays'), paras:[
        'Flight/fight keeps running because the body hasn\'t gotten enough of a safety signal to stand down yet. It\'s not stubbornness, and it\'s not a bad habit. It\'s a system still on alert. It stays revved when the urgency gets treated as fact instead of as a feeling, and when the energy has no small outlet in the meantime.',
        'Your thinking reinforces your state as well. No, it\'s not just a matter of changing how you think since your thoughts also stem from your state. So, the blame, the worst-case thinking, the everything-is-urgent feeling. That\'s the brain narrating a revved-up body, not the truth about your life. When your state shifts more toward safety, your thinking will change on its own.'
      ]});
      const shift=[
        'As mobilized flight/fight combines with safety, the urgency settles more and more. Some things that are actually urgent still get your urgent attention, but with more patience. And the other stuff... it can wait without everything falling apart. With safety, your mobilization turns into motivation to create and get stuff done. With others, you\'re more likely to play and share in fun.',
        'But what if there isn\'t enough safety in the system? If not, then flight/fight continues to be anxious and angry. Over time, it will lean more toward shutdown or possibly freeze. No, it\'s not a character defect. It\'s just a system that needs more safety.'
      ];
      if(ctx.dir==='rising') shift.push('You\'re reporting more safety in your last few check-ins than you were before. Not a big drop in charge, but a real one.');
      sec.push({ id:'blog-4', heading:H('How you\'ll know it\'s shifting',false), paras:shift });
      sec.push({ id:'blog-5', heading:H('What to try',false), paras:[
        'Move a little, on purpose. Thirty seconds of shaking out your hands, a quick walk, palms pushed against a wall. Give the energy somewhere to go, then name the feeling underneath it. Naming it is a solid first step to letting it move through instead of running you.',
        'And try taking one intentional breath and lengthening the exhale. It\'s not a cure for your activation, but it might open the potential for a bit of settling or open a path for mindful movement.',
        _essayInsight(ctx)
      ]});
      sec.push({ id:'blog-6', heading:H('Where this can go',false), paras:[
        'Every small cue of safety gives this energy somewhere to go. Over time, mobilization with safety mixed in becomes motivation and play. Same fuel, different mix. The energy was never the problem.',
        'You\'re not broken, and you\'re not too much. You\'re mobilized, but not enough safety has been mixed in yet. Yet.'
      ].filter(Boolean)});
      return sec;
    },
    play: function(ctx){
      const H=(p,w,s)=>_heading('play',p,w,s);
      const sec=[];
      sec.push({ id:'blog-2', heading:H('What ',true,' is'), paras:[
        _essayOpen(ctx),
        'This is energy with safety mixed in. This is the exact same inner fuel that runs flight/fight activation, but regulated and directed at something. With people you trust, it shows up as play. On your own, it shows up as motivation (to create, produce, exercise, dance, etc.). The energy was never the problem. Whether safety is mixed in is the whole difference.',
        'There\'s a kind of busy that drains you and a kind that fills you. This is the second one. You can tell because there\'s still room to notice your body, still room to stop if you want to.'
      ]});
      sec.push({ id:'blog-3', heading:H('Why ',true,' stays'), paras:[
        'This state holds together as long as safety keeps riding along with the energy. The drive comes from mobilization, the ease comes from safety, and they\'re happening at the same time, not one after the other.',
        'That\'s also why you don\'t have to be taught to "calm down" here. Not all activation is something to fix. Some of it is just you, moving toward what matters, with enough safety mixed in to enjoy the ride. Check in with it along the way and it tends to stay what it is.',
        'Your thinking joins in here too. In this state, thoughts turn curious, inventive, big-picture. Ideas connect easier. That kind of thinking feeds the state right back, which is part of why a good creative run can carry itself for hours. Notice it, and it tends to keep rolling.'
      ]});
      const shift=[
        'One tell is anxiousness or irritability creeping into what started as motivation. Keep an eye out for it and try to notice it when it\'s small. If not, safety tends to slip away and then you\'re in more flight/fight activation without the safety to direct it. Behaviorally, you might snap at people, fun becomes loud competition, and creativity becomes perfectionism.',
        'That\'s not a reason to hold back, though. It\'s just worth knowing where the edge is. The energy is good. The safety is what keeps it good.'
      ];
      if(ctx.dir==='rising') shift.push('And your check-ins say the mix is holding. You\'re reporting more safety in your last few check-ins than you were before. Keep spending the energy the way you have been.');
      sec.push({ id:'blog-4', heading:H('How you\'ll know it\'s shifting',false), paras:shift });
      sec.push({ id:'blog-5', heading:H('What to try',false), paras:[
        'Aim it before it scatters. Pick the one thing that matters most and give it ten minutes. You don\'t have to finish it, just begin. Keep a little mindfulness attached to the movement while you do, enough to actually feel it.',
        'If it\'s the social kind, spend it on people. Reach out to someone who\'s earned your trust and do something together, even something simple. Play with a safe other is about as regulating as it gets.',
        _essayInsight(ctx)
      ]});
      sec.push({ id:'blog-6', heading:H('Where this can go',false), paras:[
        'Keep a little safety mixed into this energy, and it stays fuel instead of turning into a fire. Over time, you get to mobilize during the day and still settle into stillness in the evening, and the drive stops costing you on the back end.',
        'It\'s just how the body works. Whether you\'re mobile or immobile, change is always close.'
      ].filter(Boolean)});
      return sec;
    },
    stillness: function(ctx){
      const H=(p,w,s)=>_heading('stillness',p,w,s);
      const sec=[];
      sec.push({ id:'blog-2', heading:H('What ',true,' is'), paras:[
        _essayOpen(ctx),
        'Stillness is your body slowed all the way down with safety mixed in. It\'s the same slowing you\'d feel in shutdown, but the safety changes everything. Immobility without fear is stillness. Immobility with fear mixed in is a different state entirely. On your own, this shows up as rest and reflection. Shared with someone safe, the same settledness becomes intimacy. (A pet counts, but we don\'t need to call it "intimacy.")',
        'Rest isn\'t a reward you earn after everything\'s done. It\'s how your system restores its balance. This is the state behind real sleep, sitting still without crawling out of your skin, and easy closeness with someone safe.'
      ]});
      sec.push({ id:'blog-3', heading:H('Why ',true,' stays'), paras:[
        'Stillness holds as long as your body trusts it\'s allowed to stop. That trust is the safety mixed into the slowdown, and it\'s the whole difference between resting and just going quiet.',
        'As long as that trust is there, the quiet keeps doing its job: restoring you instead of flattening you. Stopping is doing something here. It\'s not nothing.',
        'Thinking has its own quality here too. In stillness, thoughts go contemplative and reflective, more wondering than working. That kind of thinking deepens the quiet instead of disturbing it. If planning and problem-solving start crowding back in, that\'s fine. It\'s just worth noticing which one your body is actually asking for.'
      ]});
      const shift=[
        'Ask yourself if the immobility within you is restful and comfortable... or not. If it starts feeling flat, heavy, or far away instead, that\'s the safety thinning out and stillness drifting toward its harder twin, shutdown. Same slowed-down body, opposite experience. Shutdown\'s pull is to isolate and disconnect. Stillness\'s pull is to rest and connect.',
        'If you notice that drift, the move isn\'t to force yourself up and out. It\'s to reach for a little safety: a familiar voice, a safe person nearby, one thing in the room that feels good to look at.'
      ];
      if(ctx.dir==='rising') shift.push('Your check-ins back the restful reading. You\'re reporting more safety in your last few check-ins than you were before. Slow and quiet, which suits this state.');
      sec.push({ id:'blog-4', heading:H('How you\'ll know it\'s shifting',false), paras:shift });
      sec.push({ id:'blog-5', heading:H('What to try',false), paras:[
        'You don\'t have to deserve this through overworking. Sink into it and follow your system where it wants to take you. Five minutes with no task and no phone counts.',
        'If a safe person or pet is near, be quiet near them. No talking required. Quiet, close, easy. That\'s stillness and connection at the same time, and it\'s about as regulating as it gets.',
        _essayInsight(ctx)
      ]});
      sec.push({ id:'blog-6', heading:H('Where this can go',false), paras:[
        'Let this rest actually restore you and it does more than feel good. Immobile with safety mixed in is where the body recovers and where the deeper work gets done. Keep practicing it, and stillness stays stillness: quiet you can sink into without disappearing.',
        'Collapsed, still, or somewhere in between, the body can move again.'
      ].filter(Boolean)});
      return sec;
    },
    safety: function(ctx){
      const H=(p,w,s)=>_heading('safety',p,w,s);
      const sec=[];
      sec.push({ id:'blog-2', heading:H('What ',true,' is'), paras:[
        _essayOpen(ctx),
        'Safety is your body open to the world. Calm enough to connect, maybe playful enough to laugh easily, with enough room inside to meet what\'s usually a challenge. (The theory behind this app calls it ventral vagal.) When it\'s online, your body isn\'t braced for anything, so its resources go to health, connection, and repair instead of defense.',
        'Safety is not the absence of hard emotions. It\'s having enough capacity inside to meet them. You can be in safety and still have a hard moment. The difference is there\'s enough room to handle it without spiraling into defense.'
      ]});
      sec.push({ id:'blog-3', heading:H('Why ',true,' stays'), paras:[
        'Safety holds when your body keeps getting small, real signals that things are okay right now: enough rest, a face or voice it trusts, a moment with nothing urgent in it. It doesn\'t need those signals nonstop, just often enough.',
        'And safety fading on its own is normal, not a failure. It comes and goes for everyone. That\'s how it\'s supposed to work. You don\'t keep it by holding still and hoping. You keep it by noticing it while it\'s here and going back to whatever brought it, again and again.',
        'Thinking runs differently here too. In safety, thoughts open up: more curiosity, more empathy, more room to reason things through. And it works in both directions. Open thinking feeds the state that made it possible. Worth noticing what kinds of thoughts feel available right now that don\'t always.'
      ]});
      const shift=[
        'Safety that goes unnoticed tends to fade quietly. Nothing went wrong; it just didn\'t get a rep. If the last few days felt easier and you can\'t quite say why, that\'s worth a second look, because naming what helped is what makes safety easier to find next time.',
        'But what about the early signs of it thinning out? Your patience might get thinner. You might feel a bit more anxious or irritable. Maybe more distant. It really depends mostly on what your dominant non-safety state is. As safety recedes, your dominant underlying state comes more to the surface. It\'s not good or bad. It\'s maybe an indication of your safety state\'s strength. Frustrating? Maybe. But also encouraging? Hopefully.'
      ];
      if(ctx.defDom && DEFENSE_TELL[ctx.defDom]) shift.push('For you, lately, that underlying state has been ' + _feltName(ctx.defDom) + '. So the early tell to watch for is ' + DEFENSE_TELL[ctx.defDom] + ' creeping back in.');
      if(ctx.dir==='rising') shift.push('Your data says this state is getting stronger. You\'re reporting more safety in your last few check-ins than you were before. Safety adds a little at a time and keeps building. Keep it up.');
      sec.push({ id:'blog-4', heading:H('How you\'ll know it\'s shifting',false), paras:shift });
      sec.push({ id:'blog-5', heading:H('What to try',false), paras:[
        'Notice it on purpose. Where exactly do you feel... settled or calm? Playful or motivated? Those emotions are a great sign of safety, but pay attention. If you can notice what safety feels like in your body, then you\'re anchored into it and deepening the experience. As best you can, look inward and really feel the safety within you. How does your body breathe in safety? What\'s your posture like? Are you more likely to smile? To hug someone?',
        'And don\'t grab it too tight. Can you let it be here without needing it to stay? Giving your system permission to move in and out of safety is part of how the capacity grows.',
        _essayInsight(ctx)
      ]});
      sec.push({ id:'blog-6', heading:H('Where this can go',false), paras:[
        'Keep noticing safety and using it the way you have been, and it stops being a visitor and starts becoming a baseline. That\'s what the practice reps do over time. The goal was never to feel safe all the time. It\'s to build enough safety to move freely among all of your body\'s states without getting stuck.',
        'Either way, you\'ve proven your system can find safety. It might be worth trusting your body a bit more.'
      ].filter(Boolean)});
      return sec;
    }
  };
  // ---- "What your patterns show" (2026-07-05): the written version of the You-tab
  // stats. DRAFT copy in Justin's voice — pending his word-review. Every sentence
  // self-gates on a real signal (ctx.patterns, computed by the reader from the same
  // helpers as the You tab), so the section only exists when the data says something.
  // Lessons and meaning BELONG here (they were cut from the stat cards on purpose).
  // Frozen weekly mints never pass ctx.patterns, so archived weeks never borrow live data.
  function _essayPatterns(ctx){
    const p = ctx.patterns; if(!p) return null;
    const parts = [];
    if(p.day){
      const dayLabel = p.day.label.charAt(0).toUpperCase()+p.day.label.slice(1);
      let s = 'Your most regulated day keeps being ' + hl(dayLabel+'s') + ': ' + hl(p.day.pct+'%') + ' of those check-ins have safety in them.';
      if(p.seg) s += ' By time of day, your ' + hl(p.seg.seg+'s') + ' carry the most safety, at ' + hl(p.seg.pct+'%') + '.';
      s += ' Days like that are worth studying, because whatever they hold and whatever you\'re doing, your system likes it.';
      // the context inputs can name a candidate for "whatever you're doing"
      if(p.context && p.context.tagPct >= p.context.typPct) s += ' Your tags already point to one candidate: “' + hl(p.context.label) + '.”';
      parts.push(s);
    }
    if(p.shift){
      parts.push('When your state changes, it\'s often ' + hl(_feltName(p.shift.a)) + ' to ' + hl(_feltName(p.shift.b)) + '. That shift has shown up ' + hl(p.shift.count) + ' times. Patterns like this might have a clear trigger directly before, though it\'s not always obvious. It might be as subtle as the time of day.');
    }
    if(p.comeback){
      let s = 'After a dip into defense, safety usually returns within ' + hl(p.comeback.phrase) + '. That\'s happened ' + hl(p.comeback.n) + ' times';
      s += p.comeback.faster ? ', and those dips have been getting shorter. That\'s your safety state showing signs of strengthening and increased regulation.' : '. Your system is showing it can re-regulate.';
      parts.push(s);
    }
    if(p.record){
      // 2026-07-28 (Justin): this line rendered byte-identical every time the same week
      // held the record, which reads as flat/stale rather than motivating. Two fixes:
      // (1) name how long the record has held — real, changing information, not just
      // rephrasing; (2) rotate the wording itself so repeat views don't feel canned. Both
      // keyed off weeks-since, so the SAME record naturally reads differently as time
      // passes rather than needing new data to say anything new.
      const wsAgo = (p.record.ws!=null) ? Math.max(0, Math.round((Date.now()-p.record.ws)/(7*864e5))) : null;
      const held = (wsAgo && wsAgo>0) ? (wsAgo===1 ? ', one week on' : ', ' + wsAgo + ' weeks on') : '';
      const wkLabel = hl('the week of ' + p.record.label), wkPct = hl(p.record.pct+'%');
      const variants = [
        hl('The week of ' + p.record.label) + ' is still your most regulated week yet' + held + ', with ' + wkPct + ' of its check-ins carrying safety. That week is proof of capacity. Your system has done it, which means it can do it again.',
        wkPct + ' of check-ins carried safety ' + wkLabel + ', still your best week on record' + held + '. Whatever that week held, your system already knows how to find it.',
        'Your most regulated week is still ' + wkLabel + held + ', at ' + wkPct + ' safety. Not a ceiling. Evidence. Your system has reached it before.'
      ];
      parts.push(variants[wsAgo!=null ? (wsAgo % variants.length) : 0]);
    }
    if(p.context){
      const up = p.context.tagPct >= p.context.typPct;
      let s = 'The weeks you tagged “' + hl(p.context.label) + '” carried ' + (up?'more':'less') + ' safety: ' + hl(p.context.tagPct+'%') + ' of check-ins, against ' + hl(p.context.typPct+'%') + ' in a typical week.';
      s += (p.context.peRate!=null)
        ? ' Practice runs alongside too: when a check-in comes within a few hours of a practice, it carries more safety about ' + hl(p.context.peRate+'%') + ' of the time.'
        : ' Worth noticing what those weeks held.';
      parts.push(s);
    }
    if(p.ctxStates && (p.ctxStates.safe || p.ctxStates.def)){
      const bits=[];
      if(p.ctxStates.safe) bits.push('“'+hl(p.ctxStates.safe.label)+'” is what you name most around your safe check-ins');
      if(p.ctxStates.def) bits.push((bits.length?'and ':'')+'“'+hl(p.ctxStates.def.label)+'” shows up most around defense');
      parts.push('You\'ve started naming what\'s hitting hardest in the moment. So far, ' + bits.join(', ') + '. This data will make the harder moments more predictable and manageable. And let you prepare for the easier ones with more intentional mindfulness.');
    }
    if(parts.length < 2) return null;                    // one lonely fact isn't a section
    parts.unshift(cycle('pats-lead', [
      'Your check-ins have been building a map. A few landmarks worth naming this week.',
      'Zoom in on your patterns for a moment, because they\'re becoming clearer.'
    ]));
    return { id:'blog-pats', heading:_heading(ctx.dom,'What your patterns show',false), paras:parts, fresh:true };
  }

  // ---- emotion + rung reader beats (recommender-v2 data -> reader, 2026-07-07) --
  // Group->state bridge for user-facing copy. Keyed to the same emotion groups as
  // Store.EMOTION_FAMILIES (there is no Store.EMOTION_STATE — D7); the word
  // "SSIEC" is internal and never shown. Bridges are offered as a lens ("could be"),
  // never scored — more-safety stays the only scored axis. Straw phrasing 🖊 Justin owns;
  // the Direction-1 per-session template and the change-data conditional are his approved copy.
  const EMO_BRIDGE = { anxious:'flight activation', angry:'fight activation', sad:'a move toward shutdown', fear:'a freeze response', connected:'a sign of safety in the system' };
  const PAT_BRIDGE = { anxious:'mobilized energy, the body geared up to act', angry:'mobilized energy, the body geared up to act', sad:'the body conserving, pulling inward', fear:'energy and brake at once', connected:'a sign of safety' };
  const _RUNG_WORD = { validate:'validating & normalizing', imagery:'imagery & invitation', obstacles:'obstacles', balancing:'balancing', pendulation:'pendulation' };
  function _rungWord(k){ return _RUNG_WORD[k] || k; }
  const _artA = w => (/^[aeiou]/i.test(String(w||'')) ? 'an ' : 'a ');
  // per-session shift beat (daily reader). shift = Store.emotionShift(session).
  function _emotionShiftLine(shift){
    if(!shift) return '';
    const surf = (shift.surfaced || []).slice();
    if(!shift.intent){
      if(!surf.length) return '';
      return 'You didn\'t set an intention this time, and ' + _artA(surf[0]) + surf[0] + ' emotion surfaced. Good job noticing what was maybe already there.';
    }
    const nonConn = surf.filter(k => k!=='connected');
    const hasConn = surf.indexOf('connected') >= 0;
    let whatSurfaced;
    if(!surf.length) whatSurfaced = 'not much this time';
    else { const primary = nonConn[0] || surf[0];
      whatSurfaced = _artA(primary) + primary + ' one';
      if(hasConn && primary!=='connected') whatSurfaced += ', along with a connected one'; }
    let s = 'You set out to work with ' + _artA(shift.intent) + shift.intent + ' emotion, and what surfaced was ' + whatSurfaced + '. This is totally normal and expected. The body brings forth what it\'s ready for, not necessarily what we have planned for it.';
    const bits = [];
    const primary = nonConn[0];
    if(primary && EMO_BRIDGE[primary]) bits.push('The ' + primary + ' emotion could be ' + EMO_BRIDGE[primary]);
    if(hasConn) bits.push('the connected one is ' + EMO_BRIDGE.connected);
    if(bits.length) s += ' ' + bits.join('; ') + '.';
    return s;
  }
  // period emotion mix line (monthly/quarterly + essay), spanWord e.g. 'this month'.
  function _periodEmotionLine(e, spanWord){
    if(!e || !e.topFamily) return '';
    const top = e.topFamily, pct = e.families[top];
    let s = 'Across your practices ' + spanWord + ', ' + _artA(top) + top + ' type of emotion surfaced most, in about ' + pct + '% of the ones where you named a feeling.';
    if(top==='connected'){
      s += ' That\'s a sign of safety showing up while you practiced.';
    } else {
      if(PAT_BRIDGE[top]) s += ' That type is usually ' + PAT_BRIDGE[top] + '.';
      if(e.connectedPct>0) s += ' A connected type showed up in about ' + e.connectedPct + '%, a sign of safety while you practiced.';
    }
    return s;
  }
  // essay "what's been surfacing" section (weekly/live), from Store.emotionPatterns().
  function _essayEmotion(ctx){
    const e = ctx.emotion; if(!e || !e.topFamily) return null;
    const s = _periodEmotionLine(e, 'lately');
    const prompt = 'When you set out to work with one type of emotion and a different one shows up, what do you make of that? Do you think this is evidence of self-regulation? Or something else?';
    return { id:'blog-emo', heading:_heading(ctx.dom,'What\'s been surfacing',false), paras:[s, prompt], fresh:true };
  }
  // rung movement sentence for the period altitudes. mv = Store.rungMovement(win).
  function _rungMovementLine(mv, whenWord){
    if(!mv || !mv.moved) return '';
    return whenWord + ' you were practicing ' + _rungWord(mv.from) + ', and now you\'re working with ' + _rungWord(mv.to) + '.';
  }
  // essay "your self-regulation practice" section: which skill + why (from the data),
  // the next skill, and the change-data conditional (Justin-approved). ctx.rung =
  // Store.rungStory().
  function _essayRung(ctx){
    const r = ctx.rung; if(!r || !r.hasHistory) return null;
    const cur = r.strongest || (r.cleared && r.cleared.length ? r.cleared[r.cleared.length-1] : null);
    const parts = [];
    if(cur){
      let s = 'In your self-regulation practice, you\'ve been working with ' + _rungWord(cur) + (r.curDesc ? ': ' + r.curDesc : '') + '.';
      const because = r.reason==='more' ? 'left you feeling more connected afterward, not less'
                    : r.reason==='steadier' ? 'were followed by check-ins with more safety'
                    : 'have been going well, more than not';
      s += ' This skill was recommended because your recent ' + _rungWord(cur) + ' practices ' + because + '.';
      if(r.next) s += ' When you\'re ready to try it, the next skill is ' + _rungWord(r.next) + (r.nextDesc ? ', ' + r.nextDesc : '') + '.';
      parts.push(s);
    } else if(r.next){
      parts.push('In your self-regulation practice, the next skill is ' + _rungWord(r.next) + (r.nextDesc ? ', ' + r.nextDesc : '') + '.');
    }
    parts.push('Self-regulation happens incrementally, not all at once. It\'s normal and expected to move forward in practices, and then move backward. The next recommended practices will adapt based on your check-ins. If you report lower safety, the app will ease back into shorter, gentler practices, and more time building safety before moving into defense. If you report safety is holding, the app will build practices with the next skill level challenge.');
    return { id:'blog-rung', heading:_heading(ctx.dom,'Your self-regulation practice',false), paras:parts, fresh:true };
  }

  function blog(ctx0){
    ctx0 = ctx0 || {};
    const dom = ctx0.dom || ((global.Store&&Store.lastCheckin)?(Store.lastCheckin()||{}).dom:null);
    if(!dom || !ESSAYS[dom]) return null;
    const tn = ctx0.tenure || ((global.Store&&Store.tenure)?Store.tenure():null) || { stage:'week', returning:false };
    const stage = ctx0.stage || tn.stage || 'week';
    const ctx = Object.assign({}, ctx0, { dom:dom, stateName: STATE_NAMES[dom]||dom, stage:stage });
    if(ctx.name==null && global.Store && Store.getName) ctx.name = Store.getName() || '';
    if(ctx.pi===undefined && global.Store && Store.practiceInsights){
      const pis = (Store.practiceInsights()||[]).filter(x=>x&&x.dom===dom);
      ctx.pi = pis.length ? pis.sort((a,b)=>b.total-a.total||b.rate-a.rate)[0] : null;
    }
    // thin data: no trend/streak/baseline claims (honesty gate, same as before)
    const thin = (stage==='start' || stage==='early' || tn.returning);
    if(thin){ ctx.dir=null; ctx.streak=0; ctx.f2s=0; ctx.weekStats=null; ctx.patterns=null; }
    const dek = ESSAY_DEK[dom];
    const secs = ESSAYS[dom](ctx);
    const pats = _essayPatterns(ctx);
    if(pats) secs.splice(1, 0, pats);                    // fresh data early: right after "What X is"
    // emotion surface patterns sit next to the check-in patterns (both "what's showing up")
    const emo = _essayEmotion(ctx);
    if(emo) secs.splice(pats ? 2 : 1, 0, emo);
    // the self-regulation rung story + change-data lands late, near "What to try"/"Where this can go"
    const rung = _essayRung(ctx);
    if(rung) secs.splice(Math.max(secs.length-1, 0), 0, rung);
    // the baseline zoom-out gets the same fresh treatment as the patterns section
    // (2026-07-05): its own highlighted section just before the close, instead of
    // hiding as a paragraph inside "Where this can go"
    const zoom = _essayBaseline(ctx);
    if(zoom) secs.splice(Math.max(secs.length-1, 0), 0, { id:'blog-zoom', heading:_heading(dom,'Zoom out',false), paras:[zoom.replace(/^Zoom out for a second\. /,'')], fresh:true });
    return { stateName: ctx.stateName, dom:dom, stage:stage, dek:dek,
             bullets:[{ text:dek }],                    // back-compat: weekly mint summary + old renderers
             sections: secs };
  }

  // ---- monthly + quarterly reflections (the long-range altitudes) ------------
  // DRAFT copy in Justin's voice — pending his word-review. Single flowing narrative
  // (a few named patterns), assembled from periodStats + baselineDelta + recovery.
  const _DOW = ['Sundays','Mondays','Tuesdays','Wednesdays','Thursdays','Fridays','Saturdays'];
  function _fillMQ(t, o){
    return String(t==null?'':t)
      .replace(/\{DOM\}/g,o.DOM||'').replace(/\{FIRST\}/g,o.FIRST||'').replace(/\{LAST\}/g,o.LAST||'')
      .replace(/\{PCT\}/g,o.PCT!=null?String(o.PCT):'').replace(/\{DAY\}/g,o.DAY||'').replace(/\{SPAN\}/g,o.SPAN||'this stretch')
      .replace(/\{N\}/g,o.N||'').replace(/\{DAYS\}/g,o.DAYS!=null?String(o.DAYS):'');
  }
  const _QSPAN = { q:'these past three months', half:'these past six months', year:'this past year' };
  const MONTHLY = {
    opener: ["A month of moments now.","A whole month of check-ins behind you.","You've shown up for around thirtyish days, and we have enough data to see the patterns of your nervous system."],
    where: ["Most of your check-ins reflect {DOM} about {PCT}%.","About {PCT}% of this month's check-ins leaned mostly toward {DOM}."],
    baseline: {
      up: ["Baseline update: your safety baseline is sitting higher than last month. This is the kind of shift only a month can show, and it's yours.","Baseline update: across the month, your baseline climbed. Worth celebrating and leaning a bit more into."],
      down: ["Baseline update: your safety baseline is running a bit lower than last month. Baselines dip with life context, and they come back the same way they formed: small, steady reps. Go easy.","Baseline update: a quieter month, with your baseline down a little. Not a setback, just a season. Keep the basics going."],
      flat: ["Baseline update: your safety baseline held steady across the month. Stable is something you can build on."]
    },
    rhythm_dow: ["Looks like your {DAY} tend to carry a bit more safety state than other days. Worth noticing what's different about them, so you can do more of it.","Your {DAY} carry a little more safety than the rest, more often than not. A small clue about what's working for you."],
    recovery: ["There's also a pattern in how your system rebounds after a dip into defense. It tends to return to safety within {N}. It knows the way back. Now you pay attention and follow its lead.","After an energized stretch, you usually find your way to more safety within {N}. That shows capacity building."],
    close: ["No grades here. Just a month of getting to know your nervous system, one honest moment at a time. Keep going.","A month in, and this picture is yours now. It gets clearer the longer you stay with it.","Whatever this month held, you showed up for it. That's the part that compounds."]
  };
  function monthly(ctx0){
    ctx0 = ctx0 || {}; const st = ctx0.stats; if(!st || st.n<8) return null;
    const o = { DOM:_feltName(st.dom), PCT:st.domShare, DAY: st.bestDow!=null?_DOW[st.bestDow]:'' };
    const parts = [ cycle('mo-open', MONTHLY.opener), _fillMQ(cycle('mo-where', MONTHLY.where), o) ];
    const bd = ctx0.baseline;
    if(bd && bd.dir && bd.dir!=='new' && MONTHLY.baseline[bd.dir]) parts.push(_fillMQ(cycle('mo-base:'+bd.dir, MONTHLY.baseline[bd.dir]), {}));
    if(st.bestDow!=null) parts.push(_fillMQ(cycle('mo-dow', MONTHLY.rhythm_dow), o));
    const rec = ctx0.recovery;
    if(rec && rec.avg!=null) parts.push(_fillMQ(cycle('mo-rec', MONTHLY.recovery), { N:_recoveryPhrase(rec) }));
    // emotion mix + self-regulation movement over the month (recommender-v2)
    const emoLine = _periodEmotionLine(ctx0.emotion, 'this month');
    if(emoLine) parts.push(emoLine);
    const mvLine = _rungMovementLine(ctx0.movement, 'At the start of the month');
    if(mvLine) parts.push(mvLine);
    parts.push(cycle('mo-close', MONTHLY.close));
    return { text: parts.join(' '), stats: st };
  }
  const QUARTERLY = {
    opener: {
      q:    ["Three months of check-ins now.","A full quarter behind you, long enough to see a real arc and not just a week."],
      half: ["Half a year of check-ins. Well done. Now, you can see a clear picture of your nervous system over the long term.","You're six months in! Let's take a look at what your nervous system has been up to."],
      year: ["A year of check-ins, wow! Let's slow down and see what the data says.","A full year of check-ins behind you. We'll look at your nervous system history in detail before you get going on the next year's worth."]
    },
    thennow: {
      improved: ["When {SPAN} began, your check-ins reflected mostly {FIRST}. Lately they reflect more {LAST}. That's not just a mood, it's a sustainable autonomic shift that you earned. (And are still earning.)","By the end of {SPAN} you're sitting closer to {LAST}, after starting mostly in {FIRST}. The data is just showing what you've been building."],
      steady_reg: ["Across {SPAN}, your system stayed mostly steady, {FIRST} early and {LAST} lately. A long regulated run like this shows sustainable progress."],
      holding: ["Across {SPAN}, there's been a lot of {FIRST}, and it's close to {LAST}. Stuck defense can last a while, can't it? It won't last forever, though."]
    },
    baseline: {
      up: ["Your safety state baseline is higher than where {SPAN} began. That's the kind of change only months can show.","Your safety state runs higher now than at the start of {SPAN}. A slow climb, and a real one."],
      down: ["You've been reporting safety a little less than at the start of {SPAN}. It happens. The basics and small safety reps are how it comes back.","Your safety state was less obvious this period than the last. Go gently. It'll return."],
      flat: ["Your safety state baseline held fairly level across {SPAN}. Stable is good. You can build on stable."]
    },
    recovery: ["And in how you come back: after dropping into a defense state, you tend to return to safety within {N}. That's capacity you've earned.","You come back faster than you might think, usually within {N} once you've dipped. That's real."],
    totals: ["Across {SPAN}: {N} check-ins over {DAYS} days. Every one of them was you, paying attention."],
    close: {
      q:    ["You're a little more familiar with your nervous system than you were three months ago. Keep going."],
      half: ["Six months of check-ins and practices. You know your patterns now in a way you didn't before. Knowing is a win. And what comes next will be a win, too."],
      year: ["You're not who you were a year ago. The data says what you've been living and already know. And if you didn't know, now you do!"]
    }
  };
  function quarterly(ctx0){
    ctx0 = ctx0 || {}; const st = ctx0.stats; if(!st || st.n<12) return null;
    const mark = (ctx0.mark==='year'||ctx0.mark==='half') ? ctx0.mark : 'q';
    const o = { FIRST:_feltName(st.firstDom||st.dom), LAST:_feltName(st.lastDom||st.dom), N:st.n, DAYS:st.days, SPAN:_QSPAN[mark] };
    const parts = [ cycle('q-open:'+mark, QUARTERLY.opener[mark]) ];
    // then-vs-now identity arc
    const reg = { safety:1, play:1, stillness:1 };
    let tnKey = 'holding';
    if(reg[st.lastDom] && !reg[st.firstDom]) tnKey='improved';
    else if(reg[st.firstDom] && reg[st.lastDom]) tnKey='steady_reg';
    parts.push(_fillMQ(cycle('q-tn:'+tnKey, QUARTERLY.thennow[tnKey]), o));
    const bd = ctx0.baseline;
    if(bd && bd.dir && bd.dir!=='new' && QUARTERLY.baseline[bd.dir]) parts.push(_fillMQ(cycle('q-base:'+bd.dir, QUARTERLY.baseline[bd.dir]), o));
    const rec = ctx0.recovery;
    if(rec && rec.avg!=null) parts.push(_fillMQ(cycle('q-rec', QUARTERLY.recovery), { N:_recoveryPhrase(rec) }));
    parts.push(_fillMQ(cycle('q-tot', QUARTERLY.totals), o));
    // self-regulation arc + emotion mix over the span (recommender-v2)
    const _when = { q:'3 months ago', half:'6 months ago', year:'A year ago' };
    const mvLine = _rungMovementLine(ctx0.movement, _when[mark] || 'Earlier in this stretch');
    if(mvLine) parts.push(mvLine.charAt(0).toUpperCase() + mvLine.slice(1));
    const emoLine = _periodEmotionLine(ctx0.emotion, _QSPAN[mark] || 'this stretch');
    if(emoLine) parts.push(emoLine);
    parts.push(cycle('q-close:'+mark, QUARTERLY.close[mark]));
    return { text: parts.join(' '), stats: st, mark: mark };
  }

  // ---- Sunday week-in-review + period (quarter/year) sections ----------------
  // Copy approved by Justin 2026-07-04 (Reader-Rework/week-in-review.md +
  // period-sections.md v2). Rules: percentages never "X of N" (plain counts OK);
  // low-data transparency wins over every variant; insights close with
  // reflection prompts. One answerable prompt per section (context chips) —
  // the chipQ; the rest are journal-only.
  const WR_FOOT = 'Reflections stay here for the season, then close into your quarter.'; // 🖊
  function weekReview(ctx){
    ctx = ctx || {};
    const out = { heading:'Your week', eyebrow:ctx.rangeLabel||'', paras:[], bullets:[], chipQ:null, variant:null, footer:WR_FOOT };
    const n = ctx.n||0;
    if(n < 5){
      out.variant = 'lowdata';
      out.paras.push('Only ' + hl(n + ' check-in' + (n===1?'':'s')) + ' throughout the entire week, so it\'s tough to give you substantial trends. That\'s not a problem, just a limit of the data. The more moments you capture, the more these reflections have to work with. A few honest seconds a day is plenty.');
      return out;
    }
    const P = ctx.pct!=null ? Math.round(ctx.pct) : null;
    if(ctx.shiftDir === 'safety'){
      out.variant = 'shift-safety';
      out.paras.push('Last week leaned ' + hl(_feltName(ctx.prevDom)) + '. This week, ' + hl(_feltName(ctx.dom)) + ' took the lead, about ' + hl(P+'%') + ' of your check-ins. That\'s evidence of more safety. And it didn\'t happen by accident. This is worth reflecting on now through journaling or just thinking about while you sip a tea. Ask yourself:');
      out.bullets = [
        'What do you know you did to connect with safety more?',
        'Did something in your life context change that led to more safety?',
        'How are the people or places in your life adding safety?',
        'What can you keep doing that\'s working, and what minor tweaks can you make?'
      ];
      out.chipQ = 'What most contributed to this increase in safety?';
      return out;
    }
    if(ctx.shiftDir === 'defense'){
      out.variant = 'shift-defense';
      const K = ctx.practicesK||0;
      const cheer = 'So, tell yourself "Good job, self," for the ' + hl(n + ' check-ins') + (K>0 ? ' and the ' + hl(K + ' practice' + (K===1?'':'s')) : '') + ' this week.';
      out.paras.push('Last week leaned ' + hl(_feltName(ctx.prevDom)) + '. This week, ' + hl(_feltName(ctx.dom)) + ' took the lead, about ' + hl(P+'%') + ' of your check-ins. Weeks like this happen, and they usually make sense in context. A system that shifts into defense under load is working, not failing. ' + cheer + ' Then grab a blanket, plop on the couch, and reflect on this week:');
      out.bullets = [
        'What did this week ask of you that last week didn\'t?',
        'Did something in your life context change that pulled on your system?',
        'What is one small way you could have snuck in a bit more mindfulness this week? Or a practice?',
        'What\'s one small thing that could give your system more to work with next week?'
      ];
      out.chipQ = 'What pulled you toward defense this week?';
      return out;
    }
    if(ctx.recoveryDay && ctx.defenseState){
      out.variant = 'recovery';
      out.paras.push('The week had a dip in the middle: ' + hl(_feltName(ctx.defenseState)) + ' showed up and stayed for a stretch. Here\'s the part worth keeping: you came back. By ' + hl(ctx.recoveryDay) + ', safety was back in the mix. This is evidence that your system knows how to return to safety. Dips will happen. That\'s completely normal. We just want to navigate it as regulated as possible. Reflect while it\'s fresh:');
      out.bullets = [
        'What helped you find your way back?',
        'Did a person, a place, or a practice make the difference?',
        'What did the dip need from you that it eventually got?',
        'What is the first indication that a dip is happening? What is one thing you can do to compassionately connect with that dip without rejecting the emotions?'
      ];
      out.chipQ = 'What helped your system recover?';
      return out;
    }
    if(ctx.payoffK){
      out.variant = 'payoff';
      out.paras.push('You practiced ' + hl(ctx.payoffK + ' times') + ' this week, and the check-ins that followed carried more safety than the ones before. That\'s not magic. That\'s practice reps doing what practice reps do.');
      return out;
    }
    if(ctx.weekPct!=null && ctx.basePct!=null && Math.abs(ctx.weekPct-ctx.basePct)>=5){
      out.variant = ctx.weekPct>ctx.basePct ? 'baseline-above' : 'baseline-below';
      out.paras.push(ctx.weekPct>ctx.basePct
        ? 'Your week came in a little above your usual baseline. One week doesn\'t move a baseline much, but stacked weeks do. This is how the long story gets written, seven days at a time.'
        : 'Your week came in a little below your usual baseline. One week doesn\'t move a baseline, and it doesn\'t need explaining away either. Look at the context, keep the practices small, and let next week be next week.');
      return out;
    }
    out.variant = 'showup';
    out.paras.push(hl(n + ' check-ins') + ' this week. Honest ones, from wherever you actually were. That\'s the whole assignment. Everything below only exists because you keep doing this.');
    return out;
  }

  // quarter / year close sections (period-sections.md v2)
  function periodSection(ctx){
    ctx = ctx || {};
    const yr = ctx.mark === 'year';
    const out = { heading: yr?'Your year':'Your quarter', eyebrow:ctx.rangeLabel||'', paras:[], bullets:[], chipQ:null, variant:null, footer:null };
    const n = ctx.n||0, MIN = yr?60:20;
    if(n < MIN){
      out.variant = 'lowdata';
      out.paras.push(yr
        ? 'Only ' + n + ' check-ins across the whole year, so the long trends here are rough sketches at best. That\'s okay. Every check-in you add sharpens the picture. A few honest seconds a day is plenty.'
        : 'Only ' + n + ' check-ins across the whole quarter, so it\'s tough to give you substantial trends over a stretch this long. Nothing wrong with that. The more moments you capture, the more a season like this has to say. A few honest seconds a day is plenty.');
      return out;
    }
    out.paras.push(yr
      ? 'A full year of check-ins is behind you. Whatever else this year held, you kept coming back to look at yourself honestly. Start there.'
      : 'Three months of check-ins are behind you. That\'s long enough for the noise to cancel out and the real shape of your system to show.');
    const b1 = ctx.b1!=null?Math.round(ctx.b1):null, b2 = ctx.b2!=null?Math.round(ctx.b2):null;
    if(b1!=null && b2!=null){
      const d = b2-b1;
      if(d>=5){
        out.variant='up';
        out.paras.push(yr
          ? 'A year ago, your baseline sat around ' + b1 + '% safety. Today it\'s ' + b2 + '%. A year is long enough that this isn\'t a mood or a season. This is your nervous system, rebuilt a little, by you. That deserves real reflection. Journal on it, or just sit with it over a tea. Ask yourself:'
          : 'When the quarter began, your baseline sat around ' + b1 + '% safety. It\'s ' + b2 + '% now. That climb is slow, which is exactly what makes it trustworthy. That\'s evidence of more safety, and over three months it didn\'t happen by accident. This is worth reflecting on properly. Journal on it, or just think it through while you sip a tea. Ask yourself:');
        out.bullets = yr ? [
          'What do you know you did this year that connected you with safety?',
          'What changed in your life, people, places, routines, that added safety?',
          'What did you stop doing that used to pull on your system?',
          'What\'s working well enough to protect, and what minor tweaks would you make for the year ahead?'
        ] : [
          'What did you do this season that connected you with safety more?',
          'Did something in your life context change that led to more safety?',
          'How are the people or places in your life adding safety?',
          'What\'s worth carrying into the next three months, and what minor tweaks can you make?'
        ];
        out.chipQ = yr ? 'What most contributed to the safety in your year?' : 'What most contributed to the safety in this season?';
      } else if(d<=-5){
        out.variant='down';
        out.paras.push(yr
          ? 'A year ago, your baseline sat around ' + b1 + '% safety. Today it\'s ' + b2 + '%. Some years take more than they give. The baseline will rebuild the way it always forms: a month at a time, on small, repeatable practices. You already know how, because you\'ve already done it. Worth reflecting on gently, without a verdict. Ask yourself:'
          : 'When the quarter began, your baseline sat around ' + b1 + '% safety. It\'s ' + b2 + '% now. It\'s been a heavier season, and your baseline felt it. Baselines dip with context, and they rebuild the same way they formed. Small, steady, repeatable. Worth some honest reflection, journaling or just thinking it over. Ask yourself:');
        out.bullets = yr ? [
          'What did this year ask of you?',
          'What changed in your life context that pulled on your system?',
          'Which people, places, or practices still added safety, even in a hard year?',
          'What\'s one small, repeatable thing to start the new year with?'
        ] : [
          'What did this season ask of you?',
          'Did something in your life context change that pulled on your system?',
          'Were there people or places that still added safety, even in a heavier stretch?',
          'What\'s one small, repeatable thing you could give your system next quarter?'
        ];
        out.chipQ = yr ? 'What pulled you toward defense this year?' : 'What pulled you toward defense this season?';
      } else {
        out.variant='flat';
        out.paras.push(yr
          ? 'Your baseline held around ' + b1 + '% safety across the year. A steady year is a real result, especially if the year itself wasn\'t steady.'
          : 'Your baseline held around ' + b1 + '% safety across the quarter. Holding a baseline through three months of real life is not nothing. Stable is a foundation, and foundations get built on.');
      }
    }
    if(ctx.dom && ctx.firstDom){
      const reg = { safety:1, play:1, stillness:1 };
      let tail;
      if(ctx.dom!==ctx.firstDom && reg[ctx.dom] && !reg[ctx.firstDom]) tail = 'That trade is the whole project, happening.';
      else if(!reg[ctx.dom] && !reg[ctx.firstDom]) tail = yr ? 'Same neighborhood as where you started, and that\'s honest data, not a verdict.' : 'Same neighborhood as where you started, and that\'s honest data, not a verdict. Quarters like this are where the reps matter most.';
      else tail = 'Consistency at this end of the spectrum is the quiet kind of win.';
      out.paras.push((yr
        ? 'The state that showed up most this year was ' + _feltName(ctx.dom) + '. Back at the start, it was ' + _feltName(ctx.firstDom) + '. '
        : 'Your most common state this quarter was ' + _feltName(ctx.dom) + '. Back at the start, it was ' + _feltName(ctx.firstDom) + '. ') + tail);
    }
    out.paras.push(yr
      ? 'You\'re not who you were a year ago. The data just says what you\'ve been living.'
      : 'A quarter of paying attention to your nervous system. Most people never do this once.');
    return out;
  }

  global.FromJustin = {
    today, daily, monthly, quarterly, refresh, pick,
    blog, weekReview, periodSection,
    LIBRARY
  };
})(window);
