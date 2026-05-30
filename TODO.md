# Deployment plan (tracked)

- [ ] Gather repo details (dockerfiles, env expectations, exposed ports)
- [x] Create GitHub Actions workflow for self-hosted runner deployment (docker compose)
- [x] Add self-hosted runner deployment steps (docker compose up)
- [x] Add required docs: how to set secrets on GitHub and environment variables on runner
- [x] Validate build locally via `docker compose config` / `docker compose build`
- [x] Validate by running `docker compose up -d` and checking health endpoint
- [x] Update README with deployment instructions

