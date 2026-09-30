import { test, assert, equal, session, AuthError } from "@elements/app";
import { signin } from "#app/shared/services/auth";
import { makeUser } from "#app/shared/services/fixtures";

test("signin", () => {
  test("signs a volunteer in and reports the role", () => {
    let id = makeUser("Nia N");

    equal(signin(" Nia.N@test.example ", "password1"), "volunteer");
    equal(session.get("userId"), id);
    equal(session.get("role"), "volunteer");
  });

  test("a coordinator lands with the coordinator role", () => {
    makeUser("Dana D", "coordinator");

    equal(signin("dana.d@test.example", "password1"), "coordinator");
  });

  test("a wrong password is refused without saying which part was wrong", () => {
    makeUser("Oz O");
    let err: unknown;

    try {
      signin("oz.o@test.example", "nope-nope");
    } catch (e) {
      err = e;
    }

    assert(err instanceof AuthError, `got ${err}`);
    equal((err as Error).message, "That email and password don't match.");
    assert(!session.isLoggedIn());
  });
});
