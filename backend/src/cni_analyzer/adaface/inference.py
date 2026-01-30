import os
from cni_analyzer.adaface.net import build_model

import numpy as np
import torch

ckpt_path = os.environ.get("ADAFACE_CKPT_PATH", "/models/adaface/pretrained/adaface_ir50_ms1mv2.ckpt")


def load_pretrained_model(arch: str, ckpt_path: str, device: str = "cpu"):
    ckpt = torch.load(
        ckpt_path,
        map_location=torch.device(device),
        weights_only=False,  
    )

    state_dict = ckpt["state_dict"] if isinstance(ckpt, dict) and "state_dict" in ckpt else ckpt

    cleaned = {}
    for k, v in state_dict.items():
        nk = k
        if nk.startswith("model."):
            nk = nk[len("model."):]
        if nk.startswith("module."):
            nk = nk[len("module."):]
        cleaned[nk] = v

    model = build_model(arch)  
    
    missing, unexpected = model.load_state_dict(cleaned, strict=False)
    if missing:
        print(f"Warning: missing keys when loading AdaFace model: {missing}")
    if unexpected:
        print(f"Warning: unexpected keys when loading AdaFace model: {unexpected}")
    
    model.eval()
    return model


def to_input(pil_rgb_image):
    np_img = np.array(pil_rgb_image)
    brg_img = ((np_img[:,:,::-1] / 255.) - 0.5) / 0.5
    tensor = torch.tensor([brg_img.transpose(2,0,1)]).float()
    return tensor
    