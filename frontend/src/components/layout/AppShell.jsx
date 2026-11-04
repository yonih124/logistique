import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Icon } from '@/components/ui/Icon'
import { Logo } from '@/components/ui/Logo'
import { NotificationCenter } from '@/features/notifications/NotificationCenter'
import { PAGES, SIDEBAR, TOP_NAV } from '@/app/routes'
import { useAppNavigate } from '@/hooks/useAppNavigate'
import './TopNavigation.css'
import './SidebarProfile.css'

const formatCount = count => (count > 99 ? '99+' : count)

function CountBadge({ count }) {
  return count > 0 && <b aria-label={`${count} notifications non lues`}>{formatCount(count)}</b>
}

export function AppShell({ user, onLogout, children }) {
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({})
  const { pathname } = useLocation()
  const navigateTo = useAppNavigate()
  const sections = SIDEBAR[user.role] || []
  const topNav = TOP_NAV[user.role]
  const isActive = id => PAGES[id]?.path === pathname

  const go = id => { navigateTo(id); setOpen(false) }

  useEffect(() => {
    if (!open) return
    const onKey = event => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return <div className="shell">
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Menu principal">
      <div className="side-head"><Logo light /><button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu">×</button></div>
      <nav>
        {sections.map(section => <div className="nav-section" key={section.label}>
          <span>{section.label.toUpperCase()}</span>
          {section.items.map(([id, label]) => <button type="button" className={isActive(id) ? 'active' : ''} aria-current={isActive(id) ? 'page' : undefined} key={id} onClick={() => go(id)}>
            <i><Icon name={id} /></i>{label}<CountBadge count={counts[id]} />
          </button>)}
        </div>)}
      </nav>
      <div className="profile">
        <button type="button" className="sidebar-profile-link" onClick={() => go('profile')} aria-label="Mon profil" title="Mon profil" aria-current={isActive('profile') ? 'page' : undefined}>
          <SidebarAvatar key={user.avatar} user={user} />
          <span className="sidebar-profile-info"><strong>{user.name}</strong><small>{user.role}</small></span>
        </button>
        <button type="button" onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter"><Icon name="logout" /></button>
      </div>
    </aside>
    <main className={`main ${topNav ? 'has-top-navigation' : ''}`}>
      <div className="mobile-head">
        <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">☰</button>
        <Logo />
        <button type="button" onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter"><Icon name="logout" /></button>
      </div>
      {topNav && <nav className="top-navigation" aria-label="Navigation des opérations">
        {topNav.map(([id, label]) => <button type="button" key={id} className={isActive(id) ? 'active' : ''} aria-current={isActive(id) ? 'page' : undefined} onClick={() => go(id)}>
          <Icon name={id} />{label}<CountBadge count={counts[id]} />
        </button>)}
      </nav>}
      <div className="page-content" key={pathname}>{children}</div>
      <NotificationCenter key={user.im} user={user} onNavigate={go} onCountsChange={setCounts} />
    </main>
    {open && <button type="button" className="backdrop" aria-label="Fermer le menu" onClick={() => setOpen(false)} />}
  </div>
}

function SidebarAvatar({ user }) {
  const [failed, setFailed] = useState(false)
  const initials = user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()
  return <span className="sidebar-avatar">{user.avatar && !failed ? <img src={user.avatar} alt="" onError={() => setFailed(true)} /> : initials}</span>
}
