-- 008: testimonials. Starts EMPTY on purpose: only real client feedback, added by the owner.
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_role text check (customer_role is null or char_length(customer_role) <= 80),  -- e.g. "Hotel manager, Asaba"
  message text not null check (char_length(message) between 10 and 600),
  sort_order int not null default 0,
  is_published boolean not null default false,   -- hidden until the owner publishes it
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_published_idx on public.testimonials (is_published, sort_order);

drop trigger if exists testimonials_updated on public.testimonials;
create trigger testimonials_updated before update on public.testimonials
for each row execute function public.set_updated_at();

alter table public.testimonials enable row level security;

drop policy if exists "public read published testimonials" on public.testimonials;
create policy "public read published testimonials" on public.testimonials
  for select to anon, authenticated using (is_published);

drop policy if exists "admin all testimonials" on public.testimonials;
create policy "admin all testimonials" on public.testimonials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
