import AdminSidebar from '../../admin/components/Adminsidebar'
import { NotificationsCenter } from '../components/NotificationsCenter'

export default function AdminNotificationsPage() {
  return (
    <AdminSidebar>
      <main className="min-h-screen bg-background py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <NotificationsCenter limit={350} />
        </div>
      </main>
    </AdminSidebar>
  )
}
