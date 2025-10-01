# CatÃ¡logo Log Parts

Sistema inteligente de busca e catÃ¡logo de peÃ§as automotivas com IA.

## ðŸš€ InÃ­cio RÃ¡pido

### PrÃ©-requisitos
- Docker e Docker Compose
- Git

### InstalaÃ§Ã£o

1. **Clone o repositÃ³rio**
   \\\ash
   git clone <seu-repositorio>
   cd log-parts-catalog
   \\\

2. **Execute o setup**
   \\\ash
   chmod +x scripts/*.sh
   ./scripts/setup.sh
   \\\

3. **Inicie o sistema**
   \\\ash
   docker-compose up -d
   \\\

4. **Acesse a aplicaÃ§Ã£o**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000/docs
   - Admin: admin@logparts.com / admin123

## ðŸ“ Estrutura do Projeto

- **api/**: Backend FastAPI
- **web/**: Frontend React + TypeScript
- **nginx/**: Proxy reverso
- **scripts/**: Scripts de automaÃ§Ã£o

## ðŸ› ï¸ Desenvolvimento

### Backend
\\\ash
cd api
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
\\\

### Frontend
\\\ash
cd web
npm install
npm run dev
\\\

## ðŸš€ Deploy

Para produÃ§Ã£o:
\\\ash
./scripts/deploy.sh production
\\\

## ðŸ“– DocumentaÃ§Ã£o

- [Desenvolvimento](docs/DEVELOPMENT.md)
- [Deploy](docs/DEPLOYMENT.md)
- [API](http://localhost:8000/docs)

## ðŸ¤ ContribuiÃ§Ã£o

1. Fork o projeto
2. Crie uma branch: \git checkout -b feature/nova-feature\
3. Commit: \git commit -m 'Add nova feature'\
4. Push: \git push origin feature/nova-feature\
5. Abra um Pull Request

## ðŸ“„ LicenÃ§a

Este projeto estÃ¡ sob licenÃ§a MIT.
