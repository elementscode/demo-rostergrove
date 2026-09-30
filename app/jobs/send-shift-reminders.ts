import { Job, email, sql } from "@elements/app";
import ShiftReminderEmail from "#app/emails/shift-reminder";
import { TIME_ZONE, KIND_LABELS, ShiftKind, formatDay, formatTimeRange } from "#app/shared/lib/format";

export interface SendShiftRemindersJobFields {}

interface Due {
  id: string;
  name: string;
  email: string;
  kind: ShiftKind;
  startsAt: Date;
  endsAt: Date;
  location: string;
}

/** Confirmed signups on tomorrow's shifts (in the food bank's zone) not yet reminded. */
export function dueReminders(): Due[] {
  return sql<Due>(`
    select g.id, u.name, u.email, s.kind, s.startsAt, s.endsAt, s.location
    from signups g
    join shifts s on s.id = g.shiftId
    join users u on u.id = g.userId
    where g.status = 'confirmed'
      and g.remindedAt is null
      and (s.startsAt at time zone ${TIME_ZONE})::date = (now() at time zone ${TIME_ZONE})::date + 1
    order by s.startsAt
  `).all();
}

/**
 * Emails each volunteer the day before their shift. Each signup is marked as
 * it is sent, so a retry after a failure picks up where it stopped rather
 * than emailing anyone twice.
 */
export class SendShiftRemindersJob extends Job<SendShiftRemindersJobFields> {
  static maxAttempts = 3;
  static timeoutMs = 120_000;

  run() {
    for (let due of dueReminders()) {
      email({
        to: due.email,
        subject: `Tomorrow: ${KIND_LABELS[due.kind]} shift at ${formatTimeRange(due.startsAt, due.endsAt)}`,
        body: new ShiftReminderEmail({
          name: due.name.split(" ")[0],
          kind: KIND_LABELS[due.kind],
          day: formatDay(due.startsAt),
          time: formatTimeRange(due.startsAt, due.endsAt),
          location: due.location,
        }),
      });

      sql(`update signups set remindedAt = now() where id = ${due.id}`);
    }
  }
}
