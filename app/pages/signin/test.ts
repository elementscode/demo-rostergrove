import { test, assert, equal, session, AuthError } from "@elements/app";
import { signin } from "#app/shared/services/auth";
import { emailOf, makeUser } from "#app/shared/services/fixtures";

test("signin", () => {
  test("signs a volunteer in and reports the role", () => {
    let id = makeUser("Nia N");

    equal(signin(` ${emailOf(id).toUpperCase()} `, "password1"), "volunteer");
    equal(session.get("userId"), id);
    equal(session.get("role"), "volunteer");
  });

  test("a coordinator lands with the coordinator role", () => {
    let id = makeUser("Dana D", "coordinator");

    equal(signin(emailOf(id), "password1"), "coordinator");
  });

  test("a wrong password is refused without saying which part was wrong", () => {
    let id = makeUser("Oz O");
    let err: unknown;

    try {
      signin(emailOf(id), "nope-nope");
    } catch (e) {
      err = e;
    }

    assert(err instanceof AuthError, `got ${err}`);
    equal((err as Error).message, "That email and password don't match.");
    assert(!session.isLoggedIn());
  });
});
