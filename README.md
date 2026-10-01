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

- **Live spots and rosters.** Shifts, signups and the coordinator's roster are LiveTables. Spots left change the moment someone signs up, and the roster fills in and checks off as people arrive.

- **Waitlists that move people up.** Signing up locks the shift first, so the last spot goes to exactly one volunteer and a full shift puts the next one on the waitlist. When someone with a spot leaves, whoever has waited longest is confirmed.

- **Day-before reminders.** A one-line cron schedule runs a job every hour that emails each confirmed volunteer the day before their shift, in the food bank's time zone, and marks each one as sent.

- **Weekly shifts and hours.** A coordinator adds a shift once or every week for a set number of weeks, and downloads each volunteer's checked-in hours for the year as a CSV.

- **Server calls as function calls.** Signing up, leaving, check-in and cancelling a shift call server functions straight from the page with `@rpc`.

- **Data and roles from SQL.** Migrations define the roster and seed one coordinator, fifteen volunteers, sixteen weeks of past shifts with hours served and two weeks of upcoming shifts with signups. Sessions and roles give coordinators check-in and the admin pages.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 31 tests pass. Every page works on desktop and phone.

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
