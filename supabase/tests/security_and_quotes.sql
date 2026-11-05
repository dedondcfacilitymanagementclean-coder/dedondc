-- Database security and quotation tests. Runs everything inside one transaction and rolls it back,
-- so it leaves nothing behind. Run AFTER migrations 001-012. Any problem stops with "FAIL: ...".
-- Local:  psql -v ON_ERROR_STOP=1 -f supabase/tests/security_and_quotes.sql
\set ON_ERROR_STOP on
begin;

create schema t;
grant usage on schema t to public;
create table t.ids (name text primary key, id uuid);
grant all on t.ids to public;

-- Helpers: act as a visitor / signed-in user / admin, and check expected failures and counts
create function t.act(r text, uid uuid default null) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', coalesce(uid::text,''), true);
  perform set_config('request.jwt.claims', case when uid is null then '' else json_build_object('sub', uid)::text end, true);
  if r <> 'postgres' then execute format('set local role %I', r); end if;
end $$;

create function t.fails(q text, pattern text, label text) returns void language plpgsql as $$
declare msg text;
begin
  begin execute q; exception when others then msg := sqlerrm; end;
  if msg is null then raise exception 'FAIL: % (it was allowed but should be blocked)', label; end if;
  if msg !~* pattern then raise exception 'FAIL: % (blocked, but with unexpected message: %)', label, msg; end if;
  raise notice 'PASS: %', label;
end $$;

create function t.count_is(q text, n bigint, label text) returns void language plpgsql as $$
declare c bigint;
begin
  execute 'select count(*) from (' || q || ') s' into c;
  if c <> n then raise exception 'FAIL: % (expected %, got %)', label, n, c; end if;
  raise notice 'PASS: %', label;
end $$;

