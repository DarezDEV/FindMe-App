import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import UserProfileMenu from '../../../shared/components/layout/UserProfileMenu'

export default function AuthorityTopbar() {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: '#ffffff',
        borderBottom: '1px solid #E4E7EC',
      }}
    >
      <Link to="/authority" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img
          src="/findMeLogo.svg"
          alt="FindMe System"
          style={{ width: 32, height: 32, objectFit: 'contain' }}
          onError={(event) => {
            event.currentTarget.style.display = 'none'
            const sibling = event.currentTarget.nextElementSibling as HTMLElement | null
            if (sibling) sibling.style.display = 'flex'
          }}
        />
        <span style={{ display: 'none', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={18} color="#2B5CE6" />
        </span>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>FindMe System</span>
      </Link>
      <UserProfileMenu
        open={open}
        onToggle={() => setOpen((prev) => !prev)}
        onClose={() => setOpen(false)}
        roleLabel="Autoridad"
        badgeClassName="badge-authority"
        items={[
          { icon: <ShieldCheck size={15} />, label: 'Mi perfil', to: '/authority/perfil' },
        ]}
      />
    </div>
  )
}
