import { test, assert, equal, sql, session, ValidationError } from "@elements/app";
import { signup, normalizePhone } from "#app/shared/services/auth";
import { makeUser } from "#app/shared/services/fixtures";

test("signup", () => {
  test("creates a volunteer with name, email and phone, and signs them in", () => {
    signup({ name: " Pat Park ", email: "Pat@Example.org", phone: "(312) 555-0199", password: "longenough" });

    let user = sql<{ name: string; email: string; phone: string; role: string }>(`
      select name, email, phone, role from users where email = 'pat@example.org'
    `).firstOrThrow();

    equal(user, { name: "Pat Park", email: "pat@example.org", phone: "3125550199", role: "volunteer" });
    equal(session.get("userName"), "Pat Park");
  });

  test("reports every bad field at once", () => {
    let err: unknown;

    try {
      signup({ name: "", email: "not-an-email", phone: "12", password: "short" });
    } catch (e) {
      err = e;
    }

    assert(err instanceof ValidationError, `got ${err}`);
    equal(Object.keys((err as ValidationError<any>).errors ?? {}).sort(), ["email", "name", "password", "phone"]);
  });

  test("refuses an email already registered", () => {
    makeUser("Quin Q");
    let err: unknown;

    try {
      signup({ name: "Quin Again", email: "quin.q@test.example", phone: "3125550100", password: "longenough" });
    } catch (e) {
      err = e;
    }

    assert(err instanceof ValidationError, `got ${err}`);
  });

  test("phone numbers keep their digits", () => {
    equal(normalizePhone("312.555.0142"), "3125550142");
    equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
  });
});
