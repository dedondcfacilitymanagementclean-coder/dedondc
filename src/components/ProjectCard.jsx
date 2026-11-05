import { serviceImageUrl } from '../lib/useServices'
import { formatMonthYear } from '../lib/format'

export default function ProjectCard({ p, onOpen }) {
  const meta = [p.location, formatMonthYear(p.completed_on)].filter(Boolean).join(' · ')
  return (
    <button type="button" className="proj" onClick={onOpen} aria-label={`View ${p.title}`}>
      <img src={serviceImageUrl(p.image_path)} alt={p.title} loading="lazy" />
      <span className="proj-body">
        {p.services?.title && <span className="proj-tag">{p.services.title}</span>}
        <strong>{p.title}</strong>
        {meta && <small>{meta}</small>}
      </span>
    </button>
  )
}
