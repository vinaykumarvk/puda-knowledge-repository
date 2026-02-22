# Embedded EKG Engine (Single-App Architecture)

This repository now bundles the EKG agent engine directly under `ekg_engine/`.
The Node app starts and uses it internally, so chat/report flows no longer depend on the previously hardcoded remote EKG URL.

## Runtime mode

- Default: `EKG_ENGINE_MODE=embedded`
- Optional external fallback: `EKG_ENGINE_MODE=external` with `EKG_API_URL=https://...`

## One-time setup (local)

```bash
npm run ekg:setup
```

This creates `ekg_engine/.venv` and installs Python dependencies from `ekg_engine/pyproject.toml`.

## Required env for full EKG answer generation

- `OPENAI_API_KEY` (or `AI_INTEGRATIONS_OPENAI_API_KEY`)
- `DOC_VECTOR_STORE_ID`
- `KG_VECTOR_STORE_ID`
- `PUDA_ACTS_REGULATIONS_KG_PATH` (use `gs://...` in production)

Helper command to resolve vector stores and write `.env`:

```bash
npm run vectorstores:list -- \
  --doc-name "<doc-store-name-or-id>" \
  --kg-name "<kg-store-name-or-id>" \
  --kg-path "gs://your-bucket/path/to/puda_master_kg.json" \
  --write-env
```

Optional domain overrides:

- `PUDA_ACTS_REGULATIONS_VECTOR_STORE_ID`
- `PRE_SALES_VECTOR_STORE_ID`
- `APF_VECTOR_STORE_ID`

Optional KG file overrides:

- `PUDA_ACTS_REGULATIONS_KG_PATH`
- `PRE_SALES_KG_PATH`
- `APF_KG_PATH`

No built-in local default is used for the primary PUDA KG anymore.
Set `PUDA_ACTS_REGULATIONS_KG_PATH` explicitly in environment configuration.
For production, keep the KG in Cloud Storage and reference it via a `gs://...` path.

## Where it is wired

- Embedded process manager: `server/services/embeddedEkgEngine.ts`
- EKG client abstraction: `server/services/ekgClient.ts`
- Query flow callsite: `server/routes.ts`
- Report chat enrichment callsite: `server/routes.ts`
- Startup initialization: `server/index.ts`

## Unified API surface in this app

The main Node app now exposes EKG-compatible routes so you can use one host/port:

- `GET /api/ekg/health`
- `GET /api/ekg/domains`
- `POST /api/ekg/answer`
- `GET /api/ekg/tasks`
- `GET /api/ekg/tasks/:taskId`
- `GET /api/ekg/answer/status/:taskId`

## Search best practices applied

The embedded engine follows the same V2 search workflow used in the `ekg_agent` repo (`docs/kg_vector_response_v2.py` and `ekg_core/v2_workflow.py`):

1. Step-back intent clarification using KG vector-store `file_search`
2. KG node-name extraction and graph expansion around matched nodes
3. KG-guided query generation (stepback + expanded + entity/relationship hints)
4. Final answer generation using Responses API `file_search` on the document vector store
5. Repository-only grounding with strict fallback text when evidence is insufficient:
   - `not enough information available`

Implementation notes in this app:

- Main query endpoint (`/api/query`) sends raw user question into EKG V2 retrieval path.
- `concise` mode in UI also uses `/api/query` so it benefits from the same V2 retrieval process.
- Streaming endpoint (`/api/query/stream`) is guarded to use `file_search` (repository-only) when called directly.
