FROM python:3.13-slim
WORKDIR /app

ARG ADAFACE_CKPT_URL
ARG ADAFACE_CKPT_NAME=adaface.ckpt

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    cmake \
    pkg-config \
    git \
    curl \
    ca-certificates \
    libglib2.0-0 \
    libgl1 \
 && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --upgrade pip

# Torch CPU (Mac M1 -> tu es en conteneur linux CPU de toute façon)
RUN python -m pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# (Optionnel mais recommandé) installer les deps avant de copier tout le code pour optimiser le cache
COPY pyproject.toml /app/pyproject.toml
# Si tu as un poetry.lock / requirements.txt, adapte ici
# COPY poetry.lock /app/poetry.lock

# Installe les deps (si ton projet est pip-installable)
RUN python -m pip install --no-cache-dir -e . || true

# Télécharge le ckpt AdaFace au build dans un chemin NON masqué par /app bind-mount
RUN mkdir -p /models/adaface/pretrained && \
    if [ -n "$ADAFACE_CKPT_URL" ]; then \
      echo "Downloading AdaFace ckpt from $ADAFACE_CKPT_URL" && \
      curl -L --fail "$ADAFACE_CKPT_URL" -o "/models/adaface/pretrained/${ADAFACE_CKPT_NAME}"; \
    else \
      echo "No ADAFACE_CKPT_URL provided, skipping download"; \
    fi

EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
