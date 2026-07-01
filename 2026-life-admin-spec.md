---
date: 2026-07-01
model: Claude Opus 4.8
tags: [the-year, life-admin, product-spec, design-doc, scope, ux, cooldown-timer]
summary: "Design record and scope for The Year — a calm single-page dashboard for recurring personal upkeep: recharge models, two surfaces, priority tiers, cascades, undo, and what's deliberately out of scope"
status: living — reflects the shipped build
---

# The Year — Design & Scope

*The Year* is a single-page, offline-first life-admin dashboard. Everything you maintain on
a repeat is a **ring card**: the ring drains over time and refills when you tap it done.
Nothing goes overdue, nothing accrues a backlog, and skipping costs nothing.

This document is the **living design record of what's built** — not a proposal. Where a
feature was once "planned," it is described in the present tense because it shipped. The
one place the build deliberately stretched the original scope (cascades and
date-anchoring) is called out honestly in *Scope → The extensions that stretched scope*.

---

# Scope

## Problem

Recurring personal maintenance — checkups, cleaning, grooming, money reviews, fitness,
staying in touch — is easy to lose track of, and normal task tools make it worse by adding
guilt, backlog, and notification noise. Miss a recurring to-do and it turns red, stacks up
"missed" instances, breaks a streak, and pings you until you avoid the app entirely.

**The Year solves the orientation and emotional problem of recurring upkeep — "what am I
maintaining, and roughly where do I stand?" — not the work of doing any of it.** It is a
calm dashboard where every task shows how long since (or until) it's due, and the only
interaction is a one-tap log that you did it.

## What it is

A tuneable board of recharge-based tasks, grouped by life area, plus a calendar-year view
of the time-anchored ones. Each task is a ring that drains and refills when you tap it
done. Nothing ever goes overdue, nothing accrues a backlog, and skipping costs nothing. It
is a **mental model you glance at**, not a system of record you're accountable to.

## The core model (invariants — do not break)

- **State is a pure function of the recharge inputs.** A rhythm's state derives from
  `last done + interval`; a calendar task's from `target date + doneYear`. There is no
  stored "overdue," no accrued backlog, no phantom missed occurrences.
- **One primary action per card: tap = done.** The ring refills and drains again. Rare
  edits (interval/date, back-date, priority, remove) live one layer down in the `⋯` sheet.
- **No penalty, ever.** A drained ring never turns red, never counts misses, never breaks
  a streak. An empty ring is an invitation, not a debt.
- **No notifications.** A passive dashboard you choose to look at, never a nag.
- **Recharge-based, not one-off.** Everything recurs — on a rolling interval, or toward a
  date each year. Pure one-shots don't belong here at all.
- **Priority changes lead time and prominence, never loudness.** Higher-stakes tasks
  surface earlier and more visibly; they never shout.

## In scope (all shipped unless noted)

- Recurring, elapsed-time tasks ("rhythms") grouped into 12 life areas.
- Calendar-anchored tasks that recharge *toward a date each year* (tax and benefits
  windows, seasonal work), shown both on a month timeline and mixed into their area.
  *(This grew from the originally-scoped "narrow reference ribbon" into a full second
  surface with a real date-recharge model — see below.)*
- One-tap logging, with **undo** for the mis-tap — the one silent, destructive, in-app
  error.
- Add / edit / remove any card; editable intervals and due dates; back-date via `⋯`. One
  edit sheet, identical across every task type.
- Priority tiers — **need / upkeep / want**, by *cost of skipping* — driving lead time,
  a "Needs attention" strip, and sort order.
- A live **summary snapshot** on the On-repeat tab (counts by ring state + "done today").
  A snapshot, not history — see the streaks row in *Out of scope*.
- **Cascades** — chain / reset / gate (see below). Shipped as three light relations,
  not a dependency graph, and authorable in the Add/Edit sheet.
- Local persistence (`localStorage`) + JSON export/import; optional lightweight sync later
  (e.g. a Cloudflare Worker acting as a load/save adapter behind export/import).

## Out of scope, and why

