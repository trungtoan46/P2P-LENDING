from flask import Flask, request, jsonify
from src.scoring_service import ScoringService
import os
import logging
import numpy as np

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize Service globally to load models once
try:
    logger.info("Initializing Scoring Engine...")
    service = ScoringService(artifacts_dir='artifacts')
    logger.info("Scoring Engine Initialized Successfully.")
except Exception as e:
    logger.error(f"Failed to initialize Scoring Engine: {e}")
    raise e

# API accepts English field names only
# Vietnamese field names are only used in documentation for client integration

def convert_numpy(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy(i) for i in obj]
    else:
        return obj

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "vn_scoring_engine"}), 200

@app.route('/score', methods=['POST'])
def score_customer():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400
        
        # API accepts English field names only
        customer_name = data.get('customer_name', 'Unknown')
        logger.info(f"Received scoring request for: {customer_name}")
        
        # Predict with English field names
        result = service.predict(data)
        
        # Convert all numpy types to native python types
        clean_result = convert_numpy(result)
        
        return jsonify({
            "status": "success",
            "data": clean_result
        }), 200

    except Exception as e:
        logger.error(f"Error processing request: {e}")
        return jsonify({"error": str(e), "status": "error"}), 500

if __name__ == '__main__':
    # Dev server
    app.run(host='0.0.0.0', port=8000, debug=True)
