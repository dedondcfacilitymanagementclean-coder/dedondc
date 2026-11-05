export const MAX_PICK_BYTES = 12 * 1024 * 1024
export const PICKABLE = ['image/jpeg', 'image/png', 'image/webp']

export function validateImageFile(file) {
  if (!file) return 'Choose a picture.'
  if (!PICKABLE.includes(file.type)) return 'Use a JPG, PNG or WebP picture.'
  if (file.size > MAX_PICK_BYTES) return 'The picture is larger than 12 MB. Choose a smaller one.'
  return ''
}

// Scales (w, h) down so the longer side is at most `max`, never up.
export function fitWithin(w, h, max) {
  if (!w || !h) return { width: 0, height: 0 }
  const k = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) }
}

// Shrinks a picture in the browser before upload and saves it as WebP, so the site stays fast on phones.
export async function resizeToWebp(file, max = 1600, quality = 0.82) {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max)
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality))
  if (!blob) throw new Error('resize_failed')
  return blob
}
