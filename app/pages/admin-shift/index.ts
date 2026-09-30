import { Request, Response, session, sql, NotFoundError } from "@elements/app";
import { requireCoordinator } from "#app/shared/services/auth";
import { roster, Shift } from "#app/shared/services/shifts";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!requireCoordinator()) {
    return;
  }

  let id = String(req.params.id);
  let isUuid = /^[0-9a-f-]{36}$/i.test(id);
  let shift = isUuid ? sql<Shift>(`select * from shifts where id = ${id}`).first() : undefined;

  if (!shift) {
    throw new NotFoundError("That shift doesn't exist.");
  }

  return new html({
    userName: session.getOrThrow("userName"),
    shift,
    roster: roster.view({ shiftId: shift.id }),
  });
}
