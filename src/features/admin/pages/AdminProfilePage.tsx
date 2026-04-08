import AdminSidebar from '../components/Adminsidebar'
import { ProfileFormPanel } from '../../../shared/components/profile/ProfileFormPanel'

export default function AdminProfilePage() {
  return (
    <AdminSidebar>
      <ProfileFormPanel backTo="/admin/dashboard" backLabel="Volver al dashboard" />
    </AdminSidebar>
  )
}

