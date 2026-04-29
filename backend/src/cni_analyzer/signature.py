from __future__ import annotations
import os
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
from PIL import Image
from huggingface_hub import hf_hub_download
from huggingface_hub.errors import GatedRepoError, RepositoryNotFoundError
from transformers import AutoImageProcessor, AutoModel
from ultralytics import YOLO


SIG_REPO_ID = os.environ.get(
    "SIGNATURE_MODEL_REPO", "tech4humans/yolov8s-signature-detector"
)
SIG_FILENAME = os.environ.get("SIGNATURE_MODEL_FILENAME", "yolov8s.pt")

EMBED_MODEL_NAME = os.environ.get(
    "SIGNATURE_EMBED_MODEL", "facebook/dinov2-small"
)


# ─── Détection (YOLOv8) ────────────────────────────────────────────────────────

def load_signature_model(cache_dir: Optional[str] = None) -> YOLO:
    """Charge le YOLO de détection de signatures."""
    explicit_path = os.environ.get("SIGNATURE_MODEL_PATH")
    if explicit_path and Path(explicit_path).exists():
        return YOLO(explicit_path)

    cache_dir = cache_dir or os.environ.get("SIGNATURE_MODEL_DIR", "/models/signature")
    Path(cache_dir).mkdir(parents=True, exist_ok=True)

    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")

    try:
        weights_path = hf_hub_download(
            repo_id=SIG_REPO_ID,
            filename=SIG_FILENAME,
            local_dir=cache_dir,
            token=hf_token,
        )
    except (GatedRepoError, RepositoryNotFoundError) as exc:
        raise RuntimeError(
            f"Impossible de récupérer le modèle '{SIG_REPO_ID}/{SIG_FILENAME}'.\n"
            "Trois options : HF_TOKEN, SIGNATURE_MODEL_PATH local, "
            "ou SIGNATURE_MODEL_REPO public alternatif."
        ) from exc

    return YOLO(weights_path)


def detect_signatures(model: YOLO, image_bgr: np.ndarray, conf_threshold: float = 0.25):
    results = model(image_bgr, conf=conf_threshold, verbose=False)
    result = results[0]

    crops, bboxes = [], []
    if result.boxes is None or len(result.boxes) == 0:
        return crops, bboxes

    pad = 8
    h, w = image_bgr.shape[:2]
    for box in result.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        conf = float(box.conf[0])
        crop = image_bgr[
            max(0, y1 - pad): min(h, y2 + pad),
            max(0, x1 - pad): min(w, x2 + pad),
        ]
        if crop.size == 0:
            continue
        crops.append(crop)
        bboxes.append((x1, y1, x2, y2, conf))

    return crops, bboxes


def extract_best_signature(
    model: YOLO, image_bgr: np.ndarray, conf_threshold: float = 0.25
) -> Tuple[Optional[np.ndarray], Optional[tuple]]:
    crops, bboxes = detect_signatures(model, image_bgr, conf_threshold)
    if not crops:
        return None, None
    best_idx = max(range(len(bboxes)), key=lambda i: bboxes[i][4])
    return crops[best_idx], bboxes[best_idx]


# ─── Comparaison via embeddings (DINOv2 + cosinus) ─────────────────────────────

class SignatureEmbedder:
    """Encodeur visuel pré-entraîné qui produit des embeddings L2-normalisés."""

    def __init__(self, model_name: str = EMBED_MODEL_NAME, device: str = "cpu"):
        self.device = torch.device(device)
        self.processor = AutoImageProcessor.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(self.device).eval()

    @staticmethod
    def _normalize(img_bgr: np.ndarray) -> Image.Image:
        """
        Normalise les conditions d'imagerie avant l'embedding :
        binarisation Otsu, recadrage serré sur l'encre, padding carré sur fond blanc.
        """
        if img_bgr.ndim == 3:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        else:
            gray = img_bgr.copy()

        blur = cv2.GaussianBlur(gray, (3, 3), 0)
        _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        ink_mask = 255 - binary
        coords = cv2.findNonZero(ink_mask)
        if coords is not None:
            x, y, w, h = cv2.boundingRect(coords)
            pad = max(6, int(0.05 * max(w, h)))
            y0, y1 = max(0, y - pad), min(binary.shape[0], y + h + pad)
            x0, x1 = max(0, x - pad), min(binary.shape[1], x + w + pad)
            binary = binary[y0:y1, x0:x1]

        h, w = binary.shape
        size = max(h, w, 64)
        canvas = np.full((size, size), 255, dtype=np.uint8)
        y_off = (size - h) // 2
        x_off = (size - w) // 2
        canvas[y_off:y_off + h, x_off:x_off + w] = binary

        rgb = cv2.cvtColor(canvas, cv2.COLOR_GRAY2RGB)
        return Image.fromarray(rgb)

    @torch.inference_mode()
    def embed(self, img_bgr: np.ndarray) -> np.ndarray:
        pil = self._normalize(img_bgr)
        inputs = self.processor(images=pil, return_tensors="pt").to(self.device)
        outputs = self.model(**inputs)
        feat = outputs.last_hidden_state[:, 0].squeeze(0)  # CLS token
        feat = feat / (feat.norm() + 1e-12)
        return feat.cpu().numpy().astype(np.float32)


def load_signature_embedder(device: str = "cpu") -> SignatureEmbedder:
    return SignatureEmbedder(device=device)


def compare_signatures(
    embedder: SignatureEmbedder,
    ref_img: np.ndarray,
    user_img: np.ndarray,
    threshold: float = 0.80,
) -> dict:
    """Cosinus entre embeddings DINOv2 ; score ∈ [0, 1]."""
    e_ref = embedder.embed(ref_img)
    e_user = embedder.embed(user_img)
    cosine = float(np.dot(e_ref, e_user))
    score = float(max(0.0, min(1.0, cosine)))
    return {
        "score": score,
        "cosine": cosine,
        "match": score >= threshold,
        "threshold": threshold,
    }
