import { supabase } from './supabase'

// Uploads to the PRIVATE bucket using random names, so customers can never overwrite
// each other's files or guess paths. Returns the stored paths.
export async function uploadAttachments(files) {
  const folder = crypto.randomUUID()
  const paths = []
  for (const file of files) {
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' })[file.type]
    const path = `incoming/${folder}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('customer-uploads')
      .upload(path, file, { upsert: false, contentType: file.type })
    if (error) throw new Error('upload_failed')
    paths.push(path)
  }
  return paths
}
