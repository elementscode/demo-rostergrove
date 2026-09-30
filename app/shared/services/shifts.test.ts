import { test, assert, equal, sql, session, AuthError, ValidationError } from "@elements/app";
import { joinShift, leaveShift, hoursThisYear } from "#app/shared/services/shifts";
import { makeUser, makeShift, signInAs, statusOf } from "#app/shared/services/fixtures";

test("joining a shift", () => {
  test("fills spots, then the waitlist", () => {
    let shift = makeShift({ capacity: 2 });
    let [a, b, c] = ["Ann A", "Bea B", "Cal C"].map((n) => makeUser(n));

    signInAs(a);
    equal(joinShift(shift.id), "confirmed");

    signInAs(b);
    equal(joinShift(shift.id), "confirmed");

    signInAs(c);
    equal(joinShift(shift.id), "waitlist");
  });

  test("refuses a second signup for the same shift", () => {
    let shift = makeShift();
    signInAs(makeUser("Dee D"));
    joinShift(shift.id);

    let err: unknown;

    try {
      joinShift(shift.id);
    } catch (e) {
      err = e;
    }

    assert(err instanceof ValidationError, `got ${err}`);
  });

  test("refuses a shift that has started", () => {
    let shift = makeShift({ startsInHours: -1 });
    signInAs(makeUser("Eve E"));

    let err: unknown;

    try {
      joinShift(shift.id);
    } catch (e) {
      err = e;
    }

    assert(err instanceof ValidationError, `got ${err}`);
  });

  test("needs a signed-in volunteer", () => {
    let shift = makeShift();

    let err: unknown;

    try {
      joinShift(shift.id);
    } catch (e) {
      err = e;
    }

    assert(err instanceof AuthError, `got ${err}`);
  });
});

test("leaving a shift", () => {
  test("moves the first person waiting up", () => {
    let shift = makeShift({ capacity: 1 });
    let [a, b, c] = ["Ann A", "Bea B", "Cal C"].map((n) => makeUser(n));

    for (let id of [a, b, c]) {
      signInAs(id);
      joinShift(shift.id);
    }

    signInAs(a);
    leaveShift(shift.id);

    equal(statusOf(shift.id, a), undefined);
    equal(statusOf(shift.id, b), "confirmed");
    equal(statusOf(shift.id, c), "waitlist");
  });

  test("leaving the waitlist promotes nobody", () => {
    let shift = makeShift({ capacity: 1 });
    let [a, b, c] = ["Ann A", "Bea B", "Cal C"].map((n) => makeUser(n));

    for (let id of [a, b, c]) {
      signInAs(id);
      joinShift(shift.id);
    }

    signInAs(b);
    leaveShift(shift.id);

    equal(statusOf(shift.id, a), "confirmed");
    equal(statusOf(shift.id, c), "waitlist");
  });
});

test("hours this year count checked-in shifts only", () => {
  let user = makeUser("Fay F");
  let served = makeShift({ startsInHours: -30, hours: 3 });
  let missed = makeShift({ startsInHours: -54, hours: 4 });

  sql(`insert into signups (shiftId, userId, checkedInAt) values (${served.id}, ${user}, now())`);
  sql(`insert into signups (shiftId, userId) values (${missed.id}, ${user})`);

  let result = hoursThisYear(user);
  equal(result.shifts, 1);
  equal(result.hours, 3);
  session.logout();
});
