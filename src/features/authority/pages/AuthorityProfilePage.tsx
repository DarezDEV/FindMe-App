import { AuthoritySidebar } from '../components/AuthoritySidebar'
import { ProfileFormPanel } from '../../../shared/components/profile/ProfileFormPanel'

export default function AuthorityProfilePage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AuthoritySidebar />
      <div className="flex-1 overflow-y-auto">
        <ProfileFormPanel backTo="/authority" backLabel="Volver al dashboard" />
      </div>
    </div>
  )
}
