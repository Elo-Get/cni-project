import os
import cv2
import numpy as np

from insightface.model_zoo import get_model


# ------------------------------------------------------------------
# 1. Chargement du modèle ArcFace (ONNX local)
# ------------------------------------------------------------------

ARCFACE_ONNX_PATH = "models/arcface/buffalo_l/w600k_r50.onnx"


def load_arcface_model(ctx_id: int = -1):
    """
    Charge ArcFace depuis un fichier ONNX local.

    ctx_id:
      -1 = CPU
       0 = GPU 0 (si onnxruntime-gpu est installé/configuré)
    """
    if not os.path.isfile(ARCFACE_ONNX_PATH):
        raise FileNotFoundError(f"ONNX introuvable: {ARCFACE_ONNX_PATH}")

    # get_model accepte un chemin vers un .onnx
    model = get_model(ARCFACE_ONNX_PATH)
    if model is None:
        raise RuntimeError(
            f"Impossible de charger le modèle ONNX: {ARCFACE_ONNX_PATH}. "
            "Vérifie ton installation insightface/onnxruntime."
        )

    model.prepare(ctx_id=ctx_id)
    return model


# ------------------------------------------------------------------
# 2. Pré-traitement d'un visage BGR -> entrée ArcFace
# ------------------------------------------------------------------

def preprocess_face_for_arcface(bgr_img: np.ndarray) -> np.ndarray:
    """
    bgr_img : image OpenCV BGR (crop de visage)
    sortie  : image 112x112 BGR (ArcFace reco attend typiquement 112x112 aligné)
    """
    img = cv2.resize(bgr_img, (112, 112), interpolation=cv2.INTER_AREA)
    return img


def get_embedding_from_array(model, bgr_img: np.ndarray) -> np.ndarray:
    """
    Prend un visage BGR déjà croppé, renvoie embedding 512D normalisé.
    """
    inp = preprocess_face_for_arcface(bgr_img)

    feat = model.get_feat(inp)  # (1,512) ou (512,)
    feat = np.asarray(feat).reshape(-1).astype(np.float32)

    # L2 normalize
    feat /= (np.linalg.norm(feat) + 1e-12)

    return feat  # (512,)


# ------------------------------------------------------------------
# 3. Comparaison cosinus + seuillage -> bool + "proba"
# ------------------------------------------------------------------

def compare_face_arrays(
    model,
    face1_bgr: np.ndarray,
    face2_bgr: np.ndarray,
    threshold: float = 0.35,
):
    """
    Compare deux visages (np.ndarray BGR).

    Retourne:
      - same_person: bool
      - similarity: float (cosine [-1,1])
      - prob: float ~ [0,1]
    """
    emb1 = get_embedding_from_array(model, face1_bgr)
    emb2 = get_embedding_from_array(model, face2_bgr)

    similarity = float(np.dot(emb1, emb2))  # embeddings normalisés => cosinus direct
    same_person = similarity >= threshold

    # mapping linéaire [-1,1] -> [0,1]
    prob = (similarity + 1.0) / 2.0
    prob = float(max(0.0, min(1.0, prob)))

    return same_person, similarity, prob
