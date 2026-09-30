import { LiveTable, sql, tx, ForbiddenError, NotFoundError, ValidationError } from "@elements/app";
import { currentUserIdOrThrow, coordinatorOrThrow } from "#app/shared/services/auth";
import { ShiftKind, KINDS, dayKey, zonedMoment } from "#app/shared/lib/format";

export interface Shift {
  id: string;
  kind: ShiftKind;
  startsAt: Date;
  endsAt: Date;
  location: string;
  capacity: number;
  seriesId: string | null;
}

export interface Signup {
  id: string;
  shiftId: string;
  userId: string;
  status: "confirmed" | "waitlist";
  checkedInAt: Date | null;
  createdAt: Date;
}

/** A signup with the contact details a coordinator's roster needs. */
export interface RosterEntry extends Signup {
  name: string;
  email: string;
  phone: string;
}

// Every write goes through an rpc below, and a Postgres trigger broadcasts it
// (see the schema migration), so the views are read-only from the browser.
function readOnly(): never {
  throw new ForbiddenError("Use the shift actions to change signups.");
}

/** Shifts from yesterday on: today's roster, and everything upcoming. */
export let shifts: LiveTable<Shift> = new LiveTable<Shift>({
  select: () => sql<Shift>(`
    select id, kind, startsAt, endsAt, location, capacity, seriesId
    from shifts
    where endsAt > now() - interval '1 day'
  `),
  insert: readOnly,
  update: readOnly,
  delete: readOnly,
});

/** Who holds each spot, with no contact details: every volunteer's page hears this. */
export let signups: LiveTable<Signup> = new LiveTable<Signup>({
  select: () => sql<Signup>(`
    select g.id, g.shiftId, g.userId, g.status, g.checkedInAt, g.createdAt
    from signups g
    join shifts s on s.id = g.shiftId
    where s.endsAt > now() - interval '1 day'
  `),
  insert: readOnly,
  update: readOnly,
  delete: readOnly,
});

/** The coordinator's roster: signups joined to the volunteer's name and phone. */
export let roster: LiveTable<RosterEntry> = new LiveTable<RosterEntry>({
  table: "signups",
  channel: "roster",
  select: (partition: { shiftId?: string }) => sql<RosterEntry>(`
    select g.id, g.shiftId, g.userId, g.status, g.checkedInAt, g.createdAt,
           u.name, u.email, u.phone
    from signups g
    join users u on u.id = g.userId
    where g.shiftId = ${partition.shiftId ?? null}
       or (${partition.shiftId ?? null}::uuid is null
           and g.shiftId in (select id from shifts where endsAt > now() - interval '1 day'))
  `),
  insert: readOnly,
  update: readOnly,
  delete: readOnly,
});

function lockShift(shiftId: string): Shift {
  let shift = sql<Shift>(`select * from shifts where id = ${shiftId} for update`).first();

  if (!shift) {
    throw new NotFoundError("That shift no longer exists.");
  }

  return shift;
}

/**
 * Takes a spot on the shift, or a place on its waitlist when every spot is
 * taken. The shift row is locked first, so two volunteers racing for the last
 * spot are served one at a time and exactly one of them gets it.
 */
/** @rpc */
export function joinShift(shiftId: string): Signup["status"] {
  let userId = currentUserIdOrThrow();

  return tx(() => {
    let shift = lockShift(shiftId);

    if (shift.startsAt.getTime() <= Date.now()) {
      throw new ValidationError("That shift has already started.");
    }

    let onShift = !sql(`select 1 from signups where shiftId = ${shiftId} and userId = ${userId}`).empty();

    if (onShift) {
      throw new ValidationError("You're already on this shift.");
    }

    let taken = sql<{ n: number }>(`
      select count(*)::int as n from signups where shiftId = ${shiftId} and status = 'confirmed'
    `).firstOrThrow();

    let status: Signup["status"] = taken.n < shift.capacity ? "confirmed" : "waitlist";

    sql(`insert into signups (shiftId, userId, status) values (${shiftId}, ${userId}, ${status})`);

    return status;
  });
}

/** Gives up the spot (or the waitlist place). The first person waiting moves up. */
/** @rpc */
export function leaveShift(shiftId: string) {
  let userId = currentUserIdOrThrow();

  tx(() => {
    let shift = lockShift(shiftId);

    let left = sql<Signup>(`
      delete from signups where shiftId = ${shiftId} and userId = ${userId} returning *
    `).first();

    if (left?.status === "confirmed") {
      fillOpenSpots(shift);
    }
  });
}

/** Moves waitlisted volunteers up, oldest first, until the shift is full. */
function fillOpenSpots(shift: Shift) {
  sql(`
    update signups set status = 'confirmed'
    where id in (
      select id from signups
      where shiftId = ${shift.id} and status = 'waitlist'
      order by createdAt
      limit greatest(0, ${shift.capacity} - (
        select count(*) from signups where shiftId = ${shift.id} and status = 'confirmed'
      ))
    )
  `);
}

