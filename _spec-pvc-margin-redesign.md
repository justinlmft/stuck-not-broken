# PVC margin redesign — proposal for agreement

**2026-08-15. Status: AGREED IN SUBSTANCE — implementation-ready.** Consultation rounds
6–7 with the PVT expert are closed; every open question has an answer or a named data
path. **This document is the source of truth for the redesign — a new coding session
needs nothing outside it plus the shipped spec** (`snb-business:
Projects/Web Designer/_spec-regulation-math.md`). **No code has been touched yet.** The
engine (`snb-business: Projects/Web Designer/_mockup-pvc-per-state-sliders.html`) still
ships the old `min(a,b) × 1.6` naming rule; the app (`current.js` in this repo) still
ships its own weights. §10 below is the implementation handoff. Provenance marks follow
the spec's §0 key: ● measured · ▲ inferred · ◆ asserted · ○ structural.

Frame (decided, upstream): two defenses only — sympathetic (one system, one slider) and
dorsal. Ventral is not a defense; it does the holding. Margin decides which state; margin
size decides the qualifier; the sympathetic:dorsal ratio decides the flavour.

Design principle (Justin): **the inputs are subjective self-report — a person's 100% is
their own, not a standard.** The model deals in percentages, ratios and margins of the
person's own scale. Fixed numbers survive only where something was measured. The state
decision is a pure ratio test; severity is a within-person read, never compared across
people (the product already promises no scores, no diagnosis).

---

## 1. The package

```
margin = 0.7·V − 0.3·(S + D + tax)              V, S, D ∈ 0–1

tax    = min(S,D) × ramp(min(S,D)) × (1 − V)    co-activation tax: S-shaped, ventral-gated
ramp   = smoothstep between 33 and 75           flat floor below 33, full weight by 75
lift   = λ × (1 − V)                            context/practice lift, scales with missing ventral
cost   = ½ × toDef(level)                       engagement cost, proportional (replaces −5/−10/−15)
```

Sign gives the state side. `|margin|`, rescaled per side, gives the qualifier. The S:D
ratio gives the flavour.

## 2. The 0.7/0.3 rule

RM's shipped exchange rate (§2.1, untouched): a baseline at full strength is worth **70**,
a fully expressed defense costs **30**. The margin is capacity minus load in that one
currency, ÷100. The asymmetry is the clinical claim — *a defense never costs as much as
the capacity that holds it*; one point of ventral holds 2⅓ points of defense — chosen so
containment is possible at all (both defenses maxed = 60, just holdable by a full 70
baseline, which is why 100/100/100 lands at +0.10: barely governed, running on fumes).
◆ asserted, but shipped and load-bearing, and the old candidate's ω = 0.43 was always
0.3/0.7 in disguise. The sign is scale-free: it only asks whether V : (S+D+tax) clears
3 : 7 — a person who uses only the bottom half of their sliders gets the same state read.

## 3. What died, and why

The old candidate `V − ω·(S^a + D^a + k·S·D)` carried two unfitted knobs. `a = 1.5` was a
stated floor; `k = 1` was round. **`k` alone manufactured failure 1**: without it,
100/100/100 sits at +0.14 — the opposite *side* of the line from 15/10/90. The two boards
were never supposed to differ by depth; they differ by sign. One is a system nothing is
holding; the other is a system holding everything, barely. Both knobs are dropped.

The "ω on largest defense vs summed load" question settles by arithmetic: **the sum** — it
is what shipped RM does (§2.5), and the max-variant grades functional freeze (35/55/55) as
safety-governed, failing the personas outright.

## 4. The (1 − V) principle

`(1 − V)` — *missing ventral* — appears in the model four times: the §1.4 stuckness gate
(`dorsal × (1−V)`), the app's shipped freeze weight (`min(s,d) × (1−V)`, `current.js:33`,
cohort-validated core, r = 0.79 ●), the co-activation tax, and the lift. One teachable
principle:

> **Everything defensive or borrowed scales with how much ventral is missing.**

