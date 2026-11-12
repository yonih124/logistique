import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { getForecast, trainModel } from '@/services/aiService'

export function ForecastPage({ notify }) {
  const now = new Date()
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 7)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [training, setTraining] = useState(null)
  const run = async retrain => {
    setBusy(true)
    try {
      if (retrain) { const report = await trainModel(); setTraining(report); notify(report.message || 'Entraînement en cours') }
      setResult(await getForecast(month))
    } catch (error) { notify(error.message, 'error') }
    finally { setBusy(false) }
  }
  return <div className="prediction-page">
    <section className="prediction-launch"><div className="prediction-symbol"><Icon name="ai" /></div><div><h2>Estimation des demandes des services du mois prochain</h2><p>Mois prévu : {month} · Calcul à partir des mois complets précédents, sans données simulées.</p></div><div className="prediction-controls"><button disabled={busy} onClick={() => run(false)}>{busy ? 'Calcul en cours…' : 'Calculer la prévision'}</button><button disabled={busy} onClick={() => run(true)}>Réentraîner le modèle</button></div></section>
    {training && <p role="status">{training.message}</p>}
    {result && <><section className="panel"><header><div><h2>{result.model ? 'Modèle : Gradient Boosting' : 'Estimation : moyenne des 3 derniers mois disponibles'}</h2><p>{result.warning}</p>{result.model && <p>Version {result.model.version} · Erreur absolue moyenne au test : {result.model.mae.toFixed(2)} unités (moyenne de référence : {result.model.baselineMae.toFixed(2)}). Score historique à un mois, pas une mesure de précision pour cette projection à deux étapes.</p>}</div></header><div className="table-scroll"><table><thead><tr><th>ARTICLE</th><th>UNITÉ</th><th>QUANTITÉ ESTIMÉE POUR LE MOIS PROCHAIN</th><th>MÉTHODE / HISTORIQUE</th></tr></thead><tbody>{result.articles.map(article => <tr key={article.id_catalogue}><td>{article.designation}</td><td>{article.unite}</td><td>{article.quantity ?? 'Non disponible'}</td><td>{article.method === 'gradient_boosting' ? 'Modèle entraîné' : article.historyMonths ? 'Moyenne indicative' : 'Historique insuffisant'} · {article.historyMonths} mois</td></tr>)}</tbody></table>{!result.articles.length && <p className="empty">Aucun article dans le catalogue.</p>}</div></section><p>Quantités que les services demandeurs pourraient demander le mois prochain, par article et tous services confondus. Le mois en cours, incomplet, est exclu de l’historique ; le modèle le projette avant de prévoir le mois prochain. Sans historique suffisant, aucune prévision fiable ne peut être fournie.</p></>}
  </div>
}
