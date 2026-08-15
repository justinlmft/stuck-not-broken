# PVC margin redesign — proposal for agreement

**2026-08-15. Status: PROPOSED, not agreed, not implemented.** No code has been
touched; the engine (`snb-business: Projects/Web Designer/_mockup-pvc-per-state-sliders.html`)
still ships the old `min(a,b) × 1.6` naming rule, and the app (`current.js`) still ships its
own weights. This document is the formula work the brief asked for, written up for Justin's
yes/no. Provenance marks follow the spec's §0 key: ● measured · ▲ inferred · ◆ asserted ·
○ structural.

Frame (decided, upstream of this doc): two defenses only — sympathetic (one system, one
slider) and dorsal. Ventral is not a defense; it does the holding. Margin decides which
state; margin size decides the qualifier; the sympathetic:dorsal ratio decides the flavour.

---

## 1. The proposal, in one line

```
margin = 0.7·V − 0.3·(S + D)          V, S, D ∈ 0–1
```

Sign gives the state side. Nothing else in the formula. Every constant is already shipped.

## 2. ω was never free

The candidate was `V − ω·(S^a + D^a + k·S·D)` with ω = 0.43. But 0.43 is 3/7 — exactly
Regulation Math's shipped `toDef/toCap = 30/70` asymmetry (§2.1, ○, untouched). So the
candidate was always RM's own containment line, `toCap(V) − toDef(S) − toDef(D)`, with two
knobs bolted on:

- `a = 1.5` — a floor someone stated, never fitted.
- `k = 1` — chosen because it was round, never fitted.

The margin is not a new formula that needs fitting. It is the §5 FUNCTIONAL test
(`own ≥ demand`), already the model's central clinical claim, reused as the state boundary.
"Safety-governed" *means* functional; "defense-governed" *means* own capacity doesn't hold
the load. One definition, used twice.

## 3. What the knobs were doing (both failures are theirs)

**Failure 1 was manufactured by `k`.** Without the `k·S·D` term, 100/100/100 sits at
**+0.14** — the opposite side of the line from 15/10/90 (−0.23). The k term dragged a
fully-resourced, fully-activated system across the line into the same territory as deep
shutdown, and that collision is the whole of failure 1. The two boards were never supposed
to be distinguished by *depth*; they differ by *sign*. 15/10/90 is a system nothing is
holding. 100/100/100 is a system holding everything, barely.

**Failure 2's compression came from the difference scale, not the sum.** With one defense
up, the deepest margin is bounded (−0.43 old scale, −0.30 new), so band edges placed near
that bound are unreachable. The fix is not a steeper formula — it's putting the severity
scale where the reachable range actually is (§5 below).

The open question "does ω apply to the largest defense or the summed load" settles by
arithmetic: **the sum**. It is what shipped RM does (§2.5 `own_demand`), and the max-variant
grades functional freeze (35/55/55) as safety-governed (+0.08), which fails the personas
outright.

## 4. The three-part read

```
1. STATE     margin ≥ 0  → safety-governed        margin < 0 → defense-governed
2. QUALIFIER |margin|, rescaled to each side's reachable range, banded at 33/75
3. FLAVOUR   S vs D:  |S − D| < 20 → level (freeze)   else the leader names it
```

**Defense side** — severity in *equivalent-single-defense* units:

```
severity = (S + D − (7/3)·V) × 100        Low < 33 ≤ Moderate < 75 ≤ High
```

On a pure board (V = 0, one defense), severity equals that defense's own slider value —
so the 33/75 edges are the shipped band thresholds, the one pair confirmed against a
psychometric (BPQ-SF percentiles, ●). A single defense reaches HIGH at exactly 75, with
25 points of headroom above it. No refit needed: the edges are inherited, and reachable.

Name: `|S − D| < 20` → **Freeze**; else S leads → **Fight/Flight**, D leads → **Shutdown**.
The 20 is the confirmed fight/flight flavour margin (§2.6 ●-confirmed) **reused** for S:D —
that reuse is ◆ asserted, flagged as such.

**Safety side** — qualifier in equivalent-own-ventral units:

```
qual = margin / 0.7 × 100                 same 33/75 edges
```

- `qual ≥ 33` and a defense ≥ 33 → the **blend names**: S leads → play / motivation,
  D leads → stillness / intimacy. This preserves §1.4's load-bearing claim — dorsal *with*
  ventral is stillness and must never read as pathology.
- `qual < 33` and a defense ≥ 33 → the caution grammar: **"Safety — Low, X underneath"**
  (X = sympathetic / dorsal / freeze by the same flavour rule).
- No defense ≥ 33 → plain **Safety — Low/Moderate/High**.
- Existing quiet guard stays: all circuits < 0.12 → "quiet" (○).

## 5. The boards (all verified by script this session)

