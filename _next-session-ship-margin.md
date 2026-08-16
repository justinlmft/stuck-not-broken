# Next-session prompt — ship the margin redesign (engine + spec)

Paste this to open the session. Setup requirement first, everything else follows.

---

Ship the Polyvagal Current margin redesign. The formula work is DONE and agreed — do not
reopen it. Your job is mechanical: land the remaining pieces.

**Setup, before anything:** attach `justinlmft/snb-business` with **push** access
(`add_repo` with `access: "push"`). Last session attached it read-only and the upgrade was
platform-blocked — that is the only reason this work is still open. If push access is
denied again, stop and tell Justin; do not work around it.

**Read first, in order:**
1. `_spec-pvc-margin-redesign.md` (stuck-not-broken repo, branch
   `claude/polyvagal-margin-redesign-7ejgb9`) — source of truth. §1 the package, §5 the
   read, §6 the verified boards, §10 the handoff with copy-ready formulas.
2. `Projects/Web Designer/_spec-regulation-math.md` (snb-business) — the shipped model.
   §0 provenance key, §2 RM units, §4 trajectory, §5 milestones, §8 personas.

**State of the world:**
- App is DONE: `current.js` v8 on the branch above names by margin, node-tested against
  every §6 board. Not merged to main (merging deploys the live PWA — that is Justin's
  call, not yours).
- Master-spec edits are WRITTEN but unapplied:
  `_patch-spec-regulation-math-margin.patch` at stuck-not-broken repo root.
- The mockup engine still ships the old `min(a,b) × 1.6` rule and two fight/flight
  sliders. That migration is the bulk of your session.
- A live preview artifact exists (same functions as the app).

**The work, in order:**

1. **Apply the spec patch.** In the snb-business clone: `git apply` the patch, then
   commit + push per that repo's CLAUDE.md git rule (pull first). If it conflicts, make
   the five edits by hand — they're itemized in the redesign doc §10.4.

2. **Migrate the mockup engine**
   (`Projects/Web Designer/_mockup-pvc-per-state-sliders.html`):
   - One sympathetic slider (§10.0, decided): merge fight/flight inputs; sympathetic
     counts ONCE in every demand sum. Keep §2.6 flavour as display only, now ratio ≥1.4×.
   - Replace `stateName()` and the 1.6 blend rule with the margin read — exact formulas
     in redesign doc §10. Bars keep `min(S,D)` as freeze intensity.
   - Lift → `λ × (1−V)`. λ is ◆ unfitted; set it by *scale preservation*, not by feel:
     choose λ so the mean lift across the three §8 personas equals today's flat value —
     the measured population anchor keeps its size, the shape redistributes it. Label the
     constant PROVISIONAL-◆ in a comment.
   - Engagement cost → `½ × toDef(level)`, replacing the −5/−10/−15 table everywhere it
     bites (mainly `marksFor()`).
   - Recompute the §5/§8 milestone weeks and update the §8 table (mark them
     recomputed-under-margin-engine). The numbers WILL move — report the new ones
     plainly; do not tune anything to bring back the old ones.
   - Chronic pass: `DEFENSE_CEIL` / `SAFETY_CEIL` / `FF_PEAK` → capacity-relative bounds.
     Guardrail (expert, binding): `(1−V)` bounds the TRAIT, never the momentary reaction —
     raw sliders are never gated, acute reactivity is never restricted.
   - Display split (decided, round 8): qualifier renders as **"defensive load —
     low/moderate/high" on a NEUTRAL bar**; **"dominant state"** carries the name and the
     state color; the margin meter is the visible see-saw. Never a state-colored
     magnitude bar. Input sliders are FREE — no dynamic bounds, no silent adjustment of
     anything the user set (decided against expert advice, with arithmetic — redesign
     doc §7 round 8).

3. **Verify before claiming.** Script the §6 boards against the migrated engine — every
   read must match the redesign doc's table. The expert itself forgot the ramp in round 7;
   the ramp is real: sub-33 co-activation pays no tax.

4. **Commit + push snb-business** with clear messages; summarize for Justin in short plain
   sentences, one idea at a time, using the model's own vocabulary (Functional, Regulated,
   Presence; moderate/high bands; ventral/sympathetic/dorsal). No invented terms, minimal
   tables.

**Traps, earned the hard way:**
- Don't reopen the formula. Every constant's provenance is in the redesign doc §9; the
  unfitted ones (λ, ½, tax anchors) wait on `followup` data, not on opinion.
- Don't fit anything to a target read or a cohort percentage — that is how the old
  formula died.
- Continuity is a correctness requirement (the lowBank lesson): no cliffs, anywhere.
- Never compare a momentary reading against a baseline quantity.
- Rendering palette and figure motion stay untouched; naming is what changed.
- Justin is time-scarce and processes tables poorly when tired. Short, plain, one idea
  at a time.
