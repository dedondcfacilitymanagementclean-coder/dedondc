import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

// This guard only improves the experience. Real security is enforced by the database
// (Row Level Security + is_admin()), so even a hacked browser cannot read private data.
export default function RequireAdmin({ children }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'unconfigured') {
    return <main className="a-center"><p className="a-notice">The database is not connected. Add your Supabase keys to the .env file.</p></main>
  }
  if (auth.status === 'loading') {
    return <main className="a-center"><p role="status">Checking your session…</p></main>
  }
  if (!auth.session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  if (auth.role !== 'admin') {
    return (
      <main className="a-center">
        <div className="a-card a-narrow">
          <h1>Access denied</h1>
          <p>This account is not authorised to use the dashboard.</p>
          <button className="a-btn" onClick={() => auth.signOut()}>Sign out</button>
        </div>
      </main>
    )
  }
  return children
}
