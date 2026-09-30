import { Request, Response, redirect, session } from "@elements/app";
import { requireSignin, currentUserIdOrThrow } from "#app/shared/services/auth";
import { shifts, signups, hoursThisYear } from "#app/shared/services/shifts";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!requireSignin()) {
    return;
  }

  if (session.get("role") === "coordinator") {
    redirect("/admin");

    return;
  }

  let userId = currentUserIdOrThrow();

  return new html({
    userId,
    userName: session.getOrThrow("userName"),
    shifts: shifts.view(),
    signups: signups.view(),
    served: hoursThisYear(userId),
    year: new Date().getFullYear(),
  });
}
