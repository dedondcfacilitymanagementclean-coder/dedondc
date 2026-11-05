// deno-lint-ignore-file no-explicit-any
// DE DON DC — send-email Edge Function (Supabase) using Resend.
//
// One file, no imports, so it can be pasted straight into the Supabase dashboard editor.
//
// What it does
//   PUBLIC (called by the website right after a customer submits a form):
//     contact_received {id} · quote_received {reference} · booking_received {reference}
//     -> sends a confirmation to the customer and an alert to the business.
//     Safe by design: the recipient is always read from the database (never from the request),
//     the record must be under 15 minutes old, and each email is sent at most once.
//   ADMIN (called from the dashboard, needs a signed-in admin):
//     quotation_send {quotation_id}  -> emails the quotation, then marks it as sent
//     booking_update {booking_id}    -> emails the customer about the booking's current status
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   RESEND_API_KEY      required   your Resend API key
//   ADMIN_NOTIFY_EMAIL  optional   where business alerts go (comma-separated allowed)
//   FROM_EMAIL          optional   default: DE DON DC <no-reply@updates.dedondc.com>
//   REPLY_TO_EMAIL      optional   default: info@dedondc.com
//   SITE_URL            optional   default: https://dedondc.com
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

const env = (k: string, d = '') => (globalThis as any).Deno.env.get(k) || d
const SITE_URL = () => env('SITE_URL', 'https://dedondc.com').replace(/\/+$/, '')
const FROM = () => env('FROM_EMAIL', 'DE DON DC <no-reply@updates.dedondc.com>')
const REPLY_TO = () => env('REPLY_TO_EMAIL', 'info@dedondc.com')

const BRAND = {
  name: 'DE DON DC Facility Management and Cleaning Services',
  rc: 'RC No. 7211364',
  slogan: 'Cleanliness Is Next To Godliness',
  phone: '+234 813 065 3226',
  phone2: '+234 911 272 9711',
  email: 'info@dedondc.com',
  address: 'B3, Block B, Zone B, Asaba Ultra Modern Mechanic Village, Asaba, Delta State, Nigeria',
  navy: '#0b2a5b', blue: '#1668e3', cyan: '#18b6d9', ink: '#1b2430', soft: '#f3f6fb',
}

const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?dedondc\.com$/, /^https:\/\/[a-z0-9-]+\.vercel\.app$/, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/]

// ---------- small helpers ----------
export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const oneLine = (s: unknown) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REF = /^[A-Z]{2}-\d{6}-[0-9A-F]{6}$/
const money = (a: unknown, c = 'NGN') => {
  try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: c }).format(Number(a) || 0) } catch { return `${c} ${a}` }
}
const day = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(String(iso).length === 10 ? iso + 'T12:00:00Z' : iso)
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-NG', { dateStyle: 'full', timeZone: 'Africa/Lagos' }).format(d)
}

// ---------- email layout ----------
type Mail = {
  subject: string; preheader?: string; heading: string; paragraphs?: string[]
  details?: [string, string][]; block?: { title: string; text: string }
  button?: { label: string; url: string }; closing?: string
}

