import cv2, os
import numpy as np
from insightface.app import FaceAnalysis


def load_insightface(
    name: str = "buffalo_l",
    root: str | None = None,
    ctx_id: int = -1,
):
    # Chemin stable dans Docker
    if root is None:
        root = os.environ.get("INSIGHTFACE_HOME", "/app/models/insightface")

    os.makedirs(root, exist_ok=True)

    # Forcer CPU (docker + onnxruntime CPU)
    providers = ["CPUExecutionProvider"]

    app = FaceAnalysis(
        name=name,
        root=root,
        providers=providers,
    )
    # det_size à ajuster selon perf/qualité
    app.prepare(ctx_id=ctx_id, det_size=(640, 640))
    return app


def extract_main_face(
    app: FaceAnalysis,
    img_bgr: np.ndarray,
    pad: int = 10,
    tol_deg: float = 20.0,
) -> np.ndarray:
    """
    Prend une image BGR complète et renvoie un crop (np.ndarray BGR)
    contenant le visage principal, orienté correctement.

    - app      : instance FaceAnalysis déjà initialisée
    - img_bgr  : image d'entrée (BGR, shape HxWx3)
    - pad      : padding autour de la bbox
    - tol_deg  : tolérance en degrés autour de la verticale
    """
    if img_bgr is None:
        raise RuntimeError("Image d'entrée invalide (None).")

    # 1) Détection des visages
    faces = app.get(img_bgr)
    if len(faces) == 0:
        raise RuntimeError("Aucun visage détecté dans l'image.")

    # 2) On garde le plus grand visage
    face = max(
        faces,
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
    )

    # 3) Crop bbox + padding
    x1, y1, x2, y2 = face.bbox.astype(int)
    h, w = img_bgr.shape[:2]
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(w, x2 + pad)
    y2 = min(h, y2 + pad)
    face_crop = img_bgr[y1:y2, x1:x2]

    # 4) Orientation discrète 0/90/180/270 basée sur yeux -> nez
    eye_l, eye_r, nose, mouth_l, mouth_r = face.kps

    # centre des yeux
    eyes_cx = (eye_l[0] + eye_r[0]) / 2.0
    eyes_cy = (eye_l[1] + eye_r[1]) / 2.0

    # nez
    nose_x, nose_y = nose[0], nose[1]

    vx = nose_x - eyes_cx
    vy = nose_y - eyes_cy

    angle_deg = np.degrees(np.arctan2(vy, vx))          # [-180, 180]
    angle = ((angle_deg + 180.0) % 360.0) - 180.0       # normalisé

    # snap 0/90/180/270 par défaut
    k = int(round((90.0 - angle) / 90.0)) % 4

    # PATCH vertical : si déjà quasi vertical, simplifier
    if abs(angle - 90.0) <= tol_deg:
        # yeux au-dessus du nez -> quasi droit -> pas de rotation
        k = 0
    elif abs(angle + 90.0) <= tol_deg:
        # yeux sous le nez -> quasi à l'envers -> 180°
        k = 2
    # sinon, visage plutôt couché -> k vaut 1 (90°) ou 3 (270°)

    if k == 1:
        face_crop = cv2.rotate(face_crop, cv2.ROTATE_90_CLOCKWISE)
    elif k == 2:
        face_crop = cv2.rotate(face_crop, cv2.ROTATE_180)
    elif k == 3:
        face_crop = cv2.rotate(face_crop, cv2.ROTATE_90_COUNTERCLOCKWISE)
    # k == 0 -> pas de rotation

    return face_crop
