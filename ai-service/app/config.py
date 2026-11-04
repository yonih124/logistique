import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')
MODEL_DIR = ROOT / 'models'
TOKEN = os.getenv('AI_SERVICE_TOKEN', '')
DATABASE_URL = os.getenv('DATABASE_URL', '')
RETRAIN_DAYS = max(1, int(os.getenv('AI_RETRAIN_DAYS', '7')))
