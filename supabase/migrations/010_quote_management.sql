-- 010: rules and safe actions for managing quote requests and quotations. Run after 009.

-- 1. Basic sanity rules on quotations
alter table public.quotations
  add constraint quotations_amount_positive check (amount > 0),
  add constraint quotations_description_len check (char_length(description) between 10 and 2000);

-- 2. A quote request can only move along allowed steps, and "prepared"/"sent" must be true
create or replace function public.check_quote_transition()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'new'                and new.status in ('under_review','quotation_prepared','declined','closed')) or
    (old.status = 'under_review'       and new.status in ('quotation_prepared','declined','closed')) or
    (old.status = 'quotation_prepared' and new.status in ('quotation_sent','under_review','declined','closed')) or
    (old.status = 'quotation_sent'     and new.status in ('accepted','declined','closed','quotation_prepared')) or
    (old.status = 'accepted'           and new.status = 'closed') or
    (old.status = 'declined'           and new.status in ('under_review','closed')) or
    (old.status = 'closed'             and new.status = 'under_review')
  ) then
    raise exception 'A request cannot move from "%" to "%".', replace(old.status,'_',' '), replace(new.status,'_',' ');
  end if;
  if new.status = 'quotation_prepared'
     and not exists (select 1 from public.quotations where quote_request_id = new.id) then
    raise exception 'Create a quotation before setting the status to "quotation prepared".';
  end if;
  if new.status = 'quotation_sent'
     and not exists (select 1 from public.quotations where quote_request_id = new.id and sent_at is not null) then
    raise exception 'Mark a quotation as sent before setting the status to "quotation sent".';
  end if;
  return new;
end $$;

drop trigger if exists quote_requests_transition on public.quote_requests;
create trigger quote_requests_transition before update on public.quote_requests
for each row execute function public.check_quote_transition();

-- 3. Every status change is written to the activity log (no personal details are stored)
create or replace function public.log_quote_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.activity_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'quote_status_changed', 'quote_request', new.id,
            jsonb_build_object('reference', new.reference, 'from', old.status, 'to', new.status));
  end if;
  return null;
end $$;

drop trigger if exists quote_requests_log on public.quote_requests;
create trigger quote_requests_log after update on public.quote_requests
for each row execute function public.log_quote_status_change();

-- 4. A quotation that has been sent can never be changed or deleted (it is the customer's record)
create or replace function public.protect_sent_quotation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.sent_at is not null then
      raise exception 'A quotation that has been sent cannot be deleted.';
    end if;
    return old;
  end if;
  if old.sent_at is not null and (
       new.sent_at is distinct from old.sent_at or new.amount <> old.amount
    or new.currency <> old.currency or new.description <> old.description
    or new.expires_on is distinct from old.expires_on or new.quote_request_id <> old.quote_request_id) then
    raise exception 'A quotation that has been sent cannot be changed. Create a new quotation instead.';
  end if;
  return new;
end $$;

drop trigger if exists quotations_protect on public.quotations;
create trigger quotations_protect before update or delete on public.quotations
for each row execute function public.protect_sent_quotation();

-- 5. Safe administrator actions. Each checks is_admin() itself and changes everything in one step.
create or replace function public.create_quotation(
  p_request_id uuid, p_amount numeric, p_currency text, p_description text, p_expires_on date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_status text; v_ref text; v_id uuid; v_qref text;
begin
  if not public.is_admin() then raise exception 'You are not authorised to do this.'; end if;
  select status, reference into v_status, v_ref from public.quote_requests where id = p_request_id for update;
  if v_status is null then raise exception 'That quote request was not found.'; end if;
  if v_status in ('accepted','declined','closed') then
    raise exception 'A quotation cannot be created while the request is "%".', replace(v_status,'_',' ');
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount greater than zero.'; end if;
  if p_amount >= 1000000000000 then raise exception 'That amount is too large.'; end if;
  if p_currency is null or p_currency not in ('NGN','USD','GBP','EUR') then raise exception 'Choose a valid currency.'; end if;
  if char_length(trim(coalesce(p_description,''))) < 10 or char_length(trim(p_description)) > 2000 then
    raise exception 'Describe the quoted work in 10 to 2000 characters.';
  end if;
  if p_expires_on is not null and p_expires_on < (now() at time zone 'Africa/Lagos')::date then
    raise exception 'The expiry date cannot be in the past.';
  end if;

  insert into public.quotations (quote_request_id, amount, currency, description, expires_on, created_by)
  values (p_request_id, round(p_amount, 2), p_currency, trim(p_description), p_expires_on, auth.uid())
  returning id, reference into v_id, v_qref;

  if v_status in ('new','under_review','quotation_sent') then
    update public.quote_requests set status = 'quotation_prepared' where id = p_request_id;
  end if;

  insert into public.activity_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'quotation_created', 'quotation', v_id, jsonb_build_object('reference', v_qref, 'request', v_ref));
  return v_id;
end $$;

create or replace function public.send_quotation(p_quotation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_sent timestamptz; v_exp date; v_qref text; v_status text;
begin
  if not public.is_admin() then raise exception 'You are not authorised to do this.'; end if;
  select quote_request_id, sent_at, expires_on, reference into v_req, v_sent, v_exp, v_qref
    from public.quotations where id = p_quotation_id for update;
  if v_req is null then raise exception 'That quotation was not found.'; end if;
  if v_sent is not null then raise exception 'This quotation is already marked as sent.'; end if;
  if v_exp is not null and v_exp < (now() at time zone 'Africa/Lagos')::date then
    raise exception 'This quotation has expired. Create a new one.';
  end if;
  select status into v_status from public.quote_requests where id = v_req for update;
  if v_status not in ('quotation_prepared','quotation_sent') then
    raise exception 'Set the request to "quotation prepared" before sending a quotation.';
  end if;

  update public.quotations set sent_at = now() where id = p_quotation_id;
  if v_status = 'quotation_prepared' then
    update public.quote_requests set status = 'quotation_sent' where id = v_req;
  end if;

  insert into public.activity_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'quotation_sent', 'quotation', p_quotation_id, jsonb_build_object('reference', v_qref));
end $$;

create or replace function public.delete_quotation(p_quotation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_req uuid; v_sent timestamptz; v_qref text;
begin
  if not public.is_admin() then raise exception 'You are not authorised to do this.'; end if;
  select quote_request_id, sent_at, reference into v_req, v_sent, v_qref
    from public.quotations where id = p_quotation_id for update;
  if v_req is null then raise exception 'That quotation was not found.'; end if;
  if v_sent is not null then raise exception 'A quotation that has been sent cannot be deleted.'; end if;

  delete from public.quotations where id = p_quotation_id;
  if not exists (select 1 from public.quotations where quote_request_id = v_req) then
    update public.quote_requests set status = 'under_review' where id = v_req and status = 'quotation_prepared';
  end if;

  insert into public.activity_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'quotation_deleted', 'quotation', p_quotation_id, jsonb_build_object('reference', v_qref));
end $$;

revoke all on function public.create_quotation(uuid,numeric,text,text,date) from public, anon;
revoke all on function public.send_quotation(uuid) from public, anon;
revoke all on function public.delete_quotation(uuid) from public, anon;
grant execute on function public.create_quotation(uuid,numeric,text,text,date) to authenticated;
grant execute on function public.send_quotation(uuid) to authenticated;
grant execute on function public.delete_quotation(uuid) to authenticated;
