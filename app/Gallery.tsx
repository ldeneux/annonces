'use client'
import { useState } from 'react'
// Galerie façon Loger : 1 grande photo + 2 petites, bouton « Afficher les N photos », diaporama plein écran
export default function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [i, setI] = useState<number | null>(null), n = photos.length
  if (!n) return null
  const go = (e: React.MouseEvent, d: number) => { e.stopPropagation(); setI((x) => (x === null ? x : (x + d + n) % n)) }
  return <>
    <div className={`gal gal${Math.min(n, 3)}`}>
      {photos.slice(0, 3).map((p, k) => <img key={p} src={p} alt={alt} onClick={() => setI(k)} />)}
      <button className="gal-btn" onClick={() => setI(0)}>📷 Afficher les {n} photos</button>
    </div>
    {i !== null && <div className="lb" onClick={() => setI(null)}>
      <button className="x" onClick={() => setI(null)}>✕</button>
      {n > 1 && <button className="l" onClick={(e) => go(e, -1)}>‹</button>}
      <img src={photos[i]} alt={alt} onClick={(e) => e.stopPropagation()} />
      {n > 1 && <button className="r" onClick={(e) => go(e, 1)}>›</button>}
      <span>{i + 1} / {n}</span>
    </div>}
  </>
}
