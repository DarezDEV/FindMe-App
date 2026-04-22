import { AuthoritySidebar } from '../../authority/components/AuthoritySidebar'
import { NotificationsCenter } from '../components/NotificationsCenter'

export default function AuthorityNotificationsPage() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AuthoritySidebar />
      <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <NotificationsCenter limit={350} />
        </div>
      </div>
    </div>
  )
}
