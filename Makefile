.PHONY: dev db migrate seed

# Start full dev environment (DB in Docker, backend + frontend locally)
dev:
	docker compose up -d db
	@echo "Starting backend and frontend..."
	@osascript -e 'tell app "Terminal" to do script "cd $(PWD)/backend && python3.11 -m uvicorn app.main:app --reload"'
	@osascript -e 'tell app "Terminal" to do script "cd $(PWD)/frontend && npm run dev"'
	@echo "Dev environment starting — backend: http://localhost:8000  frontend: http://localhost:3000"

# Just start the DB
db:
	docker compose up -d db

# Apply DB migrations
migrate:
	cd backend && python3.11 -m alembic upgrade head

# Seed sample data
seed:
	cd backend && python3.11 -c "import asyncio; from app.core.seed import main; asyncio.run(main())"
