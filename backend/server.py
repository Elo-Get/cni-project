from __future__ import annotations
import os
import base64
from contextlib import asynccontextmanager

import numpy as np
import cv2
from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from cni_analyzer.prepare import load_insightface, extract_main_face
from cni_analyzer.compare import load_adaface_model, compare_face_arrays
from cni_analyzer.signature import (
    load_signature_model,
    load_signature_embedder,
    extract_best_signature,
    compare_signatures,
)


insight_app = None
face_model = None
signature_model = None
signature_embedder = None

device = "cpu"
arch = "ir_50"
adaface_path = os.environ.get(
    "ADAFACE_CKPT_PATH", "/models/adaface/pretrained/adaface_ir50_ms1mv2.ckpt"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global insight_app, face_model, signature_model, signature_embedder
    insight_app = load_insightface()
    face_model = load_adaface_model(arch=arch, path=adaface_path, device=device)
    signature_model = load_signature_model()
    signature_embedder = load_signature_embedder(device=device)
    yield


app = FastAPI(
    title="CNI Analyzer API",
    version="0.2.0",
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


def _image_to_base64(img: np.ndarray, fmt: str = ".png") -> str:
    success, buf = cv2.imencode(fmt, img)
    if not success:
        raise RuntimeError("Impossible d'encoder l'image")
    return base64.b64encode(buf).decode("utf-8")


@app.post("/detect-face")
def detect_face(
    image: UploadFile = File(..., description="Photo (selfie ou CNI)"),
):
    """
    Vérifie qu'un visage est détectable dans l'image.
    Retourne le crop du visage en base64, ou 404 sinon.
    """
    if insight_app is None:
        raise HTTPException(status_code=503, detail="Modèles non chargés")

    img = _read_upload_as_bgr_image(image)

    try:
        face = extract_main_face(insight_app, img)
    except RuntimeError:
        raise HTTPException(
            status_code=404,
            detail="Aucun visage détecté. Cadrez votre visage dans l'ovale et réessayez.",
        )

    return JSONResponse(
        {
            "detected": True,
            "face_base64": _image_to_base64(face),
        }
    )


@app.post("/detect-id-card")
def detect_id_card(
    id_image: UploadFile = File(..., description="Image de la CNI (recto)"),
    conf_threshold: float = Query(0.25, ge=0.05, le=0.95),
):
    """
    Détecte simultanément le visage et la signature sur une image de CNI.

    Réponse 200 systématique avec deux booléens (`face_detected`, `signature_detected`)
    afin que le front puisse afficher un message ciblé selon ce qui manque.
    """
    if signature_model is None or insight_app is None:
        raise HTTPException(status_code=503, detail="Modèles non chargés")

    img = _read_upload_as_bgr_image(id_image)

    crop, bbox = extract_best_signature(signature_model, img, conf_threshold=conf_threshold)
    signature_detected = crop is not None

    try:
        face = extract_main_face(insight_app, img)
        face_detected = True
    except RuntimeError:
        face = None
        face_detected = False

    return JSONResponse(
        {
            "face_detected": face_detected,
            "signature_detected": signature_detected,
            "face_base64": _image_to_base64(face) if face is not None else None,
            "signature_base64": _image_to_base64(crop) if crop is not None else None,
            "signature_confidence": float(bbox[4]) if bbox is not None else None,
        }
    )


@app.post("/verify")
def verify(
    image1: UploadFile = File(..., description="Image 1 (CNI / identité)"),
    image2: UploadFile = File(..., description="Image 2 (selfie / autre)"),
    threshold: float = Query(0.70, ge=0.0, le=1.0, description="Seuil de similarité [0.0-1.0]"),
):
    """Comparaison faciale uniquement (rétrocompatible)."""
    if insight_app is None or face_model is None:
        raise HTTPException(status_code=503, detail="Modèles non chargés")

    img1 = _read_upload_as_bgr_image(image1)
    img2 = _read_upload_as_bgr_image(image2)

    face1 = extract_main_face(insight_app, img1)
    face2 = extract_main_face(insight_app, img2)

    same, sim = compare_face_arrays(face_model, face1, face2, threshold=threshold)

    return JSONResponse(
        {
            "same": bool(same),
            "similarity": float(sim),
            "threshold": float(threshold),
            "face_crops_base64": {
                "face1": _image_to_base64(face1),
                "face2": _image_to_base64(face2),
            },
        }
    )


@app.post("/verify-full")
def verify_full(
    id_face_image: UploadFile = File(..., description="Photo CNI où le portrait est lisible"),
    id_signature_image: UploadFile = File(..., description="Photo CNI où la signature est lisible (peut être identique à id_face_image)"),
    selfie_image: UploadFile = File(..., description="Selfie de l'utilisateur"),
    drawn_signature: UploadFile = File(..., description="Signature dessinée par l'utilisateur (PNG)"),
    face_threshold: float = Form(0.70, description="Seuil similarité faciale [0..1]"),
    signature_threshold: float = Form(0.80, description="Seuil similarité signature (cosinus) [0..1]"),
    sig_conf_threshold: float = Form(0.25, description="Seuil détection YOLO [0..1]"),
):
    """
    Vérification complète : visage + signature.
    Les deux images de CNI peuvent être identiques (un seul cadrage couvre les deux)
    ou différentes (cadrages dédiés portrait / signature).
    L'identité est validée uniquement si les deux comparaisons réussissent.
    """
    if (
        insight_app is None
        or face_model is None
        or signature_model is None
        or signature_embedder is None
    ):
        raise HTTPException(status_code=503, detail="Modèles non chargés")

    id_face_img = _read_upload_as_bgr_image(id_face_image)
    id_sig_img = _read_upload_as_bgr_image(id_signature_image)
    selfie_img = _read_upload_as_bgr_image(selfie_image)
    drawn_img = _read_upload_as_bgr_image(drawn_signature)

    face_id = extract_main_face(insight_app, id_face_img)
    face_selfie = extract_main_face(insight_app, selfie_img)
    face_match, face_sim = compare_face_arrays(
        face_model, face_id, face_selfie, threshold=face_threshold
    )

    ref_signature, sig_bbox = extract_best_signature(
        signature_model, id_sig_img, conf_threshold=sig_conf_threshold
    )
    if ref_signature is None:
        raise HTTPException(
            status_code=404,
            detail="Aucune signature détectée sur la carte d'identité.",
        )

    sig_result = compare_signatures(
        signature_embedder, ref_signature, drawn_img, threshold=signature_threshold
    )

    validated = bool(face_match) and bool(sig_result["match"])

    return JSONResponse(
        {
            "validated": validated,
            "face": {
                "match": bool(face_match),
                "similarity": float(face_sim),
                "threshold": float(face_threshold),
                "face_id_base64": _image_to_base64(face_id),
                "face_selfie_base64": _image_to_base64(face_selfie),
            },
            "signature": {
                "match": bool(sig_result["match"]),
                "score": sig_result["score"],
                "cosine": sig_result["cosine"],
                "threshold": sig_result["threshold"],
                "confidence": float(sig_bbox[4]),
                "ref_signature_base64": _image_to_base64(ref_signature),
            },
        }
    )
