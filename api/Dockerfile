# Base image
FROM python:3.11-slim AS base

# Evita warnings de apt
ENV DEBIAN_FRONTEND=noninteractive

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libmagic1 \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia o requirements.txt e instala dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante da aplicação
COPY . .

# Target development
FROM base AS development
ENV ENVIRONMENT=development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Target worker
FROM base AS worker
ENV ENVIRONMENT=development
CMD ["celery", "-A", "app.workers.celery", "worker", "--loglevel=info"]
