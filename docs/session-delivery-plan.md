# Session delivery plan — DRAFT FOR REVIEW

Three things are now being sold that involve a live human on a call. None of
them have any scheduling, notification, or hosting mechanism in the app today.

| Product | Promise | Who gets it |
|---|---|---|
| Course (£100 one-off) | 4 live **group** calls, one a week for 4 weeks | Course buyers |
| Coaching (£50/month) | 4 **private** 1-on-1 sessions a month | Coaching subscribers |
| Coaching (£50/month) | A seat in **every live trading session** that month | Coaching subscribers |

This document proposes how each actually runs. Nothing here is built yet.

---

## The hard problem: course buyers arrive on different days

If Alice buys on the 1st and Bob buys on the 20th, "4 weekly calls" means two
different date ranges. Tracking a personal 4-week window per buyer means
per-user scheduling, reminders, and make-up sessions for anyone who misses one.
That is a real scheduling product and it is not worth building yet.

**Proposed instead — a standing weekly group call on a 4-week content rotation.**

- Same slot every week, e.g. **Wednesdays 19:00 UK**.
- Content rotates on a 4-week cycle: Week A, B, C, D, then repeats.
- Any course buyer may attend any call while their entitlement is active.
- A buyer who joins mid-cycle still sees all four topics within a month.

Why this is better than per-buyer windows:
- One calendar entry to run, forever. No per-user tracking.
- Missing a week is self-healing — the topic comes round again.
- Scales identically at 5 buyers or 500.

**Decision needed:** do you accept the standing-slot model, and what day/time?

---

## 1. Course group calls

**Minimum viable (recommended for launch)**

- One recurring Zoom/Meet link, reused every week. Never changes.
- Link is shown on the course page **only to buyers** (`coursePurchased = true`).
- A reminder email goes out to all course buyers ~2 hours before each call.
- No RSVP, no attendance tracking, no recording pipeline.

**Build required:** small.
- `AdminSetting` row holding `{ groupCallUrl, dayOfWeek, timeUtc, nextTopic }`.
- A card on `/course` visible to buyers with the link, next date, and topic.
- A cron that emails buyers before the call.

**Later, if it earns it:** recordings library, attendance, RSVP counts.

---

## 2. Coaching 1-on-1 sessions

The request form already exists — a subscriber submits availability, admin gets
a bell + Telegram alert, admin confirms by email.

**What is missing:**

- **A session counter.** The promise is 4 a month. Neither side can currently
  see how many have been used. Without this there will be a dispute in month
  two.
- **Admin confirmation UI.** Today a request lands as a notification and admin
  must go to the database to set `scheduledAt` / `meetingUrl`. That needs a
  screen.

**Build required:** moderate.
- Admin tab listing open `CoachingRequest` rows with a confirm action
  (set time + paste meeting link → user sees it on `/coaching`, gets an email).
- "X of 4 sessions used this month" on `/coaching`, counting `status = done`
  within the current billing period.

**Decision needed:** what happens to unused sessions at month end — do they
expire, or roll over? Recommend **expire**, stated plainly on the page, because
rollover creates an ever-growing liability.

---

## 3. Live trading sessions

This is the loosest promise: "every live trading session we run that month",
with no fixed schedule. That is fine commercially, but it needs a way to tell
people it is happening, quickly, or the benefit is worthless.

**Minimum viable**

- An admin button: **"Go live now"**.
- Pressing it takes a meeting link and immediately:
  - writes a bell notification to every active coaching subscriber,
  - sends them an email,
  - posts to Telegram.
- A banner appears on the site for subscribers while the session is live.
- Pressing **"End session"** clears it.

**Build required:** small-to-moderate.
- `AdminSetting` row `{ liveSessionUrl, startedAt }` as the on/off state.
- Admin control in the existing Performance/Admin panel.
- Banner component for subscribers.
- Reuses the existing notification + email plumbing.

**Decision needed:** how much notice do subscribers get? Going live with zero
warning means most miss it. Recommend announcing the intent the day before
("live session tomorrow ~14:00") and then a second alert when it actually
starts.

---

## Recommended build order

1. **Live-session "Go live" button** — smallest build, biggest perceived value,
   and it is the part most likely to be used immediately.
2. **Course group-call card + reminder cron** — needed before the first course
   buyer reaches week one.
3. **Coaching session counter + admin confirm screen** — needed before the
   first coaching subscriber reaches session two.

Everything above reuses existing infrastructure (AdminSetting, bell
notifications, Brevo/Resend email, Telegram). No new third-party service and no
new recurring cost.

---

## What I would not build yet

- Calendar/availability integration (Calendly, Cal.com). Real scheduling is a
  product in itself. Manual confirmation is fine under ~20 subscribers.
- Automatic recording and a video library. Wait until people ask.
- In-app video. Zoom/Meet already works and is free at this scale.

---

## Open decisions for you

1. Standing weekly slot for group calls — accepted? What day and time?
2. Do unused coaching sessions expire monthly, or roll over?
3. How much notice before a live trading session?
4. Zoom or Google Meet?
5. Build order above — agreed, or reprioritise?