| Rejected | Why |
|---|---|
| **Execution help** (portal links, checklists, holding docs) | The tool logs and orients; it does not do the work. Adding "doing" explodes scope and turns a dashboard into a workflow tool — optimizing the hard 95% is a different product. |
| **Pure one-off / non-recurring tasks** | No recharge → no state in the cooldown model. One-offs want deadlines and nagging, which drag the calm board back into a to-do list. They belong in existing capture (Obsidian, Reminders). |
| **Day-precision alerting** (bill/renewal/birthday pings, "3 days left") | The app date-*anchors* recharge (the ring empties toward a date, calmly, no alert) but will not *alert* on day-precision deadlines. That's the notification behaviour it deliberately won't build; a calendar app does it better. |
| **Seasonality / condition-based intervals** | The real cue (weather, an event, guests coming) is a condition the app can't see. Modeling it means modeling the world; out. |
| **Notifications / reminders** | Deliberately none. Solving notification fatigue by not participating. This also defines the user (below). |
| **Auto interval calibration** (Anki/FSRS-style) | Overengineering for ~100 hand-tuned cards. Manual `⋯` edit *is* the calibration loop; the annoyance is the signal. |
| **Bulk-edit / onboarding UI** | The data is trivial JSON. Seeding, retagging, and generating a starter set are an LLM prompt, not a feature. |
| **Load-leveling / anti-bunching** | Coincidental pile-ups are livable and hand-fixable by staggering seeds. Algorithmic spreading is complexity for a non-problem at this scale. |
| **Per-category ranking / numeric priority** | Can't express cross-bucket priority and invites fiddling. Three named tiers replace it. |
| **Streaks / rich history / trends** | Streak mechanics cause the guilt death-spiral the app exists to remove. Keep only current state. (The On-repeat stat row is a *live snapshot* — counts right now, plus a light "done today" — not a retained history or streak.) |
| **Multi-person / shared / delegated cards** | Solo tool by design. |

## The extensions that stretched the original scope

Two things in the shipped build go beyond the strict "calm, recurring-only board" the
scope originally described. Both were deliberate, and both were kept inside the invariants:

- **Cascades** (chain / reset / gate). Sequencing and dependencies pull toward a task
  manager. Shipped anyway, because a few real jobs genuinely have shape (the backdoor Roth
  is a sequence; a deep clean subsumes the weekly one). Contained by modeling the *three
  lightest relations* rather than a graph, and by holding the line that no cascade ever
  manufactures backlog or a nag. A fourth (*Offer*) was built and then cut for crossing
  that line — the pruning this row warns to keep doing.
- **Date-anchored recharge.** The calendar windows needed a notion of "due around a date,"
  which a pure elapsed-time model can't express. Shipped as a second *recharge mode*
  (fills toward a date, empties over ~120 days, resets Jan 1) — still calm, still no
  alerts, still a ring. It stayed within the model rather than becoming a calendar app.

## Scoping principle

**A problem is only in scope if it's a problem for *this* user, given the tools they
already have.** Many "problems" of recurring-task apps (setup UI, calibration, bulk edit,
portability) evaporate because the user has an LLM, is fluent in the JSON data model, and
will open the `⋯` sheet. Score against this user, not a generic one. Most rejections above
follow from this.

## Who it's for

Someone already inclined to glance at a dashboard and tune a system — not someone whose
deficit is "I forget these categories exist." The no-notification stance is a deliberate
choice of *calm over prompting*: the tool serves the already-organized and does not try to
rescue the unorganized. That trade is intentional.

## One-line summary

> A calm, single-page dashboard of recurring personal upkeep, where the only action is a
> one-tap "done." It answers *where do I stand* on the things I maintain — and deliberately
> refuses to help me *do* them, remind me, or track anything that happens only once.

---

# How it works

## Two recharge models, one card

Every task is the same ring card; a ring drains in one of two ways:

- **Interval (rolling cooldown).** `reserve = 1 − daysSince(lastDone) / interval`, clamped
  to `[0,1]`. Tapping done resets `lastDone` to today. The default for the recurring
  rhythms.
- **Date (calendar-anchored).** The ring recharges *toward a fixed date each year*: full
  when far off, emptying over the final ~120 days (`DATE_WINDOW`), "now" at the date,
  "done" once checked, resetting automatically in January. Used by the calendar-year jobs,
  and available to any task the user creates ("By a date" in the Add sheet).

Both modes share one colour/urgency scale — teal (`patina`, charged) → gold (`brass`,
getting low) → amber (`ember`, ready). Ready cards glow and breathe; reduced-motion is
respected.

## Two surfaces — On repeat and the calendar year

- **On repeat** — every task, grouped into 12 areas (Health, Fitness, Nutrition, Mind,
  Grooming, Home, Money, Career, Gear, People, Craft, Rest), with a summary stat row on
  top.
