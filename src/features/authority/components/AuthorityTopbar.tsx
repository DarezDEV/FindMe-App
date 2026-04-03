import { useState } from 'react'
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
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '12px 24px',
        background: '#ffffff',
        borderBottom: '1px solid #E4E7EC',
      }}
    >
      <UserProfileMenu
        open={open}
        onToggle={() => setOpen((prev) => !prev)}
        onClose={() => setOpen(false)}
        roleLabel="Autoridad"
        badgeClassName="badge-authority"
      />
    </div>
  )
}
