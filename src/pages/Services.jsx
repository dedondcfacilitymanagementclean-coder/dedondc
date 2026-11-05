import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Seo from '../components/Seo'
import ServiceRow from '../components/ServiceRow'
import ServicesState from '../components/ServicesState'
import { useServices } from '../lib/useServices'

export default function Services() {
  const { loading, error, services } = useServices()
  const { hash } = useLocation()
  useEffect(() => {
    // jump to the chosen service once the list has loaded (from a "Learn More" button)
    if (hash && services.length) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash, services.length])
  return (
    <>
      <Seo title="Cleaning & Facility Services in Asaba | DE DON DC"
           description="Residential, commercial, janitorial, deep, post-construction and medical facility cleaning, plus facility management, fumigation and pest control in Asaba." />
      <section className="page-head"><div className="wrap"><h1>Our services</h1>
        <p>Cleaning, sanitation, facility management and pest control for homes and businesses in Asaba.</p></div></section>
      <section className="section"><div className="wrap">
        <ServicesState loading={loading} error={error} count={services.length} />
        <div className="svc-list">{services.map((s) => <ServiceRow key={s.id} s={s} />)}</div>
      </div></section>
    </>
  )
}
