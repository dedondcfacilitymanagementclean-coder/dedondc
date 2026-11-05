import { Link } from 'react-router-dom'
import { useTestimonials, initials, clampRating } from '../lib/useTestimonials'

export default function Testimonials() {
  const { loading, items } = useTestimonials(6)
  return (
    <section className="section alt" aria-labelledby="testimonials-title">
      <div className="wrap">
        <h2 id="testimonials-title">What our clients say</h2>
        {loading ? (
          <p role="status">Loading…</p>
        ) : items.length === 0 ? (
          <div className="testi-empty">
            <p className="testi-quote-mark" aria-hidden="true">“</p>
            <p><strong>Client testimonials coming soon.</strong></p>
            <p>Feedback from our clients will appear here once it has been shared with us and approved for publication.</p>
            <Link className="btn btn-ghost btn-sm" to="/contact">Contact us</Link>
          </div>
        ) : (
          <div className="grid">
            {items.map((t) => (
              <figure className="testi" key={t.id}>
                {clampRating(t.rating) > 0 && (
                  <p className="stars" role="img" aria-label={`${clampRating(t.rating)} out of 5 stars`}>
                    {'★'.repeat(clampRating(t.rating))}<span>{'★'.repeat(5 - clampRating(t.rating))}</span>
                  </p>
                )}
                <blockquote>{t.message}</blockquote>
                <figcaption>
                  <span className="testi-avatar" aria-hidden="true">{initials(t.customer_name)}</span>
                  <span><strong>{t.customer_name}</strong>{t.customer_role && <small>{t.customer_role}</small>}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
