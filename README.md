# DE DON DC website (work in progress)

## STATUS
Run and passing: lint, 28 tests, production build.
SQL files 001-005 ran successfully on a real Supabase project (owner confirmed).
NOT yet tested on a real Supabase project: Contact, Quote and Booking forms and file uploads.
Built: Home, About, Services, Projects gallery (filters + lightbox), Contact, Quote form, Booking form (with uploads), legal pages.
Built (admin foundation): secure sign-in at /admin, forgot-password, route guard, Overview, Settings (name, password), activity log helper.
NOT built yet: admin pages for quotations, bookings, enquiries, services, projects, testimonials, site content; email functions.
NOT deployed. Domain not connected.

## Beginner guide: run the project on your computer
A. Install Node.js (LTS) from nodejs.org and VS Code from code.visualstudio.com. Restart the computer.
B. Extract the zip. In VS Code: File > Open Folder > choose the `dedondc` folder. Terminal > New Terminal. Type `npm install` and press Enter.
C. Supabase: create a project at supabase.com (name `dedondc`). Authentication > Sign In / Providers: turn OFF "Allow new users to sign up".
D. SQL Editor > New query. For each file in `supabase/migrations`, in this order, copy all, paste, click Run (must say Success): 001 to 012.
   (Already set up before? Just run 006, 007, 008, 009, 010, 011 and 012: they add the service descriptions, pictures, the testimonials table and the real client reviews and the quote-request rules (010) booking rules (011) and the content tools (012). To refresh company and About content, run 005 again.)
E. Authentication > Users > Add user > Create new user (tick Auto Confirm). Then run in SQL Editor:
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'OWNER_EMAIL_HERE');
F. Project Settings (gear) > API: copy Project URL and anon public key (NOT service_role).
   In the terminal: Windows `copy .env.example .env`, Mac `cp .env.example .env`. Open `.env` and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (no spaces, no quotes). Save.
G. Run `npm run dev` and open http://localhost:5173. Stop with Ctrl+C.
H. Check: Home shows 13 services; the Services page shows the full descriptions. Submit a Quote request and a Booking request (try attaching a small photo); look in Table Editor > quote_requests and bookings, and Storage > customer-uploads. Send a message on the Contact page, then look in Supabase > Table Editor > contact_enquiries.

Other commands: `npm run lint`, `npm test`, `npm run build`.

## Security notes
- Visitors cannot read or insert into customer tables. They submit through `submit_*` database functions that validate input and allow 5 submissions per email per hour.
- Admin access is enforced by Row Level Security using `is_admin()`. Nobody can change their own role.
- Customer uploads go to a private bucket; visitors can only add files under `incoming/`.
- Never put the service-role key or any email API key in `VITE_` variables.

## Using the admin dashboard (beginner guide)
1. Run `npm run dev` and open http://localhost:5173/admin . You are sent to the sign-in page.
2. Sign in with the owner email and password you created in Supabase (Authentication > Users). Your account must have role `admin` (the SQL step in setup).
3. You land on the Overview page. Use Settings to set your display name or change your password (minimum 10 characters, with a letter and a number).
4. "Forgot your password?" emails a reset link. For this to work, in Supabase go to Authentication > URL Configuration and set:
   - Site URL: `http://localhost:5173` while testing (later `https://dedondc.com`)
   - Redirect URLs: add `http://localhost:5173/admin/reset` and `https://dedondc.com/admin/reset`
   Supabase's built-in email is limited to a few emails per hour; for real use, connect your own email provider (Authentication > SMTP Settings).
5. In Supabase > Authentication > Sign In / Providers, set "Minimum password length" to 10 or more.
6. If you sign in with an account that is not an admin you will see "Access denied". Only the SQL step can create an admin.

## How the admin security works
- The sign-in screen and route guard are for convenience. The real protection is in the database: every private table has Row Level Security that allows only `is_admin()` users.
- The role is read from the `profiles` table in the database, never from the browser.
- Login errors never say whether an email exists. Supabase also rate-limits sign-in attempts.
- Admin pages are marked noindex, blocked in robots.txt and sent with an `X-Robots-Tag` header.
- The dashboard code is loaded only when /admin is opened, so it does not slow the public site.

## Quote requests (dashboard)
Open `/admin/quotes`. Search by name, email, phone or reference; filter by status. Open a request to see the customer, attachments (private links valid 10 minutes), change status (only allowed steps are offered), save internal notes, create a quotation, print it / save it as PDF, then press "Mark as sent" after you have sent it yourself (email is not connected yet). Sent quotations cannot be edited or deleted.

## Bookings (dashboard)
Open `/admin/bookings`. Filter by status or search; order by newest or by service date. Open a booking to confirm, decline, cancel or propose a different date/time. If the customer agrees to a proposed time, press "Customer agreed: confirm new time" and it becomes the booking date. A booking can be marked completed only on or after its date. Customer details cannot be edited. Customers are not emailed yet; contact them yourself.

## The rest of the dashboard
- **Contact enquiries** (`/admin/enquiries`): opening a message marks it read. Mark resolved, archive, add private notes. The customer's message can never be edited.
- **Services** (`/admin/services`): add, edit, hide/publish, reorder (arrows), delete, upload a picture (shrunk to WebP automatically). A service that already has quote requests or bookings cannot be deleted: hide it instead.
- **Projects** (`/admin/projects`): upload photos of your own real jobs, publish, hide, reorder, delete. New projects start hidden.
- **Testimonials** (`/admin/testimonials`): add real client feedback with the client's name, publish or hide.
- **Website content** (`/admin/content`): company and contact details, Home text, About text and values, Privacy policy, Terms of service. Saving a legal page removes its "Draft template" notice, so have it reviewed first. Text boxes cannot be saved empty (the built-in text is used instead).
- **Activity log** (`/admin/activity`): every status change and content change, with who and when. It never stores passwords, customer details, testimonial text or edited website text.

## Testing the database rules
Rules are tested in `supabase/tests/security_and_quotes.sql`. It runs in a throw-away transaction on a local PostgreSQL with the migrations applied and rolls everything back. It was run successfully on PostgreSQL 16 (migrations 001 to 012). It has not been run against your live Supabase project.

## Addresses and areas served
Head office, branch office and the six states served are built in (`src/lib/siteContent.json`) and shown on Contact, the footer and Home. Edit them any time in the dashboard: Website content > Company and contact.

## Going live
See `DEPLOYMENT.md` for the step-by-step guide to put the site on Vercel, connect dedondc.com (keeping your Hostinger email working) and prepare automatic emails.

## Automatic emails (Resend)

Emails are sent by the Supabase Edge Function `supabase/functions/send-email/index.ts` through Resend.

- Website forms (contact, quote, booking) -> confirmation to the customer + alert to the business.
- Dashboard buttons: **Email to customer** (quotation, then marks it sent) and **Email the customer about this** (booking confirmed / new time / declined / cancelled). Nothing is emailed automatically on a status change.
- Every attempt is saved in `email_logs` and shown under "Emails sent about this" on each record.
- Run migration `013_email_support.sql` first. Secrets: `RESEND_API_KEY`, `ADMIN_NOTIFY_EMAIL`, optional `FROM_EMAIL`, `REPLY_TO_EMAIL`, `SITE_URL`.
- Tests: `npm run test:email` (no Resend account needed; Resend and the database are simulated).
