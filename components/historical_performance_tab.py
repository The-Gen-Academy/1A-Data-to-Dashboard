from __future__ import annotations

import pandas as pd
import plotly.express as px
import streamlit as st

from utils.formatting import format_currency, format_percent
from utils.portfolio_math import calculate_performance_metrics


def _missing_upload_message() -> None:
    st.info("Upload a valid CSV in the Data Upload tab to calculate historical performance.")


def _render_metric_cards(metrics: dict[str, float | None]) -> None:
    cols = st.columns(5)
    cols[0].metric("Total Investment", format_currency(metrics["total_investment"]))
    cols[1].metric("Total Sells", format_currency(metrics["total_sells"]))
    cols[2].metric("Current Value", format_currency(metrics["current_portfolio_value"]))
    cols[3].metric(
        "Total Return",
        format_currency(metrics["total_return"]),
        delta=format_percent(metrics["total_return_pct"]),
    )
    xirr = metrics.get("xirr")
    cols[4].metric("XIRR", "N/A" if xirr is None else format_percent(xirr))


def _render_cashflow_chart(transactions: pd.DataFrame, current_value: float) -> None:
    cashflows = transactions.copy()
    cashflows["cashflow"] = cashflows.apply(
        lambda row: -row["quantity"] * row["price"]
        if row["transaction_type"] == "Buy"
        else row["quantity"] * row["price"],
        axis=1,
    )
    final_row = pd.DataFrame(
        {
            "date": [pd.Timestamp.today().normalize()],
            "cashflow": [current_value],
            "transaction_type": ["Current Value"],
            "ticker": ["Portfolio"],
        }
    )
    chart_df = pd.concat([cashflows[["date", "cashflow", "transaction_type", "ticker"]], final_row])
    chart_df = chart_df.sort_values("date")
    chart_df["cumulative_cashflow"] = chart_df["cashflow"].cumsum()

    fig = px.line(
        chart_df,
        x="date",
        y="cumulative_cashflow",
        markers=True,
        title="Cumulative Cashflow Timeline",
        hover_data=["ticker", "transaction_type", "cashflow"],
    )
    fig.update_layout(yaxis_title="Cumulative Cashflow (USD)", xaxis_title="Date")
    st.plotly_chart(fig, use_container_width=True)


def render_historical_performance_tab() -> None:
    st.header("Historical Performance")
    transactions = st.session_state.get("transactions")
    holdings = st.session_state.get("holdings")

    if transactions is None:
        _missing_upload_message()
        return

    metrics = calculate_performance_metrics(transactions, holdings)
    st.session_state.performance_metrics = metrics
    _render_metric_cards(metrics)

    if metrics.get("xirr") is None:
        st.warning("XIRR could not be calculated for this cashflow timeline.")

    st.subheader("Historical Transaction Table")
    display = transactions.copy()
    display["date"] = display["date"].dt.strftime("%Y-%m-%d")
    display["price"] = display["price"].map(format_currency)
    st.dataframe(display, use_container_width=True, hide_index=True)

    st.subheader("Portfolio Cashflow View")
    _render_cashflow_chart(transactions, float(metrics["current_portfolio_value"] or 0.0))
