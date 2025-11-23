# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: FastAPI app plus council orchestration and JSON storage; add new services next to related modules.
- `frontend/`: Vite + React client; shared UI in `src/components/`, entry glue in `src/App.jsx`, styles colocated.
- `data/conversations/`: git-ignored runtime data set by `backend/config.py`; clear it before sharing logs.
- Root manifests (`pyproject.toml`, `frontend/package.json`, `start.sh`) are the single source for dependencies and run steps—update them with any tooling change.

## Build, Test, and Development Commands
- `uv sync` — install backend dependencies whenever `pyproject.toml` changes.
- `uv run python -m backend.main` — serve the API on `localhost:8001` for backend-only debugging.
- `cd frontend && npm install` then `npm run dev` — install UI deps and start Vite on `localhost:5173`.
- `./start.sh` — boot both stacks for end-to-end smoke tests.
- `npm run build && npm run preview` — verify the production bundle before merging UI-heavy work.

## Coding Style & Naming Conventions
Python uses 4-space indents, type hints, and concise module docstrings; mirror the async FastAPI pattern already present in `backend/main.py` and extend existing Pydantic models instead of hand validation. React components stay in PascalCase files, hooks/utilities camelCase, CSS files beside their JSX peer. ESLint (`frontend/eslint.config.js`) governs frontend style—run `npm run lint` before committing; introduce other formatters only after adding them to the manifests.

## Testing Guidelines
No automated suites ship today; add backend tests under `tests/backend/` with `pytest` + FastAPI `TestClient`, and UI specs in `frontend/src/__tests__/` using React Testing Library. Name tests after behaviors (`test_stage3_summary.py`, `StageTabs.spec.jsx`) and store large fixtures in `data/` rather than inline blobs. Manual regression still matters: `./start.sh`, submit a prompt, confirm a new JSON file lands in `data/conversations/` with all three stage payloads.

## Commit & Pull Request Guidelines
History favors short, imperative subjects (“readme tweaks”, “Label maker add”); keep future commits under ~50 characters and explain details in the body if needed. Reference issues, summarize the commands you ran, and call out config/env impacts explicitly. PRs should include a crisp description plus screenshots or clips whenever `frontend/src/components/` changes the UI.

## Security & Configuration Tips
Keep `OPENROUTER_API_KEY` in a root `.env`; restart the backend after rotating keys and avoid logging them. Adjust council and chairman identifiers inside `backend/config.py` only after confirming OpenRouter supports them, and mirror the change in any user-facing copy. Scrub `data/conversations/` before publishing traces because it may contain sensitive prompts and model critiques.
