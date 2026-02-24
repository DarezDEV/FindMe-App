import type { PropsWithChildren } from 'react'
import { AuthoritySidebar } from '../../../features/authority/components'

export function AuthorityLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-background md:flex">
      <AuthoritySidebar />
      <main className="flex-1 pt-16 md:pt-0">{children}</main>
    </div>
  )
}