- **The calendar year** — a horizontal month strip; the date-anchored jobs laid out in the
  month they fall due, with a "% through the year" progress bar and a now-marker.

Calendar jobs appear in **both** surfaces (their month on the calendar; mixed into their
area under On repeat). Completion is shared state, so checking a job off in one place
reflects instantly in the other.

## How recurring and calendar tasks relate

They are the **same card and the same idea** (a ring that discharges and recharges), split
only by *what drives the recharge*: relative time vs absolute time.

| | **Recurring** (interval) | **Calendar** (date-anchored) |
|---|---|---|
| Recharge measured… | from the last time you did it | toward a fixed point in the year |
| The clock… | **floats** — resets when you act | **is pinned** — resets Jan 1 |
| "Done" means | did it now; do it again in `interval` days | handled this year; back next year |
| Times per year | as many as you complete it | once per anchor |
| Good for | upkeep where only elapsed time matters | jobs tied to a moment (deadlines, windows) |

**What they share.** Both `DEFAULT_DIALS` (recurring) and `DEFAULT_DATED` (calendar) use
the same authored envelope keys (`id, area, label, icon`) plus their mode-specific fields
(`interval`/`seed` vs `dueM`/`dueD`/`note`), normalised through one `allDials()`. From
there: one ring card, one tap-to-complete gesture, one edit sheet, one colour scale, and
one priority layer.

**How to tell which a task is.** Ask whether *missing a specific date* is the point. Tied
to a calendar moment (the 401k window, the FSA expiry) → calendar. Only *time since last*
matters → recurring. The Add sheet makes this the one real choice ("Every N days" / "By a
date").

The two models are deliberately **not** merged. Forcing a haircut onto a fixed date would
invent pressure; floating a tax deadline would hide a real cliff.

## One card, one edit sheet

Tapping a card's face = done. The `⋯` opens the detail/adjust sheet, which is **identical
across all task types** — interval, date, and chain — with these sections in order:

1. a **how-to note** (from the task's own `note` for calendar items, or a `NOTES` map for
   rhythms — a plain-language "how to accomplish this");
2. a **recharge control** — the one thing that differs: interval → days + presets; date →
   a date picker; chain → whole-chain interval (plus a read-only step list);
3. a **priority** tier selector;
4. actions: **Remove / Save / Done**.

A chain's Done button reads "Do this step" and advances the same counter its card uses; a
completed chain shows a disabled "Recharging…". There is no bespoke per-type sheet.

## One-tap done, with undo

The whole card face is the done button — the common gesture is completion, and detail is
one layer down. Because a mis-tap is the one silent, destructive, in-app error, every
completion snapshots state first and offers **Undo** in the toast (single-level). Undo
restores every completion type — interval (`last`), calendar (`doneYear`), chain (`step`),
and reset side-effects (undoing a deep-clean un-refills the weekly task it reset).

## Summary stats (On repeat)

A stat row at the top of On repeat, tied to the ring colours and recomputed every render:
**Ready now** (glowing), **Getting low** (brass band), **Charged** (patina), and **Done
today** (a light momentum count). It's a live snapshot — no history, no streaks.

## Persistence & portability

State lives in `localStorage` (key `theyear.v5`), with JSON **Export/Import** for backup
and for moving to a hosted copy. No account, no network, no telemetry — fully local today.
With the optional **Sync** turned on, `localStorage` becomes a write-through cache and the
truth lives in a private Google Sheet; with Sync off it's the local source of truth. See
*Sync & persistence*. Defaults ship pre-seeded so the board looks lived-in on first open.

## Data model (storage shapes)

Runtime dials are a discriminated union on `mode`; per-task mutable state lives in
`state.dials[id]`, shaped by kind:

```ts
type Tier = 'need' | 'upkeep' | 'want';

// authored (same envelope for both source arrays)
interface Seed {
  id: string; area: string; label: string; icon: string;
  mode?: 'interval' | 'date';        // absent ⇒ interval
  interval?: number; seed?: number;  // interval mode
  dueM?: number; dueD?: number; hard?: boolean; note?: string; tags?: string[]; // date mode
  tier?: Tier;                       // else derived from id-sets
  chain?: ChainStep[]; resets?: string[]; requires?: string[];
}

// stored per task (state.dials[id])
type Stored =
  | { last: string; interval: number; tier?: Tier }   // interval
  | { doneYear?: number; dueM?: number; dueD?: number; tier?: Tier }  // date (overrides + done)
  | { step: number; last: string | null };            // chain progress
```

Plus `state.custom[]` (user-made dials), `state.removed[]` (hidden defaults), and
`state.ui` (active tab).

---

# Priority — cost of skipping

## The real axis, and three tiers

"Importance" is too abstract; **cost of skipping** is what actually separates the 401k from
supplements. Modeled as three named tiers:

| Tier | Cost of skipping | Examples |
|---|---|---|
| **Need** | High / often irreversible | 401k, taxes, physical, dental, backups |
| **Upkeep** | Low / recoverable | cleaning, haircut, budget review, supplements |
| **Want** | None | try a recipe, tea session, reading |

Most of the ~100 tasks are Upkeep. Tiers ship **derived from id-sets** (small curated Need
and Want sets; everything else Upkeep; calendar tasks default Need), overridable per task
in the `⋯` sheet. This keeps setup burden near zero.

## Lead time and prominence, not loudness

Priority changes *when* and *how visibly* a task surfaces — never how hard it nags.

- **Needs warm up early.** A Need glows before it's strictly due (`leadDays` ahead:
  ~15% of the interval, clamped 7–60 days; ~45 days for date-anchored Needs).
