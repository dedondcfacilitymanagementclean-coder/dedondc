export function categoriesFrom(projects) {
  const map = new Map()
  projects.forEach((p) => { if (p.services?.slug) map.set(p.services.slug, p.services.title) })
  return [...map].map(([slug, title]) => ({ slug, title })).sort((a, b) => a.title.localeCompare(b.title))
}

export function filterProjects(projects, slug) {
  return !slug || slug === 'all' ? projects : projects.filter((p) => p.services?.slug === slug)
}
