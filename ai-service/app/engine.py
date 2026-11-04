import hashlib
import json
import math
import os
import threading
from datetime import datetime, timezone
import joblib
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from .config import MODEL_DIR
from .features import current_month, forecast_next_month, samples, series, shift
from .repository import load_history

LOCK = threading.Lock()


def active():
    pointer = MODEL_DIR / 'active.json'
    return json.loads(pointer.read_text(encoding='utf-8')) if pointer.exists() else None


def read_model(metadata):
    # Artifacts are generated locally; never accept an uploaded pickle/joblib.
    return joblib.load(MODEL_DIR / (metadata['version'] + '.joblib'))


def train():
    if not LOCK.acquire(blocking=False):
        return {'status': 'busy', 'message': 'Entraînement déjà en cours.'}
    try:
        cutoff = current_month()
        history = load_history()
        fingerprint = hashlib.sha256(json.dumps([cutoff, history], sort_keys=True).encode()).hexdigest()
        previous = active()
        if previous and previous['fingerprint'] == fingerprint:
            return {'status': 'unchanged', 'message': 'Aucune nouvelle période complète.', 'model': previous}
        rows = samples(series(history, cutoff))
        months = sorted({row[0] for row in rows})
        if len(months) < 9 or len(rows) < 30:
            return {'status': 'insufficient', 'message': 'Historique insuffisant : une profondeur globale de 12 mois complets et 30 observations exploitables sont nécessaires.'}
        split = months[-3]
        training = [r for r in rows if r[0] < split]
        testing = [r for r in rows if r[0] >= split]
        model = HistGradientBoostingRegressor(max_iter=100, min_samples_leaf=5, early_stopping=False, random_state=42)
        model.fit([r[1] for r in training], [r[2] for r in training])
        x, y = [r[1] for r in testing], [r[2] for r in testing]
        score = float(mean_absolute_error(y, [max(0, p) for p in model.predict(x)]))
        reference = float(mean_absolute_error(y, [r[1][3] for r in testing]))
        incumbent_score = None
        # Never evaluate an incumbent on months it has already seen.
        if previous and previous['cutoff'] <= split:
            incumbent_score = float(mean_absolute_error(y, [max(0, p) for p in read_model(previous).predict(x)]))
        promote = score < reference and (previous is None or (incumbent_score is not None and score < incumbent_score))
        version = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')
        metadata = {'version': version, 'cutoff': cutoff, 'fingerprint': fingerprint, 'mae': score,
                    'baselineMae': reference, 'incumbentMae': incumbent_score, 'testFrom': split,
                    'trainedAt': datetime.now(timezone.utc).isoformat(), 'promoted': promote}
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        if promote:
            model.fit([r[1] for r in rows], [r[2] for r in rows])
            joblib.dump(model, MODEL_DIR / (version + '.joblib'))
            temporary = MODEL_DIR / 'active.tmp'
            temporary.write_text(json.dumps(metadata), encoding='utf-8')
            os.replace(temporary, MODEL_DIR / 'active.json')
        (MODEL_DIR / (version + '.json')).write_text(json.dumps(metadata), encoding='utf-8')
        return {'status': 'promoted' if promote else 'retained', 'model': metadata,
                'message': 'Nouveau modèle activé.' if promote else 'Modèle actuel ou moyenne conservé : amélioration non démontrée sur des périodes inédites.'}
    finally:
        LOCK.release()


def predict(month):
    cutoff = current_month()
    if month != shift(cutoff, 1):
        raise ValueError('Sélectionnez le mois prochain pour estimer les demandes clients.')
    histories = series(load_history(), cutoff)
    metadata = active()
    model = read_model(metadata) if metadata else None
    articles = []
    for article, values in histories.items():
        quantities = [v for _, v in values]
        usable = model is not None and len(quantities) >= 3
        estimate = forecast_next_month(quantities, cutoff, model if usable else None)
        articles.append({'id_catalogue': article, 'quantity': max(0, math.ceil(estimate)),
                         'historyMonths': len(values), 'method': 'gradient_boosting' if usable else 'moyenne_3_mois'})
    return {'month': month, 'articles': articles, 'model': metadata,
            'warning': 'Prévisions indicatives, sans modification automatique du stock. Les nouveaux articles sans historique ne sont pas prévisibles.'}
