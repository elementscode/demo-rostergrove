import { test, equal, sql } from "@elements/app";
import { csvField, hoursCsv, hoursReport } from "./hours-csv";
import { emailOf, makeUser, makeShift } from "#app/shared/services/fixtures";
import { countsFor } from "#app/shared/lib/roster";

test("hours export", () => {
  test("quotes fields that need it", () => {
    equal(csvField("plain"), "plain");
    equal(csvField("Hernández, Luis"), '"Hernández, Luis"');
    equal(csvField('say "hi"'), '"say ""hi"""');
    equal(csvField(null), "");
  });

  test("totals checked-in hours per volunteer, busiest first", () => {
    let names = ["Ann Alpha", "Bo Beta", "Cy Idle"];
    let [a, b, c] = names.map((n) => makeUser(n));

    // Fixed dates in a fixed year, so the report year never straddles New Year.
    let long = makeShift({ startsAt: new Date("2025-06-02T15:00:00Z"), hours: 4 });
    let short = makeShift({ startsAt: new Date("2025-06-09T15:00:00Z"), hours: 2.5 });

    sql(`insert into signups (shiftId, userId, checkedInAt) values (${long.id}, ${a}, now()), (${short.id}, ${a}, now())`);
    sql(`insert into signups (shiftId, userId, checkedInAt) values (${short.id}, ${b}, now())`);

    // The report covers every volunteer; this test follows its own three.
    let rows = hoursReport(2025).filter((r) => names.includes(r.name));
    equal(rows.map((r) => [r.name, r.shifts, r.hours]), [
      ["Ann Alpha", 2, 6.5],
      ["Bo Beta", 1, 2.5],
      ["Cy Idle", 0, 0],
    ]);

    let csv = hoursCsv(rows).split("\r\n");
    equal(csv[0], "Name,Email,Phone,Shifts served,Hours,Last served");
    equal(csv[3].startsWith(`Cy Idle,${emailOf(c)},3125550000,0,0,`), true);
  });
});

test("short shifts are the ones with spots left", () => {
  let now = new Date();
  let signups = [
    { id: "1", shiftId: "s", userId: "a", status: "confirmed" as const, createdAt: now },
    { id: "2", shiftId: "s", userId: "b", status: "waitlist" as const, createdAt: now },
    { id: "3", shiftId: "t", userId: "a", status: "confirmed" as const, createdAt: now },
  ];

  equal(countsFor(signups, "s", 3), { confirmed: 1, waitlist: 1, left: 2 });
  equal(countsFor(signups, "t", 1), { confirmed: 1, waitlist: 0, left: 0 });
});
