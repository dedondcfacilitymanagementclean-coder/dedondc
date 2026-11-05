import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSettings } from '../lib/settings'

const NAV = [
  ['/', 'Home'], ['/about', 'About'], ['/services', 'Services'],
  ['/projects', 'Projects'], ['/contact', 'Contact'],
]

function Logo({ name }) {
  return (
    <Link to="/" className="logo" aria-label={name + ' home'}>
      <img className="logo-img" src="/logo-96.webp" width="48" height="48" alt="" />
      <span className="logo-text">DE DON DC<small>Facility Management &amp; Cleaning</small></span>
    </Link>
  )
}

export default function Layout() {
  const { company } = useSettings()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const [last, setLast] = useState(pathname)
  if (last !== pathname) { setLast(pathname); setOpen(false) }
  const wa = `https://wa.me/${company.whatsapp}?text=${encodeURIComponent('Hello, I would like to make an enquiry.')}`
  const tel = (p) => `tel:${p.replace(/\s/g, '')}`

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="header">
        <div className="wrap header-row">
          <Logo name={company.name} />
          <button className="menu-btn" aria-expanded={open} aria-controls="nav" onClick={() => setOpen(!open)}>
            {open ? 'Close' : 'Menu'}
          </button>
          <nav id="nav" className={open ? 'nav open' : 'nav'} aria-label="Main">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
            ))}
            <Link className="btn btn-ghost" to="/book-service">Book a Service</Link>
            <Link className="btn btn-primary" to="/request-quote">Request a Quote</Link>
          </nav>
        </div>
      </header>
      <main id="main"><Outlet /></main>
      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <strong className="footer-name">{company.name}</strong>
            <p>RC No. {company.rc_number} · Established {company.established}</p>
            <p>{company.service_promise}</p>
            <p><em>{company.slogan}</em></p>
          </div>
          <div>
            <h3>Explore</h3>
            {NAV.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
            <Link to="/request-quote">Request a Quote</Link>
            <Link to="/book-service">Book a Service</Link>
          </div>
          <div>
            <h3>Contact</h3>
            <a href={tel(company.phone_primary)}>{company.phone_primary}</a>
            <a href={tel(company.phone_secondary)}>{company.phone_secondary}</a>
            <a href={`mailto:${company.email}`}>{company.email}</a>
            <span className="fline">{company.address || company.location}</span>
            {company.branch_address && <span className="fline">{company.branch_address}</span>}
            {company.service_areas?.length > 0 && <span className="fline">Serving {company.service_areas.map((a) => a.replace(/ State$/, '')).join(', ')} States</span>}
          </div>
          <div>
            <h3>Legal</h3>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
          </div>
        </div>
        <div className="wrap footer-base">© {new Date().getFullYear()} {company.name}. All rights reserved.</div>
      </footer>
      <a className="wa-float" href={wa} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
        WhatsApp
      </a>
    </>
  )
}
