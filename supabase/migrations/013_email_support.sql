-- 013: support for automatic emails (sent by the "send-email" Edge Function through Resend).

-- submit_contact now returns the new enquiry id, so the website can ask for the confirmation email.
-- (The return type changes, so the old function has to be dropped first.)
drop function if exists public.submit_contact(text,text,text,text,text);

create or replace function public.submit_contact(
  p_name text, p_email text, p_phone text, p_subject text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if (select count(*) from contact_enquiries
      where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many messages. Please try again later.';
  end if;
  insert into contact_enquiries (name, email, phone, subject, message)
  values (trim(p_name), lower(trim(p_email)), nullif(trim(p_phone),''), trim(p_subject), trim(p_message))
  returning id into new_id;
  return new_id;
end $$;

revoke all on function public.submit_contact(text,text,text,text,text) from public;
grant execute on function public.submit_contact(text,text,text,text,text) to anon, authenticated;

-- Fast look-ups for "has this email already been sent?" and the email history on each record.
create index if not exists email_logs_related_idx on public.email_logs (related_id, template);
create index if not exists email_logs_created_idx on public.email_logs (created_at desc);

-- Only the Edge Function (service role) writes to email_logs; admins can read it (policy from 003).
-- Make that explicit: nobody else can insert, update or delete.
revoke insert, update, delete on public.email_logs from anon, authenticated;
