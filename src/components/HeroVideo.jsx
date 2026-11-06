import { useEffect, useRef, useState } from 'react'

// The video is only decoration, so it never carries information and has no sound.
// It stays still for people who asked their device to reduce motion, and for visitors on
// "data saver", who see the poster picture instead. Everyone else can pause it.
function canAutoplay() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    if (navigator.connection?.saveData) return false
  } catch { /* ignore */ }
  return true
}

export default function HeroVideo() {
  const ref = useRef(null)
  const [enabled] = useState(canAutoplay)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true // some browsers only autoplay when this is set from script as well
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) // e.g. battery-saver mode
  }, [])

  function toggle() {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {})
    else { v.pause(); setPlaying(false) }
  }

  return (
    <>
      {enabled && (
        <video ref={ref} className="hero-media" poster="/hero-poster.webp" muted loop playsInline autoPlay
          preload="auto" aria-hidden="true" tabIndex={-1} disablePictureInPicture
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}>
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      )}
      <div className="hero-shade" aria-hidden="true" />
      {enabled && (
        <button type="button" className="hero-pause" onClick={toggle} aria-pressed={!playing}>
          {playing ? 'Pause background video' : 'Play background video'}
        </button>
      )}
    </>
  )
}
