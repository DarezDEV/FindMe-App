import { AuthoritySidebar } from '../components/AuthoritySidebar'
import { AuthorityDashboard } from '../components/Authoritydashboard'
import AuthorityTopbar from '../components/AuthorityTopbar'

export default function AuthorityHome() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AuthoritySidebar />
      <main className="flex-1 overflow-y-auto">
        <AuthorityTopbar />
        <AuthorityDashboard />
      </main>
    </div>
  )
}

