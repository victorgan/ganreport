---
date: 2026-07-01
model: Claude Opus 4.8
tags: [life-admin, product-spec, personal-tools, ux, cooldown-timer]
summary: "Priority tiers (need / upkeep / want) and task cascades for The Year, plus open questions"
status: draft
---

# The Year — Feature spec: priority & cascades

## Context

*The Year* is a single-page, offline-first life-admin app. Everything you do on a
repeat is a **ring card**: the ring drains over the task's interval and refills when
you tap it done. Nothing goes overdue, nothing stacks up, and skipping costs nothing —
state is a pure function of `lastDone + interval`. A second surface, **the calendar
year**, holds jobs tied to a time of year (taxes, benefits deadlines, seasonal work) as
the same card shape.

This document specs two additions that the current model can't express:

1. **Priority** — some tasks matter far more than others, and the app currently treats
   maxing the 401k and restocking supplements identically.
2. **Cascades** — some tasks unlock, reset, or depend on others, and the app currently
   treats every task as independent.

---

## Foundation — what's already built (the decisions these features extend)

Before specifying the new work, this is the model as it stands, because priority and
cascades have to fit inside it rather than replace it.

### Two recharge models, one card

Every task is the same ring card, but a ring can drain in one of two ways:

- **Interval (rolling cooldown).** `reserve = 1 − daysSince(lastDone) / interval`,
  clamped to `[0,1]`. Tapping done resets `lastDone` to today; the ring refills and
  starts draining again. This is the default for the ~84 repeating tasks.
- **Date (calendar-anchored).** The ring recharges *toward a fixed date each year*
  rather than a rolling interval: it sits full when the date is far off, empties over
  the final ~120 days (`DATE_WINDOW`), reads "now" when due, shows "done" once checked,
  and resets automatically in January. This is how the calendar-year jobs work, and
  users can create their own date-anchored tasks (passport renewal, birthdays) via the
  same **Add** sheet with an **Every N days / By a date** toggle.

Both modes share `stateColor()`: teal (`patina`, charged) → gold (`brass`, getting low)
→ amber (`ember`, ready). Ready cards get a soft glow and a slow "breathe" pulse;
reduced-motion is respected.

### Two tabs, overlapping data

- **On repeat** — every task, grouped into 12 areas (Health, Fitness, Nutrition, Mind,
  Grooming, Home, Money, Career, Gear, People, Craft, Rest).
- **The calendar year** — a horizontal month strip; the date-anchored jobs laid out in
  the month they fall due, with a "% through the year" progress bar and a now-marker.

The calendar jobs appear in **both** tabs: in their month on the calendar, and mixed
into their area (tax → Money, benefits → Health) under On repeat. Completion is shared
state, so checking a job off in one place reflects instantly in the other.

### Persistence & portability

State lives in `localStorage` (key `theyear.v*`), with JSON **Export/Import** for
backup and for moving to a hosted copy on gan.report. No account, no network, no
telemetry. Defaults ship pre-seeded so the board looks lived-in on first open.

### Design decisions already locked

- **The whole card face is the done button.** One tap = done. The `⋯` corner button
  opens detail/adjust (or, for calendar built-ins, the explanatory note).
- **Prunability.** Any task — including the 84 defaults and the 20 calendar jobs — can
  be removed (`state.removed`), not just user-created ones.
- **No red, no overdue, no backlog.** An empty ring is a nudge, not a debt. This is the
  load-bearing constraint everything below must respect.

---

## How recurring and calendar tasks relate

The recurring rhythms and the calendar jobs are not two different features — they are the
**same card and the same idea** (a ring that discharges and recharges), split only by
*what drives the recharge*: relative time versus absolute time.

| | **Recurring** (interval) | **Calendar** (date-anchored) |
|---|---|---|
| Recharge is measured… | from the last time you did it | toward a fixed point in the year |
| Formula | `reserve = 1 − daysSince(lastDone)/interval` | fills when far off, empties over the final ~120 days to the due date |
| The clock… | **floats** — resets every time you act | **is pinned** — resets annually on Jan 1 |
| "Done" means | did it just now; do it again in `interval` days | handled for this year; comes back next year |
| Times per year | as many as you complete it | once per anchor |
| Good for | upkeep where only elapsed time matters (haircut, clean) | jobs tied to a moment (tax deadline, benefits window, seasonal) |

**What they share.** One `dials` record with a `mode` field; the identical ring card; the
same tap-to-complete gesture; the same colour/urgency scale (patina → brass → ember); and
the same priority layer — tiers, `leadDays` warm-up, and the "Needs attention" strip all
apply to both.

