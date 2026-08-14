from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd


REQUIRED_COLUMNS = ["ticker", "date", "transaction_type", "quantity", "price"]


class CSVValidationError(ValueError):
    """Raised when an uploaded transaction CSV cannot be used safely."""


@dataclass(frozen=True)
class UploadStats:
    transaction_count: int
    unique_tickers: int
    date_range: str
    buy_count: int
    sell_count: int


def _format_column_list(columns: Iterable[str]) -> str:
    return ", ".join(f"`{column}`" for column in columns)


def validate_transactions(raw_df: pd.DataFrame) -> pd.DataFrame:
    if raw_df.empty:
        raise CSVValidationError("The uploaded CSV is empty.")

    df = raw_df.copy()
    df.columns = [str(column).strip() for column in df.columns]

    unnamed_columns = [column for column in df.columns if column.lower().startswith("unnamed")]
    if unnamed_columns:
        df = df.drop(columns=unnamed_columns)

    missing = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing:
        raise CSVValidationError(f"Missing required columns: {_format_column_list(missing)}.")

    df = df[REQUIRED_COLUMNS].copy()
    df = df.drop_duplicates().reset_index(drop=True)

    if df.empty:
        raise CSVValidationError("The CSV contains no usable transaction rows after duplicate cleanup.")

    df["ticker"] = df["ticker"].astype(str).str.strip().str.upper()
    if df["ticker"].eq("").any() or df["ticker"].eq("NAN").any():
        raise CSVValidationError("Ticker symbols cannot be blank.")

    transaction_type = df["transaction_type"].astype(str).str.strip().str.lower()
    valid_types = {"buy": "Buy", "sell": "Sell"}
    invalid_types = sorted(set(transaction_type) - set(valid_types))
    if invalid_types:
        raise CSVValidationError(
            "transaction_type must contain only Buy or Sell. "
            f"Invalid values: {_format_column_list(invalid_types)}."
        )
    df["transaction_type"] = transaction_type.map(valid_types)

    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce")
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    if df[["quantity", "price"]].isna().any().any():
        raise CSVValidationError("Quantity and price must be present numeric values.")
    if (df["quantity"] <= 0).any():
        raise CSVValidationError("Quantity values must be greater than zero.")
    if (df["price"] <= 0).any():
        raise CSVValidationError("Price values must be greater than zero.")

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    if df["date"].isna().any():
        raise CSVValidationError("Every date must be parseable as a valid date.")

    df["date"] = df["date"].dt.tz_localize(None).dt.normalize()
    df = df.sort_values(["date", "ticker", "transaction_type"]).reset_index(drop=True)
    return df


def get_upload_stats(transactions: pd.DataFrame) -> UploadStats:
    min_date = transactions["date"].min().strftime("%Y-%m-%d")
    max_date = transactions["date"].max().strftime("%Y-%m-%d")
    buy_count = int((transactions["transaction_type"] == "Buy").sum())
    sell_count = int((transactions["transaction_type"] == "Sell").sum())
    return UploadStats(
        transaction_count=len(transactions),
        unique_tickers=transactions["ticker"].nunique(),
        date_range=f"{min_date} to {max_date}",
        buy_count=buy_count,
        sell_count=sell_count,
    )
