from __future__ import annotations

import streamlit as st

from components.ai_chat_tab import render_ai_chat_tab
from components.data_upload_tab import render_data_upload_tab
from components.historical_performance_tab import render_historical_performance_tab
from components.portfolio_view_tab import render_portfolio_view_tab


def initialize_session_state() -> None:
    defaults = {
        "transactions": None,
        "holdings": None,
        "performance_metrics": None,
        "price_errors": [],
        "chat_messages": [],
    }
    for key, value in defaults.items():
        st.session_state.setdefault(key, value)


def main() -> None:
    st.set_page_config(
        page_title="US Stock Portfolio Analyst Agent",
        page_icon=":chart_with_upwards_trend:",
        layout="wide",
    )
    initialize_session_state()

    st.title("US Stock Portfolio Analyst Agent")
    st.caption(
        "Upload a CSV transaction history to calculate FIFO holdings, portfolio performance, "
        "and AI-assisted analysis grounded in your data."
    )

    upload_tab, portfolio_tab, performance_tab, chat_tab = st.tabs(
        [
            "Data Upload",
            "Consolidated Portfolio View",
            "Historical Performance",
            "AI Analyst Chat",
        ]
    )

    with upload_tab:
        render_data_upload_tab()
    with portfolio_tab:
        render_portfolio_view_tab()
    with performance_tab:
        render_historical_performance_tab()
    with chat_tab:
        render_ai_chat_tab()


if __name__ == "__main__":
    main()