export function render(m: Mail) {
  const paras = (m.paragraphs ?? []).map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${BRAND.ink}">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
  const rows = (m.details ?? []).filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:8px 12px;font-size:14px;color:#5b6675;border-bottom:1px solid #e3e9f2;width:38%;vertical-align:top">${esc(k)}</td>` +
    `<td style="padding:8px 12px;font-size:15px;color:${BRAND.ink};border-bottom:1px solid #e3e9f2;vertical-align:top"><strong>${esc(v).replace(/\n/g, '<br>')}</strong></td></tr>`).join('')
  const table = rows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 18px;background:${BRAND.soft};border-radius:8px">${rows}</table>` : ''
  const block = m.block ? `<div style="margin:0 0 18px;padding:14px 16px;border-left:4px solid ${BRAND.cyan};background:${BRAND.soft};border-radius:4px"><div style="font-size:13px;color:#5b6675;margin-bottom:6px">${esc(m.block.title)}</div><div style="font-size:15px;line-height:1.55;color:${BRAND.ink}">${esc(m.block.text).replace(/\n/g, '<br>')}</div></div>` : ''
  const button = m.button ? `<p style="margin:6px 0 20px"><a href="${esc(m.button.url)}" style="display:inline-block;background:${BRAND.blue};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:12px 22px;border-radius:8px">${esc(m.button.label)}</a></p>` : ''
  const closing = m.closing ? `<p style="margin:0 0 6px;font-size:16px;line-height:1.6;color:${BRAND.ink}">${esc(m.closing).replace(/\n/g, '<br>')}</p>` : ''
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:#e9eef6;font-family:Arial,Helvetica,sans-serif">` +
    `<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(m.preheader ?? '')}</span>` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e9eef6"><tr><td align="center" style="padding:24px 12px">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">` +
    `<tr><td style="background:${BRAND.navy};padding:22px 24px;border-bottom:4px solid ${BRAND.cyan}"><div style="font-size:20px;font-weight:bold;color:#ffffff">DE DON DC</div><div style="font-size:13px;color:#cfe0ff;margin-top:2px">Facility Management and Cleaning Services</div></td></tr>` +
    `<tr><td style="padding:26px 24px 10px"><h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.navy}">${esc(m.heading)}</h1>${paras}${table}${block}${button}${closing}</td></tr>` +
    `<tr><td style="padding:18px 24px 24px;background:${BRAND.soft};font-size:13px;line-height:1.6;color:#5b6675">` +
    `<strong style="color:${BRAND.navy}">${esc(BRAND.name)}</strong> · ${esc(BRAND.rc)}<br>${esc(BRAND.address)}<br>` +
    `Phone / WhatsApp: ${esc(BRAND.phone)} · ${esc(BRAND.phone2)}<br>Email: <a href="mailto:${BRAND.email}" style="color:${BRAND.blue}">${BRAND.email}</a><br>` +
    `<em>${esc(BRAND.slogan)}</em></td></tr></table></td></tr></table></body></html>`
  const text = [m.heading, '', ...(m.paragraphs ?? []).flatMap((p) => [p, '']),
    ...(m.details ?? []).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), (m.details?.length ? '' : null),
    m.block ? `${m.block.title}:\n${m.block.text}\n` : null,
    m.button ? `${m.button.label}: ${m.button.url}\n` : null, m.closing ?? null, '',
    `--`, BRAND.name, BRAND.rc, `Phone / WhatsApp: ${BRAND.phone} / ${BRAND.phone2}`, `Email: ${BRAND.email}`, BRAND.slogan,
  ].filter((x) => x !== null).join('\n')
  return { html, text }
}

// ---------- the emails ----------
const adminLink = (path: string) => `${SITE_URL()}/admin/${path}`

