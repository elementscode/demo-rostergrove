/**
 * Rows for tests. Tests roll back, so nothing here outlives the test that
 * made it.
 */
import { sql, session } from "@elements/app";
import { Shift } from "#app/shared/services/shifts";

export function makeUser(name: string, role: "volunteer" | "coordinator" = "volunteer"): string {
  let email = `${name.toLowerCase().replace(/\s+/g, ".")}@test.example`;

  return sql<{ id: string }>(`
    insert into users (name, email, phone, passwordHash, role)
    values (${name}, ${email}, '3125550000', crypt('password1', gen_salt('bf', 4)), ${role})
    returning id
  `).firstOrThrow().id;
}

export function signInAs(userId: string) {
  let user = sql<{ name: string; role: "volunteer" | "coordinator" }>(`select name, role from users where id = ${userId}`).firstOrThrow();
  session.login({ userId, userName: user.name, role: user.role });
}

export function makeShift(opts: { capacity?: number; startsInHours?: number; hours?: number } = {}): Shift {
  let start = new Date(Date.now() + (opts.startsInHours ?? 48) * 3_600_000);
  let end = new Date(start.getTime() + (opts.hours ?? 3) * 3_600_000);

  return sql<Shift>(`
    insert into shifts (kind, startsAt, endsAt, location, capacity)
    values ('sorting', ${start}, ${end}, 'Test Warehouse', ${opts.capacity ?? 2})
    returning *
  `).firstOrThrow();
}

export function statusOf(shiftId: string, userId: string): string | undefined {
  return sql<{ status: string }>(`select status from signups where shiftId = ${shiftId} and userId = ${userId}`).first()?.status;
}
