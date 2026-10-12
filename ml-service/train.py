import os
import sys
import json
import psycopg2
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics import classification_report, precision_recall_fscore_support, accuracy_score
import joblib

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[Error] DATABASE_URL not found in ml-service/.env")
    sys.exit(1)

MODEL_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "model.joblib")
METRICS_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "metrics.json")

def load_data():
    print(f"[Training] Connecting to PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    
    # Extract one row per asteroid using closest approach (minimum miss_distance_km)
    query = """
    WITH closest_approaches AS (
        SELECT 
            neo_object_id,
            miss_distance_km,
            relative_velocity_kmh,
            ROW_NUMBER() OVER (PARTITION BY neo_object_id ORDER BY miss_distance_km ASC) as rank
        FROM close_approach_events
    )
    SELECT 
        n.id,
        n.neo_reference_id,
        n.name,
        n.absolute_magnitude_h,
        n.estimated_diameter_min_km,
        n.estimated_diameter_max_km,
        o.eccentricity,
        ca.miss_distance_km,
        ca.relative_velocity_kmh,
        n.is_potentially_hazardous
    FROM neo_objects n
    JOIN orbital_elements o ON o.neo_object_id = n.id
    JOIN closest_approaches ca ON ca.neo_object_id = n.id AND ca.rank = 1;
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    print(f"[Training] Loaded {len(df)} asteroid records (1-row-per-asteroid closest approach).")
    return df

def train_and_evaluate():
    df = load_data()
    
    feature_cols = [
        "miss_distance_km",
        "relative_velocity_kmh",
        "absolute_magnitude_h",
        "estimated_diameter_min_km",
        "estimated_diameter_max_km",
        "eccentricity"
    ]
    
    # Check for missing values and impute/drop if necessary
    df_clean = df.dropna(subset=feature_cols + ["is_potentially_hazardous"]).copy()
    print(f"[Training] Clean records: {len(df_clean)}")
    
    X = df_clean[feature_cols]
    y = df_clean["is_potentially_hazardous"].astype(int)
    
    hazardous_count = y.sum()
    non_hazardous_count = len(y) - hazardous_count
    print(f"[Training] Class balance: {non_hazardous_count} Non-Hazardous (0), {hazardous_count} Hazardous (1)")
    
    # Train Random Forest with balanced class weights
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=5,
        random_state=42,
        class_weight="balanced"
    )
    
    # Perform 5-fold Stratified Cross-Validation to evaluate generalizeability
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scoring = {
        'precision': 'precision',
        'recall': 'recall',
        'f1': 'f1',
        'accuracy': 'accuracy'
    }
    cv_results = cross_validate(clf, X, y, cv=cv, scoring=scoring)
    
    mean_precision = float(np.mean(cv_results['test_precision']))
    mean_recall = float(np.mean(cv_results['test_recall']))
    mean_f1 = float(np.mean(cv_results['test_f1']))
    mean_acc = float(np.mean(cv_results['test_accuracy']))
    
    print("\n================ Cross-Validation Metrics (Hazardous Class) ================")
    print(f"Hazardous Precision: {mean_precision:.4f}")
    print(f"Hazardous Recall:    {mean_recall:.4f}")
    print(f"Hazardous F1 Score:  {mean_f1:.4f}")
    print(f"Overall Accuracy:    {mean_acc:.4f}")
    print("============================================================================\n")
    
    # Fit final model on full clean dataset
    clf.fit(X, y)
    
    # Feature importances
    importances = dict(zip(feature_cols, [float(x) for x in clf.feature_importances_]))
    print("[Training] Feature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {feat}: {imp:.4f}")
        
    # Save model artifact
    joblib.dump(clf, MODEL_OUTPUT_PATH)
    print(f"\n[Training] Model artifact saved to: {MODEL_OUTPUT_PATH}")
    
    # Save metrics record
    metrics_data = {
        "dataset_size": len(df_clean),
        "hazardous_count": int(hazardous_count),
        "non_hazardous_count": int(non_hazardous_count),
        "cv_metrics_hazardous": {
            "precision": mean_precision,
            "recall": mean_recall,
            "f1": mean_f1
        },
        "cv_accuracy": mean_acc,
        "feature_importances": importances
    }
    with open(METRICS_OUTPUT_PATH, "w") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"[Training] Metrics recorded to: {METRICS_OUTPUT_PATH}")

if __name__ == "__main__":
    train_and_evaluate()