export const T = {
  contact_customer: (r: any): Mail => ({
    subject: 'We received your message — DE DON DC',
    preheader: 'Thank you for contacting DE DON DC.',
    heading: `Thank you, ${oneLine(r.name)}`,
    paragraphs: ['We have received your message and will reply as soon as we can.', 'If it is urgent, please call or WhatsApp us on the numbers below.'],
    block: { title: `Your message — ${oneLine(r.subject)}`, text: r.message },
    closing: 'Kind regards,\nDE DON DC',
  }),
  contact_admin: (r: any): Mail => ({
    subject: `New website message: ${oneLine(r.subject).slice(0, 80)}`,
    heading: 'New message from the website',
    details: [['From', r.name], ['Email', r.email], ['Phone', r.phone ?? ''], ['Subject', r.subject]],
    block: { title: 'Message', text: r.message },
    button: { label: 'Open in dashboard', url: adminLink(`enquiries/${r.id}`) },
  }),
  quote_customer: (r: any): Mail => ({
    subject: `Quote request received (${r.reference}) — DE DON DC`,
    preheader: 'We have received your quote request.',
    heading: `Thank you, ${oneLine(r.full_name)}`,
    paragraphs: ['We have received your quote request and it is waiting for review. No quotation has been issued yet.', 'We will study the details and come back to you with a quotation or any questions we have.'],
    details: [['Reference', r.reference], ['Service', r.services?.title ?? ''], ['Location', r.location], ['Preferred date', day(r.preferred_date)]],
    closing: 'Please keep your reference number for any follow-up.\n\nKind regards,\nDE DON DC',
  }),
  quote_admin: (r: any): Mail => ({
    subject: `New quote request ${r.reference}`,
    heading: 'New quote request',
    details: [['Reference', r.reference], ['Name', r.full_name], ['Email', r.email], ['Phone', r.phone], ['Prefers', r.preferred_contact],
      ['Service', r.services?.title ?? ''], ['Location', r.location], ['Preferred date', day(r.preferred_date)]],
    block: { title: 'Details from the customer', text: r.description },
    button: { label: 'Open in dashboard', url: adminLink(`quotes/${r.id}`) },
  }),
  booking_customer: (r: any): Mail => ({
    subject: `Service request received (${r.reference}) — DE DON DC`,
    preheader: 'Your request is received. It is not a confirmed appointment yet.',
    heading: `Thank you, ${oneLine(r.full_name)}`,
    paragraphs: ['We have received your service request. It is not a confirmed appointment yet.', 'We will check our availability and then confirm your slot, suggest another time, or let you know if we cannot take the job.'],
    details: [['Reference', r.reference], ['Service', r.services?.title ?? ''], ['Requested date', day(r.preferred_date)], ['Requested time', r.preferred_time ?? ''], ['Address', r.address]],
    closing: 'Please keep your reference number for any follow-up.\n\nKind regards,\nDE DON DC',
  }),
  booking_admin: (r: any): Mail => ({
    subject: `New booking request ${r.reference}`,
    heading: 'New booking request',
    details: [['Reference', r.reference], ['Name', r.full_name], ['Email', r.email], ['Phone', r.phone], ['Service', r.services?.title ?? ''],
      ['Requested date', day(r.preferred_date)], ['Requested time', r.preferred_time ?? ''], ['Address', r.address]],
    block: { title: 'Details from the customer', text: r.description },
    button: { label: 'Open in dashboard', url: adminLink(`bookings/${r.id}`) },
  }),
  quotation: (q: any, r: any): Mail => ({
    subject: `Your quotation ${q.reference} — DE DON DC`,
    preheader: `Quotation ${q.reference}: ${money(q.amount, q.currency)}`,
    heading: `Your quotation, ${oneLine(r.full_name)}`,
    paragraphs: ['Thank you for your interest in DE DON DC. Here is the quotation for the work you asked about.'],
    details: [['Quotation', q.reference], ['Your request', r.reference], ['Service', r.services?.title ?? ''], ['Amount', money(q.amount, q.currency)], ['Valid until', day(q.expires_on)]],
    block: { title: 'What the quotation covers', text: q.description },
    closing: 'To accept, ask a question or change anything, simply reply to this email or call/WhatsApp us on ' + BRAND.phone + '.\n\nKind regards,\nDE DON DC',
  }),
  booking_confirmed: (b: any): Mail => ({
    subject: `Your booking is confirmed (${b.reference}) — DE DON DC`,
    heading: 'Your booking is confirmed',
    paragraphs: [`Hello ${oneLine(b.full_name)}, good news: your service is confirmed.`],
    details: [['Reference', b.reference], ['Service', b.services?.title ?? ''], ['Date', day(b.preferred_date)], ['Time', b.preferred_time ?? ''], ['Address', b.address]],
    closing: 'If anything needs to change, reply to this email or call us on ' + BRAND.phone + '.\n\nKind regards,\nDE DON DC',
  }),
  booking_reschedule_proposed: (b: any): Mail => ({
    subject: `A new time is suggested for your booking (${b.reference}) — DE DON DC`,
    heading: 'We suggest a different time',
    paragraphs: [`Hello ${oneLine(b.full_name)}, we cannot do the time you asked for, but we can offer you another one.`],
    details: [['Reference', b.reference], ['Service', b.services?.title ?? ''], ['You asked for', `${day(b.preferred_date)} ${b.preferred_time ?? ''}`.trim()], ['We suggest', `${day(b.proposed_date)} ${b.proposed_time ?? ''}`.trim()]],
    closing: 'Please reply to this email or call/WhatsApp ' + BRAND.phone + ' to tell us whether the new time suits you. Your booking is confirmed only after you agree.\n\nKind regards,\nDE DON DC',
  }),
  booking_declined: (b: any): Mail => ({
    subject: `About your booking request (${b.reference}) — DE DON DC`,
    heading: 'We are sorry, we cannot take this job',
    paragraphs: [`Hello ${oneLine(b.full_name)}, thank you for asking. Unfortunately we are not able to take this service request.`, 'You are welcome to contact us to talk about another date or another service.'],
    details: [['Reference', b.reference], ['Service', b.services?.title ?? ''], ['Requested date', day(b.preferred_date)]],
    closing: 'Kind regards,\nDE DON DC',
  }),
  booking_cancelled: (b: any): Mail => ({
    subject: `Your booking is cancelled (${b.reference}) — DE DON DC`,
    heading: 'Your booking has been cancelled',
    paragraphs: [`Hello ${oneLine(b.full_name)}, this is to let you know that the booking below has been cancelled.`],
    details: [['Reference', b.reference], ['Service', b.services?.title ?? ''], ['Date', day(b.preferred_date)]],
    closing: 'If this is a surprise, or you would like to book again, please reply to this email or call us on ' + BRAND.phone + '.\n\nKind regards,\nDE DON DC',
  }),
}

