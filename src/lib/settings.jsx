import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import content from './siteContent.json'
import { mergeSettings } from './mergeSettings'

// Fallbacks come from siteContent.json (facts supplied by the company). The database overrides them.
export const DEFAULTS = {
  ...content,
  legal_privacy: { body: '' },
  legal_terms: { body: '' },
}

const Ctx = createContext(DEFAULTS)
export const useSettings = () => useContext(Ctx)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loaded, setLoaded] = useState(!supabase)
  useEffect(() => {
    if (!supabase) return
    supabase.from('site_settings').select('key,value').then(({ data }) => {
      if (data) {
        const next = { ...DEFAULTS }
        data.forEach((r) => { next[r.key] = mergeSettings(DEFAULTS[r.key] ?? {}, r.value) })
        setSettings(next)
      }
      setLoaded(true)
    })
  }, [])
  return <Ctx.Provider value={{ ...settings, loaded }}>{children}</Ctx.Provider>
}
