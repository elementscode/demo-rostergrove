import { Request, Response, sql } from "@elements/app";
import { requireCoordinator } from "#app/shared/services/auth";
import { TIME_ZONE } from "#app/shared/lib/format";

interface HoursRow {
  name: string;
  email: string;
  phone: string;
  shifts: number;
  hours: number;
  lastServed: string | null;
}

/** Quotes a field when it holds a comma, quote or newline, per RFC 4180. */
export function csvField(value: string | number | null): string {
  let text = value === null ? "" : String(value);

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Hours from checked-in shifts, per volunteer, for one calendar year. */
export function hoursReport(year: number): HoursRow[] {
  return sql<HoursRow>(`
    select u.name, u.email, u.phone,
           count(s.id)::int as shifts,
           coalesce(round(sum(extract(epoch from s.endsAt - s.startsAt) / 3600)::numeric, 2), 0)::float8 as hours,
           to_char(max(s.startsAt) at time zone ${TIME_ZONE}, 'YYYY-MM-DD') as lastServed
    from users u
    left join signups g on g.userId = u.id and g.checkedInAt is not null
    left join shifts s on s.id = g.shiftId
      and extract(year from s.startsAt at time zone ${TIME_ZONE}) = ${year}
    where u.role = 'volunteer'
    group by u.id
    order by hours desc, u.name
  `).all();
}

export function hoursCsv(rows: HoursRow[]): string {
  let lines = [["Name", "Email", "Phone", "Shifts served", "Hours", "Last served"].join(",")];

  for (let r of rows) {
    lines.push([r.name, r.email, r.phone, r.shifts, r.hours, r.lastServed].map(csvField).join(","));
  }

  return lines.join("\r\n") + "\r\n";
}

export default function route(req: Request, res: Response) {
  if (!requireCoordinator()) {
    return;
  }

  let year = Number(req.query.year) || new Date().getFullYear();

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="volunteer-hours-${year}.csv"`);
  res.send(hoursCsv(hoursReport(year)));
}
