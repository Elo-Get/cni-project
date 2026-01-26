import os
import argparse
import numpy as np
import cv2
import torch
import torch.nn.functional as F
import timm
from huggingface_hub import hf_hub_download


# ---- Config du modèle Unified-detector v1 (4 classes) ----
REPO_ID = "Wolowolo/fsfm-3c"
CKPT_FILE = "finetuned_models/Unified-detector/v1_Fine-tuned_on_4_classes/checkpoint-min_train_loss.pth"
MEANSTD_FILE = "finetuned_models/Unified-detector/v1_Fine-tuned_on_4_classes/pretrain_ds_mean_std.txt"

# Ordre supposé d'après la description (à garder si tes résultats sont cohérents)
CLASSES = ["real", "deepfake", "diffusion", "spoof"]


def read_mean_std(txt_path: str):
    s = open(txt_path, "r", encoding="utf-8").read()
    vals = []
    for tok in s.replace(",", " ").replace("[", " ").replace("]", " ").split():
        try:
            vals.append(float(tok))
        except ValueError:
            pass
    if len(vals) < 6:
        raise ValueError(f"Impossible de parser mean/std depuis: {txt_path}")
    mean = np.array(vals[:3], dtype=np.float32)
    std = np.array(vals[3:6], dtype=np.float32)
    return mean, std


def preprocess_bgr(img_bgr: np.ndarray, mean: np.ndarray, std: np.ndarray, size: int = 224):
    img = cv2.resize(img_bgr, (size, size), interpolation=cv2.INTER_AREA)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0
    img = (img - mean) / std
    img = np.transpose(img, (2, 0, 1))  # CHW
    x = torch.from_numpy(img).unsqueeze(0)  # 1,3,H,W
    return x


def safe_torch_load(path: str):
    try:
        torch.serialization.add_safe_globals([argparse.Namespace])
        return torch.load(path, map_location="cpu", weights_only=True)
    except Exception:
        return torch.load(path, map_location="cpu", weights_only=False)

def load_model_and_assets(device: str):
    ckpt_path = hf_hub_download(repo_id=REPO_ID, filename=CKPT_FILE, local_dir="./checkpoints", local_dir_use_symlinks=False)
    ms_path = hf_hub_download(repo_id=REPO_ID, filename=MEANSTD_FILE, local_dir="./checkpoints", local_dir_use_symlinks=False)

    mean, std = read_mean_std(ms_path)

    # ViT-B/16-224 vanilla + tête 4 classes
    model = timm.create_model("vit_base_patch16_224", pretrained=False, num_classes=4)

    ckpt = safe_torch_load(ckpt_path)
    state = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt

    # nettoie des préfixes potentiels
    cleaned = {}
    for k, v in state.items():
        nk = k
        for p in ("module.", "model."):
            if nk.startswith(p):
                nk = nk[len(p):]
        cleaned[nk] = v

    # strict=False pour éviter de bloquer si légère différence de head
    model.load_state_dict(cleaned, strict=False)
    model.to(device).eval()

    return model, mean, std


@torch.no_grad()
def infer_binary(model, mean, std, img_bgr: np.ndarray, reject_threshold: float, device: str):
    x = preprocess_bgr(img_bgr, mean, std).to(device)
    logits = model(x)                      # (1,4)
    probs = F.softmax(logits, dim=-1)[0]   # (4,)

    prob_real = float(probs[0].item())
    prob_attack = 1.0 - prob_real          # proba "pas real"
    pred_idx = int(torch.argmax(probs).item())
    pred_label = CLASSES[pred_idx]

    # Décision binaire :
    # - invalide si prob_attack >= seuil
    # - valide sinon
    is_valid = prob_attack < reject_threshold

    return is_valid, pred_label, prob_real, prob_attack, probs.cpu().numpy()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--threshold", type=float, default=0.50, help="Seuil rejet (prob_attack). Ex: 0.50")
    ap.add_argument("--device", default="cpu", help="cpu ou cuda")
    args = ap.parse_args()

    img = cv2.imread(args.image)
    if img is None:
        raise FileNotFoundError(f"Impossible de lire: {args.image}")

    model, mean, std = load_model_and_assets(args.device)
    is_valid, pred, prob_real, prob_attack, probs = infer_binary(
        model, mean, std, img, reject_threshold=args.threshold, device=args.device
    )

    print(f"VALID={int(is_valid)}  pred={pred}  prob_real={prob_real:.4f}  prob_attack={prob_attack:.4f}")
    print("probs:", {CLASSES[i]: float(probs[i]) for i in range(len(CLASSES))})


if __name__ == "__main__":
    main()
