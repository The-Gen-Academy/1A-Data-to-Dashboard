from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import date
from math import isfinite
from typing import Iterable

import numpy as np
import pandas as pd
import streamlit as st
import yfinance as yf
from scipy.optimize import brentq


class PortfolioCalculationError(ValueError):
    """Raised when portfolio math cannot proceed from the transaction timeline."""


@dataclass
class Lot:
    quantity: float
    price: float


def calculate_holdings(transactions: pd.DataFrame) -> pd.DataFrame:
    lots_by_ticker: dict[str, deque[Lot]] = defaultdict(deque)

    for _, row in transactions.sort_values("date").iterrows():
        ticker = str(row["ticker"]).upper()
        quantity = float(row["quantity"])
        price = float(row["price"])

        if row["transaction_type"] == "Buy":
            lots_by_ticker[ticker].append(Lot(quantity=quantity, price=price))
            continue

        remaining_to_sell = quantity
        available = sum(lot.quantity for lot in lots_by_ticker[ticker])
        if remaining_to_sell > available + 1e-9:
            raise PortfolioCalculationError(
                f"Sell quantity for {ticker} exceeds available quantity on {row['date'].date()}."
            )

        while remaining_to_sell > 1e-9:
            lot = lots_by_ticker[ticker][0]
            sold_quantity = min(lot.quantity, remaining_to_sell)
            lot.quantity -= sold_quantity
            remaining_to_sell -= sold_quantity
            if lot.quantity <= 1e-9:
                lots_by_ticker[ticker].popleft()

    rows: list[dict[str, float | str]] = []
    for ticker, lots in sorted(lots_by_ticker.items()):
        current_quantity = sum(lot.quantity for lot in lots)
        if current_quantity <= 1e-9:
            continue
        remaining_cost_basis = sum(lot.quantity * lot.price for lot in lots)
        rows.append(
            {
                "Ticker Symbol": ticker,
                "Current Quantity": current_quantity,
                "Remaining Cost Basis": remaining_cost_basis,
                "Avg Cost Basis": remaining_cost_basis / current_quantity,
            }
        )

    return pd.DataFrame(rows)


@st.cache_data(ttl=900, show_spinner=False)
def _fetch_one_price(ticker: str) -> tuple[float | None, float | None, str | None]:
    try:
        stock = yf.Ticker(ticker)
        history = stock.history(period="5d", auto_adjust=False)
        if history.empty:
            return None, None, f"{ticker}: no recent price data returned by yfinance."

        latest_close = float(history["Close"].dropna().iloc[-1])
        previous_close = None
        if len(history["Close"].dropna()) >= 2:
            previous_close = float(history["Close"].dropna().iloc[-2])
        return latest_close, previous_close, None
    except Exception as exc:  # yfinance raises varied transport and parsing exceptions.
        return None, None, f"{ticker}: price fetch failed: {exc}"


def fetch_current_prices(tickers: Iterable[str]) -> tuple[dict[str, float], list[str]]:
    prices: dict[str, float] = {}
    errors: list[str] = []
    for ticker in sorted(set(tickers)):
        latest_close, _previous_close, error = _fetch_one_price(ticker)
        if latest_close is not None:
            prices[ticker] = latest_close
        if error is not None:
            errors.append(error)
    return prices, errors


def fetch_recent_price_movements(tickers: Iterable[str]) -> dict[str, dict[str, float | None]]:
    movements: dict[str, dict[str, float | None]] = {}
    for ticker in sorted(set(tickers)):
        latest_close, previous_close, _error = _fetch_one_price(ticker)
        move = None
        move_pct = None
        if latest_close is not None and previous_close not in (None, 0):
            move = latest_close - previous_close
            move_pct = move / previous_close
        movements[ticker] = {
            "latest_close": latest_close,
            "previous_close": previous_close,
            "daily_move": move,
            "daily_move_pct": move_pct,
        }
    return movements


def _xnpv(rate: float, cashflows: list[tuple[pd.Timestamp, float]]) -> float:
    start_date = cashflows[0][0]
    return sum(amount / ((1 + rate) ** ((cashflow_date - start_date).days / 365.0)) for cashflow_date, amount in cashflows)


def calculate_xirr(cashflows: list[tuple[pd.Timestamp, float]]) -> float | None:
    if len(cashflows) < 2:
        return None
    amounts = [amount for _date, amount in cashflows]
    if not any(amount > 0 for amount in amounts) or not any(amount < 0 for amount in amounts):
        return None

    cashflows = sorted(cashflows, key=lambda item: item[0])
    try:
        root = brentq(lambda rate: _xnpv(rate, cashflows), -0.9999, 10.0, maxiter=200)
    except (ValueError, RuntimeError, OverflowError, FloatingPointError):
        return None

    return root if isfinite(root) else None


def calculate_performance_metrics(
    transactions: pd.DataFrame,
    holdings: pd.DataFrame | None,
    as_of: date | None = None,
) -> dict[str, float | None]:
    total_investment = float(
        (transactions.loc[transactions["transaction_type"] == "Buy", "quantity"]
        * transactions.loc[transactions["transaction_type"] == "Buy", "price"]).sum()
    )
    total_sells = float(
        (transactions.loc[transactions["transaction_type"] == "Sell", "quantity"]
        * transactions.loc[transactions["transaction_type"] == "Sell", "price"]).sum()
    )

    current_portfolio_value = 0.0
    if holdings is not None and not holdings.empty and "Current Market Value" in holdings.columns:
        current_portfolio_value = float(holdings["Current Market Value"].fillna(0).sum())

    total_return = total_sells + current_portfolio_value - total_investment
    total_return_pct = total_return / total_investment if total_investment else None

    final_date = pd.Timestamp(as_of or date.today())
    cashflows: list[tuple[pd.Timestamp, float]] = []
    for _, row in transactions.iterrows():
        signed_value = float(row["quantity"] * row["price"])
        if row["transaction_type"] == "Buy":
            signed_value *= -1
        cashflows.append((pd.Timestamp(row["date"]), signed_value))
    if current_portfolio_value > 0:
        cashflows.append((final_date, current_portfolio_value))

    return {
        "total_investment": total_investment,
        "total_sells": total_sells,
        "current_portfolio_value": current_portfolio_value,
        "total_return": total_return,
        "total_return_pct": total_return_pct,
        "xirr": calculate_xirr(cashflows),
    }


def contribution_to_daily_move(holdings: pd.DataFrame) -> pd.DataFrame:
    if holdings.empty:
        return pd.DataFrame()

    movements = fetch_recent_price_movements(holdings["Ticker Symbol"].tolist())
    rows = []
    for _, row in holdings.iterrows():
        ticker = row["Ticker Symbol"]
        move = movements.get(ticker, {})
        daily_move = move.get("daily_move")
        rows.append(
            {
                "Ticker Symbol": ticker,
                "Current Quantity": row["Current Quantity"],
                "Latest Close": move.get("latest_close"),
                "Previous Close": move.get("previous_close"),
                "Daily Move": daily_move,
                "Daily Move %": move.get("daily_move_pct"),
                "Portfolio Impact": np.nan if daily_move is None else daily_move * row["Current Quantity"],
            }
        )
    return pd.DataFrame(rows)
