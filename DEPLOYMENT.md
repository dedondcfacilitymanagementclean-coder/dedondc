# Putting dedondc.com online (beginner guide)

Read this once from top to bottom before you start. Nothing here is done for you: each step is something you do in your own accounts.
Nothing in this guide has been tested against your real accounts yet; if a screen looks different from what is written, send a photo and we will adjust.

## 0. The big picture (who does what)

| Thing | Where it lives | Why |
|---|---|---|
| The domain name `dedondc.com` | **Hostinger** (where you bought it) | It stays registered there. |
| The website (pages, admin dashboard) | **Vercel** | Free hosting made for this kind of site. |
| Database, logins, uploaded files | **Supabase** | Already set up. |
| Your mailbox `info@dedondc.com` | **Hostinger** | Vercel does NOT host mailboxes. Do not move it. |
| Automatic emails from the website | **Resend** (later) | Sends "we received your request" emails. |

The domain only needs to *point* to Vercel. Your email keeps working because we do not touch its records.

**Golden rules**
1. Do NOT change the nameservers of `dedondc.com`. Changing them would switch off your email until every email record is copied by hand.
2. Do NOT delete or edit any record whose type is `MX`, `TXT` or `CNAME` with a name like `hostingermail...`. Those are your email.
3. Never put the contents of your `.env` file on GitHub, in a chat, or in a photo. It holds your keys.

## 1. Before you start: collect two values from Supabase
1. Open your Supabase project > **Project Settings** (gear icon) > **API** (or **Data API**).
2. Copy the **Project URL** (looks like `https://abcd1234.supabase.co`).
3. Copy the **anon public** key (a long text starting with `eyJ`). Never copy the `service_role` key.
4. Keep both in a notepad. They are the same two values as in your `.env` file.

## 2. Put the website on Vercel
1. Go to `vercel.com` and **Sign Up** (use "Continue with Email" or Google). Choose the free **Hobby** plan.
2. On your computer, open a terminal in the project folder (the one with `package.json`).
3. Run: `npm install` (wait until it finishes).
4. Run: `npx vercel login`. Choose "Continue with Email", type your email, then click the link Vercel emails you.
5. Run: `npx vercel`. Answer the questions:
   - Set up and deploy? **Y**
   - Which scope? press **Enter**
   - Link to existing project? **N**
   - Project name? type `dedondc` and press Enter
   - In which directory is your code located? press **Enter**
   - It detects Vite. Want to modify settings? **N**
6. The first deploy will **work but show a "database not connected" style page** because the keys are not added yet. That is normal.
7. In the Vercel website open your project `dedondc` > **Settings** > **Environment Variables**. Add two, choosing all environments (Production, Preview, Development):
   - Name `VITE_SUPABASE_URL`, value = your Project URL
   - Name `VITE_SUPABASE_ANON_KEY`, value = your anon public key
8. Back in the terminal run: `npx vercel --prod`. This builds again with the keys.
9. When it finishes it prints an address like `https://dedondc.vercel.app`. Open it. You should see your real website with services and your logo.

## 3. Tell Supabase about the new address
Without this, "Forgot password" links will not work on the live site.
1. Supabase > **Authentication** > **URL Configuration**.
2. **Site URL**: `https://dedondc.com`
3. **Redirect URLs**: add `https://dedondc.com/admin/reset` and `https://dedondc.vercel.app/admin/reset`, then **Save**.

## 4. Connect dedondc.com to Vercel (email stays safe)
1. In Vercel: your project > **Settings** > **Domains** > type `dedondc.com` > **Add**.
2. Choose the option that also adds `www.dedondc.com` and redirects it to `dedondc.com` (Vercel suggests this).
3. Vercel now shows a table of **DNS records it wants** (an `A` record for `@` and a `CNAME` for `www`). Keep this page open. The typical values are `A  @  76.76.21.21` and `CNAME  www  cname.vercel-dns.com`, but **always use exactly what Vercel shows you**.
4. In Hostinger: **Domains** > `dedondc.com` > **DNS / Nameservers** > **DNS records** (also called DNS Zone Editor).
5. Look at the list. Find ONLY these and remove them (they point to Hostinger's default parking page):
   - an `A` record with Name `@`
   - an `A` or `CNAME` record with Name `www`
   Do not touch anything else, especially `MX`, `TXT`, or anything mentioning `hostingermail`.
6. Click **Add record** and create the two records Vercel showed (type, name, value exactly; leave TTL as default).
7. Go back to Vercel > Domains. It will say "Valid Configuration" with a tick when ready. This can take from a few minutes to a few hours.
8. HTTPS (the padlock) is added by Vercel automatically. Nothing for you to do.
9. Test: open `https://dedondc.com`. Then send yourself a test email from your phone to `info@dedondc.com` and check it arrives. If email stopped, tell me at once with a photo of your DNS records list.

## 5. Make sure the admin account works on the live site
1. Open `https://dedondc.com/admin` and sign in.
2. If it says you are not authorised, run in the Supabase SQL Editor (replace the email with yours):
   `insert into public.profiles (id, role) select id, 'admin' from auth.users where email = 'YOUR-LOGIN-EMAIL' on conflict (id) do update set role = 'admin';`

## 6. Allow automatic emails (Resend), safely next to Hostinger email
Do this part when I give you the email code. You can do 1 to 4 now.
1. Resend > **Domains** > **Add Domain**. Type `updates.dedondc.com` (a sub-name, NOT `dedondc.com`). This keeps it separate from your mailbox.
2. Resend shows a few records (types `MX`, `TXT`). Add each in Hostinger DNS records exactly as shown. Their names end with `.updates`, so they cannot clash with your email.
3. Click **Verify** in Resend. Wait until it says Verified.
4. Resend > **API Keys** > **Create API Key** > permission "Sending access". Copy the key once and save it in your notepad. Do not paste it into the website code.
5. Later I will tell you where to paste it (Supabase secrets).

## 7. Updating the website later
1. Change files (or unzip a new version over the project, keeping your `.env`).
2. Run `npx vercel --prod`.
3. If something breaks: Vercel > **Deployments** > open an older good one > **Promote to Production**.

## 8. Final checks after going live (tick each)
- [ ] `https://dedondc.com` opens with a padlock; `https://www.dedondc.com` goes to it.
- [ ] Home, About, Services, Projects, Contact, Privacy, Terms all open.
- [ ] Send a test quote request, a test booking and a test contact message. Each shows a thank-you page.
- [ ] They appear in `/admin` under Quote requests, Bookings and Contact enquiries.
- [ ] On your phone, the menu opens and nothing scrolls sideways.
- [ ] `info@dedondc.com` still receives email.
- [ ] Forgot-password email link opens `/admin/reset` on dedondc.com.