| board | old candidate | margin | reads as |
|---|---|---|---|
| 15/10/90 | −0.269 | **−0.195** | Shutdown — Moderate (sev 65) |
| 100/100/100 | −0.290 | **+0.100** | Safety — Low, freeze underneath |
| Fixate 35/55/55 | −0.131 | **−0.085** | Freeze — Low (sev 28) |
| Fold 35/25/68 | −0.018 | **−0.034** | Shutdown — Low (sev 11) |
| F/F 42/72/25 | +0.026 | **+0.003** | Safety — Low (qual 0.4), sympathetic underneath |
| deep-shutdown board 12/23/75 | −0.281 | −0.210 | Shutdown — Moderate (sev 70) |
| 0/0/75 | −0.279 | −0.225 | Shutdown — High (sev 75) |
| 0/100/100 | −1.290 | −0.600 | Freeze — High (sev 200, capped) |
| 80/80/80 (appease band) | −0.091 | +0.080 | Safety — Low, freeze underneath |
| stillness 80/10/60 | — | +0.350 | Stillness / intimacy — Moderate |
| play 70/50/10 | — | +0.310 | Play / motivation — Moderate |
| healthy 90/10/5 | — | +0.585 | Safety — High |

**Failure 1, resolved.** 15/10/90 and 100/100/100 land on opposite sides of the line —
maximally distinguished, by sign, not by a depth contest neither should be in. And HIGH is
reachable by a single defense (0/0/75 sits exactly on the edge; 5/10/90 reads sev 88).

**Failure 2, resolved for two personas, honest about the third.** Fixate and Fold flip to
the defense side. Functional fight/flight lands at +0.003 — three parts in a thousand,
i.e. *on the line*. Under shipped RM arithmetic that is the true read: 42 ventral holds
(7/3)·42 ≈ 98 defense-points; the board carries 97. The read is "Safety — Low, sympathetic
underneath" — the brief's own example grammar, and not a "contained, nothing to see" verdict.
If Justin wants this persona unambiguously defense-side, the only honest levers are the
persona numbers themselves (◆ expert-asserted) or the 30/70 asymmetry (◆ shipped) — not a
refit of a and k.

## 6. Appease, settled

All-three-high (2.4% of check-ins ●) currently falls through a three-way tie to "play" —
the disclosed §1.3 degeneracy. Under the margin read it gets a stable, honest label:
**"Safety — Low, freeze underneath"** — thin ventral governance over level co-activation.
That is a fair autonomic description of appease-phenomenology without claiming the word:
Justin's ruling stands (appease/fawn are defined by behaviour and context we don't measure,
so we never name them from three sliders). The mislabel is gone; the word stays unclaimed.

## 7. Consequences to say out loud

1. **Sympathetic counts once.** One system, one slider, one load: demand = 30·S + 30·D.
   The shipped engine's `toDef(fight) + toDef(flight)` double-count was an artifact of the
   two-input UI (counting the one slider twice would make pure sympathetic weigh double
   pure dorsal — indefensible). Consequence: §5 milestone arithmetic and the §8 persona
   week-counts (50w/18w/28w to functional) were computed under the old convention and will shift when
   the one-slider model lands in the engine. Expected, but must be recomputed, not assumed.
2. **Headline freeze is now containment-gated.** The old rule named freeze whenever
   `min(S,D) ≥ 0.3125` regardless of ventral. Cohort evidence (●, r = 0.79; 51% of freeze
   reporters also report meaningful safety) rejected gating freeze *intensity* on low
   ventral — that finding is untouched: `min(S,D)` stays as the intensity readout, and a
   safety-governed board with level defenses still carries the word ("freeze underneath").
   But the *headline* moves to the safety side for those 51%. That is the architecture
   Justin chose ("margin decides which state"), stated here so it's chosen with eyes open.
3. **Severity is capacity-discounted.** 90% dorsal with 15% ventral reads Moderate
   (sev 65), not High: 15 ventral buys 35 defense-points of holding at the shipped 7/3
   rate. A person with some real ventral can only reach High through co-activation.
   That is the model's core asymmetry doing its job, not a bug — but it is a claim.
4. **At the boundary,** margin = 0 counts as safety-governed, matching §5's `own ≥ demand`.
5. **This margin never touches baseline quantities.** V, S, D are one reading. The severity
   unit ("equivalent single defense") is defined within the same reading. No
   momentary-vs-baseline comparison anywhere.

## 8. Provenance of every number

| constant | value | provenance |
|---|---|---|
| capacity/defense asymmetry | 0.7 / 0.3 (ω = 3/7) | ○/◆ shipped RM §2.1, untouched |
| a (curvature) | dropped (=1) | was ◆ unfitted — removed |
| k (co-activation) | dropped (=0) | was ◆ unfitted — removed; caused failure 1 |
| band edges | 33 / 75 | ● confirmed vs BPQ-SF (§9), inherited unchanged |
| flavour margin | 20 | ● confirmed for fight/flight; **reuse for S:D is ◆** |
| blend/underneath threshold | 33 | = shipped band edge (replaces old 0.3125 ◆) |
| quiet guard | 0.12 | ○ existing engine |
| severity normalizer | 0.3 (= one full defense) | ○ structural |

Nothing was fitted to cohort percentages, and nothing was tuned to a target read.

## 9. What happens on "yes"

1. Implement in the mockup engine: one sympathetic slider (§10.0), `stateName()` replaced
   by the margin read, bars keep `min(S,D)` as freeze intensity.
2. Recompute §5/§8 milestone weeks under the one-slider demand convention.
3. Fold the app/web divergence (§9 item 6): the app's `min(s,d)·(1−v)` weights and the web's
   naming both become downstream renderings of the same margin.
4. Write the agreed formula into the spec as the new §1.2, retiring `min(a,b) × 1.6`.