- **Upkeep nudges at due** (glows when the ring empties).
- **Wants stay calm** — rendered dimmer, never glow, never scolded.

## Needs-attention strip

A strip above the tabs: the honest shortlist of **Needs that are due or warming**, plus any
hard-deadline calendar item whose window is closing. The "don't let these slip" view versus
the full board. Tapping an item opens its sheet.

## Sort

Within any group: glowing Needs float to the top, Wants sink, dormant (gated) and done
items sink to the bottom.

## Hard deadlines — the one honest exception to no-penalty

Calm is for laundry, not for a real cliff. Calendar items with a true expiry (tax filing
Apr 15, open enrollment, FSA spend-down and mega-backdoor true-up on Dec 31) get genuine
urgency — a real "closes in N days" countdown and an earlier warm — instead of the calm
"any time now." Surfacing a real, irreversible deadline serves the user; it isn't a nag.

## Data model

```ts
interface Task {
  // ...id, area, label, icon, mode, interval|dueM/dueD
  tier: Tier;                 // ships derived; override in ⋯
  leadDays?: number;          // else derived from tier + interval
  hard?: boolean;             // real calendar cliff (date tasks)
}
```

## Alternatives considered

- **Per-category drag-ranking** — can't express that the 401k beats *everything* in Home.
- **Binary need/want** — throws away the middle, where most tasks live.
- **Numeric priority (1–5)** — false precision, invites fiddling. Three named tiers win.

---

# Cascades — three light relations

"Tasks cascade" is really three distinct relationships. Naming them is most of the design;
each is modeled with the lightest thing that fits, and they compose. A dependency graph was
rejected as betraying the calm, recurring-only core. (A fourth, *Offer* — a prompt to spawn
a follow-up on completion — was built and then removed: it was the only relation that
interrupted with a modal, and the only source of one-off tasks, so it fought the
calm/recurring core it was bolted onto. See *Alternatives considered*.)

| Shape | Meaning | Example |
|---|---|---|
| **Chain** | one job that walks through ordered steps | backdoor Roth: contribute → convert → file 8606 |
| **Reset** | doing the big one refills the small one | deep-clean bathroom refills the weekly clean |
| **Gate** | B is dormant until A is *fresh* | order glasses — dormant until the eye exam is done |

## Chains — one advancing card, optionally cross-surface

A chain is **one card**, not N. It shows only the active step plus a step pip row; tapping
advances it — same tap, same refill. Completing the last step puts the chain on a
whole-chain cooldown, re-arming step 1 after `interval`.

Chains are **cross-surface**: a step carrying a month anchor (`m`) also appears in that
month on the calendar, **locked until the prior step is done** — a chain on the calendar is
a series of gates along the timeline. Both surfaces drive the same `state.dials[id].step`
counter. Steps with no `m` appear only in On repeat. There is no separate calendar card for
a chained task — the steps *are* its calendar presence, which is why nothing duplicates.

## Reset / Gate

