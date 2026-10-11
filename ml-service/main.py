import os
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.joblib")
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print(f"[ML-Service] Model successfully loaded from {MODEL_PATH}")
        except Exception as e:
            print(f"[ML-Service] Warning: Failed to load model: {e}")
            model = None
    else:
        print("[ML-Service] Model artifact not yet found. Offline training will produce model.joblib in Phase 2.")
    yield

app = FastAPI(title="NEO Watch ML Microservice", lifespan=lifespan)

class AsteroidFeatures(BaseModel):
    miss_distance_km: float = Field(..., description="Minimum miss distance in kilometers")
    relative_velocity_kmh: float = Field(..., description="Relative velocity in km/h")
    absolute_magnitude_h: float = Field(..., description="Absolute magnitude H")
    estimated_diameter_min_km: float = Field(..., description="Estimated minimum diameter in km")
    estimated_diameter_max_km: float = Field(..., description="Estimated maximum diameter in km")
    eccentricity: float = Field(..., description="Orbital eccentricity")

class PredictionResponse(BaseModel):
    tier: str
    confidence: float
    is_potentially_hazardous: bool
    explanation: str

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "NEO Watch ML Microservice",
        "model_loaded": model is not None
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(features: AsteroidFeatures):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model artifact is not loaded or not yet trained."
        )
    
    # Model inference (will be refined with exact pipeline in Phase 2)
    # Prepared input features
    input_data = [[
        features.miss_distance_km,
        features.relative_velocity_kmh,
        features.absolute_magnitude_h,
        features.estimated_diameter_min_km,
        features.estimated_diameter_max_km,
        features.eccentricity
    ]]
    pred = model.predict(input_data)[0]
    prob = getattr(model, "predict_proba", lambda x: [[0.5, 0.5]])(input_data)[0]
    hazard_prob = float(prob[1]) if len(prob) > 1 else float(pred)

    tier = "High" if hazard_prob >= 0.7 else ("Medium" if hazard_prob >= 0.3 else "Low")

    return PredictionResponse(
        tier=tier,
        confidence=round(hazard_prob, 3),
        is_potentially_hazardous=bool(pred),
        explanation=f"Object classified as {tier} hazard tier based on orbital features reconstructed from NASA criteria."
    )
