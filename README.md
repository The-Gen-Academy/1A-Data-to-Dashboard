# US Stock Portfolio Analyst Agent

An AI-powered Streamlit app that turns an uploaded US stock transaction CSV into a current portfolio dashboard, historical performance view, and Groq-backed analyst chat. The app uses uploaded CSV data only; there is no manual transaction entry.

This project was built for `The-Gen-Academy/1A-Data-to-Dashboard`.

## Features

- CSV-only transaction upload with helpful validation errors.
- Cleaned transaction table and upload stats.
- FIFO cost-basis calculation that accounts for partial sells and fully sold positions.
- yfinance-powered current price lookup with cached calls.
- Current holdings table with allocation, unrealized gain/loss value, and unrealized gain/loss percentage.
- Plotly allocation chart.
- Historical metric cards for total investment, total sells, current value, total return, and XIRR.
- Cumulative cashflow chart.
- Groq portfolio health summary and chat interface when `GROQ_API_KEY` is available.
- Graceful warnings when the Groq API key or price data is unavailable.

## Folder Structure

```text
.
|-- app.py
|-- pyproject.toml
|-- uv.lock
|-- README.md
|-- .env.example
|-- .gitignore
|-- components/
|   |-- __init__.py
|   |-- ai_chat_tab.py
|   |-- data_upload_tab.py
|   |-- historical_performance_tab.py
|   `-- portfolio_view_tab.py
|-- sample_data/
|   |-- invalid_missing_prices.csv
|   `-- sample_transactions.csv
|-- tests/
|   |-- test_data_processing.py
|   `-- test_portfolio_math.py
`-- utils/
    |-- __init__.py
    |-- data_processing.py
    |-- formatting.py
    |-- llm_agent.py
    `-- portfolio_math.py
```

## CSV Format

The app accepts CSV files with exactly these required columns:

```csv
ticker,date,transaction_type,quantity,price
AAPL,2023-01-10,Buy,10,145.00
MSFT,2023-02-15,Buy,5,250.00
AAPL,2023-06-20,Sell,3,180.00
NVDA,2023-09-01,Buy,4,470.00
```

Column definitions:

- `ticker`: US stock ticker symbol, such as AAPL, MSFT, or NVDA.
- `date`: transaction date.
- `transaction_type`: Buy or Sell, case-insensitive.
- `quantity`: number of shares bought or sold.
- `price`: transaction price per share.

The linked project sample data is included in `sample_data/sample_transactions.csv`. A negative-path validation fixture with missing prices is included in `sample_data/invalid_missing_prices.csv`.

## Setup With uv

Use `uv` only for package and virtual environment management.

```bash
uv sync
```

Create a local environment file:

```bash
cp .env.example .env
```

Set your Groq key in `.env`:

```bash
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

## Run The App

```bash
uv run streamlit run app.py
```

## Run Tests

```bash
uv run pytest
```

## FIFO Cost Basis Notes

Buy transactions add lots. Sell transactions reduce the oldest available lots first. Remaining lots determine current quantity and remaining cost basis. Average cost basis is calculated as remaining cost basis divided by current quantity. Fully sold positions are excluded from the current holdings table. If a sell exceeds available quantity, the app stops portfolio calculations and shows a helpful error.

## XIRR Notes

XIRR uses the full portfolio cashflow timeline. Buy transactions are negative cashflows, sell transactions are positive cashflows, and current portfolio value is added as a final positive cashflow on today's date. The app uses a numerical root finder and returns `N/A` when the timeline cannot support a valid XIRR calculation.

## AI Safety

The AI analyst is for educational and informational use only and is not financial advice. It should not invent market news, and it should ground analysis in uploaded transactions, computed metrics, and yfinance data. If recent price movement is relevant, the app can compare latest close against previous close where available.