- **Reset** — `resets: [ids]`: marking done also refills the listed tasks. No new card UI.
- **Gate** — `requires: [ids]`: a task stays dormant (dim, non-glowing, "after eye exam")
  until its prerequisites are *fresh* (their own ring isn't empty), then behaves per its
  tier. A dormant task never nags — that's how ordering coexists with no-penalty.

## Data model

```ts
interface Task {
  chain?: ChainStep[];      // ordered; only the active step renders as a card
  resets?: string[];        // ids refilled on completion
  requires?: string[];      // ids that must be "fresh" before this is eligible
}
interface ChainStep { label: string; m?: number; hard?: boolean; tier?: Tier; }
```

Freshness for a gate: a required task is fresh while `daysSince(lastDone) < interval` (a
date prerequisite while it's checked off for the year; a chain while completed).

## Worked examples

- **Backdoor Roth (recurring, cross-surface chain):**
  `chain: [ {contribute, m:0}, {convert, m:0}, {file 8606, m:3, hard:true} ]`, `interval:
  365`, `tier: need`. One advancing card in On repeat; on the calendar, "Contribute" and
  "Convert" in January (Convert locked until Contribute) and "File 8606" in April as a hard
  deadline. The chain is the task's only calendar presence — no separate reminder, nothing
  duplicates. Completing the last step re-arms the chain next January.
- **Deep-clean / full bike service (reset):** `resets: ['bathroom']` / `resets:
  ['bikeclean']` refill the weekly versions.
- **New glasses (gate):** `requires: ['eye']` — dormant until the eye exam is fresh.

## Alternatives considered

- **Full dependency DAG / PM view** — betrays the calm ethos, imposes setup cost; the three
  light relations cover the real cases without a graph editor.
- **Checklist inside every card** — hides the calendar spread of steps weeks apart and
  turns a calm ring into a to-do list. Chains-with-just-in-time-reveal keep one-thing-at-a-time.
- **Conditional-spawn follow-ups (the old *Offer* relation)** — built, then removed. It was
  the only relation that interrupted (a modal at completion) and the only source of one-off
  tasks. Its whole value was reminding you at the right moment — the notification behaviour
  the app refuses — and this user can just add the follow-up themselves. Cutting it also
  deleted the `once` flag and restored a clean "everything recharges" invariant.

---

# How priority and cascades compose

They're orthogonal and reinforce each other:

- A **chain step** carries its own tier, so "file Form 8606" warms early as a Need while
  "try a new recipe" never glows.
- A **gated** task inherits its priority behaviour the moment it unlocks.
- The **Needs-attention strip** surfaces the currently-active step of any Need-tier chain,
  and hard-deadline steps as their window closes.

One vocabulary: *cost of skipping* drives urgency; *cascade links* drive what's eligible to
be urgent right now.

---

# Decisions (log)

**Priority is cost-of-skipping, in three derived tiers.** The only framing that unifies
ordinary priority with the hard-deadline exception; named tiers stay legible where
numbers/ranking don't. *Revisit if almost everything lands in one tier.*

**Cascades are three light relations, not a DAG.** Covers the real cases while preserving
"one card = one actionable thing" and zero manufactured backlog. *Revisit if real usage
needs branching or many-to-many prerequisites.*

**One honest exception to no-penalty: true calendar cliffs feel urgent.** Hiding a real,
irreversible deadline would harm the user. *Tighten if urgency bleeds stress into the rest.*

**Two recharge models, kept separate.** Relative time for upkeep, absolute for deadlines;
merging either way would break one of them.

**One unified dial shape and one edit sheet.** Both source arrays share an envelope;
interval/date/chain edit through the same scaffold. Keeps the model legible and the UI
consistent.

**Single-level undo on completions.** The mis-tap is the only silent destructive in-app
action, so it — and only it — gets an explicit reversal.

---

# Still open / to tune

- The `leadDays` curve (proportional vs fixed steps per interval band) is a guess worth
  tuning against real use.
- On seed data at mid-year, the On-repeat "Getting low" count dominates (most seeded dates
  sit deep in their intervals). Cosmetic; either soften seeds or tighten the bucket.
- Whether the Needs strip should ever include *badly* overdue Upkeep, not just Needs +
  hard deadlines. (Currently: strictly Needs + hard deadlines.)
- **Gate cycle guard.** The `requires` picker only excludes self today; a hand-built loop
  (A requires B, B requires A) would leave both cards permanently dormant. Add cycle
  detection (or a save-time warning) so a gate can't create an unresolvable deadlock.

---

# Sync & persistence

**Status: shipped.** The client adapter, Sync settings modal, flush-on-unload, and gated
first-connect are built; the Apps Script backend ships as `2026-life-admin-sync.gs`. The
only manual step is the one-time Google setup (create a Sheet, paste the script, deploy it
as a Web App). Supersedes the old "Cloudflare Worker adapter" backlog note.

## The problem

`localStorage` is a cache masquerading as a source of truth: browser-scoped, wiped by
"clear browsing data," evicted under storage pressure, empty in private windows, per-origin.
The fix isn't a better local store — it's to **demote `localStorage` to a cache and put the
truth in a durable store you can inspect and back up.** Target: a truth that (1) survives a
browser wipe, (2) follows you across devices, (3) is readable *without the app existing*,
and (4) doesn't break the local-first, offline, no-friction feel.

## Invariants this must not break

- **Local-first / offline.** Sync is additive; off or unreachable → everything still works.
- **Losing `localStorage` is a non-event.** With no cache, the app re-hydrates from the
  truth on next load. The truth is never `localStorage`.
- **The UI never waits on the network.** Reads instant from cache; writes go local first,
  push after.
- **Config is not data.** Connection settings live under their own key (`theyear.sync`);
  losing them is harmless — re-enter, your log is untouched.

## Approach: a private Google Sheet behind an Apps Script Web App

A private Sheet is the truth; a bound Apps Script (`doGet` returns state, `doPost` writes
it), published as a Web App, exposes a URL the app calls — the app never handles a Google
credential. Chosen over alternatives because the truth is **human-legible**, needs **no
per-device login** (the script runs as you), lives in an ecosystem already in use, is ~20
lines to stand up, and gets **version history for free**. Fallbacks if it sours:
GitHub-repo-via-Worker (git as truth, more plumbing, a JSON blob) or a File System Access
API file in a synced folder (no backend, desktop-Chrome only). `IndexedDB` is rejected —
same trust class as `localStorage`.

## Architecture: write-through cache + debounce + flush

- **Read** cache-first (instant); if empty, pull from the Sheet and populate.
- **Write** to cache immediately (instant UI), then debounce ~2s and push the whole state
  in one call.
- **One adapter module** is the only code that knows the store is a Sheet; swapping stores
  later rewrites only the adapter.
- **[fix — durability] Flush on the way out.** A debounced fire-and-forget push can
  *silently drop the most recent change* — tap once and close the tab before the timer
  fires, or a failed push with no later change to "retry on." So flush the pending push on
  `visibilitychange`/`pagehide`, and retry failed pushes on a timer, not only "on next
  change." Losing the last write is the one unacceptable failure for a source of truth.

## Auth & security

- **One-time setup:** you grant the script permission to edit the Sheet (one Google consent,
  in your browser); thereafter it runs *as you*, holding that permission server-side. Deploy
  as **"execute as: me" + "access: anyone"** — that's what makes it login-free. ("Execute
  as: user" forces a Google login on every caller; the token'd URL is the right default for
  a solo tool.)
- **The URL + token is a bearer credential** — whoever holds it can read/write that one
  Sheet, as you. **Blast radius is contained** to the bound Sheet: a leak is "one
  recoverable spreadsheet," not your account, Drive, or Gmail.
- **Mitigations, cheapest first:** (1) a **token check in the script** (~5 lines) turns "URL
  is the key" into "URL + secret"; (2) **never hardcode URL+token in published source**
  (view-source hands out write access) — enter once per device, keep in `localStorage`, out
  of shipped JS; (3) keep the script scoped to the one Sheet.
- **Pattern-of-life caveat.** A full log of when you're at the gym, out of town, or at
  appointments is worth more than any single row. "Low sensitivity" is your call; if it
  bothers you, drop the bearer-URL mode and pay the login-per-device tax for real auth.

## Data model & schema — updated to the current v5 state

The draft's schema (`id | interval | lastDone | tier` rows + a `timeline` blob) is **stale**:
v5 dropped `timeline` (date done-state moved to `state.dials[id].doneYear`), and
`state.dials[id]` is now a discriminated union — `{last, interval, tier}` (interval),
`{doneYear, dueM, dueD, tier}` (date), `{step, last}` (chain) — plus `mode` / `chain` /
`resets` / `requires` overrides, `state.custom[]`, `state.removed[]`, and `state.ui`. A flat
task row can no longer represent all of that.

- **[fix — schema] Blob-as-truth, rows-as-projection.** Instead of "rows are the truth and
  the script reconstructs nested state" (lossy against the discriminated shapes), make the
  **canonical JSON blob the truth** (one cell / a hidden tab — lossless), and have the
  script *also* regenerate a **read-only human view tab** (`label | area | last done | due /
  done-this-year | tier`) that's never read back. Keeps the eyeball-the-log legibility with
  zero reconstruction risk. (If the log stays row-authoritative instead, it must carry every
  field above or silently lose date due-dates, chain progress, and mode/link overrides.)
- **Config** (`theyear.sync`): `{ url, token, lastSync }`.

## First connect & multi-device merge

- **[fix — first-connect] Gate the first push.** The app seeds ~100 defaults into
  `localStorage` on first boot, so a fresh device is never "empty." Connect must
  **pull-and-adopt before it may push**, or a fresh device's seeded defaults clobber the
  Sheet (re-adding tasks you'd removed elsewhere). First connect: Sheet empty → seed from
  this device; Sheet has data → adopt it; don't enable the debounced push until that
  resolves.
- **Steady state:** push local → Sheet on change (debounced + flushed); pull on load. Once
  multi-device, boot-pull must **reconcile, not blindly replace** — a hard `state = remote`
  can drop a tap made between boot and pull completing.
- **Merge: whole-blob last-writer-wins (shipped) → per-task (deferred).** v1 stamps a single
  global `state.updatedAt` on every local change; on connect, newer-wins between local and
  the Sheet, with a first-connect override that always adopts a non-empty Sheet (so a fresh
  device's seeded defaults can't clobber it). Correct for single-device and coarse for
  multi-device. The finer fix — a per-task `updatedAt` plus **tombstones** for removals so a
  stale device can't resurrect a delete — is deferred until two devices are genuinely in use
  (field-level LWW on `lastDone` alone would silently lose edits, un-dones and removals).

## The implementation gotcha that will bite

**CORS.** Don't set `Content-Type: application/json` on the POST — a plain-string body sends
as `text/plain`, which skips the preflight Apps Script can't answer. Put the token *in the
body* (`e.postData.contents`); `doGet` reads it from `e.parameter.token`. Get this wrong and
every write fails silently. (Full Apps Script / client-adapter sketches omitted here; the
load-bearing detail is this gotcha plus the debounce + flush.)

## UI

Reuse the existing bottom-sheet component: a **Sync** button beside Add / Export / Import
opens a modal with a status subtitle ("Not connected — data stays on this device only" /
"Connected"), the Apps Script URL, a masked token (show/hide), and **Test / Save**
(+ **Disconnect**). Test does a live GET; Save stores config and kicks off the gated first
connect.

## Decisions

**Truth = a Google Sheet via an Apps Script Web App; `localStorage` = write-through cache.**
Legible, inspectable, in-ecosystem, login-free at runtime, ~20 lines, versioned for free.
*Invalidated if:* you go seriously multi-device (whole-blob LWW strains — need per-task
`updatedAt`) or the pattern-of-life sensitivity matters (bearer-URL is the wrong dial).

**Bearer-token URL over per-device OAuth.** One setup grant vs a login on every device.
*Invalidated if:* the URL+token ends up in public source — then it isn't a secret and the
model collapses.

## Open questions

- Merge now or later (add `updatedAt` up front, defer the merge logic).
- Schema versioning — blob-as-truth makes a new field a client-only migration, part of why
  it's preferable.
- Conflict UX — silent LWW vs "this device is behind." Probably silent, per the calm ethos.
- Backup-of-the-backup — is Sheet version history enough, or also keep periodic JSON export?

---

# Backlog (explored, not built)

- **Per-task merge for sync** — sync itself shipped (see *Sync & persistence*); the
  remaining piece is finer-grained conflict handling (per-task `updatedAt` + removal
  tombstones), deferred until two devices are genuinely in use.
- **Snooze without penalty** — an explicit "not now" that quiets one item for N days,
  distinct from skipping and still guilt-free.
- **Calendar / vault integration** — optionally mirror hard-deadline items to a real
  calendar, or log completions to an Obsidian vault. Kept at arm's length so the app stays
  a dashboard, not an integration hub.
- **Shareable starter configs** — export a starter set someone else can import (the export
  format already makes this nearly free).
