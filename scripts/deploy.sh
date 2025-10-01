#!/bin/bash
# Script para deploy em produÃ§Ã£o

set -e

ENVIRONMENT=\
BRANCH=\

echo "ðŸš€ Iniciando deploy do Log Parts Catalog..."
echo "Ambiente: "
echo "Branch: "

# Verificar se estamos no diretÃ³rio correto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "âŒ Arquivo docker-compose.prod.yml nÃ£o encontrado!"
    echo "Execute este script no diretÃ³rio raiz do projeto."
    exit 1
fi

# Fazer backup dos dados (se em produÃ§Ã£o)
if [ "" = "production" ]; then
    echo "ðŸ’¾ Fazendo backup do banco de dados..."
    ./scripts/backup.sh
fi

# Build das novas imagens
echo "ðŸ”¨ Construindo novas imagens..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Parar serviÃ§os (exceto banco de dados)
echo "â¹ï¸ Parando serviÃ§os..."
docker-compose -f docker-compose.prod.yml stop api worker web

# Iniciar serviÃ§os
echo "â–¶ï¸ Iniciando serviÃ§os..."
docker-compose -f docker-compose.prod.yml up -d

# Verificar saÃºde dos serviÃ§os
echo "ðŸ” Verificando saÃºde dos serviÃ§os..."
sleep 30

# Verificar API
if curl -f http://localhost/api/v1/healthz > /dev/null 2>&1; then
    echo "âœ… API estÃ¡ funcionando"
else
    echo "âŒ API nÃ£o estÃ¡ respondendo"
    docker-compose -f docker-compose.prod.yml logs api
fi

echo "ðŸŽ‰ Deploy concluÃ­do!"
