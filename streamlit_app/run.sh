#!/bin/bash
export STREAMLIT_BROWSER_GATHER_USAGE_STATS=false
export STREAMLIT_EMAIL=""
exec streamlit run /home/runner/workspace/streamlit_app/app.py \
  --server.port "$PORT" \
  --server.headless true \
  --browser.gatherUsageStats false \
  --theme.base light
