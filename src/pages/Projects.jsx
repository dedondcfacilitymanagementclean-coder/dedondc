import { useState } from 'react'
import Seo from '../components/Seo'
import ProjectCard from '../components/ProjectCard'
import Lightbox from '../components/Lightbox'
import { useProjects } from '../lib/useProjects'
import { categoriesFrom, filterProjects } from '../lib/projects'

export default function Projects() {
  const { loading, error, projects } = useProjects()
  const [cat, setCat] = useState('all')
  const [open, setOpen] = useState(null)
  const cats = categoriesFrom(projects)
  const shown = filterProjects(projects, cat)
  const nav = (d) => setOpen((i) => (i + d + shown.length) % shown.length)

  return (
    <>
      <Seo title="Our Projects | DE DON DC Cleaning & Facility Management"
           description="Photos of cleaning and facility management work by DE DON DC in Asaba and surrounding areas." />
      <section className="page-head"><div className="wrap"><h1>Our projects</h1>
        <p>A look at work completed by our team.</p></div></section>
      <section className="section"><div className="wrap">
        {loading && <p role="status">Loading projects…</p>}
        {error === 'not_configured' && <p className="notice">The database is not connected yet.</p>}
        {error === 'failed' && <p className="notice" role="alert">We could not load the projects. Please refresh the page.</p>}
        {!loading && !error && projects.length === 0 && (
          <p className="notice">Project photographs will appear here once the company uploads them. Please check back soon.</p>
        )}
        {cats.length > 1 && (
          <div className="chips" role="group" aria-label="Filter projects by service">
            {[{ slug: 'all', title: 'All' }, ...cats].map((c) => (
              <button key={c.slug} type="button" className="chip" aria-pressed={cat === c.slug}
                      onClick={() => { setCat(c.slug); setOpen(null) }}>{c.title}</button>
            ))}
          </div>
        )}
        <div className="proj-grid">
          {shown.map((p, i) => <ProjectCard key={p.id} p={p} onOpen={() => setOpen(i)} />)}
        </div>
        {open !== null && shown[open] && <Lightbox items={shown} index={open} onClose={() => setOpen(null)} onNav={nav} />}
      </div></section>
    </>
  )
}
