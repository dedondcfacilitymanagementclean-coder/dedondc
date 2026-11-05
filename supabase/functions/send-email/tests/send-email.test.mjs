// Run: node --experimental-strip-types --test supabase/functions/send-email/tests/send-email.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'

const envVars = { SUPABASE_URL: 'http://db.test', SUPABASE_SERVICE_ROLE_KEY: 'svc', RESEND_API_KEY: 're_test', ADMIN_NOTIFY_EMAIL: 'boss@example.com, second@example.com' }
let handler
globalThis.Deno = { env: { get: (k) => envVars[k] }, serve: (h) => { handler = h } }
const mod = await import('../index.ts')

const NOW = Date.now()
const state = { tables: {}, calls: [], resendStatus: 200, isAdmin: true, userOk: true, markOk: true }
const reset = () => {
  state.calls = []; state.resendStatus = 200; state.isAdmin = true; state.userOk = true; state.markOk = true
  state.tables = {
    contact_enquiries: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Ada', email: 'ada@example.com', phone: null, subject: 'Hi <b>', message: 'Hello\n<script>alert(1)</script>', created_at: new Date(NOW - 60000).toISOString() }],
    quote_requests: [{ id: '22222222-2222-4222-8222-222222222222', reference: 'QR-261103-ABC123', full_name: 'Obi', email: 'obi@example.com', phone: '08130653226', preferred_contact: 'email', location: 'Asaba', preferred_date: null, description: 'Clean offices', services: { title: 'Office Cleaning' }, status: 'quotation_prepared', created_at: new Date(NOW - 60000).toISOString() }],
    bookings: [{ id: '33333333-3333-4333-8333-333333333333', reference: 'BK-261103-ABC123', full_name: 'Eze', email: 'eze@example.com', phone: '08130653226', address: 'Asaba', preferred_date: '2030-01-10', preferred_time: 'Morning', description: 'Deep clean', services: { title: 'Deep Cleaning' }, status: 'confirmed', proposed_date: '2030-01-12', proposed_time: 'Afternoon', created_at: new Date(NOW - 60000).toISOString() }],
    quotations: [{ id: '44444444-4444-4444-8444-444444444444', reference: 'QT-261103-AAAAAA', amount: 150000, currency: 'NGN', description: 'Monthly cleaning', expires_on: null, sent_at: null, quote_requests: null }],
    email_logs: [],
  }
  state.tables.quotations[0].quote_requests = state.tables.quote_requests[0]
}
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const method = init.method ?? 'GET'
  state.calls.push({ url, method, body: init.body, headers: init.headers })
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s })
  if (url.startsWith('https://api.resend.com')) return state.resendStatus === 200 ? json({ id: 'x' }) : json({ message: 'bad' }, state.resendStatus)
  if (url.includes('/auth/v1/user')) return state.userOk ? json({ id: 'u1' }) : json({}, 401)
  if (url.includes('/rpc/is_admin')) return json(state.isAdmin)
  if (url.includes('/rpc/send_quotation')) return state.markOk ? json(null) : json({ message: 'no' }, 400)
  if (url.includes('/rest/v1/email_logs') && method === 'POST') { state.tables.email_logs.push(JSON.parse(init.body)); return new Response(null, { status: 201 }) }
  const m = url.match(/\/rest\/v1\/(\w+)\?(.*)$/)
  if (m) {
    const [, table, qs] = m; const p = new URLSearchParams(qs); let rows = state.tables[table] ?? []
    for (const [k, v] of p) if (v.startsWith('eq.') && !['select', 'limit'].includes(k)) rows = rows.filter((r) => String(r[k]) === v.slice(3))
    return json(rows)
  }
  return json({}, 404)
}
const call = (body, headers = {}, method = 'POST') => handler(new Request('http://fn.test/', { method, headers: { 'Content-Type': 'application/json', Origin: 'https://dedondc.com', ...headers }, body: method === 'POST' ? JSON.stringify(body) : undefined }))
const resendCalls = () => state.calls.filter((c) => c.url.startsWith('https://api.resend.com'))

