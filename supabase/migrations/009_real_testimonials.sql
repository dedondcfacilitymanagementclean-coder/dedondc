-- 009: real client testimonials collected through the company's feedback form (29 Oct 2026).
-- The form had no name field, so they are shown as "Client". Emails and phone numbers are NOT stored.
-- Review text is copied word for word. Safe to re-run: a review already present is skipped.

alter table public.testimonials
  add column if not exists rating smallint check (rating between 1 and 5);

insert into public.testimonials (customer_name, customer_role, message, rating, sort_order, is_published)
select v.customer_name, v.customer_role, v.message, v.rating, v.sort_order, v.is_published
from (values
  ('Client', 'Client review, October 2026', $t$✨ Clean Spaces, Excellent Service! 🧹 ✨

If you want a spotless environment, look no further! Don DC Facility Management & Cleaning Services is exceptionally good at what he does, pays attention to every detail, and takes pride in delivering excellent results. His work speaks for itself! 💯👏

Professional service, outstanding results, and a cleaner space every time! 🧼🏆 Highly recommended! ✅$t$, 5::smallint, 1, true),
  ('Client', 'Client review, October 2026', $t$Your services are top-notch 💯 I love it$t$, 4::smallint, 2, true),
  ('Client', 'Client review, October 2026', $t$Very honest and good services$t$, 4::smallint, 3, true),
  ('Client', 'Client review, October 2026', $t$Good services rendered$t$, 5::smallint, 4, true),
  -- Held back (not published): the contact email on this response is the same as the website developer's own
  -- email, so it may be a test entry. To publish it, run the one-line command at the bottom.
  ('Client', 'Client review, October 2026', $t$Good services rendered$t$, 4::smallint, 5, false)
) as v(customer_name, customer_role, message, rating, sort_order, is_published)
where not exists (
  select 1 from public.testimonials t where t.message = v.message and t.rating = v.rating
);

-- To publish the held-back review (only if it is a genuine client):
-- update public.testimonials set is_published = true where message = 'Good services rendered' and rating = 4;
