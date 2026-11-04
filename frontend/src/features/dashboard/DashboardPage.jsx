import { Icon } from '@/components/ui/Icon'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getDashboard } from '@/services/dashboardService'
import './Dashboard.css'

const statusLabels = { ENVOYER: 'En attente', VALIDER: 'Validée', REFUSER: 'Refusée', BON_IMPRIME: 'Bon imprimé' }
const statusColors = { ENVOYER: 'var(--status-warning)', VALIDER: 'var(--status-good)', BON_IMPRIME: 'var(--status-info)', REFUSER: 'var(--status-critical)' }
const slug = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replaceAll(' ', '-')
const format = value => Number(value || 0).toLocaleString('fr-FR')
const emptyDashboard = { cards: [], recent: [], series: [], statuses: [], topArticles: [], topServices: [], critical: [], indicators: {} }

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
}

export function DashboardPage({ role, user, onNavigate, notify }) {
  const notifyRef = useRef(notify)
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    return getDashboard()
      .then(data => { setDashboard({ ...emptyDashboard, ...data }); setUpdatedAt(new Date()) })
      .catch(error => notifyRef.current?.(error.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let active = true
    getDashboard()
      .then(data => { if (active) { setDashboard({ ...emptyDashboard, ...data }); setUpdatedAt(new Date()) } })
      .catch(error => { if (active) notifyRef.current?.(error.message, 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const client = role === 'Client'
  const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const firstName = user?.name?.split(' ').slice(-1)[0]
  const primaryAction = client ? ['forms', 'Nouvelle demande', '＋'] : role === 'Dépositaire' ? ['deliveryNotes', 'Bons de sortie', '→'] : ['requests', 'Demandes à valider', '→']
  const { indicators } = dashboard
  const seriesLabels = dashboard.seriesLabels || { entrees: 'Entrées en stock', sorties: 'Sorties livrées' }
  const seriesKeys = dashboard.seriesKeys || ['entrees', 'sorties']

  return <div className={`dashboard ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
    <section className="dash-hero">
      <div>
        <span className="dash-date">{date}</span>
        <h2>{greeting()}{firstName ? `, ${firstName}` : ''} 👋</h2>
        <p>{loading ? 'Chargement de votre activité…' : client ? 'Suivez vos demandes, vos réceptions et le stock de votre service.' : 'Voici l’état du stock et du circuit des demandes, en temps réel.'}</p>
      </div>
      <div className="dash-hero-actions">
        <button type="button" className="dash-refresh" onClick={load} disabled={loading} title="Actualiser les données">
          <span aria-hidden="true" className={loading ? 'spin' : ''}>↻</span>{updatedAt ? `Mis à jour à ${updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Actualiser'}
        </button>
        <button type="button" className="dash-cta" onClick={() => onNavigate(primaryAction[0])}>{primaryAction[2] === '＋' && '＋ '}{primaryAction[1]}{primaryAction[2] === '→' && ' →'}</button>
      </div>
    </section>

    <section className="kpi-grid" aria-label="Indicateurs clés">
      {(loading && !dashboard.cards.length ? Array.from({ length: 4 }, (_, index) => ({ label: index })) : dashboard.cards).map(card => typeof card.label === 'number'
        ? <article key={card.label} className="kpi-card skeleton" aria-hidden="true"><span /><div><i /><i /></div></article>
        : <button type="button" key={card.label} className={`kpi-card ${card.color}`} onClick={() => onNavigate(card.page)}>
          <span className="kpi-icon"><Icon name={card.page} fallback={card.icon} /></span>
          <div className="kpi-body">
            <small>{card.label}{card.alert && <i className="kpi-alert" aria-label="Action requise" />}</small>
            <strong>{format(card.value)}{card.suffix}</strong>
            <span className="kpi-note">
              {card.trend !== undefined && card.trend !== null && <b className={`trend ${card.trend > 0 ? 'up' : card.trend < 0 ? 'down' : ''}`}>{card.trend > 0 ? '▲' : card.trend < 0 ? '▼' : '•'} {Math.abs(card.trend)}%</b>}
              {card.note}
            </span>
          </div>
          <em aria-hidden="true">↗</em>
        </button>)}
    </section>

    <div className="dash-row dash-row-main">
      <section className="panel dash-card">
        <header className="dash-card-head">
          <div><h2>{client ? 'Mes quantités demandées' : 'Flux de stock'}</h2><p>Unités par mois · 12 derniers mois</p></div>
          {seriesKeys.length > 1 && <Legend items={seriesKeys.map(key => [key, seriesLabels[key]])} />}
        </header>
        <FlowChart series={dashboard.series} keys={seriesKeys} labels={seriesLabels} loading={loading} />
      </section>
      {client
        ? <section className="panel dash-card">
          <header className="dash-card-head"><div><h2>Activité de mon service</h2><p>Mes opérations · 12 derniers mois</p></div></header>
          <ActivityList items={dashboard.activity || []} onNavigate={onNavigate} />
        </section>
        : <section className="panel dash-card">
          <header className="dash-card-head"><div><h2>Répartition des demandes</h2><p>Toutes périodes confondues</p></div></header>
          <StatusDonut statuses={dashboard.statuses} onNavigate={() => onNavigate('requests')} />
        </section>}
    </div>

    <section className="indicator-strip" aria-label="Indicateurs de performance">
      {client ? <>
        <Indicator icon="▤" label="Demandes envoyées" value={format(indicators.demandesAnnee)} hint="sur les 12 derniers mois" />
        <Indicator icon="▦" label="Unités demandées" value={format(indicators.quantiteDemandee)} hint="sur les 12 derniers mois" />
        <Indicator icon="▣" label="Réceptions confirmées" value={format(indicators.receptions)} hint="articles déclarés reçus" />
        <Indicator icon="⇥" label="Dispatchs effectués" value={format(indicators.dispatchs)} hint="vers vos divisions" />
      </> : <>
        <Indicator icon="◷" label="Délai moyen de traitement" value={indicators.delaiMoyen === null || indicators.delaiMoyen === undefined ? '—' : `${String(indicators.delaiMoyen).replace('.', ',')} j`} hint="sur les 90 derniers jours" />
        <Indicator icon="✓" label="Taux de validation" value={indicators.tauxValidation === null || indicators.tauxValidation === undefined ? '—' : `${indicators.tauxValidation} %`} hint="demandes acceptées, même partiellement" gauge={indicators.tauxValidation} />
        <Indicator icon="▤" label="Demandes traitées" value={format(indicators.demandesTraitees)} hint="sur les 12 derniers mois" />
        <Indicator icon="⇥" label="Entrées ce mois" value={format(dashboard.series.at(-1)?.entrees)} hint={indicators.tendanceEntrees === null || indicators.tendanceEntrees === undefined ? 'premier mois avec des entrées' : `${indicators.tendanceEntrees > 0 ? '+' : ''}${indicators.tendanceEntrees}% vs même période`} />
      </>}
    </section>

    <div className={`dash-row ${client ? 'dash-row-two' : 'dash-row-three'}`}>
      <section className="panel dash-card">
        <header className="dash-card-head"><div><h2>{client ? 'Articles les plus demandés' : 'Articles les plus consommés'}</h2><p>Sur les 12 derniers mois</p></div></header>
        <RankList items={dashboard.topArticles.map(item => ({ label: item.designation, value: item.quantite, unit: item.unite }))} empty="Aucune consommation enregistrée." />
      </section>
      {!client && <section className="panel dash-card">
        <header className="dash-card-head"><div><h2>Services les plus servis</h2><p>Unités accordées · 12 derniers mois</p></div></header>
        <RankList items={dashboard.topServices.map(item => ({ label: item.label, value: item.quantite }))} empty="Aucun service servi pour le moment." tone="blue" />
      </section>}
      {client
        ? <QuickActions role={role} onNavigate={onNavigate} />
        : <section className="panel dash-card">
          <header className="dash-card-head"><div><h2>Alertes de stock</h2><p>Articles sous le seuil minimum</p></div><button type="button" className="dash-link" onClick={() => onNavigate('catalogue')}>Catalogue →</button></header>
          <CriticalList items={dashboard.critical} />
        </section>}
    </div>

    <div className={`dash-row ${client ? '' : 'dash-row-main'}`}>
      <section className="panel dash-card activity">
        <header className="dash-card-head"><div><h2>{dashboard.recentTitle || 'Activité récente'}</h2><p>Données enregistrées dans le système</p></div><button type="button" className="dash-link" onClick={() => onNavigate('requests')}>Tout afficher →</button></header>
        <div className="table-scroll"><table><thead><tr><th>RÉFÉRENCE</th>{!client && <th>SERVICE</th>}<th>ARTICLES</th>{client ? <th>QUANTITÉ DEMANDÉE</th> : <th>STATUT</th>}<th>DATE</th></tr></thead><tbody>{dashboard.recent.map(request => { const status = statusLabels[request.status_demande] || request.status_demande; const lines = request.Liste_demande.map(line => line.Catalogue.designation); return <tr key={request.id_demande_client}><td><strong>DEM-{request.id_demande_client}</strong></td>{!client && <td>{request.Utilisateur?.Service?.nom_service || request.Utilisateur?.nom_complet || '—'}</td>}<td className="dash-objects">{lines.slice(0, 2).join(', ') || 'Aucun article'}{lines.length > 2 && <em> +{lines.length - 2}</em>}</td>{client ? <td>{format(request.Liste_demande.reduce((sum, line) => sum + line.quantite_liste_demande, 0))}</td> : <td><span className={`status ${slug(status)}`}>{status}</span></td>}<td>{new Date(request.date_demande).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr> })}</tbody></table>{!loading && !dashboard.recent.length && <div className="empty">Aucune activité récente.</div>}</div>
      </section>
      {!client && <QuickActions role={role} onNavigate={onNavigate} />}
    </div>
  </div>
}

function Legend({ items }) {
  return <ul className="chart-legend">{items.map(([key, label]) => <li key={key}><i className={`swatch ${key}`} />{label}</li>)}</ul>
}

function Indicator({ icon, label, value, hint, gauge }) {
  return <article className="indicator">
    <span aria-hidden="true">{icon}</span>
    <div><small>{label}</small><strong>{value}</strong><p>{hint}</p>{gauge !== undefined && gauge !== null && <i className="gauge"><b style={{ width: `${Math.min(100, gauge)}%` }} /></i>}</div>
  </article>
}

function FlowChart({ series, keys, labels, loading }) {
  const [active, setActive] = useState(null)
  if (loading && !series.length) return <div className="chart-skeleton" />
  const width = 640
  const height = 240
  const pad = { top: 16, right: 8, bottom: 28, left: 44 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom
  const max = Math.max(1, ...series.flatMap(point => keys.map(key => point[key])))
  const step = niceStep(max)
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step)
  const band = plotW / Math.max(1, series.length)
  const barW = Math.min(keys.length > 1 ? 14 : 20, (band - 10) / keys.length)
  const y = value => pad.top + plotH - (value / top) * plotH
  const empty = series.every(point => keys.every(key => !point[key]))
  const point = active === null ? null : series[active]

  return <div className="flow-chart" onMouseLeave={() => setActive(null)}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Graphique : ${keys.map(key => labels[key]).join(' et ')} par mois`}>
      {ticks.map(tick => <g key={tick}><line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className={tick === 0 ? 'axis' : 'grid'} /><text x={pad.left - 8} y={y(tick) + 4} textAnchor="end">{compact(tick)}</text></g>)}
      {series.map((item, index) => {
        const x = pad.left + index * band + band / 2
        return <g key={item.month}>
          {active === index && <rect x={x - band / 2 + 2} y={pad.top} width={band - 4} height={plotH} rx="6" className="hover-band" />}
          {keys.map((key, position) => <Bar key={key} x={x - (keys.length * barW + (keys.length - 1) * 2) / 2 + position * (barW + 2)} width={barW} y={y(item[key])} base={y(0)} className={`bar ${key}`} />)}
          <text x={x} y={height - 8} textAnchor="middle" className={index === series.length - 1 ? 'current' : ''}>{item.label}</text>
          <rect x={x - band / 2} y={pad.top} width={band} height={plotH + pad.bottom} fill="transparent" onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} tabIndex="0" aria-label={`${item.label} : ${keys.map(key => `${labels[key]} ${item[key]}`).join(', ')}`} />
        </g>
      })}
    </svg>
    {empty && <p className="chart-empty">Aucun mouvement enregistré sur la période.</p>}
    {point && <div className="chart-tooltip" style={{ left: `${((pad.left + active * band + band / 2) / width) * 100}%` }}>
      <strong>{new Date(`${point.month}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong>
      {keys.map(key => <span key={key}><i className={`swatch ${key}`} />{labels[key]}<b>{format(point[key])}</b></span>)}
      <span className="muted">Demandes reçues<b>{format(point.demandes)}</b></span>
    </div>}
  </div>
}

function Bar({ x, width, y, base, className }) {
  const h = base - y
  if (h <= 0) return null
  const r = Math.min(4, h, width / 2)
  return <path className={className} d={`M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${base} Z`} />
}

function niceStep(max) {
  const raw = max / 4
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power
}

function compact(value) {
  return value >= 1000 ? `${(value / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k` : value
}

function StatusDonut({ statuses, onNavigate }) {
  const [active, setActive] = useState(null)
  const total = statuses.reduce((sum, item) => sum + item.value, 0)
  const radius = 62
  const circumference = 2 * Math.PI * radius
  const gap = total && statuses.filter(item => item.value).length > 1 ? 3 : 0
  let offset = 0
  const shown = active ? statuses.find(item => item.key === active) : null
  return <div className="donut-wrap">
    <div className="donut">
      <svg viewBox="0 0 160 160" role="img" aria-label={`Répartition de ${total} demandes par statut`}>
        <circle cx="80" cy="80" r={radius} className="donut-track" />
        {total > 0 && statuses.map(item => {
          const length = (item.value / total) * circumference
          const segment = <circle key={item.key} cx="80" cy="80" r={radius} className={`donut-segment ${active && active !== item.key ? 'dim' : ''}`} stroke={statusColors[item.key]} strokeDasharray={`${Math.max(0, length - gap)} ${circumference}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)" onMouseEnter={() => setActive(item.key)} onMouseLeave={() => setActive(null)} />
          offset += length
          return item.value ? segment : null
        })}
      </svg>
      <div className="donut-center"><strong>{format(shown ? shown.value : total)}</strong><small>{shown ? shown.label : 'demandes'}</small></div>
    </div>
    <ul className="donut-legend">{statuses.map(item => <li key={item.key} onMouseEnter={() => setActive(item.key)} onMouseLeave={() => setActive(null)} className={active === item.key ? 'active' : ''}>
      <i style={{ background: statusColors[item.key] }} /><span>{item.label}</span><b>{format(item.value)}</b><em>{total ? Math.round((item.value / total) * 100) : 0}%</em>
    </li>)}</ul>
    <button type="button" className="dash-link donut-link" onClick={onNavigate}>Voir les demandes →</button>
  </div>
}

function ActivityList({ items, onNavigate }) {
  const max = Math.max(1, ...items.map(item => item.value))
  return <ul className="activity-list">{items.map(item => <li key={item.key}>
    <button type="button" onClick={() => onNavigate(item.page)}>
      <span>{item.label}</span><strong>{format(item.value)}</strong>
      <i><em style={{ width: `${(item.value / max) * 100}%` }} /></i>
    </button>
  </li>)}</ul>
}

function RankList({ items, empty, tone = 'teal' }) {
  if (!items.length) return <div className="dash-empty"><span aria-hidden="true">◌</span>{empty}</div>
  const max = Math.max(...items.map(item => item.value))
  return <ol className={`rank-list ${tone}`}>{items.map((item, index) => <li key={item.label}>
    <b>{index + 1}</b>
    <div><span title={item.label}>{item.label}</span><i><em style={{ width: `${(item.value / max) * 100}%` }} /></i></div>
    <strong>{format(item.value)}<small>{item.unit ? ` ${item.unit}` : ''}</small></strong>
  </li>)}</ol>
}

function CriticalList({ items }) {
  if (!items.length) return <div className="dash-empty good"><span aria-hidden="true">✓</span>Tous les articles sont au-dessus du seuil minimum.</div>
  return <ul className="critical-list">{items.map(item => {
    const ratio = item.minimum ? Math.min(100, (item.quantite / item.minimum) * 100) : 0
    const rupture = item.quantite === 0
    return <li key={item.designation}>
      <div><strong title={item.designation}>{item.designation}</strong><span className={`pill ${rupture ? 'critical' : 'warning'}`}>{rupture ? '⛔ Rupture' : '⚠ Bas'}</span></div>
      <i><em style={{ width: `${ratio}%` }} className={rupture ? 'critical' : 'warning'} /></i>
      <small>{format(item.quantite)} {item.unite} en stock · seuil {format(item.minimum)}</small>
    </li>
  })}</ul>
}

function QuickActions({ role, onNavigate }) {
  const actions = role === 'Client'
    ? [['forms', 'Nouvelle demande', 'Commander des articles'], ['receipts', 'Réception des colis', 'Confirmer une livraison'], ['serviceStock', 'Stock du service', 'Consulter les quantités'], ['dispatch', 'Dispatch interne', 'Répartir aux divisions']]
    : role === 'Dépositaire'
      ? [['deliveryNotes', 'Bons de sortie', 'Imprimer les bons validés'], ['entries', 'Enregistrer une entrée', 'Mettre le stock à jour'], ['catalogue', 'Catalogue', 'Gérer les articles'], ['ai', 'Prévisions IA', 'Anticiper les besoins']]
      : [['requests', 'Demandes à valider', 'Examiner les demandes'], ['users', 'Comptes utilisateurs', 'Approuver les inscriptions'], ['dispatchTracking', 'Suivi des dispatchs', 'Contrôler les répartitions'], ['ai', 'Prévisions IA', 'Anticiper les besoins']]
  return <aside className="panel dash-card quick-actions">
    <header className="dash-card-head"><div><h2>Actions rapides</h2><p>Accès direct aux modules</p></div></header>
    {actions.map(([page, title, text]) => <button type="button" key={page} onClick={() => onNavigate(page)}>
      <i><Icon name={page} /></i><span><strong>{title}</strong><small>{text}</small></span><b aria-hidden="true">›</b>
    </button>)}
  </aside>
}
