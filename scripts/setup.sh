#!/bin/bash
# Script para configuração inicial do ambiente Log Parts Catalog

set -e

echo "Configurando ambiente Log Parts Catalog..."

# Verificar se Docker e Docker Compose estão instalados
if ! command -v docker &> /dev/null; then
    echo "Docker não está instalado. Instale o Docker primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose não está instalado. Instale o Docker Compose primeiro."
    exit 1
fi

# Criar diretórios necessários
echo "Criando diretórios..."
mkdir -p uploads/images
mkdir -p uploads/documents
mkdir -p logs
mkdir -p nginx/ssl

# Copiar arquivo de ambiente se não existir
if [ ! -f .env ]; then
    echo "Criando arquivo .env..."
    cp .env.example .env

    # Gerar chaves secretas se openssl estiver disponível
    if command -v openssl &> /dev/null; then
        SECRET_KEY=$(openssl rand -hex 32)
        JWT_SECRET_KEY=$(openssl rand -hex 32)

        sed -i "s/your-super-secret-key-change-in-production/$SECRET_KEY/g" .env
        sed -i "s/jwt-secret-key-change-in-production/$JWT_SECRET_KEY/g" .env
    fi

    echo "Revise o arquivo .env e configure as variáveis necessárias"
else
    echo "Arquivo .env já existe"
fi

# Build das imagens Docker
echo "Construindo imagens Docker..."
docker-compose build

# Inicializar banco de dados
echo "Inicializando banco de dados..."
docker-compose up -d db redis

# Aguardar banco ficar pronto
echo "Aguardando banco de dados ficar pronto..."
sleep 15

# Criar tabelas iniciais (se necessário)
echo "Inicializando banco..."
docker-compose run --rm api python -c "
from app.core.database import engine, Base
try:
    Base.metadata.create_all(bind=engine)
    print('Tabelas criadas com sucesso')
except Exception as e:
    print(f'Erro ao criar tabelas: {e}')
"

echo "Setup concluído com sucesso!"
echo ""
echo "Para iniciar o sistema:"
echo "  docker-compose up -d"
echo ""
echo "URLs de acesso:"
echo "  Frontend: http://localhost:3000"
echo "  API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Admin: admin@logparts.com / admin123"
echo ""
echo "Para desenvolvimento (ver logs em tempo real):"
echo "  docker-compose up"
