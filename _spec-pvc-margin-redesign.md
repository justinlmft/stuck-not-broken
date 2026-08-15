# PVC margin redesign — proposal for agreement

**2026-08-15, revised same day after discussion with Justin.** Status: PROPOSED — the
formula package below reflects the discussion; the unfitted weights in it are marked and
still need Justin's numbers-or-nod. **No code has been touched.** The engine
(`snb-business: Projects/Web Designer/_mockup-pvc-per-state-sliders.html`) still ships the
old `min(a,b) × 1.6` naming rule; the app (`current.js`) still ships its own weights.
Provenance marks follow the spec's §0 key: ● measured · ▲ inferred · ◆ asserted · ○ structural.

Frame (decided, upstream): two defenses only — sympathetic (one system, one slider) and
dorsal. Ventral is not a defense; it does the holding. Margin decides which state; margin
size decides the qualifier; the sympathetic:dorsal balance decides the flavour.

Design principle (Justin, this session): **the inputs are subjective self-report — a
person's 100% is their own, not a standard.** So the model deals in percentages, ratios and
margins of the person's own scale. Fixed numbers survive only where something was actually
measured. The state decision below is a pure ratio test; severity is a within-person read,
never compared across people (the product already promises no scores, no diagnosis).

---

## 1. The package

```
margin = 0.7·V − 0.3·(S + D + tax)         V, S, D ∈ 0–1

tax    = min(S, D) × (1 − V)               co-activation tax, ventral-gated
lift   = λ × (1 − V)                       context/practice lift (RM side), headroom-scaled
cost   = ½ × toDef(level)                  engagement cost, proportional (replaces −5/−10/−15)
```

Sign gives the state side. `|margin|`, rescaled per side, gives the qualifier. S vs D gives
the flavour.

## 2. The 0.7/0.3 rule

RM's shipped exchange rate (§2.1, untouched): a baseline at full strength is worth **70**, a
fully expressed defense costs **30**. The margin is capacity minus load in that one currency,
÷100. The asymmetry is the clinical claim — *a defense never costs as much as the capacity
that holds it*; one point of ventral holds 2⅓ points of defense — chosen so containment is
possible at all (both defenses maxed = 60, just holdable by a full 70 baseline, which is why
100/100/100 lands at +0.10: barely governed, running on fumes). ◆ asserted, but shipped and
load-bearing, and the old candidate's ω = 0.43 was always 0.3/0.7 in disguise. The sign is
scale-free: it only asks whether V : (S+D+tax) clears 3 : 7 — a person who uses only the
bottom half of their sliders gets the same state read.

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

The package's one new idea is already in the model four times. `(1 − V)` — *missing
ventral* — is the §1.4 stuckness gate (`dorsal × (1−V)`), the app's shipped freeze weight
(`min(s,d) × (1−V)`, `current.js:33`, the cohort-validated core, r = 0.79 ●), the
co-activation tax, and now the lift. One teachable principle:

> **Everything defensive or borrowed scales with how much ventral is missing.**

**The tax** (Justin: "we need to consider the tax of both states active"). Both defenses
running at once cost extra — but only the *unheld* part. The gate is what makes it safe:
an ungated tax (any flavour of `S×D` or bare `min(S,D)`) drags 100/100/100 back across the
line and recreates failure 1 — the exact hole `k·S·D` fell into. Gated, full ventral means
zero tax: 100/100/100 and stillness don't move; every genuinely stuck board deepens.
Form: shipped parts, recombined. Weight (tested at 1.0): ◆ unfitted.

