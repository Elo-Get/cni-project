# CNI Project

Projet full-stack de **vérification d’identité** combinant une application web moderne et un backend de **reconnaissance faciale et comparaison de signatures**.

L’objectif est de fournir une base technique robuste pour des cas d’usage **KYC / e-verification / onboarding sécurisé**.

---

## 🧱 Architecture

```
CNI-PROJECT/
├── backend/        # API & modèles ML (Python)
│   ├── models/     # Modèles de reconnaissance faciale
│   ├── src/        # Logique métier
│   ├── server.py   # Point d’entrée backend
│   ├── Dockerfile
│   └── pyproject.toml
│
├── frontend/       # Application web (Next.js / React)
│   ├── src/
│   │   ├── app/                # App Router (Next.js)
│   │   ├── components/verify/  # Capture caméra & vérification
│   │   ├── lib/                # Utils & helpers
│   │   └── types.ts
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yaml
└── .gitignore
```

---

## 🚀 Stack technique

### Frontend
- Next.js (App Router)
- React / TypeScript
- Capture caméra (selfie / document)
- UI dédiée à la vérification d’identité

### Backend
- Python
- API d’inférence
- Reconnaissance faciale (AdaFace + InsightFace)
- Détection de signature (YOLOv8s)
- Comparaison de signatures (SSIM + IoU + moments de Hu)

### DevOps
- Docker
- Docker Compose

---

## 🧠 Modèle de reconnaissance faciale

### Modèle utilisé : AdaFace

Le projet utilise **AdaFace** pour l’extraction d’embeddings faciaux.

Dépôt officiel :  
https://github.com/mk-minchul/AdaFace

### Pourquoi AdaFace ?

AdaFace est une évolution d’ArcFace intégrant une **marge angulaire adaptative** en fonction de la qualité de l’image.

Avantages :
- Robustesse aux images floues ou mal éclairées
- Meilleure stabilité en conditions réelles (webcam, smartphone)
- Adapté aux cas KYC et e-ID

### Performances (références papier)

- LFW : ~99.8 %
- CFP-FP : ~98.4 %
- CPLFW : ~93.7 %
- IJB-C (1e-4) : amélioration notable vs ArcFace

### Intégration

- Utilisé uniquement en inference
- Extraction d’embeddings faciaux
- Comparaison par similarité cosinus
- Modèle interchangeable sans impact frontend

---

## ✍️ Vérification de signature

Une étape supplémentaire renforce la vérification d'identité : confronter la signature présente sur la CNI à une signature dessinée en direct par l'utilisateur.

### Pipeline

1. À la capture du recto de la carte, le backend lance une **détection YOLOv8s** (`tech4humans/yolov8s-signature-detector`).
2. Si aucune signature n'est trouvée, l'utilisateur est invité à reprendre la photo.
3. Sinon, le crop de la signature est renvoyé au front qui affiche un **pad de dessin** (canvas HTML).
4. À la soumission, l'endpoint `/verify-full` :
   - extrait & compare les visages (CNI vs selfie) via AdaFace,
   - extrait la signature de la CNI et la compare au tracé utilisateur.
5. L'identité est validée **uniquement si visage ET signature correspondent**.

### Comparaison de signatures (DINOv2 + cosinus)

Approche minimaliste : un modèle d'embeddings visuels pré-entraîné (`facebook/dinov2-small`) encode chaque signature en un vecteur 384-dim, comparé par **similarité cosinus**.

Pré-traitement (uniquement pour homogénéiser la mise en page avant l'embedding) :
1. Binarisation Otsu
2. Recadrage serré sur l'encre
3. Padding carré sur fond blanc

Pas de score composite, pas de seuils heuristiques empilés : un seul nombre, le cosinus, qui exprime directement la proximité visuelle apprise par le modèle.

Modèle interchangeable via `SIGNATURE_EMBED_MODEL` (n'importe quel modèle `transformers` exposant un CLS token : DINOv2, ViT, CLIP-vision, etc.).

### Endpoints exposés

| Méthode | Endpoint | Rôle |
|---|---|---|
| `POST` | `/detect-signature` | Détecte et retourne la signature de la CNI |
| `POST` | `/verify` | Comparaison faciale seule (rétrocompat) |
| `POST` | `/verify-full` | Vérification complète : visage + signature |

### Récupération des poids du modèle

`tech4humans/yolov8s-signature-detector` est un dépôt **gated** sur Hugging Face. Trois options :

**Option 1 — Token Hugging Face**
```bash
# 1) Accepter les conditions du dépôt sur huggingface.co
# 2) Créer un token : https://huggingface.co/settings/tokens
export HF_TOKEN=hf_xxx
docker-compose up --build
```

**Option 2 — Poids locaux**
```bash
# Placer un .pt compatible YOLOv8 dans backend/models/
export SIGNATURE_MODEL_PATH=/app/models/yolov8s-signature.pt
docker-compose up --build
```

**Option 3 — Dépôt alternatif public**
```bash
export SIGNATURE_MODEL_REPO=other-user/some-public-signature-detector
export SIGNATURE_MODEL_FILENAME=weights.pt
docker-compose up --build
```

---

## ▶️ Lancer le projet

```bash
docker-compose up --build
```

Frontend : http://localhost:3000

---

## ⚠️ Limites actuelles & améliorations à venir

### Reconnaissance faciale
- Absence de protection avancée contre le spoofing
- Amélioration prévue via liveness detection
- Objectif de conformité ISO/IEC 30107

### Application
- Serveur d’inférence unique
- Worker API commun
- Séparation future des workers
- Scalabilité horizontale prévue
- Amélioration UI pour la signature

### Comparaison de signatures
- Sensibilité à la qualité des images
- Impact des différences de couleurs, fond et éclairage
- Normalisation avancée prévue
- Migration future vers un modèle d'embedding signature (siamese / contrastif)

---