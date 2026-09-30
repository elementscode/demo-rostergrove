import { Request, Response, session, sql } from "@elements/app";
import { requireCoordinator } from "#app/shared/services/auth";
import { shifts, signups } from "#app/shared/services/shifts";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!requireCoordinator()) {
    return;
  }

  let volunteers = sql<{ n: number }>(`select count(*)::int as n from users where role = 'volunteer'`).firstOrThrow().n;

  return new html({
    userName: session.getOrThrow("userName"),
    shifts: shifts.view(),
    signups: signups.view(),
    volunteers,
  });
}
