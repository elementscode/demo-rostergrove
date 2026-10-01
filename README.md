![Rostergrove, a volunteer shift signup app built with Elements: the coordinator's two-week schedule with full shifts, waitlists and short-staffed shifts highlighted.](https://elements.dev/demos/01a0f414-f68d-7b61-a239-9af19d397d92/poster?v=ed1666d09742)

# Rostergrove

> A demo app built with [Elements](https://elements.dev).

Volunteers pick up shifts with live spots left, waitlists and day-before reminders; coordinators set weekly shifts, check people in and export hours.

**Demo:** [Rostergrove](https://elements.dev/demos/01a0f414-f68d-7b61-a239-9af19d397d92)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 18 min
- **Cost:** $5.88 at API rates, September 2026

## Get started

```bash
elements create rostergrove -scaffold=elementscode/demo-rostergrove
```

## How it's built

Rostergrove needed shifts with spots that count down as volunteers sign up, waitlists that move people up, day-before reminders, check-in and an hours report for the coordinator. Each of those is a part of Elements, so the agent spent its 18 minutes on the food bank's roster itself.

### What Elements gave the app

- **Live spots and rosters.** `shifts`, `signups` and `roster` are LiveTables in `app/shared/services/shifts.ts`. A volunteer's page shows spots left the moment someone signs up, and the coordinator's roster, with names and phone numbers, fills in and checks off as people arrive.
- **Waitlists that move people up.** `joinShift` and `leaveShift` lock the shift row first, so the last spot goes to exactly one volunteer. A full shift puts the next volunteer on the waitlist, and when someone with a spot leaves, `fillOpenSpots` confirms whoever has waited longest.
- **Day-before reminders.** One line in `index.ts` runs `SendShiftRemindersJob` every hour. It emails the `shift-reminder` template to each confirmed volunteer on tomorrow's shifts, in the food bank's time zone, and marks each signup as it sends.
- **Weekly shifts and hours.** `createShifts` adds one shift or the same shift every week for up to the chosen number of weeks, sharing a series id, and `/admin/hours.csv` exports each volunteer's checked-in hours for the year.
- **Server calls as function calls.** Pages call `@rpc` functions such as `joinShift`, `setCheckIn`, `cancelShift` and `removeSignup` straight from the template.
- **Data and roles from SQL.** Two migrations define the roster and seed one coordinator, fifteen volunteers, sixteen weeks of past shifts with hours served and two weeks of upcoming shifts with signups. `coordinatorOrThrow` in `app/shared/services/auth.ts` gives coordinators check-in and the admin pages.

### What the agent got from the tooling

The agent ran 33 builds in 18 minutes. By the build's own timer, the median build finished in 37 milliseconds, so it checked its work after each edit and kept going. Along the way the build caught errors such as an async call at the top level of a module, with a message that said where to move it, and a date that could be null passed where a boolean belonged. The agent read 37 manual pages as it reached each part, from `livetable/partitions` and `jobs/cron` to `recipes/admin-roles`, then wrote 31 tests and checked its pages at phone width in a real browser.

Start in `app/shared/services/shifts.ts`.

## Demo accounts

The seed creates a food bank's weekly schedule of sorting, packing and delivery
driver shifts: sixteen weeks of past shifts with checked-in hours, and the next
two weeks with signups, where some shifts are full with a waitlist and some are
short of volunteers. The sign-in page lists every account; tap one to sign in.

| Email                       | Role        | Password      |
| --------------------------- | ----------- | ------------- |
| coordinator@rostergrove.org | coordinator | `coordinator` |
| maya@example.org            | volunteer   | `volunteer`   |
| luis@example.org            | volunteer   | `volunteer`   |
| priya@example.org           | volunteer   | `volunteer`   |

Twelve more volunteers (tom, aisha, ben, grace, sam, rosa, kwame, hannah,
diego, ellie, marcus and nora, all `@example.org`) share the `volunteer`
password.

Reminder emails go to the log in development. To send tomorrow's reminders
now, run `elements run scripts/send-reminders.ts`.

## The prompt

```text
Build a volunteer scheduling app named rostergrove for a community food bank.

VOLUNTEER
- Sign up with name, email and phone.
- Browse upcoming shifts (sorting, packing, delivery driver) with date, time,
  location, and spots left.
- Sign up for a shift or drop one. A shift that is full shows a waitlist.
- A reminder email the day before.
- Their hours served this year.

COORDINATOR (admin account)
- Create shifts, one-off or repeating weekly, with the number of volunteers
  needed.
- Each shift's roster, with check-in on the day.
- Shifts that are short of volunteers, highlighted.
- Export volunteer hours as CSV.

Seed one coordinator, fifteen volunteers, two weeks of shifts with signups,
and past hours. Show the seeded logins on the sign-in page.

Spots left and rosters update in real time.
```

## License

MIT. See [LICENSE](LICENSE).