**Expert round 6 verdict on the principle:** correct for the tax (held co-activation is
play or stillness, not conflict — "structurally mandatory") and correct for the lift
(external co-regulation matters most at low V, shrinking toward zero near Presence).
**With one guardrail:** `(1−V)` must price the cost of *holding* defense — it must never
restrict the momentary capacity to *react*. A regulated person dropping ventral to
mobilize hard against a real threat is adaptive, not pathological. Our package complies:
the sliders are never restricted; `(1−V)` only prices. Recorded as a standing constraint
on all future uses of the gate.

### 4.1 The tax — S-shaped, expert-endorsed

The expert confirmed Justin's hypothesis: co-activation cost is S-shaped, in three phases
with named mechanisms —

1. **Flat floor** (below the low/moderate edge): background sympathetic + dorsal activity
   is cooperative visceral housekeeping, not conflict. Cost ≈ 0.
2. **Escalating slope** (moderate-to-high bands): with the vagal brake withdrawn, the two
   circuits issue conflicting commands to the same organs — cardiac gas-and-brake,
   bracing, allostatic load. Cost accelerates.
3. **Saturation** (extreme): receptor-level and metabolic limits — defense does not
   spiral into infinity.

Implementation with **zero new constants**: the ramp runs between the shipped band edges
(33 → 75, ● BPQ-SF-confirmed), flat below, saturated above; the gate stays `(1−V)`; and
the ceiling is inherent (`min ≤ 1` means the tax can never exceed `1−V` — the tax ceiling
*is* missing ventral).

⚠ **Consequence stated, not hidden:** the flat floor means sub-33 co-activation costs
nothing. The deep-shutdown board 12/23/75 (sympathetic 23 = background) reads Moderate
(sev 70), not High. And functional fight/flight (42/72/25, dorsal 25 = background)
returned to the line at +0.003. **The shape was chosen for its mechanism, not to produce
reads** — we declined to re-bend it, and put the persona question back to the expert.

**Resolved, expert round 7 — both halves:**
- **The knife's edge is the point.** A margin hovering near zero (~±0.05) is the
  mathematical signature of a *functional* state: operational, socially masked, zero
  reserve — one neuroceptive cue from dropping down the ladder. Kept as the meaning of
  "functional" in this model.
