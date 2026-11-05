import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import About from './pages/About'
import Services from './pages/Services'
import Contact from './pages/Contact'
import Legal from './pages/Legal'
import RequestQuote from './pages/RequestQuote'
import BookService from './pages/BookService'
import Projects from './pages/Projects'
import NotFound from './pages/NotFound'

// The dashboard is loaded only when /admin is opened, so it never slows down the public site.
const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return (
    <Routes>
      <Route path="admin/*" element={<Suspense fallback={<p role="status" style={{ padding: 24 }}>Loading…</p>}><AdminApp /></Suspense>} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy-policy" element={<Legal settingKey="legal_privacy" title="Privacy Policy" />} />
        <Route path="terms-of-service" element={<Legal settingKey="legal_terms" title="Terms of Service" />} />
        <Route path="projects" element={<Projects />} />
        <Route path="request-quote" element={<RequestQuote />} />
        <Route path="book-service" element={<BookService />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
