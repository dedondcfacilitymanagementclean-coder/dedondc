// Login errors are deliberately vague: they never reveal whether an email has an account.
export function describeLoginError(error) {
  if (!error) return ''
  if (error.status === 429 || /rate limit|too many/i.test(error.message ?? '')) {
    return 'Too many attempts. Please wait a few minutes and try again.'
  }
  if (error.status === 0 || /fetch|network/i.test(error.message ?? '')) {
    return 'Could not reach the server. Check your internet connection and try again.'
  }
  return 'Incorrect email or password.'
}