**How to tell which a task is.** Ask whether *missing a specific date* is the point. If the
cost is tied to a calendar moment (the 401k window closes, the FSA expires), it's a
calendar task. If only *time since last* matters and the exact date is irrelevant, it's
recurring. The **Add** sheet makes this the one real choice — "Every N days" vs "By a
date."

**Where each lives** (the view mapping — see *How the two surfaces relate*, below):
- Recurring tasks live **only** in *On repeat*.
- Calendar tasks live in **both**: laid out by month in *The calendar year*, and mixed
  into their area under *On repeat*. So *On repeat* is the full set; the calendar is the
  time-anchored subset.

**Where they meet.** Two constructs bridge the models:
- A **chain** is recurring at the top level (a yearly cooldown) but its steps can carry
  calendar anchors (`m`), so one task can have a floating overall cadence with pinned step
  placement — e.g. the Backdoor Roth recharges yearly yet drops "contribute" in January
  and "file 8606" in April.
- A **date-anchored one-off** (a birthday, a passport renewal) sits at the edge: it's on
  the calendar model (pinned to a date) but conceptually a recurring yearly event. The
  `once` flag is the true one-shot; a 365-day interval and a yearly date anchor look alike
  but differ in whether the clock floats or pins.

The two models are deliberately **not** merged into one. Forcing a haircut onto a fixed
date would invent pressure the app exists to avoid; floating a tax deadline would hide a
real cliff. Keeping both — relative for upkeep, absolute for deadlines — is what lets the
same calm card serve laundry and the 401k without either feeling wrong.

---

## How the two surfaces relate

The two tabs are **two projections of one task set**, not two separate lists. Every task
lives once; the surfaces differ only in what they show and how they lay it out.

- **On repeat is the *doing* view.** Every task as a single card, grouped by area,
  collapsed to one actionable state. A chain is one advancing card here; a date-anchored
  job is mixed into its area (tax → Money, benefits → Health).
- **The calendar year is the *when* view.** Only time-anchored things, spread across the
  12 months so you can read the shape of the year. A date-anchored job sits in its month;
  a chain's steps sit in their anchored months, each **locked until the prior step is
  done** — a chain on the calendar is literally a series of gates along the timeline.

Two rules keep them coherent:

1. **Shared state — one source of truth.** Completion is stored once. Checking a date job
   off in either tab reflects in the other; advancing a chain step on the calendar
   advances the same `step` counter the On-repeat card reads. There is no per-view copy to
   keep in sync.
2. **Single ownership — no duplication.** A task is owned by exactly one construct. A
   chain *owns* its calendar slots: the former standalone "Do the backdoor Roth" timeline
   entry is now tagged `owner:'roth'` and suppressed as an independent card, so the task
   renders as chain steps on the calendar and as one collapsed card under On repeat —
   never as both a chain *and* a separate date card. This ownership rule is what removed
   the earlier Backdoor-Roth duplication.

So the same Backdoor Roth appears as: one advancing card in On repeat; "Contribute" and
"Convert" in January (Convert locked until Contribute is done); and "File Form 8606" (a
hard Apr 15 deadline) in April — all driven by a single `step` counter.

---

## Principles these features must not break

- **No manufactured pressure.** The app never nags, shames, or accumulates a backlog.
  A skipped task is an invitation you declined, not a debt.
- **One card = one thing you can act on now.** Never show a step you can't yet do.
- **State is derived, not managed.** Prefer rules that fall out of `lastDone + interval`
  over hand-maintained status.
- **Low setup burden.** Defaults ship pre-configured. The user should almost never *have*
  to label or wire anything; overrides are available but optional.

---

# Feature 1 — Priority

## The real axis: cost of skipping

"Importance" is too abstract to act on. The thing that actually separates the 401k from
supplements is **what it costs you to skip it**:

- Miss the 401k window → you permanently lose tax-advantaged space and match. Irreversible.
- Miss a supplement restock → mildly annoying for a day. Fully recoverable.

So priority is modelled as **cost of skipping**, which maps cleanly onto a need/want
instinct but keeps the useful middle.

## Three tiers

| Tier | Meaning | Cost of skipping | Examples |
|---|---|---|---|
| **Need** | Real, often irreversible consequences | High / permanent | 401k, taxes, physical, dental, insurance, backups |
| **Upkeep** | Keeps life running; fully recoverable | Low / temporary | cleaning, haircut, budget review, supplements |
| **Want** | Pure enrichment | None | try a recipe, tea session, reading, plan something fun |

