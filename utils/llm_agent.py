from __future__ import annotations

import os
from dataclasses import dataclass

import pandas as pd
from dotenv import load_dotenv
from groq import Groq

from utils.portfolio_math import contribution_to_daily_move


load_dotenv()


DISCLAIMER = "This is informational analysis only and is not financial advice."


@dataclass(frozen=True)
class LLMResult:
    ok: bool
    text: str


def _api_key() -> str | None:
    return os.getenv("GROQ_API_KEY")


def _model_name() -> str:
    return os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


def _client() -> Groq | None:
    key = _api_key()
    if not key:
        return None
    return Groq(api_key=key)


def _compact_dataframe(df: pd.DataFrame | None, max_rows: int = 25) -> str:
    if df is None or df.empty:
        return "No data available."
    return df.head(max_rows).to_csv(index=False)


def _complete_response(text: str | None) -> LLMResult:
    if not text:
        return LLMResult(False, "Groq returned an empty response. Please try again.")
    if DISCLAIMER.lower() not in text.lower():
        text = f"{text.strip()}\n\n{DISCLAIMER}"
    return LLMResult(True, text.strip())


def generate_portfolio_summary(holdings: pd.DataFrame, total_current_value: float) -> LLMResult:
    client = _client()
    if client is None:
        return LLMResult(
            False,
            "Add GROQ_API_KEY to your environment to generate the portfolio health summary.",
        )

    context = holdings[
        [
            "Ticker Symbol",
            "Current Quantity",
            "Current Market Value",
            "Allocation %",
            "Unrealized Profit/Gain Value",
            "Unrealized Profit/Gain %",
        ]
    ].to_csv(index=False)

    prompt = f"""
Summarize this current US stock portfolio in 2-3 concise sentences.
Mention concentration risk if one or a few holdings dominate allocation.
Base the answer only on this data and avoid buy/sell recommendations.
Total current value: {total_current_value:.2f}
Holdings:
{context}
Include this exact disclaimer once: {DISCLAIMER}
"""
    try:
        completion = client.chat.completions.create(
            model=_model_name(),
            messages=[
                {"role": "system", "content": "You are a careful portfolio analyst who does not provide financial advice."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=240,
        )
    except Exception as exc:
        return LLMResult(False, f"Groq portfolio summary failed: {exc}")

    return _complete_response(completion.choices[0].message.content)


def _build_portfolio_context(
    transactions: pd.DataFrame,
    holdings: pd.DataFrame | None,
    performance_metrics: dict[str, float | None] | None,
    user_question: str,
) -> str:
    daily_move_context = ""
    if holdings is not None and not holdings.empty and "down today" in user_question.lower():
        daily_move_context = contribution_to_daily_move(holdings).to_csv(index=False)

    return f"""
Uploaded transaction history:
{_compact_dataframe(transactions)}

Current holdings:
{_compact_dataframe(holdings)}

Portfolio performance metrics:
{performance_metrics or "No performance metrics calculated yet."}

Recent price movement context when relevant:
{daily_move_context or "No recent price movement context requested or available."}
"""


def generate_chat_response(
    user_question: str,
    transactions: pd.DataFrame,
    holdings: pd.DataFrame | None,
    performance_metrics: dict[str, float | None] | None,
    chat_history: list[dict[str, str]],
) -> LLMResult:
    client = _client()
    if client is None:
        return LLMResult(False, "Add GROQ_API_KEY to your environment to use AI Analyst Chat.")

    context = _build_portfolio_context(transactions, holdings, performance_metrics, user_question)
    prior_messages = [
        {"role": message["role"], "content": message["content"]}
        for message in chat_history[-8:]
        if message["role"] in {"user", "assistant"}
    ]

    messages = [
        {
            "role": "system",
            "content": (
                "You are a careful US stock portfolio analyst. Ground every answer in the supplied "
                "portfolio data, yfinance-derived prices, and computed metrics. Do not invent news. "
                "Do not make buy/sell recommendations. Include an informational-use disclaimer."
            ),
        },
        {"role": "user", "content": f"Portfolio context:\n{context}"},
        *prior_messages,
        {"role": "user", "content": user_question},
    ]

    try:
        completion = client.chat.completions.create(
            model=_model_name(),
            messages=messages,
            temperature=0.2,
            max_tokens=550,
        )
    except Exception as exc:
        return LLMResult(False, f"Groq chat response failed: {exc}")

    return _complete_response(completion.choices[0].message.content)
