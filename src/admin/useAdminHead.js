import { useEffect } from 'react'

// Keeps every admin page out of search engines and sets a clear tab title.
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}

export function useTitle(title) {
  useEffect(() => { document.title = `${title} | DE DON DC Admin` }, [title])
}