Most of the ~84 default tasks are Upkeep. Needs are a small set; Wants are the calm tail.

## The key mechanic: priority controls lead time and prominence, **not loudness**

This is what keeps it from becoming a guilt machine. Priority changes *when* and *how
visibly* a task surfaces — never how aggressively it nags.

- **Needs warm up early.** A Need starts glowing amber *before* it is strictly due
  (`leadDays` ahead), so it can't quietly slip past. For a hard deadline like the 401k,
  that lead is weeks.
- **Upkeep nudges at due.** Standard behaviour — glows only when the ring empties.
- **Wants stay calm.** Rendered dimmer and smaller; they never glow. They sit there as
  an option and are never scolded for being ignored.

## "Needs attention" strip

A small strip at the top of the page: the honest shortlist of **Needs that are due or
warming up**, plus any hard-deadline calendar item whose window is closing. This is the
4-item "don't let these slip" view versus the 84-item board. (It earns back the slot of
the old "ready when you are" section, but filtered by real stakes rather than showing
everything.)

## Sort

Within any group, once something is due: **Needs float up, Wants sink.** Untriggered
items keep their normal grouping. Dormant (gated) tasks sink to the bottom; done items
below them.

## The one honest exception to no-penalty: hard deadlines

The no-guilt philosophy exists so the app doesn't invent pressure for laundry. It should
**not** hide a cliff that is actually real. Calendar items with a true expiry — 401k,
FSA spend-down, tax filing — get genuine urgency as the window closes: a real "closes in
N days" countdown instead of the calm "any time now" everything else gets. Letting these
feel urgent is serving the user, not nagging them.

## Data model

```ts
type Tier = 'need' | 'upkeep' | 'want';

interface Task {
  // ...existing fields: id, area, label, icon, interval, lastDone, mode, dueM/dueD
  tier: Tier;                 // ships pre-tagged on every default
  leadDays?: number;          // how early a Need warms; default derived from tier + interval
  hardDeadline?: { month: number; day: number }; // real cliff (calendar items only)
}
```

`leadDays` default: for Upkeep, `0`. For Need, proportional to interval (~15% of the
interval, clamped to 7–60 days) so an annual Need warms ~6–8 weeks out and a monthly
Need a few days out. Date-anchored Needs default to ~45 days. Overridable per task in the
`⋯` sheet.

## Alternatives considered

- **Per-category ranking (drag to reorder within a bucket).** Rejected. High manual
  effort, and structurally can't say the thing that matters — that the 401k beats
  *everything* in Home. Ranking inside a bucket can't express cross-bucket priority.
- **Binary need/want only.** Rejected. Throws away the middle, where most tasks live.
  Everything collapses into "critical" or "trivial," which is false.
- **Numeric priority (1–5 / weights).** Rejected. Invites fiddling and false precision;
  three named tiers are legible at a glance.

## Open questions

- Two tiers vs three. Leaning three, but Need/Want with Upkeep folded into Want is a
  viable simpler cut.
- Exact `leadDays` curve (proportional vs fixed steps per interval band).
- Should Wants live in a separate, collapsed section rather than just being dimmer?
- Does the "Needs attention" strip include Upkeep items that are *badly* overdue, or
  strictly Needs + hard deadlines? (Shipped v1: strictly Needs + hard deadlines.)

---

# Feature 2 — Cascades

## The problem, and the four shapes it actually takes

"Some tasks cascade from one to another" is really four distinct relationships. Naming
them is most of the design:

| Shape | Meaning | Example |
|---|---|---|
| **Chain (sequence)** | B can't start until A is done; the whole thing is one job | Backdoor Roth: contribute → convert → file Form 8606 |
| **Reset (subsume)** | Doing the big one refills the small one | Deep-clean bathroom refills the weekly bathroom clean |
| **Gate (prerequisite)** | B stays dormant until A is *fresh* | Order new glasses — dormant until the eye exam is done |
| **Offer (conditional spawn)** | Finishing A *might* create B, depending on a human judgment | Physical → maybe book a specialist; bike service → maybe replace a worn chain |

A single dependency-graph feature can't serve all four well without becoming a project
tool. So: model each shape with the lightest thing that fits, and let them compose.

## Recommended model

### 1. Chains — one card that walks through its steps *(primary construct)*

A chain is **one card**, not N cards. It shows only the **active step** plus a small
"step 2 of 3" pip row. Tapping done completes the current step and advances to the next —
same tap, same satisfying refill. Completing the last step:

- **one-shot chain** → the card retires (archives / disappears);
- **recurring chain** → the whole chain goes on cooldown and re-arms the first step when
  the interval elapses.

