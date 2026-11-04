import asyncio
import hmac
import logging
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Header, HTTPException
from .config import TOKEN, RETRAIN_DAYS
from .engine import active, predict, train

logger = logging.getLogger('optistock.ai')


async def scheduler():
    while True:
        try:
            result = await asyncio.to_thread(train)
            logger.info('Training status: %s', result['status'])
        except Exception:
            logger.exception('Automatic training failed; current model retained')
        await asyncio.sleep(RETRAIN_DAYS * 86400)


@asynccontextmanager
async def lifespan(app):
    if not TOKEN or TOKEN == 'replace-with-a-long-random-secret':
        raise RuntimeError('Configurez AI_SERVICE_TOKEN avant le démarrage.')
    task = asyncio.create_task(scheduler())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


def authenticate(x_ai_token: str = Header(default='')):
    if not TOKEN or not hmac.compare_digest(x_ai_token, TOKEN):
        raise HTTPException(401, 'Non autorisé')


app = FastAPI(title='OptiStock AI', lifespan=lifespan, dependencies=[Depends(authenticate)])


@app.get('/status')
def status():
    return {'model': active(), 'retrainDays': RETRAIN_DAYS}


@app.post('/train')
def training():
    try:
        return train()
    except Exception:
        logger.exception('Training failed')
        raise HTTPException(503, 'Entraînement impossible. Vérifiez la connexion PostgreSQL et les journaux IA.')


@app.get('/predict')
def forecast(month: str):
    try:
        return predict(month)
    except ValueError as error:
        raise HTTPException(400, str(error))
    except Exception:
        logger.exception('Prediction failed')
        raise HTTPException(503, 'Prévision indisponible. Vérifiez les journaux IA.')