// ---------- database (Supabase REST, service role) ----------
const sb = () => ({ url: env('SUPABASE_URL').replace(/\/+$/, ''), key: env('SUPABASE_SERVICE_ROLE_KEY') })

async function dbGet(path: string): Promise<any[]> {
  const { url, key } = sb()
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`db ${res.status}`)
  return await res.json()
}

async function logEmail(row: { to_email: string; template: string; related_table: string; related_id: string; status: string; error?: string }) {
  try {
    const { url, key } = sb()
    await fetch(`${url}/rest/v1/email_logs`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ ...row, error: row.error ? row.error.slice(0, 300) : null }),
    })
  } catch (e) { console.error('could not write email log', e) }
}

// ---------- sending through Resend ----------
type Sent = { ok: boolean; code?: 'not_configured' | 'rejected' | 'network'; detail?: string }

async function send(to: string, mail: Mail, meta: { template: string; table: string; id: string; replyTo?: string }): Promise<Sent> {
  const apiKey = env('RESEND_API_KEY')
  const log = (status: string, error?: string) => logEmail({ to_email: to, template: meta.template, related_table: meta.table, related_id: meta.id, status, error })
  if (!apiKey) { await log('not_configured', 'RESEND_API_KEY is not set'); return { ok: false, code: 'not_configured' } }
  const { html, text } = render(mail)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `${meta.template}/${meta.id}/${Math.floor(Date.now() / 60000)}` },
      body: JSON.stringify({ from: FROM(), to: [to], reply_to: meta.replyTo ?? REPLY_TO(), subject: oneLine(mail.subject), html, text }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      await log('failed', `Resend ${res.status}: ${body}`)
      return { ok: false, code: 'rejected', detail: `${res.status}` }
    }
    await log('sent')
    return { ok: true }
  } catch (e) {
    await log('failed', `network: ${(e as Error).message}`)
    return { ok: false, code: 'network' }
  }
}

// ---------- public handlers ----------
const PUBLIC: Record<string, { table: string; by: 'id' | 'reference'; select: string; customer: string; admin: string }> = {
  contact_received: { table: 'contact_enquiries', by: 'id', select: '*', customer: 'contact_customer', admin: 'contact_admin' },
  quote_received: { table: 'quote_requests', by: 'reference', select: '*,services(title)', customer: 'quote_customer', admin: 'quote_admin' },
  booking_received: { table: 'bookings', by: 'reference', select: '*,services(title)', customer: 'booking_customer', admin: 'booking_admin' },
}

async function handlePublic(type: string, body: any) {
  const cfg = PUBLIC[type]
  const value = String(body?.[cfg.by] ?? '')
  if (cfg.by === 'id' ? !UUID.test(value) : !REF.test(value)) return { ok: true }
  const rows = await dbGet(`${cfg.table}?${cfg.by}=eq.${encodeURIComponent(value)}&select=${encodeURIComponent(cfg.select)}&limit=1`)
  const rec = rows[0]
  // Unknown, too old, or already handled: say nothing and send nothing.
  if (!rec || Date.now() - new Date(rec.created_at).getTime() > 15 * 60 * 1000) return { ok: true }
  const prior = await dbGet(`email_logs?related_id=eq.${rec.id}&template=eq.${cfg.customer}&select=status`)
  if (prior.some((p) => p.status === 'sent') || prior.length >= 3) return { ok: true }
  await send(rec.email, (T as any)[cfg.customer](rec), { template: cfg.customer, table: cfg.table, id: rec.id })
  const notify = env('ADMIN_NOTIFY_EMAIL').split(',').map((s) => s.trim()).filter(Boolean)
  for (const to of notify) await send(to, (T as any)[cfg.admin](rec), { template: cfg.admin, table: cfg.table, id: rec.id, replyTo: rec.email })
  return { ok: true }
}

