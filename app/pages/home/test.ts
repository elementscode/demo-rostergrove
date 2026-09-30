import { test, equal } from "@elements/app";
import { countsFor, waitlistFor, waitlistPosition, spotsLabel } from "#app/shared/lib/roster";
import { relativeDay, formatTimeRange, zonedMoment } from "#app/shared/lib/format";

let t0 = new Date("2026-10-01T12:00:00Z");
let at = (min: number) => new Date(t0.getTime() + min * 60_000);

let signups = [
  { id: "1", shiftId: "s", userId: "ann", status: "confirmed" as const, createdAt: at(0) },
  { id: "2", shiftId: "s", userId: "cal", status: "waitlist" as const, createdAt: at(20) },
  { id: "3", shiftId: "s", userId: "bea", status: "waitlist" as const, createdAt: at(10) },
];

test("shift cards", () => {
  test("the waitlist is first come, first served", () => {
    equal(waitlistFor(signups, "s").map((s) => s.userId), ["bea", "cal"]);
    equal(waitlistPosition(signups, "s", "cal"), 2);
    equal(waitlistPosition(signups, "s", "ann"), 0);
  });

  test("spots left reads naturally", () => {
    equal(spotsLabel(countsFor(signups, "s", 3)), "2 spots left");
    equal(spotsLabel(countsFor(signups, "s", 2)), "1 spot left");
    equal(spotsLabel(countsFor(signups, "s", 1)), "Full · 2 waiting");
    equal(spotsLabel(countsFor([], "s", 1)), "1 spot left");
  });

  test("times show in the food bank's zone", () => {
    let start = zonedMoment("2026-10-02", "09:00");
    let end = zonedMoment("2026-10-02", "12:30");

    equal(start.toISOString(), "2026-10-02T14:00:00.000Z");
    equal(formatTimeRange(start, end), "9 AM – 12:30 PM");
    equal(relativeDay(start, zonedMoment("2026-10-01", "20:00")), "Tomorrow");
    equal(relativeDay(start, zonedMoment("2026-10-02", "06:00")), "Today");
    equal(relativeDay(start, zonedMoment("2026-09-29", "06:00")), "Friday, Oct 2");
  });
});
