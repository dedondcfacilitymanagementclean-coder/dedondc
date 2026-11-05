export default function ServicesState({ loading, error, count }) {
  if (loading) return <p role="status">Loading services…</p>
  if (error === 'not_configured')
    return <p className="notice">The database is not connected yet. Add your Supabase keys to the .env file.</p>
  if (error) return <p className="notice" role="alert">We could not load the services. Please refresh the page.</p>
  if (count === 0) return <p className="notice">No services are published yet.</p>
  return null
}
