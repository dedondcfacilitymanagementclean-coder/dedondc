-- 002: business tables. Run after 001.

create or replace function public.gen_reference(prefix text)
returns text language sql volatile as $$
  select prefix || '-' || to_char(now() at time zone 'Africa/Lagos','YYMMDD') || '-' ||
         upper(substr(encode(gen_random_bytes(4),'hex'),1,6));
$$;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  short_description text,          -- one-line summary for cards
  icon text,                       -- emoji/short icon used when no image
  image_path text,                 -- path in public-media bucket
  benefits text[] not null default '{}',
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,   -- false = admin-only
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '',
  service_id uuid references public.services(id) on delete set null,
  image_path text not null,
  location text,
  completed_on date,
  sort_order int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.gen_reference('QR'),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text not null check (char_length(phone) between 7 and 20),
  preferred_contact text not null check (preferred_contact in ('email','phone','whatsapp')),
  service_id uuid not null references public.services(id) on delete restrict,
  property_type text not null,
  location text not null check (char_length(location) between 3 and 300),
  property_size text,
  preferred_date date,
  description text not null check (char_length(description) between 10 and 4000),
  attachments text[] not null default '{}',     -- paths in customer-uploads (private)
  consent_given boolean not null check (consent_given),
  status text not null default 'new' check (status in
    ('new','under_review','quotation_prepared','quotation_sent','accepted','declined','closed')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.gen_reference('QT'),
  quote_request_id uuid not null references public.quote_requests(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  description text not null default '',
  expires_on date,
  sent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.gen_reference('BK'),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text not null check (char_length(phone) between 7 and 20),
  service_id uuid not null references public.services(id) on delete restrict,
  address text not null check (char_length(address) between 3 and 300),
  property_type text not null,
  preferred_date date not null,
  preferred_time text,
  description text not null check (char_length(description) between 10 and 4000),
  instructions text,
  attachments text[] not null default '{}',
  consent_given boolean not null check (consent_given),
  status text not null default 'pending_review' check (status in
    ('pending_review','confirmed','reschedule_proposed','completed','declined','cancelled')),
  proposed_date date,
  proposed_time text,
  confirmed_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- business rules
  constraint confirmed_has_timestamp check (status <> 'confirmed' or confirmed_at is not null),
  constraint reschedule_has_proposal check (status <> 'reschedule_proposed' or proposed_date is not null)
);

create table public.contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text,
  subject text not null check (char_length(subject) between 2 and 200),
  message text not null check (char_length(message) between 5 and 4000),
  status text not null default 'unread' check (status in ('unread','read','resolved')),
  archived boolean not null default false,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template text not null,
  related_table text,
  related_id uuid,
  status text not null check (status in ('sent','failed','not_configured')),
  error text,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}',   -- never store passwords, tokens or customer PII here
  created_at timestamptz not null default now()
);

-- indexes
create index on public.services (is_published, sort_order);
create index on public.projects (is_published, sort_order);
create index on public.quote_requests (status, created_at desc);
create index on public.quote_requests (email, created_at desc);
create index on public.quotations (quote_request_id);
create index on public.bookings (status, created_at desc);
create index on public.bookings (email, created_at desc);
create index on public.contact_enquiries (status, archived, created_at desc);
create index on public.contact_enquiries (email, created_at desc);
create index on public.activity_logs (created_at desc);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['services','projects','quote_requests','quotations','bookings','contact_enquiries','site_settings']
  loop
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- booking status transition rules (prevents inconsistent changes)
create or replace function public.check_booking_transition()
returns trigger language plpgsql as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'pending_review'      and new.status in ('confirmed','reschedule_proposed','declined','cancelled')) or
    (old.status = 'reschedule_proposed' and new.status in ('confirmed','declined','cancelled','pending_review')) or
    (old.status = 'confirmed'           and new.status in ('completed','cancelled','reschedule_proposed'))
  ) then
    raise exception 'Invalid booking status change: % -> %', old.status, new.status;
  end if;
  if new.status = 'confirmed' and new.confirmed_at is null then new.confirmed_at = now(); end if;
  return new;
end $$;
create trigger bookings_transition before update on public.bookings
for each row execute function public.check_booking_transition();
