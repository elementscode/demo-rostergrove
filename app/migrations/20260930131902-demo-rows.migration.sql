-- demo rows: one coordinator, fifteen volunteers, sixteen weeks of past
-- shifts with hours served, and two weeks of upcoming shifts with signups.

insert into users (name, email, phone, role, passwordHash) values
  ('Dana Whitfield', 'coordinator@rostergrove.org', '3125550100', 'coordinator', crypt('coordinator', gen_salt('bf', 8)));

insert into users (name, email, phone, passwordHash)
select v.name, v.email, v.phone, crypt('volunteer', gen_salt('bf', 8))
from (values
  ('Maya Okafor',      'maya@example.org',    '3125550111'),
  ('Luis Hernández',   'luis@example.org',    '3125550112'),
  ('Priya Raman',      'priya@example.org',   '3125550113'),
  ('Tom Becker',       'tom@example.org',     '3125550114'),
  ('Aisha Mohammed',   'aisha@example.org',   '3125550115'),
  ('Ben Carter',       'ben@example.org',     '3125550116'),
  ('Grace Liu',        'grace@example.org',   '3125550117'),
  ('Sam Novak',        'sam@example.org',     '3125550118'),
  ('Rosa Delgado',     'rosa@example.org',    '3125550119'),
  ('Kwame Asante',     'kwame@example.org',   '3125550120'),
  ('Hannah Schultz',   'hannah@example.org',  '3125550121'),
  ('Diego Morales',    'diego@example.org',   '3125550122'),
  ('Ellie Park',       'ellie@example.org',   '3125550123'),
  ('Marcus Reed',      'marcus@example.org',  '3125550124'),
  ('Nora Quinn',       'nora@example.org',    '3125550125')
) as v(name, email, phone);

do $$
declare
  tz constant text := 'America/Chicago';
  today date := (now() at time zone tz)::date;
  slot record;
  shift record;
  d date;
  series uuid;
  target int;
  k int := 0;
begin
  -- Same draws on every run, so a fresh seed looks like the screenshots.
  perform setseed(0.42);

  -- The weekly schedule. isodow: 1 is Monday.
  for slot in
    select * from (values
      (1, 'sorting',  time '09:00', time '12:00', 'Main Warehouse · 41 Oak St', 6),
      (2, 'packing',  time '13:00', time '16:00', 'Main Warehouse · 41 Oak St', 8),
      (2, 'delivery', time '10:00', time '14:00', 'Delivery Depot · 9 Mill Rd',      3),
      (3, 'sorting',  time '09:00', time '12:00', 'Main Warehouse · 41 Oak St', 6),
      (3, 'packing',  time '17:30', time '20:00', 'Eastside Pantry · 22 Linden Ave', 5),
      (4, 'packing',  time '13:00', time '16:00', 'Main Warehouse · 41 Oak St', 8),
      (4, 'delivery', time '10:00', time '14:00', 'Delivery Depot · 9 Mill Rd',      3),
      (5, 'sorting',  time '09:00', time '12:00', 'Main Warehouse · 41 Oak St', 6),
      (6, 'packing',  time '09:00', time '12:00', 'Eastside Pantry · 22 Linden Ave', 5),
      (6, 'delivery', time '09:00', time '13:00', 'Delivery Depot · 9 Mill Rd',      4)
    ) as t(dow, kind, startTime, endTime, location, capacity)
  loop
    series := uuid_generate_v7();

    for d in select g::date from generate_series(today - 112, today + 13, interval '1 day') g loop
      if extract(isodow from d) = slot.dow then
        insert into shifts (kind, startsAt, endsAt, location, capacity, seriesId)
        values (slot.kind::shiftKind, (d + slot.startTime) at time zone tz,
                (d + slot.endTime) at time zone tz, slot.location, slot.capacity, series);
      end if;
    end loop;
  end loop;

  for shift in select * from shifts order by startsAt loop
    if shift.endsAt < now() then
      -- Past: nearly full, and most of those who signed up showed up.
      insert into signups (shiftId, userId, status, checkedInAt, createdAt)
      select shift.id, u.id, 'confirmed',
             case when random() < 0.88 then shift.startsAt - interval '5 minutes' + random() * interval '15 minutes' end,
             shift.startsAt - interval '6 days' + random() * interval '5 days'
      from users u
      where u.role = 'volunteer'
      order by random()
      limit greatest(1, shift.capacity - 1 - floor(random() * 3)::int);
    else
      -- Upcoming: a fixed rotation of full with a waitlist, just full, and
      -- short, so the next few days always show all three.
      target := case k % 9
        when 0 then shift.capacity + 1
        when 1 then greatest(1, shift.capacity / 2)
        when 2 then shift.capacity + 2
        when 3 then shift.capacity - 1
        when 4 then shift.capacity
        when 5 then greatest(1, floor(shift.capacity * 0.4)::int)
        when 6 then shift.capacity + 1
        when 7 then shift.capacity
        else greatest(1, shift.capacity - 2)
      end;
      k := k + 1;

      insert into signups (shiftId, userId, status, createdAt)
      select shift.id, picked.id,
             case when picked.n <= shift.capacity then 'confirmed'::signupStatus else 'waitlist'::signupStatus end,
             now() - interval '4 days' + picked.n * interval '37 minutes'
      from (
        select u.id, row_number() over (order by random()) as n
        from users u
        where u.role = 'volunteer'
      ) picked
      where picked.n <= target;
    end if;
  end loop;
end;
$$;
