import cv2, os
import numpy as np
from insightface.app import FaceAnalysis
from insightface.utils import face_align


def load_insightface(
    name: str = "buffalo_l",
    root: str | None = None,
    ctx_id: int = -1,
):
    if root is None:
        root = os.environ.get("INSIGHTFACE_HOME", "/app/models/insightface")

    os.makedirs(root, exist_ok=True)

    providers = ["CPUExecutionProvider"]

    app = FaceAnalysis(
        name=name,
        root=root,
        providers=providers,
    )
    
    app.prepare(ctx_id=ctx_id, det_size=(640, 640))
    return app

def extract_main_face(
    app: FaceAnalysis,
    img_bgr: np.ndarray,
    image_size: int = 112,
) -> np.ndarray:
    faces = app.get(img_bgr)
    if len(faces) == 0:
        raise RuntimeError("Aucun visage détecté dans l'image.")

    face = max(
        faces,
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
    )

    # IMPORTANT : alignement similarity transform basé sur kps (5 landmarks)
    aligned = face_align.norm_crop(img_bgr, face.kps, image_size=image_size)
    return aligned