This is the calm way to do sequences: you are never shown step 3 while step 1 is
undone, so there is nothing to feel behind on. Each step can carry its own `tier` and
`hardDeadline`, so a chain that spans the calendar (Roth) can have step 1 warm in January
and step 3 warm as April approaches.

**Rendering by surface** *(shipped — cross-surface):*
- In **On repeat**: the chain collapses to a single advancing card.
- In **the calendar year**: each step carrying a month anchor (`m`) sits in that month
  but stays dim/locked until the previous step is done — i.e. a chain in the calendar *is*
  a series of gates along the timeline. Steps with no `m` appear only in On repeat.
- Both surfaces read and write the **same** `state.dials[id].step` counter, so completing
  a step from either place advances the one chain. See *How the two surfaces relate* above.

### 2. Reset — `resets: [ids]`

Marking a task done also refills the listed tasks. Prevents redundant nagging: after a
deep clean you shouldn't be prompted to do the weekly clean the next day. Cheap,
high-value, no new UI.

### 3. Gate — `requires: [ids]`

A task stays dormant (dim, non-glowing, labelled "after eye exam") until its
prerequisites are **fresh** — i.e. the required task's ring isn't itself empty. When the
prerequisite is done, the gated task unlocks and behaves per its own tier. A dormant task
never nags; that's how ordering coexists with no-penalty.

### 4. Offer — `onDoneOffer: [suggestions]`

Some cascades depend on a judgment the app can't make (did the physical flag anything?).
On completing such a task, surface a small, **dismissable** prompt: "Add a follow-up?"
with suggested one-offs. The user keeps the ones they need and ignores the rest. Spawned
follow-ups are opt-in, so they never create a backlog you didn't choose — which is the
line that keeps this inside the no-penalty rule.

## Data model

```ts
interface Task {
  // ...existing + tier fields
  chain?: ChainStep[];     // ordered; only the active step renders
  resets?: string[];       // ids this refills when marked done
  requires?: string[];     // ids that must be "fresh" before this is eligible
  onDoneOffer?: FollowUp[]; // optional one-offs offered on completion
  once?: boolean;          // retire on completion instead of recharging
}

interface ChainStep {
  label: string;
  m?: number;              // 0–11 month anchor for the calendar; omit → On repeat only
  hard?: boolean;          // this step is a true cliff (e.g. file 8606 by Apr 15)
  tier?: Tier;
  // progress is not stored per-step; the chain's active step = state.dials[id].step
}

interface FollowUp {
  label: string;
  interval?: number;       // omit → one-shot "do once" task (once:true)
  tier?: Tier;
  area?: string;
  icon?: string;
}
```

