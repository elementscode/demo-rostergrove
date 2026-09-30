import { sql, session, AuthError, ForbiddenError, ValidationError, redirect } from "@elements/app";

export const MIN_PASSWORD = 8;

export interface SignupForm {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface SessionUser {
  id: string;
  name: string;
  role: "volunteer" | "coordinator";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/** Keeps the digits and a leading +, so "(312) 555-0142" and "312.555.0142" match. */
export function normalizePhone(phone: string): string {
  let trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, "");

  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

/** @rpc */
export function signin(email: string, password: string): SessionUser["role"] {
  let address = normalizeEmail(email);

  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  let user = sql<SessionUser>(
    `select id, name, role from users
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)`,
  ).first();

  if (!user) {
    throw new AuthError("That email and password don't match.");
  }

  session.login({ userId: user.id, userName: user.name, role: user.role });

  return user.role;
}

/** @rpc */
export function signup(form: SignupForm) {
  let name = form.name.trim();
  let address = normalizeEmail(form.email);
  let phone = normalizePhone(form.phone);
  let errors: Partial<Record<keyof SignupForm, string[]>> = {};

  if (!name) {
    errors.name = ["Enter your name."];
  }

  if (!isEmail(address)) {
    errors.email = ["Enter a valid email address."];
  }

  if (phone.replace("+", "").length < 10) {
    errors.phone = ["Enter a phone number we can reach you on."];
  }

  if (form.password.length < MIN_PASSWORD) {
    errors.password = [`Use at least ${MIN_PASSWORD} characters.`];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  let taken = !sql(`select 1 from users where email = ${address}`).empty();

  if (taken) {
    throw new ValidationError({ email: ["That email is already registered. Sign in instead."] });
  }

  let user = sql<{ id: string }>(
    `insert into users (name, email, phone, passwordHash)
     values (${name}, ${address}, ${phone}, crypt(${form.password}, genSalt('bf', 12)))
     returning id`,
  ).firstOrThrow();

  session.login({ userId: user.id, userName: name, role: "volunteer" });
}

/** @rpc */
export function signout() {
  session.logout();
}

/** The signed-in user's id, or a 401. */
export function currentUserIdOrThrow(): string {
  session.isLoggedInOrThrow();

  return session.getOrThrow("userId");
}

/** Checks the role against the database, not the session, so a demotion takes effect at once. */
export function isCoordinator(userId: string): boolean {
  return !sql(`select 1 from users where id = ${userId} and role = 'coordinator'`).empty();
}

export function coordinatorOrThrow(): string {
  let userId = currentUserIdOrThrow();

  if (!isCoordinator(userId)) {
    throw new ForbiddenError("Coordinator access required.");
  }

  return userId;
}

/** For a page route: sends a signed-out visitor to sign in and returns false. */
export function requireSignin(): boolean {
  if (!session.isLoggedIn()) {
    redirect("/signin");

    return false;
  }

  return true;
}

/** For a coordinator page route: redirects anyone else and returns false. */
export function requireCoordinator(): boolean {
  if (!requireSignin()) {
    return false;
  }

  if (!isCoordinator(session.getOrThrow("userId"))) {
    redirect("/");

    return false;
  }

  return true;
}
