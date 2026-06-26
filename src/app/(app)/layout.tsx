import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AppLayoutClient } from '@/components/layout/AppLayoutClient'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  return (
    <AppLayoutClient userEmail={session?.user?.email}>
      {children}
    </AppLayoutClient>
  )
}