Freshness for a gate: a required task counts as fresh while `daysSince(lastDone) <
interval` (its own ring isn't empty), unless a task specifies `requireWithin` days. For a
date-anchored prerequisite, "fresh" means checked off for the current year.

## Worked examples

- **Backdoor Roth (recurring, cross-surface chain):**
  `chain: [ {contribute, m:0}, {convert, m:0}, {file 8606, m:3, hard:true} ]`,
  `interval: 365`, `tier: need`. On repeat shows one advancing card. The calendar shows
  "Contribute" and "Convert" in January (Convert locked until Contribute is done) and
  "File Form 8606" in April as a hard deadline (locked until Convert is done). Completing
  the last step puts the whole chain on a yearly cooldown; it re-arms next January. The
  standalone January calendar reminder it replaced is tagged `owner:'roth'`, so nothing
  duplicates.
- **Deep-clean bathroom (reset):** `resets: ['bathroom']`. Doing it refills the weekly clean.
- **Full bike service (reset):** `resets: ['bikeclean']`.
- **New glasses (gate):** `requires: ['eye']`. Dormant until the eye exam is fresh, then
  it unlocks and behaves normally.
- **Annual physical (offer):** `onDoneOffer: [ {book specialist, once}, {redo bloodwork, interval:90} ]`.
  Completing the physical asks whether to add either; you keep what's relevant.

## Alternatives considered

- **Full dependency DAG / project-management view.** Rejected. It betrays the calm ethos,
  imposes real setup and cognitive cost, and is overkill for personal admin. The four
  lightweight relations cover the real cases without a graph editor.
- **Checklist-inside-every-card.** Rejected as the general model. Fine for a tight
  same-sitting sequence, but it hides the calendar spread of steps that happen weeks apart
  (Roth), and it turns one calm ring into a to-do list. Chains-with-JIT-reveal keep the
  one-thing-at-a-time feel.
- **Auto-spawning follow-ups (no dismiss).** Rejected. Auto-created tasks you didn't
  choose are exactly the backlog/guilt the app exists to avoid. Spawns must be opt-in.

## Open questions

- Recurring chains: does finishing the last step start a single whole-chain cooldown, or
  does each step keep its own interval? (Shipped v1: whole-chain cooldown.)
- Conditional-spawn UI: an inline prompt at completion, or a small "loose ends" tray that
  collects offered follow-ups? (Shipped v1: inline prompt at completion.)
- Should chains ever branch, or stay strictly linear in v1? (Shipped v1: linear.)
- Are cross-surface chains (a step in the calendar, a step in On repeat) worth supporting,
  or should a chain live entirely in one surface? **(Shipped: chains are cross-surface —
  one collapsed card in On repeat, steps placed by month on the calendar, one shared
  `step` counter. Steps without an `m` anchor appear only in On repeat. Single-ownership
  (`owner`) prevents any duplicate calendar card.)**

---

# How priority and cascades compose

They're orthogonal and reinforce each other:

- A **chain step** carries its own tier, so "file Form 8606" warms early as a Need while
  "try a new recipe" never glows.
- A **gated** task inherits the priority behaviour the moment it unlocks.
- The **"Needs attention" strip** naturally surfaces the *currently active* step of any
  Need-tier chain, and hard-deadline chain steps as their window closes.

So the two features share one vocabulary: *cost of skipping* drives urgency; *cascade
links* drive what's eligible to be urgent right now.

---

# Decisions (log)

**Priority is modelled as cost-of-skipping, in three named tiers.**
- *Why:* it's the only framing that's both actionable and able to unify ordinary priority
  with the hard-deadline exception. Named tiers stay legible; numbers/ranking don't.
- *Assumptions that could invalidate:* if in practice almost everything lands in one tier,
  the tiers add ceremony without signal — revisit as two tiers.

**Cascades are four light relations (chain / reset / gate / offer), not a DAG.**
- *Why:* covers the real cases while preserving "one card = one actionable thing" and
  zero manufactured backlog.
- *Assumptions that could invalidate:* if real usage needs branching or many-to-many
  prerequisites often, the light model will strain and a proper graph may be warranted.

**One honest exception to no-penalty: true calendar cliffs feel urgent.**
- *Why:* hiding a real, irreversible deadline would harm the user; calm is for laundry,
  not for the 401k window.
- *Assumptions that could invalidate:* if urgency here starts bleeding stress into the
  rest of the app, tighten it to a distinct, contained treatment.

**Priority is derived from id-sets and tier, not hand-tagged on 84 rows.**
- *Why:* keeps the low-setup-burden principle. Needs/Wants ship as small curated sets;
  everything else is Upkeep by default. Per-task override lives in the `⋯` sheet.
- *Assumptions that could invalidate:* if users want to re-tier many tasks, promote tier
  to a first-class stored field on every dial.

---

# Future discussions / backlog

Captured so they aren't lost; not scoped here.

- **Reminders / notifications.** None today, by design. If added: opt-in, digest-style
  (a weekly "here's what's warming up"), never per-task pings.
- **Multi-device sync.** Today: `localStorage` + JSON export/import, hostable on gan.report.
  Later: a thin sync layer or file-based sync so state follows across devices.
- **Calendar integration.** Push hard-deadline items to Google Calendar; optionally read a
  "done" signal back.
- **Obsidian / vault integration.** Log completions to the vault; fits the existing
  "package this up" workflow and gan.report publishing.
- **Seasonal / context awareness.** Don't surface "clean the windows" in a Seattle
  January; shift some intervals by season.
- **Snooze without penalty.** An explicit "not now" that quiets one item for N days —
  distinct from skipping, and still guilt-free.
- **Gentle history.** Optional, no streaks and no guilt: "you've done this ~N times this
  year." Must not reintroduce the failure states the app removes.
- **Batching / body-doubling.** Group tasks you tend to do together (a "Sunday reset," an
  "errands" run) so they surface as one sitting.
- **Date-anchored one-offs.** Birthdays, renewals, passport expiry — yearly-recurring but
  pinned to a date rather than an interval. *(Partially shipped: the date-recharge mode
  covers yearly-recurring date anchors; true one-shots ride the `once` flag.)*
- **Benefits-portal verification.** A recurring nudge to confirm the Google-specific
  numbers (match %, reimbursements, exact deadlines), since those change and the app's
  defaults can't be trusted blind.
- **Shareable configs / personas.** Export a starter set someone else can import.