create function t.eq(actual text, expected text, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'FAIL: % (expected %, got %)', label, expected, actual; end if;
  raise notice 'PASS: %', label;
end $$;

-- Setup: one admin, one ordinary customer
select t.act('postgres');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','admin@test.local'),
                                          ('00000000-0000-0000-0000-0000000000c1','customer@test.local');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
insert into t.ids select 'svc', id from public.services where is_published limit 1;

-- ===== VISITOR (not signed in) =====
select t.act('anon');
select t.count_is('select 1 from public.services', 13, 'visitor sees the 13 published services');
select t.count_is('select 1 from public.testimonials', 4, 'visitor sees only the 4 published testimonials');
select t.count_is('select 1 from public.quote_requests', 0, 'visitor cannot list quote requests');
select t.count_is('select 1 from public.bookings', 0, 'visitor cannot list bookings');
select t.count_is('select 1 from public.contact_enquiries', 0, 'visitor cannot list enquiries');
select t.count_is('select 1 from public.quotations', 0, 'visitor cannot list quotations');
select t.count_is('select 1 from public.activity_logs', 0, 'visitor cannot read the activity log');
select t.count_is('select 1 from public.site_settings where not is_public', 0, 'visitor sees no private settings');
select t.fails($q$insert into public.quote_requests (full_name,email,phone,preferred_contact,service_id,property_type,location,description,consent_given)
  select 'Hacker','h@x.co','08130653226','email',id,'Office','Asaba','Direct insert attempt',true from public.services limit 1$q$,
  'row-level security|permission denied', 'visitor cannot insert directly into quote_requests');
update public.services set title = 'Hacked';
select t.count_is($q$select 1 from public.services where title = 'Hacked'$q$, 0, 'visitor update changed nothing');
select t.fails($q$select public.create_quotation(gen_random_uuid(), 100, 'NGN', 'Visitor quotation attempt', null)$q$, 'not authorised|permission denied', 'visitor cannot create quotations');

-- Visitor submits through the safe functions
select t.eq((select left(public.submit_quote_request('Ada Obi','ada@example.com','08130653226','whatsapp',(select id from t.ids where name='svc'),'Office','Asaba','3 rooms',null,'Clean a three-room office please','{}',true),3)), 'QR-', 'visitor can submit a quote request and gets a reference');
select t.fails($q$select public.submit_quote_request('Ada','ada@example.com','08130653226','email',(select id from t.ids where name='svc'),'Office','Asaba',null,date '2000-01-01','Past date should fail','{}',true)$q$, 'past', 'past preferred date is rejected');
select t.fails($q$select public.submit_quote_request('Ada','ada@example.com','08130653226','email',(select id from t.ids where name='svc'),'Office','Asaba',null,null,'Bad attachment path','{../../etc/passwd}',true)$q$, 'Invalid attachment', 'path-traversal attachment name is rejected');
select t.fails($q$select public.submit_quote_request('Ada','ada@example.com','08130653226','email',(select id from t.ids where name='svc'),'Office','Asaba',null,null,'No consent given here','{}',false)$q$, 'violates check|consent', 'submission without consent is rejected');
select public.submit_contact('Ada','ada@example.com','','Hello','A test message');
select public.submit_quote_request('Ada Obi','ada@example.com','08130653226','email',(select id from t.ids where name='svc'),'Office','Asaba',null,null,'Second request in the hour','{}',true);
select public.submit_quote_request('Ada Obi','ada@example.com','08130653226','email',(select id from t.ids where name='svc'),'Office','Asaba',null,null,'Third request in the hour','{}',true);
select public.submit_quote_request('Ada Obi','ada@example.com','08130653226','email',(select id from t.ids where name='svc'),'Office','Asaba',null,null,'Fourth request in the hour','{}',true);
select public.submit_quote_request('Ada Obi','ada@example.com','08130653226','email',(select id from t.ids where name='svc'),'Office','Asaba',null,null,'Fifth request in the hour','{}',true);
select t.fails($q$select public.submit_quote_request('Ada Obi','ada@example.com','08130653226','email',(select id from t.ids where name='svc'),'Office','Asaba',null,null,'Sixth request is spam','{}',true)$q$, 'Too many', 'the 6th request in an hour is rate-limited');

-- Private uploads
select t.fails($q$insert into storage.objects (bucket_id,name) values ('customer-uploads','other/file.jpg')$q$, 'row-level security', 'visitor cannot upload outside incoming/');
insert into storage.objects (bucket_id,name) values ('customer-uploads','incoming/11111111-1111-1111-1111-111111111111/a.jpg');
select t.count_is('select 1 from storage.objects', 0, 'visitor cannot read uploaded private files');
select t.fails($q$insert into storage.objects (bucket_id,name) values ('public-media','x.jpg')$q$, 'row-level security', 'visitor cannot upload to the public gallery bucket');

-- ===== ORDINARY SIGNED-IN CUSTOMER (not admin) =====
select t.act('authenticated','00000000-0000-0000-0000-0000000000c1');
select t.count_is('select 1 from public.quote_requests', 0, 'ordinary account cannot list quote requests');
select t.count_is('select 1 from public.contact_enquiries', 0, 'ordinary account cannot list enquiries');
select t.count_is('select 1 from storage.objects', 0, 'ordinary account cannot read private uploads');
select t.fails($q$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1'$q$, 'permission denied', 'ordinary account cannot make itself admin');
select t.fails($q$select public.create_quotation(gen_random_uuid(), 100, 'NGN', 'Customer quotation attempt', null)$q$, 'not authorised', 'ordinary account cannot create quotations');
select t.fails($q$select public.send_quotation(gen_random_uuid())$q$, 'not authorised', 'ordinary account cannot send quotations');

-- ===== ADMINISTRATOR =====
select t.act('authenticated','00000000-0000-0000-0000-0000000000a1');
insert into t.ids select 'req', id from public.quote_requests order by created_at limit 1;
select t.count_is('select 1 from public.quote_requests', 5, 'admin sees all quote requests');
select t.count_is('select 1 from public.contact_enquiries', 1, 'admin sees contact enquiries');
select t.count_is('select 1 from storage.objects', 1, 'admin can read private uploads');
select t.count_is('select 1 from public.testimonials', 5, 'admin also sees the unpublished testimonial');

-- status rules
select t.fails($q$update public.quote_requests set status = 'accepted' where id = (select id from t.ids where name='req')$q$, 'cannot move from', 'new -> accepted is blocked');
select t.fails($q$update public.quote_requests set status = 'quotation_sent' where id = (select id from t.ids where name='req')$q$, 'cannot move from|Mark a quotation', 'new -> quotation sent is blocked');
update public.quote_requests set status = 'under_review' where id = (select id from t.ids where name='req');
select t.fails($q$update public.quote_requests set status = 'quotation_prepared' where id = (select id from t.ids where name='req')$q$, 'Create a quotation first|Create a quotation before', '"prepared" without a quotation is blocked');

-- creating quotations
select t.fails($q$select public.create_quotation((select id from t.ids where name='req'), 0, 'NGN', 'Zero amount should fail', null)$q$, 'greater than zero', 'zero amount is rejected');
select t.fails($q$select public.create_quotation((select id from t.ids where name='req'), 5000, 'XXX', 'Bad currency should fail', null)$q$, 'valid currency', 'unknown currency is rejected');
select t.fails($q$select public.create_quotation((select id from t.ids where name='req'), 5000, 'NGN', 'short', null)$q$, 'Describe the quoted work', 'too-short description is rejected');
select t.fails($q$select public.create_quotation((select id from t.ids where name='req'), 5000, 'NGN', 'Expiry in the past fails', date '2020-01-01')$q$, 'cannot be in the past', 'past expiry date is rejected');
insert into t.ids select 'q1', public.create_quotation((select id from t.ids where name='req'), 150000.555, 'NGN', 'Office cleaning, 3 rooms, one visit.', current_date + 14);
select t.eq((select status from public.quote_requests where id=(select id from t.ids where name='req')), 'quotation_prepared', 'creating a quotation moves the request to "quotation prepared"');
select t.eq((select amount::text from public.quotations where id=(select id from t.ids where name='q1')), '150000.56', 'amount is stored to 2 decimal places');
select t.eq((select (select reference from public.quotations where id=(select id from t.ids where name='q1')) ~ '^QT-[0-9]{6}-[0-9A-F]{6}$')::text, 'true', 'quotation gets a unique reference');

-- sending
select public.send_quotation((select id from t.ids where name='q1'));
select t.eq((select status from public.quote_requests where id=(select id from t.ids where name='req')), 'quotation_sent', 'sending moves the request to "quotation sent"');
select t.eq((select (sent_at is not null)::text from public.quotations where id=(select id from t.ids where name='q1')), 'true', 'date sent is recorded');
select t.fails($q$select public.send_quotation((select id from t.ids where name='q1'))$q$, 'already marked as sent', 'a quotation cannot be sent twice');
select t.fails($q$update public.quotations set amount = 1 where id = (select id from t.ids where name='q1')$q$, 'cannot be changed', 'a sent quotation cannot be edited');
select t.fails($q$select public.delete_quotation((select id from t.ids where name='q1'))$q$, 'cannot be deleted', 'a sent quotation cannot be deleted');
select t.fails($q$delete from public.quotations where id = (select id from t.ids where name='q1')$q$, 'cannot be deleted', 'a sent quotation cannot be deleted directly either');

-- revision + deletion of an unsent revision
insert into t.ids select 'q2', public.create_quotation((select id from t.ids where name='req'), 140000, 'NGN', 'Revised price for the office clean.', null);
select t.eq((select status from public.quote_requests where id=(select id from t.ids where name='req')), 'quotation_prepared', 'a revision moves the request back to "quotation prepared"');
select public.delete_quotation((select id from t.ids where name='q2'));
select t.count_is($q$select 1 from public.quotations where id=(select id from t.ids where name='q2')$q$, 0, 'an unsent quotation can be deleted');

-- outcome and closing
update public.quote_requests set status = 'quotation_sent' where id = (select id from t.ids where name='req');
update public.quote_requests set status = 'accepted' where id = (select id from t.ids where name='req');
select t.fails($q$select public.create_quotation((select id from t.ids where name='req'), 1000, 'NGN', 'Not allowed after accepted', null)$q$, 'cannot be created while', 'no new quotation once accepted');
update public.quote_requests set status = 'closed' where id = (select id from t.ids where name='req');

-- activity log
select t.count_is($q$select 1 from public.activity_logs where action = 'quote_status_changed' and details ? 'reference'$q$, 7, 'every status change is logged');
select t.count_is($q$select 1 from public.activity_logs where action in ('quotation_created','quotation_sent','quotation_deleted')$q$, 4, 'quotation actions are logged');
select t.count_is($q$select 1 from public.activity_logs where details::text ~* '(@|password|token)'$q$, 0, 'the log holds no emails, passwords or tokens');

-- deleting the service in use must be blocked
select t.fails($q$delete from public.services where id = (select id from t.ids where name='svc')$q$, 'violates foreign key', 'a service used by a request cannot be deleted');

-- ===== BOOKINGS (migration 011) =====
select t.act('anon');
select public.submit_booking('Chidi Eze','chidi@example.com','08130653226', (select id from t.ids where name='svc'), '12 Nnebisi Road, Asaba',
  'Office', current_date + 3, 'Morning (8am - 12pm)', 'Weekly cleaning of a small office.', null, '{}', true);
select t.act('postgres');
insert into t.ids select 'bk', id from public.bookings where email = 'chidi@example.com';
select t.act('postgres'); update public.bookings set preferred_date = current_date - 1 where false; -- no-op, keeps the role as postgres
select t.act('authenticated','00000000-0000-0000-0000-0000000000c1'::uuid);
update public.bookings set status = 'confirmed' where id = (select id from t.ids where name='bk');
select t.act('postgres');
select t.eq((select status from public.bookings where id=(select id from t.ids where name='bk')), 'pending_review', 'a customer cannot confirm a booking (nothing changed)');
select t.act('authenticated','00000000-0000-0000-0000-0000000000a1'::uuid);
select t.act('authenticated','00000000-0000-0000-0000-0000000000a1'::uuid);
select t.fails($q$update public.bookings set status = 'completed' where id = (select id from t.ids where name='bk')$q$, 'cannot move from', 'a pending booking cannot jump to completed');
select t.fails($q$update public.bookings set full_name = 'Someone Else' where id = (select id from t.ids where name='bk')$q$, 'cannot be changed', 'customer details cannot be edited');
select t.fails($q$update public.bookings set preferred_date = preferred_date + 1 where id = (select id from t.ids where name='bk')$q$, 'propose a reschedule', 'the date cannot be edited directly');
select t.fails($q$update public.bookings set status = 'reschedule_proposed' where id = (select id from t.ids where name='bk')$q$, 'new date|proposed', 'a reschedule needs a proposed date');
select t.fails($q$update public.bookings set status = 'reschedule_proposed', proposed_date = current_date - 2 where id = (select id from t.ids where name='bk')$q$, 'cannot be in the past', 'a proposed date cannot be in the past');
update public.bookings set status = 'reschedule_proposed', proposed_date = current_date + 5, proposed_time = 'Afternoon (12pm - 4pm)' where id = (select id from t.ids where name='bk');
update public.bookings set status = 'confirmed' where id = (select id from t.ids where name='bk');
select t.eq((select (preferred_date = current_date + 5)::text from public.bookings where id=(select id from t.ids where name='bk')), 'true', 'confirming a proposal makes the proposed date the booking date');
select t.eq((select (proposed_date is null and confirmed_at is not null)::text from public.bookings where id=(select id from t.ids where name='bk')), 'true', 'proposal cleared and confirmation time recorded');
select t.fails($q$update public.bookings set status = 'completed' where id = (select id from t.ids where name='bk')$q$, 'before its date', 'a future booking cannot be completed');
select t.act('postgres');
alter table public.bookings disable trigger bookings_transition;
update public.bookings set preferred_date = current_date - 1 where id = (select id from t.ids where name='bk'); -- pretend the day has passed
alter table public.bookings enable trigger bookings_transition;
select t.act('authenticated','00000000-0000-0000-0000-0000000000a1'::uuid);
update public.bookings set status = 'completed' where id = (select id from t.ids where name='bk');
select t.fails($q$update public.bookings set status = 'cancelled' where id = (select id from t.ids where name='bk')$q$, 'cannot move from', 'a completed booking is final');
select t.count_is($q$select 1 from public.activity_logs where action = 'booking_status_changed' and details ? 'reference'$q$, 3, 'booking status changes are logged');
select t.count_is($q$select 1 from public.activity_logs where details::text ~* '(@|password|token)'$q$, 0, 'the log still holds no emails, passwords or tokens');

-- ===== CONTENT MANAGEMENT (migration 012) =====
select t.act('authenticated','00000000-0000-0000-0000-0000000000a1'::uuid);
with x as (insert into public.services (slug, title, description) values ('test-svc','Test Service','About this service.') returning id) insert into t.ids select 'ns', id from x;
select t.count_is($q$select 1 from public.activity_logs where action = 'service_created' and details->>'title' = 'Test Service'$q$, 1, 'creating a service is logged');
update public.services set title = 'Test Service renamed' where id = (select id from t.ids where name='ns');
select t.count_is($q$select 1 from public.activity_logs where action = 'service_updated' and details->>'title' = 'Test Service renamed'$q$, 1, 'editing a service is logged');
update public.services set is_published = false where id = (select id from t.ids where name='ns');
select t.count_is($q$select 1 from public.activity_logs where action = 'service_unpublished'$q$, 1, 'hiding a service is logged as unpublished');
select public.move_item('services', (select id from t.ids where name='ns'), 'down');
select public.move_item('services', (select id from t.ids where name='ns'), 'up');
select public.move_item('services', (select id from t.ids where name='ns'), 'up');
select t.eq((select sort_order::text from public.services where id=(select id from t.ids where name='ns')), '1', 'moving an item up and down puts it back, and the top stays at the top');
select t.count_is($q$select 1 from public.activity_logs where action = 'service_updated'$q$, 1, 'reordering does not flood the log with edits');
select t.count_is($q$select 1 from public.activity_logs where action = 'item_reordered'$q$, 2, 'real moves are logged');
select t.fails($q$select public.move_item('profiles', (select id from t.ids where name='ns'), 'up')$q$, 'Unknown list', 'move_item refuses other tables');
select t.fails($q$select public.move_item('services', (select id from t.ids where name='ns'), 'sideways')$q$, 'up or down', 'move_item refuses bad directions');

select t.act('authenticated','00000000-0000-0000-0000-0000000000c1'::uuid);
select t.fails($q$select public.move_item('services', (select id from t.ids where name='ns'), 'up')$q$, 'Not allowed', 'an ordinary customer cannot reorder services');
select t.act('anon');
select t.fails($q$select public.move_item('services', (select id from t.ids where name='ns'), 'up')$q$, 'permission denied', 'a visitor cannot reorder services');
select t.count_is('select 1 from public.services where slug = ''test-svc''', 0, 'a hidden service is invisible to visitors');

select t.act('authenticated','00000000-0000-0000-0000-0000000000a1'::uuid);
insert into public.testimonials (customer_name, message, is_published) values ('Secret Name','This message must never appear in the log.', false);
update public.testimonials set is_published = true where customer_name = 'Secret Name';
select t.count_is($q$select 1 from public.activity_logs where action = 'testimonial_published'$q$, 1, 'publishing a testimonial is logged');
select t.count_is($q$select 1 from public.activity_logs where details::text ~* 'Secret|never appear'$q$, 0, 'testimonial names and text never reach the log');
delete from public.testimonials where customer_name = 'Secret Name';

update public.site_settings set value = value || '{"slogan":"Changed for test"}'::jsonb where key = 'company';
select t.count_is($q$select 1 from public.activity_logs where action = 'content_updated' and details->>'key' = 'company'$q$, 1, 'editing website content is logged by key');
select t.count_is($q$select 1 from public.activity_logs where details::text ~* 'Changed for test'$q$, 0, 'the edited text is not copied into the log');

select t.act('anon');
select public.submit_contact('Ngozi Obi','ngozi@example.com',null,'Question about pricing','Do you clean churches?');
select t.act('authenticated','00000000-0000-0000-0000-0000000000a1'::uuid);
update public.contact_enquiries set status = 'read' where email = 'ngozi@example.com';
select t.count_is($q$select 1 from public.activity_logs where action = 'enquiry_updated' and details->>'to' = 'read'$q$, 1, 'enquiry status changes are logged');
select t.fails($q$update public.contact_enquiries set message = 'Rewritten' where email = 'ngozi@example.com'$q$, 'cannot be changed', 'a customer message cannot be rewritten');
update public.contact_enquiries set internal_notes = 'Call back', archived = true where email = 'ngozi@example.com';
select t.count_is($q$select 1 from public.contact_enquiries where archived and internal_notes = 'Call back'$q$, 1, 'notes and archiving work');

delete from public.services where id = (select id from t.ids where name='ns');
select t.count_is($q$select 1 from public.activity_logs where action = 'service_deleted' and details->>'title' = 'Test Service renamed'$q$, 1, 'deleting a service is logged');

rollback;
\echo ALL DATABASE TESTS PASSED
