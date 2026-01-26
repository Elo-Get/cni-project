FROM python:3.13-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    cmake \
    pkg-config \
    git \
    libglib2.0-0 \
    libgl1 \
 && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --upgrade pip

EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
