from flask import Blueprint

api_bp = Blueprint('api', __name__, url_prefix='/api')

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
WEIGHTS_DIR = BASE_DIR / "ekyc" / "models" / "weights"