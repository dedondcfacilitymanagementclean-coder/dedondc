import { Link } from 'react-router-dom'
import { serviceImageUrl } from '../lib/useServices'

export default function ServiceRow({ s }) {
  const img = serviceImageUrl(s.image_path)
  return (
    <article className="svc" id={s.slug}>
      {img
        ? <img className="svc-img" src={img} alt={s.title} loading="lazy" />
        : <div className="svc-icon" aria-hidden="true">{s.icon || '🧼'}</div>}
      <div>
        <h2>{s.title}</h2>
        <p>{s.description}</p>
        {s.benefits?.length > 0 && <ul className="ticks">{s.benefits.map((b) => <li key={b}>{b}</li>)}</ul>}
        <div className="btn-row">
          <Link className="btn btn-primary btn-sm" to={`/request-quote?service=${s.slug}`}>Request a Quote</Link>
          <Link className="btn btn-ghost btn-sm" to={`/book-service?service=${s.slug}`}>Book a Service</Link>
        </div>
      </div>
    </article>
  )
}
