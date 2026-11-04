import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { FullScreenLoader, Spinner } from '@/components/ui/Loader'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoginPage } from '@/features/auth/LoginPage'
import { useAppNavigate } from '@/hooks/useAppNavigate'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useAuth } from './providers/AuthProvider'
import { useNotify } from './providers/FeedbackProvider'
import { canAccess, HOME_PATH, LOGIN_PATH, PAGES, pageMeta } from './routes'

// Chaque page est chargée à la demande : le premier affichage reste léger.
const named = (loader, name) => lazy(() => loader().then(module => ({ default: module[name] })))
const DashboardPage = named(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage')
const RequestsPage = named(() => import('@/features/requests/RequestsPage'), 'RequestsPage')
const NewRequestPage = named(() => import('@/features/requests/NewRequestPage'), 'NewRequestPage')
const MessagesPage = named(() => import('@/features/messages/MessagesPage'), 'MessagesPage')
const CataloguePage = named(() => import('@/features/catalogue/CataloguePage'), 'CataloguePage')
const EntriesPage = named(() => import('@/features/entries/EntriesPage'), 'EntriesPage')
const DeliveryNotesPage = named(() => import('@/features/deliveries/DeliveryNotesPage'), 'DeliveryNotesPage')
const HistoryPage = named(() => import('@/features/history/HistoryPage'), 'HistoryPage')
const ReceiptsPage = named(() => import('@/features/receipts/ReceiptsPage'), 'ReceiptsPage')
const ReferenceDataPage = named(() => import('@/features/references/ReferenceDataPage'), 'ReferenceDataPage')
const ForecastPage = named(() => import('@/features/forecast/ForecastPage'), 'ForecastPage')
const UserApprovalsPage = named(() => import('@/features/users/UserApprovalsPage'), 'UserApprovalsPage')
const DispatchPage = named(() => import('@/features/dispatch/DispatchPage'), 'DispatchPage')
const ProfilePage = named(() => import('@/features/profile/ProfilePage'), 'ProfilePage')

/** Contenu de chaque page, à partir de l'utilisateur et des utilitaires communs. */
const views = {
  dashboard: ({ user, notify, navigateTo }) => <DashboardPage role={user.role} user={user} onNavigate={navigateTo} notify={notify} />,
  requests: ({ user, notify }) => <RequestsPage role={user.role} notify={notify} />,
  forms: ({ notify }) => <NewRequestPage notify={notify} />,
  messages: ({ user, notify }) => <MessagesPage user={user} notify={notify} />,
  catalogue: ({ notify }) => <CataloguePage notify={notify} />,
  entries: ({ notify }) => <EntriesPage notify={notify} />,
  entryHistory: ({ user, notify }) => <HistoryPage key="entries" role={user.role} scope="ENTREE_STOCK" notify={notify} />,
  deliveryNotes: ({ notify }) => <DeliveryNotesPage notify={notify} />,
  history: ({ user, notify }) => <HistoryPage key="all" role={user.role} notify={notify} />,
  receipts: ({ notify }) => <ReceiptsPage notify={notify} />,
  references: ({ notify }) => <ReferenceDataPage notify={notify} />,
  ai: ({ notify }) => <ForecastPage notify={notify} />,
  users: ({ notify }) => <UserApprovalsPage notify={notify} />,
  serviceStock: ({ user, notify }) => <DispatchPage key={`stock-${user.im}`} serviceId={user.id_service} role={user.role} mode="stock" notify={notify} />,
  dispatch: ({ user, notify }) => <DispatchPage key={`dispatch-${user.im}`} serviceId={user.id_service} role={user.role} mode="dispatch" notify={notify} />,
  dispatchTracking: ({ user, notify }) => <DispatchPage key={`tracking-${user.im}`} serviceId={user.id_service} role={user.role} mode="dispatch" notify={notify} />,
  profile: ({ user, setUser, notify }) => <ProfilePage user={user} setUser={setUser} notify={notify} />,
}

function PageView({ id }) {
  const { user, setUser } = useAuth()
  const notify = useNotify()
  const navigateTo = useAppNavigate()
  if (!canAccess(id, user.role)) return <Navigate to={HOME_PATH} replace />
  const meta = pageMeta(id, user.role)
  const actions = id === 'requests' && user.role === 'Client' && <button type="button" className="primary" onClick={() => navigateTo('forms')}>＋ Nouvelle demande</button>
  return <>
    {!meta.hideHeader && <PageHeader title={meta.title} subtitle={meta.subtitle} actions={actions} />}
    <ErrorBoundary key={id}>
      <Suspense fallback={<Spinner />}>{views[id]({ user, setUser, notify, navigateTo })}</Suspense>
    </ErrorBoundary>
  </>
}

function ProtectedLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />
  return <AppShell user={user} onLogout={logout}>{children}</AppShell>
}

function LoginRoute() {
  const { user, setUser } = useAuth()
  const notify = useNotify()
  const location = useLocation()
  if (user) return <Navigate to={location.state?.from || HOME_PATH} replace />
  return <LoginPage notify={notify} onLogin={setUser} />
}

export function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <FullScreenLoader label="Ouverture de votre session…" />
  return <Routes>
    <Route path={LOGIN_PATH} element={<LoginRoute />} />
    <Route path="/" element={<Navigate to={HOME_PATH} replace />} />
    {Object.entries(PAGES).map(([id, page]) => <Route key={id} path={page.path} element={<ProtectedLayout><PageView id={id} /></ProtectedLayout>} />)}
    <Route path="*" element={<ProtectedLayout><NotFoundPage /></ProtectedLayout>} />
  </Routes>
}
