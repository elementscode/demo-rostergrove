![Volunteer shift signup with waitlists, built by Claude Code on Elements: the coordinator's two-week schedule with full shifts, waitlists and short-staffed shifts highlighted.](https://elements.dev/demos/01a0f414-f68d-7b61-a239-9af19d397d92/poster?v=ed1666d09742)

# Volunteer shift signup with waitlists, built by Claude Code on Elements

> Rostergrove is a full-stack app built with Claude Code on Elements.

Volunteers pick up shifts with live spots left, waitlists and day-before reminders; coordinators set weekly shifts, check people in and export hours.

[Run this app on your machine](https://elements.dev/demos/01a0f414-f68d-7b61-a239-9af19d397d92). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## How it's built

Rostergrove needed shifts with spots that count down as volunteers sign up, waitlists that move people up, day-before reminders, check-in and an hours report for the coordinator. Each of those is a part of Elements, so the agent spent its 18 minutes on the food bank's roster itself.

- **Live spots and rosters.** Shifts, signups and the coordinator's roster are LiveTables. Spots left change the moment someone signs up, and the roster fills in and checks off as people arrive.

- **Waitlists that move people up.** Signing up locks the shift first, so the last spot goes to exactly one volunteer and a full shift puts the next one on the waitlist. When someone with a spot leaves, whoever has waited longest is confirmed.

- **Day-before reminders.** A one-line cron schedule runs a job every hour that emails each confirmed volunteer the day before their shift, in the food bank's time zone, and marks each one as sent.

- **Weekly shifts and hours.** A coordinator adds a shift once or every week for a set number of weeks, and downloads each volunteer's checked-in hours for the year as a CSV.

- **Server calls as function calls.** Signing up, leaving, check-in and cancelling a shift call server functions straight from the page with `@rpc`.

- **Data and roles from SQL.** Migrations define the roster and seed one coordinator, fifteen volunteers, sixteen weeks of past shifts with hours served and two weeks of upcoming shifts with signups. Sessions and roles give coordinators check-in and the admin pages.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
