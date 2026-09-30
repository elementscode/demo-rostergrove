/**
 * Counting spots from a list of signups. Browser-safe: pages run these over
 * their live views, so a count changes the moment a signup lands.
 */
export interface SignupLike {
  id: string;
  shiftId: string;
  userId: string;
  status: "confirmed" | "waitlist";
  createdAt: Date;
}

export interface ShiftCounts {
  confirmed: number;
  waitlist: number;
  left: number;
}

export function countsFor<T extends SignupLike>(signups: Iterable<T>, shiftId: string, capacity: number): ShiftCounts {
  let confirmed = 0;
  let waitlist = 0;

  for (let s of signups) {
    if (s.shiftId !== shiftId) {
      continue;
    }

    if (s.status === "confirmed") {
      confirmed++;
    } else {
      waitlist++;
    }
  }

  return { confirmed, waitlist, left: Math.max(0, capacity - confirmed) };
}

/** The shift's waitlist, first in line first. */
export function waitlistFor<T extends SignupLike>(signups: Iterable<T>, shiftId: string): T[] {
  return [...signups]
    .filter((s) => s.shiftId === shiftId && s.status === "waitlist")
    .sort((a, b) => +a.createdAt - +b.createdAt || a.id.localeCompare(b.id));
}

/** 1 for first in line, or 0 when the user is not waiting on this shift. */
export function waitlistPosition<T extends SignupLike>(signups: Iterable<T>, shiftId: string, userId: string): number {
  return waitlistFor(signups, shiftId).findIndex((s) => s.userId === userId) + 1;
}

export function spotsLabel(counts: ShiftCounts): string {
  if (counts.left === 0) {
    return counts.waitlist > 0 ? `Full · ${counts.waitlist} waiting` : "Full";
  }

  return counts.left === 1 ? "1 spot left" : `${counts.left} spots left`;
}