test('templates escape customer text', () => {
  const { html } = mod.render(mod.T.contact_admin({ id: 'x', name: '<img src=x>', email: 'a@b.c', subject: 'S', message: '<script>alert(1)</script>' }))
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img src=x>')); assert.ok(html.includes('&lt;script&gt;'))
})

test('public: contact sends to customer then to each admin address', async () => {
  reset()
  const res = await call({ type: 'contact_received', id: '11111111-1111-4111-8111-111111111111' })
  assert.equal(res.status, 200)
  const sent = resendCalls().map((c) => JSON.parse(c.body))
  assert.deepEqual(sent.map((s) => s.to[0]), ['ada@example.com', 'boss@example.com', 'second@example.com'])
  assert.equal(sent[0].reply_to, 'info@dedondc.com'); assert.equal(sent[1].reply_to, 'ada@example.com')
  assert.ok(!sent[0].html.includes('<script>')); assert.ok(!/[\r\n]/.test(sent[1].subject))
  assert.equal(state.tables.email_logs.filter((l) => l.status === 'sent').length, 3)
})

test('public: sending twice does not email twice', async () => {
  reset()
  const b = { type: 'quote_received', reference: 'QR-261103-ABC123' }
  await call(b); const first = resendCalls().length; await call(b)
  assert.equal(resendCalls().length, first)
})

test('public: unknown, malformed or old records send nothing and reveal nothing', async () => {
  reset()
  for (const b of [{ type: 'quote_received', reference: 'QR-000000-000000' }, { type: 'quote_received', reference: "x' or 1=1" }, { type: 'booking_received' }, { type: 'contact_received', id: 'nope' }]) {
    const r = await call(b); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true })
  }
  state.tables.bookings[0].created_at = new Date(NOW - 3600000).toISOString()
  await call({ type: 'booking_received', reference: 'BK-261103-ABC123' })
  assert.equal(resendCalls().length, 0)
})

test('public: Resend failure is logged, customer is not told, retry allowed up to 3 times', async () => {
  reset(); state.resendStatus = 422
  const b = { type: 'booking_received', reference: 'BK-261103-ABC123' }
  const r = await call(b); assert.equal(r.status, 200)
  assert.ok(state.tables.email_logs.some((l) => l.status === 'failed' && l.error.includes('422')))
  state.resendStatus = 200; await call(b)
  assert.ok(state.tables.email_logs.some((l) => l.status === 'sent'))
})

test('public: without a Resend key it logs not_configured and does not crash', async () => {
  reset(); const k = envVars.RESEND_API_KEY; delete envVars.RESEND_API_KEY
  const r = await call({ type: 'contact_received', id: '11111111-1111-4111-8111-111111111111' })
  envVars.RESEND_API_KEY = k
  assert.equal(r.status, 200); assert.equal(resendCalls().length, 0)
  assert.ok(state.tables.email_logs.every((l) => l.status === 'not_configured'))
})

test('admin actions need a signed-in admin', async () => {
  reset()
  const body = { type: 'quotation_send', quotation_id: '44444444-4444-4444-8444-444444444444' }
  assert.equal((await call(body)).status, 401)
  state.userOk = false; assert.equal((await call(body, { Authorization: 'Bearer bad' })).status, 401)
  state.userOk = true; state.isAdmin = false; assert.equal((await call(body, { Authorization: 'Bearer t' })).status, 401)
  assert.equal(resendCalls().length, 0)
})

