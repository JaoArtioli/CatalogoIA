#!/bin/bash
# Script para backup do banco de dados

set -e

BACKUP_DIR="backups"
TIMESTAMP=\
BACKUP_FILE="logparts_backup_\.sql"

# Carregar variÃ¡veis de ambiente
if [ -f .env ]; then
    source .env
fi

echo "ðŸ’¾ Iniciando backup do banco de dados..."

# Criar diretÃ³rio de backup
mkdir -p \

# Fazer backup do PostgreSQL
if docker-compose ps db | grep -q "Up"; then
    docker-compose exec -T db pg_dump \\
        -U \ \\
        -d \ \\
        --clean \\
        --if-exists \\
        --create \\
        > "\/\"
    
    # Comprimir backup
    gzip "\/\"
    
    echo "âœ… Backup criado: \/\.gz"
    
    # Manter apenas os Ãºltimos 7 backups
    find \ -name "logparts_backup_*.sql.gz" -mtime +7 -delete
    
    echo "âœ… Backups antigos removidos (mantendo Ãºltimos 7)"
else
    echo "âŒ Banco de dados nÃ£o estÃ¡ rodando"
    exit 1
fi
