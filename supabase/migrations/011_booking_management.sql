-- 011: rules for managing bookings. Run after 010.
-- Replaces the booking status rules from 002 with clearer ones, and logs every status change.

create or replace function public.check_booking_transition()
returns trigger language plpgsql set search_path = public as $$
declare today date := (now() at time zone 'Africa/Lagos')::date;
begin
  -- Customer details can never be edited after submission, only the handling fields can.
  if new.full_name <> old.full_name or new.email <> old.email or new.phone <> old.phone
     or new.service_id <> old.service_id or new.address <> old.address
     or new.description <> old.description or new.reference <> old.reference then
    raise exception 'The customer''s original booking details cannot be changed.';
  end if;

  if new.status = old.status then
    -- Moving the date of an active booking is allowed only through a reschedule.
    if (new.preferred_date <> old.preferred_date or new.preferred_time is distinct from old.preferred_time) then
      raise exception 'To change the date or time, propose a reschedule instead.';
    end if;
    return new;
  end if;

  if not (
    (old.status = 'pending_review'      and new.status in ('confirmed','reschedule_proposed','declined','cancelled')) or
    (old.status = 'reschedule_proposed' and new.status in ('confirmed','declined','cancelled','pending_review')) or
    (old.status = 'confirmed'           and new.status in ('completed','cancelled','reschedule_proposed')) or
    (old.status = 'declined'            and new.status = 'pending_review')
  ) then
    raise exception 'A booking cannot move from "%" to "%".', replace(old.status,'_',' '), replace(new.status,'_',' ');
  end if;

  if new.status = 'reschedule_proposed' then
    if new.proposed_date is null then raise exception 'Choose the new date to propose.'; end if;
    if new.proposed_date < today then raise exception 'The proposed date cannot be in the past.'; end if;
  end if;

  if new.status = 'confirmed' then
    -- Confirming after a proposal means the customer agreed: the proposed slot becomes the booking.
    if old.status = 'reschedule_proposed' then
      new.preferred_date := old.proposed_date;
      new.preferred_time := old.proposed_time;
      new.proposed_date := null;
      new.proposed_time := null;
    end if;
    if new.preferred_date < today then raise exception 'This booking date has already passed, so it cannot be confirmed.'; end if;
    new.confirmed_at := now();
  end if;

  if new.status = 'completed' and old.preferred_date > today then
    raise exception 'A booking cannot be marked completed before its date (%).', old.preferred_date;
  end if;

  if new.status = 'pending_review' then
    new.confirmed_at := null;
  end if;
  return new;
end $$;

-- Every status change is written to the activity log (no personal details are stored).
create or replace function public.log_booking_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.activity_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'booking_status_changed', 'booking', new.id,
            jsonb_build_object('reference', new.reference, 'from', old.status, 'to', new.status));
  end if;
  return null;
end $$;

drop trigger if exists bookings_log on public.bookings;
create trigger bookings_log after update on public.bookings
for each row execute function public.log_booking_status_change();
