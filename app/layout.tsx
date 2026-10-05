import './globals.css'
export const metadata = { title: 'Annonces immobilières' }
export default function L({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
  </head><body>{children}</body></html>
}
