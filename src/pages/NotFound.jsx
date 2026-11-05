import { Link } from 'react-router-dom'
import Seo from '../components/Seo'

export default function NotFound() {
  return (
    <section className="section"><div className="wrap narrow">
      <Seo title="Page not found | DE DON DC" description="Page not found" />
      <h1>Page not found</h1>
      <p>The page you asked for does not exist.</p>
      <Link className="btn btn-primary" to="/">Back to home</Link>
    </div></section>
  )
}
