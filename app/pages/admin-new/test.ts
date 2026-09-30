import { test, assert, equal, sql, ForbiddenError, ValidationError } from "@elements/app";
import { createShifts, NewShiftForm } from "#app/shared/services/shifts";
import { makeUser, signInAs } from "#app/shared/services/fixtures";
import { dayKey } from "#app/shared/lib/format";

function form(overrides: Partial<NewShiftForm> = {}): NewShiftForm {
  return {
    kind: "packing",
    date: dayKey(new Date(Date.now() + 3 * 86_400_000)),
    startTime: "13:00",
    endTime: "16:00",
    location: "Main Warehouse",
    capacity: 8,
    weeks: 1,
    ...overrides,
  };
}

test("new shift", () => {
  test("a one-off shift", () => {
    signInAs(makeUser("Dana D", "coordinator"));
    equal(createShifts(form()), 1);

    let row = sql<{ n: number; series: number }>(`
      select count(*)::int as n, count(seriesId)::int as series from shifts where location = 'Main Warehouse'
    `).firstOrThrow();
    equal(row, { n: 1, series: 0 });
  });

  test("weekly for four weeks, seven days apart, in one series", () => {
    signInAs(makeUser("Dana D", "coordinator"));
    createShifts(form({ weeks: 4 }));

    let rows = sql<{ startsAt: Date; seriesId: string }>(`
      select startsAt, seriesId from shifts where location = 'Main Warehouse' order by startsAt
    `).all();

    equal(rows.length, 4);
    equal(new Set(rows.map((r) => r.seriesId)).size, 1);

    for (let i = 1; i < rows.length; i++) {
      let days = Math.round((+rows[i].startsAt - +rows[i - 1].startsAt) / 86_400_000);
      equal(days, 7);
    }
  });

  test("the start time is the food bank's wall clock", () => {
    signInAs(makeUser("Dana D", "coordinator"));
    createShifts(form({ date: "2027-01-15", startTime: "09:00", endTime: "12:00" }));

    let row = sql<{ startsAt: Date }>(`select startsAt from shifts where location = 'Main Warehouse'`).firstOrThrow();
    equal(row.startsAt.toISOString(), "2027-01-15T15:00:00.000Z");
  });

  test("rejects an end before the start", () => {
    signInAs(makeUser("Dana D", "coordinator"));
    let err: unknown;

    try {
      createShifts(form({ startTime: "16:00", endTime: "13:00" }));
    } catch (e) {
      err = e;
    }

    assert(err instanceof ValidationError, `got ${err}`);
  });

  test("volunteers cannot create shifts", () => {
    signInAs(makeUser("Mo M"));

    let err: unknown;

    try {
      createShifts(form());
    } catch (e) {
      err = e;
    }

    assert(err instanceof ForbiddenError, `got ${err}`);
  });
});