**The lift** (Justin's rule: the higher the ventral, the smaller the bump). Co-regulation
and practice fill a fraction of the ventral that is *missing* — transformative for the
highly defended, shrinking toward zero near the ceiling. This is proportional-to-headroom,
not proportional-to-capacity (which would claim support helps the resourced most —
anti-PVT). Three structural wins: `SAFETY_CEIL = 95` stops being a bolted-on clamp (the
bound emerges from the form); §2.4 fragility interacts correctly (the low-ventral person
receiving the big borrowed lift is exactly the one whose state reads brittle); and the flat
`CTX_LIFT +10` / practice-lift table become per-person instead of one-size.
⚠ **λ is ◆ unfitted, and the obvious fit is forbidden**: the n=161 practice pairs already
show exactly this shape (+0.306 lift in the lowest ventral band falling to −0.044 in the
highest ●) — but that gradient is regression-to-the-mean plus ceiling effect (§9). Adopt
the form on principle; let the `followup` check-ins separate true headroom-scaling from RTM.

**The cost.** The flat table (−5/−10/−15 per band) is roughly "engaging a defense costs
about half of what carrying it does." Say that directly: `cost = ½ × toDef(level)`. One
fraction (◆) replaces three flat numbers, band cliffs disappear, cost scales in the
person's own units, and the spec's unresolved −15-vs−20 conflict (§2.2) evaporates with the
table. Low-risk: the cost table is nearly inert in trajectories (4/12/28 moved timelines
0–2 weeks; it bites only in milestones).

## 5. The three-part read

```
1. STATE     margin ≥ 0 → safety-governed        margin < 0 → defense-governed
2. QUALIFIER |margin| rescaled to the side's own range, banded at 33/75
3. FLAVOUR   S vs D:  near-level → freeze/both    else the leader names it
```

**Defense side** — severity in *equivalent-single-defense* units:

```
severity = (S + D + tax − (7/3)·V) × 100        Low < 33 ≤ Moderate < 75 ≤ High
```

On a pure board (V = 0, one defense, tax = 0) severity equals that defense's own slider —
so the 33/75 edges are the shipped band thresholds, the one pair confirmed against a
psychometric (BPQ-SF ●), inherited unchanged and **reachable**: a single defense hits HIGH
at exactly 75. Name: S and D near-level → **Freeze**; S leads → **Fight/Flight**; D leads →
**Shutdown**.

**Safety side** — qualifier in equivalent-own-ventral units: `qual = margin / 0.7 × 100`,
same 33/75 edges.

- qual ≥ 33 with a defense ≥ 33 → the **blend names**: play / motivation (S leads),
  stillness / intimacy (D leads). Dorsal *with* ventral stays stillness — §1.4's
  load-bearing claim, protected by the same gate.
- qual < 33 with a defense ≥ 33 → caution grammar: **"Safety — Low, X underneath"**
  (X = sympathetic / dorsal / freeze).
- No defense ≥ 33 → plain **Safety — Low / Moderate / High**.
- Existing quiet guard stays (all circuits < 0.12 → "quiet", ○).

Flavour threshold: the shipped fight/flight margin of 20 is a *difference* and therefore
not scale-free; the ratio conversion (leader ≥ ~1.4× the other, which reproduces 20 at
typical levels) is proposed but **open** — Justin hasn't called it.

## 6. The boards (script-verified, tax at weight 1.0)

| board | margin | reads as |
|---|---|---|
| 15/10/90 | −0.220 | Shutdown — Moderate (sev 74, at the High edge) |
| 100/100/100 | +0.100 | Safety — Low, freeze underneath |
| functional freeze 35/55/55 | −0.192 | Freeze — Moderate (sev 64) |
| functional shutdown 35/25/68 | −0.083 | Shutdown — Low (sev 28) |
| functional fight/flight 42/72/25 | −0.040 | Fight/Flight — Low (sev 14) |
| deep-shutdown board 12/23/75 | −0.271 | Shutdown — High (sev 90) |
| 0/0/75 | −0.225 | Shutdown — High (sev 75, edge exact) |
| 0/100/100 | −0.900 | Freeze — High |
| appease band 80/80/80 | +0.032 | Safety — Low, freeze underneath |
| stillness 80/10/60 | +0.344 | Stillness / intimacy — Moderate |
| play 70/50/10 | +0.301 | Play / motivation — Moderate |
| healthy 90/10/5 | +0.584 | Safety — High |

**Failure 1, resolved** — by sign, and held resolved under the tax (the gate is why).
**Failure 2, resolved** — all three functional personas now read defense-governed, including
fight/flight, which the ungated margin left on the line at +0.003 and the tax tips to
−0.040. That tip was Justin's own call ("consider the tax of both states active"), and the
arithmetic delivered it without touching 0.7/0.3 or the persona numbers.
**Appease, settled** — all-three-high (2.4% of check-ins ●) stops falling through the §1.3
tie to "play" and reads "Safety — Low, freeze underneath": thin ventral governance over
level co-activation. The words appease/fawn stay unclaimed (Justin's ruling: they're
defined by behaviour and context we don't measure).

## 7. Decided vs open

**Decided this session (Justin):**
- Sympathetic counts **once** in the load — one system, one slider, one weight. (The old
  engine's `toDef(fight) + toDef(flight)` double-count was a two-input-UI artifact.)
- Follow the math, **and** build the co-activation tax — which resolves the
  fight/flight-persona question that was pending when the tax came up.
- Ratios/margins over fixed numbers wherever nothing was measured; lift scales with
  missing ventral.
- "Fixate" / "Fold" are not terms in use — strike the nicknames from spec §8 on next touch.

**Open — needs Justin's nod or a fit:**
- tax weight (1.0 provisional ◆)
- λ, the lift scale (◆; fit path = `followup` check-ins, NOT the RTM-contaminated gradient)
- cost fraction (½ provisional ◆)
- flavour threshold as ratio (~1.4×) vs shipped difference (20)
- context *loads* (+20/+40 to Demand): deliberately NOT ratio-ified yet — scaling threat
  with the victim's capacity is a clinical claim nobody has made. Parked.

## 8. Consequences to say out loud

1. §5 milestone arithmetic and the §8 persona week-counts (50w/18w/28w to functional) were
   computed under the old double-count, flat-lift, flat-cost engine. All shift under this
   package. Expected — recompute, don't assume.
2. Headline freeze is now containment-gated. Cohort evidence (●, r = 0.79; 51% of freeze
   reporters also report meaningful safety) rejected gating freeze *intensity* on ventral —
   untouched: `min(S,D)` stays the intensity readout, and safety-governed level-defense
   boards keep the word ("freeze underneath"). But the *headline* moves to the safety side
   for those people. That is the margin architecture, chosen with eyes open.
3. Severity is capacity-discounted: real ventral buys holding at 7/3, so mid-ventral boards
   read milder than their defense sliders suggest. The tax partially offsets this for
   co-activated boards (15/10/90 rose from sev 65 to 74). Core asymmetry doing its job.
4. margin = 0 counts as safety-governed, matching §5's `own ≥ demand`.
5. Everything here compares quantities within one reading. No momentary-vs-baseline
   comparison anywhere.

## 9. Provenance of every number

| constant | value | provenance |
|---|---|---|
| capacity/defense rate | 0.7 / 0.3 | ◆ shipped RM §2.1, untouched (ω = 3/7 in disguise) |
| a, k (old knobs) | dropped | were ◆ unfitted; k caused failure 1 |
| tax form | min(S,D)·(1−V) | ○ shipped parts recombined (app freeze core ● + §1.4 gate) |
| tax weight | 1.0 | ◆ unfitted, provisional |
| lift form | λ·(1−V) | ◆ Justin's rule, PVT-aligned; shape visible in data but RTM-confounded |
| λ | — | unfitted; `followup` check-ins are the fit path |
| cost | ½ × toDef(level) | ◆ fraction unfitted; replaces flat table (nearly inert, low-risk) |
| band edges | 33 / 75 | ● BPQ-SF-confirmed, inherited unchanged |
| flavour threshold | 20 diff → ~1.4× ratio? | ● confirmed as difference; ratio conversion OPEN |
| blend/underneath threshold | 33 | = shipped band edge (replaces old 0.3125 ◆) |
| quiet guard | 0.12 | ○ existing engine |
| severity normalizer | 0.3 (= one full defense) | ○ structural |

Nothing fitted to cohort percentages; nothing tuned to a target read; the one gradient that
"confirms" the lift form is flagged as contaminated and not used.

## 10. What happens on "yes"

1. Implement in the mockup engine: one sympathetic slider, `stateName()` replaced by the
   margin read, bars keep `min(S,D)` as freeze intensity; lift and cost switch to the
   headroom/proportional forms behind the same UI.
2. Recompute §5/§8 milestone weeks under the new arithmetic.
3. Fold the app/web divergence (§9 item 6): app weights and web naming become downstream
   renderings of the same margin.
4. Write the agreed package into the spec as the new §1.2, retiring `min(a,b) × 1.6`, and
   strike the §8 persona nicknames.
