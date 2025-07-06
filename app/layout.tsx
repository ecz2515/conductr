import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Conductr - Classical Music Playlist Generator',
  description: 'Generate playlists of classical music recordings for conductors and musicians',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-conductr-gray">
        {children}
      </body>
    </html>
  )
}