# PVC margin redesign — proposal for agreement

**2026-08-15, revised after expert consultation round 6 (co-activation cost and the
defense ceiling).** Status: PROPOSED — package agreed in discussion with Justin and
endorsed in shape by the PVT expert; unfitted weights marked. **No code has been
touched.** The engine (`snb-business: Projects/Web Designer/_mockup-pvc-per-state-sliders.html`)
still ships the old `min(a,b) × 1.6` naming rule; the app (`current.js`) still ships its
own weights. Provenance marks follow the spec's §0 key: ● measured · ▲ inferred ·
◆ asserted · ○ structural.

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
nothing. Functional fight/flight (42/72/25, dorsal 25 = background) returns to the line
at **+0.003** — the linear placeholder had tipped it to −0.040, and the S-shape undoes
that. The deep-shutdown board 12/23/75 (sympathetic 23 = background) reads Moderate
(sev 70), not High. **The shape was chosen for its mechanism, not to produce reads** —
re-bending it to force a persona defense-side would be fitting to a target, the exact
trap the old formula died in. If functional fight/flight is clinically defense-governed,
that is a question about the persona's ◆ numbers, not the tax.

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
| functional fight/flight 42/72/25 | +0.003 | on the line: Safety — Low, sympathetic underneath |
| deep-shutdown board 12/23/75 | −0.210 | Shutdown — Moderate (sev 70) |
| 0/0/75 | −0.225 | Shutdown — High (sev 75, edge exact) |
| heavy conflict 15/70/75 | −0.502 | Freeze — High |
| appease band 80/80/80 | +0.032 | Safety — Low, freeze underneath |
| stillness 80/10/60 | +0.350 | Stillness / intimacy — Moderate |
| play 70/50/10 | +0.310 | Play / motivation — Moderate |
| healthy 90/10/5 | +0.584 | Safety — High |

**Failure 1, resolved** — by sign; the ventral gate keeps it resolved under the tax.
**Failure 2** — functional freeze and functional shutdown read defense-governed;
functional fight/flight sits on the line (see §4.1 ⚠).
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

## 10. What happens on "yes"

1. Implement in the mockup engine: one sympathetic slider, `stateName()` replaced by the
   margin read, bars keep `min(S,D)` as freeze intensity; lift and cost switch to the
   missing-ventral / proportional forms behind the same UI.
2. Recompute §5/§8 milestone weeks under the new arithmetic.
3. Engine-side (chronic) pass: replace `DEFENSE_CEIL` / `SAFETY_CEIL` / `FF_PEAK` with
   capacity-relative bounds under the §4 guardrail.
4. Fold the app/web divergence (§9 item 6): app weights and web naming become downstream
   renderings of the same margin.
5. Write the agreed package into the spec as the new §1.2, retiring `min(a,b) × 1.6`, and
   strike the §8 persona nicknames.
6. Queue the acute-vs-stuck labelling behind the redesign (§7).
