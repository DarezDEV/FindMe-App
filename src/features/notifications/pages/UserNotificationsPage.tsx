import UserNavbar from '../../user/components/Usernavbar'
import { NotificationsCenter } from '../components/NotificationsCenter'

export default function UserNotificationsPage() {
  return (
    <>
      <UserNavbar />
      <main className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <NotificationsCenter limit={250} />
        </div>
      </main>
    </>
  )
}
