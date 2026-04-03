import MiPerfilPage from '../../user/pages/MiPerfilPage'

export default function AuthorityProfilePage() {
  return (
    <MiPerfilPage
      showNavbar={false}
      showAuthorityTopbar
      homePath="/authority"
    />
  )
}
