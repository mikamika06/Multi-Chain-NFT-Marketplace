from __future__ import annotations

import math
import random
from datetime import datetime
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(
    title="AI Valuation Service",
    description="Valuation, similarity, and fraud scoring microservice for the XChain marketplace.",
    version="0.1.0",
)


class ValuationRequest(BaseModel):
    token_pk: str = Field(..., description="Token primary key")
    last_sale_price: float | None = Field(
        default=None, description="Last known sale price denominated in ETH"
    )
    rarity_score: float = Field(..., ge=0, description="Normalized rarity score 0-100")
    volume_24h: float = Field(..., ge=0, description="Collection 24h volume in ETH")
    social_mentions: int = Field(..., ge=0)


class ValuationResponse(BaseModel):
    fair_price: float
    confidence: float
    updated_at: datetime
    features: dict[str, float]


class SimilarityRequest(BaseModel):
    token_pk: str
    embedding: List[float]
    top_k: int = Field(default=5, ge=1, le=25)


class SimilarityResponse(BaseModel):
    token_pk: str
    score: float


class FraudRequest(BaseModel):
    entity_type: str
    entity_id: str
    price: float
    collection_age_days: int
    suspicious_metadata: bool
    duplicate_tx_count: int


class FraudResponse(BaseModel):
    flag: str
    score: float
    reason: str


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "ts": datetime.utcnow().isoformat()}


@app.post("/valuation", response_model=ValuationResponse)
def valuate(payload: ValuationRequest) -> ValuationResponse:
    momentum = math.log1p(payload.volume_24h) * 0.12
    rarity_boost = payload.rarity_score / 100 * 0.4
    social_signal = math.log1p(payload.social_mentions) * 0.05
    base_price = payload.last_sale_price or (payload.volume_24h / 10 + 0.5)
    fair_price = base_price * (1 + momentum + rarity_boost + social_signal)
    confidence = max(0.3, min(0.95, 0.6 + rarity_boost - momentum / 2))

    return ValuationResponse(
        fair_price=round(fair_price, 4),
        confidence=round(confidence, 2),
        updated_at=datetime.utcnow(),
        features={
            "momentum": round(momentum, 4),
            "rarity_boost": round(rarity_boost, 4),
            "social_signal": round(social_signal, 4),
        },
    )


@app.post("/similarity", response_model=list[SimilarityResponse])
def similar(payload: SimilarityRequest) -> List[SimilarityResponse]:
    random.seed(len(payload.embedding))
    results = []
    for idx in range(payload.top_k):
        score = max(0.0, 1.0 - idx * 0.1 + random.random() * 0.05)
        results.append(SimilarityResponse(token_pk=f"{payload.token_pk}-sim-{idx}", score=score))
    return results


@app.post("/fraud-score", response_model=FraudResponse)
def fraud_score(payload: FraudRequest) -> FraudResponse:
    risk = 0.0
    if payload.price > 20:
        risk += 0.25
    if payload.collection_age_days < 30:
        risk += 0.3
    if payload.suspicious_metadata:
        risk += 0.2
    risk += min(0.25, payload.duplicate_tx_count * 0.05)

    label = "review"
    reason = "Baseline checks passed."
    if risk >= 0.7:
        label = "block"
        reason = "High risk: suspicious metadata and pricing anomaly."
    elif risk >= 0.4:
        label = "monitor"
        reason = "Moderate risk: new collection with irregular pricing."

    return FraudResponse(flag=label, score=round(min(risk, 1.0), 2), reason=reason)
