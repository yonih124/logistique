import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { Icon } from '@/components/ui/Icon'
import { Logo } from '@/components/ui/Logo'
import { NotificationCenter } from '@/features/notifications/NotificationCenter'
import { PAGES, SIDEBAR, pageIdFromPath, pageMeta, roleLabel, sectionOf } from '@/app/routes'
import { useAppNavigate } from '@/hooks/useAppNavigate'
import { useResponsiveTables } from '@/hooks/useResponsiveTables'
import './SidebarProfile.css'

const COLLAPSED_KEY = 'optistock-sidebar-collapsed'
const formatCount = count => (count > 99 ? '99+' : count)

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSED_KEY) === '1' } catch { return false }
}

function CountBadge({ count }) {
  return count > 0 && <b aria-label={`${count} notifications non lues`}>{formatCount(count)}</b>
}

export function AppShell({ user, onLogout, children }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [counts, setCounts] = useState({})
  const { pathname } = useLocation()
  const navigateTo = useAppNavigate()
  const mainRef = useRef(null)
  useResponsiveTables(mainRef)
  const sections = SIDEBAR[user.role] || []
  const currentId = pageIdFromPath(pathname)
  const current = currentId ? pageMeta(currentId, user.role) : null
  const section = currentId && sectionOf(currentId, user.role)
  const isActive = id => PAGES[id]?.path === pathname

  const go = id => { navigateTo(id); setOpen(false) }
  const toggleCollapsed = () => setCollapsed(value => {
    try { localStorage.setItem(COLLAPSED_KEY, value ? '0' : '1') } catch { /* Préférence conservée pour cette session. */ }
    return !value
  })

  useEffect(() => {
    if (!open) return
    const onKey = event => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return <div className={`shell ${collapsed ? 'is-collapsed' : ''}`}>
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Menu principal">
      <div className="side-head">
        <Logo />
        <button type="button" className="sidebar-close" onClick={() => setOpen(false)} aria-label="Fermer le menu">×</button>
      </div>
      <nav>
        {sections.map(group => <div className="nav-section" key={group.label}>
          <span>{group.label}</span>
          {group.items.map(([id, label]) => <button type="button" className={isActive(id) ? 'active' : ''} aria-current={isActive(id) ? 'page' : undefined} key={id} title={collapsed ? label : undefined} onClick={() => go(id)}>
            <i><Icon name={id} /></i><em>{label}</em><CountBadge count={counts[id]} />
          </button>)}
        </div>)}
      </nav>
      <button type="button" className="sidebar-collapse" onClick={toggleCollapsed} aria-pressed={collapsed} aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'} title={collapsed ? 'Déplier le menu' : 'Replier le menu'}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /><path d={collapsed ? 'm13 10 2 2-2 2' : 'm16 10-2 2 2 2'} /></svg>
        <em>Replier le menu</em>
      </button>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <button type="button" className="topbar-menu" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <div className="topbar-title">
          {section && <span>{section}</span>}
          <strong>{current?.title || 'OptiStock'}</strong>
        </div>
        <div className="topbar-actions">
          <NotificationCenter key={user.im} user={user} onNavigate={go} onCountsChange={setCounts} />
          <button type="button" className={`topbar-user ${isActive('profile') ? 'active' : ''}`} onClick={() => go('profile')} aria-label="Mon profil" title="Mon profil">
            <SidebarAvatar key={user.avatar} user={user} />
            <span className="sidebar-profile-info"><strong>{user.name}</strong><small>{roleLabel(user.role)}</small></span>
          </button>
          <button type="button" className="topbar-logout" onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter"><Icon name="logout" /></button>
        </div>
      </header>
      <main ref={mainRef} className="main">
        <div className="page-content" key={pathname}>{children}</div>
      </main>
    </div>
    {open && <button type="button" className="backdrop" aria-label="Fermer le menu" onClick={() => setOpen(false)} />}
  </div>
}

function SidebarAvatar({ user }) {
  const [failed, setFailed] = useState(false)
  const initials = user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()
  return <span className="sidebar-avatar">{user.avatar && !failed ? <img src={user.avatar} alt="" onError={() => setFailed(true)} /> : initials}</span>
}
