export function Spinner({ label = 'Chargement…' }) {
  return <div className="ui-spinner" role="status"><span aria-hidden="true" /><small>{label}</small></div>
}

export function FullScreenLoader({ label }) {
  return <div className="ui-fullscreen-loader"><Spinner label={label} /></div>
}
