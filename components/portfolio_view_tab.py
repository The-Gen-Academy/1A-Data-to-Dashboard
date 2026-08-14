from __future__ import annotations

import pandas as pd
import plotly.express as px
import streamlit as st

from utils.formatting import format_currency, format_percent
from utils.llm_agent import generate_portfolio_summary
from utils.portfolio_math import (
    PortfolioCalculationError,
    calculate_holdings,
    fetch_current_prices,
)


DISPLAY_COLUMNS = [
    "Ticker Symbol",
    "Current Quantity",
    "Avg Cost Basis",
    "Current Price",
    "Current Market Value",
    "Unrealized Profit/Gain Value",
    "Unrealized Profit/Gain %",
    "Allocation %",
]


def _missing_upload_message() -> None:
    st.info("Upload a valid CSV in the Data Upload tab to calculate current holdings.")


def _format_holdings_for_display(holdings: pd.DataFrame) -> pd.DataFrame:
    display = holdings.copy()
    money_cols = [
        "Avg Cost Basis",
        "Current Price",
        "Current Market Value",
        "Unrealized Profit/Gain Value",
    ]
    for col in money_cols:
        display[col] = display[col].map(format_currency)
    display["Unrealized Profit/Gain %"] = display["Unrealized Profit/Gain %"].map(format_percent)
    display["Allocation %"] = display["Allocation %"].map(format_percent)
    return display[DISPLAY_COLUMNS]


def render_portfolio_view_tab() -> None:
    st.header("Consolidated Portfolio View")
    transactions = st.session_state.get("transactions")

    if transactions is None:
        _missing_upload_message()
        return

    try:
        base_holdings = calculate_holdings(transactions)
    except PortfolioCalculationError as exc:
        st.session_state.holdings = None
        st.error(str(exc))
        return

    if base_holdings.empty:
        st.session_state.holdings = base_holdings
        st.warning("All positions are fully sold. There are no current holdings to display.")
        return

    prices, price_errors = fetch_current_prices(base_holdings["Ticker Symbol"].tolist())
    holdings = base_holdings.copy()
    holdings["Current Price"] = holdings["Ticker Symbol"].map(prices)
    missing_price_mask = holdings["Current Price"].isna()

    if missing_price_mask.any():
        missing = ", ".join(holdings.loc[missing_price_mask, "Ticker Symbol"].tolist())
        st.warning(f"Current prices could not be fetched for: {missing}. Those rows are excluded from value metrics.")

    if price_errors:
        with st.expander("Price fetch details", expanded=False):
            for error in price_errors:
                st.write(error)

    holdings = holdings.dropna(subset=["Current Price"]).copy()
    if holdings.empty:
        st.session_state.holdings = None
        st.error("No current prices could be fetched, so market value calculations are unavailable.")
        return

    holdings["Current Market Value"] = holdings["Current Quantity"] * holdings["Current Price"]
    holdings["Unrealized Profit/Gain Value"] = (
        holdings["Current Market Value"] - holdings["Remaining Cost Basis"]
    )
    holdings["Unrealized Profit/Gain %"] = (
        holdings["Unrealized Profit/Gain Value"] / holdings["Remaining Cost Basis"]
    )
    total_current_value = float(holdings["Current Market Value"].sum())
    holdings["Allocation %"] = holdings["Current Market Value"] / total_current_value

    st.session_state.holdings = holdings
    st.session_state.price_errors = price_errors

    st.metric("Total Current Portfolio Value", format_currency(total_current_value))

    left, right = st.columns([1, 1.5])
    with left:
        allocation_fig = px.pie(
            holdings,
            values="Current Market Value",
            names="Ticker Symbol",
            title="Allocation by Current Market Value",
            hole=0.35,
        )
        allocation_fig.update_traces(textposition="inside", textinfo="percent+label")
        st.plotly_chart(allocation_fig, use_container_width=True)
    with right:
        st.subheader("Current Holdings")
        st.dataframe(_format_holdings_for_display(holdings), use_container_width=True, hide_index=True)

    st.subheader("AI Portfolio Health Summary")
    summary = generate_portfolio_summary(holdings, total_current_value)
    if summary.ok:
        st.write(summary.text)
    else:
        st.warning(summary.text)
