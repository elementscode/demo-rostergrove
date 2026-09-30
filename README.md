![Rostergrove, a volunteer shift signup app built with Elements: the coordinator's two-week schedule with full shifts, waitlists and short-staffed shifts highlighted.](POSTER_URL)

# Rostergrove

> A demo app built with [Elements](https://elements.dev).

Volunteers pick up shifts with live spots left, waitlists and day-before reminders; coordinators set weekly shifts, check people in and export hours.

**Demo:** [Rostergrove](DEMO_URL)

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
