export function PageHeader({ title, subtitle, actions }) {
  return <header className="page-header">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    <div className="header-actions">{actions}</div>
  </header>
}
