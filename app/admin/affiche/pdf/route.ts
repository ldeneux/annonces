import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import QRCode from 'qrcode'
import { isAdmin } from '@/lib/supabase'
import { E } from '@/lib/fmt'
export const dynamic = 'force-dynamic'
const c = (h: string) => { const n = parseInt(h.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }
// Les polices PDF standard n'acceptent que WinAnsi : on nettoie les caractères exotiques (espaces fines des prix, apostrophes courbes…)
const clean = (s: any) => String(s ?? '').replace(/[\u202f\u00a0]/g, ' ').replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/œ/g, 'oe').replace(/[^\x0A\x20-\x7E\xA1-\xFF€]/g, '')
function wrap(t: string, f: PDFFont, size: number, max: number) {
  const out: string[] = []
  for (const para of t.split('\n')) { let line = ''
    for (const w of para.split(' ')) { const test = line ? line + ' ' + w : w; if (f.widthOfTextAtSize(test, size) > max && line) { out.push(line); line = w } else line = test }
    out.push(line) }
  return out
}
function fit(t: string, f: PDFFont, size: number, max: number) { while (t.length > 1 && f.widthOfTextAtSize(t, size) > max) t = t.slice(0, -2) + '.'; return t }

export async function GET() {
  const s = await isAdmin()
  if (!s) return new Response('Not found', { status: 404 })
  const { data: cfg } = await s.from('annonces_affiche').select('*').maybeSingle()
  const ids: string[] = cfg?.bien_ids || []
  const { data: all } = ids.length ? await s.from('annonces_biens').select('*').in('id', ids) : { data: [] as any[] }
  const biens = ids.map((id) => (all || []).find((b) => b.id === id)).filter(Boolean) as any[]
  const { data: ct } = await s.from('annonces_contact').select('*').maybeSingle()
  const url = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '') + '/'

  const pdf = await PDFDocument.create(); pdf.setTitle('À vendre')
  const W = 595.28, H = 841.89, pg = pdf.addPage([W, H])
  const sans = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), serif = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const NAVY = c('#1e2a5e'), ORG = c('#c8690f'), MUT = c('#5b6390')
  const ctr = (t: string, y: number, f: PDFFont, size: number, col = NAVY) => { t = clean(t); pg.drawText(t, { x: (W - f.widthOfTextAtSize(t, size)) / 2, y, size, font: f, color: col }) }

  pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: c('#fbf8f1') })
  pg.drawRectangle({ x: 0, y: H - 14, width: W, height: 14, color: ORG })
  let y = H - 120
  ctr('À VENDRE', y, bold, 78, ORG); y -= 50
  if (cfg?.titre) for (const l of wrap(clean(cfg.titre), serif, 26, W - 100)) { ctr(l, y, serif, 26); y -= 32 }
  if (cfg?.description) { y -= 4; for (const l of wrap(clean(cfg.description), sans, 13, W - 140)) { ctr(l, y, sans, 13, MUT); y -= 18 } }
  y -= 14

  // Cartes des biens cochés (la zone du bas est réservée au QR code)
  const avail = y - 300, n = biens.length
  if (n) {
    const rowH = Math.max(34, Math.min(64, avail / n - 8)), maxN = Math.max(0, Math.floor((avail + 8) / (rowH + 8)))
    biens.slice(0, maxN).forEach((b) => {
      const top = y, x = 50, w = W - 100
      pg.drawRectangle({ x, y: top - rowH, width: w, height: rowH, color: rgb(1, 1, 1), borderColor: c('#ece7da'), borderWidth: 1 })
      const pr = clean(b.transaction === 'vente' ? E(b.prix) : `${E(Number(b.loyer_hc) + Number(b.charges_recuperables || 0))}/mois`), pw = bold.widthOfTextAtSize(pr, 15)
      pg.drawText(pr, { x: x + w - 14 - pw, y: top - rowH / 2 - 5, size: 15, font: bold, color: ORG })
      const maxW = w - 40 - pw, sub = clean([b.ville, b.nb_pieces ? `${b.nb_pieces} pieces` : null, b.surface_m2 ? `${String(b.surface_m2).replace('.', ',')} m²` : null].filter(Boolean).join(' · '))
      const two = rowH >= 46
      pg.drawText(fit(clean(b.titre), bold, 13, maxW), { x: x + 14, y: two ? top - rowH / 2 + 4 : top - rowH / 2 - 4, size: 13, font: bold, color: NAVY })
      if (two) pg.drawText(fit(sub, sans, 10, maxW), { x: x + 14, y: top - rowH / 2 - 12, size: 10, font: sans, color: MUT })
      y -= rowH + 8
    })
  }

  // QR code vectoriel (le même pour toutes les annonces : page d'accueil)
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' }), N = qr.modules.size, S = 150, cell = S / (N + 4), qx = (W - S) / 2, qy = 135
  pg.drawRectangle({ x: qx, y: qy, width: S, height: S, color: rgb(1, 1, 1), borderColor: c('#ece7da'), borderWidth: 1 })
  for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) if (qr.modules.get(r, k))
    pg.drawRectangle({ x: qx + (k + 2) * cell, y: qy + S - (r + 3) * cell, width: cell + 0.15, height: cell + 0.15, color: NAVY })
  ctr('Scannez pour voir toutes les annonces', 112, bold, 12)
  ctr(url.replace(/^https?:\/\//, ''), 96, sans, 10, MUT)
  if (cfg?.afficher_tel && ct?.telephone) ctr(`${ct.nom ? ct.nom + ' - ' : ''}${ct.telephone}`, 56, bold, 16, ORG)

  return new Response(new Uint8Array(await pdf.save()), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="a-vendre.pdf"' } })
}