// ---------- admin handlers ----------
async function requireAdmin(req: Request): Promise<{ token: string } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { url, key } = sb()
  const headers = { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  try {
    const who = await fetch(`${url}/auth/v1/user`, { headers })
    if (!who.ok) return null
    const isAdmin = await fetch(`${url}/rest/v1/rpc/is_admin`, { method: 'POST', headers, body: '{}' })
    if (!isAdmin.ok || (await isAdmin.json()) !== true) return null
    return { token }
  } catch { return null }
}

const fail = (status: number, message: string, code = 'error') => ({ status, body: { ok: false, code, message } })
const sendFailure = (r: Sent) => r.code === 'not_configured'
  ? fail(503, 'Email is not set up yet. Add the Resend key to Supabase (see the setup guide).', 'not_configured')
  : fail(502, 'The email could not be sent. Nothing was changed. Please try again, or contact the customer yourself.', r.code)

async function quotationSend(body: any, token: string) {
  const id = String(body?.quotation_id ?? '')
  if (!UUID.test(id)) return fail(400, 'Invalid quotation.')
  const rows = await dbGet(`quotations?id=eq.${id}&select=${encodeURIComponent('*,quote_requests(*,services(title))')}&limit=1`)
  const q = rows[0]
  if (!q) return fail(404, 'That quotation was not found.')
  const r = q.quote_requests
  if (q.sent_at) return fail(409, 'This quotation is already marked as sent.')
  if (q.expires_on && q.expires_on < new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date())) return fail(409, 'This quotation has expired. Create a new one.')
  if (!['quotation_prepared', 'quotation_sent'].includes(r.status)) return fail(409, 'Set the request to "quotation prepared" before sending a quotation.')
  const sent = await send(r.email, T.quotation(q, r), { template: 'quotation', table: 'quotations', id: q.id })
  if (!sent.ok) return sendFailure(sent)
  // The email is out, so now record it as sent (as the admin, so the activity log names them).
  const { url, key } = sb()
  const mark = await fetch(`${url}/rest/v1/rpc/send_quotation`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_quotation_id: q.id }),
  })
  if (!mark.ok) return { status: 200, body: { ok: true, marked: false, message: 'The email was sent, but it could not be marked as sent. Press “Mark as sent” yourself.' } }
  return { status: 200, body: { ok: true, marked: true, message: `Quotation emailed to ${r.email} and marked as sent.` } }
}

async function bookingUpdate(body: any) {
  const id = String(body?.booking_id ?? '')
  if (!UUID.test(id)) return fail(400, 'Invalid booking.')
  const rows = await dbGet(`bookings?id=eq.${id}&select=${encodeURIComponent('*,services(title)')}&limit=1`)
  const b = rows[0]
  if (!b) return fail(404, 'That booking was not found.')
  const template = `booking_${b.status}`
  if (!['booking_confirmed', 'booking_reschedule_proposed', 'booking_declined', 'booking_cancelled'].includes(template))
    return fail(409, 'There is no customer email for this status.')
  const sent = await send(b.email, (T as any)[template](b), { template, table: 'bookings', id: b.id })
  if (!sent.ok) return sendFailure(sent)
  return { status: 200, body: { ok: true, message: `Email sent to ${b.email}.` } }
}

// ---------- request entry point ----------
function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = ALLOWED_ORIGINS.some((re) => re.test(origin))
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://dedondc.com',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin',
  }
}

async function handler(req: Request): Promise<Response> {
  const headers = { ...cors(req), 'Content-Type': 'application/json' }
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (req.method !== 'POST') return reply(405, { ok: false, message: 'Method not allowed.' })
  let body: any
  try {
    const raw = await req.text()
    if (raw.length > 5000) return reply(413, { ok: false, message: 'Request too large.' })
    body = JSON.parse(raw)
  } catch { return reply(400, { ok: false, message: 'Invalid request.' }) }
  const type = String(body?.type ?? '')
  try {
    if (type in PUBLIC) return reply(200, await handlePublic(type, body))
    if (type === 'quotation_send' || type === 'booking_update') {
      const admin = await requireAdmin(req)
      if (!admin) return reply(401, { ok: false, code: 'unauthorised', message: 'Please sign in again.' })
      const out = type === 'quotation_send' ? await quotationSend(body, admin.token) : await bookingUpdate(body)
      return reply(out.status, out.body)
    }
    return reply(400, { ok: false, message: 'Unknown request.' })
  } catch (e) {
    console.error('send-email failed', e)
    return reply(500, { ok: false, code: 'server', message: 'Something went wrong. Please try again.' })
  }
}

;(globalThis as any).Deno.serve(handler)
