import UserNavbar from '../components/Usernavbar'
import { ProfileFormPanel } from '../../../shared/components/profile/ProfileFormPanel'

export default function MiPerfilPage() {
  return (
    <>
      <UserNavbar />
      <ProfileFormPanel backTo="/user" backLabel="Volver al inicio" />
    </>
  )
}
