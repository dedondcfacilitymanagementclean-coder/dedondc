-- 003: Row Level Security + safe public submission functions. Run after 002.

alter table public.services          enable row level security;
alter table public.site_settings     enable row level security;
alter table public.projects          enable row level security;
alter table public.quote_requests    enable row level security;
alter table public.quotations        enable row level security;
alter table public.bookings          enable row level security;
alter table public.contact_enquiries enable row level security;
alter table public.email_logs        enable row level security;
alter table public.activity_logs     enable row level security;

-- PUBLIC (anon + signed-in visitors): published content only
create policy "public read published services" on public.services
  for select to anon, authenticated using (is_published);
create policy "public read published projects" on public.projects
  for select to anon, authenticated using (is_published);
create policy "public read public settings" on public.site_settings
  for select to anon, authenticated using (is_public);

-- ADMIN: full access, enforced in the database by is_admin()
create policy "admin all services"  on public.services          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all settings"  on public.site_settings     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all projects"  on public.projects          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all quotes"    on public.quote_requests    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all quotations" on public.quotations       for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all bookings"  on public.bookings          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all enquiries" on public.contact_enquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin read emails"   on public.email_logs        for select to authenticated using (public.is_admin());
create policy "admin read activity" on public.activity_logs     for select to authenticated using (public.is_admin());
create policy "admin write activity" on public.activity_logs    for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());

-- No anon INSERT/SELECT policies exist on customer tables: visitors can only submit
-- through the functions below, which validate input and rate-limit by email.

create or replace function public.submit_contact(
  p_name text, p_email text, p_phone text, p_subject text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from contact_enquiries
      where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many messages. Please try again later.';
  end if;
  insert into contact_enquiries (name, email, phone, subject, message)
  values (trim(p_name), lower(trim(p_email)), nullif(trim(p_phone),''), trim(p_subject), trim(p_message));
end $$;

create or replace function public.submit_quote_request(
  p_full_name text, p_email text, p_phone text, p_preferred_contact text, p_service_id uuid,
  p_property_type text, p_location text, p_property_size text, p_preferred_date date,
  p_description text, p_attachments text[], p_consent boolean)
returns text language plpgsql security definer set search_path = public as $$
declare ref text;
begin
  if not exists (select 1 from services where id = p_service_id and is_published) then
    raise exception 'Please choose a valid service.';
  end if;
  if p_preferred_date is not null and p_preferred_date < current_date then
    raise exception 'Preferred date cannot be in the past.';
  end if;
  if coalesce(array_length(p_attachments,1),0) > 5 then
    raise exception 'A maximum of 5 files is allowed.';
  end if;
  if exists (select 1 from unnest(coalesce(p_attachments,'{}')) a where a !~ '^incoming/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$') then
    raise exception 'Invalid attachment.';
  end if;
  if (select count(*) from quote_requests
      where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many requests. Please try again later.';
  end if;
  insert into quote_requests (full_name,email,phone,preferred_contact,service_id,property_type,
    location,property_size,preferred_date,description,attachments,consent_given)
  values (trim(p_full_name), lower(trim(p_email)), trim(p_phone), p_preferred_contact, p_service_id,
    trim(p_property_type), trim(p_location), nullif(trim(p_property_size),''), p_preferred_date,
    trim(p_description), coalesce(p_attachments,'{}'), p_consent)
  returning reference into ref;
  return ref;
end $$;

create or replace function public.submit_booking(
  p_full_name text, p_email text, p_phone text, p_service_id uuid, p_address text,
  p_property_type text, p_preferred_date date, p_preferred_time text, p_description text,
  p_instructions text, p_attachments text[], p_consent boolean)
returns text language plpgsql security definer set search_path = public as $$
declare ref text;
begin
  if not exists (select 1 from services where id = p_service_id and is_published) then
    raise exception 'Please choose a valid service.';
  end if;
  if p_preferred_date < current_date then
    raise exception 'Preferred date cannot be in the past.';
  end if;
  if coalesce(array_length(p_attachments,1),0) > 5 then
    raise exception 'A maximum of 5 files is allowed.';
  end if;
  if exists (select 1 from unnest(coalesce(p_attachments,'{}')) a where a !~ '^incoming/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$') then
    raise exception 'Invalid attachment.';
  end if;
  if (select count(*) from bookings
      where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many requests. Please try again later.';
  end if;
  insert into bookings (full_name,email,phone,service_id,address,property_type,preferred_date,
    preferred_time,description,instructions,attachments,consent_given)
  values (trim(p_full_name), lower(trim(p_email)), trim(p_phone), p_service_id, trim(p_address),
    trim(p_property_type), p_preferred_date, nullif(trim(p_preferred_time),''), trim(p_description),
    nullif(trim(p_instructions),''), coalesce(p_attachments,'{}'), p_consent)
  returning reference into ref;
  return ref;
end $$;

revoke all on function public.submit_contact(text,text,text,text,text) from public;
revoke all on function public.submit_quote_request(text,text,text,text,uuid,text,text,text,date,text,text[],boolean) from public;
revoke all on function public.submit_booking(text,text,text,uuid,text,text,date,text,text,text,text[],boolean) from public;
grant execute on function public.submit_contact(text,text,text,text,text) to anon, authenticated;
grant execute on function public.submit_quote_request(text,text,text,text,uuid,text,text,text,date,text,text[],boolean) to anon, authenticated;
grant execute on function public.submit_booking(text,text,text,uuid,text,text,date,text,text,text,text[],boolean) to anon, authenticated;