/** Marks a confirmed volunteer as arrived, or undoes it. Only on the day of the shift. */
/** @rpc */
export function setCheckIn(signupId: string, checkedIn: boolean) {
  coordinatorOrThrow();

  let row = sql<{ status: string; startsAt: Date }>(`
    select g.status, s.startsAt from signups g join shifts s on s.id = g.shiftId
    where g.id = ${signupId}
  `).first();

  if (!row) {
    throw new NotFoundError("That signup no longer exists.");
  }

  if (row.status !== "confirmed") {
    throw new ValidationError("Only confirmed volunteers can be checked in.");
  }

  if (dayKey(row.startsAt) !== dayKey(new Date())) {
    throw new ValidationError("Check-in opens on the day of the shift.");
  }

  sql(`
    update signups set checkedInAt = ${checkedIn ? new Date() : null}
    where id = ${signupId}
  `);
}

export interface NewShiftForm {
  kind: ShiftKind;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  weeks: number;
}

export const MAX_WEEKS = 26;

/** Creates one shift, or one a week for `weeks` weeks sharing a series id. */
/** @rpc */
export function createShifts(form: NewShiftForm): number {
  coordinatorOrThrow();

  let errors: Partial<Record<keyof NewShiftForm, string[]>> = {};
  let location = form.location.trim();
  let capacity = Math.floor(Number(form.capacity));
  let weeks = Math.floor(Number(form.weeks));

  if (!KINDS.includes(form.kind)) {
    errors.kind = ["Pick a shift type."];
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
    errors.date = ["Pick a date."];
  }

  if (!/^\d{2}:\d{2}$/.test(form.startTime) || !/^\d{2}:\d{2}$/.test(form.endTime)) {
    errors.startTime = ["Enter a start and end time."];
  } else if (form.endTime <= form.startTime) {
    errors.endTime = ["The shift has to end after it starts."];
  }

  if (!location) {
    errors.location = ["Enter where volunteers should go."];
  }

  if (!(capacity >= 1 && capacity <= 100)) {
    errors.capacity = ["Between 1 and 100 volunteers."];
  }

  if (!(weeks >= 1 && weeks <= MAX_WEEKS)) {
    errors.weeks = [`Between 1 and ${MAX_WEEKS} weeks.`];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  let start = zonedMoment(form.date, form.startTime);

  if (start.getTime() <= Date.now()) {
    throw new ValidationError({ date: ["That time has already passed."] });
  }

  return tx(() => {
    let seriesId = weeks > 1 ? sql<{ id: string }>(`select uuidGenerateV7() as id`).firstOrThrow().id : null;

    for (let week = 0; week < weeks; week++) {
      let day = new Date(`${form.date}T12:00:00Z`);
      day.setUTCDate(day.getUTCDate() + week * 7);

      let date = day.toISOString().slice(0, 10);

      sql(`
        insert into shifts (kind, startsAt, endsAt, location, capacity, seriesId)
        values (${form.kind}, ${zonedMoment(date, form.startTime)}, ${zonedMoment(date, form.endTime)},
                ${location}, ${capacity}, ${seriesId})
      `);
    }

    return weeks;
  });
}

/** Cancels a shift and everyone's signup on it. */
/** @rpc */
export function cancelShift(shiftId: string) {
  coordinatorOrThrow();

  tx(() => {
    lockShift(shiftId);
    sql(`delete from signups where shiftId = ${shiftId}`);
    sql(`delete from shifts where id = ${shiftId}`);
  });
}

/** Hours from shifts the volunteer was checked in for, this calendar year. */
export function hoursThisYear(userId: string): { hours: number; shifts: number } {
  return sql<{ hours: number; shifts: number }>(`
    select coalesce(sum(extract(epoch from s.endsAt - s.startsAt) / 3600), 0)::float8 as hours,
           count(*)::int as shifts
    from signups g
    join shifts s on s.id = g.shiftId
    where g.userId = ${userId}
      and g.checkedInAt is not null
      and s.startsAt >= date_trunc('year', now() at time zone 'America/Chicago') at time zone 'America/Chicago'
  `).firstOrThrow();
}

/** Takes a volunteer off a shift for them. The first person waiting moves up. */
/** @rpc */
export function removeSignup(signupId: string) {
  coordinatorOrThrow();

  tx(() => {
    let signup = sql<Signup>(`select * from signups where id = ${signupId}`).first();

    if (!signup) {
      return;
    }

    let shift = lockShift(signup.shiftId);
    sql(`delete from signups where id = ${signupId}`);

    if (signup.status === "confirmed") {
      fillOpenSpots(shift);
    }
  });
}
