import { Link } from 'react-router-dom'
import Seo from '../components/Seo'
import { useSettings } from '../lib/settings'

const paras = (t) => String(t || '').split('\n\n').map((p, i) => <p key={i}>{p}</p>)

export default function About() {
  const { about, company, loaded } = useSettings()
  const ex = about.experience
  return (
    <>
      <Seo title="About Us | DE DON DC Facility Management and Cleaning Services"
           description="Our history, mission, vision and values. Established November 2022 in Asaba, Delta State." />
      <section className="page-head"><div className="wrap"><h1>About us</h1>
        <p>{company.name} · RC No. {company.rc_number} · Established {company.established}</p></div></section>
      <section className="section"><div className="wrap narrow">
        {!loaded ? <p role="status">Loading…</p> : <>
        {about.background && (<><h2>Our background</h2>{paras(about.background)}</>)}
        {ex && (<>
          <h2>Our founder’s experience</h2>
          <p>{ex.intro}</p>
          <ul className="ticks">{ex.employers.map((e) => <li key={e.name}>{e.name}: {e.period}</li>)}</ul>
          <p>{ex.exposure_title}</p>
          <ul className="ticks">{ex.exposure.map((x) => <li key={x}>{x}</li>)}</ul>
        </>)}
        {about.mission && (<><h2>Our mission</h2><p>{about.mission}</p></>)}
        {about.vision && (<><h2>Our vision</h2><p>{about.vision}</p></>)}
        {about.values?.length > 0 && (<>
          <h2>Our core values</h2>
          {about.values.map((v) => (
            <div className="plain" key={v.title ?? v}><h3>{v.title ?? v}</h3>{v.text && <p>{v.text}</p>}</div>
          ))}
        </>)}
        <h2>Our commitment</h2>
        <p>{about.commitment}</p>
        <p><strong>{company.service_promise}</strong></p>
        <div className="btn-row">
          <Link className="btn btn-primary" to="/request-quote">Request a Quote</Link>
          <Link className="btn btn-ghost" to="/contact">Contact us</Link>
        </div>
        </>}
      </div></section>
    </>
  )
}
