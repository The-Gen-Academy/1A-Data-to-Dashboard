---
name: Streamlit behind Replit path proxy
description: How to correctly route a Streamlit app behind Replit's shared path-based proxy when another artifact is on the same domain.
---

## Rule
Streamlit CANNOT reliably run at a sub-path (e.g. `/streamlit`) behind the Replit shared proxy. Use the root `/` for Streamlit and give the co-located app a more specific path (e.g. `/dashboard`).

**Why:** Streamlit's `--server.baseUrlPath` only serves the main HTML and static files at the sub-path. All `_stcore` API endpoints except `/_stcore/health` continue to respond at `/_stcore/*` WITHOUT the base-path prefix. Other `_stcore` endpoints (`/allowed-message-origins`, `/stream` WebSocket, etc.) fall through to Streamlit's HTML catch-all, returning HTML instead of JSON/WebSocket, which breaks the app.

**How to apply:**
- Streamlit service: `paths = ["/"]`, no `--server.baseUrlPath` flag.
- Co-located React/Vite app: `paths = ["/dashboard"]` (more specific, listed FIRST in artifact.toml — the proxy uses FIFO/first-match ordering, not longest-prefix-first).
- Vite `BASE_PATH` env var drives `base:` in vite.config.ts — set `BASE_PATH = "/dashboard"` in artifact.toml `[services.env]`.
- Suppress Streamlit's onboarding email prompt with `STREAMLIT_BROWSER_GATHER_USAGE_STATS=false` and `STREAMLIT_EMAIL=""` set as shell `export` inside a wrapper `run.sh` (NOT relying on artifact.toml `[services.env]` — that env block is NOT reliably passed to the process in all Replit artifact versions).
- The `.streamlit/config.toml` is only found when Streamlit's working directory matches the workspace root. Use CLI flags or env vars in the wrapper script for reliability.
