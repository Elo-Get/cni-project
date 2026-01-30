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
- Reconnaissance faciale
- Comparaison de signatures

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

---