import { Link } from 'react-router-dom'
import { serviceImageUrl } from '../lib/useServices'
import { excerpt } from '../lib/format'

export default function ServiceCard({ s }) {
  const img = serviceImageUrl(s.image_path)
  return (
    <article className="card">
      {img
        ? <img className="card-img" src={img} alt={s.title} loading="lazy" />
        : <div className="card-icon" aria-hidden="true">{s.icon || '🧼'}</div>}
      <h3>{s.title}</h3>
      <p>{s.short_description || excerpt(s.description, 120)}</p>
      <div className="card-actions">
        <Link className="btn btn-ghost btn-sm" to={`/services#${s.slug}`}>Learn More</Link>
      </div>
    </article>
  )
}
