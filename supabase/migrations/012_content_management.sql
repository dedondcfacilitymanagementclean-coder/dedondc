-- 012: safe reordering, activity logging for content changes, and enquiry rules. Run after 011.

-- 1. Move an item up or down in the public list (services, projects or testimonials).
create or replace function public.move_item(p_table text, p_id uuid, p_direction text)
returns void language plpgsql security definer set search_path = public as $$
declare cur int; other_id uuid; target int;
begin
  if not public.is_admin() then raise exception 'Not allowed.'; end if;
  if p_table not in ('services','projects','testimonials') then raise exception 'Unknown list.'; end if;
  if p_direction not in ('up','down') then raise exception 'Direction must be up or down.'; end if;
  -- number everything 1..n in the current order, so swapping neighbours is always exact
  execute format('update public.%1$I t set sort_order = o.rn from
                  (select id, row_number() over (order by sort_order, created_at, id) as rn from public.%1$I) o
                  where o.id = t.id and t.sort_order <> o.rn', p_table);
  execute format('select sort_order from public.%I where id = $1', p_table) into cur using p_id;
  if cur is null then raise exception 'Item not found.'; end if;
  target := case when p_direction = 'up' then cur - 1 else cur + 1 end;
  execute format('select id from public.%I where sort_order = $1', p_table) into other_id using target;
  if other_id is null then return; end if;   -- already first or last
  execute format('update public.%I set sort_order = $1 where id = $2', p_table) using cur, other_id;
  execute format('update public.%I set sort_order = $1 where id = $2', p_table) using target, p_id;
  insert into public.activity_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'item_reordered', p_table, p_id, jsonb_build_object('direction', p_direction));
end $$;
revoke all on function public.move_item(text, uuid, text) from public, anon;
grant execute on function public.move_item(text, uuid, text) to authenticated;

-- 2. Content changes are logged by the database itself (only titles/keys, never customer details).
create or replace function public.log_content_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ent text := tg_argv[0];
  rec jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  verb text; details jsonb := '{}';
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'sort_order' - 'updated_at') = (to_jsonb(old) - 'sort_order' - 'updated_at') then return null; end if;
    if new.is_published is distinct from old.is_published then
      verb := case when new.is_published then 'published' else 'unpublished' end;
    else verb := 'updated'; end if;
  elsif tg_op = 'INSERT' then verb := 'created';
  else verb := 'deleted'; end if;
  if rec ? 'title' then details := jsonb_build_object('title', rec->>'title'); end if;
  insert into public.activity_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), ent || '_' || verb, ent, (rec->>'id')::uuid, details);
  return null;
end $$;

create or replace function public.log_testimonial_change()   -- no names or messages in the log
returns trigger language plpgsql security definer set search_path = public as $$
declare rec record; verb text;
begin
  rec := case when tg_op = 'DELETE' then old else new end;
  if tg_op = 'UPDATE' then
    if new.is_published is distinct from old.is_published then
      verb := case when new.is_published then 'published' else 'unpublished' end;
    elsif (to_jsonb(new) - 'sort_order' - 'updated_at') = (to_jsonb(old) - 'sort_order' - 'updated_at') then return null;
    else verb := 'updated'; end if;
  elsif tg_op = 'INSERT' then verb := 'created'; else verb := 'deleted'; end if;
  insert into public.activity_logs (actor_id, action, entity, entity_id) values (auth.uid(), 'testimonial_' || verb, 'testimonial', rec.id);
  return null;
end $$;

create or replace function public.log_setting_change()        -- only the key, never the text
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.value = old.value then return null; end if;
  insert into public.activity_logs (actor_id, action, entity, details)
  values (auth.uid(), 'content_updated', 'site_setting', jsonb_build_object('key', coalesce(new.key, old.key)));
  return null;
end $$;

create or replace function public.log_enquiry_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status or new.archived is distinct from old.archived then
    insert into public.activity_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'enquiry_updated', 'contact_enquiry', new.id,
            jsonb_build_object('from', old.status, 'to', new.status, 'archived', new.archived));
  end if;
  return null;
end $$;

drop trigger if exists services_log on public.services;
create trigger services_log after insert or update or delete on public.services
for each row execute function public.log_content_change('service');
drop trigger if exists projects_log on public.projects;
create trigger projects_log after insert or update or delete on public.projects
for each row execute function public.log_content_change('project');
drop trigger if exists testimonials_log on public.testimonials;
create trigger testimonials_log after insert or update or delete on public.testimonials
for each row execute function public.log_testimonial_change();
drop trigger if exists site_settings_log on public.site_settings;
create trigger site_settings_log after insert or update on public.site_settings
for each row execute function public.log_setting_change();
drop trigger if exists enquiries_log on public.contact_enquiries;
create trigger enquiries_log after update on public.contact_enquiries
for each row execute function public.log_enquiry_change();

-- 3. A message from a customer can never be edited by anyone; only its handling fields change.
create or replace function public.protect_enquiry()
returns trigger language plpgsql as $$
begin
  if new.name <> old.name or new.email <> old.email or new.subject <> old.subject or new.message <> old.message
     or new.phone is distinct from old.phone then
    raise exception 'The customer''s original message cannot be changed.';
  end if;
  return new;
end $$;
drop trigger if exists enquiries_protect on public.contact_enquiries;
create trigger enquiries_protect before update on public.contact_enquiries
for each row execute function public.protect_enquiry();

-- 4. Sensible limits on content
alter table public.projects drop constraint if exists projects_description_len;
alter table public.projects add constraint projects_description_len check (char_length(description) <= 2000);
alter table public.services drop constraint if exists services_description_len;
alter table public.services add constraint services_description_len check (char_length(description) <= 6000);
