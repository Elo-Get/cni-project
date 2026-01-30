import cv2
import base64
import os
from cni_analyzer.prepare import load_insightface, extract_main_face
from cni_analyzer.compare import load_adaface_model, compare_face_arrays

def image_to_base64(img, fmt=".png") -> str:
    success, buf = cv2.imencode(fmt, img)
    if not success:
        raise RuntimeError("Impossible d'encoder l'image")
    return base64.b64encode(buf).decode("utf-8")


def verify_two_images(
    img_path_1: str,
    img_path_2: str,
    threshold: float = 0.35,
):
    """
    Pipeline complet :
    - charge les deux images
    - extrait les visages (InsightFace)
    - compare (AdaFace + cosinus)
    """
    # 1) Charger les images brutes
    img1 = cv2.imread(img_path_1)
    img2 = cv2.imread(img_path_2)
    if img1 is None:
        raise RuntimeError(f"Impossible de lire l'image : {img_path_1}")
    if img2 is None:
        raise RuntimeError(f"Impossible de lire l'image : {img_path_2}")
    
    device = "cpu"
    arch = "ir_50"
    w_path = os.environ.get("ADAFACE_CKPT_PATH", "/models/adaface/pretrained/adaface_ir50_ms1mv2.ckpt")

    # 2) Modèles
    insight_app = load_insightface()
    model = load_adaface_model(arch=arch, path=w_path, device=device)

    # 3) Extraction des visages (en mémoire)
    face1 = extract_main_face(insight_app, img1)
    face2 = extract_main_face(insight_app, img2)
    
    face1_b64 = image_to_base64(face1)
    face2_b64 = image_to_base64(face2)
    

    # 4) Comparaison
    same, sim = compare_face_arrays(
        model,
        face1,
        face2,
        threshold=threshold,
    )
    return same, sim, face1_b64, face2_b64


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Vérification d'identité par visage (InsightFace + AdaFace)."
    )
    parser.add_argument("image1", help="Image 1 (CNI / identité)")
    parser.add_argument("image2", help="Image 2 (selfie / autre CNI)")
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.35,
        help="Seuil de similarité cosinus (par défaut 0.35).",
    )

    args = parser.parse_args()

    same, sim, prob = verify_two_images(
        args.image1,
        args.image2,
        threshold=args.threshold,
    )

    print(f"similarité cosinus : {sim:.4f}")
    print(f"proba approx.     : {prob:.3f}")
    print(f"même personne ?    : {same}")
