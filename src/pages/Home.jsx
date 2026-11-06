import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import ServiceCard from '../components/ServiceCard'
import ServicesState from '../components/ServicesState'
import { useServices, serviceImageUrl } from '../lib/useServices'
import { useProjects } from '../lib/useProjects'
import Testimonials from '../components/Testimonials'
import HeroVideo from '../components/HeroVideo'
import { useSettings } from '../lib/settings'

const STEPS = [
  'Tell us what you need.',
  'Request a quotation.',
  'Confirm your service arrangements.',
  'Receive your cleaning or facility-management service.',
]

export default function Home() {
  const { home, company, loaded } = useSettings()
  const { loading, error, services } = useServices()
  const { projects } = useProjects(3)
  return (
    <>
      <Seo
        title="Cleaning & Facility Management in Asaba | DE DON DC"
        description="Residential, commercial, deep and post-construction cleaning, janitorial, fumigation and facility management services in Asaba, Delta State."
      />
      <section className="hero">
        <HeroVideo />
        <div className="wrap hero-grid">
          <div>
            <h1>{home.hero_title}</h1>
            <p className="lead">{home.hero_text}</p>
            <div className="btn-row">
              <Link className="btn btn-cyan" to="/request-quote">Request a Free Quote</Link>
              <Link className="btn btn-outline" to="/services">Explore Our Services</Link>
            </div>
          </div>
          <div className="hero-panel" aria-hidden="true">
            <img className="hero-logo" src="/logo-512.webp" width="220" height="220" alt="" />
            <p className="hero-slogan">{company.service_promise}</p>
            <span className="bubble b1" /><span className="bubble b2" /><span className="bubble b3" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap narrow">
          <h2>About {company.name}</h2>
          {loaded ? <p>{home.intro}</p> : <p role="status">Loading…</p>}
          <Link className="btn btn-ghost" to="/about">Read more about us</Link>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <h2>Our services</h2>
          <ServicesState loading={loading} error={error} count={services.length} />
          <div className="grid">
            {services.map((s) => <ServiceCard key={s.id} s={s} />)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>Why choose us</h2>
          <div className="grid">
            {loaded && (home.why || []).map((w) => (
              <div className="plain" key={w.title}><h3>{w.title}</h3><p>{w.text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap">
          <h2>How it works</h2>
          <ol className="steps">
            {STEPS.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>Projects</h2>
          {projects.length === 0 ? (
            <p className="notice">Project photographs will appear here once the company uploads them from the admin dashboard.</p>
          ) : (
            <>
              <div className="proj-grid">
                {projects.map((p) => (
                  <Link key={p.id} to="/projects" className="proj" aria-label={`View project: ${p.title}`}>
                    <img src={serviceImageUrl(p.image_path)} alt={p.title} loading="lazy" />
                    <span className="proj-body"><strong>{p.title}</strong></span>
                  </Link>
                ))}
              </div>
              <div className="btn-row"><Link className="btn btn-ghost" to="/projects">See all projects</Link></div>
            </>
          )}
        </div>
      </section>

      <Testimonials />

      {company.service_areas?.length > 0 && (
        <section className="section alt" aria-labelledby="areas-h">
          <div className="wrap">
            <h2 id="areas-h">Areas we serve</h2>
            <p>Based in Asaba, we serve clients across the South-East and Delta region.</p>
            <ul className="areas">
              {company.service_areas.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
        </section>
      )}

      <section className="cta">
        <div className="wrap">
          <h2>Ready for a Cleaner, Better-Maintained Space?</h2>
          <div className="btn-row center">
            <Link className="btn btn-cyan" to="/request-quote">Request a Quote</Link>
            <Link className="btn btn-outline" to="/book-service">Book a Service</Link>
            <Link className="btn btn-outline" to="/contact">Contact Us</Link>
          </div>
        </div>
      </section>
    </>
  )
}
