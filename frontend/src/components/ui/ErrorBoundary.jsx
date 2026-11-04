import { Component } from 'react'

/** Empêche une erreur d'affichage d'une page de rendre toute l'application blanche. */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Erreur d’affichage', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return <section className="ui-state-card" role="alert">
      <span className="ui-state-symbol is-error" aria-hidden="true">!</span>
      <h2>Cette page n’a pas pu s’afficher</h2>
      <p>Une erreur inattendue est survenue. Rechargez la page ; si le problème persiste, contactez l’administrateur.</p>
      <button type="button" className="primary" onClick={() => window.location.reload()}>Recharger la page</button>
    </section>
  }
}
