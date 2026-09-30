import { test, equal, sql } from "@elements/app";
import { SendShiftRemindersJob, dueReminders } from "#app/jobs/send-shift-reminders";
import { makeUser } from "#app/shared/services/fixtures";

/** A shift at 10am on the given day offset, in the food bank's zone. */
function shiftOn(daysFromToday: number): string {
  return sql<{ id: string }>(`
    insert into shifts (kind, startsAt, endsAt, location, capacity)
    select 'delivery',
           ((now() at time zone 'America/Chicago')::date + ${daysFromToday}::int + time '10:00') at time zone 'America/Chicago',
           ((now() at time zone 'America/Chicago')::date + ${daysFromToday}::int + time '14:00') at time zone 'America/Chicago',
           'Test Depot', 3
    returning id
  `).firstOrThrow().id;
}

test("shift reminders", () => {
  test("go to confirmed volunteers on tomorrow's shifts, once", () => {
    let tomorrow = shiftOn(1);
    let nextWeek = shiftOn(7);
    let [ann, bea, cal] = ["Ann R", "Bea R", "Cal R"].map((n) => makeUser(n));

    sql(`insert into signups (shiftId, userId, status) values
      (${tomorrow}, ${ann}, 'confirmed'),
      (${tomorrow}, ${bea}, 'waitlist'),
      (${nextWeek}, ${cal}, 'confirmed')`);

    equal(dueReminders().map((d) => d.name), ["Ann R"]);

    new SendShiftRemindersJob({}).run();

    equal(dueReminders().length, 0);

    let reminded = sql<{ n: number }>(`select count(remindedAt)::int as n from signups where userId = ${ann}`).firstOrThrow();
    equal(reminded.n, 1);
  });
});
