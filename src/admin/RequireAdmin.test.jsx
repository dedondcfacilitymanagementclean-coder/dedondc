// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from './AuthContext'
import RequireAdmin from './RequireAdmin'

afterEach(cleanup)

function show(auth) {
  render(
    <AuthContext.Provider value={{ signOut: vi.fn(), ...auth }}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin/login" element={<p>LOGIN PAGE</p>} />
          <Route path="/admin" element={<RequireAdmin><p>SECRET DASHBOARD</p></RequireAdmin>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireAdmin (unauthorized dashboard access)', () => {
  it('sends a visitor who is not signed in to the login page', () => {
    show({ status: 'ready', session: null, role: null })
    expect(screen.getByText('LOGIN PAGE')).toBeTruthy()
    expect(screen.queryByText('SECRET DASHBOARD')).toBeNull()
  })

  it('blocks a signed-in ordinary customer account', () => {
    show({ status: 'ready', session: { user: { id: 'u' } }, role: 'customer' })
    expect(screen.getByText('Access denied')).toBeTruthy()
    expect(screen.queryByText('SECRET DASHBOARD')).toBeNull()
  })

  it('blocks a signed-in account with no profile row', () => {
    show({ status: 'ready', session: { user: { id: 'u' } }, role: null })
    expect(screen.queryByText('SECRET DASHBOARD')).toBeNull()
  })

  it('shows nothing private while the session is still being checked', () => {
    show({ status: 'loading', session: null, role: null })
    expect(screen.queryByText('SECRET DASHBOARD')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('lets a signed-in administrator through', () => {
    show({ status: 'ready', session: { user: { id: 'u' } }, role: 'admin' })
    expect(screen.getByText('SECRET DASHBOARD')).toBeTruthy()
  })
})
