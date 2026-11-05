import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

const NAV = [['/admin', 'Overview', true], ['/admin/quotes', 'Quote requests', false], ['/admin/bookings', 'Bookings', false], ['/admin/enquiries', 'Contact enquiries', false], ['/admin/services', 'Services', false], ['/admin/projects', 'Projects', false], ['/admin/testimonials', 'Testimonials', false], ['/admin/content', 'Website content', false], ['/admin/activity', 'Activity log', false], ['/admin/settings', 'Settings', false]]

export default function AdminLayout() {
  const { user, fullName, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const [last, setLast] = useState(pathname)
  if (last !== pathname) { setLast(pathname); setOpen(false) }

  return (
    <div className="a-shell">
      <a className="skip" href="#a-main">Skip to content</a>
      <header className="a-top">
        <div className="a-brand"><img src="/logo-96.webp" width="36" height="36" alt="" /><span>DE DON DC Admin</span></div>
        <button className="a-btn a-btn-ghost a-menu" aria-expanded={open} aria-controls="a-nav" onClick={() => setOpen(!open)}>
          {open ? 'Close' : 'Menu'}
        </button>
      </header>
      <aside id="a-nav" className={open ? 'a-side open' : 'a-side'}>
        <nav aria-label="Dashboard">
          {NAV.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
        </nav>
        <div className="a-user">
          <p><strong>{fullName || 'Administrator'}</strong><br /><small>{user?.email}</small></p>
          <button className="a-btn a-btn-ghost" onClick={() => signOut()}>Sign out</button>
        </div>
      </aside>
      <main id="a-main" className="a-main"><Outlet /></main>
    </div>
  )
}
