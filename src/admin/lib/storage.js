import { supabase } from '../../lib/supabase'
import { resizeToWebp } from './image'

// Shrinks the picture, uploads it to the public bucket under a random name, and returns its path.
export async function uploadPicture(file, folder) {
  const blob = await resizeToWebp(file)
  const path = `${folder}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from('public-media').upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw new Error('upload_failed')
  return path
}

// Best effort: pictures bundled with the website (paths starting with "/") are never deleted.
export async function removePicture(path) {
  if (!path || path.startsWith('/')) return
  try { await supabase.storage.from('public-media').remove([path]) } catch { /* ignore */ }
}
