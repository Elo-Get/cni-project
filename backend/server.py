from __future__ import annotations

import numpy as np
import cv2
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from cni_analyzer.prepare import load_insightface, extract_main_face
from cni_analyzer.compare import load_arcface_model, compare_face_arrays

from contextlib import asynccontextmanager

insight_app = None
arcface_model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global insight_app, arcface_model
    insight_app = load_insightface()
    arcface_model = load_arcface_model(ctx_id=-1)
    yield

app = FastAPI(
    title="CNI Analyzer API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _read_upload_as_bgr_image(upload: UploadFile) -> np.ndarray:
    data = upload.file.read()
    if not data:
        raise HTTPException(status_code=400, detail=f"Fichier vide: {upload.filename}")
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail=f"Image invalide: {upload.filename}")
    return img


@app.post("/verify")
def verify(
    image1: UploadFile = File(..., description="Image 1 (CNI / identité)"),
    image2: UploadFile = File(..., description="Image 2 (selfie / autre)"),
    threshold: float = Query(0.35, ge=0.0, le=1.0),
):
    if insight_app is None or arcface_model is None:
        raise HTTPException(status_code=503, detail="Modèles non chargés")

    try:
        img1 = _read_upload_as_bgr_image(image1)
        img2 = _read_upload_as_bgr_image(image2)

        face1 = extract_main_face(insight_app, img1)
        face2 = extract_main_face(insight_app, img2)

        same, sim, prob = compare_face_arrays(
            arcface_model,
            face1,
            face2,
            threshold=threshold,
        )

        return JSONResponse(
            {
                "same": bool(same),
                "similarity": float(sim),
                "probability": float(prob),
                "threshold": float(threshold),
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
