# Consultation note to the PVT expert — co-activation cost and the defense ceiling

**STATUS: CLOSED.** Rounds 6–7 answered 2026-08-15: S-shape endorsed and adopted
(anchored at the shipped 33/75 edges); ceiling shown emergent (naive form collided with
the settled stillness mechanic and was not adopted); acute/chronic guardrail adopted;
functional fight/flight persona revised 42/72/25 → 42/72/36 (chronic visceral cross-talk;
chronicity, not S-D coupling). All outcomes and the implementation handoff live in
`_spec-pvc-margin-redesign.md`. This file is kept as the consultation record only.

**From:** Justin (Stuck Not Broken) · 2026-08-15
**Continuation of:** the five review rounds concluded 2026-08-13 (mobilisation coefficient,
stillness floor, freeze recalibration, allostatic erosion, the from-scratch model). You know
this model. This is a targeted question, not a re-review.

---

## What changed since round 5

We are redesigning how the Current names states. The state is now decided by a containment
margin — capacity minus load in Regulation Math's own currency:

```
margin = 0.7·V − 0.3·(S + D + tax)        V, S, D ∈ 0–1, self-report
margin ≥ 0 → safety-governed (blends: play, stillness, safety)
margin < 0 → defense-governed (fight/flight, shutdown, freeze)
```

Sympathetic is one system, one slider, counted once. A design principle was adopted this
session: **the inputs are subjective and self-anchored — a person's 100% is their own — so
the model deals in ratios and margins of the person's own scale.** Fixed numbers survive
only where something was measured.

The tax term is new. It prices sympathetic–dorsal co-activation, gated by missing ventral:

```
tax = min(S, D) × (1 − V)
```

`min(S,D)` is the co-active portion of the load (equivalently: total defense minus the gap
between the defenses, halved) — the same quantity that tracked cohort-reported freeze at
r = 0.79. `(1 − V)` is the gate you know from our stuckness rendering and the app's freeze
weight: co-activation that ventral is holding costs nothing extra (100/100/100 must not
read as deep shutdown; stillness must not read as pathology). This linear form is our
placeholder: each unit of unheld co-active load counts double, full stop.

## The dilemma

Two questions we cannot settle from data, and on which Justin has clinical instincts we
have deliberately not encoded without an outside read:

### 1. How does co-activation cost grow with its level?

Options on the table:

- **Linear** (current placeholder): each unit of unheld co-active load costs the same.
  Simplest; fewest assumed shapes.
- **Escalating through the moderate and high bands**: co-activation at low levels is
  nearly free; in the moderate band (≥33) and high band (≥75) it costs disproportionately
  more. Justin's instinct.
- **Justin's full hypothesis is S-shaped**: negligible at low levels, escalating through
  moderate-to-high, then **saturating at a ceiling** — "defense does not spiral into
  infinity."

Our data cannot arbitrate: all-three-high is 2.4% of check-ins, the r = 0.79 freeze
correlation doesn't separate shapes, and retention (2.7-day mean) blocks longitudinal
tests. What we want from you is the **shape and its mechanism**, grounded in the
literature — autonomic space / coactivation-vs-reciprocal modes, tonic immobility and
freeze physiology, concurrent cardiac "gas and brake" — not coefficients. (Round 5's
lesson stands on both sides: your architecture was coherent, your coefficients were not
on our scale. We will do the scaling; you do the shape.)

### 2. The ceiling — a ratio over safety, not a firm number

Justin's claim, verbatim in substance: even if co-activation is taxed harder in the
moderate-to-high range, total effective defense load must saturate — and in a
subjective-scale model, that ceiling should be **some ratio anchored to safety**, not a
fixed constant. The model currently carries firm numbers where this ceiling lives:
`DEFENSE_CEIL = 95`, `SAFETY_CEIL = 95` (◆ "nobody reaches 100"), and `FF_PEAK = 0.82`
(sympathetic capped at 82% of the high band during titration, ◆). All asserted, none
measured.

Questions:

- Is there a physiological basis for **saturation of total defensive activation** —
  metabolic, neural, or organizational — that would justify a ceiling on effective load
  rather than unbounded growth?
- Does the maximum *expressible* defense scale with ventral capacity (vagal brake
  integrity, window-of-tolerance logic), or is it independent of it? Note the trap we
  see: deep shutdown with near-zero ventral is a classic presentation, so a ceiling
  proportional to safety alone would seem to forbid the very states we serve. If the
  ceiling is capacity-relative, relative to *what* exactly?
- If you endorse saturation, how would you parameterize it **as a ratio in the person's
  own scale** (per our design principle), and which of our three firm numbers above does
  it replace or subsume?

### 3. Sanity-check the unifying principle

The package generalizes one pattern: **everything defensive or borrowed scales with
missing ventral, (1 − V)** — the stuckness gate, the app freeze weight, the co-activation
tax, and now context/practice lift (`lift = λ·(1−V)`: co-regulation fills a fraction of
the missing ventral — transformative for the highly defended, shrinking toward zero near
Presence). Is missing-ventral the right master variable everywhere we've used it, or does
the literature distinguish cases where it is the wrong gate?

## Constraints on a useful answer

- Self-report all the way down. Your own round-5 conclusion applies: our quantities
  measure *perceived* visceral cost, and for this engine that is the correct quantity.
  Do not propose lab-tier validation; we are not running it.
- Functional forms with mechanisms and literature anchors, not fitted constants.
- Falsifiable against what we hold: 765 app check-ins / 127 users, the 32-person cohort
  weekly survey, paired practice check-ins, and (accumulating) `followup` check-ins.
- Remember the settled ground: your freeze recalibration was rejected on evidence —
  functional freeze *with* meaningful reported safety is the majority of our population.
  Any proposed shape must not resurrect a low-ventral gate on freeze intensity.

## What a useful answer looks like

1. A cost-growth shape for unheld co-activation (linear / escalating / S-shaped), with
   the mechanism named and sourced.
2. A yes/no on capacity-relative saturation of defensive load, with the anchor quantity
   identified — and the trap above addressed.
3. Any place the (1 − V) principle contradicts PVT as you read it.

---

*Appendix — current reads under the package (script-verified, linear tax): deep shutdown
12/23/75 → Shutdown, severity 90 (high band); functional freeze 35/55/55 → Freeze,
severity 64 (moderate); functional shutdown 35/25/68 → Shutdown, severity 28 (low);
functional fight/flight 42/72/25 → Fight/Flight, severity 14 (low); 100/100/100 →
safety-governed by +0.10, freeze underneath; stillness 80/10/60 and play 70/50/10
unaffected by the tax; severity is in equivalent-single-defense units, banded at the
shipped 33/75.*
