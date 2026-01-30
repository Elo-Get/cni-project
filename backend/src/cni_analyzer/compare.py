import os
import numpy as np
import cv2
import torch
from cni_analyzer.adaface.inference import load_pretrained_model, to_input


class AdaFaceWrapper:
    """
    Wrapper qui expose une API proche d'insightface: model.get_feat(bgr_112)
    """
    def __init__(self, arch: str, path: str, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = load_pretrained_model(arch, path) 
        self.model.eval().to(self.device)

    @torch.inference_mode()
    def get_feat(self, bgr_img_112: np.ndarray) -> np.ndarray:
        # bgr_img_112: (112,112,3) uint8 BGR
        if bgr_img_112.shape[:2] != (112, 112):
            bgr_img_112 = cv2.resize(bgr_img_112, (112, 112), interpolation=cv2.INTER_AREA)

        # AdaFace repo: to_input() veut une image "aligned" (ils parlent souvent de rgb align),
        # mais la guideline dit bien: input final = bgr tensor + mean/std 0.5/0.5
        # => on force ici une conversion BGR -> format attendu par to_input.
        # to_input() dans le repo fait typiquement: HWC [0..255] -> BCHW float [-1..1]
        
        bgr_tensor = to_input(bgr_img_112).to(self.device)  # shape: (1,3,112,112)

        feat, _ = self.model(bgr_tensor)  # feat: (1,512)
        feat = feat.detach().cpu().numpy().reshape(-1).astype(np.float32)
        return feat


def load_adaface_model(arch: str, path: str, device: str):
    return AdaFaceWrapper(arch=arch, path=path, device=device)


def get_embedding_from_array(model, bgr_img: np.ndarray) -> np.ndarray:
    feat = model.get_feat(bgr_img)
    feat /= (np.linalg.norm(feat) + 1e-12)
    return feat


def compare_face_arrays(model, face1_bgr: np.ndarray, face2_bgr: np.ndarray, threshold: float = 0.70):
    emb1 = get_embedding_from_array(model, face1_bgr)
    emb2 = get_embedding_from_array(model, face2_bgr)

    cosine = float(np.dot(emb1, emb2))  # [-1,1]
    similarity = (cosine + 1.0) / 2.0   # [0,1] (comme ton API actuelle)
    same_person = similarity >= threshold
    return same_person, similarity
