import { Request, Response, redirect, session, sql } from "@elements/app";
import html, { DemoLogin } from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect(session.get("role") === "coordinator" ? "/admin" : "/");

    return;
  }

  // The seeded accounts exist only on a development database, so production
  // shows no demo logins.
  let demoLogins = sql<DemoLogin>(`
    select name, email, role from users
    where email = 'coordinator@rostergrove.org' or email like '%@example.org'
    order by role desc, name
  `).all();

  return new html({ demoLogins });
}
