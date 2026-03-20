Start the PerchDesk development environment entirely through Docker:

1. From `/Users/kkkadoya/Desktop/perchdesk`, run:
   - `docker compose up --build`
   - if port `3000` or `8000` is already in use, run:
     - `FRONTEND_PORT=3001 BACKEND_PORT=8001 docker compose up --build`
2. Wait until all three services are healthy:
   - `db`
   - `backend`
   - `frontend`
3. Report the URLs:
   - backend: `http://localhost:8000`
   - frontend: `http://localhost:3000`
   - if custom ports were used, report those instead
4. If logs are needed, run:
   - `docker compose logs -f db backend frontend`

What this command now does:

- `db` runs in Docker with a healthcheck
- `backend` runs inside Docker with:
  - `alembic upgrade head`
  - `uvicorn app.main:app --reload`
- `frontend` runs inside Docker with:
  - `next dev --hostname 0.0.0.0 --port 3000`
- source code is bind-mounted so edits on the host hot-reload in the containers

Operational notes:

- First startup will be slower because the images install dependencies.
- Subsequent startups should be stable and long-running because all services use
  `restart: unless-stopped`.
- Frontend file watching uses polling inside Docker for reliability on macOS.
- Backend file watching uses polling via `WATCHFILES_FORCE_POLLING=true` for the
  same reason.

Helpful commands:

- start in background:
  - `docker compose up --build -d`
- follow logs:
  - `docker compose logs -f backend frontend`
- restart only backend:
  - `docker compose restart backend`
- restart only frontend:
  - `docker compose restart frontend`
- rebuild after dependency changes:
  - `docker compose build --no-cache backend frontend`

Database / maintenance commands:

- migrate:
  - `docker compose exec backend alembic upgrade head`
- seed:
  - `docker compose exec backend python -c "import asyncio; from app.core.seed import main; asyncio.run(main())"`

If containers seem unhealthy:

1. Run `docker compose ps`
2. Run `docker compose logs --tail=200 backend frontend db`
3. If dependencies changed, run `docker compose up --build --force-recreate`
