import { Request, Response, session } from "@elements/app";
import { requireCoordinator } from "#app/shared/services/auth";
import { dayKey } from "#app/shared/lib/format";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!requireCoordinator()) {
    return;
  }

  let tomorrow = dayKey(new Date(Date.now() + 86_400_000));

  return new html({ userName: session.getOrThrow("userName"), tomorrow });
}
