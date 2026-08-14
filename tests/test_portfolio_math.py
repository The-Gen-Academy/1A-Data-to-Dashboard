from __future__ import annotations

import pandas as pd
import pytest

from utils.data_processing import validate_transactions
from utils.portfolio_math import PortfolioCalculationError, calculate_holdings, calculate_performance_metrics


def _sample_transactions() -> pd.DataFrame:
    return validate_transactions(
        pd.DataFrame(
            {
                "ticker": ["AAPL", "MSFT", "AAPL", "NVDA"],
                "date": ["2023-01-10", "2023-02-15", "2023-06-20", "2023-09-01"],
                "transaction_type": ["Buy", "Buy", "Sell", "Buy"],
                "quantity": [10, 5, 3, 4],
                "price": [145.00, 250.00, 180.00, 470.00],
            }
        )
    )


def test_fifo_holdings_after_partial_sell() -> None:
    holdings = calculate_holdings(_sample_transactions())

    aapl = holdings.loc[holdings["Ticker Symbol"] == "AAPL"].iloc[0]
    assert aapl["Current Quantity"] == pytest.approx(7)
    assert aapl["Remaining Cost Basis"] == pytest.approx(1015)
    assert aapl["Avg Cost Basis"] == pytest.approx(145)


def test_sell_more_than_owned_raises() -> None:
    transactions = validate_transactions(
        pd.DataFrame(
            {
                "ticker": ["AAPL", "AAPL"],
                "date": ["2024-01-01", "2024-01-02"],
                "transaction_type": ["Buy", "Sell"],
                "quantity": [1, 2],
                "price": [100, 110],
            }
        )
    )

    with pytest.raises(PortfolioCalculationError, match="exceeds available"):
        calculate_holdings(transactions)


def test_performance_metrics_without_current_value() -> None:
    metrics = calculate_performance_metrics(_sample_transactions(), holdings=None)

    assert metrics["total_investment"] == pytest.approx(4580)
    assert metrics["total_sells"] == pytest.approx(540)
    assert metrics["current_portfolio_value"] == pytest.approx(0)
    assert metrics["total_return"] == pytest.approx(-4040)
