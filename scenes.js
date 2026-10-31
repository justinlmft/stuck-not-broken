/* scenes.js — the one scene engine for the Now screen and the practice player (grid8, Justin canon 2026-10-30;
 * BRAND_DESIGN_SYSTEM §4 "The scenes"; ported from the Brand Design mockup SHYBttVtsxVhZXBTNYAhdi, Scene.dc.html).
 * Four scenes: reeds, pond, circles, fireflies. Each frame is a set of absolutely placed elements moved by CSS animations;
 * a change (state, time of day, weather, One breath) re-styles the same elements in place, so nothing jumps.
 *   const s = SNBScene.mount(el, opts); s.update(opts); s.breath(); s.stop();
 *   opts: { scene, tod:'dawn'|'morning'|'midday'|'evening'|'night', weather:'none'|'sun'|'cloud'|'rain',
 *           state:'safety'|'fightflight'|'shutdown'|'play'|'stillness'|'freeze'|null, dark, reduce, paperless }
 */
(function(){
'use strict';
const SCENES = ['reeds', 'pond', 'circles', 'fireflies'];
const KF = `@keyframes snbSw{from{transform:rotate(calc(var(--a) * -1))}to{transform:rotate(var(--a))}}
@keyframes snbRip{0%{opacity:0;transform:scale(.12)}10%{opacity:var(--o)}100%{opacity:0;transform:scale(1)}}
@keyframes snbGlide{0%{opacity:0;transform:translateX(0)}14%{opacity:var(--o)}86%{opacity:var(--o)}100%{opacity:0;transform:translateX(var(--dx))}}
@keyframes snbGlow{0%,100%{opacity:0}50%{opacity:var(--o)}}
@keyframes snbHover{from{translate:0 0}to{translate:var(--dx) var(--dy)}}
@keyframes snbFall{from{transform:translate(0,0) rotate(10deg)}to{transform:translate(var(--dx),var(--dy)) rotate(10deg)}}
@keyframes snbFadeIn{from{opacity:0}to{opacity:1}}
@keyframes snbLean{0%{transform:skewX(0) translateY(0)}44%{transform:skewX(-3.5deg) translateY(-5px)}100%{transform:skewX(0) translateY(0)}}
@keyframes snbRipO{0%{opacity:0;transform:scale(var(--s0))}10%{opacity:var(--o)}100%{opacity:0;transform:scale(1)}}
@keyframes snbRipO2{0%{opacity:0;transform:scale(var(--s0))}12%{opacity:.7}44%{opacity:.55;transform:scale(.72)}100%{opacity:0;transform:scale(1)}}
@keyframes snbSpin{from{rotate:0deg}to{rotate:360deg}}
@keyframes snbRing{0%,100%{transform:scale(var(--s0))}50%{transform:scale(var(--s1))}}
@keyframes snbBr{0%{transform:scale(1)}44%{transform:scale(var(--s))}100%{transform:scale(1)}}
@keyframes snbBright{0%{opacity:1}44%{opacity:.62}100%{opacity:1}}
@keyframes snbNone{0%{opacity:1}100%{opacity:1}}
@keyframes snbCirc{0%{transform:scale(1);opacity:1}3.5%{transform:scale(.86);opacity:.62}42.5%{transform:scale(1.28);opacity:1}88%{transform:scale(.78);opacity:.5}100%{transform:scale(1);opacity:1}}
@keyframes snbBobT{0%,100%{transform:translateY(0)}50%{transform:translateY(var(--b))}}`;
function css(){ if(document.getElementById('snb-scene-kf')) return; const s = document.createElement('style'); s.id = 'snb-scene-kf'; s.textContent = KF; document.head.appendChild(s); }
function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const STATE = { safety:'safety', fightflight:'fight', fight:'fight', shutdown:'shutdown', play:'play', stillness:'stillness', freeze:'freeze' };
const todOf = d => { const h = d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 8 ? 'dawn' : h < 11 && h >= 8 ? 'morning' : h < 16 && h >= 11 ? 'midday' : h < 20 && h >= 16 ? 'evening' : 'night'; };

function compute(P){
  const scene = SCENES.indexOf(P.scene) >= 0 ? P.scene : 'reeds', W = Math.max(1, Math.round(P.W)), H = Math.max(1, Math.round(P.H));
  const tod = P.tod || 'midday', wx = P.weather || 'none', st = STATE[P.state] || 'none', def = st === 'fight' || st === 'shutdown';
  const SKY = scene === 'reeds';   // only Reeds keeps the sunrise / mist
  const dark = !!P.dark, rm = !!P.reduce, breath = !!P.breath;
  const R = rng(({ reeds:7, pond:13, circles:19, fireflies:29 }[scene]) * 1000 + W);
  const r = (a, b) => a + R() * (b - a), cl = (v, a, b) => Math.max(a, Math.min(b, v)), f = n => (+n).toFixed(2);
  const wide = W >= 700;
  // light through the day: brighter / dimmer within the theme, never a light / dark switch; night in light mode is dim paper
  let L = { dawn:.66, morning:.86, midday:1, evening:.46, night:.3 }[tod]; if(L == null) L = 1;
  if(scene !== 'circles'){ if(wx === 'cloud') L *= .86; if(wx === 'rain') L *= .8; if(wx === 'sun') L = Math.min(1.08, L * 1.08); }
  const mix = (a, b, k) => a.map((v, i) => Math.round(v * (1 - k) + b[i] * k));
  const paperRGB = dark ? (L < 1 ? mix([27,28,30], [13,14,16], (1 - L) * .85) : mix([27,28,30], [40,40,41], (L - 1) * 4))
                        : (L < 1 ? mix([247,244,236], [176,174,170], (1 - L) * .42) : mix([247,244,236], [255,253,247], (L - 1) * 8));
  const paper = 'rgb(' + paperRGB.join(',') + ')';
  const INK = dark ? [236,232,222] : [26,31,42];
  const inkK = dark ? (.55 + .45 * Math.min(1, L)) : 1;
  const ink = a => 'rgba(' + INK.join(',') + ',' + f(cl(a * inkK, 0, 1)) + ')';
  const pace = { safety:[1.15,1.1], fight:[.72,.8], shutdown:[1.6,.45] }[st] || [1,1];
  const dm = pace[0], am = pace[1] * (wx === 'rain' ? .75 : 1);
  const anim = (name, dur, delay, more) => rm ? '' : 'animation: ' + name + ' ' + f(dur) + 's ' + (more || 'ease-in-out') + ' ' + f(delay) + 's infinite' + (name === 'snbSw' || name === 'snbHover' ? ' alternate' : '') + ';';
  const bgs = [], items = [];
  const add = (s, cs) => items.push({ s, cs:cs || '' });
  const fade = rm ? '' : 'animation: snbFadeIn 7s ease both;';
  if(tod === 'dawn') bgs.push('background: radial-gradient(120% 60% at 18% 104%, rgba(255,214,170,' + (dark ? .10 : .26) + '), transparent 70%);');
  if(tod === 'evening') bgs.push('background: linear-gradient(to bottom, rgba(40,48,70,' + (dark ? .20 : .10) + '), transparent 62%), radial-gradient(90% 40% at 82% 104%, rgba(255,198,150,' + (dark ? .07 : .14) + '), transparent 70%);');
  const WX = scene !== 'circles';   // Circles does not respond to weather
  if(WX && (wx === 'cloud' || wx === 'rain')) bgs.push('background: linear-gradient(to bottom, rgba(118,118,112,' + (dark ? .24 : (wx === 'rain' ? .2 : .16)) + '), rgba(118,118,112,0) 72%);');
  if(WX && wx === 'sun') bgs.push('background: radial-gradient(62% 52% at 90% -4%, rgba(255,244,214,' + (dark ? .13 : .85) + '), transparent 72%);');
  const MC = st === 'shutdown' ? '163,192,221' : '232,155,155';
  if(SKY && st === 'safety') bgs.push(fade + 'background: radial-gradient(90% 58% at 64% 108%, rgba(255,236,200,' + (dark ? .30 : .55) + '), rgba(244,213,141,' + (dark ? .20 : .34) + ') 34%, rgba(244,213,141,' + (dark ? .06 : .10) + ') 70%, transparent 100%);');
  if(SKY && def) bgs.push(fade + 'background: linear-gradient(to top, rgba(' + MC + ',' + (dark ? .32 : .48) + ') 0%, rgba(' + MC + ',' + (dark ? .16 : .24) + ') 22%, rgba(' + MC + ',0) 56%);');

  if(scene === 'reeds'){
    const RMAX = rm ? 7 : Math.round(cl(W / 80, 8, 24));
    const D = [{ n:rm ? 0 : RMAX, h:[.07,.18], w:[.8,1.1], a:[.12,.2], per:[6,9], amp:[1.2,2] },
               { n:rm ? 4 : Math.round(RMAX * .8), h:[.14,.32], w:[1,1.5], a:[.2,.32], per:[7,11], amp:[1.4,2.4] },
               { n:RMAX, h:[.26,.6], w:[1.3,2.3], a:[.34,.62], per:[8,15], amp:[1.6,3.2] }];
    D.forEach(d => { let rx = .01 + R() * .05, n = 0;
      while(rx < .97 && n < d.n){ const stand = 1 + Math.floor(R() * (R() < .4 ? 3 : 1)); const fh = r(d.h[0], d.h[1]);
        for(let k = 0; k < stand && rx < .97; k++){
          const h = Math.max(d.h[0] * .7, fh + (R() - .5) * (d.h[1] - d.h[0]) * .35) * H, w = r(d.w[0], d.w[1]), a = r(d.a[0], d.a[1]);
          const per = r(d.per[0], d.per[1]) / dm, amp = r(d.amp[0], d.amp[1]) * am, dl = -R() * per;
          const sw = rm ? 'transform: rotate(' + f((R() - .5) * amp) + 'deg);' : anim('snbSw', per, dl) + '--a:' + f(amp) + 'deg;';
          add('left:' + f(rx * W) + 'px; bottom:-2px; width:' + f(w) + 'px; height:' + f(h * .56) + 'px; background:' + ink(a) + '; border-radius:' + f(w) + 'px; transform-origin:50% 100%; ' + sw,
              'left:' + f(w * .16) + 'px; bottom:calc(100% - ' + f(w) + 'px); width:' + f(w * .68) + 'px; height:' + f(h * .46) + 'px; background:' + ink(a * .72) + '; border-radius:' + f(w) + 'px; transform-origin:50% 100%; ' + sw);
          rx += .008 + R() * .02; n++; }
        rx += .03 + R() * .14 + (R() < .22 ? .12 : 0); }
    });
  }
  const late = [];   // drawn above the rest (One breath's ripple on the pond), kept last so the others keep their places
  if(scene === 'pond'){
    const SC = { safety:dark ? [244,213,141] : [196,150,52], fight:dark ? [232,155,155] : [196,104,104], shutdown:dark ? [163,192,221] : [94,134,174] }[st];
    const rc = a => 'rgba(' + (SC ? mix(INK, SC, .75) : INK).join(',') + ',' + f(cl(a * inkK, 0, 1)) + ')';
    if(!dark) bgs.push('background: rgba(26,31,42,' + (tod === 'night' ? 0 : .05) + ');');
    const LP = { dawn:[.12,.22,1,'255,226,190'], morning:[.32,.16,1.1,'255,248,232'], midday:[.52,.42,1.25,'255,252,244'], evening:[.88,.24,.9,'255,206,160'], night:[.7,.2,.55,'226,234,248'] }[tod] || [.52,.42,1.2,'255,252,244'];
    const la = (dark ? .16 : .95) * (wx === 'cloud' ? .45 : wx === 'rain' ? .35 : wx === 'sun' ? 1.15 : 1) * (tod === 'night' ? (dark ? .8 : .7) : 1);
    const ls = Math.min(W, H) * .5 * LP[2] * (wx === 'sun' ? 1.3 : 1);
    add('left:' + f(LP[0] * W - ls) + 'px; top:' + f(LP[1] * H - ls * .8) + 'px; width:' + f(ls * 2) + 'px; height:' + f(ls * 1.6) + 'px; border-radius:50%; background: radial-gradient(closest-side, rgba(' + LP[3] + ',' + f(cl(la, 0, 1)) + '), rgba(' + LP[3] + ',' + f(cl(la * .35, 0, 1)) + ') 55%, transparent); --dx:' + f(W * .02) + 'px; --dy:6px; ' + anim('snbHover', 40, -10));
    if(wx === 'cloud' && !rm) add('left:' + f(-W * .7) + 'px; top:' + f(-H * .1) + 'px; width:' + f(W * .7) + 'px; height:' + f(H * 1.2) + 'px; border-radius:50%; background: radial-gradient(closest-side, rgba(60,62,70,' + (dark ? .28 : .09) + '), transparent); opacity:0; --o:1; --dx:' + f(W * 1.9) + 'px; ' + anim('snbGlide', 80, -30, 'linear'));
    const d = Math.min(W * (wide ? .36 : .7), H * .5), cx = W * (wide ? .6 : .5), cy = H * (wide ? .56 : .58);
    const mv = { safety:[W * .035, 60], fight:[W * .025, 30], shutdown:[W * .008, 90] }[st] || [W * .03, 54];
    const spin = { safety:260, fight:170, shutdown:700 }[st] || 300;
    const hov = '--dx:' + f(mv[0]) + 'px; --dy:' + f(mv[0] * .15) + 'px; ';
    const hovA = 'snbHover ' + f(mv[1]) + 's ease-in-out -9s infinite alternate';
    const drift = rm ? '' : hov + 'animation: ' + hovA + ', snbSpin ' + spin + 's linear -40s infinite;';
    // One breath (grid8c): the pad rises on the in-breath and settles on the out-breath, like a swell passing under it
    const bph = P.bph || '', up = !rm && bph === 'in', dd = up ? d * 1.06 : d, cyy = up ? cy - H * .08 : cy;
    const tr = rm ? '' : 'transition: top ' + (up ? '4s' : '5s') + ' cubic-bezier(.4,0,.5,1), left ' + (up ? '4s' : '5s') + ' cubic-bezier(.4,0,.5,1), width ' + (up ? '4s' : '5s') + ' cubic-bezier(.4,0,.5,1), height ' + (up ? '4s' : '5s') + ' cubic-bezier(.4,0,.5,1); ';
    const box = tr + 'left:' + f(cx - dd / 2) + 'px; top:' + f(cyy - dd / 2) + 'px; width:' + f(dd) + 'px; height:' + f(dd) + 'px; border-radius:50%; transform-origin:50% 50%; box-sizing:border-box; z-index:2; ';
    const rp = { safety:{ n:1, per:15, sz:2.3, a:.55 }, fight:{ n:2, per:9, sz:1.6, a:.5 }, shutdown:{ n:1, per:24, sz:1.3, a:.28 } }[st] || { n:1, per:14, sz:1.9, a:.42 };
    const ring = (list, R2, a, extra) => list.push({ s:'left:' + f(cx - R2) + 'px; top:' + f(cy - R2) + 'px; width:' + f(R2 * 2) + 'px; height:' + f(R2 * 2) + 'px; border-radius:50%; border:1.3px solid ' + rc(a) + '; box-sizing:border-box; transform-origin:50% 50%; z-index:1; ' + extra, cs:'' });
    for(let k = 0; k < rp.n; k++){ const R2 = d * rp.sz / 2, dl = -k * rp.per / rp.n;
      if(!rm){
        const hush = breath ? 'display:none; ' : '';   // the running ripples stop for One breath
        ring(items, R2, 1, hush + 'opacity:0; --o:' + f(rp.a) + '; --s0:' + f(1 / rp.sz) + '; ' + hov + 'animation: snbRipO ' + f(rp.per) + 's cubic-bezier(.2,.6,.2,1) ' + f(dl) + 's infinite, ' + hovA + ';');
        ring(items, R2 * 1.3, 1, hush + 'opacity:0; --o:' + f(rp.a * .6) + '; --s0:' + f(1 / (rp.sz * 1.3)) + '; ' + hov + 'animation: snbRipO ' + f(rp.per) + 's cubic-bezier(.2,.6,.2,1) ' + f(dl + 1.6) + 's infinite, ' + hovA + ';');
      } else { ring(items, R2 * .7, rp.a * .8, ''); ring(items, R2 * .95, rp.a * .45, ''); } }
    if(breath && !rm){
      // the water moving at the pad's edge (grid8f): three shallow arcs just under its rim, behind it, riding up and down with the pad
      // and bobbing a little on their own; strongest on the in-breath, settling with the out-breath
      for(let k = 0; k < 3; k++){ const lw = dd * (1.08 + k * .16), lh = lw * .2, ly = cyy + dd * .38 + k * Math.max(8, H * .012);
        late.push({ s:tr.replace(/top /, 'opacity ' + (up ? '1.2s' : '5s') + ' ease, top ') + 'left:' + f(cx - lw / 2) + 'px; top:' + f(ly - lh) + 'px; width:' + f(lw) + 'px; height:' + f(lh) + 'px; border-radius:50%; border:0; border-bottom:1.3px solid ' + rc(1) + '; box-sizing:border-box; z-index:1; opacity:' + f(up ? (.55 - k * .14) : .12) + '; --b:' + f(4 + k * 2) + 'px; ' + hov + 'animation: ' + hovA + ', snbBobT ' + f(2.4 + k * .5) + 's ease-in-out ' + f(-k * .7) + 's infinite;', cs:'' }); } }
    const notch = 'conic-gradient(from 18deg, #000 0deg 334deg, transparent 334deg 360deg)';
    const padFill = 'rgb(' + mix(paperRGB, dark ? INK : [255,255,255], dark ? .05 : .4).join(',') + ')';   // solid: the water lines pass behind
    add(box + 'border:1.5px solid ' + ink(.6) + '; background:' + padFill + '; -webkit-mask:' + notch + '; mask:' + notch + '; ' + drift);
    const vein = ink(.16), edge = ink(.55);
    add(box + 'background: conic-gradient(from 18deg, ' + edge + ' 0deg .5deg, transparent .5deg 58deg, ' + vein + ' 58deg 58.5deg, transparent 58.5deg 116deg, ' + vein + ' 116deg 116.5deg, transparent 116.5deg 174deg, ' + vein + ' 174deg 174.5deg, transparent 174.5deg 232deg, ' + vein + ' 232deg 232.5deg, transparent 232.5deg 290deg, ' + vein + ' 290deg 290.5deg, transparent 290.5deg 333.5deg, ' + edge + ' 333.5deg 334deg, transparent 334deg); -webkit-mask: radial-gradient(closest-side, #000 96%, transparent 97%); mask: radial-gradient(closest-side, #000 96%, transparent 97%); ' + drift);
    // partial pads at the edges, away from the words and buttons (top left), slower, no ripples
    const extra = wide ? [[1.0,.16,.62,0],[.9,1.03,.78,1],[.47,1.06,.5,2]] : [[1.04,.3,.6,0],[.92,1.02,.72,1]];
    extra.forEach(e => { const d2 = d * e[2], ex = W * e[0], ey = H * e[1], rot = [70,200,310][e[3]];
      const b2 = 'left:' + f(ex - d2 / 2) + 'px; top:' + f(ey - d2 / 2) + 'px; width:' + f(d2) + 'px; height:' + f(d2) + 'px; border-radius:50%; transform-origin:50% 50%; box-sizing:border-box; transform:rotate(' + rot + 'deg); z-index:2; ';
      const dr2 = rm ? '' : '--dx:' + f(mv[0] * .5) + 'px; --dy:' + f(mv[0] * .2) + 'px; animation: snbHover ' + f(mv[1] * r(1.1, 1.4)) + 's ease-in-out ' + f(-R() * 20) + 's infinite alternate, snbSpin ' + f(spin * r(1.2, 1.6)) + 's linear ' + f(-R() * 200) + 's infinite;';
      add(b2 + 'border:1.4px solid ' + ink(.45) + '; background:' + padFill + '; -webkit-mask:' + notch + '; mask:' + notch + '; ' + dr2);
      add(b2 + 'background: conic-gradient(from 18deg, ' + edge + ' 0deg .5deg, transparent .5deg 87deg, ' + vein + ' 87deg 87.5deg, transparent 87.5deg 174deg, ' + vein + ' 174deg 174.5deg, transparent 174.5deg 261deg, ' + vein + ' 261deg 261.5deg, transparent 261.5deg 333.5deg, ' + edge + ' 333.5deg 334deg, transparent 334deg); -webkit-mask: radial-gradient(closest-side, #000 96%, transparent 97%); mask: radial-gradient(closest-side, #000 96%, transparent 97%); ' + dr2);
    });
    if(wx === 'rain'){ for(let k = 0; k < (rm ? 8 : 18); k++){ const rr = r(12, 24), x = r(.03, .97) * W, y = r(.04, .96) * H; if(Math.hypot(x - cx, y - cy) < d * .62) continue; const dur = r(3.2, 4.8);
        add('left:' + f(x - rr) + 'px; top:' + f(y - rr) + 'px; width:' + f(rr * 2) + 'px; height:' + f(rr * 2) + 'px; border-radius:50%; border:1.2px solid ' + ink(.55) + '; box-sizing:border-box; ' + (rm ? 'opacity:.6; transform:scale(.6);' : 'opacity:0; --o:.9; ' + anim('snbRip', dur, -R() * dur, 'ease-out'))); }
      for(let k = 0; k < 4; k++){ const a = R() * 6.283, q = r(.12, .32) * d; add('left:' + f(cx + Math.cos(a) * q - 2.5) + 'px; top:' + f(cy + Math.sin(a) * q - 2.5) + 'px; width:5px; height:5px; border-radius:50%; border:1px solid ' + ink(.45) + '; box-sizing:border-box; z-index:3; transform-origin:' + f(-Math.cos(a) * q + 2.5) + 'px ' + f(-Math.sin(a) * q + 2.5) + 'px; ' + drift); } }
  }
  if(scene === 'circles'){
    const D = W >= 1120 ? 213 : W >= 720 ? 205 : 190, u = Math.min(D / .86, W * .8, H * .62), cx = wide ? W * .64 : W * .5, cy = wide ? H * .5 : H * .52;   // prod's size (grid8h)
    const CFG = { safety:[1,0,0,'244,213,141'], fight:[0,1,0,'232,155,155'], shutdown:[0,0,1,'163,192,221'], play:[1,1,0,'232,168,113'], stillness:[1,0,1,'159,196,152'], freeze:[0,1,1,'184,154,196'] }[st];
    const RG = [{ r:.43, per:7, act:[.955,1.055], qui:[.985,1.02], br:1.16 }, { r:.35, per:3, act:[.985,1.04], qui:[.992,1.016], br:1.09 }, { r:.27, per:9, act:[.975,1.006], qui:[.987,1.001], br:1.035 }];
    RG.forEach((g, i) => { const on = !!(CFG && CFG[i]), rad = u * g.r, sc = on ? g.act : g.qui;
      const stroke = on ? 'rgba(' + CFG[3] + ',' + f(inkK) + ')' : ink(.16), bw = on ? 2.4 : 2;
      let an = '';
      if(!rm) an = breath ? ''   // One breath moves the whole circle (below); the rings' own pulse rests
                          : '--s0:' + sc[0] + '; --s1:' + sc[1] + '; animation: snbRing ' + g.per + 's cubic-bezier(.45,0,.55,1) ' + f(-i * 1.3) + 's infinite;';
      add('left:' + f(cx - rad) + 'px; top:' + f(cy - rad) + 'px; width:' + f(rad * 2) + 'px; height:' + f(rad * 2) + 'px; border-radius:50%; border:' + bw + 'px solid ' + stroke + '; box-sizing:border-box; transform-origin:50% 50%; transition:border-color .9s; ' + an);
    });
    add('left:' + f(cx - 4.5) + 'px; top:' + f(cy - 4.5) + 'px; width:9px; height:9px; border-radius:50%; background:' + (CFG ? 'rgba(' + CFG[3] + ',1)' : ink(.45)) + ';');
  }
  if(scene === 'fireflies'){
    if(!dark) bgs.push('background: linear-gradient(to top, rgba(26,31,42,.24), rgba(26,31,42,.08) 45%, transparent 75%);');
    const SC = { safety:[244,213,141], fight:[232,155,155], shutdown:[163,192,221] }[st];
    const glow = SC || [255,232,180], coreC = SC ? mix(SC, [255,255,255], .55) : [255,244,214];
    const day = { dawn:.7, morning:.45, midday:.32, evening:1, night:1 }[tod] || 1;
    const bright = day * (wx === 'cloud' ? .7 : 1) * (st === 'shutdown' ? .55 : 1);
    const base = Math.round(cl(W / 55, 12, 28)), N = rm ? 8 : Math.max(4, Math.round(base * ({ safety:1.3, shutdown:.45 }[st] || 1) * (wx === 'rain' ? .35 : 1)));
    const P2 = { safety:{ gl:[8,14], hv:[18,28], dx:120, dy:70, y:[.08,.92] }, fight:{ gl:[4,6], hv:[8,12], dx:46, dy:30, y:[.14,.92] }, shutdown:{ gl:[10,16], hv:[28,36], dx:16, dy:10, y:[.55,.94] } }[st] || { gl:[6,12], hv:[14,24], dx:40, dy:30, y:[.1,.92] };
    // spread over the whole screen: one per column band, left to right, at any height in the band
    for(let i = 0; i < N; i++){ const x = (.03 + .94 * ((i + .15 + R() * .7) / N)) * W, y = r(P2.y[0], P2.y[1]) * H, per = r(P2.gl[0], P2.gl[1]), hv = r(P2.hv[0], P2.hv[1]);
      const core = 'rgba(' + coreC.join(',') + ',1)', halo = 'rgba(' + glow.join(',') + ',' + (dark ? .36 : .6) + ')';
      const ringC = dark ? 'transparent' : 'rgba(26,31,42,.28)';
      const z = [1,1,.62,.42][i % 4], dx2 = (R() - .5) * P2.dx * z, dy2 = (R() - .5) * P2.dy * z, gd = -R() * per, hd = -R() * hv, ro = r(.5, 1);
      const gA = (dark ? .22 : .34) * Math.max(.6, bright) * (z < 1 ? .7 : 1);
      const glowOn = breath && P.bph !== 'out';   // grid8d: the glow is the in-breath; the out-breath lets it go
      const halo2 = glowOn && z < 1 ? '0 0 ' + f(6 * z) + 'px ' + f(2 * z) + 'px rgba(' + coreC.join(',') + ',' + f(dark ? .7 : .8) + '), 0 0 0 0 rgba(' + glow.join(',') + ',0), 0 0 0 0 rgba(' + glow.join(',') + ',0)'   // the distant ones stay small
                  : glowOn ? '0 0 ' + f(8 * z) + 'px ' + f(4 * z) + 'px rgba(' + coreC.join(',') + ',' + f(dark ? .85 : .95) + '), 0 0 ' + f(40 * z) + 'px ' + f(16 * z) + 'px rgba(' + glow.join(',') + ',' + f(gA * 1.4) + '), 0 0 ' + f(130 * z) + 'px ' + f(60 * z) + 'px rgba(' + glow.join(',') + ',' + f(gA * .6) + ')'
                           : '0 0 0 0 rgba(' + coreC.join(',') + ',0), 0 0 0 0 rgba(' + glow.join(',') + ',0), 0 0 0 0 rgba(' + glow.join(',') + ',0)';
      const holder = 'left:' + f(x) + 'px; top:' + f(y) + 'px; width:0; height:0; border-radius:50%; box-shadow:' + halo2 + '; transition: box-shadow ' + (glowOn ? '4s' : '5s') + ' ease-in-out; ';
      const dot = 'left:-10px; top:-10px; width:20px; height:20px; border-radius:50%; transform:scale(' + z + '); background: radial-gradient(circle, ' + core + ' 0 2.2px, ' + ringC + ' 2.4px 3px, ' + halo + ' 3.2px, transparent 10px); ';
      if(rm) add(holder, dot + 'opacity:' + f(ro * bright) + ';' + (glowOn ? ' filter: brightness(1.4); transition: filter 4s;' : ' transition: filter 5s;'));
      else add(holder + '--dx:' + f(dx2) + 'px; --dy:' + f(dy2) + 'px; animation: snbHover ' + f(hv) + 's ease-in-out ' + f(hd) + 's infinite alternate; animation-play-state:' + (breath ? 'paused' : 'running') + ';',
               dot + 'opacity:0; --o:' + f(bright) + '; animation: snbGlow ' + f(per) + 's ease-in-out ' + f(gd) + 's infinite; animation-play-state:' + (breath ? 'paused' : 'running') + ';' + (glowOn ? ' filter: brightness(1.4); transition: filter 4s;' : ' transition: filter 5s;'));
    }
    // One breath brings more small, distant ones: they arrive over the in-breath and leave over the out-breath
    if(breath && !rm){ const M = Math.round(N * .6), R3 = rng(977 + W);
      for(let i = 0; i < M; i++){ const z = .3 + R3() * .16, x = (.03 + .94 * ((i + R3()) / M)) * W, y = (P2.y[0] + R3() * (P2.y[1] - P2.y[0])) * H, hv = 10 + R3() * 8;
        const core = 'rgba(' + coreC.join(',') + ',1)', halo = 'rgba(' + glow.join(',') + ',' + (dark ? .36 : .6) + ')';
        late.push({ s:'left:' + f(x) + 'px; top:' + f(y) + 'px; width:0; height:0; animation: snbFadeIn ' + f(2 + R3() * 1.6) + 's ease ' + f(R3() * 1.2) + 's both;',
          cs:'left:-10px; top:-10px; width:20px; height:20px; border-radius:50%; transform:scale(' + f(z) + '); background: radial-gradient(circle, ' + core + ' 0 2.2px, ' + halo + ' 3.2px, transparent 10px); box-shadow: 0 0 ' + f(10 * z) + 'px ' + f(3 * z) + 'px ' + halo + '; opacity:' + (P.bph === 'out' ? 0 : f(Math.min(1, Math.max(.6, bright * 1.6)))) + '; transition: opacity ' + (P.bph === 'out' ? '5s' : '1s') + ' ease-in-out; --dx:' + f((R3() - .5) * 30) + 'px; --dy:' + f((R3() - .5) * 20) + 'px; animation: snbHover ' + f(hv) + 's ease-in-out infinite alternate;' }); } }
  }
  late.forEach(x => items.push(x));
  // weather: rain falls slowly over Reeds and Fireflies (the pond has its own rings); reduced motion shows still streaks
  const rain = [];
  if(wx === 'rain' && (scene === 'reeds' || scene === 'fireflies')){
    const N = rm ? Math.round(cl(W / 30, 10, 40)) : Math.round(cl(W / 14, 20, 80)), tn = Math.tan(10 * Math.PI / 180);
    for(let i = 0; i < N * 1.3; i++){ const len = r(14, 26), a = r(.32, .55), dur = r(2.4, 3.8), x = r(-.05, 1.1) * W;
      if(rm) rain.push('left:' + f(x) + 'px; top:' + f(r(0, .95) * H) + 'px; width:1.3px; height:' + f(len) + 'px; background:' + ink(a) + '; transform:rotate(10deg);');
      else rain.push('left:' + f(x) + 'px; top:-30px; width:1.3px; height:' + f(len) + 'px; background:' + ink(a) + '; --dx:' + f(-(H + 40) * tn) + 'px; --dy:' + f(H + 40) + 'px; animation: snbFall ' + f(dur) + 's linear ' + f(-R() * dur) + 's infinite;');
    } }
  // One breath for the whole picture: reeds lean (4 in / 5 out); reduced motion = a gentle brightening only
  let breathS = '';
  if(breath){ if(rm) breathS = 'animation: snbBright 9s ease-in-out 1;'; else if(scene === 'reeds') breathS = 'animation: snbLean 9s ease-in-out 1;';
    else if(scene === 'circles'){ const wd = W >= 700; breathS = 'transform-origin:' + f(wd ? W * .64 : W * .5) + 'px ' + f(wd ? H * .5 : H * .52) + 'px; animation: snbCirc 11s cubic-bezier(.4,0,.5,1) 1 both;'; } }
  return { W, H, paper, bgs, items, rain, breathS };
}

// keep the same elements; change only what changed (an element whose style did not change keeps its running animation)
function sync(parent, list, make, setS){
  while(parent.children.length > list.length) parent.lastElementChild.remove();
  list.forEach((v, i) => { let el = parent.children[i]; if(!el){ el = make(); parent.appendChild(el); } setS(el, v); });
}
function setStyle(el, s){ if(el.__s !== s){ el.setAttribute('style', s); el.__s = s; } }

function mount(host, opts){
  css();
  const root = document.createElement('div'); root.className = 'snb-scene'; root.setAttribute('aria-hidden', 'true');
  const bgL = document.createElement('div'), lean = document.createElement('div'), rainL = document.createElement('div');
  [bgL, rainL].forEach(x => x.setAttribute('style', 'position:absolute; inset:0; pointer-events:none'));
  lean.setAttribute('style', 'position:absolute; inset:0; transform-origin:50% 100%');
  root.appendChild(bgL); root.appendChild(lean); root.appendChild(rainL);
  host.appendChild(root);
  let O = Object.assign({}, opts), breathOn = false, bph = '', bT = null, bT2 = null, last = '';
  function paint(){
    const W = host.clientWidth || innerWidth, H = host.clientHeight || innerHeight;
    const key = JSON.stringify([O.scene, O.tod, O.weather, O.state, O.dark, O.reduce, breathOn, bph, W, H, O.paperless]); if(key === last) return; last = key;
    const v = compute(Object.assign({}, O, { W, H, breath:breathOn, bph }));
    setStyle(root, 'position:absolute; inset:0; overflow:hidden; pointer-events:none; transition: background 2s;' + (O.paperless ? '' : ' background:' + v.paper + ';'));
    root.__paper = v.paper;
    sync(bgL, v.bgs, () => document.createElement('div'), (el, s) => setStyle(el, 'position:absolute; inset:0; pointer-events:none; ' + s));
    setStyle(lean, 'position:absolute; inset:0; transform-origin:50% 100%; ' + v.breathS);
    sync(lean, v.items, () => document.createElement('div'), (el, it) => {
      setStyle(el, 'position:absolute; ' + it.s);
      if(it.cs){ let c = el.firstElementChild; if(!c){ c = document.createElement('div'); el.appendChild(c); } setStyle(c, 'position:absolute; ' + it.cs); }
      else if(el.firstElementChild) el.firstElementChild.remove();
    });
    sync(rainL, v.rain, () => document.createElement('div'), (el, s) => setStyle(el, 'position:absolute; pointer-events:none; ' + s));
  }
  let rT = null; const onR = () => { clearTimeout(rT); rT = setTimeout(paint, 150); };
  addEventListener('resize', onR);
  paint();
  return {
    el: root,
    get paper(){ return root.__paper; },
    update(o){ Object.assign(O, o || {}); paint(); },
    // in for 4, out for 5 (the pond's ripple runs a little past the out-breath, so it ends on its own)
    breath(){ clearTimeout(bT); clearTimeout(bT2); breathOn = true; bph = 'in'; last = ''; paint();
      bT2 = setTimeout(() => { bph = 'out'; paint(); }, 4000);
      bT = setTimeout(() => { breathOn = false; bph = ''; paint(); }, O.scene === 'pond' ? 10500 : O.scene === 'circles' ? 11000 : 9000); },
    stop(){ clearTimeout(bT); clearTimeout(bT2); removeEventListener('resize', onR); root.remove(); }
  };
}
window.SNBScene = { SCENES, mount, compute, todOf };
})();
