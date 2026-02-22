# Cloud SQL Migration Plan (PostgreSQL-First)

This repository is now standardized on PostgreSQL + Drizzle only.

Use this sequence:

1. Stabilize locally (`npm run db:init`, `npm run dev`).
2. Move the same app to Cloud SQL (no data-access layer change).
3. Add Firebase Data Connect after Cloud SQL is stable.

## 1) Create Cloud SQL PostgreSQL

```bash
gcloud services enable sqladmin.googleapis.com run.googleapis.com secretmanager.googleapis.com

gcloud sql instances create ekg-pg \
  --database-version=POSTGRES_17 \
  --cpu=2 \
  --memory=8GB \
  --region=us-central1

gcloud sql databases create ekg_product --instance=ekg-pg
gcloud sql users create ekg_app --instance=ekg-pg --password='CHANGE_ME'
```

## 2) Set DATABASE_URL for Cloud SQL

Use Cloud Run Unix socket format:

```text
postgresql://ekg_app:CHANGE_ME@/ekg_product?host=/cloudsql/PROJECT_ID:REGION:INSTANCE
```

## 3) Run schema/bootstrap against Cloud SQL

```bash
DATABASE_URL='postgresql://ekg_app:CHANGE_ME@/ekg_product?host=/cloudsql/PROJECT_ID:REGION:INSTANCE' npm run db:init
```

`db:init` now:
- ensures `pgvector` extension,
- pushes Drizzle schema,
- seeds default users.

## 4) Deploy Cloud Run with Cloud SQL attachment

```bash
gcloud run deploy ekg-product \
  --image gcr.io/PROJECT_ID/ekg-product:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE \
  --set-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://ekg_app:CHANGE_ME@/ekg_product?host=/cloudsql/PROJECT_ID:REGION:INSTANCE"
```

## 5) Validate after deploy

1. `GET /api/health` returns `200`.
2. Login works with seeded `admin / Admin@2025`.
3. Core smoke endpoints: `/api/threads`, `/api/auth/me`.

## 6) Firebase Data Connect (next phase)

After Cloud SQL stabilization:

1. Initialize Firebase Data Connect.
2. Point Data Connect to this Cloud SQL instance/database.
3. Migrate one bounded domain first (for example `threads/messages`) while keeping the rest on Drizzle.

