from __future__ import annotations

import pandas as pd
import pytest

from utils.data_processing import CSVValidationError, validate_transactions


def test_validate_transactions_cleans_sheet_export_index_column() -> None:
    raw = pd.DataFrame(
        {
            "Unnamed: 0": [0, 1],
            "ticker": ["aapl", "MSFT"],
            "date": ["2024-01-03 00:00:00", "2024-04-03 00:00:00"],
            "transaction_type": ["buy", "SELL"],
            "quantity": [10, 4],
            "price": [185.07, 420.3],
        }
    )

    cleaned = validate_transactions(raw)

    assert cleaned.columns.tolist() == ["ticker", "date", "transaction_type", "quantity", "price"]
    assert cleaned["ticker"].tolist() == ["AAPL", "MSFT"]
    assert cleaned["transaction_type"].tolist() == ["Buy", "Sell"]


def test_validate_transactions_rejects_missing_price() -> None:
    raw = pd.DataFrame(
        {
            "ticker": ["AAPL"],
            "date": ["2024-01-03"],
            "transaction_type": ["BUY"],
            "quantity": [10],
            "price": [None],
        }
    )

    with pytest.raises(CSVValidationError, match="Quantity and price"):
        validate_transactions(raw)