- **But the chronic profile moves.** There is no "clean" sympathetic defense in a
  chronically retuned system: chronic mobilisation carries visceral dorsal cross-talk
  (gut distress, bracing, shallow breath), so its dorsal reading sits *above* the
  housekeeping floor. Profile revised **42/72/25 → 42/72/36** (expert's range 36–40).
- ⚠ Arithmetic correction, ours: the expert quoted the tax *without* the ramp it endorsed
  (tax 20.9, margin ≈ −0.11). With the ramp, dorsal 36 sits just above the floor and pays
  almost no tax — the flip is driven by the raw dorsal load itself: **margin −0.031,
  severity 10, Fight/Flight — Low** (at dorsal 40: −0.047, sev 16). The verdict stands;
  the mechanism credit belonged to the load, not the tax. Direction identical either way.
- **Scope of the claim — chronicity, not coupling.** Dorsal does NOT rise because
  sympathetic rises; it rises because the system stays mobilised over *time* (diffuse
  autonomic retuning → visceral cross-talk). Acute sympathetic can be clean. Therefore
  **no coupling is added to the formula — the sliders stay independent** and a reported
  72/25 is taken at the person's word (it reads as an acute picture). Testable
  prediction, on data we already collect: users whose sympathetic stays high across many
  check-ins should drift upward in dorsal; spike-and-recover users should not. High-S
  with housekeeping-D vs high-S with elevated-D is also a candidate fingerprint for the
  acute-vs-stuck label (§7).

### 4.2 The ceiling — emergent, not added

The expert proposed `Defensive Ceiling = MaxDefense × (1−V)` to replace our firm numbers
(`DEFENSE_CEIL = 95`, `SAFETY_CEIL = 95`, `FF_PEAK = 0.82`, all ◆). Checked against the
model, **naive application contradicts settled ground**: at V = 80 it would cap dorsal at
20, while the confirmed stillness mechanic *targets* dorsal 60 at exactly that ventral.
The expert's own wording resolves it — the ceiling is on **uncontained** defense — and
our margin already produces that, for free. Maximum possible severity falls linearly as
V rises:

```
V = 0 → max sev 300 (capped High) · V = 50 → 133 · V = 75 → 50 · V = 80 → 33 · V ≥ 90 → 0
```

Past V = 90 no defense-governed read is possible at any slider position: the vagal
brake's output gain **emerges** from the 70/30 rate plus the tax. Nothing to add on the
naming side. Replacing the three firm trait bounds with capacity-relative ones is
engine-side (chronic) work, deferred to implementation, under the §4 guardrail (bound the
*trait*, never the momentary reaction).

### 4.3 The lift

Justin's rule: co-regulation and practice fill a fraction of the *missing* ventral —
transformative for the highly defended, shrinking toward zero near Presence. Three wins:
`SAFETY_CEIL` stops being a bolted-on clamp (the bound emerges from the form); §2.4
fragility interacts correctly (the low-ventral person receiving the big borrowed lift is
exactly the one who reads brittle); flat `CTX_LIFT +10` and the practice-lift table become
per-person. ⚠ **λ is ◆ unfitted and the obvious fit is forbidden**: the n=161 gradient
(+0.306 in the lowest ventral band falling to −0.044 in the highest ●) matches this shape
but is regression-to-the-mean plus ceiling effect (§9). The `followup` check-ins are the
fit path.

### 4.4 The cost

The flat engagement table (−5/−10/−15 per band) is roughly "engaging a defense costs about
half of what carrying it does." Said directly: `cost = ½ × toDef(level)`. One fraction (◆)
replaces three flat numbers, band cliffs disappear, cost scales in the person's own units,
and the spec's unresolved −15-vs−20 conflict (§2.2) evaporates with the table. Low-risk:
the cost table is nearly inert in trajectories (4/12/28 moved timelines 0–2 weeks).

## 5. The three-part read

```
1. STATE     margin ≥ 0 → safety-governed        margin < 0 → defense-governed
2. QUALIFIER |margin| rescaled to the side's own range, banded at 33/75
3. FLAVOUR   S:D ratio — level unless the leader is ≥ ~1.4× the other
```

**Defense side** — severity in *equivalent-single-defense* units:
`severity = (S + D + tax − (7/3)·V) × 100`, Low < 33 ≤ Moderate < 75 ≤ High. On a pure
board (V = 0, one defense, tax = 0) severity equals that defense's own slider — the 33/75
edges are the shipped, ● BPQ-SF-confirmed thresholds, inherited and **reachable** (a
single defense hits High at exactly 75). Name: level → **Freeze**; S leads →
**Fight/Flight**; D leads → **Shutdown**.

**Safety side** — qualifier in equivalent-own-ventral units: `qual = margin / 0.7 × 100`,
same 33/75 edges.

- qual ≥ 33 with a defense ≥ 33 → the **blend names**: play / motivation (S leads),
  stillness / intimacy (D leads). Dorsal *with* ventral stays stillness — §1.4's
  load-bearing claim.
- qual < 33 with a defense ≥ 33 → caution grammar: **"Safety — Low, X underneath"**
  (X = sympathetic / dorsal / freeze by the same flavour rule).
- No defense ≥ 33 → plain **Safety — Low / Moderate / High**.
- Existing quiet guard stays (all circuits < 0.12 → "quiet", ○).

Flavour threshold — **decided (Justin): ratio.** Level unless the leader is ≥ ~1.4× the
other. The shipped difference-of-20 was ● confirmed but is not scale-free; 1.4×
reproduces it at typical mid-scale levels (conversion ◆).

## 6. The boards (script-verified, S-shaped tax)

| board | margin | reads as |
|---|---|---|
| 15/10/90 | −0.195 | Shutdown — Moderate (sev 65) |
| 100/100/100 | +0.100 | Safety — Low, freeze underneath |
| functional freeze 35/55/55 | −0.142 | Freeze — Moderate (sev 48) |
| functional shutdown 35/25/68 | −0.034 | Shutdown — Low (sev 11) |
| functional fight/flight 42/72/36 (revised r7) | −0.031 | Fight/Flight — Low (sev 10) |
| deep-shutdown board 12/23/75 | −0.210 | Shutdown — Moderate (sev 70) |
| 0/0/75 | −0.225 | Shutdown — High (sev 75, edge exact) |
| heavy conflict 15/70/75 | −0.502 | Freeze — High |
| appease band 80/80/80 | +0.032 | Safety — Low, freeze underneath |
| stillness 80/10/60 | +0.350 | Stillness / intimacy — Moderate |
| play 70/50/10 | +0.310 | Play / motivation — Moderate |
| healthy 90/10/5 | +0.585 | Safety — High |

**Failure 1, resolved** — by sign; the ventral gate keeps it resolved under the tax.
**Failure 2, resolved** — all three functional personas read defense-governed at Low or
Moderate severity: stuck-but-running, correctly on the defense side of the line, with the
severity a functional person would recognise. (Fight/flight required the round-7 profile
revision — see §4.1.)
**Appease, settled** — all-three-high (2.4% of check-ins ●) stops falling through the
§1.3 tie to "play" and reads "Safety — Low, freeze underneath". The words appease/fawn
stay unclaimed (Justin's ruling: defined by behaviour and context we don't measure).

## 7. Decided vs open

**Decided (Justin, this session):**
- Sympathetic counts **once** — one system, one slider, one weight.
- Ratios/margins over fixed numbers wherever nothing was measured.
- Flavour threshold is a **ratio** (leader ≥ ~1.4×), not a fixed difference.
- Tax is **S-shaped per expert round 6**, anchored at the shipped 33/75 edges, gated by
  `(1−V)`; ceiling emergent. (Justin's earlier "simplest linear" call was the placeholder
  pending this consultation; the expert's mechanism-grounded shape supersedes it.)
- The `(1−V)` guardrail: prices holding, never restricts momentary reactivity.
- "Fixate" / "Fold" are not terms in use — strike the nicknames from spec §8 on next touch.

**Decided (expert round 7, needs Justin's formal adoption since personas are canonical):**
- Functional fight/flight persona revised **42/72/25 → 42/72/36** (chronic mobilisation
  carries visceral dorsal cross-talk above the housekeeping floor; expert range 36–40).
- Interpretive note adopted: margin ≈ 0 (±0.05) is the signature of a *functional* state —
  operational, masked, zero reserve.

**Decided (Justin, 2026-08-16, after the coupling debate — round 8):**
- **Inputs stay free. No dynamic slider bounds, ever silent ones least of all.** The
  expert proposed coupled input ceilings (Smax/Dmax/Vmax); tested against settled ground
  they forbid its own fight/flight persona (needs S 72, cap 64.6), forbid confirmed
  stillness (V 80 / D 60, cap 62 — while its own Dmax rationale cites that exact board),
  erase the 51% freeze-with-safety cohort and the 2.4% appease population, and are
  order-dependent (what you may report depends on drag order). Silently moving a set
  slider rewrites a self-report and invisibly corrupts every downstream finding.
  The biology the bounds wanted is already in the model at the read layer: Rule 1 = the
  emergent ceiling (§4.2), Rule 2 = the co-activation tax (§4.1).
- **Somatic-mapping onboarding rejected** — it is an assessment, and self-recognition is
  never an assessment (hard product constraint, master spec §10). "Maybe some day."
- **Forced safety/defense movement belongs in the simulation layer only** (a
  what-happens-next animation seeded by a check-in) — the trajectory engine already
  carries the measured pieces (mobilisation rise, stillness settling, OVERREACH).
- **Display split (from the severity-is-not-intensity discussion):** the qualifier is
  shown as **"defensive load — low/moderate/high" on a NEUTRAL-colored bar**, separate
  from **"dominant state"** which carries the name and the state color. Raw sliders keep
  showing raw intensity. The margin meter is the visible see-saw — raising any defense
  visibly drains it. Copy nuance: load here means load *beyond what safety is holding*.

**Provisional by necessity — data decides later:**
- λ, the lift scale ◆ (fit path = `followup` check-ins, NOT the RTM-contaminated gradient)
- cost fraction ½ ◆ (nearly inert in trajectories; low stakes)
- ramp anchoring at exactly 33/75 ◆ (the edges are ●; using them for the tax ramp is our
  choice)
- context *loads* (+20/+40 to Demand): deliberately NOT ratio-ified — scaling threat with
  the person's capacity is a clinical claim nobody has made. Parked.

**New follow-on (Justin, after round 6): acute vs stuck in the app.** The expert's
acute/chronic distinction suggests labelling a reading *acute* (momentary, adaptive) vs
*stuck* (same defense-governed read persisting). The expert's full definition (7–14 days
without return to ventral ≥ 0.70) is blocked on retention (2.7-day mean, §9); a weak
version — same defense-governed state across N consecutive check-in days — is
implementable now. Not part of this redesign; queued behind it.

## 8. Consequences to say out loud

1. §5 milestone arithmetic and the §8 persona week-counts (50w/18w/28w to functional)
   were computed under the old double-count, flat-lift, flat-cost engine. All shift under
   this package. Expected — recompute, don't assume.
2. Headline freeze is now containment-gated. Cohort evidence (●, r = 0.79; 51% of freeze
   reporters also report meaningful safety) rejected gating freeze *intensity* on
   ventral — untouched: `min(S,D)` stays the intensity readout, and safety-governed
   level-defense boards keep the word ("freeze underneath"). But the *headline* moves to
   the safety side for those people. Chosen with eyes open.
3. Severity is capacity-discounted: real ventral buys holding at 7/3, so mid-ventral
   boards read milder than their defense sliders suggest — and past V = 90 no
   defense-governed read exists at all (§4.2). Core asymmetry doing its job.
4. margin = 0 counts as safety-governed, matching §5's `own ≥ demand`.
5. Everything compares quantities within one reading. No momentary-vs-baseline
   comparison anywhere.

## 9. Provenance of every number

| constant | value | provenance |
|---|---|---|
| capacity/defense rate | 0.7 / 0.3 | ◆ shipped RM §2.1, untouched (ω = 3/7 in disguise) |
| a, k (old knobs) | dropped | were ◆ unfitted; k caused failure 1 |
| tax form | min(S,D)·ramp·(1−V) | ○ shipped parts + expert-endorsed S-shape (round 6) |
| ramp anchors | 33 / 75 | edges ● BPQ-SF; their use as ramp anchors ◆ |
| tax ceiling | 1 − V | ○ emergent, nothing added |
| lift form | λ·(1−V) | ◆ Justin's rule; expert-endorsed; shape visible in data but RTM-confounded |
| λ | — | unfitted; `followup` check-ins are the fit path |
| cost | ½ × toDef(level) | ◆ fraction unfitted; replaces flat table (nearly inert) |
| band edges | 33 / 75 | ● BPQ-SF-confirmed, inherited unchanged |
| flavour threshold | leader ≥ ~1.4× | DECIDED ratio (Justin); ● confirmed as difference of 20, conversion ◆ |
| blend/underneath threshold | 33 | = shipped band edge (replaces old 0.3125 ◆) |
| quiet guard | 0.12 | ○ existing engine |
| severity normalizer | 0.3 (= one full defense) | ○ structural |

Nothing fitted to cohort percentages; nothing tuned to a target read — including
declining to bend the tax floor to move the fight/flight persona (§4.1 ⚠).

## 10. Implementation handoff

Justin gave the go 2026-08-15. Final formulas, copy-ready (all inputs 0–1):

```
ramp(x)   = smoothstep((x − 0.33) / (0.75 − 0.33))     // clamped 3x²−2x³
tax(v,s,d)= min(s,d) × ramp(min(s,d)) × (1 − v)
margin    = 0.7·v − 0.3·(s + d + tax)

STATE     margin ≥ 0 → safety-governed · margin < 0 → defense-governed
          (guard first: max(v,s,d) < 0.12 → "quiet")
SEVERITY  defense side: (−margin / 0.3) × 100, bands Low <33 ≤ Moderate <75 ≤ High
QUAL      safety side:  (margin / 0.7) × 100, same bands
FLAVOUR   level unless max(s,d) ≥ 1.4 × min(s,d); level → freeze/both,
          s leads → sympathetic, d leads → dorsal
READS     defense side: "Freeze / Fight-Flight / Shutdown — <band>"
          safety side, qual ≥ 33 & a defense ≥ 0.33 → blend names
            (s leads → play/motivation, d leads → stillness/intimacy)
          safety side, qual < 33 & a defense ≥ 0.33 → "Safety — Low, <X> underneath"
          else plain "Safety — <band>"
RM side   lift = λ·(1−v) (λ unfitted) · engage cost = ½·toDef(level)
```

**Where it lands, in order:**

1. **App (`current.js`, this repo)** — ✅ DONE on this branch (2026-08-16). The margin
   package is the naming engine: `PVCurrent.marginOf()` exposes the full read;
   `dominantOf()` keeps its historical shape (stored check-in keys stay valid) but names
   by margin; `readingOf()` speaks the balance from the real margin (knife's edge ≤0.05
   reads "about even"; the safety-with-energy clause fires on the underneath case) and
   carries a `label` field ("freeze — moderate"). Rendering weights untouched;
   `min(s,d)` stays the freeze-intensity readout. Shell v403 / current.js v8. Verified
   against every board in §6 by node test.
2. **Mockup engine** — ✅ DONE 2026-08-16 (`snb-business` c996824 + 60550e3). One
   sympathetic slider (counts once in every demand sum), `stateName()` and the 1.6 rule
   replaced by the margin read, lift → `λ·(1−V)` with λ = 1.595745 PROVISIONAL-◆ set by
   *scale preservation* (mean lift across the three §8 personas equals the old flat value
   exactly), cost → `½·toDef(level)`. All twelve §6 boards verified against the migrated
   engine; continuity swept at 20k points, no cliffs.
   ⚠ **§8 milestone weeks recomputed and NOT tuned back** — unsupported, ceiling high:
   freeze 42/67/90, shutdown 13/32/47, fight/flight 13/39/57. The fight/flight move is the
   round-7 persona revision (dorsal 25 → 36), not the package: at dorsal 25 that persona
   read *functional at week 0*, which was the artifact the expert flagged.
   ⚠ **Doc erratum:** §6 above lists functional freeze at "sev 48". Its own quoted margin
   (−0.142) yields **47**; the exact margin is −0.142452 → 47.48. The engine is right and
   the table row is the error.
3. **Engine chronic pass** — ✅ DONE 2026-08-16. `DEFENSE_CEIL` / `SAFETY_CEIL` / `FF_PEAK`
   are capacity-relative, bounding the TRAIT only. The expert's raw `MaxDefense × (1−V)`
   was **not** adopted: at V = 80 it caps dorsal at 20 while the confirmed stillness
   mechanic targets 60. Raw sliders are never gated and nothing the user sets is ever
   silently moved (round 8).
4. **Master spec (`_spec-regulation-math.md`, snb-business)** — ✅ APPLIED 2026-08-16
   (c996824), plus a §9 "Round 8" entry recording the progress-measurement change below.
   Original note kept for the record: ✅ WRITTEN, awaiting
   apply: this session had read-only access to snb-business (the write-access grant was
   platform-blocked), so the five edits (new §1.2 margin rule; §8 persona 42/72/36 +
   nicknames struck; §2.2 cost → proportional; §2.6 flavour → ratio; §9 rounds 6–7 log)
   are shipped as `_patch-spec-regulation-math-margin.patch` in THIS repo's root.
   Apply from any machine with snb-business write access:
   `cd <snb-business clone> && git pull && git apply <path-to>/_patch-spec-regulation-math-margin.patch && git commit -am "Spec: margin redesign (rounds 6-7)" && git push`
   Or grant a session push access to snb-business and it applies + pushes directly.
5. **Queue behind all of it:** acute-vs-stuck labelling (§7), using the high-S dorsal
   fingerprint (§4.1) among its signals.

House rules bind every step: nothing fitted to cohort percentages or target reads; no
momentary-vs-baseline comparisons; provenance marks maintained.

---

## 11. Round 8 — progress stops being measured on state names (2026-08-16/17)

The naming redesign fixed what a reading is *called*. An audit then found every **progress**
claim was still counting words. Justin's ruling: **progress is measured on real quantities.**

Two ordinal scales built on the six names, in one file, ordered the same states **opposite
ways** — `_PE_RANK` put safety above stillness, `_BL_ORDER` put stillness above safety. Users
had cards contradicting each other. The reason is the argument for the whole change: **a named
state has no position.** Stillness at 80/10/60 and at 60/10/55 are one word with different
held capacity, so any name-scale must invent an order, and two inventions disagree.

**Shipped (stuck-not-broken `beta`):**
- `dom` **derived** from each check-in's own v/sym/dor at read time, never read from storage —
  one rule across all history. Past names change; announced, not hidden.
- `neutral` is the one stored name kept: it records that no axis was touched, which numbers
  cannot tell you. Excluded from mean, numerator, denominator **and** sample count — a
  check-in that cannot inform the mean must not buy confidence in it. ⚠ Never infer values
  from the flag; a few rows carry non-midpoints.
- Regulated share → `margin ≥ 0` (was a `REG` bucket lookup), all three sites.
- Practice effect → `margin_after − margin_before`, paired by `session_id`/`phase`, the
  binding the store already did and nothing consumed. `domBefore` is not consulted: a bare
  name with no circuit values cannot be re-derived. `after` and `followup` stay separate.
- Recovery → check-ins until margin crosses back above zero, **plus how far under**.
- Baseline card → mean margin, rescaled per side as the qualifier is; gate decoupled from the
  viewing toggle at **n ≥ 8 over ≥ 28 days** (a toggle is a preference, a baseline is a claim).
- `baselineDelta` → margin direction, both the member and guest-shim copies.
- Retired: the `_RANK` / `_PE_RANK` ladder (shutdown and freeze both 0, play and stillness
  both 2 — real movement registered as none).
- Transitions stay **categorical** by design and stop being framed as progress.

**Margins are never rendered as a number.** They drive positions, bands and directions only;
the product's no-scores rule is untouched.

**Naming language (Justin, 2026-08-17):** "with some X", never "X underneath". X is a
**state** (`shutdown`, `flight/fight`), not a circuit — users have never seen the ANS circuit
words outside the figure. Defense-side `under` added and approved: symmetric with the safety
side, freeze exempt because freeze already *is* both. Sentence case throughout.

**A period is not a reading.** "Name — band" over a window is a category error: the band is a
property of one reading. A modal name is a *frequency* claim and is honest; the qualifier is
not. Reported separately, never fused.

**Two name collisions, one bug class.** `freeze_blend` (database) computed the ventral-gated
freeze weight — the version cohort data **rejected**, r = 0.665 gated against 0.788 ungated —
while the spec had ruled for the ungated core. And `periodStats` exported `avgMargin`, §7.2's
connection-minus-louder-defense, beside the engine's margin. Renamed `avgSafetyLead`; §7.2 is
canonical and was not redefined. Two quantities sharing one word is how both drifted.

**Still unfitted, same data gate — `followup` volume, not opinion:** λ, the ½ cost fraction,
the practice-effect `n ≥ 6` gate (sized for a binary rate, too conservative for a continuous
delta), and the ±0.05 direction dead-band's asymmetry (margin is asymmetric about zero, so a
symmetric band trips more readily toward "down").

**Parked by Justin:** the Functional / Regulated / Presence milestones stay out of the app.
They are the predictive layer, headed for dynamic self-regulation plans, and he wants to
experiment before shipping.
