import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DEFAULTS } from '../../lib/settings'
import { formatDate, formatMoney } from '../../lib/format'
import { useTitle } from '../useAdminHead'

export default function QuotationPrint() {
  const { id, qid } = useParams()
  const [state, setState] = useState({ loading: true })
  const c = DEFAULTS.company
  useTitle('Quotation')

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('quotations').select('*').eq('id', qid).eq('quote_request_id', id).maybeSingle(),
      supabase.from('quote_requests').select('reference,full_name,email,phone,location,services(title)').eq('id', id).maybeSingle(),
    ]).then(([q, r]) => {
      if (!active) return
      if (q.error || r.error) setState({ loading: false, failed: true })
      else if (!q.data || !r.data) setState({ loading: false, missing: true })
      else setState({ loading: false, q: q.data, r: r.data })
    })
    return () => { active = false }
  }, [id, qid])

  if (state.loading) return <p role="status">Loading quotation…</p>
  if (state.failed) return <p className="a-error" role="alert">Could not load this quotation.</p>
  if (state.missing) return <p className="a-notice">This quotation was not found.</p>
  const { q, r } = state

  return (
    <>
      <div className="no-print">
        <p><Link to={`/admin/quotes/${id}`}>← Back to request</Link></p>
        <button className="a-btn" onClick={() => window.print()}>Print or save as PDF</button>
        <p className="a-muted a-hint">In the print window, choose “Save as PDF” as the printer to get a file you can send.</p>
      </div>
      <article className="a-paper" aria-label={`Quotation ${q.reference}`}>
        <header>
          <img src="/logo-96.webp" alt="" width="64" height="64" />
          <div>
            <h2>{c.name}</h2>
            <p>RC No. {c.rc_number} · {c.location}<br />{c.phone_primary} · {c.email}</p>
          </div>
        </header>
        <h1>Quotation</h1>
        <dl className="a-dl">
          <dt>Quotation no.</dt><dd>{q.reference}</dd>
          <dt>Request ref.</dt><dd>{r.reference}</dd>
          <dt>Issued</dt><dd>{formatDate(q.created_at)}</dd>
          {q.expires_on && <><dt>Valid until</dt><dd>{formatDate(q.expires_on)}</dd></>}
        </dl>
        <h3>Prepared for</h3>
        <p>{r.full_name}<br />{r.email} · {r.phone}<br />{r.location}</p>
        <h3>Service</h3>
        <p>{r.services?.title ?? '—'}</p>
        <h3>Scope of work</h3>
        <p className="a-pre">{q.description}</p>
        <p className="a-total">Total: <strong>{formatMoney(q.amount, q.currency)}</strong></p>
        <footer><p>{c.slogan}</p></footer>
      </article>
    </>
  )
}
