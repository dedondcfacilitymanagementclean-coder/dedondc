import Seo from '../components/Seo'
import { useSettings } from '../lib/settings'

export const LEGAL_TEMPLATES = {
  legal_privacy: [
    ['Information we collect', 'When you request a quote, book a service or contact us, we collect your name, email address, phone number, property address or location, job details and any files you choose to upload.'],
    ['Why we collect it', 'To respond to your enquiry, prepare quotations, arrange and manage services, and keep records of our dealings with you.'],
    ['How we use it', 'We use your information to contact you about your request, send quotations and booking updates, and run our business. We do not sell your personal information.'],
    ['Storage and protection', 'Information is stored in a secured database with access limited to authorised staff. Files you upload are kept private.'],
    ['Retention', 'We keep information only as long as needed for the purposes above or as required by law. [Business to confirm retention periods.]'],
    ['Your rights', 'You may ask to access, correct or delete your personal information where applicable, by contacting us.'],
    ['Contact', 'For privacy questions, use the contact details at the bottom of this page or the Contact page.'],
  ],
  legal_terms: [
    ['Use of this website', 'You may use this website to learn about our services and to send enquiries, quote requests and booking requests.'],
    ['Quote requests', 'Submitting a quote request does not create a quotation or a contract. A quotation exists only once we have prepared and sent it to you.'],
    ['Booking requests', 'A booking request is not a confirmed appointment. We review availability and will confirm, propose another time or decline.'],
    ['Confirmation of services', 'A service is confirmed only when we tell you so in writing.'],
    ['Pricing and quotations', 'Prices are stated in the quotation we send you, including any validity period.'],
    ['Cancellations and rescheduling', 'Please tell us as early as possible if you need to cancel or reschedule. [Business to set its policy.]'],
    ['Customer responsibilities', 'Please give accurate information and safe access to the property.'],
    ['Limitations', 'To the extent permitted by law, our liability is limited as agreed in the quotation or service agreement. [Business to review.]'],
    ['Contact', 'Questions about these terms can be sent to us through the Contact page.'],
  ],
}

export default function Legal({ settingKey, title }) {
  const s = useSettings()
  const { company } = s
  const custom = s[settingKey]?.body
  const useCustom = custom && !custom.startsWith('[Template')
  return (
    <>
      <Seo title={`${title} | DE DON DC`} description={`${title} for ${company.name}.`} />
      <section className="page-head"><div className="wrap"><h1>{title}</h1></div></section>
      <section className="section"><div className="wrap narrow">
        {!useCustom && <p className="notice">Draft template. The company must review this document before it is relied on.</p>}
        {useCustom
          ? custom.split('\n\n').map((p, i) => (p.startsWith('## ') ? <h2 key={i}>{p.slice(3)}</h2> : <p key={i}>{p}</p>))
          : LEGAL_TEMPLATES[settingKey].map(([h, t]) => <div key={h}><h2>{h}</h2><p>{t}</p></div>)}
        <p>{company.name} · {company.email} · {company.phone_primary}</p>
      </div></section>
    </>
  )
}
