from __future__ import annotations

import pandas as pd
import streamlit as st

from utils.data_processing import CSVValidationError, get_upload_stats, validate_transactions


def _sample_dataframe() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "ticker": ["AAPL", "MSFT", "AAPL", "NVDA"],
            "date": ["2023-01-10", "2023-02-15", "2023-06-20", "2023-09-01"],
            "transaction_type": ["Buy", "Buy", "Sell", "Buy"],
            "quantity": [10, 5, 3, 4],
            "price": [145.00, 250.00, 180.00, 470.00],
        }
    )


def _render_upload_stats(transactions: pd.DataFrame) -> None:
    stats = get_upload_stats(transactions)
    cols = st.columns(5)
    cols[0].metric("Transactions", f"{stats.transaction_count:,}")
    cols[1].metric("Unique Tickers", f"{stats.unique_tickers:,}")
    cols[2].metric("Date Range", stats.date_range)
    cols[3].metric("Buy Transactions", f"{stats.buy_count:,}")
    cols[4].metric("Sell Transactions", f"{stats.sell_count:,}")


def render_data_upload_tab() -> None:
    st.header("Data Upload")
    st.info("Upload a CSV with ticker, date, transaction_type, quantity, and price columns.")

    with st.expander("CSV format example", expanded=False):
        st.dataframe(_sample_dataframe(), use_container_width=True, hide_index=True)

    uploaded_file = st.file_uploader(
        "Upload stock transaction CSV",
        type=["csv"],
        accept_multiple_files=False,
    )

    if uploaded_file is None:
        st.session_state.transactions = None
        st.session_state.holdings = None
        st.session_state.performance_metrics = None
        st.warning("Upload a valid CSV before opening the portfolio and AI tabs.")
        return

    try:
        raw_df = pd.read_csv(uploaded_file)
        transactions = validate_transactions(raw_df)
    except (CSVValidationError, pd.errors.EmptyDataError, UnicodeDecodeError) as exc:
        st.session_state.transactions = None
        st.session_state.holdings = None
        st.session_state.performance_metrics = None
        st.error(f"CSV validation failed: {exc}")
        return

    st.session_state.transactions = transactions
    st.success("CSV uploaded and validated successfully.")
    _render_upload_stats(transactions)

    st.subheader("Cleaned Transaction History")
    st.dataframe(
        transactions.assign(date=transactions["date"].dt.strftime("%Y-%m-%d")),
        use_container_width=True,
        hide_index=True,
    )
