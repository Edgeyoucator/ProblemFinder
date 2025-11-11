import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Catalyst Change Project',
  description: 'Problem Incubator - Define clear, actionable problems',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
