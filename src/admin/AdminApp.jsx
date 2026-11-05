import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import RequireAdmin from './RequireAdmin'
import AdminLayout from './AdminLayout'
import Login from './pages/Login'
import Reset from './pages/Reset'
import Overview from './pages/Overview'
import Settings from './pages/Settings'
import Quotes from './pages/Quotes'
import QuoteDetail from './pages/QuoteDetail'
import QuotationPrint from './pages/QuotationPrint'
import Bookings from './pages/Bookings'
import BookingDetail from './pages/BookingDetail'
import Enquiries from './pages/Enquiries'
import EnquiryDetail from './pages/EnquiryDetail'
import Services from './pages/Services'
import ServiceForm from './pages/ServiceForm'
import Projects from './pages/Projects'
import ProjectForm from './pages/ProjectForm'
import Testimonials from './pages/Testimonials'
import TestimonialForm from './pages/TestimonialForm'
import Content from './pages/Content'
import ActivityLog from './pages/ActivityLog'
import { useNoIndex } from './useAdminHead'
import './admin.css'

export default function AdminApp() {
  useNoIndex()
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="reset" element={<Reset />} />
        <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Overview />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="quotes/:id" element={<QuoteDetail />} />
          <Route path="quotes/:id/quotation/:qid" element={<QuotationPrint />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/:id" element={<BookingDetail />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="enquiries/:id" element={<EnquiryDetail />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:id" element={<ServiceForm />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectForm />} />
          <Route path="testimonials" element={<Testimonials />} />
          <Route path="testimonials/:id" element={<TestimonialForm />} />
          <Route path="content" element={<Content />} />
          <Route path="activity" element={<ActivityLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  )
}
