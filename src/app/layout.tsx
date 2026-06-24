import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Conciliação Contábil',
  description: 'Conciliação contábil automática a partir do razão em Excel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
