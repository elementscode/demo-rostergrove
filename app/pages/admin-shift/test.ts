import { test, assert, equal, sql, ForbiddenError, ValidationError } from "@elements/app";
import { joinShift, setCheckIn, removeSignup, cancelShift } from "#app/shared/services/shifts";
import { makeUser, makeShift, signInAs, statusOf } from "#app/shared/services/fixtures";

function signupId(shiftId: string, userId: string): string {
  return sql<{ id: string }>(`select id from signups where shiftId = ${shiftId} and userId = ${userId}`).firstOrThrow().id;
}

test("roster", () => {
  test("a coordinator checks a volunteer in on the day, and undoes it", () => {
    let shift = makeShift({ startsInHours: 0.02 });
    let volunteer = makeUser("Gus G");
    signInAs(volunteer);
    joinShift(shift.id);

    signInAs(makeUser("Dana D", "coordinator"));
    let id = signupId(shift.id, volunteer);

    setCheckIn(id, true);
    assert(sql<{ at: Date | null }>(`select checkedInAt as at from signups where id = ${id}`).firstOrThrow().at !== null);

    setCheckIn(id, false);
    equal(sql<{ at: Date | null }>(`select checkedInAt as at from signups where id = ${id}`).firstOrThrow().at, null);
  });

  test("check-in waits for the day of the shift", () => {
    let shift = makeShift({ startsInHours: 72 });
    let volunteer = makeUser("Hal H");
    signInAs(volunteer);
    joinShift(shift.id);

    signInAs(makeUser("Dana D", "coordinator"));

    let err: unknown;

    try {
      setCheckIn(signupId(shift.id, volunteer), true);
    } catch (e) {
      err = e;
    }

    assert(err instanceof ValidationError, `got ${err}`);
  });

  test("a volunteer cannot check anyone in", () => {
    let shift = makeShift({ startsInHours: 0.02 });
    let volunteer = makeUser("Ivy I");
    signInAs(volunteer);
    joinShift(shift.id);

    let err: unknown;

    try {
      setCheckIn(signupId(shift.id, volunteer), true);
    } catch (e) {
      err = e;
    }

    assert(err instanceof ForbiddenError, `got ${err}`);
  });

  test("removing a confirmed volunteer moves the waitlist up", () => {
    let shift = makeShift({ capacity: 1 });
    let [a, b] = ["Jo J", "Kit K"].map((n) => makeUser(n));

    for (let id of [a, b]) {
      signInAs(id);
      joinShift(shift.id);
    }

    signInAs(makeUser("Dana D", "coordinator"));
    removeSignup(signupId(shift.id, a));

    equal(statusOf(shift.id, b), "confirmed");
  });

  test("cancelling a shift removes it and its signups", () => {
    let shift = makeShift();
    let volunteer = makeUser("Lou L");
    signInAs(volunteer);
    joinShift(shift.id);

    signInAs(makeUser("Dana D", "coordinator"));
    cancelShift(shift.id);

    assert(sql(`select 1 from shifts where id = ${shift.id}`).empty());
    assert(sql(`select 1 from signups where shiftId = ${shift.id}`).empty());
  });
});