test('admin: quotation is emailed to the stored address and then marked as sent', async () => {
  reset()
  const r = await call({ type: 'quotation_send', quotation_id: '44444444-4444-4444-8444-444444444444', to: 'attacker@evil.com' }, { Authorization: 'Bearer t' })
  const out = await r.json(); assert.equal(out.ok, true); assert.equal(out.marked, true)
  const sent = resendCalls().map((c) => JSON.parse(c.body)); assert.equal(sent.length, 1)
  assert.equal(sent[0].to[0], 'obi@example.com'); assert.ok(sent[0].html.includes('150,000'))
  const mark = state.calls.find((c) => c.url.includes('/rpc/send_quotation')); assert.equal(mark.headers.Authorization, 'Bearer t')
})

test('admin: if the email fails, the quotation is NOT marked as sent', async () => {
  reset(); state.resendStatus = 500
  const r = await call({ type: 'quotation_send', quotation_id: '44444444-4444-4444-8444-444444444444' }, { Authorization: 'Bearer t' })
  assert.equal(r.status, 502); assert.ok(!state.calls.some((c) => c.url.includes('/rpc/send_quotation')))
})

test('admin: already sent, expired, or wrong-state quotations are refused', async () => {
  reset(); const b = { type: 'quotation_send', quotation_id: '44444444-4444-4444-8444-444444444444' }
  state.tables.quotations[0].sent_at = '2026-01-01'; assert.equal((await call(b, { Authorization: 'Bearer t' })).status, 409)
  state.tables.quotations[0].sent_at = null; state.tables.quotations[0].expires_on = '2020-01-01'; assert.equal((await call(b, { Authorization: 'Bearer t' })).status, 409)
  state.tables.quotations[0].expires_on = null; state.tables.quote_requests[0].status = 'new'; assert.equal((await call(b, { Authorization: 'Bearer t' })).status, 409)
  assert.equal(resendCalls().length, 0)
})

test('admin: email sent but marking failed is reported honestly', async () => {
  reset(); state.markOk = false
  const out = await (await call({ type: 'quotation_send', quotation_id: '44444444-4444-4444-8444-444444444444' }, { Authorization: 'Bearer t' })).json()
  assert.equal(out.ok, true); assert.equal(out.marked, false)
})

test('admin: booking emails follow the booking status', async () => {
  reset(); const h = { Authorization: 'Bearer t' }; const id = '33333333-3333-4333-8333-333333333333'
  for (const [status, word] of [['confirmed', 'confirmed'], ['reschedule_proposed', 'different time'], ['declined', 'cannot take'], ['cancelled', 'cancelled']]) {
    state.tables.bookings[0].status = status
    const r = await call({ type: 'booking_update', booking_id: id }, h); assert.equal(r.status, 200)
    assert.ok(JSON.parse(resendCalls().at(-1).body).html.includes(word), status)
  }
  state.tables.bookings[0].status = 'completed'
  assert.equal((await call({ type: 'booking_update', booking_id: id }, h)).status, 409)
})

test('admin: no Resend key gives a clear 503', async () => {
  reset(); const k = envVars.RESEND_API_KEY; delete envVars.RESEND_API_KEY
  const r = await call({ type: 'booking_update', booking_id: '33333333-3333-4333-8333-333333333333' }, { Authorization: 'Bearer t' })
  envVars.RESEND_API_KEY = k; assert.equal(r.status, 503); assert.equal((await r.json()).code, 'not_configured')
})

test('basic request hygiene: CORS, methods, junk bodies', async () => {
  reset()
  const pre = await call(null, { Origin: 'https://www.dedondc.com' }, 'OPTIONS'); assert.equal(pre.status, 204)
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), 'https://www.dedondc.com')
  const evil = await call(null, { Origin: 'https://evil.com' }, 'OPTIONS'); assert.equal(evil.headers.get('Access-Control-Allow-Origin'), 'https://dedondc.com')
  assert.equal((await call(null, {}, 'GET')).status, 405)
  assert.equal((await handler(new Request('http://x/', { method: 'POST', body: 'not json' }))).status, 400)
  assert.equal((await call({ type: 'who_knows' })).status, 400)
  assert.equal((await handler(new Request('http://x/', { method: 'POST', body: 'x'.repeat(6000) }))).status, 413)
})
