-- add rostergrove schema

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create type userRole as enum ('volunteer', 'coordinator');
create type shiftKind as enum ('sorting', 'packing', 'delivery');
create type signupStatus as enum ('confirmed', 'waitlist');

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null,
  email text not null unique,
  phone text not null default '',
  passwordHash text not null,
  role userRole not null default 'volunteer'
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table shifts (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  kind shiftKind not null,
  startsAt timestamptz not null,
  endsAt timestamptz not null,
  location text not null,
  capacity int not null check (capacity > 0),
  seriesId uuid,
  check (endsAt > startsAt)
);

create index shiftsStartsAt on shifts (startsAt);

create trigger shiftsTouchUpdatedAt
  before update on shifts
  for each row execute function touchUpdatedAt();

create table signups (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  shiftId uuid not null references shifts (id) on delete cascade,
  userId uuid not null references users (id) on delete cascade,
  status signupStatus not null default 'confirmed',
  checkedInAt timestamptz,
  remindedAt timestamptz,
  unique (shiftId, userId)
);

create index signupsUserId on signups (userId);

create trigger signupsTouchUpdatedAt
  before update on signups
  for each row execute function touchUpdatedAt();

-- Broadcast every write to the pages watching these tables, whatever wrote
-- it: an rpc, the reminder job, the seed, or psql. See
-- `elements man recipes/live-from-sql`.

create or replace function jsDate(t timestamptz) returns json
language sql immutable as $$
  select case when t is null then 'null'::json
    else json_build_object('$type', 'Date', '$value', (extract(epoch from t) * 1000)::bigint)
  end;
$$;

create or replace function shiftsNotify() returns trigger
language plpgsql as $$
declare
  r record;
  payload text;
begin
  r := coalesce(new, old);

  payload := json_build_object(
    'op', lower(tg_op),
    'data', json_build_object(
      'id', r.id,
      'kind', r.kind,
      'startsAt', jsDate(r.startsAt),
      'endsAt', jsDate(r.endsAt),
      'location', r.location,
      'capacity', r.capacity,
      'seriesId', r.seriesId
    )
  )::text;

  perform pg_notify(channel_name('shifts'), payload);

  return r;
end;
$$;

create trigger shiftsNotifyTrigger
  after insert or update or delete on shifts
  for each row execute function shiftsNotify();

-- Two channels: `signups` is what every volunteer's browser hears, so it
-- carries no contact details. `roster` is coordinator-only and carries the
-- volunteer's name and phone for the check-in sheet.
create or replace function signupsNotify() returns trigger
language plpgsql as $$
declare
  r record;
  u record;
  op text;
  roster text;
begin
  r := coalesce(new, old);
  op := lower(tg_op);

  perform pg_notify(channel_name('signups'), json_build_object(
    'op', op,
    'data', json_build_object(
      'id', r.id,
      'shiftId', r.shiftId,
      'userId', r.userId,
      'status', r.status,
      'checkedInAt', jsDate(r.checkedInAt),
      'createdAt', jsDate(r.createdAt)
    )
  )::text);

  select name, email, phone into u from users where id = r.userId;

  roster := json_build_object(
    'op', op,
    'data', json_build_object(
      'id', r.id,
      'shiftId', r.shiftId,
      'userId', r.userId,
      'status', r.status,
      'checkedInAt', jsDate(r.checkedInAt),
      'createdAt', jsDate(r.createdAt),
      'name', coalesce(u.name, ''),
      'email', coalesce(u.email, ''),
      'phone', coalesce(u.phone, '')
    )
  )::text;

  perform pg_notify(channel_name('roster'), roster);

  return r;
end;
$$;

create trigger signupsNotifyTrigger
  after insert or update or delete on signups
  for each row execute function signupsNotify();
