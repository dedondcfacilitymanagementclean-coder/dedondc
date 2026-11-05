import { useEffect, useRef } from 'react'
import { serviceImageUrl } from '../lib/useServices'
import { formatMonthYear } from '../lib/format'

// Uses the browser's built-in <dialog>: it traps focus and closes with the Escape key.
export default function Lightbox({ items, index, onClose, onNav }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => { if (d?.open) d.close() }
  }, [])
  const p = items[index]
  const meta = [p.services?.title, p.location, formatMonthYear(p.completed_on)].filter(Boolean).join(' · ')
  return (
    <dialog ref={ref} className="lightbox" aria-label={p.title} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') onNav(1); if (e.key === 'ArrowLeft') onNav(-1) }}>
      <button className="lb-close" onClick={onClose} aria-label="Close">✕</button>
      <img src={serviceImageUrl(p.image_path)} alt={p.title} />
      <div className="lb-caption">
        <h2>{p.title}</h2>
        {meta && <p className="lb-meta">{meta}</p>}
        {p.description && <p>{p.description}</p>}
      </div>
      {items.length > 1 && (
        <div className="lb-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => onNav(-1)}>← Previous</button>
          <span>{index + 1} / {items.length}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onNav(1)}>Next →</button>
        </div>
      )}
    </dialog>
  )
}
